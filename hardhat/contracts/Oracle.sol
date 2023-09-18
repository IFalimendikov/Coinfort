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


pragma solidity ^0.8.0;

import "./Coinfort.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Oracle is Ownable {

    address public managerAddress; // Contract manager

    Coinfort public immutable coinfort; // Coinfort main contract instance

    //--------------------------------------------------------
    // Modifiers
    //--------------------------------------------------------
    // Adds manager address to manage the contract.
    //--------------------------------------------------------

    modifier onlyOwnerOrManager() {
        require(msg.sender == owner() || msg.sender == managerAddress, "Caller is not the owner neither manager!" );
        _;
    }

    //--------------------------------------------------------
    // Constructor
    //--------------------------------------------------------

    constructor(address _coinfortAddress, address _managerAddress) {
        managerAddress = _managerAddress; // Appoint manager
        coinfort = Coinfort(_coinfortAddress); // Create Coinfort contract instance
    }

    //--------------------------------------------------------
    //  [onlyOwner] Setters administration functions
    //--------------------------------------------------------

    function setManager(address to) external onlyOwner {
       managerAddress = to;
    }

    //--------------------------------------------------------
    //  [External][onlyOwnerOrManager] Conditional function
    //--------------------------------------------------------
    //  This function mimics the Oracle driven external condition, depending on which a transcation would be approved.
    //--------------------------------------------------------

    function conditionSatisfied(uint256 transactionId) external onlyOwnerOrManager {
        coinfort.approveTransaction(transactionId);
    }

}