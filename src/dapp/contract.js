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
			console.log("Owner:",this.owner);
			this.account = accts[1];

            let counter = 1;
            
            while(this.airlines.length < 5) {
				console.log("Airline:",accts[counter]);
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
	
	async registerAirline(airline, callback) {
		let self = this;
		await self.flightSuretyApp.methods
            .registerAirline(airline)
            .call({ from: this.Account}, callback);
			/*.then(await self.flightSuretyData.methods.isRegistered(airline)
			.call({ from: this.Account}, callback)
			.then(p=>console.log(p)));*/
	}
	
	/*isAirlineRegistered(airline, callback) {
		let self = this;
		let reg = await self.flightSuretyData.methods.isRegistered(airline);
		return reg;
	}*/
	
	async airlineInitialFunding(airline, callback) {
		let self = this;
		self.flightSuretyData.methods
            .fund(airline, this.web3.utils.toWei("10", "ether").toString())
            .call({ from: this.Account}, callback);			
		/*await self.flightSuretyData.methods.isRegistered(airline)
			.call({ from: this.Account}, callback);*/
		//	.then(b=>console.log(b));
	}
	
	registerFlight(flightId, departureLocation, arrivalLocation, callback) {
		let self = this;
		self.flightSuretyApp.methods
            .registerFlight(flightId,departureLocation,arrivalLocation)
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
		console.log(flight,this.web3.utils.toWei(amount, "ether").toString());
        self.flightSuretyData.methods
            .buyInsurance(flight,this.web3.utils.toWei(amount, "ether").toString())
            .call({ from: self.owner}, callback);
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
