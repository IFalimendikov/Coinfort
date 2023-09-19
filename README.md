# Coinfort Escrow Service

                                  |>>>
                                  |
                    |>>>      _  _|_  _         |>>>
                    |        |;| |;| |;|        |
                _  _|_  _    \\.    .  /    _  _|_  _
               |;|_|;|_|;|    \\:. ,  /    |;|_|;|_|;|
               \\..      /    ||;   . |    \\.    .  /
                \\.  ,  /     ||:  .  |     \\:  .  /
                 ||:   |_   _ ||_ . _ | _   _||:   |
                 ||:  .|||_|;|_|;|_|;|_|;|_|;||:.  |
                 ||:   ||.    .     .      . ||:  .|
                 ||: . || .       CF.   .  , ||:   |       \,/
                 ||:   ||:  ,  _______   .   ||: , |            /`\
                 ||:   || .   /+++++++\    . ||:   |
                 ||:   ||.    |+++++++| .    ||: . |
              __ ||: . ||: ,  |+++++++|.  . _||_   |

## Summary 
Coinfort is a decentralized escrow application based on the Ethereum Blockchain.

With Coinfort users can make deposits in ERC20 coins, set timeout and the address of the receiver of funds. 
Before starting a transaction, user need to open a Coinfort Account.

Transaction closure happens in two cases:
1) After a timeout set by the depositor, if the Oracle driven external condition wasn't met, funds are sent back to the depositor.
2) Before timeout, if the Oracle driven external condition is met, funds are sent to the predefined receiver address.

### Logic Flowchart
![image](https://github.com/IFalimendikov/Coinfort/assets/113106548/4bdbd484-fbd5-4a24-a20a-04c42bb760ae)




## Functions list
| Public functions                  | Description                                                                                   |
|:----------------------------------|:----------------------------------------------------------------------------------------------|
| openAccount()                     | Open account for depositor, needed to make a deposit                                          |
| initializeTransaction()           | Open transaction with the set timeout                                                         |
| closeTransaction()                | Close transaction by sending funds back to depositor or to receiver                           |
| getTransactionData()              | Return Transcation struct                                                                     |
| getAccountData()                  | Return Account struct                                                                         |
| getAccountBalance()               | Return deposited account balance in ERC20                                                     |
| **Admin functions**               | **Description**                                                                               |
| pauseAccountSwitch()              | Pause all operations on account                                                               |
| pauseTransactionSwitch()          | Pause transaction                                                                             |
| approveCoin()                     | Approve ERC20 for depositing                                                                  |
| setOracleAddress()                | Set Oracle                                                                                    |
| withdrawAlts()                    | Emergency withdrawal for ERC20                                                                |
| withdraw()                        | Emergency withdrawal for ETH                                                                  |
| setManager()                      | Set contract manager address                                                                  |
| **Internal functions**            | **Description**                                                                               |
| approveTransaction()              | Function used by the Oracle, when the external condition is met                               |



## Design rationale

Coinfort uses a system where every Account and every Transaction and presented with structs, and saved in the state. 

This approach allows for several benefits regarding security measures:
1) Every account could be paused and inspected.
2) Every transaction could be paused and inspected.
3) Application creates history of transactions for every user.
4) Closing function fetches data from internal state, not from the caller.
5) Security checks are tuned more precisely.

In addition to the Account and Transaction system, Coinfort uses a wide variety of checks and requirements to eliminate any potential attacks.

### Potential security improvements

To further secure the application's security: 
1) Verified Oracle timestamp should be used instead of the block.timestamp.
2) Multisig wallet should be used as a manager and deployer.
3) Integration of the offchain security measures.
4) Timeouts before funds transfers.
5) Implement measures against bot attacks.


## Testing

In the **test** folder, you can find unit tests. Every public and admin functions were tested with a wide variety of tests done in the **Hardhat** testchain environment. 
Unit tests were simulating attacks on the application's logic, below test results are presented.

![image](https://github.com/IFalimendikov/Coinfort/assets/113106548/dc1bd9b2-496d-4790-aaff-19609d9dd6f5)

## Deployment
You can find deployment script in the **scripts** folder. Script automatically deploys and verifies Coinfort and Oracle smart contract onchain using **Hardhat** and **Ethers** packages.

## Potential upgrade cases
Coinfort has a degree of upgradability and in a nutshell is an onchain database which could further improved with additional applications for the commercial financial use-cases.

Potential upgrades:
1) On-chain banking services.
2) On-chain investment services.
3) Staking, launching proprietary coin.
4) Integrating application to an off-chain financial service.
5) Addition of more external Oracle conditions.
6) Integrating an off-chain database.
