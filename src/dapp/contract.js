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
		this.config = config;
    }

    initialize(callback) {
        this.web3.eth.getAccounts(async (error, accts) => {
           
            this.owner = await accts[0];
			console.log("Owner:",this.owner);
			this.account = await accts[1];

            let counter = 1;
			
			this.airlines = [];//await this.flightSuretyData.methods.getRegisteredAirlines().call({ from: self.owner});
			//console.log(this.airlines.length);
            
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
            .call({ from: self.owner, gas: 4712388, gasPrice: 100000000000}, callback);
    }
	
	setOperatingStatus(mode, callback) {
		let self = this;
		self.flightSuretyData.methods
            .setOperatingStatus(mode)
            .send({ from: self.owner, gas: 4712388, gasPrice: 100000000000})//, callback);
			.on('error', function(error, receipt) { 
				console.log(error);
			});
	}
	
	async registerAirline(airline, callback) {
		console.log("Registering:",airline);
		let self = this;
		await self.flightSuretyApp.methods
            .registerAirline(airline)
            .send({ from: self.owner, gas: this.config.gas})//, callback);
			.on('error', function(error, receipt) { 
				console.log(error);
			});
			/*.then(await self.flightSuretyData.methods.isRegistered(airline)
			.call({ from: this.Account}, callback)
			.then(p=>console.log(p)));*/
		self.isAirlineRegistered(airline);
	}
	
	async isAirlineRegistered(airline, callback) {
		let self = this;
		await self.flightSuretyData.methods
			.isRegistered(airline)
			.call({ from: self.owner, gas: this.config.gas}, callback)
			.then(reg=>console.log("registered:",reg));
	}
	
	async isAirlineFunded(airline,callback) {
		let self = this;
		await self.flightSuretyData.methods
			.isFunded(airline)
			.call({ from: self.owner, gas: this.config.gas}, callback)
			.then(funded=>console.log("funded:",funded));
	}
	
	async airlineInitialFunding(airline, callback) {
		console.log("Funding:",airline);
		let self = this;
		try {
			self.flightSuretyData.methods
				.fund(airline, this.web3.utils.toWei("10", "ether").toString())
				.send({ from: self.owner, gas: this.config.gas})//, callback);
				.on('error', function(error, receipt) { 
					console.log(error);
				})
		} catch(e) {
			console.log(e);
		}
		self.isAirlineRegistered(airline);
		self.isAirlineFunded(airline);			
		/*await self.flightSuretyData.methods.isRegistered(airline)
			.call({ from: this.Account}, callback);*/
		//	.then(b=>console.log(b));
	}
	
	registerFlight(flightId, departureLocation, arrivalLocation, callback) {
		console.log("Registering flight:",flightId);
		let self = this;
		self.flightSuretyApp.methods
            .registerFlight(flightId,departureLocation,arrivalLocation)
            .send({ from: this.account, gas: this.config.gas})//, callback);
			.on('error', function(error, receipt) { 
				console.log(error);
			})	
		self.isFlightRegistered(flightId);
	}
	
	async isFlightRegistered(flightId, callback) {
		let self = this;
		let reg = await self.flightSuretyData.methods
			.isFlightRegistered(flightId)
			.call({ from: self.owner}, callback);
		console.log("registered:",reg);
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
            .send({ from: this.account, gas: this.config.gas})//, callback);
			.on('error', function(error, receipt) { 
				console.log(error);
			})	
	}
	
	getWithdrawableFunds(callback) {
		let self = this;
		self.flightSuretyData.methods
            .getWithdrawableFunds()
            .call({ from: this.account}, callback);			
	}
	
	withdrawPayoutFunds(flightId, callback) {
		let self = this;
		self.flightSuretyData.methods
            .withdrawPayoutFunds()
            .send({ from: this.account, gas: this.config.gas})//, callback);
			.on('error', function(error, receipt) { 
				console.log(error);
			})				
	}
}
