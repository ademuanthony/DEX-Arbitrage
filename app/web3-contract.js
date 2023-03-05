const Contract = require('web3-eth-contract');
const Web3 = require('web3');

Contract.setProvider(process.env.INFURA_URL);

const web3 = new Web3(
  new Web3.providers.WebsocketProvider(process.env.INFURA_URL)
);

module.exports = { Contract, web3 };
