//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

interface IERC20 {
    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount)
        external
        returns (bool);

    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

interface IWBNB {
    function withdraw(uint256) external;

    function deposit() external payable;
}

interface IUniswapV2Router {
    function getAmountsOut(uint256 amountIn, address[] memory path)
        external
        view
        returns (uint256[] memory amounts);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

interface IUniswapV2Pair {
    function token0() external view returns (address);

    function token1() external view returns (address);

    function getReserves()
        external
        view
        returns (
            uint112 reserve0,
            uint112 reserve1,
            uint32 blockTimestampLast
        );

    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external;
}

// a library for performing overflow-safe math, courtesy of DappHub (https://github.com/dapphub/ds-math)
library SafeMath {
    function add(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x + y) >= x, "ds-math-add-overflow");
    }

    function sub(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x - y) <= x, "ds-math-sub-underflow");
    }

    function mul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require(y == 0 || (z = x * y) / y == x, "ds-math-mul-overflow");
    }
}

library PancakeLibrary {
    using SafeMath for uint256;

    // returns sorted token addresses, used to handle return values from pairs sorted in this order
    function sortTokens(address tokenA, address tokenB)
        internal
        pure
        returns (address token0, address token1)
    {
        require(tokenA != tokenB, "PancakeLibrary: IDENTICAL_ADDRESSES");
        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        require(token0 != address(0), "PancakeLibrary: ZERO_ADDRESS");
    }

    // fetches and sorts the reserves for a pair
    function getReserves(
        address pair,
        address tokenA,
        address tokenB
    ) internal view returns (uint256 reserveA, uint256 reserveB) {
        (address token0, ) = sortTokens(tokenA, tokenB);
        (uint256 reserve0, uint256 reserve1, ) = IUniswapV2Pair(pair)
            .getReserves();
        (reserveA, reserveB) = tokenA == token0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
    }

    // given some amount of an asset and pair reserves, returns an equivalent amount of the other asset
    function quote(
        uint256 amountA,
        uint256 reserveA,
        uint256 reserveB
    ) internal pure returns (uint256 amountB) {
        require(amountA > 0, "PancakeLibrary: INSUFFICIENT_AMOUNT");
        require(
            reserveA > 0 && reserveB > 0,
            "PancakeLibrary: INSUFFICIENT_LIQUIDITY"
        );
        amountB = amountA.mul(reserveB) / reserveA;
    }

    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountOut) {
        require(amountIn > 0, "PancakeLibrary: INSUFFICIENT_INPUT_AMOUNT");
        require(
            reserveIn > 0 && reserveOut > 0,
            "PancakeLibrary: INSUFFICIENT_LIQUIDITY"
        );
        uint256 amountInWithFee = amountIn.mul(9975);
        uint256 numerator = amountInWithFee.mul(reserveOut);
        uint256 denominator = reserveIn.mul(10000).add(amountInWithFee);
        amountOut = numerator / denominator;
    }

    // given an output amount of an asset and pair reserves, returns a required input amount of the other asset
    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountIn) {
        require(amountOut > 0, "PancakeLibrary: INSUFFICIENT_OUTPUT_AMOUNT");
        require(
            reserveIn > 0 && reserveOut > 0,
            "PancakeLibrary: INSUFFICIENT_LIQUIDITY"
        );
        uint256 numerator = reserveIn.mul(amountOut).mul(10000);
        uint256 denominator = reserveOut.sub(amountOut).mul(9975);
        amountIn = (numerator / denominator).add(1);
    }

    // performs chained getAmountOut calculations on any number of pairs
    function getAmountsOut(
        address pair,
        uint256 amountIn,
        address[] memory path
    ) internal view returns (uint256[] memory amounts) {
        require(path.length >= 2, "PancakeLibrary: INVALID_PATH");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i; i < path.length - 1; i++) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(
                pair,
                path[i],
                path[i + 1]
            );
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    // performs chained getAmountIn calculations on any number of pairs
    function getAmountsIn(
        address pair,
        uint256 amountOut,
        address[] memory path
    ) internal view returns (uint256[] memory amounts) {
        require(path.length >= 2, "PancakeLibrary: INVALID_PATH");
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint256 i = path.length - 1; i > 0; i--) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(
                pair,
                path[i - 1],
                path[i]
            );
            amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }
}

