var PredictionMarket = artifacts.require("./PredictionMarket.sol");

//uint _winOdds , uint _multiplier, uint _minimunBet, uint _maximunBet

module.exports = function(deployer) {
  deployer.deploy(PredictionMarket, 1, 123, 0 , 900000000000000000);
};
