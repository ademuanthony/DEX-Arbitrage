const { logger } = require('./logger');
const { ethers } = require('hardhat');
const { CAKE_ROUTER_ABI, CAKE_PAIR_ABI, TRIGGER_ABI } = require('./abi');
const {
  WBNB_ADDRESS,
  CAKE_ROUTER_ADDRESS,
  TRIGGER_CONTRACT,
  TRIGGER_ADDRESS,
  STANDARD_GAS_PRICE,
  BUSD_ADDRESS,
  USDT_ADDRESS,
  sleep,
} = require('./globals');
const db = require('./token-store');
const { Contract, web3 } = require('./web3-contract');

// directions
const WBNB_TKN_WBNB_1 = 1;
const WBNB_TKN_BUSD_WBNB = 2;
const WBNB_TKN_BUSD_USDT = 3;
const WBNB_BUSD_TKN_WBNB = 4;
const WBNB_USDT_TKN_WBNB = 5;

const WBNB_BUSD_TKN_BUSD_WBNB = 6;
const WBNB_BUSD_TKN_USDT_WBNB = 7;

const MAX_ARB_AMOUNT_IN = web3.utils.toBN(web3.utils.toWei('0.1'));
const MINIMUM_RESERVE_BNB = web3.utils.toBN(web3.utils.toWei('0.1'));
const MINIMUM_RESERVE_BUSD = web3.utils.toBN(web3.utils.toWei('50'));
const MINIMUM_RESERVE_USDT = web3.utils.toBN(web3.utils.toWei('50'));

const scanForOpportunity = async (pairs, token, amountIn) => {
  try {
    const startTime = new Date();
    // const pairs = await db.getPairs(token);
    // if (!pairs) {
    //   console.log('No pair found. Did you forget to add token?');
    //   return;
    // }

    let routeOptions = await Promise.all([
      build_WBNB_TKN_WBNB_route(pairs, token),
      build_WBNB_TKN_BUSD_WBNB_routes(pairs, token),
      build_WBNB_BUSD_TKN_WBNB_routes(pairs, token),
      build_WBNB_TKN_USDT_WBNB_routes(pairs, token),
      build_WBNB_USDT_TKN_WBNB_routes(pairs, token),
      build_WBNB_BUSD_TKN_BUSD_WBNB_routes(pairs, token),
      build_WBNB_USDT_TKN_USDT_WBNB_routes(pairs, token),
    ]);

    routeOptions = routeOptions.filter((r) => r.length > 0);
    const routes = [];
    for (let i = 0; i < routeOptions.length; i++) {
      for (let j = 0; j < routeOptions[i].length; j++) {
        routes.push(routeOptions[i][j]);
      }
    }

    if (routes.length < 2) {
      return;
    }

    const IArb = await ethers.getContractFactory('Arb');
    const arb = IArb.attach(TRIGGER_ADDRESS);

    amountIn = ethers.utils.parseEther(amountIn);

    const estimates = await Promise.all(
      routes.map(async (route) => {
        switch (route.length) {
          case 4:
            const result = await arb.estimateDualDexTrade(
              route[0],
              route[1],
              route[2],
              route[3],
              amountIn
            );
            return result;
          case 6:
            const result6 = await arb.estimateTriDexTrade(
              route[0],
              route[1],
              route[2],
              route[3],
              route[4],
              route[5],
              amountIn
            );
            return result6;
          case 8:
            const result8 = await arb.estimateTetraDexTrade(
              route[0],
              route[1],
              route[2],
              route[3],
              route[4],
              route[5],
              route[6],
              route[7],
              amountIn
            );
            return result8;
        }
      })
    );
    let bestAmount = ethers.utils.parseEther('0');
    let bestRoute;

    for (let i = 0; i < estimates.length; i++) {
      if (estimates[i].gt(bestAmount)) {
        bestAmount = estimates[i];
        bestRoute = routes[i];
      }
    }

    const grossProfit = bestAmount.sub(amountIn);
    if (grossProfit.lt(ethers.utils.parseEther('0.002'))) {
      // 0.0036
      if (parseInt(grossProfit) > 0) {
        console.log(
          `No profitable trade found with ${ethers.utils.formatEther(
            amountIn
          )}. Best Amount: ${ethers.utils.formatEther(
            bestAmount
          )} with profit of ${ethers.utils.formatEther(grossProfit)}`
        );
      } else {
        console.log(
          `No profitable trade found with ${ethers.utils.formatEther(
            amountIn
          )}. Best Amount: ${ethers.utils.formatEther(bestAmount)}`
        );
      }

      return;
    }

    console.log(
      `New opportunity found! Token: ${token}, Amount In: ${ethers.utils.formatEther(
        amountIn
      )}, Gross Profit: ${ethers.utils.formatEther(grossProfit)}`
    );

    console.log(bestRoute);

    await executeTrade(bestRoute, amountIn, grossProfit);

    const diffTime = Math.abs(new Date() - startTime);
    console.log('done in ', diffTime);
  } catch (error) {
    console.log(error);
  }
};

