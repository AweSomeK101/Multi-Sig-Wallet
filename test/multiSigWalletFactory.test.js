const chai = require("chai");
chai.use(require("chai-as-promised"))
const expect = chai.expect
const Factory = artifacts.require("MultiSigWalletFactory");
const MSW = artifacts.require("MultiSigWallet");

contract("MultiSigWalletFactory", accounts => {
	const owners = [accounts[0], accounts[1]];
	const numConfirmations = 2;
	let factory, wallet;
	before(async() => {
		factory = await Factory.new();
	})

	// describe("createWallet", () => {
	// 	it("creates a wallet", async() => {
	// 		let {logs} = await factory.createWallet(owners, numConfirmations);
	// 		assert.equal(logs[0].event, "ContractInstantiation");
	// 		assert.equal(logs[0].args.sender, owners[0]);
	// 		wallet = await MSW.at(logs[0].args.wallet);
	// 		assert(await wallet.isOwner(owners[1]));
	// 		assert(await factory.walletExists(wallet.address));
	// 	})

	// 	it("rejects if owners empty", async() => {
	// 		await expect(factory.createWallet([], numConfirmations)).to.be.rejected;
	// 	})

	// 	it("rejects if numConfirmations > owners", async() => {
	// 		await expect(factory.createWallet(owners, numConfirmations + 1)).to.be.rejected;
	// 	})
	// })

	// describe("getUserWallet", () => {
	// 	let wallets = [];
	// 	before(async() => {
	// 		factory.createWallet(owners, numConfirmations).then(res => wallets.push(res.logs[0].args.wallet));
	// 		factory.createWallet(owners, numConfirmations).then(res => wallets.push(res.logs[0].args.wallet));
	// 	})

	// 	it("sends back the wallet array", async() => {
	// 		console.log(wallets);
	// 		let userWallets = await factory.getUserWallets()
	// 		console.log(userWallets);
	// 		assert.deepEqual(wallets, userWallets);
	// 	})
	// })
})