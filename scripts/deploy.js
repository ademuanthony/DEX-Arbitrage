const hre = require("hardhat");

async function main() {
   [owner] = await ethers.getSigners();
   console.log(`Owner: ${owner.address}`);
  const contractName = 'ArbFacet';
  await hre.run("compile");
  const smartContract = await hre.ethers.getContractFactory(contractName);
  const contract = await smartContract.deploy();
  await contract.deployed();
  console.log(`${contractName} deployed to: ${contract.address}`); 
  console.log('Put the above contract address into the .env file under arbContract');

  return contract;
}

if (require.main === module) {
  deployDiamond(true)
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

exports.deployFacet = main
