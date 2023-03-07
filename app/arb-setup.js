require('dotenv').config('.env');

const prompt = require('prompt-sync')();
const { CAKE_FACTORY_ABI, CAKE_ROUTER_ABI, CAKE_PAIR_ABI } = require('./abi');
const {
  scanForOpportunity,
  MINIMUM_RESERVE_BNB,
  MINIMUM_RESERVE_BUSD,
  MINIMUM_RESERVE_USDT,
} = require('./arbitrage');
const {
  ZERO_ADDRESS,
  WBNB_ADDRESS,
  BUSD_ADDRESS,
  USDT_ADDRESS,
  CAKE_FACTORY,
} = require('./globals');
const db = require('./token-store');
const { Contract, web3 } = require('./web3-contract');

const addPair = async () => {
  const token0 = web3.utils.toChecksumAddress(prompt('Enter token0: '));
  const token1 = web3.utils.toChecksumAddress(prompt('Enter token1: '));
  const pairAddress = web3.utils.toChecksumAddress(
    prompt('Enter pair address: ')
  );
  const router = web3.utils.toChecksumAddress(prompt('Enter router: '));
  const result = await db.addPair({
    pair_address: pairAddress,
    token0,
    token1,
    router,
  });
  if (result) {
    console.log('Pair added successfully');
  }
};

const addToken = async (token0,main) => {
  try {
    const manualAdding = !token0;

    if (manualAdding)
      token0 = web3.utils.toChecksumAddress(prompt('Enter token0: '));

    let whitelisted = false;
    let pairAddress = await CAKE_FACTORY.methods
      .getPair(token0, WBNB_ADDRESS)
      .call();
    if (manualAdding) {
      addToWhitelist = prompt('Whitelisted? (1 = True; 0 = False) ');
      whitelisted = addToWhitelist === '1';
    }
    await db.addNewToken({
      token: token0,
      pairAddress,
      tested: whitelisted,
      whitelisted
    });
    console.log('Added to db.')
    // add wbnb, busd and usdt pair for all exchanges
    const exchanges = await db.getExchanges();
    if (!exchanges) {
      console.log('Error in loading exchanges');
      return;
    }
    for (let i = 0; i < exchanges.length; i++) {
      const exchange = exchanges[i];
      await Promise.all([
        tryAddingPairs(WBNB_ADDRESS, token0, exchange, 'wbnb'),
        tryAddingPairs(BUSD_ADDRESS, token0, exchange, 'busd'),
        tryAddingPairs(USDT_ADDRESS, token0, exchange, 'usdt'),
      ]);
    }
  } catch (error) {
    console.log(error.message);
  }
};

const tryAddingPairs = async (token0, token1, exchange, label) => {
  const factory = new Contract(CAKE_FACTORY_ABI, exchange.factory);
  const pair = await factory.methods.getPair(token0, token1).call();
  if (pair === ZERO_ADDRESS) {
    console.log(`There is no ${label} on ${exchange.name}`);
    return false;
  }
  const oldPair = await db.getPair(pair);
  if (oldPair) {
    console.log('pair exists');
    return;
  }

  const pairContract = new Contract(CAKE_PAIR_ABI, pair);
  token0 = await pairContract.methods.token0().call();
  token1 = await pairContract.methods.token1().call();

  const reserve = await pairContract.methods.getReserves().call();
  switch (label) {
    case 'wbnb':
      const reserveBNB =
        token0 === WBNB_ADDRESS ? reserve.reserve0 : reserve.reserve1;
      if (web3.utils.toBN(reserveBNB).lt(MINIMUM_RESERVE_BNB)) {
        console.log(`There is not enough WBNB on ${exchange.name} ${web3.utils.fromWei(reserveBNB, 'ether')}`);
        return;
      }
      break;
    case 'busd':
      const reserveBUSD =
        token0 === BUSD_ADDRESS ? reserve.reserve0 : reserve.reserve1;
      if (web3.utils.toBN(reserveBUSD).lt(MINIMUM_RESERVE_BUSD)) {
        console.log(`There is not enough BUSD on ${exchange.name} ${web3.utils.fromWei(reserveBUSD, 'ether')}`);
        return;
      }
      break;
    case 'usdt':
      const reserveUSDT =
        token0 === USDT_ADDRESS ? reserve.reserve0 : reserve.reserve1;
      if (web3.utils.toBN(reserveUSDT).lt(MINIMUM_RESERVE_USDT)) {
        console.log(`There is not enough USDT on ${exchange.name} ${web3.utils.fromWei(reserveUSDT, 'ether')}`);
        return;
      }
      break;
  }

  const result = await db.addPair({
    pair_address: pair,
    token0,
    token1,
    router: exchange.router,
    label,
  });
  console.log(`${label} added on ${exchange.name}`);
  return result;
};

const removeToken = async () => {
  const token0 = prompt('Target token: ');
  const result = await db.removePairs(token0);
  if (!result) {
    console.log('Something wnt wrong.');
    return;
  }
  console.log(`${result.rowCount} Deleted`);
};

const addExchange = async (main) => {
  try {
    const name = prompt('Exchange name: ');
    const website = prompt('Website: ');
    let router = prompt('Router address: ');
    if (!name || !website || !router) {
      console.log('Required fields not set');
      return;
    }
    console.log('getting factory');
    router = web3.utils.toChecksumAddress(router);
    const routerContract = new Contract(CAKE_ROUTER_ABI, router);
    let factory = await routerContract.methods.factory().call();
    console.log(`Factory address is ${factory}`);

    const factoryContract = new Contract(CAKE_FACTORY_ABI, factory);
    const usdtPair = await factoryContract.methods
      .getPair(WBNB_ADDRESS, USDT_ADDRESS)
      .call();
    console.log(`USDT pair is ${usdtPair}`);
    const busdPair = await factoryContract.methods
      .getPair(WBNB_ADDRESS, BUSD_ADDRESS)
      .call();
    console.log(`BUSD pair is ${busdPair}`);

    const result = await db.addExchange({
      name,
      website,
      router,
      factory,
      usdtPair,
      busdPair,
    });
    if (!result) {
      console.log('Unable to add exchange');
      return;
    }
    console.log('Exchange added');
  } catch (error) {
    console.log(error.message);
  }
};

const testArbitrage = async () => {
  const token0 = prompt('Target token: ');
  const testAmount = prompt('Order size: ');
  await scanForOpportunity(token0, testAmount);
};

module.exports = {
  addPair,
  addToken,
  removeToken,
  addExchange,
};
