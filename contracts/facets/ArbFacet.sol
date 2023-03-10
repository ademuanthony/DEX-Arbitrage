//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

import "./shared/Access/CallProtection.sol";
import "./OwnershipFacet.sol";
import "../libraries/LibDiamond.sol";
import {IWBNB} from "../interfaces/IWBNB.sol";
import {IERC20} from "../interfaces/IERC20.sol";
import {IUniswapV2Pair} from "../interfaces/IUniswapV2Pair.sol";
import {IPancakeFactory} from "../interfaces/IPancakeFactory.sol";
import {IUniswapV2Router} from "../interfaces/IUniswapV2Router.sol";

import {PancakeLibrary} from "../libraries/PancakeLibrary.sol";

contract ArbFacet is CallProtection {
    struct DualExtimateInput {
        address router1;
        address router2;
        address token1;
        address token2;
    }
    struct DualTradeInput {
        address router1;
        address router2;
        address token1;
        address token2;
        uint256 amount;
    }

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

    // requires token to have been sent to lp
    function swap(
        address pair,
        address tokenIn,
        address tokenOut,
        address to,
        uint256 amount
    ) private returns (uint256) {
        (uint256 reserve0, uint256 reserve1) = PancakeLibrary.getReserves(
            pair,
            tokenIn,
            tokenOut
        );
        require(
            reserve0 > 0 && reserve1 > 0,
            "PancakeLibrary: INSUFFICIENT_LIQUIDITY"
        );

        (address token0, ) = PancakeLibrary.sortTokens(tokenIn, tokenOut);

        (uint256 reserveIn, uint256 reserveOut) = tokenIn != token0 // TODO: find out why
            ? (reserve0, reserve1)
            : (reserve1, reserve0);

        uint256 amountOut = PancakeLibrary.getAmountOut(
            amount,
            reserveIn,
            reserveOut
        );

        (uint256 amount0Out, uint256 amount1Out) = tokenIn == token0
            ? (uint256(0), amountOut)
            : (amountOut, uint256(0));

        IUniswapV2Pair(pair).swap(amount0Out, amount1Out, to, new bytes(0));

        return amountOut;
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

    function getTestValues(
        uint256 minReserve
    ) public pure returns (uint[10] memory) {
        uint256 meanPercentage;
        if (minReserve < 2e18) {
            meanPercentage = 500;
        } else if (minReserve < 5e18) {
            meanPercentage = 300;
        } else if (minReserve < 10e18) {
            meanPercentage = 200;
        } else if (minReserve < 20e18) {
            meanPercentage = 150;
        } else if (minReserve < 50e18) {
            meanPercentage = 140;
        } else if (minReserve < 100e18) {
            meanPercentage = 100;
        } else if (minReserve < 500e18) {
            meanPercentage = 50;
        } else {
            meanPercentage = 10;
        }

        uint256 min = meanPercentage / 2;
        uint256 max = 3 * meanPercentage * 2;
        uint256 step = (min + max) / 10;

        uint[10] memory values;

        uint index = 0;

        for (uint i = min; i <= max && index < 10; i += step) {
            values[index] = (i * minReserve) / (10000);
            index += 1;
        }
        return values;
    }

    function estimateDualDexTrade(
        DualExtimateInput calldata input
    )
        external
        view
        returns (
            uint256 bastAmountIn,
            uint256 bestAmountOut,
            uint256 highestDeviation
        )
    {
        (uint256 reserve1A, ) = PancakeLibrary.getReserves(
            IPancakeFactory(IUniswapV2Router(input.router1).factory()).getPair(
                input.token1,
                input.token2
            ),
            input.token1,
            input.token2
        );

        (uint256 reserve2A, ) = PancakeLibrary.getReserves(
            IPancakeFactory(IUniswapV2Router(input.router2).factory()).getPair(
                input.token1,
                input.token2
            ),
            input.token1,
            input.token2
        );

        uint256 minReserve = reserve1A;
        if (reserve2A > minReserve) {
            minReserve = reserve2A;
        }

        {
            uint[10] memory values = getTestValues(minReserve);

            uint256 startBalance = IERC20(input.token1).balanceOf(
                address(this)
            );

            if (startBalance == 0) {
                // testing amt
                startBalance = 1;
            }

            for (uint256 i = 0; i < 10; i++) {
                uint256 amount = values[i];
                if (amount > startBalance) {
                    amount = startBalance;
                }

                if (i == 5 && bastAmountIn == 0) {
                    bastAmountIn = amount;
                }
                

                if (amount == 0) {
                    continue;
                }

                uint256 amtBack1 = getAmountOutMin(
                    input.router1,
                    input.token1,
                    input.token2,
                    amount
                );
                if (amtBack1 == 0) {
                    continue;
                }
                uint256 amtBack2 = getAmountOutMin(
                    input.router2,
                    input.token2,
                    input.token1,
                    amtBack1
                );
                //return (amount, amtBack1, amtBack2);
                if (amtBack2 < amount) {
                    continue;
                }
                if (amtBack2 - amount < highestDeviation) {
                    continue;
                }
                bestAmountOut = amtBack2;
                highestDeviation = amtBack2 - amount;
            }
        }
    }

    function dualDexTrade(
        DualTradeInput calldata input
    ) external protectedCall {
        uint256 startBalance = IERC20(input.token1).balanceOf(address(this));
        require(
            startBalance > input.amount,
            "dualDexTrade: INSUFFICIENT WBNB BALANCE"
        );

        uint256 token2InitialBalance = IERC20(input.token2).balanceOf(
            address(this)
        );
        swap(input.router1, input.token1, input.token2, input.amount);
        uint256 token2Balance = IERC20(input.token2).balanceOf(address(this));
        uint256 tradeableAmount = token2Balance - token2InitialBalance;

        swap(input.router2, input.token2, input.token1, tradeableAmount);
        uint256 endBalance = IERC20(input.token1).balanceOf(address(this));
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
