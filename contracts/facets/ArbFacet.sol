//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "./shared/Access/CallProtection.sol";
import "./OwnershipFacet.sol";
import "../libraries/LibDiamond.sol";
import {IWBNB} from "../interfaces/IWBNB.sol";
import {IERC20} from "../interfaces/IERC20.sol";
import {IUniswapV2Pair} from "../interfaces/IUniswapV2Pair.sol";
import {IUniswapV2Router} from "../interfaces/IUniswapV2Router.sol";

contract ArbFacet is CallProtection {
    function swap(
        address router,
        address _tokenIn,
        address _tokenOut,
        uint256 _amount
    ) private {
        IERC20(_tokenIn).approve(router, _amount);
        address[] memory path;
        path = new address[](2);
        path[0] = _tokenIn;
        path[1] = _tokenOut;
        uint256 deadline = block.timestamp + 300;
        IUniswapV2Router(router).swapExactTokensForTokens(
            _amount,
            1,
            path,
            address(this),
            deadline
        );
    }

    function getAmountOutMin(
        address router,
        address _tokenIn,
        address _tokenOut,
        uint256 _amount
    ) public view returns (uint256) {
        address[] memory path;
        path = new address[](2);
        path[0] = _tokenIn;
        path[1] = _tokenOut;
        uint256[] memory amountOutMins = IUniswapV2Router(router).getAmountsOut(
            _amount,
            path
        );
        return amountOutMins[path.length - 1];
    }

    function quote(
        uint amountA,
        uint reserveA,
        uint reserveB
    ) internal pure returns (uint amountB) {
        require(amountA > 0, "quote: INSUFFICIENT_AMOUNT");
        require(
            reserveA > 0 && reserveB > 0,
            "quote: INSUFFICIENT_LIQUIDITY"
        );
        amountB = (amountA * (reserveB)) / reserveA;
    }

    function estimateDualDexTrade(
        address _router1,
        address _router2,
        address _token1,
        address _token2,
        uint256 _amount
    ) external view returns (uint256) {
        uint256 amtBack1 = getAmountOutMin(_router1, _token1, _token2, _amount);
        uint256 amtBack2 = getAmountOutMin(
            _router2,
            _token2,
            _token1,
            amtBack1
        );
        return amtBack2;
    }

    function dualDexTrade(
        address _router1,
        address _router2,
        address _token1,
        address _token2,
        uint256 _amount
    ) external protectedCall {
        uint256 startBalance = IERC20(_token1).balanceOf(address(this));

        uint256 token2InitialBalance = IERC20(_token2).balanceOf(address(this));
        swap(_router1, _token1, _token2, _amount);
        uint256 token2Balance = IERC20(_token2).balanceOf(address(this));
        uint256 tradeableAmount = token2Balance - token2InitialBalance;

        swap(_router2, _token2, _token1, tradeableAmount);
        uint256 endBalance = IERC20(_token1).balanceOf(address(this));
        require(endBalance > startBalance, "Trade Reverted, No Profit Made");
    }

    function estimateTriDexTrade(
        address _router1,
        address _router2,
        address _router3,
        address _token1,
        address _token2,
        address _token3,
        uint256 _amount
    ) external view returns (uint256) {
        uint256 amtBack1 = getAmountOutMin(_router1, _token1, _token2, _amount);
        uint256 amtBack2 = getAmountOutMin(
            _router2,
            _token2,
            _token3,
            amtBack1
        );
        uint256 amtBack3 = getAmountOutMin(
            _router3,
            _token3,
            _token1,
            amtBack2
        );
        return amtBack3;
    }

    function triDexTrade(
        address _router1,
        address _router2,
        address _router3,
        address _token1,
        address _token2,
        address _token3,
        uint256 _amount
    ) external protectedCall {
        uint256 startBalance = IERC20(_token1).balanceOf(address(this));

        uint256 token2InitialBalance = IERC20(_token2).balanceOf(address(this));
        swap(_router1, _token1, _token2, _amount);
        uint256 token2Balance = IERC20(_token2).balanceOf(address(this));
        uint256 tradeableAmount = token2Balance - token2InitialBalance;

        uint256 token3InitialBalance = IERC20(_token3).balanceOf(address(this));
        swap(_router2, _token2, _token3, _amount);
        uint256 token3Balance = IERC20(_token3).balanceOf(address(this));
        tradeableAmount = token3Balance - token3InitialBalance;

        swap(_router3, _token3, _token1, tradeableAmount);
        uint256 endBalance = IERC20(_token1).balanceOf(address(this));
        require(endBalance > startBalance, "Trade Reverted, No Profit Made");
    }

    // TODO: add a finalizer contract
    // send the last token to him, call him to finalize, he will swap the token and transfer the amount out to you

    function estimateTetraDexTrade(
        address _router1,
        address _router2,
        address _router3,
        address _router4,
        address _token1,
        address _token2,
        address _token3,
        address _token4,
        uint256 _amount
    ) external view returns (uint256) {
        uint256 amtBack1 = getAmountOutMin(_router1, _token1, _token2, _amount);
        uint256 amtBack2 = getAmountOutMin(
            _router2,
            _token2,
            _token3,
            amtBack1
        );
        uint256 amtBack3 = getAmountOutMin(
            _router3,
            _token3,
            _token4,
            amtBack2
        );
        uint256 amtBack4 = getAmountOutMin(
            _router4,
            _token4,
            _token1,
            amtBack3
        );
        return amtBack4;
    }

    function tetraDexTrade(
        address _router1,
        address _router2,
        address _router3,
        address _router4,
        address _token1,
        address _token2,
        address _token3,
        address _token4,
        uint256 _amount
    ) external protectedCall {
        uint256 startBalance = IERC20(_token1).balanceOf(address(this));

        uint256 token2InitialBalance = IERC20(_token2).balanceOf(address(this));
        swap(_router1, _token1, _token2, _amount);
        uint256 token2Balance = IERC20(_token2).balanceOf(address(this));
        uint256 tradeableAmount = token2Balance - token2InitialBalance;

        uint256 token3InitialBalance = IERC20(_token3).balanceOf(address(this));
        swap(_router2, _token2, _token3, _amount);
        uint256 token3Balance = IERC20(_token3).balanceOf(address(this));
        tradeableAmount = token3Balance - token3InitialBalance;

        uint256 token4InitialBalance = IERC20(_token4).balanceOf(address(this));
        swap(_router3, _token3, _token4, _amount);
        uint256 token4Balance = IERC20(_token4).balanceOf(address(this));
        tradeableAmount = token4Balance - token4InitialBalance;

        swap(_router4, _token4, _token1, tradeableAmount);
        uint256 endBalance = IERC20(_token1).balanceOf(address(this));
        require(endBalance > startBalance, "Trade Reverted, No Profit Made");
    }

    function getBalance(
        address _tokenContractAddress
    ) external view returns (uint256) {
        uint256 balance = IERC20(_tokenContractAddress).balanceOf(
            address(this)
        );
        return balance;
    }

    function recoverEth() external protectedCall {
        if (address(this).balance > 0) {
            payable(msg.sender).transfer(address(this).balance);
        }
        IERC20 token = IERC20(LibDiamond.diamondStorage().wbnb);
        token.transfer(msg.sender, token.balanceOf(address(this)));
    }

    function recoverTokens(address tokenAddress) external protectedCall {
        IERC20 token = IERC20(tokenAddress);
        token.transfer(msg.sender, token.balanceOf(address(this)));
    }

    receive() external payable {
        IWBNB(LibDiamond.diamondStorage().wbnb).deposit{value: msg.value}();
    }
}