let executing = false;

const executeTrade = async (route, amount, expectedProfit) => {
  while (executing) {
    sleep(50);
  }
  executing = true;
  try {
    let fn;
    // const arb = new Contract(TRIGGER_ABI, TRIGGER_ADDRESS);
    const IArb = await ethers.getContractFactory('Arb');
    const arb = IArb.attach(TRIGGER_ADDRESS);

    //amount = web3.utils.toBN(amount.toString())

    switch (route.length) {
      case 4:
        fn = async () => {
          return await arb.dualDexTrade(
            route[0],
            route[1],
            route[2],
            route[3],
            amount,
            {
              gasLimit: 260000,
            }
          );
        };
        break;
      case 6:
        fn = async () => {
          return await arb.triDexTrade(
            route[0],
            route[1],
            route[2],
            route[3],
            route[4],
            route[5],
            amount,
            {
              gasLimit: 260000,
            }
          );
        };
        break;
      case 8:
        fn = async () => {
          return await arb.tetraDexTrade(
            route[0],
            route[1],
            route[2],
            route[3],
            route[4],
            route[5],
            route[6],
            route[7],
            amount,
            {
              gasLimit: 260000,
            }
          );
        };
        break;
      default:
        console.log('Invalid route');
        return;
    }

    const tx = await fn();
    console.log('Trade committed', tx.hash);
  } catch (error) {
    console.log(error);
  }

  executing = false;
};

const build_WBNB_TKN_WBNB_route = async (lpPairs, token) => {
  const bnbPairs = lpPairs.filter((p) => p.label === 'wbnb');
  if (bnbPairs.length < 2) return [];

  const routes = [];
  for (let i = 0; i < bnbPairs.length; i++) {
    for (let j = i + 1; j < bnbPairs.length; j++) {
      // TODO: suggest trade amount from lp
      routes.push([
        bnbPairs[i].router,
        bnbPairs[j].router,
        WBNB_ADDRESS,
        token,
      ]);
      routes.push([
        bnbPairs[j].router,
        bnbPairs[i].router,
        WBNB_ADDRESS,
        token,
      ]);
    }
  }
  return routes;
};

const build_WBNB_TKN_BUSD_WBNB_routes = async (lpPairs, token) => {
  const bnbPairs = lpPairs.filter((p) => p.label === 'wbnb');
  if (bnbPairs.length < 1) return [];
  const busdPairs = lpPairs.filter((p) => p.label === 'busd');
  if (busdPairs.length < 1) return [];
  const routes = [];
  for (let i = 0; i < bnbPairs.length; i++) {
    for (let j = 0; j < busdPairs.length; j++) {
      routes.push([
        bnbPairs[i].router,
        busdPairs[j].router,
        bnbPairs[i].router,
        WBNB_ADDRESS,
        token,
        BUSD_ADDRESS,
      ]);
    }
  }

  return routes;
};

const build_WBNB_BUSD_TKN_WBNB_routes = async (lpPairs, token) => {
  const bnbPairs = lpPairs.filter((p) => p.label === 'wbnb');
  if (bnbPairs.length < 1) return [];
  const busdPairs = lpPairs.filter((p) => p.label === 'busd');
  if (busdPairs.length < 1) return [];
  const routes = [];
  for (let i = 0; i < bnbPairs.length; i++) {
    for (let j = 0; j < busdPairs.length; j++) {
      routes.push([
        bnbPairs[i].router,
        busdPairs[j].router,
        bnbPairs[i].router,
        WBNB_ADDRESS,
        BUSD_ADDRESS,
        token,
      ]);
    }
  }

  return routes;
};

