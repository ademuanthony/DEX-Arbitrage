const { ERC20_ABI } = require('./abi');
const { Contract, web3 } = require('./web3-contract');

const main = async () => {
  const contract = new Contract(
    ERC20_ABI,
    '0x97A143545c0F8200222C051aC0a2Fc93ACBE6bA2'
  );
  const result = await contract.methods
    .balanceOf('0x97a143545c0f8200222c051ac0a2fc93acbe6ba2')
    .call(null, { blockNumber: 1 });
  console.log(web3.utils.fromWei(result, 'ether'));
  process.exit(0);
};

main();
