const { CAKE_PAIR_ABI } = require('./abi');
// const knownTokens = require('../data/test-known-tokens.json');
const knownTokens = require('../data/whitelisted-tokens.json');
const {
  swapExactETHForTokens,
  swapExactETHForTokensAbi,
  CAKE_FACTORY,
  WBNB_ADDRESS,
  CAKE_ROUTER_ADDRESS,
  CAKE_FACTORY_ADDRESS,
  MIN_GROSS_PROFIT,
  MAX_TRADE_SIZE,
  swapETHForExactTokens,
} = require('./globals');
const { Contract, web3 } = require('./web3-contract');
const logger = require('./logger');
const { getTokenInfo, isAnEnemy } = require('./token-store');

const bigZero = web3.utils.toBN(0);

const decodeTransaction = async (web3, hash, testing) => {
  try {
    const tx = await web3.eth.getTransaction(hash);
    if (
      !tx ||
      !tx.to ||
      !tx.input || tx.input.length < 10//||
      // tx.to !== CAKE_ROUTER_ADDRESS ||
      // (tx.blockNumber && !testing)
    )
      return false;
    const fnSig = tx.input.substring(0, 10);
    if (fnSig != swapExactETHForTokens && fnSig !== swapETHForExactTokens)
      return false;

    const decodedData = web3.eth.abi.decodeParameters(
      swapExactETHForTokensAbi,
      tx.input.slice(10)
    );

    const txData = {
      hash: tx.hash,
      gasPrice: web3.utils.toBN(tx.gasPrice),
      gas: tx.gas,
      nonce: tx.nonce,
      token: decodedData.path[decodedData.path.length - 1],
      paired: decodedData.path[0],
      amountOutMin: web3.utils.toBN(decodedData.amountOutMin),
      deadline: decodedData.deadline,
      value: web3.utils.toBN(tx.value),
      known: false,
    };

    // for (let ppt in knownTokens) {
    //   if (ppt.toString().toLowerCase() === txData.token.toLowerCase()) {
    //     txData.known = true;
    //     txData.whitelisted = knownTokens[ppt].whitelisted;
    //     txData.pairAddress = knownTokens[ppt].pairAddress;
    //     break;
    //   }
    // }

    // if (!txData.known) {
    //   const info = await getTokenInfo(txData.token);
    //   if (info) {
    //     txData.known = true;
    //     txData.pairAddress = info.pair_address;
    //   } else {
    //     txData.pairAddress = await CAKE_FACTORY.methods
    //       .getPair(txData.token, WBNB_ADDRESS)
    //       .call();
    //   }
    // }

    // txData.isAnEnemy = await isAnEnemy(tx.from);

    return txData;
  } catch (error) {
    logger.error(error.message, 'decodeTransaction');
    return false;
  }
};

const getPair = (tokenA, tokenB) => {
  let _hexadem =
    '0x00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f4a84f69bd5';
  let _factory = CAKE_FACTORY_ADDRESS;
  let [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA];

  let abiEncoded1 = web3.eth.abi.encodeParameters(
    ['address', 'address'],
    [token0, token1]
  );
  abiEncoded1 = abiEncoded1.split('0'.repeat(24)).join('');
  let salt = web3.utils.soliditySha3(abiEncoded1);
  let abiEncoded2 = web3.eth.abi.encodeParameters(
    ['address', 'bytes32'],
    [_factory, salt]
  );
  abiEncoded2 = abiEncoded2.split('0'.repeat(24)).join('').substr(2);
  let pair =
    '0x' + web3.utils.soliditySha3('0xff' + abiEncoded2, _hexadem).substr(26);
  return pair;
};

const getSlippage = async (txData) => {
  const reserve = await getWBNBReserve(txData);
  const amountOut = getAmountOut(
    txData.value,
    reserve.reserveBNB,
    reserve.reserveTkn
  );
  if (amountOut.lte(txData.amountOutMin)) return 0;
  const diff = amountOut.sub(txData.amountOutMin);
  let slippage = 5;
  if (txData.amountOutMin.gt(bigZero)) {
    if (diff.gt(bigZero)) {
      const slippageBN = txData.amountOutMin.div(diff);
      slippage = 100 / parseFloat(slippageBN.toString());
    } else {
      slippage = 0;
    }
  }
  return slippage;
}

