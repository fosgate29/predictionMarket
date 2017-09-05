import React, { Component } from 'react'
import PredictionMarketContract from '../build/contracts/PredictionMarket.json'
import getWeb3 from './utils/getWeb3'

import './css/oswald.css'
import './css/open-sans.css'
import './App.css'

class App extends Component {

  constructor(props) {
    super(props)

    this.state = {
      isAdmin: false,
      isUserTrusted: false,
      testeValue:"",
      instance:{},
      accounts:[],
      questionToSubmit:"",
      trustedUserAddress:"",
      questions:[],
      questionsCount:0,
      minimunBet:0,
      maximunBet:0,
      multiplier:0,
      betAmount:0,
      betAnswer:false,
      correctAnswer:false,
      userBalance:0,
      contractBalance:0,
      web3: null
    }

    this.addAQuestion = this.addAQuestion.bind(this);
    this.setTrustedUser = this.setTrustedUser.bind(this);
    this.addBet = this.addBet.bind(this);
    this.setQuestionAnswer = this.setQuestionAnswer.bind(this);
    this.withdrawBet = this.withdrawBet.bind(this);
  }


  componentWillMount() {
    // Get network provider and web3 instance.
    // See utils/getWeb3 for more info.

    getWeb3
    .then(results => {
      this.setState({
        web3: results.web3
      })

      // Instantiate contract once web3 provided.
      this.instantiateContract()
    })
    .catch(() => {
      console.log('Error finding web3.')
    })

  }

  instantiateContract() {
    /*
     * SMART CONTRACT EXAMPLE
     *
     * Normally these functions would be called in the context of a
     * state management library, but for convenience I've placed them here.
     */

    const contract = require('truffle-contract')
    const predictionMarket = contract(PredictionMarketContract)
    predictionMarket.setProvider(this.state.web3.currentProvider)
    console.log("stare ff");
  
    this.state.web3.eth.getAccounts((error, accounts) => {
      return predictionMarket.deployed()
            .then((instance) => {

              this.state.web3.eth.getBalance(accounts[0],(e,_userBalance) => {  
                console.log(_userBalance);
                this.setState({userBalance:_userBalance.toNumber()});
              });

              this.state.web3.eth.getBalance(instance.address,(e,_contractBalance) => {  
                this.setState({contractBalance:_contractBalance.toNumber()});
              });

              this.setState({instance:instance, accounts:accounts})
              //let questionsCount;
              instance.getQuestionsCount()
                .then(num => {
                    //console.log(num.toNumber());
                    this.setState({questionsCount:num.toNumber()});

                     var numberOfQuestions = num.toNumber();
                     if(numberOfQuestions>0){
                       for(let i=0;i<numberOfQuestions;i++){
                         instance.questionIdAt(i)
                        .then(questionId => {
                          instance.QuestionsMapping(questionId)
                            .then(_question => {
                                var question = _question;
                                //get user answer and bet amount
                                instance.getUserBet(questionId)
                                  .then(_userBet =>{
                                     this.state.questions.push({
                                      id:questionId, 
                                      question:question[0],
                                      answered:question[1],
                                      answer:question[2],
                                      amount:_userBet[0],
                                      userAnswer:_userBet[1],
                                      profit: _userBet[3].toNumber()
                                  })

                                
                                });
                            });
                        })
                          .catch(err => console.log("Error getting questions..."))
                        }//end of for
                      }//end of if
                });
              instance.isAdmin(accounts[0])
                .then(_isAdmin =>{
                     this.setState({isAdmin:_isAdmin});
                });
              instance.isUserTrusted(accounts[0])
                .then(_isUserTrusted =>{
                     this.setState({isUserTrusted:_isUserTrusted});
                });
              instance.minimunBet()
                .then(_minimunBet =>{
                     this.setState({minimunBet:_minimunBet});
                });
              instance.maximunBet()
                .then(_maximunBet =>{
                     this.setState({maximunBet:_maximunBet});
                })
              instance.multiplier()
                .then(_multiplier =>{
                     this.setState({multiplier:_multiplier});
                })
            })
    })
  }

  addAQuestion(event){
    event.preventDefault();
    return this.state.instance.addQuestion(this.state.questionToSubmit, {from:this.state.accounts[0] , gas: 3000000 })
            .then(tx => {
              console.log(tx.receipt);;
              console.log(tx.logs[0].args);
              this.setState({questionToSubmit:""});
              var temp = this.state.questionsCount + 1;
              this.setState({questionsCount:temp});
              this.state.questions.push({
                                  id:tx.logs[0].args.id, 
                                  question:tx.logs[0].args._question,
                                  answered:false,
                                  answer:false,
                                  amount:0,
                                  userAnswer:false,
                                  profit:0
                                });
            })
  }

  setTrustedUser(event){
    event.preventDefault();
    return this.state.instance.setUserIsTrusted(this.state.trustedUserAddress, true, {from:this.state.accounts[0] })
            .then(tx => {
              console.log(tx.receipt);
              this.setState({trustedUserAddress:""})
            })
  }

  addBet(questionId , questionInternalIndex){
    var betAnswerBoolean = this.state.betAnswer==="true" ? true : false;
    return this.state.instance.bet(questionId, betAnswerBoolean, {from:this.state.accounts[0], value:this.state.betAmount})
            .then(tx => {
              console.log(tx);
              console.log(tx.logs[0].args);              
              this.state.questions[questionInternalIndex].amount = this.state.betAmount;
              this.state.questions[questionInternalIndex].userAnswer = betAnswerBoolean;
              this.setState({betAnswer:false});
              this.setState({betAmount:0});
            })
  }

