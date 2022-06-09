
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
var Web3 = require('web3');

// Watch contract events
const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

var InitialPassengerBalance;

contract('Oracles', async (accounts) => {

  const TEST_ORACLES_COUNT = 50;
  var config;
  var web3;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
	web3 = new Web3(new Web3.providers.HttpProvider(config.url));
	initialPassengerBalance = await config.flightSuretyData.getPassengerBalance(accounts[2]);
  });


  it('can register oracles', async () => {
    
    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

    // ACT
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {      
      await config.flightSuretyApp.registerOracle({ from: accounts[a], value: fee });
      let result = await config.flightSuretyApp.getMyIndexes.call({from: accounts[a]});
      console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
    }
  });

  it('can request flight status', async () => {
    
    // ARRANGE
    let flightId = 'ND1309'; // Course number
    let timestamp = Math.floor(Date.now() / 1000);
	let origin = "LAX";
	let destination = "BCN";
	let fundingAmount = web3.utils.toWei('10', 'ether');
	let insurancePayment = web3.utils.toWei('0.5', 'ether');
	let passenger = accounts[2];
	await config.flightSuretyData.fund(config.firstAirline,fundingAmount);

	// Register flight	
	await config.flightSuretyApp.registerFlight(flightId,origin,destination, {from: config.firstAirline});
	
	// Buy insurance
	await config.flightSuretyData.buyInsurance(flightId,insurancePayment, {from: passenger});

    // Submit a request for oracles to get status information for a flight
    await config.flightSuretyApp.fetchFlightStatus(config.firstAirline, flightId, timestamp, { from: config.firstAirline });
	
    // ACT

    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes (indices?)
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {

      // Get oracle information
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a]});
	  console.log('\n',oracleIndexes[0].toNumber(),oracleIndexes[1].toNumber(),oracleIndexes[2].toNumber());
      for(let idx=0;idx<3;idx++) {

        try {
          // Submit a response...it will only be accepted if there is an Index match
          await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], config.firstAirline, 
							flightId, timestamp, STATUS_CODE_LATE_AIRLINE, { from: accounts[a] });
		  console.log('\nSUCCESS', idx, oracleIndexes[idx].toNumber(), flightId, timestamp);
        }
        catch(e) {
          // Enable this when debugging
          //console.log('\nError', idx, oracleIndexes[idx].toNumber(), flightId, timestamp);
        }
      }
    }
	let result = await config.flightSuretyApp.getFlightStatusCode(config.firstAirline,flightId);
	// ASSERT
    assert.equal(result.toNumber(), STATUS_CODE_LATE_AIRLINE, "Oracles should be able to submit response on flight status");
  });

  // Can credit insurees
  it('(contract) can credit insurees for a flight delayed due to airline', async () => {
	let flightId = "ND1309";	
	let flightKey = await config.flightSuretyData.getFlightKey(config.firstAirline,flightId);
	let passenger = accounts[2];
	let result = await config.flightSuretyData.areInsureesCredited(flightKey);
    assert.equal(result, true, "Insurees should be credited if flight late due to airline");
  }); 

  /*
  // Can withdraw fund
  it('(passenger) can withdraw insurance for a flight delayed due to airline', async () => {
	let flightId = "ND1309";	
	let flightKey = await config.flightSuretyData.getFlightKey(config.firstAirline,flightId);
	let passenger = accounts[2];
	let insurancePayout = web3.utils.toWei('0.75', 'ether');
	console.log(passenger);
	try {
		await config.flightSuretyData.withdrawPayoutFunds({ from: passenger });
	} catch(e) {
		console.log(e.message.substring(0,300));
	}
	let newPassengerBalance = await config.flightSuretyData.getPassengerBalance(passenger);
    assert.equal(newPassengerBalance>initialPassengerBalance, true, "Insurees should be able to withdraw their insurance payouts");
  });
  */
  
  // Passenger does not get credited if flight delayed for other reason
  it('no insurance payout for other cause', async () => {
    
    // ARRANGE
    let flightId = 'XT1237'; // Course number
    let timestamp = Math.floor(Date.now() / 1000);
	let origin = "OSL";
	let destination = "QXO";
	let fundingAmount = web3.utils.toWei('10', 'ether');
	let insurancePayment = web3.utils.toWei('0.5', 'ether');
	let passenger = accounts[2];

	// Register flight	
	await config.flightSuretyApp.registerFlight(flightId,origin,destination, {from: config.firstAirline});
	
	// Buy insurance
	await config.flightSuretyData.buyInsurance(flightId,insurancePayment, {from: passenger});

    // Submit a request for oracles to get status information for a flight
    await config.flightSuretyApp.fetchFlightStatus(config.firstAirline, flightId, timestamp, { from: config.firstAirline });
	
    // ACT

    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes (indices?)
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {

      // Get oracle information
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a]});
	  console.log('\n',oracleIndexes[0].toNumber(),oracleIndexes[1].toNumber(),oracleIndexes[2].toNumber());
      for(let idx=0;idx<3;idx++) {

        try {
          // Submit a response...it will only be accepted if there is an Index match
          await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], config.firstAirline, 
							flightId, timestamp, STATUS_CODE_LATE_TECHNICAL, { from: accounts[a] });
		  console.log('\nSUCCESS', idx, oracleIndexes[idx].toNumber(), flightId, timestamp);
        }
        catch(e) {
          // Enable this when debugging
          //console.log('\nError', idx, oracleIndexes[idx].toNumber(), flightId, timestamp);
        }
      }
    }
	//let result = await config.flightSuretyApp.getFlightStatusCode(config.firstAirline,flightId);
	// ASSERT
	let flightKey = await config.flightSuretyData.getFlightKey(config.firstAirline,flightId);
	let result = await config.flightSuretyData.areInsureesCredited(flightKey);
    assert.equal(result, false, "Insurees should not be credited if flight late due to other cause");
  });
 
});
