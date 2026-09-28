const { ethers, upgrades } = require("hardhat");

async function main() {
  const stakeToken = process.env.STAKE_TOKEN;
  const reserveWallet = process.env.RESERVE_WALLET;
  const owner = process.env.OWNER;
  const minStakeAmount = process.env.MIN_STAKE_AMOUNT || ethers.parseUnits("10000", 18).toString();
  const tierTwoMinAmount = process.env.TIER_TWO_MIN_AMOUNT || ethers.parseUnits("500000", 18).toString();
  const tierThreeMinAmount = process.env.TIER_THREE_MIN_AMOUNT || ethers.parseUnits("1000000", 18).toString();

  if (!stakeToken || !reserveWallet) {
    throw new Error("STAKE_TOKEN and RESERVE_WALLET are required");
  }

  const Factory = await ethers.getContractFactory("HoneyBeeStaking");
  const proxy = await upgrades.deployProxy(
    Factory,
    [stakeToken, reserveWallet, minStakeAmount, tierTwoMinAmount, tierThreeMinAmount],
    { initializer: "initialize", kind: "transparent" }
  );

  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();

  if (owner && owner.toLowerCase() !== (await ethers.getSigners())[0].address.toLowerCase()) {
    const tx = await proxy.transferOwnership(owner);
    await tx.wait();
  }

  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);

  console.log("proxy:", proxyAddress);
  console.log("implementation:", implementationAddress);
  console.log("admin:", adminAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
