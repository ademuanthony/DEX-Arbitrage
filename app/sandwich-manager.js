const logger = require('./logger');
const { Sandwich } = require('./sandwich');
const { web3 } = require('./web3-contract');

class SandwichManager {
  transactions = [];

  addTransaction(txData, profitabilityInfo) {
    logger.info(
      `Processing trade for ${txData.token}; Target hash: ${
        txData.hash
      }; Trade amount: ${web3.utils.fromWei(
        profitabilityInfo.maxTradeSize,
        'ether'
      )}; Potential profit: ${web3.utils.fromWei(
        profitabilityInfo.potentialProfit,
        'ether'
      )}`
    );
    const sandwich = new Sandwich(
      txData,
      profitabilityInfo,
      `0x${process.env.PRIVATE_KEY}`
    );
    this.transactions.push(sandwich);
    sandwich.onCompleted((hash) => this.removeTransaction(hash));
    sandwich.onFailure((hash, reason) => {
      logger.error(reason);
      this.removeTransaction(hash);
    });
    sandwich.onCancelled((hash) => this.removeTransaction(hash));
    sandwich.run();
  }

  handleEnemy(txData) {
    this.transactions.forEach((tran) => {
      if (tran.tx.tokenAddress !== txData.tokenAddress) return;
      tran.cancel();
    });
  }

  removeTransaction(hash) {
    for (let i = 0; i < this.transactions.length; i++) {
      if (this.transactions[i].tx.hash === hash) {
        this.transactions.splice(i, 1);
        return;
      }
    }
  }
}

module.exports = { SandwichManager };
