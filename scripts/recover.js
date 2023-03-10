const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

let config,arb,owner;
const network = hre.network.name;
if (network === 'aurora') config = require('./../config/aurora.json');
if (network === 'fantom') config = require('./../config/fantom.json');
if (network === 'bsc') config = require('./../config/bsc.json');

const main = async () => {
  [owner] = await ethers.getSigners();
  console.log(`Owner: ${owner.address}`);
  const IArb = await ethers.getContractFactory('Arbf');
  arb = await IArb.attach(process.env.TRIGGER_ADDRESS);
  for (let i = 0; i < config.baseAssets.length; i++) {
    const asset = config.baseAssets[i];
    let balance = await arb.getBalance(asset.address);
    if(parseInt(balance) === 0) continue
    console.log(`${asset.sym} Start Balance: `,balance.toString());
    await arb.connect(owner).recoverTokens(asset.address);
    balance = await arb.getBalance(asset.address);
    await new Promise(r => setTimeout(r, 2000));
    console.log(`${asset.sym} Close Balance: `,balance.toString());
  }
}

process.on('uncaughtException', function(err) {
	console.log('UnCaught Exception 83: ' + err);
	console.error(err.stack);
	fs.appendFile('./critical.txt', err.stack, function(){ });
});

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: '+p+' - reason: '+reason);
});

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
