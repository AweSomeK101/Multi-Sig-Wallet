const chai = require("chai")
chai.use(require("chai-as-promised"))
const expect = chai.expect
const MSW = artifacts.require("MultiSigWallet");

contract("MultiSigWallet", accounts => {
  const owners = [accounts[0], accounts[1], accounts[2]];
  const numConfirmations = owners.length;
  let wallet;

  beforeEach(async() => {
    wallet = await MSW.new(owners, numConfirmations);
  })

  describe("Constructor", () => {
    it("should deploy", async() => {
      wallet = await MSW.new(owners, numConfirmations);
      for(let i = 0; i < owners.length; i++){
          assert(await wallet.isOwner(owners[i]));
      }
    })

    it("rejects when no owners", async() => {
      await expect(MSW.new([], 1)).to.be.rejected;
    })

    it("rejects when confirmations > owners", async() => {
      await expect(MSW.new(owners, owners.length + 1)).to.be.rejected;
    })

    it("rejects when confirmations 0", async() => {
      await expect(MSW.new(owners, 0)).to.be.rejected;
    })
  })

  describe("createTransaction", () => {
    it("creates a trnsaction", async() => {
      let {logs} = await wallet.createTransaction(accounts[3], 50000);
      assert.equal(logs[0].event, "TransactionCreated");
      assert.equal(logs[0].args.to, accounts[3]);
      assert.equal(logs[0].args.value.toNumber(), 50000);
      assert.equal(logs[0].args.sender, owners[0]);
      assert.equal(logs[0].args.txIndex.toNumber(), 0);

      const result = await wallet.transactions(0);

      assert.equal(logs[0].args.to, result.to);
      assert.equal(logs[0].args.value.toNumber(), result.value.toNumber());
      assert.equal(1, result.confirmations.toNumber());
      assert.equal(false, result.executed);
    })

    it("rejects if not Owner", async() => {
      await expect(wallet.createTransaction(accounts[3], 50000, {from: accounts[3]})).to.be.rejected;
    })
  })

  describe("confirmTransaction", () => {
    const to = accounts[3];
    const value = 50000;
    let txIndex;
    beforeEach(async() => {
      const {logs} = await wallet.createTransaction(to, value);
      txIndex = logs[0].args.txIndex.toNumber();
    })

    it("confirms transaction", async() => {
      const {logs} = await wallet.confirmTransaction(txIndex, {from: owners[1]});
      assert.equal(logs[0].event, "Confirmation");
      assert.equal(logs[0].args.sender, owners[1]);
      assert.equal(logs[0].args.txIndex.toNumber(), txIndex);
      let {confirmations} = await wallet.transactions(txIndex);
      assert.equal(confirmations.toNumber(), 2);
    })

    it("rejects if not owner", async() => {
      await expect(wallet.confirmTransaction(txIndex, {from: accounts[3]})).to.be.rejected;
    })

    it("rejects if txIndex invalid", async() => {
      await expect(wallet.confirmTransaction(txIndex+1, {from:owners[1]})).to.be.rejected;
    })

    it("rejects is Tx already executed", async() => {
      await wallet.confirmTransaction(txIndex, {from: owners[1]});
      await wallet.confirmTransaction(txIndex, {from: owners[2]});
      await wallet.sendTransaction({from: owners[0], value: value + 500});
      await wallet.executeTransaction(txIndex);
      await expect(wallet.confirmTransaction(txIndex, {from:owners[1]})).to.be.rejected;
    })

    it("rejects if already confirmed", async() => {
      await wallet.confirmTransaction(txIndex, {from: owners[1]});
      await expect(wallet.confirmTransaction(txIndex, {from: owners[1]})).to.be.rejected;
    })

  })

  describe("revokeConfirmation", () => {
    const to = accounts[3];
    const value = 50000;
    let txIndex;
    beforeEach(async() => {
      const {logs} = await wallet.createTransaction(to, value);
      txIndex = logs[0].args.txIndex.toNumber();
    })

    it("revokes confirmation", async() => {
      const {logs} = await wallet.revokeConfirmation(txIndex);
      assert.equal(logs[0].event, "ConfirmationRevoked");
      assert.equal(logs[0].args.sender, owners[0]);
      assert.equal(logs[0].args.txIndex, txIndex);

      const {confirmations} = await wallet.transactions(txIndex);
      assert.equal(confirmations.toNumber(), 0);
    })

    it("rejects non owner", async() => {
      await expect(wallet.revokeConfirmation(txIndex, {from: accounts[3]})).to.be.rejected;
    })

    it("rejects if tx does not exists", async() => {
      await expect(wallet.revokeConfirmation(txIndex+1)).to.be.rejected;
    })

    it("rejects if not confirmed", async() => {
      await expect(wallet.revokeConfirmation(txIndex, {from: owners[1]})).to.be.rejected;
    })

    it("rejects if already executed", async() => {
      await wallet.confirmTransaction(txIndex, {from: owners[1]});
      await wallet.confirmTransaction(txIndex, {from: owners[2]});
      await wallet.sendTransaction({from: owners[0], value: value + 500});
      await wallet.executeTransaction(txIndex);
      await expect(wallet.revokeConfirmation(txIndex, {from:owners[1]})).to.be.rejected;
    })
  })

  describe("executeTransaction", () => {
    const to = accounts[3];
    const value = 50000;
    let txIndex;
    beforeEach(async() => {
      const {logs} = await wallet.createTransaction(to, value);
      txIndex = logs[0].args.txIndex.toNumber();
      await wallet.sendTransaction({value});
      owners.forEach(async(owner, index) => {
        if(index === 0) return;
        await wallet.confirmTransaction(txIndex, {from: owner});
      })
    })

    it("executes transaction", async() => {
      const balanceAccount = await web3.eth.getBalance(to);
      let balanceWallet = await web3.eth.getBalance(wallet.address);

      const {logs} = await wallet.executeTransaction(txIndex);
      assert.equal(logs[0].event, "TransactionExecuted");
      assert.equal(logs[0].args.sender, owners[0]);
      assert.equal(logs[0].args.txIndex, txIndex);

      balanceWallet = await web3.eth.getBalance(wallet.address); 
      const balanceAccountUpdate = await web3.eth.getBalance(to);      
      assert.equal(balanceWallet, 0);
      assert.equal(balanceAccountUpdate, parseInt(balanceAccount) + value);

      const {executed} = await wallet.transactions(txIndex);
      assert(executed);
    })

    it("rejects if not owner", async() => {
      await expect(wallet.executeTransaction(txIndex, {from: accounts[3]})).to.be.rejected;
    })

    it("rejects if invalid txindex", async() => {
      await expect(wallet.executeTransaction(txIndex+1)).to.be.rejected;
    })

    it("rejects if already executed", async() => {
      await wallet.executeTransaction(txIndex);
      await expect(wallet.executeTransaction(txIndex)).to.be.rejected;
    })
  })

  describe("receive", () => {
    it("receives ether", async() => {
      const {logs} = await wallet.sendTransaction({value: 5000});
      assert.equal(logs[0].event, "Deposit");
      assert.equal(logs[0].args.sender, owners[0]);
      assert.equal(logs[0].args.amount, 5000);
      assert.equal(logs[0].args.balance, 5000);
    })
  })

})