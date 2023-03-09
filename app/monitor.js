const { web3 } = require('./web3-contract');
const redis = require('redis');

const publisher = redis.createClient();
const subscriber = publisher.duplicate();
const bees = [];
let i = 0;

const main = async () => {
  await publisher.connect();
  await subscriber.connect();

  const swapEventTopic =
    '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';
  const logOptions = {
    // Filter transfer topics
    topics: [swapEventTopic],
  };

  let subscription = web3.eth.subscribe('logs', logOptions);

  subscription.on('data', async (event) => {
    if (bees.length === 0) return;
    publisher.publish(
      `newEvent_${bees[i % bees.length]}`,
      JSON.stringify(event)
    );
    i++;
    if (i > 1000000) i = 0;
  });

  subscriber.subscribe('addNewBee', async (message) => {
    console.log(`Registering new bee, ${message}`);
    bees.push(message);
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
