import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CandlestickSeries, ColorType, HistogramSeries, createChart } from 'lightweight-charts';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDown, ArrowLeftRight, BarChart3, Check, ChevronDown, ChevronRight,
  CircleHelp, Copy, ExternalLink, Gauge, Hexagon, Info, LockKeyhole, Menu,
  Network, RefreshCw, Settings2, ShieldCheck, Sparkles, Wallet, X, Zap
} from 'lucide-react';
import { AbiCoder, BrowserProvider, Contract, Interface, JsonRpcProvider, MaxUint256, ZeroAddress, formatEther, formatUnits, parseEther, parseUnits } from 'ethers';
import './styles.css';

const navItems = [
  { id: 'swap', path: '/swap', label: '交易兑换', en: 'SWAP' },
  { id: 'staking', path: '/staking', label: '筑巢分红', en: 'STAKING' },
  { id: 'roadmap', path: '/roadmap', label: '蜂群路线', en: 'ROADMAP' },
  { id: 'dashboard', path: '/dashboard', label: '蜂巢数据', en: 'DATA' },
  { id: 'about', path: '/about', label: '关于蜜蜂', en: 'ABOUT' },
];

const wallets = [
  { name: 'MetaMask', icon: 'M', tone: '#f6851b' },
  { name: 'OKX Wallet', icon: 'OK', tone: '#fff' },
  { name: 'Trust Wallet', icon: 'T', tone: '#3375bb' },
];

