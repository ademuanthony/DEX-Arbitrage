const {
  addPair,
  addToken,
  removeToken,
  addExchange,
  testArbitrage,
  quitOrRerun,
} = require('./app/arb-setup');
const prompt = require('prompt-sync')();

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

main();