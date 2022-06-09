
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        /*contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });*/
		
		// Operational status
        DOM.elid('check-operational').addEventListener('click', () => {
            contract.isOperational(async (error, result) => {
                if (!error) {
                    if (result) {
						DOM.elid("opstatus").value = "On";
					} else if (!result) {
						DOM.elid("opstatus").value = "Off";
                    }
					DOM.elid('switch-operational').disabled = false;
				}
			}
        });		

        DOM.elid('switch-operational').addEventListener('click', () => {
            contract.isOperational(async (error, result) => {
                if (!error) {
                    if (result) {
                        contract.setOperatingStatus(false);
						DOM.elid("opstatus").value = "Off";
                    } else if (!result) {
                        contract.setOperatingStatus(true);
						DOM.elid("opstatus").value = "On";
                    }
                }
            });
        });

		// Register airline
		DOM.elid('inp-reg-airline').addEventListener('input', enableRegisterAirline);
		
		function enableRegisterAirline(e) {
		  if (web3.utils.isAddress(e.target.value) {
			DOM.elid('btn-reg-airline').disabled = false;
		  }
		  else {
			DOM.elid('btn-reg-airline').disabled = true;
		  }
		}
		
        DOM.elid('btn-reg-airline').addEventListener('click', () => {
			let address = DOM.elid('reg-flightid').value;
            contract.registerAirline(address);
        });
				
		// Fund airline		
		DOM.elid('inp-fund-airline').addEventListener('input', enableFundAirline);
		
		function enableFundAirline(e) {
		  if (web3.utils.isAddress(e.target.value) {
			DOM.elid('btn-fund-airline').disabled = false;
		  }
		  else {
			DOM.elid('btn-fund-airline').disabled = true;
		  }
		}

		DOM.elid('btn-fund-airline').addEventListener('click', () => {
            contract.airlineInitialFunding();
        });
		
		// Register flight
		DOM.elid('reg-flightid').addEventListener('input', enableRegisterFlight);
		DOM.elid('reg-origin').addEventListener('input', enableRegisterFlight);
		DOM.elid('reg-destination').addEventListener('input', enableRegisterFlight);
		
		function enableRegisterFlight(e) {
		  if (DOM.elid('reg-flightid').value.length > 0) && (DOM.elid('reg-origin').value.length > 0) && (DOM.elid('reg-destination').value.length > 0) {
			DOM.elid('btn-reg-flight').disabled = false;
		  }
		  else {
			DOM.elid('btn-reg-flight').disabled = true;
		  }
		}
		
        DOM.elid('btn-reg-flight').addEventListener('click', () => {
			let flightId = DOM.elid('reg-flightid').value;
			let origin = DOM.elid('reg-origin').value;
			let destination = DOM.elid('reg-destination').value;
            contract.registerFlight(flightId,origin,destination);
        });		
		
		// Buy insurance
		DOM.elid('ins-flightid').addEventListener('input', enableBuy);
		DOM.elid('funding-amount').addEventListener('input', enableBuy);
		
		function enableBuy(e) {
		  if (DOM.elid('funding-amount').value.length > 0) && (DOM.elid('ins-flightid').value.length > 0) { 
				  DOM.elid('btn-buy-insurance').disabled = false;
		  }
		  else {
			DOM.elid('btn-buy-insurance').disabled = true;
		  }
		}
		
        DOM.elid('btn-buy-insurance').addEventListener('click', () => {
			let flightId = DOM.elid('ins-flightid').value;
			let amount = DOM.elid('ins-amount').value;
            contract.buyInsurance(flight, amount); // TODO: gerer timestamp
        });			
		
		// Withdraw funds
        DOM.elid('btn-view-funds').addEventListener('click', () => {
            contract.getWithdrawableFunds(async (error, result) => {
                if (!error) {
					DOM.elid("withdrawable-funds").value = result;
                    if (result>0) {
						DOM.elid('btn-withdraw').disabled = false;
					}
				}
			}
        });		

        DOM.elid('btn-withdraw').addEventListener('click', () => {
            contract.withdrawPayoutFunds(async (error, result) => {
                if (!error) {
					DOM.elid('btn-withdraw').disabled = true;
                }
            });
        });		

        /*// User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })*/
    
    });
    

})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







