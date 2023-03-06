const hre = require('hardhat');
const fs = require('fs');
const { ethers } = require('hardhat');
require('dotenv').config();

let config, arb, owner;
const network = hre.network.name;
if (network === 'aurora') config = require('./../config/aurora.json');
if (network === 'fantom') config = require('./../config/fantom.json');

const main = async () => {
  [owner] = await ethers.getSigners();
  console.log(`Owner: ${owner.address}`);
  const IArb = await ethers.getContractFactory('Arb'); //0x1c72E65E96dA852323ebEd7471da11421906C962
  arb = IArb.attach('0x8E397a74589DF78296d3086E9993eC1AF25da151');

  const bnb = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
  const cake = '0xfa60d973f7642b748046464e165a65b7323b0dee';
  const busd = '0xaB1a4d4f1D656d2450692D237fdD6C7f9146e814';

  const babyBnb = '0x7FcF9b7f973fAc79fb20aAa11095314F1Dd9d3B8';
  const babyBnb2 = '0x2919128aAcC9e608A9E629aaB6b0189BF7932947';

  const baby = '0x7bc75e291e656e8658d66be1cc8154a3769a35dd';

  const amountIn = ethers.utils.parseEther('0.0001');

  const res = await arb.swapTest(
    babyBnb2,
    bnb,
    baby,
    amountIn,
    { gasLimit: 200000 }
  );
  console.log(res);

  // const res = await arb.getAmountOutMin(
  //   babyBnb2,
  //   bnb,
  //   baby,
  //   amountIn,
  //   { gasLimit: 200000 }
  // );

  console.log(parseInt(res));
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
