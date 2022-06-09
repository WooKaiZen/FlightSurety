
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
		"0xB9F758EB65bA749ed365C58b2b41a7128b3443f4",
		"0x90CbF9C3888A3B16D73dF2339CE9b8bb5675ca5F",
		"0x644Ae83f3857d1fcE414D9f9690A32fF13DE27a2",
        "0xc98293C265F0fFE297f9F20CDea8c4982562C4Bc",
        "0x62FF2b1606c7Aa54511c156B863B1D2782623616",
        "0xE3de90Ee4AadE711CCE79EFeF753605528eB34AD",
        "0x60E5597caac11DAd5efCb6Bb20e4B50786DaFc9e",
        "0xa23eAEf02F9E0338EEcDa8Fdd0A73aDD781b2A86",
        "0x6b85cc8f612d5457d49775439335f83e12b8cfde",
        "0xcbd22ff1ded1423fbc24a7af2148745878800024",
        "0xc257274276a4e539741ca11b590b9447b26a8051",
        "0x2f2899d6d35b1a48a4fbdc93a37a72f264a9fca7"
    ];


    let owner = accounts[0];
    let firstAirline = accounts[1];

    let flightSuretyData = await FlightSuretyData.new(firstAirline);
    let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address);

    
    return {
        owner: owner,
        firstAirline: firstAirline,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};