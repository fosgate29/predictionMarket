pragma solidity ^0.4.11;

contract Owned {
    address public owner;

    function Owned() {
        owner = msg.sender; 
    }

    modifier fromOwner {
        if (msg.sender != owner) revert();
        _;
    }
}


/**
 * @title Prediction market
 * Consensys Dev Academy exercise - Module 5
 * 
 */
contract PredictionMarket is Owned{

    bytes32[] public questionsIds;
    bool    suspendBetsAndWitdraws;
    uint    public winOdds;   //
    uint    public multiplier;
    uint    public minimunBet;
    uint    public maximunBet;

    uint256 constant public MAX_UINT256 =
    0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    
    struct QuestionStruct {
        string question;
        bool isQuestionAlreadyAnswered; //defaul is false 
        bool answer; //true = yes , false= no
    }
    
    struct UserBet {
        bool userBetAnswer; //if it is yes or no
        uint betValue;
        uint multiplier;
        uint profit;
    }
    
    mapping (bytes32 => QuestionStruct) public QuestionsMapping;
    mapping (bytes32 => UserBet) public BetsMapping;
    mapping (address => bool) public TrustedUserMapping;
    
    //Log question events
    event LogQuestionAdded(address user, string _question, bytes32 id);
    event LogQuestionIsAnswered(address user, bytes32 id, bool answer);
    
    //log bets events
    event LogBetIsPlaced(address staker, bytes32 betId, bytes32 questionId, bool answerBet, uint betAmount);
    event LogBetWithdrawn(address user, bytes32 betId, bytes32 questionId, uint profit);
    
    //log admin events
    event LogSetTrustedUser(address user, bool isTrustedUser);
    event LogSuspendBetsAndWitdrawsUpdated(address user, bool _suspendBetsAndWitdraws);
    
    //Constructor
    //_multiplier = number of wei that will earn
    function PredictionMarket(uint _winOdds , uint _multiplier, uint _minimunBet, uint _maximunBet) {
        TrustedUserMapping[msg.sender] = true; //owner is trusted
        suspendBetsAndWitdraws = false; //a check to stop bettings if a problem arises
        
        winOdds = _winOdds;
        multiplier = _multiplier;
        minimunBet = _minimunBet;
        maximunBet = _maximunBet;
        maximunBet = MAX_UINT256;  //to avoid problems during tests
        LogSetTrustedUser(msg.sender, true);
    }
    
    //Add a question
    function addQuestion(string _question) 
        fromOwner
        public
        returns(bool success) 
    {
        bytes32 id = sha3(now , _question);
         
        questionsIds.push(id);
        
        QuestionsMapping[id] = QuestionStruct({
            isQuestionAlreadyAnswered : false ,
            answer : false, //default is false
            question : _question
        });
        
        LogQuestionAdded(msg.sender, _question, id);
        
        return true;
    }
    
    //you can set question answer just once
    function setQuestionAnswer(bytes32 questionId, bool answer) 
        public
        returns(bool success) 
    {
        require(isUserTrusted(msg.sender));
        require(isQuestionListed(questionId));
        require(!QuestionsMapping[questionId].isQuestionAlreadyAnswered);
        
        QuestionsMapping[questionId].isQuestionAlreadyAnswered = true;
        QuestionsMapping[questionId].answer = answer;
        
        LogQuestionIsAnswered(msg.sender, questionId, answer);
        
        return true;
    }
    
    function questionIdAt(uint index)
        constant
        returns (bytes32 id) {
        return questionsIds[index];
    }
    
    function getQuestionsCount() 
        constant 
        returns (uint length) 
    {
        return questionsIds.length; 
    }
    
    function isQuestionListed(bytes32 questionId)
        public
        constant
        returns(bool questionIsListed)
    {
        string storage question_str = QuestionsMapping[questionId].question;
        bytes memory tempEmptyStringTest = bytes(question_str); // Uses memory
        bool test = tempEmptyStringTest.length != 0;
        return test;
    }

    function getUserBet(bytes32 questionId)
        public
        constant
        returns(uint _betValue, bool _userAnswer, uint multiplier, uint _profit)
    {
        bytes32 betId = getBetId(msg.sender, questionId);        

        return(BetsMapping[betId].betValue, BetsMapping[betId].userBetAnswer,
                  BetsMapping[betId].multiplier, BetsMapping[betId].profit);
    }

    //regular user can bet
    function bet(bytes32 questionId, bool betAnswer) 
        public
        payable
        returns(bool success) 
    {
        require(msg.value!=0); //no zero bettings
        require(msg.value>=minimunBet);
        require(msg.value<=maximunBet);
        require(isQuestionListed(questionId));
        require(!QuestionsMapping[questionId].isQuestionAlreadyAnswered);
        
        bytes32 betId = getBetId(msg.sender, questionId);
        
        //can t bet again
        require(BetsMapping[betId].betValue == 0);
        
        UserBet memory newBet;
        newBet.userBetAnswer = betAnswer;
        newBet.betValue = msg.value;
         
        BetsMapping[betId] = newBet;
        
        LogBetIsPlaced(msg.sender, betId, questionId, betAnswer, msg.value);
        
        return true;
    }
    
    function withdrawBet(bytes32 questionId) 
        public         
        returns(bool success)
    {
        require(isQuestionListed(questionId));
        require(QuestionsMapping[questionId].isQuestionAlreadyAnswered);
        
        bytes32 betId = getBetId(msg.sender, questionId);
        
        //if profit is zero, user has not been paid yet
        require(BetsMapping[betId].profit == 0);  
        
        //question exist, it is already answered, user has a bet and is not paid yet
        //so, check if user bet in the correct answer
        if(BetsMapping[betId].userBetAnswer == QuestionsMapping[questionId].answer){

            //if it is the correct answer, reward the user
            BetsMapping[betId].multiplier = multiplier;
            uint _profit = BetsMapping[betId].betValue + BetsMapping[betId].multiplier;

            BetsMapping[betId].profit = _profit;
            
            msg.sender.transfer(_profit);
             
            LogBetWithdrawn(msg.sender, betId, questionId, _profit);
        }
        else{
            revert(); //user didn´t bet on the right answer and should no call this function
        }
        
        return true;
    }
    
    function getBetId(address user, bytes32 questionId)
        public
        constant
        returns(bytes32 betId)
    {
        return sha3(user,questionId);    
    }
    
    //checks if user is trusted.
    //truested user can set answer to question
    function isUserTrusted(address user) 
        public 
        constant 
        returns(bool isTrustedUSer)
    {
        return TrustedUserMapping[user]==true;
    }
    
    //only owner can set if a user is trusted or not
    function setUserIsTrusted(address trustedUser, bool isTrusted)
        fromOwner
        public 
        returns(bool success)
    {
        TrustedUserMapping[trustedUser] = isTrusted;
        LogSetTrustedUser(trustedUser, isTrusted);
        return true;
    }

    //checks if user is admin. now, only owner can be admin
    //truested user can set answer to question
    function isAdmin(address user) 
        public 
        constant 
        returns(bool _isAdmin)
    {
        return user==owner;
    }
    
    //only owner can set if a bets and withdraws are open
    function setSuspendBetsAndWitdraws(bool _suspendBetsAndWitdraws)
        fromOwner
        public 
        returns(bool success)
    {
        
        suspendBetsAndWitdraws = _suspendBetsAndWitdraws;
        
        LogSuspendBetsAndWitdrawsUpdated(msg.sender, _suspendBetsAndWitdraws);
        return true;
    }
    
    
    //kill the contract and return all remain funds to the contract owner
    function killMe() fromOwner returns (bool success) 
    {
        suicide(owner);
        return true;
    }
    
    function () {
    }
}