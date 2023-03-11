const hre = require('hardhat');
const fs = require('fs');
const { deployDiamond } = require('./deploy-diamond');
const { getTokens, getPairs } = require('../app/token-store');
const { scanForOpportunity } = require('../app/arbitrage');
const { ethers } = require('hardhat');
require('dotenv').config();

const testDexData = [
  {
    router1: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    router2: '0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7',
    token1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    token2: '0x9fD87aEfe02441B123c3c32466cD9dB4c578618f',
    amount: ethers.utils.parseEther('0.3'),
  },
  {
    router1: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    router2: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
    token1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    token2: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
    amount: ethers.utils.parseEther('0.3'),
  },
  {
    router1: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
    router2: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    token1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    token2: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
    amount: ethers.utils.parseEther('0.3'),
  },
  {
    router1: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    router2: '0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F',
    token1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    token2: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
    amount: ethers.utils.parseEther('0.3'),
  },
  {
    router1: '0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F',
    router2: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    token1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    token2: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
    amount: ethers.utils.parseEther('0.3'),
  },
  {
    router1: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
    router2: '0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F',
    token1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    token2: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
    amount: ethers.utils.parseEther('0.3'),
  },
  {
    router1: '0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F',
    router2: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
    token1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    token2: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
    amount: ethers.utils.parseEther('0.3'),
  },
];

let owner;

const testEstimate = async () => {
  const tokens = await getTokens();
  console.log('tokens', tokens.length);
  for (let i = 0; 1; i++) {
    const token = tokens[i];
    const pairs = await getPairs(token.address);
    await scanForOpportunity(pairs, token.address, '1');
  }
};

const testTrade = async () => {
  const diamond = await deployDiamond();
  // send some wbnb to ca

  const address = '0xf977814e90da44bfa03b6295a0616a897441acec';
  const impersonatedSigner = await ethers.getImpersonatedSigner(address);
  const wbnb = await ethers.getContractAt(
    'IERC20',
    '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
  );
  await wbnb
    .connect(impersonatedSigner)
    .transfer(diamond.address, ethers.utils.parseEther('2'));

  const IArb = await ethers.getContractFactory('ArbFacet');
  const arb = await IArb.attach(diamond.address);

  await arb.dualDexTrade(testDexData[3], { gasLimit: 300000 });
};

const main = async () => {
  [owner] = await ethers.getSigners();
  console.log(`Owner: ${owner.address}`);
  diamond = await deployDiamond();

  process.env.TRIGGER_ADDRESS = diamond.address;

  await testTrade();
};

process.on('uncaughtException', function (err) {
  console.log('UnCaught Exception 83: ' + err);
  console.error(err.stack);
  fs.appendFile('./critical.txt', err.stack, function () {});
});

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: ' + p + ' - reason: ' + reason);
});

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