const checkProfitability = async (txData) => {
  const reserve = await getWBNBReserve(txData);
  const amountOut = getAmountOut(
    txData.value,
    reserve.reserveBNB,
    reserve.reserveTkn
  );
  if (!amountOut.gt(txData.amountOutMin)) return false;
  const diff = amountOut.sub(txData.amountOutMin);
  let slippage = 0.5;
  if (txData.amountOutMin.gt(bigZero)) {
    if (diff.gt(bigZero)) {
      const slippageBN = txData.amountOutMin.div(diff);
      slippage = 100 / parseFloat(slippageBN.toString());
    } else {
      slippage = 0;
    }
  }

  // calculate maxTradeSize
  if (slippage == 0) return false;
  // AmountIn = (AmountOutMin * reserveIn) / (reserveOut - AmountOutMin)
  const numerator = txData.amountOutMin.mul(reserve.reserveBNB);
  const denominator = reserve.reserveTkn.add(txData.amountOutMin);
  let maxTradeSize = numerator.div(denominator);

  if (maxTradeSize.gt(MAX_TRADE_SIZE)) {
    maxTradeSize = MAX_TRADE_SIZE;
  }

  const amountLessFee = txData.value
    .mul(web3.utils.toBN(9975))
    .div(web3.utils.toBN(10000));
  const reserveBNB2 = reserve.reserveBNB.add(amountLessFee);
  const reserveTkn2 = reserve.reserveTkn.sub(amountOut);
  const amountOut2 = getAmountOut(txData.value, reserveBNB2, reserveTkn2);
  const diff2 = amountOut.sub(amountOut2);
  let priceImpact = 0;
  if (diff2.gt(bigZero)) {
    const priceImpactBN = amountOut2.div(diff2);
    priceImpact = 100 / parseFloat(priceImpactBN.toString());
  }

  const slippageWithPriceImpact = parseInt(10000 * (priceImpact + slippage));
  if (isNaN(slippageWithPriceImpact)) return false;

  let potentialProfitBN = maxTradeSize
    .mul(web3.utils.toBN(slippageWithPriceImpact))
    .div(web3.utils.toBN(1000000));

  const potentialProfit = parseFloat(
    web3.utils.fromWei(potentialProfitBN, 'ether')
  );

  // console.log(slippage, priceImpact, potentialProfit, potentialProfit >= MIN_GROSS_PROFIT)

  if (potentialProfit >= MIN_GROSS_PROFIT) {
    let myAmountOutMin = getAmountOut(
      maxTradeSize,
      reserve.reserveBNB,
      reserve.reserveTkn
    );

    const mySlippage = 0.101;

    myAmountOutMin = web3.utils
      .toBN(parseInt(mySlippage * 1e4))
      .mul(myAmountOutMin)
      .div(web3.utils.toBN(100 * 1e4));

    const bnbAmountOutMin = getAmountOut(
      myAmountOutMin,
      reserveTkn2,
      reserveBNB2
    );

    potentialProfitBN = web3.utils
      .toBN(parseInt(mySlippage * 1e4))
      .mul(potentialProfitBN)
      .div(web3.utils.toBN(100 * 1e4));

    return {
      slippage,
      potentialProfit: potentialProfitBN,
      maxTradeSize,
      myAmountOutMin,
      bnbAmountOutMin,
    };
  }

  return false;
};

const getWBNBReserve = async (txData) => {
  try {
    const pairContract = new Contract(CAKE_PAIR_ABI, txData.pairAddress);
    const [reserve, token0] = await Promise.all([
      pairContract.methods.getReserves().call(),
      pairContract.methods.token0().call(),
    ]);
    let reserveBNB;
    let reserveTkn;
    if (token0 === WBNB_ADDRESS) {
      reserveBNB = reserve.reserve0;
      reserveTkn = reserve.reserve1;
    } else {
      reserveTkn = reserve.reserve0;
      reserveBNB = reserve.reserve1;
    }
    return {
      reserveBNB: web3.utils.toBN(reserveBNB),
      reserveTkn: web3.utils.toBN(reserveTkn),
    };
  } catch (error) {
    // logger.error(error.message, 'getWBNBReserve');
    return { reserveBNB: web3.utils.toBN(0), reserveTkn: web3.utils.toBN(0) };
  }
};

const getAmountOut = (amountIn, reserveIn, reserveOut) => {
  try {
    const amountWithFee = web3.utils.toBN(9975).mul(amountIn);
    const numerator = amountWithFee.mul(reserveOut);
    const denominator = amountWithFee.add(
      web3.utils.toBN(10000).mul(reserveIn)
    );
    return numerator.div(denominator);
  } catch (error) {
    logger.error(error.message, 'getAmountOut');
    return web3.utils.toBN(0);
  }
};

const getAmountIn = (amountOut, reserveIn, reserveOut) => {
  const numerator = reserveIn.mul(amountOut).mul(web3.utils.toBN(10000));
  const denominator = reserveOut.sub(amountOut).mul(web3.utils.toBN(9975));
  amountIn = (numerator / denominator).add(web3.utils.toBN(1));
};

const assertTradeSize = (
  tradeSize,
  reserveIn,
  reserveOut,
  targetAmountIn,
  targetAmountOutMin,
  tradeSlippage = 0
) => {
  return new Promise((resolve, _reject) => {
    let amountOutMin = getAmountOut(tradeSize, reserveIn, reserveOut);
    if (tradeSlippage > 0) {
      amountOutMin = amountOutMin
        .mul(10000)
        .div(web3.utils.toBN(parseInt(10000 * (1 + tradeSlippage))));
    }
    const amountInLessFee = web3.utils
      .toBN(9975)
      .mul(tradeSize)
      .div(web3.utils.toBN(10000));
    const reserveIn1 = reserveIn.add(amountInLessFee);
    const reserveOut1 = reserveOut.sub(amountOutMin);

    const targetAmountOut = getAmountOut(
      targetAmountIn,
      reserveIn1,
      reserveOut1
    );
    resolve(targetAmountOut.gte(targetAmountOutMin));
  });
};

module.exports = { decodeTransaction, checkProfitability, getSlippage };