const TOKEN_ADDRESS = '0x20d375b3fafa56cdb872330450ce0ede88bc7777';
const TOKEN_ICON_URL = 'https://www.iconaves.com/token_icon_request/6aaff2fc5b723b1c00592f44_1789915900.png';
const BNB_ICON_URL = 'https://assets-cdn.trustwallet.com/blockchains/smartchain/info/logo.png';
const ROUTER_ADDRESS = '0xFaC8034Dbc0934F9ED07C642EC7C49a98644d765';
const STAKING_ADDRESS = import.meta.env.VITE_STAKING_ADDRESS || '0xa4274465b7970951070205E753abBE6668888888';
const PANCAKE_V2_ROUTER_ADDRESS = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const ROUTER_RECIPIENT_SENDER = '0x0000000000000000000000000000000000000001';
const ROUTER_RECIPIENT_ROUTER = '0x0000000000000000000000000000000000000002';
const BSC_CHAIN_ID = '0x38';
const BSC_PARAMS = {
  chainId: BSC_CHAIN_ID,
  chainName: 'BNB Smart Chain',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: ['https://bsc-dataseed.binance.org'],
  blockExplorerUrls: ['https://bscscan.com'],
};
const ERC20_ABI = [
  'function name() view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];
const QUOTE_ROUTER_ABI = [
  'function getAmountsOut(uint256 amountIn, address[] calldata path) view returns (uint256[] memory amounts)',
];
const ROUTER_ABI = [
  'function execute(bytes commands, bytes[] inputs, uint256 deadline, address outputToken, uint256 amountOutMinimum) payable returns (uint256 amountOut)',
];
const STAKING_ABI = [
  'error InvalidAddress()',
  'error InvalidAmount()',
  'error InvalidDuration()',
  'error InvalidReferrer()',
  'error AlreadyBound()',
  'error BindAfterStake()',
  'error NotOrderOwner()',
  'error OrderClosed()',
  'error NothingToClaim()',
  'error StillLocked()',
  'error InvalidThreshold()',
  'error NotCommunity()',
  'error ReentrantCall()',
  'error EnforcedPause()',
  'error SafeERC20FailedOperation(address token)',
  'function minStakeAmount() view returns (uint256)',
  'function referrerOf(address) view returns (address)',
  'function teamVolume(address) view returns (uint256)',
  'function directTeamCount(address) view returns (uint256)',
  'function getRatePlan(uint256 amount, uint8 durationDays) view returns (uint16 monthlyInterestBps, uint16 directReferralBps, uint16 indirectReferralBps)',
  'function getUserOrderIds(address user) view returns (uint256[])',
  'function orders(uint256) view returns (address user, address directReferrer, address indirectReferrer, uint256 amount, uint256 directRewardAmount, uint256 indirectRewardAmount, uint64 startTime, uint8 durationDays, uint8 totalPeriods, uint8 claimedPeriods, uint16 monthlyInterestBps, uint16 directReferralBps, uint16 indirectReferralBps, bool unstaked)',
  'function pendingInterest(uint256 orderId) view returns (uint256 amount, uint8 claimablePeriods)',
  'function stake(uint256 requestedAmount, uint8 durationDays, address referrer) returns (uint256 orderId)',
  'function claimInterest(uint256 orderId)',
  'function unstake(uint256 orderId)',
];
const stakingInterface = new Interface(STAKING_ABI);
const STAKING_ERROR_MESSAGES = {
  InvalidAddress: '地址无效',
  InvalidAmount: '金额无效或低于最低质押金额',
  InvalidDuration: '锁仓周期无效',
  InvalidReferrer: '推荐人无效',
  AlreadyBound: '已经绑定推荐人',
  BindAfterStake: '质押后不能绑定推荐人',
  NotOrderOwner: '不是该订单的所有者',
  OrderClosed: '订单已经结束',
  NothingToClaim: '暂无可领取收益',
  StillLocked: '质押尚未到期',
  InvalidThreshold: '档位金额设置无效',
  NotCommunity: '该地址不是社区',
  ReentrantCall: '操作正在处理中，请勿重复提交',
  EnforcedPause: '合约已暂停',
  SafeERC20FailedOperation: '代币操作失败',
};
const abiCoder = AbiCoder.defaultAbiCoder();

function getStakingErrorMessage(error) {
  if (error?.code === 'ACTION_REJECTED') return '已取消交易';
  if (error?.code === 'INSUFFICIENT_FUNDS') return 'BNB 余额不足，无法支付 Gas';
  let errorName = error?.revert?.name;
  const rawErrorData = error?.data || error?.info?.error?.data || error?.error?.data;
  const errorData = typeof rawErrorData === 'string' ? rawErrorData : rawErrorData?.data || rawErrorData?.result;
  if (!errorName && typeof errorData === 'string') {
    try {
      errorName = stakingInterface.parseError(errorData)?.name;
    } catch {
      errorName = '';
    }
  }
  if (STAKING_ERROR_MESSAGES[errorName]) return STAKING_ERROR_MESSAGES[errorName];
  const message = `${error?.shortMessage || ''} ${error?.message || ''}`.toLowerCase();
  if (message.includes('user rejected') || message.includes('user denied')) return '已取消交易';
  if (message.includes('insufficient funds')) return 'BNB 余额不足，无法支付 Gas';
  return '交易失败，请稍后重试';
}

function getReadProvider() {
  return new JsonRpcProvider(BSC_PARAMS.rpcUrls[0]);
}

function shortAddress(value) {
  return value ? `${value.slice(0, 6)}...${value.slice(-4)}` : '连接钱包';
}

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';

function toSubscript(n) {
  return String(n).split('').map(d => SUBSCRIPTS[Number(d)]).join('');
}

function formatSmallNum(value) {
  if (!Number.isFinite(value) || value <= 0) return '--';
  if (value >= 0.001) return value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  const exp = Math.floor(Math.log10(value));
  let digits = Math.round(value / 10 ** (exp - 3));
  let e = exp;
  if (digits >= 10000) {
    digits = Math.round(digits / 10);
    e += 1;
  }
  return `0.0${toSubscript(-e - 1)}${digits}`;
}

function formatPrice(value) {
  if (!Number.isFinite(value) || value <= 0) return '--';
  if (value >= 1) return `$${value.toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
  if (value >= 0.01) return `$${value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
  return `$${formatSmallNum(value)}`;
}

function formatChange(value) {
  if (!Number.isFinite(value)) return '--';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatTokenAmount(value, max = 2) {
  if (!Number.isFinite(value)) return '--';
  return value.toLocaleString('en-US', { maximumFractionDigits: max });
}

function formatUsdValue(value) {
  if (!Number.isFinite(value) || value <= 0) return '--';
  return value >= 1
    ? `≈ $${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    : `≈ $${formatSmallNum(value)}`;
}

function formatInputAmount(value) {
  if (!Number.isFinite(value) || value <= 0) return '';
  return value.toFixed(8).replace(/\.?0+$/, '');
}

function formatTimeAgo(value) {
  if (!value) return '--';
  const diff = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (diff < 60) return `${diff} 秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

function getTokenDisplay(market) {
  return {
    name: market.tokenName || '代币',
    symbol: market.tokenSymbol || 'TOKEN',
  };
}

function buildSellExecuteParams(amountIn, amountOutMin, deadline) {
  return {
    commands: '0x26080c',
    inputs: [
      abiCoder.encode(['address'], [WBNB_ADDRESS]),
      abiCoder.encode(['address', 'uint256', 'uint256', 'address[]', 'bool'], [ROUTER_RECIPIENT_ROUTER, amountIn, 0n, [TOKEN_ADDRESS, WBNB_ADDRESS], true]),
      abiCoder.encode(['address', 'uint256'], [ROUTER_RECIPIENT_SENDER, amountOutMin]),
    ],
    outputToken: ZeroAddress,
    amountOutMinimum: amountOutMin,
    deadline,
  };
}

function buildBuyExecuteParams(amountIn, amountOutMin, deadline) {
  return {
    commands: '0x0b08',
    inputs: [
      abiCoder.encode(['address', 'uint256'], [ROUTER_RECIPIENT_ROUTER, amountIn]),
      abiCoder.encode(['address', 'uint256', 'uint256', 'address[]', 'bool'], [ROUTER_RECIPIENT_SENDER, amountIn, amountOutMin, [WBNB_ADDRESS, TOKEN_ADDRESS], false]),
    ],
    outputToken: TOKEN_ADDRESS,
    amountOutMinimum: amountOutMin,
    deadline,
  };
}

function useLiveTokenData(account) {
  const [market, setMarket] = useState({
    tokenName: '',
    tokenSymbol: '',
    tokenDecimals: 18,
    priceUsd: null,
    priceNative: null,
    change24h: null,
    marketCap: null,
    volume24h: null,
    pairAddress: '',
    dexUrl: '',
    loading: true,
  });
  const [walletBalance, setWalletBalance] = useState(null);
  const [bnbBalance, setBnbBalance] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadMarket = async () => {
      try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOKEN_ADDRESS}`);
        const data = await response.json();
        const pair = (data.pairs || []).find(item => item.chainId === 'bsc') || data.pairs?.[0];
        if (!pair || cancelled) return;
        setMarket({
          tokenName: pair.baseToken?.name || '',
          tokenSymbol: pair.baseToken?.symbol || '',
          priceUsd: Number(pair.priceUsd),
          priceNative: Number(pair.priceNative),
          change24h: Number(pair.priceChange?.h24),
          marketCap: Number(pair.marketCap || pair.fdv),
          volume24h: Number(pair.volume?.h24),
          pairAddress: pair.pairAddress || '',
          dexUrl: pair.url || '',
          loading: false,
        });
      } catch {
        if (!cancelled) {
          setMarket(current => ({ ...current, loading: false }));
        }
      }
    };

    loadMarket();
    const timer = setInterval(loadMarket, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTokenMeta = async () => {
      try {
        const provider = getReadProvider();
        const contract = new Contract(TOKEN_ADDRESS, ERC20_ABI, provider);
        const [name, symbol, decimals] = await Promise.all([
          contract.name().catch(() => ''),
          contract.symbol().catch(() => ''),
          contract.decimals().catch(() => 18),
        ]);
        if (!cancelled) {
          setMarket(current => ({
            ...current,
            tokenName: current.tokenName || name,
            tokenSymbol: current.tokenSymbol || symbol,
            tokenDecimals: Number(decimals) || 18,
          }));
        }
      } catch {}
    };

    loadTokenMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadBalance = async () => {
      if (!account || !window.ethereum) {
        setWalletBalance(null);
        setBnbBalance(null);
        return;
      }
      try {
        const provider = new BrowserProvider(window.ethereum);
        const contract = new Contract(TOKEN_ADDRESS, ERC20_ABI, provider);
        const [name, symbol, rawBalance, decimals, nativeBalance] = await Promise.all([
          contract.name().catch(() => ''),
          contract.symbol().catch(() => ''),
          contract.balanceOf(account),
          contract.decimals(),
          provider.getBalance(account),
        ]);
        if (!cancelled) {
          setWalletBalance(Number(formatUnits(rawBalance, decimals)));
          setBnbBalance(Number(formatEther(nativeBalance)));
          setMarket(current => ({
            ...current,
            tokenName: current.tokenName || name,
            tokenSymbol: current.tokenSymbol || symbol,
            tokenDecimals: Number(decimals) || current.tokenDecimals || 18,
          }));
        }
      } catch {
        if (!cancelled) {
          setWalletBalance(null);
          setBnbBalance(null);
        }
      }
    };

    loadBalance();
    return () => {
      cancelled = true;
    };
  }, [account]);

  return { market, walletBalance, bnbBalance };
}

const CHART_TIMEFRAME_CONFIG = {
  '1分': { path: 'minute', aggregate: 1, limit: 60 },
  '5分': { path: 'minute', aggregate: 5, limit: 60 },
  '1小时': { path: 'hour', aggregate: 1, limit: 48 },
  '1天': { path: 'day', aggregate: 1, limit: 30 },
};

function useDashboardLiveData(pairAddress, tokenSymbol, timeframe) {
  const [chart, setChart] = useState([]);
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!pairAddress) {
        setChart([]);
        setTrades([]);
        return;
      }
      try {
        const poolId = pairAddress.toLowerCase();
        const config = CHART_TIMEFRAME_CONFIG[timeframe] || CHART_TIMEFRAME_CONFIG['5分'];
        const [chartResponse, tradesResponse] = await Promise.all([
          fetch(`https://api.geckoterminal.com/api/v2/networks/bsc/pools/${poolId}/ohlcv/${config.path}?aggregate=${config.aggregate}&limit=${config.limit}&currency=usd`),
          fetch(`https://api.geckoterminal.com/api/v2/networks/bsc/pools/${poolId}/trades`),
        ]);
        const [chartData, tradesData] = await Promise.all([chartResponse.json(), tradesResponse.json()]);
        const nextChart = Array.from(
          new Map(
            (chartData?.data?.attributes?.ohlcv_list || [])
              .map(item => ({
                time: Math.floor(Number(item[0])),
                open: Number(item[1]),
                high: Number(item[2]),
                low: Number(item[3]),
                close: Number(item[4]),
                volume: Number(item[5]),
              }))
              .filter(item =>
                Number.isFinite(item.time) &&
                Number.isFinite(item.open) &&
                Number.isFinite(item.high) &&
                Number.isFinite(item.low) &&
                Number.isFinite(item.close) &&
                Number.isFinite(item.volume) &&
                item.open > 0 &&
                item.high > 0 &&
                item.low > 0 &&
                item.close > 0
              )
              .sort((a, b) => a.time - b.time)
              .map(item => [item.time, item])
          ).values()
        );
        const nextTrades = (tradesData?.data || []).slice(0, 4).map(item => {
          const attributes = item.attributes || {};
          const isBuy = attributes.kind === 'buy';
          const amount = Number(isBuy ? attributes.to_token_amount : attributes.from_token_amount);
          return {
            id: item.id,
            kind: isBuy ? '买入' : '卖出',
            wallet: shortAddress(attributes.tx_from_address || ''),
            amount: `${formatTokenAmount(amount, 0)} ${tokenSymbol}`,
            time: formatTimeAgo(attributes.block_timestamp),
          };
        });
        if (!cancelled) {
          setChart(nextChart);
          setTrades(nextTrades);
        }
      } catch {
        if (!cancelled) {
          setChart([]);
          setTrades([]);
        }
      }
    };

    load();
    const timer = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pairAddress, tokenSymbol, timeframe]);

  return { chart, trades };
}

