const hre = require("hardhat");

async function main() {
  const SocialScoreChain = await hre.ethers.getContractFactory(
    "SocialScoreChain"
  );
  const socialScore = await SocialScoreChain.deploy();
  await socialScore.deployed();

  console.log("SocialScoreChain deployed to:", socialScore.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
