const { CAKE_FACTORY_ABI, CAKE_ROUTER_ABI, TRIGGER_ABI } = require('./abi');
const { Contract, web3 } = require('./web3-contract');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const {
  CAKE_ROUTER_ADDRESS,
  CAKE_FACTORY_ADDRESS,
  APE_ROUTER,
  APE_FACTORY,
  BISWAP_ROUTER,
  BISWAP_FACTORY,
  WBNB_ADDRESS,
  BUSD_ADDRESS,
  USDT_ADDRESS,
  TRIGGER_ADDRESS,
  BABY_DOGE_SWAP_ROUTER,
  CAKE_WBNB_BUSD_PAIR,
  CAKE_WBNB_USDT_PAIR,
} = process.env;

var CAKE_ROUTER = new Contract(CAKE_ROUTER_ABI, CAKE_ROUTER_ADDRESS);
var CAKE_FACTORY = new Contract(CAKE_FACTORY_ABI, CAKE_FACTORY_ADDRESS);
const TRIGGER_CONTRACT = new Contract(TRIGGER_ABI, TRIGGER_ADDRESS);

const swapExactETHForTokens = '0x7ff36ab5';
const swapExactETHForTokensAbi = [
  { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
  { internalType: 'address[]', name: 'path', type: 'address[]' },
  { internalType: 'address', name: 'to', type: 'address' },
  { internalType: 'uint256', name: 'deadline', type: 'uint256' },
];
const swapExactTokensForETH = '0x18cbafe5';
const swapExactTokensForTokens = '0x38ed1739';
const swapETHForExactTokens = '0xfb3bdb41';
const addLiquidityETH = '0xf305d719';
const swapTokensForExactETH = '0x4a25d94a';
const swapTokensForExactTokens = '0x8803dbee';
const addLiquidity = '0xe8e33700';

const MAX_TRADE_SIZE = web3.utils.toBN(web3.utils.toWei('0.05'));
const MIN_GROSS_PROFIT = '0.0045';
const GAS_MULTIPLIER = 45000; // multiplied by 10000
const STANDARD_GAS_PRICE = web3.utils.toBN('5000000000');

const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

module.exports = {
  ZERO_ADDRESS,
  WBNB_ADDRESS,
  BUSD_ADDRESS,
  USDT_ADDRESS,
  CAKE_ROUTER,
  CAKE_ROUTER_ADDRESS,
  CAKE_FACTORY,
  CAKE_FACTORY_ADDRESS,
  APE_ROUTER,
  BABY_DOGE_SWAP_ROUTER,
  TRIGGER_ADDRESS,
  TRIGGER_CONTRACT,
  swapExactTokensForTokens,
  swapETHForExactTokens,
  swapExactETHForTokens,
  swapExactETHForTokensAbi,
  swapExactTokensForETH,
  addLiquidityETH,
  swapTokensForExactETH,
  swapTokensForExactTokens,
  addLiquidity,
  MAX_TRADE_SIZE,
  MIN_GROSS_PROFIT,
  GAS_MULTIPLIER,
  STANDARD_GAS_PRICE,
  CAKE_WBNB_BUSD_PAIR,
  CAKE_WBNB_USDT_PAIR,
  sleep,
};
