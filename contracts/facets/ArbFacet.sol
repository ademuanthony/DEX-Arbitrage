//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import {IWBNB} from "../interfaces/IWBNB.sol";
import {IERC20} from "../interfaces/IERC20.sol";
import {IUniswapV2Pair} from "../interfaces/IUniswapV2Pair.sol";
import {IPancakeFactory} from "../interfaces/IPancakeFactory.sol";
import {IUniswapV2Router} from "../interfaces/IUniswapV2Router.sol";

import {PancakeLibrary} from "../libraries/PancakeLibrary.sol";
import {SafeMath} from "../libraries/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ArbFacet {
    using SafeMath for uint256;

    struct Token {
        address wbnbPair;
        address usdtPair;
        address busdPair;
        address cakePair;
    }

    struct AddTokenInput {
        address tokenAddress;
        uint8 exchange;
        address wbnbPair;
        address usdtPair;
        address busdPair;
        address cakePair;
    }

    struct DualExtimateInput {
        address router1;
        address router2;
        address token1;
        address token2;
    }

    struct DualTradeInput {
        // uint8 direction;
        address router1;
        address router2;
        // address token1; always wbnb
        address token2;
    }

    uint8 constant DIRECTION_CAKE_APE = 1;
    uint8 constant DIRECTION_APE_CAKE = 2;
    uint8 constant DIRECTION_CAKE_BIS = 3;
    uint8 constant DIRECTION_BIS_CAKE = 4;
    uint8 constant DIRECTION_APE_BIS = 5;
    uint8 constant DIRECTION_BIS_APE = 6;
    uint8 constant DIRECTION_CAKE_BABY = 7;
    uint8 constant DIRECTION_BABY_CAKE = 8;
    uint8 constant DIRECTION_APE_BABY = 9;
    uint8 constant DIRECTION_BABY_APE = 10;
    uint8 constant DIRECTION_BIS_BABY = 11;
    uint8 constant DIRECTION_BABY_BIS = 12;

    uint8 constant EXCHANGE_CAKE = 1;
    uint8 constant EXCHANGE_APE = 2;
    uint8 constant EXCHANGE_BIS = 3;
    uint8 constant EXCHANGE_BABY = 4;

    address private immutable _owner;
    address private immutable _feeReceiver;

    address constant wbnb = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
    mapping(address => mapping(uint8 => Token)) private _tokens;

    constructor(address feeReceiver) {
        _feeReceiver = feeReceiver;
        _owner = msg.sender;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(owner() == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    function addToken(AddTokenInput calldata input) external {
        require(owner() == msg.sender, "Ownable: caller is not the owner");
        _tokens[input.tokenAddress][input.exchange] = Token(
            input.wbnbPair,
            input.usdtPair,
            input.busdPair,
            input.cakePair
        );
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
        // uint256 amountIn,
        uint256 amountOut
    ) private returns (uint256) {
        // (uint256 reserve0, uint256 reserve1, ) = IUniswapV2Pair(pair)
        //     .getReserves();

        // require(
        //     reserve0 > 0 && reserve1 > 0,
        //     "ArbFacet:swap: INSUFFICIENT_LIQUIDITY"
        // );

        // uint256 amount0Out;
        // uint256 amount1Out;
        // uint256 amountOut;

        // unchecked {
        //     (uint256 reserveIn, uint256 reserveOut) = tokenIn < tokenOut // TODO: find out why
        //         ? (reserve0, reserve1)
        //         : (reserve1, reserve0);

        //     uint256 amountInWithFee = amountIn.mul(9975);
        //     uint256 numerator = amountInWithFee.mul(reserveOut);
        //     uint256 denominator = reserveIn.mul(10000).add(amountInWithFee);
        //     amountOut = numerator / denominator;
        //     (uint256 amount0Out, uint256 amount1Out) = tokenIn < tokenOut
        //         ? (uint256(0), amountOut)
        //         : (amountOut, uint256(0));
        // }

        (uint256 amount0Out, uint256 amount1Out) = tokenIn < tokenOut
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
        uint256 step = (max - min) / 10;

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

    function getMinTestValue(
        uint256 minReserve
    ) private pure returns (uint256) {
        if (minReserve < 2e18) {
            return (500 * minReserve) / (10000);
        } else if (minReserve < 5e18) {
            return (300 * minReserve) / (10000);
        } else if (minReserve < 10e18) {
            return (200 * minReserve) / (10000);
        } else if (minReserve < 20e18) {
            return (150 * minReserve) / (10000);
        } else if (minReserve < 50e18) {
            return (140 * minReserve) / (10000);
        } else if (minReserve < 100e18) {
            return (100 * minReserve) / (10000);
        } else if (minReserve < 500e18) {
            return (50 * minReserve) / (10000);
        } else {
            return (10 * minReserve) / (10000);
        }
    }

    function getBestAmountIn(
        uint256 reserveBnbIn,
        uint256 reserveTknOut,
        uint256 reserveTknIn,
        uint256 reserveBnbOut
    ) private pure returns (uint256) {
        uint256 minAmount = getMinTestValue(
            reserveBnbIn > reserveBnbOut ? reserveBnbOut : reserveBnbIn
        );
        uint256 maxAmount = 3 * minAmount;
        minAmount = 2 * minAmount;

        uint256 step = (maxAmount - minAmount) / 3;

        uint256 bastAmountIn;
        uint256 highestDeviation;

        for (uint amount = minAmount; amount <= maxAmount; amount += step) {
            uint256 amtBack1 = PancakeLibrary.getAmountOut(
                amount,
                reserveBnbIn,
                reserveTknOut
            );
            if (amtBack1 == 0) {
                continue;
            }
            uint256 amtBack2 = PancakeLibrary.getAmountOut(
                amtBack1,
                reserveTknIn,
                reserveBnbOut
            );
            if (amtBack2 < amount) {
                continue;
            }
            if (amtBack2 - amount < highestDeviation) {
                continue;
            }
            bastAmountIn = amount;
        }

        return bastAmountIn;
    }

    function getPairs(address token, uint8 direction) private view returns(address, address) {
        mapping(address => mapping(uint8 => Token)) storage tokens = _tokens;
        
        if(direction == DIRECTION_CAKE_APE) {
            return (tokens[token][EXCHANGE_CAKE].wbnbPair, tokens[token][EXCHANGE_APE].wbnbPair);
        }

        if(direction == DIRECTION_APE_CAKE) {
            return (tokens[token][EXCHANGE_APE].wbnbPair, tokens[token][EXCHANGE_CAKE].wbnbPair);
        }
        

        if(direction == DIRECTION_CAKE_BIS) {
            return (tokens[token][EXCHANGE_CAKE].wbnbPair, tokens[token][EXCHANGE_BIS].wbnbPair);
        }

        if(direction == DIRECTION_BIS_CAKE) {
            return (tokens[token][EXCHANGE_BIS].wbnbPair, tokens[token][EXCHANGE_CAKE].wbnbPair);
        }
        

        if(direction == DIRECTION_CAKE_BABY) {
            return (tokens[token][EXCHANGE_CAKE].wbnbPair, tokens[token][EXCHANGE_BABY].wbnbPair);
        }

        if(direction == DIRECTION_BABY_CAKE) {
            return (tokens[token][EXCHANGE_BABY].wbnbPair, tokens[token][EXCHANGE_CAKE].wbnbPair);
        }
        

        if(direction == DIRECTION_APE_BABY) {
            return (tokens[token][EXCHANGE_APE].wbnbPair, tokens[token][EXCHANGE_BABY].wbnbPair);
        }

        if(direction == DIRECTION_BABY_APE) {
            return (tokens[token][EXCHANGE_BABY].wbnbPair, tokens[token][EXCHANGE_APE].wbnbPair);
        }
        

        if(direction == DIRECTION_BIS_BABY) {
            return (tokens[token][EXCHANGE_BIS].wbnbPair, tokens[token][EXCHANGE_BABY].wbnbPair);
        }

        if(direction == DIRECTION_BABY_BIS) {
            return (tokens[token][EXCHANGE_BABY].wbnbPair, tokens[token][EXCHANGE_BIS].wbnbPair);
        }

        return (address(0), address(0));
    }

    // bytes4(keccak256(bytes('dualDexTrade(address,address,address,address)')))
    function dualDexTrade(DualTradeInput calldata input) external {
        require(msg.sender == _owner, "ArbFacet:dualDexTrade NOT_ALLOWED");
        //(address pair1, address pair2) = getPairs(input.token2, input.direction);
        (uint256 reserve0In, uint256 reserve0Out, ) = IUniswapV2Pair(
            input.router1
        ).getReserves();
        (uint256 reserve1In, uint256 reserve1Out, ) = IUniswapV2Pair(
            input.router2
        ).getReserves();

        (uint256 reserveBnbIn, uint256 reserveTknOut) = wbnb < input.token2
            ? (reserve0In, reserve0Out)
            : (reserve0Out, reserve0In);
        (uint256 reserveBnbOut, uint256 reserveTknIn) = wbnb < input.token2
            ? (reserve1In, reserve1Out)
            : (reserve1Out, reserve1In);

        uint bestAmountIn = getBestAmountIn(
            reserveBnbIn,
            reserveTknOut,
            reserveTknIn,
            reserveBnbOut
        );
        if (bestAmountIn == 0) {
            return;
            // TODO: remove test value;
            // bestAmountIn = 1 ether;
        }

        IERC20(wbnb).transfer(input.router1, bestAmountIn);

        uint256 tradeableAmount = swap(
            input.router1,
            wbnb,
            input.token2,
            input.router2,
            PancakeLibrary.getAmountOut(
                bestAmountIn,
                reserveBnbIn,
                reserveTknOut
            )
            // bestAmountIn
        );

        uint256 amountBck = swap(
            input.router2,
            input.token2,
            wbnb,
            address(this),
            PancakeLibrary.getAmountOut(
                tradeableAmount,
                reserveTknIn,
                reserveBnbOut
            )
            // tradeableAmount
        );
        // require(amountBck >= input.amount, "Trade Reverted, No Profit Made");
        require(amountBck > bestAmountIn / 2, "Trade Reverted, No Profit Made");
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
    ) external onlyOwner {
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
    ) external onlyOwner {
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

    function recoverEth() external onlyOwner {
        if (address(this).balance > 0) {
            payable(_feeReceiver).transfer(address(this).balance);
        }
        IERC20 token = IERC20(wbnb);
        token.transfer(_feeReceiver, token.balanceOf(address(this)));
    }

    function recoverTokens(address tokenAddress) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        token.transfer(_feeReceiver, token.balanceOf(address(this)));
    }

    receive() external payable {
        IWBNB(wbnb).deposit{value: msg.value}();
    }
}
