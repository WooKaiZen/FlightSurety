import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress;
const accounts = web3.eth.getAccounts();
let oracles = [];
let oraclesIndexes = [];

const TEST_ORACLES_COUNT = 25;

async function registerOracles() {
	let fee = flightSuretyApp.methods.REGISTRATION_FEE().call();
	let accounts = await accounts;
	let nbOracles = Math.min(accounts.length,TEST_ORACLES_COUNT);
	for (var i = 0; i<nbOracles; i++) {
		oracles.push(accounts[i]);
		// register oracle
		flightSuretyApp.methods.registerOracle().send({
		  from: accounts[i],
		  value: fee,
		  gas: 10000000,
		  gasPrice: 20000000
		});
		// retrieve oracle indexes
		flightSuretyApp.methods.registerOracle().send({
		  from: oracles[i],
		  value: fee,
		  gas: 10000000,
		  gasPrice: 20000000
		}).then(result => {
            console.log(`Oracle ${i} registered: ${accounts[i]}, indexes: [${result}]`);
            oraclesIndexes.push(result);
          }).catch(err => {
            reject(err);
        });		
	}
}

flightSuretyApp.events.OracleRequest({
    fromBlock: "latest"
	}, function (error, event) {
    if (error){
      console.log(error);
    } 
    console.log(event);
	let eValues = event.returnValues;
	let index = eValues.index;
	let airline = eValues.airline;
	let flight = eValues.flight;
	let timestamp = eValues.timestamp;
	// look for oracles with matching index
	for (var i = 0; i<oracles.length; i++) {
		for (var k = 0; k<3; k++) {
			if (oraclesIndexes[k] == index) {
				let statusCode = Math.floor(Math.random()*6)*10;
				submitOracleResponse(index,airline,flight,timestamp,statusCode,k);
				break;
			}
		}
	}
});

flightSuretyApp.events.FlightStatusInfo({
    fromBlock: "latest"
	}, function (error, event) {
    if (error){
      console.log(error);
    } 
    console.log(event);
}

flightSuretyApp.events.OracleReport({
    fromBlock: "latest"
	}, function (error, event) {
    if (error){
      console.log(error);
    } 
    console.log(event);
}

async function submitOracleResponse (                            
										uint8 index,
										address airline,
										string flight,
										uint256 timestamp,
										uint8 statusCode
										uint256 oracleIndex) {
	flightSuretyApp.methods.submitOracleResponse(index,airline,flight,timestamp,statusCode).call({from: oracles[oracleIndex], gas: 10000000});
}

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


