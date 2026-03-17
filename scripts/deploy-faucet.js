const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying MotusCeloFaucet with account:", deployer.address);

  const dripAmount = ethers.parseEther("0.01"); // 0.01 CELO por claim (Hardhat v6 / ethers v6)

  const Faucet = await ethers.getContractFactory("MotusCeloFaucet");
  const faucet = await Faucet.deploy(dripAmount);

  await faucet.waitForDeployment();

  const address = await faucet.getAddress();

  console.log("MotusCeloFaucet deployed to:", address);
  console.log("Drip amount (wei):", dripAmount.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

