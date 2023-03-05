const logger = require('./logger');
const {
  TRIGGER_CONTRACT,
  TRIGGER_ADDRESS,
  GAS_MULTIPLIER,
  STANDARD_GAS_PRICE,
  sleep,
} = require('./globals');
const { web3 } = require('./web3-contract');

const TARGET_TX = 'target';
const FRONT_TX = 'front';
const BACK_TX = 'back';

class Sandwich {
  wallet;
  privateKey;
  tx;
  profitabilityInfo;
  cancelled;
  targetConfirmed;
  frontTxNonce;
  frontTxGasPrice;
  frontTxSent;
  frontConfirmed;
  backConfirmed;

  onCompletedCallbacks = [];
  onFailureCallbacks = [];
  onCancelledCallbacks = [];

  constructor(txData, profitabilityInfo, txWalletRawPK) {
    this.tx = txData;
    this.profitabilityInfo = profitabilityInfo;
    const account = web3.eth.accounts.wallet.add(txWalletRawPK);
    this.wallet = account.address;
    this.privateKey = txWalletRawPK;
    this.monitorTx(txData.hash, TARGET_TX);
  }

  onCompleted(fn) {
    this.onCompletedCallbacks.push(fn);
  }

  onFailure(fn) {
    this.onFailureCallbacks.push(fn);
  }

  onCancelled(fn) {
    this.onCancelledCallbacks.push(fn);
  }

  fireOnCompleted(hash) {
    this.onCompletedCallbacks.forEach((cb) => cb(hash));
  }

  fireOnFailure(hash) {
    this.onFailureCallbacks.forEach((cb) => cb(hash));
  }

  fireOneCancelled(hash) {
    this.onCancelledCallbacks.forEach((cb) => cb(hash));
  }

  async run() {
    try {
      const frontTxData = TRIGGER_CONTRACT.methods.marryOx9eba(
        this.tx.token,
        this.profitabilityInfo.maxTradeSize,
        this.profitabilityInfo.myAmountOutMin
      );
      if (this.cancelled) return;
      const [gasCost, nonce] = await Promise.all([
        frontTxData.estimateGas({ from: this.wallet }),
        web3.eth.getTransactionCount(this.wallet),
      ]);
      this.frontTxGasPrice = this.tx.gasPrice
        .mul(web3.utils.toBN(GAS_MULTIPLIER))
        .div(web3.utils.toBN(10000));

      const txCost = web3.utils
        .toBN(gasCost)
        .mul(web3.utils.toBN(this.frontTxGasPrice));

      const totalCost = web3.utils.toBN(2).mul(txCost);
      if (totalCost.lte(this.profitabilityInfo.potentialProfit)) {
        this.fireOnFailure(this.tx.hash, 'tx not profitable');
        // return;
      }
      if (this.cancelled) return;
      this.frontTxSent = true;

      this.frontTxNonce = nonce;
      const data = frontTxData.encodeABI();
      const txData = {
        from: this.wallet,
        to: TRIGGER_ADDRESS,
        data,
        gas: gasCost,
        gasPrice: this.frontTxGasPrice,
        nonce,
      };
      // const frontTx = web3.eth.accounts.signTransaction(
      //   txData,
      //   this.privateKey
      // );
      await this.sendAndMonitorTx(txData, FRONT_TX);

      logger.info('Sending back run tx');
      const backTx = TRIGGER_CONTRACT.methods.singOx9e4b(
        this.tx.token,
        this.profitabilityInfo.bnbAmountOutMin
      );

      const backData = backTx.encodeABI();
      const backTxData = {
        from: this.wallet,
        to: TRIGGER_ADDRESS,
        data: backData,
        gas: gasCost,
        gasPrice: STANDARD_GAS_PRICE,
        nonce: nonce + 1,
      };
      // const signedBackTx = await web3.eth.accounts.signTransaction(
      //   backTxData,
      //   this.privateKey
      // );

      // wait for target tx to be inserted
      const that = this;
      setTimeout(() => {
        that.sendAndMonitorTx(backTxData, BACK_TX);
      }, 700);
      logger.info('Back run scheduled')
    } catch (error) {
      logger.error(error.message, 'Sandwich::run');
      this.fireOnFailure(this.tx.hash);
      console.log(error);
    }
  }

  async sendAndMonitorTx(tx, pptLabel) {
    return web3.eth.sendTransaction(tx, (error, hash) => {
      if (error) {
        this.fireOnFailure(this.tx.hash, error);
        this.cancel();
        return;
      }
      logger.info(`${pptLabel} tx sent [${hash}]`);
      this.monitorTx(hash, pptLabel);
    });
  }

  async monitorTx(hash, pptLabel) {
    while (true) {
      const tx = await web3.eth.getTransaction(hash);
      if (!tx && pptLabel === TARGET_TX) {
        this.cancel();
        return;
      }
      if (tx && tx.transactionIndex && pptLabel == TARGET_TX) {
        this.targetIndexed = true;
      }
      if (!tx || !tx.blockNumber) return;
      switch (pptLabel) {
        case TARGET_TX:
          this.targetConfirmed = true;
          return;
        case FRONT_TX:
          this.frontConfirmed = true;
          return;
        case BACK_TX:
          this.backConfirmed = true;
          this.fireOnCompleted(hash);
          return;
      }
    }
  }

  async cancel() {
    this.cancelled = true;
    if (this.frontTxSent && this.frontConfirmed) {
      const backTxData = {
        from: this.wallet,
        to: TRIGGER_ADDRESS,
        gas: gasCost,
        gasPrice: this.frontTxGasPrice.mul(web3.utils.toBN(2)),
        nonce,
        value: 0,
      };
      // const tx = await web3.eth.accounts.signTransaction(backTxData);
      await web3.eth.sendTransaction(backTxData, (error, hash) => {
        if (error) {
          logger.error(error.message, 'Cancel tx');
          return;
        }
        logger.info(`$Cancellation tx sent [${hash}]`);
        this.monitorTx(hash, pptLabel);
      });
    }
  }
}

module.exports = { Sandwich };