function BrandMark({ small = false }) {
  return <div className={`brand-mark ${small ? 'small' : ''}`} aria-label="小蜜蜂">
    <Hexagon className="mark-outline" />
    <div className="bee-glyph"><span className="wing left"/><span className="wing right"/><span className="bee-body"/></div>
  </div>;
}

function getPageByPath(pathname) {
  return navItems.find(item => item.path === pathname)?.id || 'swap';
}

function AppShell() {
  const [walletOpen, setWalletOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [mobile, setMobile] = useState(false);
  const [toast, setToast] = useState('');
  const location = useLocation();
  const routerNavigate = useNavigate();
  const { market, walletBalance, bnbBalance } = useLiveTokenData(account);
  const token = getTokenDisplay(market);
  const bnbUsdPrice = market.priceUsd && market.priceNative ? market.priceUsd / market.priceNative : null;
  const page = getPageByPath(location.pathname);

  const showToast = (text) => { setToast(text); setTimeout(() => setToast(''), 2500); };
  const navigate = (id) => {
    const nextPath = navItems.find(item => item.id === id)?.path || '/swap';
    routerNavigate(nextPath);
  };

  useEffect(() => {
    setMobile(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  useEffect(() => {
    if (!window.ethereum) return;

    const syncWallet = async () => {
      try {
        const [accounts, chainId] = await Promise.all([
          window.ethereum.request({ method: 'eth_accounts' }),
          window.ethereum.request({ method: 'eth_chainId' }),
        ]);
        setAccount(accounts?.[0] || '');
        setConnected(Boolean(accounts?.[0]) && chainId === BSC_CHAIN_ID);
      } catch {}
    };

    syncWallet();

    const handleAccountsChanged = (accounts) => {
      setAccount(accounts?.[0] || '');
      setConnected(Boolean(accounts?.[0]));
    };
    const handleChainChanged = (chainId) => {
      setConnected(chainId === BSC_CHAIN_ID && Boolean(account || window.ethereum.selectedAddress));
    };

    window.ethereum.on?.('accountsChanged', handleAccountsChanged);
    window.ethereum.on?.('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [account]);

  const connect = async (name) => {
    if (!window.ethereum) {
      showToast('未检测到钱包');
      return;
    }
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_CHAIN_ID }],
      });
    } catch (error) {
      if (error?.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [BSC_PARAMS],
        });
      } else {
        showToast('切换 BSC 失败');
        return;
      }
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts?.[0] || '');
      setConnected(Boolean(accounts?.[0]));
      setWalletOpen(false);
      showToast(`${name} 已连接至 BSC`);
    } catch {
      showToast('钱包连接失败');
    }
  };

  return <div className="app-shell">
    <div className="ambient-grid" />
    <header className="topbar">
      <button className="brand" onClick={() => navigate('swap')}>
        <BrandMark small />
        <span className="brand-copy"><strong>{token.name}</strong><small>{token.symbol}</small></span>
      </button>
      <nav className={mobile ? 'nav open' : 'nav'}>
        {navItems.map(item => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => navigate(item.id)}>
          <span>{item.label}</span><small>{item.en}</small>
        </button>)}
      </nav>
      <div className="header-actions">
        <div className="network-pill"><i /> BSC</div>
        <button className="wallet-button" onClick={() => setWalletOpen(true)}>
              <Wallet size={16} /> {connected ? shortAddress(account) : '连接钱包'}
        </button>
        <button className="icon-button menu-button" onClick={() => setMobile(v => !v)} aria-label="打开菜单">{mobile ? <X/> : <Menu/>}</button>
      </div>
    </header>

    <main key={location.pathname} className="page-enter">
      <Routes>
        <Route path="/" element={<Navigate to="/swap" replace />} />
        <Route path="/swap" element={<SwapPage connected={connected} onConnect={() => setWalletOpen(true)} showToast={showToast} market={market} walletBalance={walletBalance} bnbBalance={bnbBalance} bnbUsdPrice={bnbUsdPrice} token={token}/>} />
        <Route path="/staking" element={<StakingPage connected={connected} account={account} onConnect={() => setWalletOpen(true)} showToast={showToast} token={token}/>} />
        <Route path="/roadmap" element={<RoadmapPage/>} />
        <Route path="/dashboard" element={<DashboardPage market={market} token={token}/>} />
        <Route path="/about" element={<AboutPage token={token}/>} />
        <Route path="*" element={<Navigate to="/swap" replace />} />
      </Routes>
    </main>

    <footer><div className="footer-brand"><BrandMark small/><span>{token.name} {token.symbol}</span></div><span>Built on BNB Smart Chain</span><span>© 2026 {token.symbol}</span></footer>
    {walletOpen && <WalletModal onClose={() => setWalletOpen(false)} onConnect={connect} connected={connected} account={account} bnbBalance={bnbBalance} walletBalance={walletBalance} token={token}/>}
    {toast && <div className="toast"><Check size={17}/>{toast}</div>}
  </div>;
}

