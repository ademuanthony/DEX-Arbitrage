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
const { scrap } = require('./app/watch_op');

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

function rand(min, max) {
  return (
    (Math.floor(Math.pow(10, 14) * Math.random() * Math.random()) %
      (max - min + 1)) +
    min
  );
}

const runArb = async (tokenAddress, addTokensCalled) => {
  if (!tokenAddress) return;
  const pairs = await db.getPairs(tokenAddress.toString());
  if ((!pairs || pairs.length === 0) && !addTokensCalled) {
    await addToken(tokenAddress);
    runArb(tokenAddress, true);
    return;
  }
  if (!pairs || pairs.length === 0) return;

  const amountIn = rand(150, 700) / 1000;

  await scanForOpportunity(pairs, tokenAddress, amountIn.toString());
};

const main = () => {
  const swapEventTopic =
    '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';
  const scrapTarget =
    web3.utils.toChecksumAddress('0x0000000000008AfdAcc486225455281F614843e7');
  const logOptions = {
    // Filter transfer topics
    topics: [swapEventTopic],
  };

  const basePairs = [
    '0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16',
    '0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE',
    '0x7EFaEf62fDdCCa950418312c6C91Aef321375A00',
    '0x2354ef4DF11afacb85a5C7f98B624072ECcddbB1',
    '0xd99c7F6C65857AC913a8f880A4cb84032AB2FC5b',
  ];

  let subscription = web3.eth.subscribe('logs', logOptions);

  subscription.on('data', async (event) => {
    if (basePairs.indexOf(event.address) >= 0) return;
    const token = await db.getTokenInfoByPairAddress(event.address);
    if (!token) {
      if (event.topics.indexOf(scrapTarget)) {
        const tx = await web3.eth.getTransaction(event.transactionHash, event.transactionHash);
        scrap(tx);
      }
      return;
    }
    runArb(token.address);
  });
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

  web3.eth.subscribe('pendingTransactions').on('data', async (txHash) => {
    // const startTime = new Date();
    const txData = await decodeTransaction(web3, txHash);
    if (!txData || !txData.known) return;
    const slippage = await getSlippage(txData);
    if (slippage > 1) return;
    runArb(txData.token, false);
  });
};

main();

process.on('uncaughtException', function (err) {
  console.log('UnCaught Exception 83: ' + err);
  console.error(err.stack);
  fs.appendFile('./critical.txt', err.stack, function () {});
});

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: ' + p + ' - reason: ' + reason);
});
