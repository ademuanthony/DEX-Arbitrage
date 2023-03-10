/* global ethers */
/* eslint prefer-const: "off" */

const { ethers } = require('hardhat');
const { getSelectors, FacetCutAction } = require('./libraries/diamond.js');

const prompt = require('prompt-sync')();

async function deployDiamond(log) {
  const accounts = await ethers.getSigners();
  const contractOwner = accounts[0];

  // deploy Diamond
  const diamond = await ethers.getContractAt(
    'ArbRoot',
    process.env.DEPLOYED_DIAMOND_ADDRESS
  );
  if (log) console.log('Diamond deployed:', diamond.address);

  const testTokenAddress = process.env.DFC_TOKEN_ADDRESS;

  // deploy DiamondInit
  // DiamondInit provides a function that is called when the diamond is upgraded to initialize state variables
  // Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
  const diamondInit = await ethers.getContractAt(
    'DiamondInit',
    process.env.DIAMOND_INIT_ADDRESS
  );
  //const diamondInit = await DiamondInit.deploy()
  //await diamondInit.deployed()
  if (log) console.log('DiamondInit deployed:', diamondInit.address);

  const cut = [];

  const facetName = prompt('Facet name: ');
  const Facet = await ethers.getContractFactory(facetName);
  const facet = await Facet.deploy();
  await facet.deployed();

  const action = prompt('Select action (1 = replace, 2 = Remove and add): ');
  if (action == '1') {
    cut.push({
      facetAddress: facet.address,
      action: FacetCutAction.Replace,
      functionSelectors: getSelectors(facet),
    });
  } else if (action == '2') {
    cut.push(
      {
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: getSelectors(facet),
      },
      {
        facetAddress: facet.address,
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(facet),
      }
    );
  } else {
    console.log('Invalid action');
    process.exit(1);
  }

  // upgrade diamond with facets
  const diamondCut = await ethers.getContractAt('IDiamondCut', diamond.address);
  let tx;
  let receipt;
  // call to init function
  let functionCall = diamondInit.interface.encodeFunctionData('init', []);
  tx = await diamondCut.diamondCut(cut, diamondInit.address, functionCall);
  if (log) console.log('Diamond cut tx: ', tx.hash);
  receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
  if (log) console.log('Completed diamond cut');
  return diamond.address;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  deployDiamond(true)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.deployDiamond = deployDiamond;