function App() {
  return <BrowserRouter><AppShell /></BrowserRouter>;
}

function PageIntro({ eyebrow, title, accent, subtitle, children }) {
  return <div className="page-intro">
    <div><div className="eyebrow"><span />{eyebrow}</div><h1>{title}<em>{accent}</em></h1><p>{subtitle}</p></div>{children}
  </div>;
}

function SwapPage({ connected, onConnect, showToast, market, walletBalance, bnbBalance, bnbUsdPrice, token }) {
  const [amount, setAmount] = useState('');
  const [reversed, setReversed] = useState(false);
  const [settings, setSettings] = useState(false);
  const [slippage, setSlippage] = useState('5');
  const [quote, setQuote] = useState(null);
  const [swapping, setSwapping] = useState(false);
  const tokenDecimals = market.tokenDecimals || 18;
  const priceNative = market.priceNative || 0;
  const swapRouterAddress = ROUTER_ADDRESS;
  const fallbackOutputAmount = amount ? Number(amount) * (reversed ? (priceNative ? 1 / priceNative : 0) : priceNative) : 0;
  const outputAmount = quote ?? fallbackOutputAmount;
  const output = amount && Number.isFinite(outputAmount) ? outputAmount.toLocaleString('en-US', { maximumFractionDigits: reversed ? 0 : 8 }) : '';
  const from = reversed ? 'BNB' : token.symbol; const to = reversed ? token.symbol : 'BNB';

  useEffect(() => {
    let cancelled = false;

    const loadQuote = async () => {
      if (!amount || Number(amount) <= 0) {
        setQuote(null);
        return;
      }
      try {
        const provider = getReadProvider();
        const router = new Contract(PANCAKE_V2_ROUTER_ADDRESS, QUOTE_ROUTER_ABI, provider);
        const path = reversed ? [WBNB_ADDRESS, TOKEN_ADDRESS] : [TOKEN_ADDRESS, WBNB_ADDRESS];
        const amountIn = reversed ? parseEther(amount) : parseUnits(amount, tokenDecimals);
        const amounts = await router.getAmountsOut(amountIn, path);
        const quoted = Number(formatUnits(amounts[amounts.length - 1], reversed ? tokenDecimals : 18));
        if (!cancelled) {
          setQuote(quoted);
        }
      } catch {
        if (!cancelled) {
          setQuote(null);
        }
      }
    };

    loadQuote();
    return () => {
      cancelled = true;
    };
  }, [amount, reversed, tokenDecimals, swapRouterAddress]);

  const handleSwap = async () => {
    if (!connected) {
      onConnect();
      return;
    }
    if (!amount || Number(amount) <= 0) {
      showToast('请输入兑换数量');
      return;
    }
    if (!window.ethereum) {
      showToast('未检测到钱包');
      return;
    }

    setSwapping(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const router = new Contract(swapRouterAddress, ROUTER_ABI, signer);
      const quoteRouter = new Contract(PANCAKE_V2_ROUTER_ADDRESS, QUOTE_ROUTER_ABI, signer);
      const path = reversed ? [WBNB_ADDRESS, TOKEN_ADDRESS] : [TOKEN_ADDRESS, WBNB_ADDRESS];
      const amountIn = reversed ? parseEther(amount) : parseUnits(amount, tokenDecimals);
      const amounts = await quoteRouter.getAmountsOut(amountIn, path);
      const quotedOut = amounts[amounts.length - 1];
      const slippageBps = BigInt(Math.round(Number(slippage) * 100));
      const amountOutMin = quotedOut * (10000n - slippageBps) / 10000n;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

      let tx;
      if (reversed) {
        const executeParams = buildBuyExecuteParams(amountIn, amountOutMin, deadline);
        tx = await router.execute(
          executeParams.commands,
          executeParams.inputs,
          executeParams.deadline,
          executeParams.outputToken,
          executeParams.amountOutMinimum,
          { value: amountIn },
        );
      } else {
        const tokenContract = new Contract(TOKEN_ADDRESS, ERC20_ABI, signer);
        const allowance = await tokenContract.allowance(userAddress, swapRouterAddress);
        if (allowance < amountIn) {
          const approveTx = await tokenContract.approve(swapRouterAddress, MaxUint256);
          await approveTx.wait();
        }
        const executeParams = buildSellExecuteParams(amountIn, amountOutMin, deadline);
        tx = await router.execute(
          executeParams.commands,
          executeParams.inputs,
          executeParams.deadline,
          executeParams.outputToken,
          executeParams.amountOutMinimum,
        );
      }

      showToast('交易已提交');
      await tx.wait();
      setAmount('');
      setQuote(null);
      showToast('交易成功');
    } catch {
      showToast('交易失败');
    } finally {
      setSwapping(false);
    }
  };

  return <section className="main-width swap-page">
    <PageIntro eyebrow="DEX / BNB SMART CHAIN" title="蜂巢" accent="交易" subtitle="无缝兑换，极速上链。每一次交易，都是蜂群共识的流动。">
      <div className="intro-stat"><span>实时价格</span><strong>{formatPrice(market.priceUsd)} <b>{formatChange(market.change24h)}</b></strong><small><i/> {market.loading ? 'LOADING' : 'LIVE ON BSC'}</small></div>
    </PageIntro>
    <div className="swap-layout">
      <div className="bee-showcase">
        <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
        <div className="hero-hex"><BrandMark/><div className="coin-rim"/></div>
        <div className="floating-tag tag-a"><Zap size={14}/> BSC 极速确认</div>
        <div className="floating-tag tag-b"><ShieldCheck size={14}/> 流动性已锁定</div>
        <div className="honeycomb-art">{Array.from({length: 12}).map((_,i)=><i key={i}/>)}</div>
        <div className="showcase-copy"><span>{token.name} / {token.symbol}</span><strong>群体即共识</strong><p>Born on BSC · Powered by Community</p></div>
      </div>
      <div className="swap-card panel">
        <div className="panel-head"><div><small>INSTANT SWAP</small><h2>兑换</h2></div><button className="icon-button" onClick={() => setSettings(v=>!v)} aria-label="交易设置"><Settings2 size={19}/></button></div>
        {settings && <div className="settings-row"><span>滑点容差</span>{['3','5','8'].map(v=><button key={v} onClick={()=>setSlippage(v)} className={slippage===v?'selected':''}>{v}%</button>)}</div>}
        <TokenInput label="支付" token={from} value={amount} setValue={setAmount} balance={reversed ? bnbBalance : walletBalance} balanceValue={reversed ? (bnbBalance !== null && bnbUsdPrice ? bnbBalance * bnbUsdPrice : null) : (walletBalance !== null && market.priceUsd ? walletBalance * market.priceUsd : null)} inputValue={amount ? (reversed ? (Number(amount) * (bnbUsdPrice || 0)) : (Number(amount) * (market.priceUsd || 0))) : null}/>
        <div className="swap-direction"><button onClick={()=>{setReversed(v=>!v);setAmount('');setQuote(null);}}><ArrowDown size={18}/></button><span>{priceNative ? `1 ${token.symbol} ≈ ${priceNative.toLocaleString('en-US', { maximumFractionDigits: 10 })} BNB` : '价格同步中'}</span></div>
        <TokenInput label="接收" token={to} value={output} readonly balance={reversed ? walletBalance : bnbBalance} balanceValue={reversed ? (walletBalance !== null && market.priceUsd ? walletBalance * market.priceUsd : null) : (bnbBalance !== null && bnbUsdPrice ? bnbBalance * bnbUsdPrice : null)} inputValue={outputAmount ? (reversed ? (outputAmount * (market.priceUsd || 0)) : (outputAmount * (bnbUsdPrice || 0))) : null}/>
        <div className="trade-info"><div><span>最小接收</span><b>{output ? `${(Number(String(output).replaceAll(',',''))*(1-Number(slippage)/100)).toLocaleString()} ${to}` : '--'}</b></div><div><span>价格影响</span><b className="positive">&lt; 0.01%</b></div><div><span>路由</span><b>{reversed ? `WBNB → ${token.symbol}` : `${token.symbol} → WBNB`}</b></div></div>
        <button className="primary-action" onClick={handleSwap} disabled={swapping}>{swapping ? '交易中...' : connected ? '立即兑换' : '连接钱包开始交易'}<ArrowLeftRight size={18}/></button>
        <div className="secure-note"><ShieldCheck size={15}/> 滑点保护已开启 · 交易由智能合约执行</div>
      </div>
    </div>
    <div className="trust-strip"><div><LockKeyhole/><span><b>流动性锁定</b><small>合约锁仓，代码守护</small></span></div><div><Gauge/><span><b>极速交易</b><small>BSC 平均 3 秒确认</small></span></div><div><Network/><span><b>链上透明</b><small>所有记录公开可查</small></span></div></div>
  </section>;
}

