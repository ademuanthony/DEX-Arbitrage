const { addToken } = require('./arb-setup');
const { web3 } = require('./web3-contract');

const methodId = '0x00000002';
const method3Id = '0x00000003';
const prompt = require('prompt-sync')();
const targetCA = '0x0000000000008AfdAcc486225455281F614843e7';

// address tokenIn, address tokenOut, address lpIn, address lpOut

const abi = [{ internalType: 'address', name: 'token', type: 'address' }];

const abi3 = [
  { internalType: 'address', name: 'token0', type: 'address' },
  { internalType: 'address', name: 'token1', type: 'address' },
  // { internalType: 'address', name: 'token1', type: 'address' },
];

let i  = 0

const scrap = async (tx) => {
  console.log(i++)
  try {
    // const tx = await web3.eth.getTransaction(hash);
    if (tx.to != targetCA) return;
    if (
      !tx ||
      !tx.to ||
      !tx.input ||
      tx.input.length <= 10 ||
      tx.to != targetCA
    )
      return false;
    const fnSig = tx.input.substring(0, 10);
    if (fnSig !== methodId && fnSig !== method3Id) return;

    const receipt = await web3.eth.getTransactionReceipt(hash);
    if (!receipt || !receipt.status) return;
    if (fnSig === methodId) {
      const len = 32 * 2 * 2;
      const decodedData = web3.eth.abi.decodeParameters(
        abi,
        tx.input.slice(tx.input.length - len)
      );
      await addToken(decodedData.token);
      console.log(`Scrapped new token ${decodedData.token}`);
    }

    if (fnSig === method3Id) {
      const len = 32 * 2 * 2;
      const decodedData = web3.eth.abi.decodeParameters(
        abi3,
        tx.input.slice(tx.input.length - len)
      );
      [decodedData.token0, decodedData.token1].forEach(async (token) => {
        await addToken(token);
        console.log(`Scrapped new token0 ${token}`);
      });
    }
  } catch (error) {
    console.log('hash failed', hash, error.message);
  }
};

const handleBlock = async (blockHeader) => {
  // console.log(`Handling new block ${blockHeader.number}`);
  const block = await web3.eth.getBlock(blockHeader.number);
  if (!block) return;
  if (!block.transactions && block.transactions.length === 0) return;
  for (let i = 0; i < block.transactions.length - 1; i++) {
    await scrap(block.transactions[i]);
  }
};

const test = async () => {
  const hash = prompt('Enter tx hash: ');
  await scrap(hash);
};

const main = async () => {
  web3.eth.subscribe('newBlockHeaders').on('data', async (block) => {
    handleBlock(block);
  });
  console.log('Started');
};

// test();
// main();

// process.on('uncaughtException', function (err) {
//   console.log('UnCaught Exception 83: ' + err);
//   console.error(err.stack);
//   fs.appendFile('./critical.txt', err.stack, function () {});
// });

// process.on('unhandledRejection', (reason, p) => {
//   console.log('Unhandled Rejection at: ' + p + ' - reason: ' + reason);
// });

module.exports = { scrap };
