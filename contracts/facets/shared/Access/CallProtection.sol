// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../../libraries/LibDiamond.sol";

contract CallProtection {
    address owner = msg.sender;
    
    modifier protectedCall() {
        require(
            msg.sender == owner ||
            msg.sender == address(this), "NOT_ALLOWED"
        );
        _;
    }
}