contract Arb is Ownable {
    address constant wbnb = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;

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
        address _pair,
        address _tokenIn,
        address _tokenOut,
        uint256 _amount
    ) public view returns (uint256) {
        (uint256 reserve0, uint256 reserve1) = PancakeLibrary.getReserves(
            _pair,
            _tokenIn,
            _tokenOut
        );
        require(
            reserve0 > 0 && reserve1 > 0,
            "PancakeLibrary: INSUFFICIENT_LIQUIDITY"
        );

        (address token0, ) = PancakeLibrary.sortTokens(_tokenIn, _tokenOut);

        (uint256 reserveIn, uint256 reserveOut) = _tokenIn != token0 // TODO: find out why
            ? (reserve0, reserve1)
            : (reserve1, reserve0);

        return PancakeLibrary.getAmountOut(_amount, reserveIn, reserveOut);
    }

    function estimateDualDexTrade(
        address _pair1,
        address _pair2,
        address _token1,
        address _token2,
        uint256 _amount
    ) external view returns (uint256) {
        uint256 amtBack1 = getAmountOutMin(_pair1, _token1, _token2, _amount);
        uint256 amtBack2 = getAmountOutMin(
            _pair2,
            _token2,
            _token1,
            amtBack1
        );
        return amtBack2;
    }

    function swapTest(
        address pair1,
        address tokenIn,
        address tokenOut,
        uint256 amount
    ) external onlyOwner {
        IERC20(tokenIn).transfer(pair1, amount);
        swap(pair1, tokenIn, tokenOut, address(this), amount);
    }

    function dualDexTradeTest(
        address _pair1,
        address _pair2,
        address _token1,
        address _token2,
        uint256 _amount
    ) external onlyOwner {
        IERC20(_token1).transfer(_pair1, _amount);
        uint256 tradeableAmount = swap(
            _pair1,
            _token1,
            _token2,
            _pair2,
            _amount
        );

        uint256 amountOut = swap(
            _pair2,
            _token2,
            _token1,
            address(this),
            tradeableAmount
        );

        require(amountOut > 0, "Trade Reverted, No Profit Made");
    }

    function dualDexTrade(
        address _pair1,
        address _pair2,
        address _token1,
        address _token2,
        uint256 _amount
    ) external onlyOwner {
        IERC20(_token1).transfer(_pair1, _amount);
        uint256 tradeableAmount = swap(
            _pair1,
            _token1,
            _token2,
            _pair2,
            _amount
        );

        uint256 amountOut = swap(
            _pair2,
            _token2,
            _token1,
            address(this),
            tradeableAmount
        );

        require(amountOut > _amount, "Trade Reverted, No Profit Made");
    }

    function estimateTriDexTrade(
        address _pair1,
        address _pair2,
        address _pair3,
        address _token1,
        address _token2,
        address _token3,
        uint256 _amount
    ) external view returns (uint256) {
        uint256 amtBack1 = getAmountOutMin(_pair1, _token1, _token2, _amount);
        uint256 amtBack2 = getAmountOutMin(
            _pair2,
            _token2,
            _token3,
            amtBack1
        );
        uint256 amtBack3 = getAmountOutMin(
            _pair3,
            _token3,
            _token1,
            amtBack2
        );
        return amtBack3;
    }

    function triDexTrade(
        address _pair1,
        address _pair2,
        address _pair3,
        address _token1,
        address _token2,
        address _token3,
        uint256 _amount
    ) external onlyOwner {
        IERC20(_token1).transfer(_pair1, _amount);

        uint256 tradeableAmount = swap(
            _pair1,
            _token1,
            _token2,
            _pair2,
            _amount
        );

        tradeableAmount = swap(
            _pair2,
            _token2,
            _token3,
            _pair3,
            tradeableAmount
        );

        uint256 amountOut = swap(
            _pair3,
            _token3,
            _token1,
            address(this),
            tradeableAmount
        );

        require(amountOut > _amount, "Trade Reverted, No Profit Made");
    }

    function estimateTetraDexTrade(
        address _pair1,
        address _pair2,
        address _pair3,
        address _pair4,
        address _token1,
        address _token2,
        address _token3,
        address _token4,
        uint256 _amount
    ) external view returns (uint256) {
        uint256 amtBack1 = getAmountOutMin(_pair1, _token1, _token2, _amount);
        uint256 amtBack2 = getAmountOutMin(
            _pair2,
            _token2,
            _token3,
            amtBack1
        );
        uint256 amtBack3 = getAmountOutMin(
            _pair3,
            _token3,
            _token4,
            amtBack2
        );
        uint256 amtBack4 = getAmountOutMin(
            _pair4,
            _token4,
            _token1,
            amtBack3
        );
        return amtBack4;
    }

    function tetraDexTrade(
        address _pair1,
        address _pair2,
        address _pair3,
        address _pair4,
        address _token1,
        address _token2,
        address _token3,
        address _token4,
        uint256 _amount
    ) external onlyOwner {
        IERC20(_token1).transfer(_pair1, _amount);

        uint256 tradeableAmount = swap(
            _pair1,
            _token1,
            _token2,
            _pair2,
            _amount
        );

        tradeableAmount = swap(
            _pair2,
            _token2,
            _token3,
            _pair3,
            tradeableAmount
        );

        tradeableAmount = swap(
            _pair3,
            _token3,
            _token4,
            _pair4,
            tradeableAmount
        );

        uint256 amountOut = swap(
            _pair4,
            _token4,
            _token1,
            address(this),
            tradeableAmount
        );
        require(amountOut > _amount, "Trade Reverted, No Profit Made");
    }

    function getBalance(address _tokenContractAddress)
        external
        view
        returns (uint256)
    {
        uint256 balance = IERC20(_tokenContractAddress).balanceOf(
            address(this)
        );
        return balance;
    }

    function recoverEth() external onlyOwner {
        if (address(this).balance > 0) {
            payable(msg.sender).transfer(address(this).balance);
        }
        IERC20 token = IERC20(wbnb);
        token.transfer(msg.sender, token.balanceOf(address(this)));
    }

    function recoverTokens(address tokenAddress) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        token.transfer(msg.sender, token.balanceOf(address(this)));
    }

    receive() external payable {
        IWBNB(wbnb).deposit{value: msg.value}();
    }
}
