require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("hardhat-gas-reporter");
require("dotenv").config();

const CHAIN_IDS = {
  hardhat: 31337, // chain ID for hardhat testing
};

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    hardhat: {
      chainId: CHAIN_IDS.hardhat,
      forking: {
        // Using Alchemy
        url: process.env.CHAIN_BSC_ARC, // url to RPC node, ${ALCHEMY_KEY} - must be your API key
        // Using Infura
        // url: `https://mainnet.infura.io/v3/${INFURA_KEY}`, // ${INFURA_KEY} - must be your API key
        blockNumber: 26369544, // a specific block number with which you want to work
      },
    },
    aurora: {
      url: `https://mainnet.aurora.dev`,
      accounts: [process.env.privateKey],
    },
    fantom: {
      url: `https://rpc.ftm.tools/`,
      accounts: [process.env.privateKey],
    },
    bsc: {
      url: process.env.CHAIN_STACK_HTTPS,
      accounts: [process.env.privateKey],
    },
  },
  mocha: {
    timeout: 100000000
  },
  solidity: {
    compilers: [
      { version: "0.8.7" },
      { version: "0.7.6" },
      { version: "0.6.6" }
    ]
  },
};
