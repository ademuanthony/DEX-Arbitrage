//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IWBNB {
    function withdraw(uint256) external;

    function deposit() external payable;
}