function TokenInput({ label, token, value, setValue, readonly, balance, balanceValue, inputValue }) {
  const applyBalance = (ratio) => {
    if (balance === null) return;
    setValue?.(formatInputAmount(balance * ratio));
  };
  return <div className="token-box"><div className="input-meta"><span>{label}</span><div className="balance-meta"><span>余额：{balance !== null ? formatTokenAmount(balance, 4) : '--'}</span><small>{balanceValue !== null ? formatUsdValue(balanceValue) : '--'}</small></div></div><div className="token-row"><input aria-label={`${label}数量`} placeholder="0.00" value={value} readOnly={readonly} onChange={e=>setValue?.(e.target.value.replace(/[^0-9.]/g,''))}/><button><TokenLogo token={token}/><b>{token}</b><ChevronDown size={15}/></button></div><div className="input-value">{inputValue !== null ? formatUsdValue(inputValue) : '--'}</div>{!readonly && <div className="quick-amounts"><button className="quick-amount max" onClick={()=>applyBalance(1)}>MAX</button><button className="quick-amount" onClick={()=>applyBalance(.75)}>75%</button><button className="quick-amount" onClick={()=>applyBalance(.5)}>50%</button><button className="quick-amount" onClick={()=>applyBalance(.25)}>25%</button></div>}</div>
}
function TokenLogo({token}) { return <span className={`token-logo ${token.toLowerCase()}`}><img src={token === 'BNB' ? BNB_ICON_URL : TOKEN_ICON_URL} alt={token} /></span> }

