const {
  addPair,
  addToken,
  removeToken,
  addExchange,
  testArbitrage,
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
      quitOrRerun();
      break;
    case 2:
      await removeToken();
      quitOrRerun();
      break;
    case 3:
      await addPair();
      quitOrRerun();
      break;
    case 4:
      await addExchange();
      quitOrRerun();
      break;
    case 5:
      await testArbitrage();
      quitOrRerun();
      break;
    case 6:
      await testArbitrage();
      quitOrRerun();
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

const quitOrRerun = () => {
  console.log('Press y to continue. Press any key to quit');
  const option = prompt('');
  if (option && option.toLowerCase() === 'y') {
    main();
    return;
  }
  console.log('goodbye...');
  process.exit();
};
