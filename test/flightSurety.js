
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
var Web3 = require('web3');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  var web3;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
	web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    //await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: accounts[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: accounts[0] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access denied to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSuretyData.testRequireOperational();
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  // Airline can be funded
  it('(airline) can be funded using fund()', async () => {
    let amount = web3.utils.toWei('10', 'ether');
	
    try {
        await config.flightSuretyData.fund(config.firstAirline,amount);
    }
    catch(e) {
		
    }
    let result = await config.flightSuretyData.isFunded.call(config.firstAirline); 
    assert.equal(result, true, "Airline should be able to get funded");

  });
  
  // Can register an airline
  it('(airline) can register an Airline using registerAirline() if it is funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {
		console.log("Error registering airline");
    }
    let result = await config.flightSuretyData.isRegistered.call(newAirline);

    // ASSERT
    assert.equal(result, true, "Airline should be able to register another airline if it has provided funding");

  });

  // Can only register airline once (cannot register twice)
  it('(airline) cannot register an Airline using registerAirline() twice', async () => {
    
    // ARRANGE
    let registeredAirline = accounts[2];
	let doubleRegistration = true;

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(registeredAirline, {from: config.firstAirline});
    }
    catch(e) {
		doubleRegistration = false;
    }

    // ASSERT
    assert.equal(doubleRegistration, false, "Airline should not be able to register another airline twice");

  });  

  // Airline cannot register another airline it is not funded itself
  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
	let unfundedAirline = accounts[2];
    let newAirline = accounts[3];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: unfundedAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isRegistered.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });
 
  // Can register a flight
  it('(airline) can register a flight using registerFlight() if it is registered and funded', async () => {
    
    // ARRANGE
	let flightId = "A487BY";
	let origin = "LAX";
	let destination = "BCN";

    // ACT
    try {
        await config.flightSuretyApp.registerFlight(flightId,origin,destination, {from: config.firstAirline});
    }
    catch(e) {
		
    }
	let flightRegistered = await config.flightSuretyData.isFlightRegistered(flightId);

    // ASSERT
    assert.equal(flightRegistered, true, "Airline should be able to register a flight if it has provided funding");

  });  
  
  // Can purchase insurance
  it('(passenger) can buy insurance for a flight using buyInsurance()', async () => {
    
    // ARRANGE
	let passenger = accounts[6];
	let flightId = "A487BY";
	let amount = web3.utils.toWei('0.5', 'ether');

    // ACT
    try {
        await config.flightSuretyData.buyInsurance(flightId,amount, {from: passenger});
    }
    catch(e) {
		
    }
	let insurancePayment = await config.flightSuretyData.getInsurancePayment(flightId, {from: passenger});

    // ASSERT
    assert.equal(insurancePayment, amount, "Airline should be able to register a flight if it has provided funding");
  }); 
	
  // Registration of 5th airline requires a majority vote 
  it('(multiparty) cannot get registered using registerAirline() if it lacks votes', async () => {
    // ARRANGE
    let thirdAirline = accounts[3];
	let fourthAirline = accounts[4];
	let fifthAirline = accounts[5];
	let amount = web3.utils.toWei('10', 'ether');
	
	config.flightSuretyApp.registerAirline(thirdAirline, {from: config.firstAirline});
	config.flightSuretyData.fund(thirdAirline,amount);
	config.flightSuretyApp.registerAirline(fourthAirline, {from: thirdAirline});
	config.flightSuretyData.fund(fourthAirline,amount);
	
    // ACT
    try {
        await config.flightSuretyApp.registerAirline(fifthAirline, {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isRegistered.call(fifthAirline);	
		
    // ASSERT
    assert.equal(result, false, "Fifth airline should not be able to get registered without the votes from at least half of those already registered");
  }); 

  it('(multiparty) can get registered using registerAirline() if it has enough votes', async () => {
    
    // ARRANGE
	let fourthAirline = accounts[4];
	let fifthAirline = accounts[5];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(fifthAirline, {from: fourthAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isRegistered.call(fifthAirline); 
	
    // ASSERT
    assert.equal(result, true, "Fifth airline should be able to get registered with votes from more than half of those already registered");
  });

});