function StakingPage({connected,account,onConnect,showToast,token}) {
  const [period,setPeriod]=useState(180);
  const [amount,setAmount]=useState('');
  const [referrer,setReferrer]=useState(() => new URLSearchParams(window.location.search).get('referrer') || '');
  const [data,setData]=useState({balance:null,min:null,orders:[],boundReferrer:ZeroAddress,teamVolume:0,directTeamCount:0,decimals:18});
  const [rates,setRates]=useState(null);
  const [busy,setBusy]=useState('');
  const [refresh,setRefresh]=useState(0);
  const configured=/^0x[a-fA-F0-9]{40}$/.test(STAKING_ADDRESS);

  useEffect(()=>{
    if(!configured)return;
    let cancelled=false;
    const load=async()=>{
      try{
        const provider=getReadProvider();
        const staking=new Contract(STAKING_ADDRESS,STAKING_ABI,provider);
        const stakeToken=new Contract(TOKEN_ADDRESS,ERC20_ABI,provider);
        const [decimals,min]=await Promise.all([stakeToken.decimals(),staking.minStakeAmount()]);
        let balance=null,boundReferrer=ZeroAddress,teamVolume=0,directTeamCount=0,orders=[];
        if(account){
          const [rawBalance,rawReferrer,rawTeamVolume,rawDirectTeamCount,ids]=await Promise.all([stakeToken.balanceOf(account),staking.referrerOf(account),staking.teamVolume(account),staking.directTeamCount(account),staking.getUserOrderIds(account)]);
          balance=Number(formatUnits(rawBalance,decimals));
          boundReferrer=rawReferrer;
          teamVolume=Number(formatUnits(rawTeamVolume,decimals));
          directTeamCount=Number(rawDirectTeamCount);
          orders=await Promise.all([...ids].reverse().map(async id=>{
            const [order,pending]=await Promise.all([staking.orders(id),staking.pendingInterest(id)]);
            return {
              id:Number(id),amount:Number(formatUnits(order.amount,decimals)),
              startTime:Number(order.startTime),durationDays:Number(order.durationDays),
              pending:Number(formatUnits(pending.amount,decimals)),
              claimablePeriods:Number(pending.claimablePeriods),unstaked:order.unstaked
            };
          }));
        }
        if(!cancelled)setData({
          balance,min:Number(formatUnits(min,decimals)),
          orders,boundReferrer,teamVolume,directTeamCount,decimals:Number(decimals)
        });
      }catch{
        if(!cancelled)showToast('质押数据读取失败');
      }
    };
    load();
    return()=>{cancelled=true};
  },[account,configured,refresh]);

  useEffect(()=>{
    if(!configured||!amount||Number(amount)<=0){setRates(null);return}
    const timer=setTimeout(async()=>{
      try{
        const staking=new Contract(STAKING_ADDRESS,STAKING_ABI,getReadProvider());
        const result=await staking.getRatePlan(parseUnits(amount,data.decimals),period);
        setRates({monthly:Number(result.monthlyInterestBps)});
      }catch{setRates(null)}
    },250);
    return()=>clearTimeout(timer);
  },[amount,period,data.decimals,configured]);

  const transact=async(type,orderId)=>{
    if(!connected){onConnect();return}
    if(!configured){showToast('未配置质押合约地址');return}
    let stakeValue;
    if(type==='stake'){
      try{
        stakeValue=parseUnits(amount,data.decimals);
      }catch{
        showToast('请输入有效的质押数量');
        return;
      }
      if(stakeValue<=0n){showToast('请输入有效的质押数量');return}
      try{
        const balance=await new Contract(TOKEN_ADDRESS,ERC20_ABI,getReadProvider()).balanceOf(account);
        if(balance<stakeValue){showToast('代币余额不足');return}
      }catch{
        showToast('代币余额读取失败');
        return;
      }
    }
    setBusy(`${type}-${orderId||0}`);
    try{
      const provider=new BrowserProvider(window.ethereum);
      const signer=await provider.getSigner();
      const staking=new Contract(STAKING_ADDRESS,STAKING_ABI,signer);
      let tx;
      if(type==='stake'){
        const tokenContract=new Contract(TOKEN_ADDRESS,ERC20_ABI,signer);
        if(await tokenContract.allowance(account,STAKING_ADDRESS)<stakeValue){
          showToast('请确认代币授权');
          await (await tokenContract.approve(STAKING_ADDRESS,stakeValue)).wait();
        }
        const referral=data.boundReferrer!==ZeroAddress?ZeroAddress:(referrer||ZeroAddress);
        tx=await staking.stake(stakeValue,period,referral);
      }else{
        tx=await staking[type==='claim'?'claimInterest':'unstake'](orderId);
      }
      await tx.wait();
      setAmount('');
      setRefresh(v=>v+1);
      showToast(type==='stake'?'质押成功':type==='claim'?'收益领取成功':'解押成功');
    }catch(error){
      showToast(getStakingErrorMessage(error));
    }finally{
      setBusy('');
    }
  };

  const activeOrders=data.orders.filter(order=>!order.unstaked);
  const totalStaked=activeOrders.reduce((sum,order)=>sum+order.amount,0);
  const totalPending=activeOrders.reduce((sum,order)=>sum+order.pending,0);
  const monthlyRate=rates?`${(rates.monthly/100).toFixed(2)}%`:'--';
  const totalRate=rates?`${(rates.monthly*period/3000).toFixed(2)}%`:'--';
  const referrerLocked=data.boundReferrer!==ZeroAddress||data.orders.length>0;
  const displayedReferrer=data.boundReferrer!==ZeroAddress?data.boundReferrer:referrerLocked?'未绑定':referrer;
  const inviteLink=account?`${window.location.origin}/staking?referrer=${account}`:'';
  const copyInviteLink=async()=>{
    try{
      await navigator.clipboard.writeText(inviteLink);
      showToast('邀请链接已复制');
    }catch{
      showToast('邀请链接复制失败');
    }
  };
  return <section className="main-width">
    <PageIntro eyebrow="STAKING / HONEY REWARDS" title="筑巢" accent="分红" subtitle="锁仓共识，共享蜜糖。时间沉淀价值，耐心收获红利。"/>
    <div className="metrics"><Metric label="我的团队业绩" value={connected?formatTokenAmount(data.teamVolume,2):'--'} unit={token.symbol} trend="链上实时"/><Metric label="最低质押" value={data.min===null?'--':formatTokenAmount(data.min,0)} unit={token.symbol} trend="合约参数"/><Metric label="我的直推人数" value={connected?data.directTeamCount:'--'} unit="人" trend="链上实时"/></div>
    <div className="staking-grid">
      <div className="panel stake-panel"><div className="panel-head"><div><small>BUILD YOUR HIVE</small><h2>开始筑巢</h2></div><div className="status-chip"><i/> CONTRACT ACTIVE</div></div>
        <div className="stake-label"><span>锁仓数量</span><span>钱包余额：{data.balance===null?'--':formatTokenAmount(data.balance,2)} {token.symbol}</span></div>
        <div className="stake-input"><input value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,''))} placeholder="输入数量"/><div><TokenLogo token={token.symbol}/><b>{token.symbol}</b></div><button onClick={()=>setAmount(data.balance===null?'':formatInputAmount(data.balance))}>MAX</button></div>
        <div className="referrer-input"><span>{referrerLocked?'推荐人':'推荐人（选填）'}</span><input value={displayedReferrer} readOnly={referrerLocked} onChange={e=>setReferrer(e.target.value.trim())} placeholder="0x..."/></div>
        <div className="period-title"><span>选择锁仓周期</span><small>每 10 天可领取一期收益</small></div>
        <div className="period-grid">{[30,60,90,180].map(p=><button key={p} onClick={()=>setPeriod(p)} className={period===p?'active':''}><span>{p} 天</span><small>{p/10} 期</small>{period===p&&<Check size={14}/>}</button>)}</div>
        <div className="estimate"><div><span>月利率</span><b>{monthlyRate}</b></div><div><span>周期总收益率</span><b>{totalRate}</b></div><div><span>预计解锁时间</span><b>{new Date(Date.now()+period*86400000).toLocaleDateString('zh-CN')}</b></div></div>
        <button className="primary-action" onClick={()=>transact('stake')} disabled={Boolean(busy)||(connected&&!amount)}>{busy.startsWith('stake')?'处理中...':connected?'确认质押':'连接钱包开始质押'}<LockKeyhole size={18}/></button>
      </div>
      <div className="panel position-panel"><div className="panel-head"><div><small>MY POSITION</small><h2>我的蜂巢</h2></div></div>
        {data.orders.length===0?<div className="empty-position"><div className="empty-hive"><Hexagon/><LockKeyhole/></div><h3>尚未建立蜂巢</h3><p>锁仓 {token.symbol} 后，你的仓位与实时收益将在这里展示。</p></div>:<div className="order-list">{data.orders.map(order=>{
          const maturityTime=order.startTime+order.durationDays*86400;
          const matured=Date.now()/1000>=maturityTime;
          return <div className={`stake-order ${order.unstaked?'closed':''}`} key={order.id}>
            <div className="order-head"><b className="order-principal">{formatTokenAmount(order.amount,2)} {token.symbol}</b><span>{order.unstaked?'已解押':matured?'已到期':'质押中'}</span></div>
            <div className="order-values"><span>质押周期 <b>{order.durationDays} 天</b></span><span>待领取 <b>{formatTokenAmount(order.pending,2)}</b></span></div>
            {!order.unstaked&&<div className="dual-actions"><button onClick={()=>transact('unstake',order.id)} disabled={!matured||Boolean(busy)}>{busy===`unstake-${order.id}`?'处理中...':matured?'到期解押':`${new Date(maturityTime*1000).toLocaleDateString('zh-CN')} 到期`}</button><button onClick={()=>transact('claim',order.id)} disabled={!order.claimablePeriods||Boolean(busy)}>{busy===`claim-${order.id}`?'处理中...':`领取收益 (${order.claimablePeriods}期)`}</button></div>}
          </div>
        })}</div>}
        <div className="position-data"><div><span>我的质押</span><b>{formatTokenAmount(totalStaked,2)} {token.symbol}</b></div><div><span>待领取收益</span><b className="gold">{formatTokenAmount(totalPending,2)} {token.symbol}</b></div></div>
        {connected&&data.orders.length>0&&<div className="invite-link"><span>我的邀请链接</span><div><input value={inviteLink} readOnly/><button onClick={copyInviteLink}><Copy size={14}/>复制</button></div></div>}
        <div className="reward-note"><Sparkles size={16}/><p>分红池由链上生态收益自动注入<br/><b>真实 · 透明 · 可验证</b></p></div>
      </div>
    </div>
  </section>
}
function Metric({label,value,unit,trend}) { return <div className="metric"><span>{label}</span><strong>{value} <small>{unit}</small></strong><em>{trend}</em></div> }

