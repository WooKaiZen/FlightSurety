pragma solidity >=0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
	
	struct Airline {
		bool isRegistered;
		bool isFunded;
		uint256 funds;
    }
	
	struct Flight {        
        address airline;
		string flightId;
		uint256 timestamp;
		bool insureesCredited;
    }
	
	uint256 nbAirlinesRegistered = 0;
	mapping(address => Airline) airlines;
	mapping(string => uint256) registrationTimestamp; // flightId => timestamp
	mapping(bytes32 => Flight) flights; // flightKey => flight
	mapping(address => mapping(string => uint256)) passengerPayments; // passengerAddress => flightId => payment
	mapping(string => uint256) FlightsNumbers; // FlightId => Flight number
	mapping(string => address[]) flightInsuranceBuyers; // flightNumber => list of insurees
	mapping(address => uint256) passengerCredit; // passengerAddress => insurance payout
	uint256 maxInsurancePurchase = 1 ether;
	string[] registeredFlights;
	uint256 nbRegisteredFlights = 0;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
									address airlineAddress
                                ) 
                                public 
								payable
    {
        contractOwner = msg.sender;
		airlines[airlineAddress] = Airline(true,false,0);
		nbAirlinesRegistered = 1;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }
	
    /**
    * @dev Modifier that requires flight insurees have not been credited already
    */
	modifier requireNotAlreadyCredited(bytes32 flightKey) 
    {
        require(!flights[flightKey].insureesCredited, "Insurees have already been credited");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }
	
    /**
    * Test requireIsOperational
    *
    */    
    function testRequireOperational
                            (
                            ) 
                            external
							view
                            requireIsOperational 
    {
    }
	
	/**
    * Is airline registered
    *
    */    
    function isRegistered
                            (
                                address airlineAddress
                            ) 
                            external
							view
                            requireIsOperational
							returns(bool)
    {
        return airlines[airlineAddress].isRegistered;
    }

	/**
    * Is airline funded
    *
    */    
    function isFunded
                            (
                                address airlineAddress
                            ) 
                            external
							view
                            requireIsOperational
							returns(bool)
    {
        return airlines[airlineAddress].isFunded;
    }
	
	/**
    * Is flight registered
    *
    */    
    function isFlightRegistered
                            (
                                string flightId
                            ) 
                            external
							view
							returns(bool)
    {
		bytes32 kId = keccak256(bytes(flightId));
		for (uint i = 0; i <registeredFlights.length; i++) {
			if (keccak256(bytes(registeredFlights[i])) == kId) {
				return true;
			}
		}
        return false;
    }
	
	function getRegisteredFlights() external view returns(bool) {
		return (registeredFlights.length>0);
	} 
	
    /**
    * @dev Modify maximum insurance purchase payment
    *
    */    
    function modifyMaximumPurchase
                            (
                                uint256 newMaximum
                            ) 
                            external
                            requireContractOwner 
							requireIsOperational
    {
        maxInsurancePurchase = newMaximum;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (   
								address airlineAddress
                            )
                            external
							requireIsOperational
    {
		airlines[airlineAddress] = Airline(true,false,0);
		nbAirlinesRegistered += 1;
    }

   /**
    * @dev Register a flight
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerFlight
                            (
								address airlineAddress,
								string flightId,
								uint256 timestamp
							)
							external
							requireIsOperational
	{
		registrationTimestamp[flightId] = timestamp;
		bytes32 flightKey = getFlightKey(airlineAddress,flightId);
		flights[flightKey] = Flight(airlineAddress,flightId,timestamp,false);
		registeredFlights.push(flightId);
		FlightsNumbers[flightId] = nbRegisteredFlights;
		nbRegisteredFlights += 1;
	}

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buyInsurance
                            (           
								string flightId,
								uint256 amount
                            )
                            external
                            payable
							requireIsOperational
    {
		require(msg.sender == tx.origin, "Contracts not allowed");
		require(amount > 0, "Payment must be more than 0"); 
		require(amount <= maxInsurancePurchase, "Maximum insurance purchase exceeded");
		require(!(passengerPayments[msg.sender][flightId]>0),"Passenger has already purchased insurance for this flight"); //
		flightInsuranceBuyers[flightId].push(msg.sender);
		passengerPayments[msg.sender][flightId] = amount;
    }
	
	function getInsurancePayment(string flightId) external view returns(uint256) {
		return passengerPayments[msg.sender][flightId];
	}
	
	function getNbInsuranceBuyers(string flightId) external view returns(uint256){
		return flightInsuranceBuyers[flightId].length;
	}

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
									bytes32 flightKey,
									string flightId
                                )
                                external
                                requireIsOperational
								requireNotAlreadyCredited(flightKey)
    {	
		address passengerAddress;
		//uint256 flightNumber = FlightsNumbers[flightId];
		for (uint i = 0; i<flightInsuranceBuyers[flightId].length; i++) {
			passengerAddress = flightInsuranceBuyers[flightId][i];
			passengerCredit[passengerAddress] += 3*passengerPayments[passengerAddress][flightId]/2;
		}
		flights[flightKey].insureesCredited = true;
    }
	
	function areInsureesCredited(bytes32 flightKey) external view returns(bool){
		return flights[flightKey].insureesCredited;
	}
	
	function getPassengerCredit(address passengerAddress) external view returns(uint256){
		return passengerCredit[passengerAddress];
	}
	
	function getPassengerBalance(address passengerAddress) external view returns(uint256){
		return passengerAddress.balance;
	}
    
    /**
     *  @dev Check insuree's eligible payout funds
     *
    */
    function getWithdrawableFunds
                            (
                            )
                            external
							payable
							requireIsOperational
							returns(uint256)
    {
		require(msg.sender == tx.origin, "Contracts not allowed");
		return(passengerCredit[msg.sender]);
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function withdrawPayoutFunds
                            (
                            )
                            external
							payable
							requireIsOperational
    {
		require(msg.sender == tx.origin, "Contracts not allowed");
		require(passengerCredit[msg.sender]>0, "No payout funds to withdraw");
		uint256 withdrawableFunds = passengerCredit[msg.sender];
		passengerCredit[msg.sender] = 0;
		(bool success, ) = address(uint160(address(msg.sender))).call.value(1 ether)("");//withdrawableFunds//msg.sender
		require(success, "Transfer failed.");
		//msg.sender.transfer(withdrawableFunds); // TODO: fix
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
								address airlineAddress,
								uint256 funding
                            )
                            public
                            payable
							requireIsOperational
    {
		airlines[airlineAddress].funds = funding;
		airlines[airlineAddress].isFunded = true;
    }
	
	function getAirlineFunds(address airlineAddress) external view returns(uint256){
		return airlines[airlineAddress].funds;
	}

    function getFlightKey
                        (
                            address airline,
                            string flight
                        )
                        view
                        public
                        returns(bytes32) 
    {
		uint256 timestamp = registrationTimestamp[flight];
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function
    *
    */
    function() 
                            external 
                            payable 
    {
    }


}

