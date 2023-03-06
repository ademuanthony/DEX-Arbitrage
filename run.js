require('dotenv').config();
const prompt = require('prompt-sync')();
const { STANDARD_GAS_PRICE } = require('./app/globals');
const logger = require('./app/logger');
const {
  decodeTransaction,
  checkProfitability,
  processTrade,
  getSlippage,
} = require('./app/processor');
const db = require('./app/token-store');
const { SandwichManager } = require('./app/sandwich-manager');
const { addNewToken } = require('./app/token-store');
const { web3 } = require('./app/web3-contract');
const {
  addPair,
  addToken,
  removeToken,
  addExchange,
} = require('./app/arb-setup');
const { scanForOpportunity } = require('./app/arbitrage');

const demo = async () => {
  const hash =
    '0x49e8657627abb79fb1c9ea1fc7c938a6e7e20b6adcf9ed0434699dcc800a8b8d';
  const startTime = new Date();
  const tokenData = await decodeTransaction(web3, hash, true);
  dumpTokenData(tokenData);
  if (!tokenData) return;
  console.log(tokenData);
  const profitable = await checkProfitability(tokenData);
  if (!profitable) return;
  const diffTime = Math.abs(new Date() - startTime);
  console.log('done in ', diffTime);
};

const dumpTokenData = (tokenData) => {
  console.log(
    `Tx Value: ${web3.utils.toBN(
      tokenData.value
    )}; Amount out min: ${web3.utils.toBN(tokenData.amountOutMin)}; Token: ${
      tokenData.token
    }; LP: ${tokenData.pairAddress}`
  );
};

function rand(min, max){
  return (Math.floor(Math.pow(10,14)*Math.random()*Math.random())%(max-min+1))+min;
}

const runArb = async (token, addTokensCalled) => {
  if (!token) return;
  const pairs = await db.getPairs(token.toString());
  if ((!pairs || pairs.length === 0) && !addTokensCalled) {
    await addToken(token);
    runArb(token, true);
    return;
  }
  if (!pairs || pairs.length === 0) return;

  const amountIn = rand(50, 200)/1000;

  await scanForOpportunity(pairs, token, amountIn.toString());
};

const main0 = async () => {
  // await demo();
  // return;

  // const sandwichRunner = new SandwichManager();

  // web3.eth.subscribe('newPendingTransactions').on('data', async (txHash) => {
  //   // const startTime = new Date();

  //   const txData = await decodeTransaction(web3, txHash);
  //   if (!txData) return;

  //   if (txData.isAnEnemy || txData.gasPrice > STANDARD_GAS_PRICE) {
  //     sandwichRunner.handleEnemy(txData);
  //     return;
  //   }

  //   const profitabilityInfo = await checkProfitability(txData);
  //   if (!profitabilityInfo) return;

  //   // const diffTime = Math.abs(new Date() - startTime);
  //   // console.log('done in ', diffTime);

  //   if (txData.known) {
  //     if (!txData.whitelisted) return;
  //     sandwichRunner.addTransaction(txData, profitabilityInfo);
  //   } else {
  //     addNewToken(txData);
  //   }
  // });

  web3.eth.subscribe('newPendingTransactions').on('data', async (txHash) => {
    // const startTime = new Date();
    const txData = await decodeTransaction(web3, txHash);
    if (!txData) return;
    const slippage = await getSlippage(txData);
    if (slippage > 1) return;
    runArb(txData.token, false);
  });
};

const main = async () => {
  console.log(`
  Welcome to setup!!!
  
  Options:
  1: Add token
  2: Remove token
  3: Add pair
  4: Add exchange
  5: Test arbitrage
  6: Test arbitrage tx
  7: Run arbitrage bot
  `);
  const option = parseInt(prompt('Select an option: '));
  switch (option) {
    case 1:
      await addToken();
      break;
    case 2:
      await removeToken();
      break;
    case 3:
      await addPair();
      break;
    case 4:
      await addExchange();
      break;
    case 5:
      await testArbitrage();
      break;
    case 6:
      await testArbitrage();
      break;
    case 7:
      await web3.eth
        .subscribe('newPendingTransactions')
        .on('data', async (txHash) => {
          // const startTime = new Date();
          const txData = await decodeTransaction(web3, txHash);
          if (!txData) return;
          runArb(txData.token, false);
        });
      break;
    default:
      console.log('Invalid option');
      quitOrRerun();
  }
};

main0();

// process.on('uncaughtException', function (err) {
//   console.log('UnCaught Exception 83: ' + err);
//   console.error(err.stack);
//   fs.appendFile('./critical.txt', err.stack, function () {});
// });

// process.on('unhandledRejection', (reason, p) => {
//   console.log('Unhandled Rejection at: ' + p + ' - reason: ' + reason);
// });