const build_WBNB_TKN_USDT_WBNB_routes = async (lpPairs, token) => {
  const bnbPairs = lpPairs.filter((p) => p.label === 'wbnb');
  if (bnbPairs.length < 1) return [];
  const usdtPairs = lpPairs.filter((p) => p.label === 'usdt');
  if (usdtPairs.length < 1) return [];
  const routes = [];
  for (let i = 0; i < bnbPairs.length; i++) {
    for (let j = 0; j < usdtPairs.length; j++) {
      routes.push([
        bnbPairs[i].router,
        usdtPairs[j].router,
        bnbPairs[i].router,
        WBNB_ADDRESS,
        token,
        BUSD_ADDRESS,
      ]);
    }
  }

  return routes;
};

const build_WBNB_USDT_TKN_WBNB_routes = async (lpPairs, token) => {
  const bnbPairs = lpPairs.filter((p) => p.label === 'wbnb');
  if (bnbPairs.length < 1) return [];
  const usdtPairs = lpPairs.filter((p) => p.label === 'usdt');
  if (usdtPairs.length < 1) return [];
  const routes = [];
  for (let i = 0; i < bnbPairs.length; i++) {
    for (let j = 0; j < usdtPairs.length; j++) {
      routes.push([
        bnbPairs[i].router,
        usdtPairs[j].router,
        bnbPairs[i].router,
        WBNB_ADDRESS,
        BUSD_ADDRESS,
        token,
      ]);
    }
  }

  return routes;
};

const build_WBNB_BUSD_TKN_BUSD_WBNB_routes = async (lpPairs, token) => {
  const busdPairs = lpPairs.filter((p) => p.label === 'busd');
  if (busdPairs.length < 2) return [];
  const twoList = [];
  for (let i = 0; i < busdPairs.length; i++) {
    for (let j = i + 1; j < busdPairs.length; j++) {
      twoList.push(busdPairs[i], busdPairs[j]);
    }
  }
  const routes = [];
  for (let i = 0; i < twoList.length; i++) {
    routes.push([
      CAKE_ROUTER_ADDRESS,
      twoList[0].router,
      twoList[1].router,
      CAKE_ROUTER_ADDRESS,
      WBNB_ADDRESS,
      BUSD_ADDRESS,
      token,
      BUSD_ADDRESS,
    ]);
    routes.push([
      CAKE_ROUTER_ADDRESS,
      twoList[1].router,
      twoList[0].router,
      CAKE_ROUTER_ADDRESS,

      WBNB_ADDRESS,
      BUSD_ADDRESS,
      token,
      BUSD_ADDRESS,
    ]);
  }

  return routes;
};

const build_WBNB_USDT_TKN_USDT_WBNB_routes = async (lpPairs, token) => {
  const usdtPairs = lpPairs.filter((p) => p.label === 'usdt');
  if (usdtPairs.length < 2) return [];
  const twoList = [];
  for (let i = 0; i < usdtPairs.length; i++) {
    for (let j = i + 1; j < usdtPairs.length; j++) {
      twoList.push(usdtPairs[i], usdtPairs[j]);
    }
  }
  const routes = [];
  for (let i = 0; i < twoList.length; i++) {
    routes.push([
      CAKE_ROUTER_ADDRESS,
      twoList[0].router,
      twoList[1].router,
      CAKE_ROUTER_ADDRESS,
      WBNB_ADDRESS,
      USDT_ADDRESS,
      token,
      USDT_ADDRESS,
    ]);
    routes.push([
      CAKE_ROUTER_ADDRESS,
      twoList[1].router,
      twoList[0].router,
      CAKE_ROUTER_ADDRESS,

      WBNB_ADDRESS,
      USDT_ADDRESS,
      token,
      USDT_ADDRESS,
    ]);
  }

  return routes;
};

module.exports = {
  scanForOpportunity,
  MINIMUM_RESERVE_BNB,
  MINIMUM_RESERVE_BUSD,
  MINIMUM_RESERVE_USDT,
};