  setQuestionAnswer(questionId, questionInternalIndex){

     var answer_bool = this.state.correctAnswer==="true" ? true : false;
     return this.state.instance.setQuestionAnswer(questionId, answer_bool, 
                             {from:this.state.accounts[0]})
            .then(tx => {
              console.log(tx.logs[0].args);
              this.state.questions[questionInternalIndex].answered = true;
              this.state.questions[questionInternalIndex].answer = answer_bool;
              this.setState({correctAnswer:""})
            })
  }

  withdrawBet(questionId,questionInternalIndex){
    return this.state.instance.withdrawBet(questionId, {from:this.state.accounts[0]})
            .then(tx => {
              console.log(tx.logs[0].args);
              this.state.questions[questionInternalIndex].profit = tx.logs[0].args.profit.toNumber();
            })
  }

  render() {

      
    let adminScene = this.state.isAdmin ? (  
               <div>
                  <h3>Welcome Admin.  </h3>
                  <h2>Please add a question:</h2>
                  <form onSubmit={this.addAQuestion}>            
                    <input value={this.state.questionToSubmit} onChange={e => this.setState({ questionToSubmit: e.target.value })}/>
                    <button type="submit"> Add </button>
                  </form>
                  <br/>
                  
                  <h2>Set Trusted user:</h2>
                    <form onSubmit={this.setTrustedUser}>
                     <input value={this.state.trustedUserAddress} onChange={e => this.setState({ trustedUserAddress: e.target.value })}/>
                     <button  type="submit"> Save </button>
                    </form>                 
              </div>) 
                 : 
              (<div> Welcome user. Please place a Bet Below </div>) 


 const arrOfQuestions = this.state.questions.map( (question , index )=> {
            return(
                <tr key={question.id}>
                      <td>{question.id.substring(0,6)}....</td>
                      <td><b>{question.question}</b></td>                        
                      <td>
                          {question.answered || question.amount>0 ? 
                            "No More Bets allowed. Your bet: "+(question.userAnswer ? 'Yes':'No') + ". Bet amount: "+ question.amount
                            : <form onSubmit={(e) => {
                                      e.preventDefault()
                                      this.addBet(question.id, index )
                                      }}>
                                <input placeholder="Amount" onChange={e => this.setState({ betAmount: e.target.value })}/>
                                <select onChange={e => this.setState({ betAnswer: e.target.value })} >
                                  <option value="">Select Yes or No</option>
                                  <option value="true">Yes</option>
                                  <option value="false">No</option>
                                </select>
                                <button type="submit">Bet</button>
                              </form> 
                          }
                      </td>
                      <td>
                          {question.answered ? (question.answer ? 'Yes':'No')
                                             : (this.state.isUserTrusted ? 
                                        ( <div><form onSubmit={(e) => {e.preventDefault()
                                                               this.setQuestionAnswer(question.id, index)
                                                              }}>
                                                  <select onChange={e => this.setState({ correctAnswer: e.target.value })} >
                                                    <option value="">Select Yes or No</option>
                                                    <option value="true">Yes</option>
                                                    <option value="false">No</option>
                                                  </select>

                                                  <button  >Save</button>
                                               </form>
                                          </div>) 
                                           : (<div> - </div> ))}
                      </td> 
                      <td>
                         {
                            question.answered  
                              ? (question.answer == question.userAnswer 
                                            ? 
                                         ( question.profit == 0 ? <form onSubmit={(e) => {
                                          this.withdrawBet(question.id , index)}}>
                                          <button >Withdraw</button>
                                         </form>                 
                                            : 
                                            <div>Withdrawn already done</div> )                        
                                         : 
                                    <div >No profit</div>
                                  ) 
                              : <div>Wait for the correct answer</div>
                          }
                      </td>
                      <td  >{question.answered ?
                                 (question.answer == question.userAnswer 
                                            ? 
                                          ( question.profit >0 ? question.profit : <div>You have to withdraw first</div>)  
                                            : '0'
                                  ) 
                                 : '-'}
                      </td>
                </tr>
            )
          })

    return (

      <div className="App">
        <nav className="navbar pure-menu pure-menu-horizontal">
            <a href="#" className="pure-menu-heading pure-menu-link">Prediction Market</a>
        </nav>

        <main className="container">
          <div className="pure-g">
            <div className="pure-u-1-1">
              <h1>Welcome to The Prediction Market!</h1>
              <p>Anybody can place a bet! 
              You can add a question if you an admin or answer if you are a trusted source!</p>
              <h5>Contract Address: {this.state.instance.address}</h5>
              <h5>Contract Balance: {this.state.contractBalance} Wei</h5>
              <h5>Your Address: {this.state.accounts[0]}</h5>
              <h5>Your Balance: {this.state.userBalance} Wei</h5>
              <br/> 
              {adminScene}
              <br/>
              <br/> 
               <div>
                <div>Number of questions available: {this.state.questionsCount}</div>
                <table width="90%" className="pure-table pure-table-bordered">
                        <thead>
                          <tr>
                              <th data-field="id">Question ID</th>
                              <th data-field="text">Question</th>
                              <th data-field="bet">Place a Bet (Wei)</th>
                              <th data-field="result">Result</th>
                              <th data-field="withdraw">Withdraw</th>
                              <th data-field="profit">Profit (Wei)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {arrOfQuestions}
                        </tbody>
                </table>  
              </div>             
            </div>           
          </div>
        </main>
      </div>

    );
  }
}

export default App