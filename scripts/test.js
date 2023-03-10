const hre = require('hardhat');
const fs = require('fs');
const { deployDiamond } = require('./deploy-diamond');
const { getTokens, getPairs } = require('../app/token-store');
const { scanForOpportunity } = require('../app/arbitrage');
require('dotenv').config();

const testDexData = [
  {
    router1: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    router2: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
    token1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    token2: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
  },
  {
    router1: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
    router2: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    token1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    token2: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
  },
  {
    router1: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    router2: '0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F',
    token1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    token2: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
  },
  {
    router1: '0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F',
    router2: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    token1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    token2: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
  },
  {
    router1: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
    router2: '0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F',
    token1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    token2: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
  },
  {
    router1: '0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F',
    router2: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
    token1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    token2: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1',
  },
];

let owner;

const main = async () => {
  [owner] = await ethers.getSigners();
  console.log(`Owner: ${owner.address}`);
  diamond = await deployDiamond();

  const IArb = await ethers.getContractFactory('ArbFacet');
  // const arb = await IArb.attach(diamond.address);
  process.env.TRIGGER_ADDRESS = diamond.address;

  const tokens = await getTokens();
  console.log('tokens', tokens.length);
  for (let i = 0; 1; i++) {
    const token = tokens[i];
    const pairs = await getPairs(token.address);
    await scanForOpportunity(pairs, token.address, '1');
  }
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
