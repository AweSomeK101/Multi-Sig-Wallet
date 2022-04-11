const MultiSigWalletFactory = artifacts.require("MultiSigWalletFactory");

module.exports = function (deployer) {
  deployer.deploy(MultiSigWalletFactory);
};
