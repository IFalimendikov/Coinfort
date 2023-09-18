const { expect } = require("chai");
const { expectRevert, expectException } = require("../utils/expectRevert");
const { BigNumber } = require("@ethersproject/bignumber");
const { ethers, upgrades } = require("hardhat");
const { Web3 }= require("web3");

const web3 = new Web3();


const BASE = BigNumber.from(10).pow(18);
const PERC1_FEE = BASE.div(100);
const zeroAddr = "0x0000000000000000000000000000000000000000";
const notZeroAddr = "0x000000000000000000000000000000000000dead";

let signers;
let owner, alice, bob, minter, burner; 

describe("Coinfort Test", function () {
  before("Setup", async () => {

    signers = await ethers.getSigners();
    owner = signers[0];
    manager = signers[1];
    sender = signers[2];
    receiver = signers[3];


    let Coinfort = await ethers.getContractFactory("Coinfort");
    coinfort = await Coinfort.deploy(manager.address);
    await coinfort.deployed();

    let Oracle = await ethers.getContractFactory("Oracle");
    oracle = await Oracle.deploy(manager.address, coinfort.address);
    await  oracle.deployed();

    let Coin = await ethers.getContractFactory("MyERC20");
    coin = await Coin.deploy(10000);
    await coin.deployed();
  });

  ////////////////////////////
  // Coinfort Testing       //
  ////////////////////////////

  it("Should correctly recognize the owner of the NFT", async () => {
    expect(await coinfort.owner()).to.equal(owner.address);
  });

  it("Should only allow owner to set manager", async () => {
    await expectException(coinfort.connect(sender).setManager(sender.address), "Ownable: caller is not the owner");
    const managerAddressBefore = await coinfort.connect(owner).managerAddress();
    await expect(managerAddressBefore).to.equal(manager.address);
    await coinfort.connect(owner).setManager(manager.address);
    const managerAddressAfter = await coinfort.connect(owner).managerAddress();
    await expect(managerAddressAfter).to.equal(manager.address);
  });

  it("Should correctly Open account", async () => {
    await coinfort.connect(sender).openAccount();
    await expectException(coinfort.connect(sender).openAccount(), "You have already created an account!");
    await expect(coinfort.connect(receiver).openAccount()).to.emit(coinfort, "NewAccountOpened").withArgs(receiver.address);
    await expectException(coinfort.connect(receiver).openAccount(), "You have already created an account!");
  });

  it("Should correctly initialize Transaction", async () => {
    await coin.connect(owner).transfer(sender.address, 1000);
    await expectException(coinfort.connect(sender).initializeTransaction(receiver.address, coin.address, 0, 1000), "Amount must be greater than zero!");
    await expectException(coinfort.connect(sender).initializeTransaction(sender.address, coin.address, 500, 1000), "Can't send to yourself!");
    await expectException(coinfort.connect(sender).initializeTransaction(receiver.address, coin.address, 500, 500), "Minimal timeout is 15 minutes!");
    await expectException(coinfort.connect(sender).initializeTransaction(receiver.address, manager.address, 500, 1000), "Token is not approved for transaction!");
    await expectException(coinfort.connect(sender).approveCoin(coin.address), 'Caller is not the owner neither manager!');
    await coinfort.connect(owner).approveCoin(coin.address);
    await expectException(coinfort.connect(manager).initializeTransaction(receiver.address, coin.address, 500, 1000), "Account is not found!");
    await expectException(coinfort.connect(sender).pauseAccountSwitch(sender.address, true), 'Caller is not the owner neither manager!');
    await coinfort.connect(owner).pauseAccountSwitch(sender.address, true);
    await expectException(coinfort.connect(sender).initializeTransaction(receiver.address, coin.address, 500, 1000), "Coinfort investigating the account!");

    await coin.connect(sender).approve(coinfort.address, 500);
    
    const balanceBefore = await coin.connect(sender).balanceOf(coinfort.address);
    await expect(balanceBefore).to.equal(0);
    await coinfort.connect(owner).pauseAccountSwitch(sender.address, false);
    await expect(coinfort.connect(sender).initializeTransaction(receiver.address, coin.address, 500, 1000)).to.emit(coinfort, "NewTransactionInitialized").withArgs(0);
    const balanceAfter = await coin.connect(sender).balanceOf(coinfort.address);
    await expect(balanceAfter).to.equal(500);
    await expectException(coinfort.connect(sender).initializeTransaction(receiver.address, coin.address, 500, 1000), "ERC20: insufficient allowance");
  });

  it("Should correctly close Transaction after a Timeout and return funds back to the depositor", async () => {
    await coinfort.connect(owner).pauseAccountSwitch(sender.address, true);
    await expectException(coinfort.connect(receiver).closeTransaction(0), "Coinfort investigating the account!");
    await coinfort.connect(owner).pauseAccountSwitch(sender.address, false);
    await coinfort.connect(owner).pauseTransactionSwitch(0, true);
    await expectException(coinfort.connect(receiver).closeTransaction(0), "Coinfort investigating the transaction!");
    await coinfort.connect(owner).pauseTransactionSwitch(0, false);
    await expectException(coinfort.connect(receiver).closeTransaction(1), "Transaction with the given ID is not found!");
    await expectException(coinfort.connect(receiver).closeTransaction(0), "To close a transaction there has to be either a timeout or Oracle condition!");

    await network.provider.send("evm_increaseTime", [1500]);
    await ethers.provider.send("evm_mine", []);

    const balanceBefore = await coin.connect(sender).balanceOf(sender.address);
    await expect(balanceBefore).to.equal(500);
    await expect(coinfort.connect(sender).closeTransaction(0)).to.emit(coinfort, "TransactionClosed").withArgs(0);
    const balanceAfter = await coin.connect(sender).balanceOf(sender.address);
    await expect(balanceAfter).to.equal(1000);

    await expectException(coinfort.connect(receiver).closeTransaction(0), "Transaction has been closed!");
  });

  it("Should correctly close Transaction when the Oracle Condition Met and send funds to the receiver", async () => {
    await coin.connect(sender).approve(coinfort.address, 500);
    await expect(coinfort.connect(sender).initializeTransaction(receiver.address, coin.address, 500, 1000)).to.emit(coinfort, "NewTransactionInitialized").withArgs(1);
    await coinfort.connect(owner).pauseAccountSwitch(sender.address, true);
    await expectException(coinfort.connect(receiver).closeTransaction(1), "Coinfort investigating the account!");
    await coinfort.connect(owner).pauseAccountSwitch(sender.address, false);
    await coinfort.connect(owner).pauseTransactionSwitch(1, true);
    await expectException(coinfort.connect(receiver).closeTransaction(1), "Coinfort investigating the transaction!");
    await coinfort.connect(owner).pauseTransactionSwitch(1, false);
    await expectException(coinfort.connect(receiver).closeTransaction(2), "Transaction with the given ID is not found!");
    await expectException(coinfort.connect(receiver).closeTransaction(1), "To close a transaction there has to be either a timeout or Oracle condition!");

    await coinfort.connect(owner).setOracleAddress(oracle.address);

    await oracle.connect(owner).conditionSatisfied(1);

    const balanceBefore = await coin.connect(receiver).balanceOf(receiver.address);
    await expect(balanceBefore).to.equal(0);
    await expect(coinfort.connect(receiver).closeTransaction(1)).to.emit(coinfort, "TransactionClosed").withArgs(1);
    const balanceAfter = await coin.connect(receiver).balanceOf(receiver.address);
    await expect(balanceAfter).to.equal(500);

    await expectException(coinfort.connect(receiver).closeTransaction(1), "Transaction has been closed!");

    await network.provider.send("evm_increaseTime", [1500]);
    await ethers.provider.send("evm_mine", []);

    await expectException(coinfort.connect(receiver).closeTransaction(1), "Transaction has been closed!");

  });
});