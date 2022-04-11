// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4 <0.9.0;

contract MultiSigWallet {
  event Deposit(address sender, uint amount, uint balance);
  event Initialization(address sender, address[] owners, uint confirmationsRequired);
  event TransactionCreated(address sender, uint txIndex, address to, uint value);
  event Confirmation(address sender, uint txIndex);
  event ConfirmationRevoked(address sender, uint txIndex);
  event TransactionExecuted(address sender, uint txIndex);

  struct Transaction{
    address to;
    uint value;
    uint confirmations;
    bool executed;
  }

  Transaction[] public transactions;
  mapping(uint => mapping(address => bool)) isConfirmed;
  mapping(address => bool) public isOwner;
  uint immutable confirmationsRequired;

  constructor(address[] memory _owners, uint _confirmationsRequired) {
    require(_owners.length > 0, "No owners provided");
    require(_confirmationsRequired <= _owners.length && _confirmationsRequired > 0, "Invalid number of confirmations");
    for(uint i = 0; i < _owners.length; i++){
        address owner = _owners[i];
        require(owner != address(0), "Zero address");
        require(!isOwner[owner], "Not unique owner address");
        isOwner[owner] = true;
    }
    confirmationsRequired = _confirmationsRequired;
    emit Initialization(msg.sender, _owners, _confirmationsRequired);
  }

  modifier onlyOwner(){
    require(isOwner[msg.sender], "Not an Owner");
    _;
  }

  modifier txExists(uint _txIndex){
    require(_txIndex < transactions.length, "Transaction does not exists");
    _;
  }

  modifier txNotExecuted(uint _txIndex){
    require(!transactions[_txIndex].executed, "Transaction already executed");
    _;
  }

  function createTransaction(address _to, uint _value) external onlyOwner returns(uint txIndex){
    txIndex = transactions.length;
    transactions.push(Transaction(_to, _value, 1, false));
    isConfirmed[txIndex][msg.sender] = true;
    emit TransactionCreated(msg.sender, txIndex, _to, _value);
  }

  function confirmTransaction(uint _txIndex) external onlyOwner txExists(_txIndex) txNotExecuted(_txIndex) {
    require(!isConfirmed[_txIndex][msg.sender], "Already confirmed");
    isConfirmed[_txIndex][msg.sender] = true;
    transactions[_txIndex].confirmations += 1;
    emit Confirmation(msg.sender, _txIndex);
  }

  function revokeConfirmation(uint _txIndex) external onlyOwner txExists(_txIndex) txNotExecuted(_txIndex) {
    require(isConfirmed[_txIndex][msg.sender], "Not confirmed");
    isConfirmed[_txIndex][msg.sender] = false;
    transactions[_txIndex].confirmations -= 1;
    emit ConfirmationRevoked(msg.sender, _txIndex);
  }

  function executeTransaction(uint _txIndex) external onlyOwner txExists(_txIndex) txNotExecuted(_txIndex) {
    Transaction storage transaction = transactions[_txIndex];
    require(transaction.confirmations >= confirmationsRequired, "Not enough confirmations");
    (bool success, ) = transaction.to.call{value: transaction.value}("");
    require(success, "tx failed");
    transaction.executed = true;
    emit TransactionExecuted(msg.sender, _txIndex);
  }

  receive() external payable {
    emit Deposit(msg.sender, msg.value, address(this).balance);
  }

}