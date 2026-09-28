// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract HoneyBeeStaking is Initializable, OwnableUpgradeable, PausableUpgradeable {
    using SafeERC20 for IERC20;

    error InvalidAddress();
    error InvalidAmount();
    error InvalidDuration();
    error InvalidReferrer();
    error AlreadyBound();
    error BindAfterStake();
    error NotOrderOwner();
    error OrderClosed();
    error NothingToClaim();
    error StillLocked();
    error InvalidThreshold();
    error NotCommunity();
    error ReentrantCall();

    struct StakeOrder {
        address user;
        address directReferrer;
        address indirectReferrer;
        uint256 amount;
        uint256 directRewardAmount;
        uint256 indirectRewardAmount;
        uint64 startTime;
        uint8 durationDays;
        uint8 totalPeriods;
        uint8 claimedPeriods;
        uint16 monthlyInterestBps;
        uint16 directReferralBps;
        uint16 indirectReferralBps;
        bool unstaked;
    }

    IERC20 public stakeToken;
    address public reserveWallet;
    uint256 public minStakeAmount;
    uint256 public tierTwoMinAmount;
    uint256 public tierThreeMinAmount;
    uint256 public nextOrderId;

    uint256 public constant PERIOD_LENGTH = 10 days;

    mapping(uint256 => StakeOrder) public orders;
    mapping(address => uint256[]) private _userOrderIds;
    mapping(address => address) public referrerOf;
    mapping(address => bool) public isCommunity;
    mapping(address => address) public subsidyReceiver;
    mapping(address => uint256) public teamVolume;
    mapping(address => uint256) public directTeamCount;
    address[] private _communities;
    mapping(address => uint256) private _communityIndex;
    uint256 private _reentrancyStatus;

    modifier nonReentrant() {
        if (_reentrancyStatus == 2) revert ReentrantCall();
        _reentrancyStatus = 2;
        _;
        _reentrancyStatus = 1;
    }

    event ReferrerBound(address indexed user, address indexed referrer);
    event CommunityUpdated(address indexed community, bool enabled);
    event CommunityReceiverUpdated(address indexed community, address indexed receiver);
    event ReserveWalletUpdated(address indexed reserveWallet);
    event MinStakeAmountUpdated(uint256 minStakeAmount);
    event TierThresholdsUpdated(uint256 tierTwoMinAmount, uint256 tierThreeMinAmount);
    event Staked(
        uint256 indexed orderId,
        address indexed user,
        uint256 amount,
        uint8 durationDays,
        uint16 monthlyInterestBps,
        uint16 directReferralBps,
        uint16 indirectReferralBps
    );
    event ReferralRewardPaid(uint256 indexed orderId, address indexed receiver, uint256 amount, uint8 level);
    event InterestClaimed(uint256 indexed orderId, address indexed user, uint256 amount, uint8 periodsClaimed);
    event Unstaked(uint256 indexed orderId, address indexed user, uint256 principalReturned, uint256 interestPaid);

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address stakeToken_,
        address reserveWallet_,
        uint256 minStakeAmount_,
        uint256 tierTwoMinAmount_,
        uint256 tierThreeMinAmount_
    ) external initializer {
        if (stakeToken_ == address(0) || reserveWallet_ == address(0)) revert InvalidAddress();
        __Ownable_init(msg.sender);
        __Pausable_init();
        _reentrancyStatus = 1;
        stakeToken = IERC20(stakeToken_);
        reserveWallet = reserveWallet_;
        _setThresholds(minStakeAmount_, tierTwoMinAmount_, tierThreeMinAmount_);
        emit ReserveWalletUpdated(reserveWallet_);
    }

    function bindReferrer(address referrer) external whenNotPaused {
        if (!_bindReferrer(msg.sender, referrer)) revert InvalidReferrer();
    }

    function stake(uint256 requestedAmount, uint8 durationDays, address referrer) external nonReentrant whenNotPaused returns (uint256 orderId) {
        if (requestedAmount == 0) revert InvalidAmount();
        if (
            referrer != address(0) &&
            referrerOf[msg.sender] == address(0) &&
            _userOrderIds[msg.sender].length == 0 &&
            !_bindReferrer(msg.sender, referrer)
        ) revert InvalidReferrer();

        uint256 balanceBefore = stakeToken.balanceOf(address(this));
        stakeToken.safeTransferFrom(msg.sender, address(this), requestedAmount);
        uint256 actualAmount = stakeToken.balanceOf(address(this)) - balanceBefore;
        if (actualAmount < minStakeAmount) revert InvalidAmount();
        _trackTeam(actualAmount);

        (uint8 totalPeriods, uint16 monthlyInterestBps, uint16 directReferralBps, uint16 indirectReferralBps) = _resolveRates(
            actualAmount,
            durationDays
        );

        address directReferrer = referrerOf[msg.sender];
        address indirectReferrer = directReferrer == address(0) ? address(0) : referrerOf[directReferrer];
        if (_userOrderIds[msg.sender].length == 0 && directReferrer != address(0)) {
            directTeamCount[directReferrer] += 1;
        }
        uint256 directRewardAmount = directReferrer == address(0) ||
                directReferralBps == 0 ||
                directTeamCount[directReferrer] < 3
            ? 0
            : actualAmount * directReferralBps / 10_000;
        uint256 indirectRewardAmount = indirectReferrer == address(0) ||
                indirectReferralBps == 0 ||
                directTeamCount[indirectReferrer] < 6
            ? 0
            : actualAmount * indirectReferralBps / 10_000;

        orderId = ++nextOrderId;
        orders[orderId] = StakeOrder({
            user: msg.sender,
            directReferrer: directReferrer,
            indirectReferrer: indirectReferrer,
            amount: actualAmount,
            directRewardAmount: directRewardAmount,
            indirectRewardAmount: indirectRewardAmount,
            startTime: uint64(block.timestamp),
            durationDays: durationDays,
            totalPeriods: totalPeriods,
            claimedPeriods: 0,
            monthlyInterestBps: monthlyInterestBps,
            directReferralBps: directReferralBps,
            indirectReferralBps: indirectReferralBps,
            unstaked: false
        });
        _userOrderIds[msg.sender].push(orderId);

        _payReferralRewards(directReferrer, directRewardAmount, indirectReferrer, indirectRewardAmount, orderId);

        emit Staked(orderId, msg.sender, actualAmount, durationDays, monthlyInterestBps, directReferralBps, indirectReferralBps);
    }

    function claimInterest(uint256 orderId) external nonReentrant whenNotPaused {
        StakeOrder storage order = orders[orderId];
        if (order.user != msg.sender) revert NotOrderOwner();
        if (order.unstaked) revert OrderClosed();

        (uint256 amount, uint8 claimablePeriods) = pendingInterest(orderId);
        if (amount == 0 || claimablePeriods == 0) revert NothingToClaim();

        order.claimedPeriods += claimablePeriods;
        stakeToken.safeTransferFrom(reserveWallet, msg.sender, amount);

        emit InterestClaimed(orderId, msg.sender, amount, claimablePeriods);
    }

    function unstake(uint256 orderId) external nonReentrant whenNotPaused {
        StakeOrder storage order = orders[orderId];
        if (order.user != msg.sender) revert NotOrderOwner();
        if (order.unstaked) revert OrderClosed();

        uint256 maturityTime = uint256(order.startTime) + uint256(order.durationDays) * 1 days;
        if (block.timestamp < maturityTime) revert StillLocked();

        uint8 remainingPeriods = order.totalPeriods - order.claimedPeriods;
        uint256 interestAmount = _periodInterest(order) * remainingPeriods;

        order.unstaked = true;
        order.claimedPeriods = order.totalPeriods;

        stakeToken.safeTransfer(msg.sender, order.amount);
        if (interestAmount > 0) {
            stakeToken.safeTransferFrom(reserveWallet, msg.sender, interestAmount);
        }

        emit Unstaked(orderId, msg.sender, order.amount, interestAmount);
    }

    function pendingInterest(uint256 orderId) public view returns (uint256 amount, uint8 claimablePeriods) {
        StakeOrder storage order = orders[orderId];
        if (order.user == address(0) || order.unstaked) {
            return (0, 0);
        }

        uint8 accruedPeriods = _accruedPeriods(order);
        if (accruedPeriods <= order.claimedPeriods) {
            return (0, 0);
        }

        claimablePeriods = accruedPeriods - order.claimedPeriods;
        amount = _periodInterest(order) * claimablePeriods;
    }

    function periodInterest(uint256 orderId) external view returns (uint256) {
        return _periodInterest(orders[orderId]);
    }

    function getUserOrderIds(address user) external view returns (uint256[] memory) {
        return _userOrderIds[user];
    }

    function getRatePlan(uint256 amount, uint8 durationDays) external view returns (uint16 monthlyInterestBps, uint16 directReferralBps, uint16 indirectReferralBps) {
        (, monthlyInterestBps, directReferralBps, indirectReferralBps) = _resolveRates(amount, durationDays);
    }

    function setReserveWallet(address reserveWallet_) external onlyOwner {
        if (reserveWallet_ == address(0)) revert InvalidAddress();
        reserveWallet = reserveWallet_;
        emit ReserveWalletUpdated(reserveWallet_);
    }

    function setCommunity(address account) external onlyOwner {
        if (account == address(0)) revert InvalidAddress();
        if (!isCommunity[account]) {
            uint256 volume = teamVolume[account];
            address current = referrerOf[account];
            while (current != address(0)) {
                teamVolume[current] -= volume;
                if (isCommunity[current]) break;
                current = referrerOf[current];
            }
            isCommunity[account] = true;
            _communities.push(account);
            _communityIndex[account] = _communities.length;
        }
        emit CommunityUpdated(account, true);
    }

    function communityCount() external view returns (uint256) {
        return _communities.length;
    }

    function getCommunities(uint256 offset, uint256 limit) external view returns (address[] memory list, uint256 total) {
        total = _communities.length;
        if (offset >= total || limit == 0) return (new address[](0), total);
        uint256 end = offset + limit;
        if (end > total) end = total;
        list = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            list[i - offset] = _communities[i];
        }
    }

    function setCommunityReceiver(address community, address receiver) external onlyOwner {
        if (receiver == address(0)) revert InvalidAddress();
        if (!isCommunity[community]) revert NotCommunity();
        subsidyReceiver[community] = receiver;
        emit CommunityReceiverUpdated(community, receiver);
    }

    function _trackTeam(uint256 amount) internal {
        address current = msg.sender;
        while (current != address(0)) {
            teamVolume[current] += amount;
            if (isCommunity[current]) break;
            current = referrerOf[current];
        }
    }
    function setMinStakeAmount(uint256 minStakeAmount_) external onlyOwner {
        _setThresholds(minStakeAmount_, tierTwoMinAmount, tierThreeMinAmount);
    }

    function setTierThresholds(uint256 tierTwoMinAmount_, uint256 tierThreeMinAmount_) external onlyOwner {
        _setThresholds(minStakeAmount, tierTwoMinAmount_, tierThreeMinAmount_);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _bindReferrer(address user, address referrer) internal returns (bool) {
        if (referrerOf[user] != address(0)) revert AlreadyBound();
        if (_userOrderIds[user].length > 0) revert BindAfterStake();
        if (
            referrer == address(0) ||
            referrer == user ||
            _userOrderIds[referrer].length == 0 ||
            referrerOf[referrer] == user
        ) return false;
        referrerOf[user] = referrer;
        emit ReferrerBound(user, referrer);
        return true;
    }

    function _payReferralRewards(
        address directReferrer,
        uint256 directRewardAmount,
        address indirectReferrer,
        uint256 indirectRewardAmount,
        uint256 orderId
    ) internal {
        if (directRewardAmount > 0) {
            stakeToken.safeTransferFrom(reserveWallet, directReferrer, directRewardAmount);
            emit ReferralRewardPaid(orderId, directReferrer, directRewardAmount, 1);
        }
        if (indirectRewardAmount > 0) {
            stakeToken.safeTransferFrom(reserveWallet, indirectReferrer, indirectRewardAmount);
            emit ReferralRewardPaid(orderId, indirectReferrer, indirectRewardAmount, 2);
        }
    }

    function _resolveRates(
        uint256 amount,
        uint8 durationDays
    ) internal view returns (uint8 totalPeriods, uint16 monthlyInterestBps, uint16 directReferralBps, uint16 indirectReferralBps) {
        if (amount < minStakeAmount) revert InvalidAmount();

        if (durationDays == 30) {
            totalPeriods = 3;
            directReferralBps = 400;
            indirectReferralBps = 100;
            monthlyInterestBps = amount >= tierThreeMinAmount ? 700 : amount >= tierTwoMinAmount ? 600 : 500;
            return (totalPeriods, monthlyInterestBps, directReferralBps, indirectReferralBps);
        }

        if (durationDays == 60) {
            totalPeriods = 6;
            directReferralBps = 500;
            indirectReferralBps = 200;
            monthlyInterestBps = amount >= tierThreeMinAmount ? 1200 : amount >= tierTwoMinAmount ? 1000 : 800;
            return (totalPeriods, monthlyInterestBps, directReferralBps, indirectReferralBps);
        }

        if (durationDays == 90) {
            totalPeriods = 9;
            directReferralBps = 600;
            indirectReferralBps = 300;
            monthlyInterestBps = amount >= tierThreeMinAmount ? 1600 : amount >= tierTwoMinAmount ? 1400 : 1200;
            return (totalPeriods, monthlyInterestBps, directReferralBps, indirectReferralBps);
        }

        if (durationDays == 180) {
            totalPeriods = 18;
            directReferralBps = 700;
            indirectReferralBps = 400;
            monthlyInterestBps = amount >= tierThreeMinAmount ? 2000 : amount >= tierTwoMinAmount ? 1800 : 1600;
            return (totalPeriods, monthlyInterestBps, directReferralBps, indirectReferralBps);
        }

        revert InvalidDuration();
    }

    function _periodInterest(StakeOrder storage order) internal view returns (uint256) {
        return order.amount * order.monthlyInterestBps / 30_000;
    }

    function _accruedPeriods(StakeOrder storage order) internal view returns (uint8) {
        uint256 elapsedPeriods = (block.timestamp - uint256(order.startTime)) / PERIOD_LENGTH;
        if (elapsedPeriods >= order.totalPeriods) {
            return order.totalPeriods;
        }
        return uint8(elapsedPeriods);
    }

    function _setThresholds(uint256 minStakeAmount_, uint256 tierTwoMinAmount_, uint256 tierThreeMinAmount_) internal {
        if (minStakeAmount_ == 0 || tierTwoMinAmount_ <= minStakeAmount_ || tierThreeMinAmount_ <= tierTwoMinAmount_) revert InvalidThreshold();
        minStakeAmount = minStakeAmount_;
        tierTwoMinAmount = tierTwoMinAmount_;
        tierThreeMinAmount = tierThreeMinAmount_;
        emit MinStakeAmountUpdated(minStakeAmount_);
        emit TierThresholdsUpdated(tierTwoMinAmount_, tierThreeMinAmount_);
    }
}
