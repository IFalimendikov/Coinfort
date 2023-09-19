/*

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
     ____--`~    '--~~__|.    |+++++__|----~    ~`---,              ___
-~--~                   ~---__|,--~'                  ~~----_____-~'   `~----~~
 ______     ______     __     __   __     ______   ______     ______     ______  
/\  ___\   /\  __ \   /\ \   /\ "-.\ \   /\  ___\ /\  __ \   /\  == \   /\__  _\ 
\ \ \____  \ \ \/\ \  \ \ \  \ \ \-.  \  \ \  __\ \ \ \/\ \  \ \  __<   \/_/\ \/ 
 \ \_____\  \ \_____\  \ \_\  \ \_\\"\_\  \ \_\    \ \_____\  \ \_\ \_\    \ \_\ 
  \/_____/   \/_____/   \/_/   \/_/ \/_/   \/_/     \/_____/   \/_/ /_/     \/_/   

*/

// Made with love by Ivan Falimendikov <3

// SPDX-License-Identifier: MIT


pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Coinfort is Ownable {

    //--------------------------------------------------------
    // Storage
    //--------------------------------------------------------

    uint256 public transactionsCount; // Counter for the ammount of transactions
    uint256 public accountsCount; // Counter for the ammount of open accounts
    uint256 public constant MIN_DELAY = 900; // Minimal timeout period in seconds

    address public oracleContract; // Oracle contract instance
    address public managerAddress; // Manager address

    mapping(address => Account) public accounts; // address of the depositor => Account struct
    mapping(uint256 => Transaction) private transactions; // Transaction IDs => Transaction structs 
    mapping(address => bool) public approvedCoins; // ERC20 Addresses => Bool (Maps all approved for deposit ERC20
    mapping(address => mapping(address => uint256)) public accountBalance; // address of depositor => (ERC20 address => balance in coins)
   
    IERC20 public token;

    //--------------------------------------------------------
    // Events
    //--------------------------------------------------------

    event NewTransactionInitialized(uint256 indexed TransactionId);

    event TransactionApproved(uint256 indexed TransactionId);

    event TransactionClosed(uint256 indexed TransactionId);

    event NewAccountOpened(address indexed accountId);

    //--------------------------------------------------------
    // Modifiers
    //--------------------------------------------------------
    // Adds manager address to manage the contract
    //--------------------------------------------------------

    modifier onlyOwnerOrManager() {
        require( msg.sender == owner() || msg.sender == managerAddress, "Caller is not the owner neither manager!" );
        _;
    }

    //--------------------------------------------------------
    // Constructor
    //--------------------------------------------------------

    constructor(address _manager) {
        managerAddress = _manager; // Appoint manager
    }

    //--------------------------------------------------------
    // Structs
    //--------------------------------------------------------
    // Create Account and Transcation structs.
    //--------------------------------------------------------

    struct Account {
        uint256 accountOpenTime;
        uint256 accountSerialNumber;
        bool accountPaused; // Admin can pause any operation on the account
    }
    
    struct Transaction {
        uint256 coinAmmount; // Amount of ERC20 coins to be sent 
        uint256 senderSerialNumber; // ID of the sender account
        uint256 transactionOpenTime;
        uint256 transactionCloseTime; // Timestamp of a transaction closure
        address coinAddress; // Address of the ERC20 coin to be sent 
        address receiverAddress; // Address of the receiver
        address senderAddress;
        bool transactionApproved; // Boolean checking for Oracle driven conditional statement
        bool transactionClosed; // Boolean checking whether the transaction was closed
        bool transactionPaused; // Admin can pause transaction fulfilment 
    }

    //--------------------------------------------------------
    //  [External] Function to open an account
    //--------------------------------------------------------
    //  To start a transaction and make a deposit, user needs to open an account.
    //--------------------------------------------------------

    function openAccount() external {
        require(accounts[msg.sender].accountOpenTime == 0, "You have already created an account!");
        require(msg.sender == tx.origin, "Limit bots!"); // No contract interaction allowed
        // Create new Account struct
        accounts[msg.sender] = Account({
            accountOpenTime: block.timestamp,
            accountSerialNumber: accountsCount, // ID of account
            accountPaused: false
        });

        emit NewAccountOpened(msg.sender);
        accountsCount++;
    }

    //--------------------------------------------------------
    //  [External] Main functions for Initializing and Closing transactions
    //--------------------------------------------------------
    //  By Initializing user opens a transaction with set data.
    //
    //  Transaction closure happens in two cases:
    //  1) After a timeout set by sender, if the Oracle driven condition wasn't met, funds are sent back to the sender.
    //  2) Before timeout, if the Oracle driven condition is met, funds are sent to the predefined receiver address.
    //--------------------------------------------------------

    function initializeTransaction(address receiver, address tokenAddress, uint256 amount, uint256 timeout) external {
        require(msg.sender == tx.origin, "Limit bots!"); // No contract interaction allowed
        require(amount > 0, "Amount must be greater than zero!");
        require(receiver != address(0), "Must be a real address!"); // Can't send to a non-zero address
        require(receiver != msg.sender, "Can't send to yourself!");
        require(timeout >= MIN_DELAY, "Minimal timeout is 15 minutes!");
        require(approvedCoins[tokenAddress] == true, "Token is not approved for transaction!"); // Only approved ERC20 coins could be deposited
        require(accounts[msg.sender].accountOpenTime != 0, "Account is not found!"); // Need to open an account to make a deposit
        require(!accounts[msg.sender].accountPaused, "Coinfort investigating the account!"); // Admin can pause all movements of account

        token = IERC20(tokenAddress); // Create ERC20 instance

        // IMPORTANT: approve ERC20 function should be called by the frontend before the transfer

        token.transferFrom(msg.sender, address(this), amount); // Deposit ERC20 coins to the Coinfort Vault

        accountBalance[msg.sender][tokenAddress] += amount; // Change the depositor balance after the coin transfer call 
        // Create new transaction struct
        transactions[transactionsCount] = Transaction({
            coinAmmount: amount,
            senderSerialNumber: accounts[msg.sender].accountSerialNumber, 
            transactionOpenTime: block.timestamp,
            transactionCloseTime: block.timestamp + timeout, // By default close time is set to timeout initially
            coinAddress: tokenAddress,
            receiverAddress: receiver,
            senderAddress: msg.sender,
            transactionApproved: false,
            transactionClosed: false,
            transactionPaused: false
        });

        emit NewTransactionInitialized(transactionsCount);
        transactionsCount++;
    }


    function closeTransaction(uint256 transactionId) external {

        Transaction storage transaction = transactions[transactionId];

        require(!accounts[transaction.senderAddress].accountPaused, "Coinfort investigating the account!"); // Admin can pause all movements on account
        require(!transaction.transactionPaused, "Coinfort investigating the transaction!"); // Admin can pause transaction 
        require(transaction.coinAmmount > 0, "Transaction with the given ID is not found!");
        require(!transaction.transactionClosed, "Transaction has been closed!");
        require(transaction.transactionApproved || transaction.transactionCloseTime <= block.timestamp, "To close a transaction there has to be either a timeout or Oracle condition!"); // Check for timeout and Oracle Condition
        
        token = IERC20(transaction.coinAddress); // Create ERC20 instance
        address receiver = transaction.senderAddress; // Depending on the condition, funds are sent back to depositor or to receiver

        if(transaction.transactionCloseTime >= block.timestamp) {
            require(transaction.transactionApproved, "Transaction is not approved!"); // If function called before timeout, check for Oracle Condition
            receiver = transaction.receiverAddress;
        }

        accountBalance[transaction.senderAddress][transaction.coinAddress] -= transaction.coinAmmount; // Change ERC20 balance
        transaction.transactionClosed = true;
        transaction.transactionCloseTime = block.timestamp;

        token.transfer(receiver, transaction.coinAmmount); // Transfer the token 
       
        emit TransactionClosed(transactionId);
    }

    //--------------------------------------------------------
    //  [onlyOwnerOrManager] Administarative functions
    //--------------------------------------------------------

    function pauseAccountSwitch(address accountAddress, bool _newState) external onlyOwnerOrManager {
        accounts[accountAddress].accountPaused = _newState; // Pause all account operations
    }

    function pauseTransactionSwitch(uint256 transactionId, bool _newState) external onlyOwnerOrManager {
        transactions[transactionId].transactionPaused = _newState; // Pause transaction
    }

    function approveCoin(address coinAddress) external onlyOwnerOrManager {
        approvedCoins[coinAddress] = true; // Adds ERC20 which is allowed to be used for transacting
    }

    function setOracleAddress(address _oracleContract) external onlyOwnerOrManager{
        oracleContract = _oracleContract;
    }

    function withdrawAlts(address receiver, address tokenAddress, uint256 amount) public payable onlyOwnerOrManager {
        token = IERC20(tokenAddress); // Create ERC20 instance
        token.transfer(receiver, amount);
    }

    function withdraw(address receiver) public payable onlyOwnerOrManager {
        (bool success, ) = payable(receiver).call{value: (address(this).balance)}("");
        require(success, "Transaction failed!");
    }

    //--------------------------------------------------------
    //  [onlyOwner] Manager setter
    //--------------------------------------------------------

    function setManager(address to) external onlyOwner {
       managerAddress = to;
    }

    //--------------------------------------------------------
    // [Internal] Internal functions
    //--------------------------------------------------------
    //  Oracle calls this function when the external condition is met, to approve the transaction.
    //--------------------------------------------------------

    function approveTransaction(uint256 transactionId) external {
        require(msg.sender == oracleContract, "Can only be called by the Oracle contract!"); // Checks for Oracle address
        require(transactions[transactionId].coinAmmount > 0, "Transaction is not found!");
        require(!transactions[transactionId].transactionApproved, "Transaction already approved!");

        transactions[transactionId].transactionApproved = true;

        emit TransactionApproved(transactionId);
    }

    //--------------------------------------------------------
    //  [View] Data getter functions
    //--------------------------------------------------------
    //  Helper functions for Frontend: Transaction struct, Account struct, Account balance.
    //--------------------------------------------------------

    function getTransactionData(uint256 transactionId) external view returns (Transaction memory) {
        require(transactions[transactionId].coinAmmount > 0, "Transaction is not found!");

        return transactions[transactionId];
    }

    function getAccountData(address accountAddress) external view returns (Account memory) {
        require(accounts[accountAddress].accountOpenTime > 0, "Account is not found!");

        return accounts[accountAddress];
    }

    function getAccountBalance(address accountAddress, address coinAddress) external view returns (uint256) {
        require(accounts[accountAddress].accountOpenTime > 0, "Account is not found!");

        return accountBalance[accountAddress][coinAddress];
    }

}
