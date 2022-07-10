pragma solidity >=0.4.24;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects against such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

	FlightSuretyData flightSuretyData;
    // Flight status codes
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner;          // Account used to deploy contract

	struct Airline {
		bool isRegistered;
		bool isFunded;
		uint256 Idx; // registration order
	}

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
		string flightId;
		string departureLocation;
		string arrivalLocation;
		bytes32 flightKey;
    }
	
    mapping(bytes32 => Flight) private flights;
	mapping(string => bool) private registeredFlights; // flightId => registration status
	address[] candidateAirlinesAddresses;
	mapping(address => address[]) airlinesVoters; // airline => list of voters
	mapping(address => Airline) candidateAirlines;
	mapping(address => Airline) registeredAirlines;
	mapping(string => uint256) registrationTimestamp; // flightId => timestamp
	
	uint8 public oracleResponsesIdx;
	
	uint256 RequiredInitialFunding = 10 ether;
	uint256 nbAirlines = 0;
	uint256 nbAirlinesRegistered = 0;
 
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
         // Modify to call data contract's status		
        require(flightSuretyData.isOperational(), "Contract is currently not operational");  
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }
	
    /**
    * 	   Modifier that requires the caller has not voted yet for a candidate airline
    *      This is used to prevent a registered airline from voting more than once
    */
	modifier requireHasNotVotedYet(address candidateAirlineAddress)
	{
		bool newCandidate = true;
		for (uint a = 0; a < candidateAirlinesAddresses.length; a++) {
			if (candidateAirlinesAddresses[a] == candidateAirlineAddress) {
				newCandidate = false;
			}
		}
		if (!newCandidate) {
			//Airline storage candidateAirline = candidateAirlines[candidateAirlineAddress];
			bool hasNotVoted = true;
			for (uint i = 0; i < airlinesVoters[candidateAirlineAddress].length; i++) {
				if (airlinesVoters[candidateAirlineAddress][i] == msg.sender) {
					hasNotVoted = false;
					break;
				}
			}
			require(hasNotVoted,"You already voted to register this airline");
		}
        _;  
	}
	
    /**
    * @dev Modifier that requires the calling airline account to be registered 
    */
    modifier requireIsAirlineRegistered(address airlineAddress)
    {
        require(flightSuretyData.isRegistered(airlineAddress), "Airline is not registered");
        _;
    }
	
	/**
    * @dev Modifier that requires the calling airline account to be registered 
    */
    modifier requireIsFunded(address airlineAddress)
    {
        require(flightSuretyData.isFunded(airlineAddress), "Airline is not funded");
        _;
    }
	
    /**
    * @dev Modifier that requires the candidate airline account to not be already registered 
    */
    modifier requireIsNotRegistered(address airlineAddress)
    {
        require(!flightSuretyData.isRegistered(airlineAddress), "Airline is already registered");
        _;
    }
	
    modifier requireIsAirlineFunded()
    {
        require(flightSuretyData.isFunded(msg.sender), "Airline is not funded");
        _;
    }

    /**
    * @dev Modifier that requires the airline account to not be already funded 
    */
    modifier requireIsNotFunded()
    {
        require(!flightSuretyData.isFunded(msg.sender), "Airline is already funded");
        _;
    }

    /**
    * @dev Modifier that requires the flight to not be already registered 
    */
    modifier requireIsNotFlightRegistered(string flightId)
    {
        require(!registeredFlights[flightId], "Flight is already registered");
        _;
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
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor
                                (
									address dataContract
                                ) 
                                public 
    {
        contractOwner = msg.sender;
		flightSuretyData = FlightSuretyData(dataContract);
		nbAirlines = 1;
		nbAirlinesRegistered = 1;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
		return flightSuretyData.isOperational();
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
    * @dev Add an airline to the registration queue
    *
    */   
    function registerAirline
                            (   
								address airlineAddress
                            )
                            external
							requireIsOperational 
							requireIsAirlineRegistered(msg.sender)
							requireIsFunded(msg.sender)
							requireIsNotRegistered(airlineAddress) // candidate airline
							requireHasNotVotedYet(airlineAddress)
							returns(bool)
    {	
		if (nbAirlinesRegistered < 4){
			flightSuretyData.registerAirline(airlineAddress); // TODO: test/check for failures
			registeredAirlines[airlineAddress] = Airline(true,false,nbAirlines);
			airlinesVoters[airlineAddress].push(msg.sender);
			nbAirlines += 1;
			nbAirlinesRegistered += 1;
		}
		else {
			bool newCandidate = true;
			for (uint a = 0; a < candidateAirlinesAddresses.length; a++) {
				if (candidateAirlinesAddresses[a] == airlineAddress) {
					newCandidate = false;
					break;
				}
			}
			if (newCandidate) {
				candidateAirlinesAddresses.push(airlineAddress);
				candidateAirlines[airlineAddress] = Airline(false,false,nbAirlines);
				airlinesVoters[airlineAddress].push(msg.sender);
				nbAirlines += 1;
			}
			else {
				airlinesVoters[airlineAddress].push(msg.sender);
				if (airlinesVoters[airlineAddress].length>=(nbAirlinesRegistered/2)) {
					flightSuretyData.registerAirline(airlineAddress);
					candidateAirlines[airlineAddress].isRegistered = true;
					registeredAirlines[airlineAddress] = candidateAirlines[airlineAddress];
					nbAirlinesRegistered += 1;
				}
			}
		}
    }
		
	function getAirlineNbVoters(address airlineAddress) external view returns(uint256)
	{
		return airlinesVoters[airlineAddress].length;
	}

    /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight
                                (
									string flightId,
									string departureLocation,
									string arrivalLocation
                                )
                                external
								requireIsOperational
								requireIsAirlineRegistered(msg.sender)
								requireIsAirlineFunded
								requireIsNotFlightRegistered(flightId)
    {
		uint256 timestamp = block.timestamp;
		bytes32 flightKey = getFlightKey(msg.sender,flightId,timestamp);
		flightSuretyData.registerFlight(msg.sender,flightId,timestamp);
		flights[flightKey] = Flight(true,0,timestamp,msg.sender,flightId,departureLocation,arrivalLocation,flightKey);
		registrationTimestamp[flightId] = timestamp;
    }
	
    /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus
                                (
                                    address airline,
                                    string memory flightId,
                                    uint256 timestamp,
                                    uint8 statusCode
                                )
                                internal
								requireIsOperational
    {	
		bytes32 flightKey = getFlightKey(airline,flightId,registrationTimestamp[flightId]);
		Flight storage flight = flights[flightKey];
		if (flight.statusCode == 0) { // status still unknown
			flight.statusCode = statusCode;
			if (statusCode == 20) // Delay due to airline
			{
				flightSuretyData.creditInsurees(flightKey,flightId);
			}
		}
		flights[flightKey].updatedTimestamp = timestamp;
    }
	
	function getFlightStatusCode(
									address airline,
                                    string flightId
								)
								external
								view
								returns(uint256)
	{
		bytes32 flightKey = getFlightKey(airline,flightId,registrationTimestamp[flightId]);
		return flights[flightKey].statusCode;
	}

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
                        (
                            address airline,
                            string flightId,
                            uint256 timestamp                            
                        )
                        external
						requireIsOperational
    {
        uint8 index = getRandomIndex(msg.sender);
		oracleResponsesIdx = index;
		emit OracleRequest(index, airline, flightId, timestamp);//
        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flightId, timestamp));
        oracleResponses[key] = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });

        emit OracleRequest(index, airline, flightId, timestamp);
		
		//return oracleResponsesIdx;//oracleResponses[key].isOpen;
    } 
	
	//for dbg
	function getOracleIndex() public view returns(uint8) {
		return oracleResponsesIdx;
	}
	
	function getOraclesResponses(address airline,string flightId,uint256 timestamp) public view returns(bool) {
		bytes32 key = keccak256(abi.encodePacked(oracleResponsesIdx, airline, flightId, timestamp));
		return oracleResponses[key].isOpen;
	}

// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle
                            (
                            )
                            external
                            payable
							requireIsOperational
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        isRegistered: true,
                                        indexes: indexes
                                    });
    }

    function getMyIndexes
                            (
                            )
                            view
                            external
                            returns(uint8[3])
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }




    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address airline,
                            string flight,
                            uint256 timestamp,
                            uint8 statusCode
                        )
                        external
						//view 
						//returns(bool)
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); //index
		//return oracleResponses[key].isOpen;//oracleResponsesIdx;//key;//
		
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");
		
        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }


    function getFlightKey
                        (
                            address airline,
                            string flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (                       
                                address account         
                            )
                            internal
                            returns(uint8[3])
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

// endregion

    function () external  {
    }

}   

contract FlightSuretyData {
	function isOperational() public view returns(bool); //
    function isRegistered(address airlineAddress) external view returns(bool);
	function isFunded(address airlineAddress) external view returns(bool);
	function registerAirline(address airlineAddress) external;
	function fund(address airlineAddress,uint256 funding) public payable;
	function registerFlight(address airlineAddress,string flightId,uint256 timestamp) external;
	function creditInsurees(bytes32 flightKey, string flightId) external;
}
