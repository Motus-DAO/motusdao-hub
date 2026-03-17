const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying MotusClinicalProfile with account:", deployer.address);

  const Profile = await ethers.getContractFactory("MotusClinicalProfile");
  const profile = await Profile.deploy();

  await profile.waitForDeployment();

  const address = await profile.getAddress();

  console.log("MotusClinicalProfile deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

