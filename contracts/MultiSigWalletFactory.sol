// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11 <0.9.0;

import "./MultiSigWallet.sol";

contract MultiSigWalletFactory {
	event ContractInstantiation(address sender, address wallet);

	mapping(address => address[]) public walletInstances;
	mapping(address => bool) public walletExists;

	function createWallet(address[] memory _owners, uint _confirmationsRequired) public returns(address wallet){
		wallet = address(new MultiSigWallet(_owners, _confirmationsRequired));
		walletInstances[msg.sender].push(wallet);
		walletExists[wallet] = true;
		emit ContractInstantiation(msg.sender, wallet);
	}

	function getUserWallets() external view returns(address[] memory wallets) {
		wallets = walletInstances[msg.sender];
	}
}