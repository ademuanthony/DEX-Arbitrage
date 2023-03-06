require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
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
    bscTestnet: {
      url: process.env.CHAIN_STACK_BSC_TESTNET_HTTPS,
      accounts: [process.env.privateKey],
    },
  },
  solidity: {
    compilers: [
      { version: "0.8.7" },
      { version: "0.7.6" },
      { version: "0.6.6" }
    ]
  },
};
