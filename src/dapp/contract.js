import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
		this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.account = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];
			this.account = accts[1];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }
	
	setOperatingStatus(mode, callback) {
		let self = this;
		self.flightSuretyData.methods
            .setOperatingStatus(mode)
            .call({ from: self.owner}, callback);
	}
	
	registerAirline(airline, departureLocation, arrivalLocation, callback) {
		let self = this;
		self.flightSuretyApp.methods
            .registerAirline(airline,departureLocation,arrivalLocation)
            .call({ from: this.Account}, callback);		
	}
	
	airlineInitialFunding(callback) {
		let self = this;
		self.flightSuretyApp.methods
            .airlineInitialFunding()
            .call({ from: this.Account}, callback);			
	}
	
	registerFlight(flightId, callback) { // TODO: ajouter origine et destination
		let self = this;
		self.flightSuretyApp.methods
            .registerFlight(flightId)
            .call({ from: this.Account}, callback);			
	}

    fetchFlightStatus(flightId, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }
	
	buyInsurance(flight, amount, callback) {
        let self = this;
        self.flightSuretyData.methods
            .buyInsurance(flight,amount)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
	}
	
	getWithdrawableFunds(callback) {
		let self = this;
		self.flightSuretyData.methods
            .getWithdrawableFunds()
            .call({ from: this.Account}, callback);			
	}
	
	withdrawPayoutFunds(flightId, callback) {
		let self = this;
		self.flightSuretyData.methods
            .withdrawPayoutFunds()
            .call({ from: this.Account}, callback);			
	}
}