function TradingViewChart({ data }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth || 0,
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#666',
        fontFamily: 'IBM Plex Mono, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,.05)' },
        horzLines: { color: 'rgba(255,255,255,.05)' },
      },
      crosshair: {
        vertLine: { color: 'rgba(246,190,60,.35)' },
        horzLine: { color: 'rgba(246,190,60,.35)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,.08)',
        scaleMargins: { top: 0.08, bottom: 0.26 },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,.08)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#72d49b',
      downColor: '#ee7c78',
      wickUpColor: '#72d49b',
      wickDownColor: '#ee7c78',
      borderVisible: false,
      priceFormat: {
        type: 'custom',
        minMove: 1e-12,
        formatter: price => (price > 0 ? formatSmallNum(price) : ''),
      },
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    chart.priceScale('').applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
      borderVisible: false,
    });

    const resize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({ width: containerRef.current.clientWidth || 0 });
      chart.timeScale().fitContent();
    };

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    window.addEventListener('resize', resize);
    resize();

    return () => {
      window.removeEventListener('resize', resize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !chartRef.current) return;

    const candleData = data.map(item => ({
      time: item.time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    const volumeData = data.map(item => ({
      time: item.time,
      value: item.volume,
      color: item.close >= item.open ? 'rgba(114,212,155,.35)' : 'rgba(238,124,120,.35)',
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
    chartRef.current.timeScale().fitContent();
  }, [data]);

  return <div className="tv-chart-wrap"><div className="tv-chart" ref={containerRef}/>{!data.length && <div className="chart-empty">暂无 K 线数据</div>}</div>;
}

const roadmap=[
  ['01','筑巢','创世期','建立蜜蜂 IP 核心共识，完成 BSC 与 Flap 平台的首发部署。集结初始蜂群，完成社区基石构建。','已完成'],
  ['02','起飞','启动期','蜜蜂正式登陆 Flap 平台。开启链上交易，激活首批传播节点，释放初代 Meme 势能。','进行中'],
  ['03','酿蜜','共建期','开启共建工坊与社区激励计划，鼓励内容创作与裂变传播。拓展生态权益，沉淀共识。','待启动'],
  ['04','蜂群','繁荣期','深化链上应用场景，打通多元化生态，实现价值与共识的双向循环，形成自生长网络。','待启动'],
  ['05','蜂巢','飞升期','全域生态融合，链接更多 Web3 资源与合作伙伴，实现蜂群自治，打造真正的链上蜂巢。','终极愿景'],
];
const ecosystem=[['01','蜜蜂 Swap','去中心化链上交易','规划中'],['02','蜜蜂 Room','蜂群社区空间','规划中'],['03','蜜蜂 Mint 平台','一站式资产铸造','规划中'],['04','蜜蜂看线平台','专业行情与链上数据','规划中'],['05','蜜蜂发射平台','项目启动与资产发行','规划中'],['06','蜜蜂 NFT 交易市场','NFT 发行、展示与交易','规划中'],['07','蜜蜂专业市值管理工具','面向项目方的专业管理套件','规划中'],['08','蜜蜂 BSC Bot / SOL Bot','0 区块执行 · 反 MEV','规划中']];
function RoadmapPage(){return <section className="main-width roadmap-page"><PageIntro eyebrow="THE SWARM ERA / 2026+" title="蜂群" accent="纪元" subtitle="从筑巢到飞升，一场由共识驱动的进化之路。"/><div className="roadmap-progress"><span>EVOLUTION PROGRESS</span><div><i/></div><b>00 / 05</b></div><div className="timeline">{roadmap.map((r,i)=><article key={r[0]} className={i<2?'reached':''}><div className="time-node"><span>{r[0]}</span></div><div className="phase-card"><div className="phase-top"><div><small>PHASE {r[0]} · {r[2]}</small><h2>{r[1]}</h2></div><span className="phase-status"><i/>{r[4]}</span></div><p>{r[3]}</p><div className="phase-foot"><span>{['CORE CONSENSUS','TOKEN LAUNCH','COMMUNITY BUILDER','ECOSYSTEM GROWTH','DAO GOVERNANCE'][i]}</span><Hexagon size={20}/></div></div></article>)}</div><div className="ecosystem-block"><div className="ecosystem-head"><div><div className="eyebrow"><span/>BEE ECOSYSTEM / FULL STACK</div><h2>蜜蜂生态矩阵</h2></div><p>从交易、社区到资产发行与专业工具，构建完整的蜂群基础设施。</p></div><div className="ecosystem-grid">{ecosystem.map((x,i)=><article key={x[0]} className={i<0?'is-live':''}><div className="eco-meta"><span>{x[0]}</span><b>{x[3]}</b></div><h3>{x[1]}</h3><p>{x[2]}</p>{i<0&&<Check size={18}/>}</article>)}</div></div></section>}

function DashboardPage({ market, token }){
 const [timeframe, setTimeframe] = useState('5分');
 const { chart, trades } = useDashboardLiveData(market.pairAddress, token.symbol, timeframe);
 return <section className="main-width"><PageIntro eyebrow="ON-CHAIN ANALYTICS / LIVE" title="蜂巢" accent="数据" subtitle="链上数据，一目了然。每一笔增长都有迹可循。"><div className="live-badge"><i/> 数据实时同步中</div></PageIntro>
 <div className="metrics four"><Metric label="实时价格 PRICE" value={formatPrice(market.priceUsd)} trend={formatChange(market.change24h)}/><Metric label="总市值 MARKET CAP" value={market.marketCap ? `$${formatTokenAmount(market.marketCap, 0)}` : '--'} trend="实时"/><Metric label="24H 交易量 VOLUME" value={market.volume24h ? `$${formatTokenAmount(market.volume24h, 0)}` : '--'} trend="实时"/><Metric label="合约地址 TOKEN" value={shortAddress(TOKEN_ADDRESS)} trend="BSC 主网"/></div>
 <div className="chart-grid"><div className="panel chart-panel"><div className="chart-header"><div><small>{token.symbol} / USD</small><h2>{formatPrice(market.priceUsd)} <em>{formatChange(market.change24h)}</em></h2></div><div className="chart-tabs">{['1分','5分','1小时','1天'].map(item => <button key={item} className={timeframe === item ? 'active' : ''} onClick={() => setTimeframe(item)}>{item}</button>)}</div></div><div className="chart-area"><TradingViewChart data={chart}/></div></div>
 <div className="panel activity"><div className="panel-head"><div><small>LIVE FEED</small><h2>最新交易</h2></div><RefreshCw size={17}/></div>{trades.length ? trades.map(item => <div className="tx" key={item.id}><span className={item.kind==='买入'?'buy':'sell'}>{item.kind}</span><b>{item.wallet}</b><strong>{item.amount}</strong><small>{item.time}</small></div>) : <div className="tx"><span className="buy">--</span><b>--</b><strong>--</strong><small>--</small></div>}</div></div>
 <div className="data-foot"><ShieldCheck/> 数据实时同步 BSC 链上，透明可查 <button onClick={() => window.open(`https://bscscan.com/token/${TOKEN_ADDRESS}`, '_blank', 'noopener,noreferrer')}>查看区块浏览器 <ExternalLink size={14}/></button></div></section>
}

const faqs=[['为什么选择蜜蜂作为 IP？','蜜蜂代表秩序、协作与传播。它不是喧闹的符号，而是共识与生态的化身，天然契合 Web3 的社区精神。'],['蜜蜂在 Flap 平台首发意味着什么？','Flap 是 BSC 生态的创新发射平台。蜜蜂借助其流动性优势，快速激活链上共识。'],['如何参与蜜蜂的生态共建？','加入官方社群，参与内容传播与 Meme 创作。后续共建工坊开放后，持有者均可参与生态治理。'],['如何获取最新项目进展？','关注官方 X 及社群公告。路线图里程碑、上线时间与合约信息均会第一时间同步。']];
function AboutPage({ token }){const [open,setOpen]=useState(0);return <section className="main-width about-page"><PageIntro eyebrow="ABOUT HONEYBEE / OUR SIGNAL" title="一只蜜蜂是信号，" accent="一群蜜蜂是共识。" subtitle="我们不追逐喧闹，我们创造秩序。"/><div className="manifesto"><div className="manifesto-mark"><BrandMark/><span>EST. 2026<br/>BSC</span></div><div><small>THE HONEYBEE MANIFESTO</small><h2>在区块之间，<br/>我们铸造蜂巢。</h2><p>蜜蜂不是喧闹的符号，而是秩序、协作与传播的化身。在 BSC 的区块之间，我们铸造蜂巢；在 Flap 的浪潮之上，我们释放共识。</p><div className="project-facts"><div><span>代币名称</span><b>{token.name}</b></div><div><span>代币符号</span><b>{token.symbol}</b></div><div><span>发行链</span><b>BNB Smart Chain</b></div><div><span>首发平台</span><b>Flap</b></div></div></div></div>
 <div className="faq-section"><div className="faq-title"><small>FREQUENTLY ASKED</small><h2>你可能想知道</h2><p>关于小蜜蜂生态的核心问题</p></div><div className="faq-list">{faqs.map((f,i)=><button key={i} className={open===i?'open':''} onClick={()=>setOpen(open===i?-1:i)}><span className="faq-num">0{i+1}</span><div><b>{f[0]}</b>{open===i&&<p>{f[1]}</p>}</div><ChevronDown/></button>)}</div></div>
 <div className="join-band"><div><small>JOIN THE SWARM</small><h2>成为蜂群的一部分</h2><p>共识不靠等待发生，它由每一位参与者共同创造。</p></div><button>加入官方社区 <ChevronRight/></button></div></section>}

function WalletModal({onClose,onConnect,connected,account,bnbBalance,walletBalance,token}){return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="wallet-modal"><div className="modal-head"><div><small>CONNECT TO HIVE</small><h2>连接你的钱包</h2></div><button className="icon-button" onClick={onClose}><X/></button></div><p>{connected ? shortAddress(account) : '连接后查看当前钱包资产'}</p>{connected ? <div className="wallet-asset-list"><div className="wallet-asset-item"><div className="wallet-asset-main"><TokenLogo token="BNB"/><div><b>BNB</b><small>BNB Smart Chain</small></div></div><strong>{formatTokenAmount(bnbBalance, 4)} BNB</strong></div><div className="wallet-asset-item"><div className="wallet-asset-main"><TokenLogo token={token.symbol}/><div><b>{token.symbol}</b><small>{token.name}</small></div></div><strong>{formatTokenAmount(walletBalance, 4)} {token.symbol}</strong></div></div> : <button className="primary-action wallet-connect-action" onClick={()=>onConnect('钱包')}>连接钱包<ChevronRight size={18}/></button>}<div className="modal-network"><Network/><div><b>BNB Smart Chain</b><small>连接后将自动切换至 BSC 主网</small></div><span><i/> 正常</span></div><div className="terms"><ShieldCheck/> 连接即表示你同意服务条款与隐私政策</div></div></div>}

createRoot(document.getElementById('root')).render(<App />);
