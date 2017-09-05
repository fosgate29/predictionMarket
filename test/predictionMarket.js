var PredictionMarket = artifacts.require("./PredictionMarket.sol");

// Found here https://gist.github.com/xavierlepretre/88682e871f4ad07be4534ae560692ee6
web3.eth.getTransactionReceiptMined = function (txnHash, interval) {
  var transactionReceiptAsync;
  interval = interval ? interval : 500;
  transactionReceiptAsync = function(txnHash, resolve, reject) {
    try {
      var receipt = web3.eth.getTransactionReceipt(txnHash);
      if (receipt == null) {
        setTimeout(function () {
          transactionReceiptAsync(txnHash, resolve, reject);
        }, interval);
      } else {
        resolve(receipt);
      }
    } catch(e) {
      reject(e);
    }
  };

  return new Promise(function (resolve, reject) {
      transactionReceiptAsync(txnHash, resolve, reject);
  });
};

// Found here https://gist.github.com/xavierlepretre/afab5a6ca65e0c52eaf902b50b807401
var getEventsPromise = function (myFilter, count) {
  return new Promise(function (resolve, reject) {
    count = count ? count : 1;
    var results = [];
    myFilter.watch(function (error, result) {
      if (error) {
        reject(error);
      } else {
        count--;
        results.push(result);
      }
      if (count <= 0) {
        resolve(results);
        myFilter.stopWatching();
      }
    });
  });
};

// Found here https://gist.github.com/xavierlepretre/d5583222fde52ddfbc58b7cfa0d2d0a9
var expectedExceptionPromise = function (action, gasToUse) {
  return new Promise(function (resolve, reject) {
      try {
        resolve(action());
      } catch(e) {
        reject(e);
      }
    })
    .then(function (txn) {
      return web3.eth.getTransactionReceiptMined(txn);
    })
    .then(function (receipt) {
      // We are in Geth
      assert.equal(receipt.gasUsed, gasToUse, "should have used all the gas");
    })
    .catch(function (e) {
      if ((e + "").indexOf("invalid opcode") > -1) {
        // We are in TestRPC
      } else {
        throw e;
      }
    });
};

contract('PredictionMarket', function(accounts) {


  var contract;

  var account0 = accounts[0];
  var owner = account0;
  var account1 = accounts[1];  

  var betValue = web3.toWei(1, 'ether');

  var question_text = "Is it going to rain on 10/10/2017?";


  beforeEach(function() {
    return PredictionMarket.new({from:owner})
    .then(function(instance) {
      contract = instance;
    })
  });


  it("...should add a question by admin.", function() {
      return contract.addQuestion.call("Is it going to rain on 10/10/2017?", {from: accounts[0]})
        .then(function(successful) {
            assert.isTrue(successful, "Question wasn't add");
      });
  });

  it("...should fail if try to add a question by regular user.", function() {
      return expectedExceptionPromise(function () {
            return contract.addQuestion.call("Is it going to rain on 10/10/2017?", {from: accounts[1] , gas: 3000000 });     
        },
        3000000);
  });

  it("...should return that a valid question exists.", function() {
      var blockNumber;
      return contract.addQuestion.call(question_text, {from: accounts[0]})
        .then(function(successful) {
            assert.isTrue(successful, "Question wasn't add");
            return contract.addQuestion(question_text, {from: accounts[0]})
            .then(function(tx){
              var questionId = tx.logs[0].args.id;
              return contract.isQuestionListed.call(questionId, {from: accounts[0]})
              .then(function(isQuestionListed){
                  assert.isTrue(isQuestionListed, "Question isn't listed");
              })

              return contract.isQuestionListed.call(0x123434, {from: accounts[0]})
              .then(function(isQuestionListed){
                  assert.isFalse(isQuestionListed, "Question is listed");
              })
            })
            
        });
  });

  it("...should be able to bet in a question", function() {
      var blockNumber;
      return contract.addQuestion(question_text, {from: accounts[0]})
        .then(function(tx) {
            var questionId = tx.logs[0].args.id;
            return contract.bet(questionId, true ,{from: accounts[0] , value: betValue , gas: 3000000})
            .then(function(tx_bet){
              var betAmount = tx_bet.logs[0].args.betAmount.toString(10);
              assert.equal(betAmount, betValue, "Bet amount is wrong");
            })
            
        });
  });

})
