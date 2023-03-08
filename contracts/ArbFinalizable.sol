//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

import "./Finalizer.sol";

contract Arb is Ownable {
    address constant wbnb = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
		Finalizer f1;
		Finalizer f2;
		Finalizer f3;

		constructor() {
			f1 = new Finalizer();
			f2 = new Finalizer();
			f3 = new Finalizer();
		}

    function swap(
        address router,
        address _tokenIn,
        address _tokenOut,
        address _receiver,
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
            _receiver,
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
    ) external onlyOwner {
        uint256 startBalance = IERC20(_token1).balanceOf(address(this));

        // uint256 token2InitialBalance = IERC20(_token2).balanceOf(address(f1));
        swap(_router1, _token1, _token2, address(f1), _amount);
        uint256 token2Balance = IERC20(_token2).balanceOf(address(f1));
        uint256 tradeableAmount = token2Balance; // - token2InitialBalance;
				require(tradeableAmount > 0, "f1: zero amount out");

        f1.finalize(_router2, _token2, _token1, address(this), tradeableAmount);
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
    ) external onlyOwner {
        uint256 startBalance = IERC20(_token1).balanceOf(address(this));

        // uint256 token2InitialBalance = IERC20(_token2).balanceOf(address(f1));
        swap(_router1, _token1, _token2, address(f1), _amount);
        uint256 token2Balance = IERC20(_token2).balanceOf(address(f1));
        uint256 tradeableAmount = token2Balance; // - token2InitialBalance;
				require(tradeableAmount > 0, 'f1:triDexTrade:0');

        // uint256 token3InitialBalance = IERC20(_token3).balanceOf(address(f2));
        f1.finalize(_router2, _token2, _token3, address(f2), _amount);
        uint256 token3Balance = IERC20(_token3).balanceOf(address(f2));
        tradeableAmount = token3Balance; // - token3InitialBalance;
				require(tradeableAmount > 0, 'f2:triDexTrade:0');

        f2.finalize(_router3, _token3, _token1, address(this), tradeableAmount);
        uint256 endBalance = IERC20(_token1).balanceOf(address(this));
        require(endBalance > startBalance, "Trade Reverted, No Profit Made");
    }

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

        // uint256 token2InitialBalance = IERC20(_token2).balanceOf(address(this));
        swap(_router1, _token1, _token2, address(f1), _amount);
        uint256 token2Balance = IERC20(_token2).balanceOf(address(this));
        uint256 tradeableAmount = token2Balance; // - token2InitialBalance;

        // uint256 token3InitialBalance = IERC20(_token3).balanceOf(address(this));
        swap(_router2, _token2, _token3, address(f2), _amount);
        uint256 token3Balance = IERC20(_token3).balanceOf(address(this));
        tradeableAmount = token3Balance; // - token3InitialBalance;

        // uint256 token4InitialBalance = IERC20(_token4).balanceOf(address(this));
        swap(_router3, _token3, _token4, address(f3), _amount);
        uint256 token4Balance = IERC20(_token4).balanceOf(address(this));
        tradeableAmount = token4Balance; // - token4InitialBalance;

        swap(_router4, _token4, _token1, address(this), tradeableAmount);
        uint256 endBalance = IERC20(_token1).balanceOf(address(this));
        require(endBalance > startBalance, "Trade Reverted, No Profit Made");
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
