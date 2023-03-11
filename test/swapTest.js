const chai = require('chai');
const { assert, expect } = chai;
const { solidity } = require('ethereum-waffle');

const { deployDiamond } = require('../scripts/deploy-diamond');
chai.use(solidity);

const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const { deployFacet } = require('../scripts/deploy');

describe('ARB', async function () {
  it('should dualDexTrade', async () => {
    const diamond = await deployFacet();
    // send some wbnb to ca

    const address = '0xf977814e90da44bfa03b6295a0616a897441acec';
    const impersonatedSigner = await ethers.getImpersonatedSigner(address);
    const wbnb = await ethers.getContractAt(
      'IERC20',
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
    );
    console.log('transferring 2 wbnb')
    await wbnb
      .connect(impersonatedSigner)
      .transfer(diamond.address, ethers.utils.parseEther('2'));

    console.log('transferred')

    const IArb = await ethers.getContractFactory('ArbFacet');
    const arb = IArb.attach(diamond.address);

    const dataWithPair = [
      '0xADBfE34e35EDb3D31F4Bd1AF5a513f4C57CDc5e9',
      '0xACC22e0Ff64E788e6AD569a57d130B9d957494dc',
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      '0xfb5B838b6cfEEdC2873aB27866079AC55363D37E',
      //ethers.utils.parseEther('0.2')
    ];

    const dataWithRouter = [
      '0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7',
      '0x10ED43C718714eb63d5aA57B78B54704E256024E',
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      '0xfb5B838b6cfEEdC2873aB27866079AC55363D37E',
      ethers.utils.parseEther('0.2')
    ];

    await arb.dualDexTrade(dataWithPair, { gasLimit: 300000 });
  });
});
