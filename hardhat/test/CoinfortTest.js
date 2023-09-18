const { expect } = require("chai");
const { expectRevert, expectException } = require("../utils/expectRevert");
const {helpers, time} = require("@nomicfoundation/hardhat-network-helpers");
const keccak256 = require("keccak256");
const { MerkleTree} = require('merkletreejs');
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


    let AccountManager = await ethers.getContractFactory("AccountManager");
    accountManager = await AccountManager.deploy(manager.address, uwucrew.address);
    await shikigami.deployed();

    let DelegationRegistry = await ethers.getContractFactory("DelegationRegistry");
    delegationRegistry = await DelegationRegistry.deploy();
    await delegationRegistry.deployed();

    let ShikigamiSale = await ethers.getContractFactory("IROIROShikigamiSale");
    sale = await ShikigamiSale.deploy(delegationRegistry.address, shikigami.address, manager.address, uwucrew.address, cyberZ.address, );
    await sale.deployed();

    let IROIRO = await ethers.getContractFactory("IROIRO");
    iroiro = await IROIRO.deploy();
    await iroiro.deployed();

    let Remix = await ethers.getContractFactory("IROIRORemix");
    remix = await Remix.deploy(delegationRegistry.address, shikigami.address, iroiro.address, uwucrew.address, manager.address);
    await remix.deployed();

  });

  ////////////////////////////
  // Shikigami Sale Testing //
  ////////////////////////////

  it("Should correctly recognize the owner of the NFT", async () => {
    expect(await sale.owner()).to.equal(owner.address);
  });

  it("Should only allow owner to set manager", async () => {
    await expectException(sale.connect(bob).setManager(bob.address), "Ownable: caller is not the owner");
    const managerAddressBefore = await sale.connect(owner).managerAddress();
    await expect(managerAddressBefore).to.equal(manager.address);
    await sale.connect(owner).setManager(manager.address);
    const managerAddressAfter = await sale.connect(owner).managerAddress();
    await expect(managerAddressAfter).to.equal(manager.address);
  });

  it("Should correctly initialize Shikigami Sale only by Owner/Manager", async () => {
    const shikigamiSaleParameters = [2,2,100,20,10,1687791649, 1687791949, 3, 1687792249, getRootHash(), "0x0000000000000000000000000000000000000000000000000000000000000000"];
    await expectException(sale.connect(bob).initializeShikigamiSale(0, shikigamiSaleParameters), "Caller is not the owner neither manager!");
    await expect(sale.connect(manager).initializeShikigamiSale(0, shikigamiSaleParameters)).to.emit(sale, 'NewShikigamiSaleInitialized').withArgs(0);
    await expectException(sale.connect(owner).initializeShikigamiSale(0, shikigamiSaleParameters), "Sale for this ID already initialized!");
    await expect(sale.connect(owner).initializeShikigamiSale(1, shikigamiSaleParameters)).to.emit(sale, 'NewShikigamiSaleInitialized').withArgs(1);
  });

  it("Should correctly modify Shikigami Sale only by Owner/Manager", async () => {
    const shikigamiSaleParameters = [5000,5000,200,30,20,1587791649, 1587791949, 4, 1587792249, "0x0000000000000000000000000000000000000000000000000000000000000001", "0x0000000000000000000000000000000000000000000000000000000000000002"];
    await expectException(sale.connect(bob).modifyShikigamiSale(0, shikigamiSaleParameters), "Caller is not the owner neither manager!");
    await expectException(sale.connect(owner).modifyShikigamiSale(2, shikigamiSaleParameters), "Sale for this ID is not initialized!");
    await expect(sale.connect(manager).modifyShikigamiSale(0, shikigamiSaleParameters)).to.emit(sale, 'ShikigamiSaleModified').withArgs(0);
    await expect(sale.connect(owner).modifyShikigamiSale(1, shikigamiSaleParameters)).to.emit(sale, 'ShikigamiSaleModified').withArgs(1);
    const [wlSalePrice,
      publicSalePrice, 
      maxSupply,
      wlSupply,
      teamSupply,
      wlSaleStart,
      publicSaleStart,
      maxPerWalletPublic,
      publicSaleClose,
      wlSaleRoot,
      publicSaleRoot] = await sale.connect(manager).getSaleDetails(0);
    await expect (maxSupply).to.equal(100); // Makes sure that maxSupply can't be modified
    await expect (wlSalePrice).to.equal(5000); 
    await expect (publicSalePrice).to.equal(5000); 
    await expect (wlSupply).to.equal(30); 
    await expect (teamSupply).to.equal(20); 
    await expect (wlSaleStart).to.equal(1587791649); 
    await expect (publicSaleStart).to.equal(1587791949); 
    await expect (maxPerWalletPublic).to.equal(4); 
    await expect (publicSaleClose).to.equal(1587792249); 
    await expect (wlSaleRoot).to.equal("0x0000000000000000000000000000000000000000000000000000000000000001"); 
    await expect (publicSaleRoot).to.equal("0x0000000000000000000000000000000000000000000000000000000000000002"); 
  });

  it("Should correctly mint Shikigami WL", async () => {
    const block = await ethers.provider.getBlock("latest");
    const block5Min = block.timestamp + 300;
    const block10Min = block.timestamp + 600;
    const block15Min = block.timestamp + 900;
    const shikigamiSaleParameters = [2500000000000000,2500000000000000,100,20,10, block5Min, block10Min, 3, block15Min, getRootHash(), "0x0000000000000000000000000000000000000000000000000000000000000000"];
    await sale.connect(owner).modifyShikigamiSale(0, shikigamiSaleParameters);
    await shikigami.setMinterContract(sale.address);
    await network.provider.send("evm_increaseTime", [330]);
    await ethers.provider.send("evm_mine", []);
    await expectException(sale.connect(owner).buyShikigami(5, 3, getProof(owner.address, 3), 3, zeroAddr), "Sale for this ID is not initialized!");
    await shikigami.connect(manager).initializeShikigami(2, "QmTDPBhmzNEGXygPBDVhvBiyM6XtcfGxnWNZcjNgvQfNHr");
    await expectException(sale.connect(bob).buyShikigami(0, 3, getProof(bob.address, 3), 3, zeroAddr, { value: ethers.utils.parseEther("0.075") }), "Merkle verification failed!");
    await expectException(sale.connect(owner).buyShikigami(0, 4, getProof(owner.address, 4), 3, zeroAddr,  { value: ethers.utils.parseEther("0.1") }), "Can't mint more than tree allows!");
    await expectException(sale.connect(owner).buyShikigami(0, 4, getProof(owner.address, 4), 4, zeroAddr, { value: ethers.utils.parseEther("0.1") }),  "Merkle verification failed!");
    const amountBeforeMint = await shikigami.connect(owner).balanceOf(owner.address, 0);
    await expect(amountBeforeMint).to.equal(0);
    await sale.connect(owner).buyShikigami(0, 2, getProof(owner.address, 3), 3, zeroAddr, { value: ethers.utils.parseEther("0.05")});
    const amountAfterFirstMint = await shikigami.connect(owner).balanceOf(owner.address, 0);
    await expect(amountAfterFirstMint).to.equal(2);
    await sale.connect(owner).buyShikigami(0, 1, getProof(owner.address, 3), 3, zeroAddr, { value: ethers.utils.parseEther("0.025")});
    const amountAfterSecondMint = await shikigami.connect(owner).balanceOf(owner.address, 0);
    await expect(amountAfterSecondMint).to.equal(3);
    await expectException(sale.connect(owner).buyShikigami(0, 3, getProof(owner.address, 3), 3, zeroAddr, { value: ethers.utils.parseEther("0.075")}), "Can't mint more than tree allows!");
  });

  it("Should properly mint Shikigami Open Public", async () => {
    const block = await ethers.provider.getBlock("latest");
    const block5Min = block.timestamp + 300;
    const block10Min = block.timestamp + 600;
    const block15Min = block.timestamp + 900;
    const shikigamiSaleParameters = [2500000000000000,2500000000000000,100,20,10, block5Min, block10Min, 3, block15Min, getRootHash(), "0x0000000000000000000000000000000000000000000000000000000000000000"];
    await sale.connect(owner).modifyShikigamiSale(1, shikigamiSaleParameters);
    await expectException(sale.connect(owner).buyShikigami(5, 3, getProof(owner.address, 3), 3,zeroAddr ), "Sale for this ID is not initialized!");
    await shikigami.connect(manager).initializeShikigami(3, "QmTDPBhmzNEGXygPBDVhvBiyM6XtcfGxnWNZcjNgvQfNHr");
    await network.provider.send("evm_increaseTime", [630]);
    await ethers.provider.send("evm_mine", []);
    await expectException(sale.connect(owner).buyShikigami(1, 4, getProof(owner.address, 3), 3, zeroAddr, { value: ethers.utils.parseEther("0.1") }), "Mint amount is too high!");
    const amountBefore = await shikigami.connect(owner).balanceOf(owner.address, 1);
    await expect(amountBefore).to.equal(0);
    await sale.connect(manager).buyShikigami(1, 3, getProof(manager.address, 3), 3, zeroAddr, { value: ethers.utils.parseEther("0.075")});
    const amountAfter = await shikigami.connect(manager).balanceOf(manager.address, 1);
    await expect(amountAfter).to.equal(3);
    await expectException(sale.connect(manager).buyShikigami(1, 3, getProof(manager.address, 3), 3, zeroAddr, { value: ethers.utils.parseEther("0.075")}), "Mint amount exceeds mints per wallet!");
  });

  it("Should correctly mint Shikigami Wl Public", async () => {
    const block = await ethers.provider.getBlock("latest");
    const block5Min = block.timestamp + 300;
    const block10Min = block.timestamp + 600;
    const block15Min = block.timestamp + 900;
    const shikigamiSaleParameters = [2500000000000000,2500000000000000,100,20,10, block5Min, block10Min, 3, block15Min, getRootHash(), getRootHash()];
    await sale.connect(manager).initializeShikigamiSale(2, shikigamiSaleParameters);
    await expectException(sale.connect(owner).buyShikigami(5, 3, getProof(owner.address, 3), 3, zeroAddr), "Sale for this ID is not initialized!");
    await shikigami.connect(manager).initializeShikigami(2, "QmTDPBhmzNEGXygPBDVhvBiyM6XtcfGxnWNZcjNgvQfNHr");
    await network.provider.send("evm_increaseTime", [500]);
    await ethers.provider.send("evm_mine", []);
    await expectException(sale.connect(bob).buyShikigami(2, 3, getProof(bob.address, 3), 3, zeroAddr, { value: ethers.utils.parseEther("0.075") }), "Merkle verification failed!");
    await expectException(sale.connect(manager).buyShikigami(2, 4, getProof(manager.address, 4), 3, zeroAddr, { value: ethers.utils.parseEther("0.1") }), "Can't mint more than tree allows!");
    await expectException(sale.connect(manager).buyShikigami(2, 4, getProof(manager.address, 4), 4, zeroAddr, { value: ethers.utils.parseEther("0.1") }),  "Merkle verification failed!");
    const amountBeforeMint = await shikigami.connect(manager).balanceOf(manager.address, 2);
    await expect(amountBeforeMint).to.equal(0);
    await sale.connect(manager).buyShikigami(2, 2, getProof(manager.address, 3), 3, zeroAddr, { value: ethers.utils.parseEther("0.05")});
    const amountAfterFirstMint = await shikigami.connect(manager).balanceOf(manager.address, 2);
    await expect(amountAfterFirstMint).to.equal(2);
    await sale.connect(manager).buyShikigami(2, 1, getProof(manager.address, 3), 3, zeroAddr, { value: ethers.utils.parseEther("0.025")});
    const amountAfterSecondMint = await shikigami.connect(manager).balanceOf(manager.address, 2);
    await expect(amountAfterSecondMint).to.equal(3);
    await expectException(sale.connect(manager).buyShikigami(2, 3, getProof(manager.address, 3), 3, zeroAddr, { value: ethers.utils.parseEther("0.075")}), "Can't mint more than tree allows!");
  });

  it("Should correctly team mint Shikigami PRIOR to the sale", async () => {
    const block = await ethers.provider.getBlock("latest");
    const block5Min = block.timestamp + 300;
    const block10Min = block.timestamp + 600;
    const block15Min = block.timestamp + 900;
    const shikigamiSaleParameters = [2500000000000000,2500000000000000,100,20,10, block5Min, block10Min, 3, block15Min, getRootHash(), getRootHash()];
    await sale.connect(manager).initializeShikigamiSale(3, shikigamiSaleParameters);
    await expectException(sale.connect(owner).teamMint(owner.address, 3, 3), "Shikigami with this ID doesn't exist!");
    await shikigami.connect(manager).initializeShikigami(3, "QmTDPBhmzNEGXygPBDVhvBiyM6XtcfGxnWNZcjNgvQfNHr");
    await expectException(sale.connect(bob).teamMint(bob.address, 3, 2), "Caller is not the owner neither manager!");
    const amountBefore = await shikigami.connect(owner).balanceOf(owner.address, 3);
    await expect(amountBefore).to.equal(0);
    await sale.connect(owner).teamMint(owner.address, 3, 10);
    const amountAfter = await shikigami.connect(owner).balanceOf(owner.address, 3);
    await expect(amountAfter).to.equal(10);
    await expectException(sale.connect(owner).teamMint(owner.address, 3, 10), 'Amount larger than team mint limit!');
  });

  it("Should correctly team mint left Shikigami supply AFTER the sale", async () => {
    const block = await ethers.provider.getBlock("latest");
    const block5Min = block.timestamp + 300;
    const block10Min = block.timestamp + 600;
    const block15Min = block.timestamp + 900;
    const shikigamiSaleParameters = [2500000000000000,2500000000000000,100,20,10, block5Min, block10Min, 3, block15Min, getRootHash(), getRootHash()];
    await sale.connect(manager).initializeShikigamiSale(4, shikigamiSaleParameters);
    await expectException(sale.connect(owner).teamMint(owner.address, 4, 3), "Shikigami with this ID doesn't exist!");
    await shikigami.connect(manager).initializeShikigami(4, "QmTDPBhmzNEGXygPBDVhvBiyM6XtcfGxnWNZcjNgvQfNHr");
    await network.provider.send("evm_increaseTime", [930]);
    await ethers.provider.send("evm_mine", []);
    await expectException(sale.connect(bob).teamMint(bob.address, 4, 2), "Caller is not the owner neither manager!");
    const amountBefore = await shikigami.connect(owner).balanceOf(owner.address, 4);
    await expect(amountBefore).to.equal(0);
    await sale.connect(owner).teamMint(owner.address, 4, 100);
    const amountAfter = await shikigami.connect(owner).balanceOf(owner.address, 4);
    await expect(amountAfter).to.equal(100);
    await expectException(sale.connect(owner).teamMint(owner.address, 4, 10), "Mint cap for team is reached!");
  });

  it("Should let only Owner or Manager to withdraw eth", async () => {
    const oldShikigamiSaleBal = await ethers.provider.getBalance(sale.address);
    expect(oldShikigamiSaleBal).to.not.equal(0);
    await sale.connect(owner).withdraw();
    const newShikigamiSaleBal = await ethers.provider.getBalance(sale.address);
    expect(newShikigamiSaleBal).to.equal(0);
    const newUwuBal = await ethers.provider.getBalance(uwucrew.address);
    const newCyberZBal = await ethers.provider.getBalance(cyberZ.address);
    expect(newUwuBal).to.not.equal("10000000000000000000000");
    expect(newCyberZBal).to.not.equal("10000000000000000000000");
  })

  it("Should correctly return sale details", async () => {
    const block = await ethers.provider.getBlock("latest");
    const block5Min = block.timestamp + 300;
    const block10Min = block.timestamp + 600;
    const block15Min = block.timestamp + 900;
    const shikigamiSaleParameters = [2500000000000000,2500000000000000,100,20,10, block5Min, block10Min, 3, block15Min, getRootHash(), getRootHash()];
    await shikigami.connect(manager).initializeShikigami(5, "QmTDPBhmzNEGXygPBDVhvBiyM6XtcfGxnWNZcjNgvQfNHr");
    await sale.connect(manager).initializeShikigamiSale(5, shikigamiSaleParameters);
    const [wlSalePrice,
      publicSalePrice,
      maxSupply,
      wlSupply,
      teamSupply,
      wlSaleStart,
      publicSaleStart,
      maxPerWalletPublic,
      publicSaleClose,
      wlSaleRoot,
      publicSaleRoot] = await sale.connect(manager).getSaleDetails(5);
    await expect (wlSalePrice,
      publicSalePrice,
      maxSupply,
      wlSupply,
      teamSupply,
      wlSaleStart,
      publicSaleStart,
      maxPerWalletPublic,
      publicSaleClose,
      wlSaleRoot,
      publicSaleRoot).to.equal(2500000000000000,2500000000000000,100,20,10, block5Min, block10Min, 3, block15Min, getRootHash(), getRootHash());
  });

  it("Should correctly return unminted Supply for Shikigami ID", async () => {
    const block = await ethers.provider.getBlock("latest");
    const block5Min = block.timestamp + 300;
    const block10Min = block.timestamp + 600;
    const block15Min = block.timestamp + 900;
    const shikigamiSaleParameters = [2500000000000000,2500000000000000,100,20,10, block5Min, block10Min, 3, block15Min, getRootHash(), getRootHash()];
    await expectException(sale.connect(owner).buyShikigami(6, 3, getProof(owner.address, 3), 3, zeroAddr), "Sale for this ID is not initialized!");
    await shikigami.connect(manager).initializeShikigami(6, "QmTDPBhmzNEGXygPBDVhvBiyM6XtcfGxnWNZcjNgvQfNHr");
    await sale.connect(manager).initializeShikigamiSale(6, shikigamiSaleParameters);
    const unmintedSupplyStart = await sale.getUnmintedSupply(6);
    expect (unmintedSupplyStart).to.equal(100);
    await sale.connect(owner).teamMint(owner.address, 6, 10);
    const mintedAmountByTeamBeforeBurn = await shikigami.connect(owner).balanceOf(owner.address, 6);
    await expect(mintedAmountByTeamBeforeBurn).to.equal(10);
    await iroiro.connect(owner).setMinter(minter.address);
    await iroiro.connect(minter).mintByMinter(owner.address, 1);
    await shikigami.setBurnerContract(remix.address);
    await remix.connect(owner).remixIROIROWithShikigami(6,1,1, zeroAddr);
    const mintedAmountByTeamAfterBurn = await shikigami.connect(owner).balanceOf(owner.address, 6);
    await expect(mintedAmountByTeamAfterBurn).to.equal(9);
    const totalSupplyAfterBurn = await shikigami.connect(owner).totalSupply(6);
    await expect(totalSupplyAfterBurn).to.equal(9);
    const unmintedSupply = await sale.connect(owner).getUnmintedSupply(6);
    await expect(unmintedSupply).to.equal(90);
  });

  it("Should correctly return sale phase", async () => {
    const block = await ethers.provider.getBlock("latest");
    const block5Min = block.timestamp + 300;
    const block10Min = block.timestamp + 600;
    const block15Min = block.timestamp + 900;
    const shikigamiSaleParameters = [2500000000000000,2500000000000000,100,20,10, block5Min, block10Min, 3, block15Min, getRootHash(), getRootHash()];
    await sale.connect(manager).initializeShikigamiSale(7, shikigamiSaleParameters);
    const teamSale = await sale.getSalePhase(7);
    expect (teamSale).to.equal("Sale closed");
    await network.provider.send("evm_increaseTime", [330]);
    await ethers.provider.send("evm_mine", []);
    const wlSale = await sale.getSalePhase(7);
    expect (wlSale).to.equal("WL sale");
    await network.provider.send("evm_increaseTime", [330]);
    await ethers.provider.send("evm_mine", []);
    const publicSale = await sale.getSalePhase(7);
    expect (publicSale).to.equal("Public sale");
    await network.provider.send("evm_increaseTime", [930]);
    await ethers.provider.send("evm_mine", []);
    const afterSale = await sale.getSalePhase(7);
    expect (afterSale).to.equal("Sale closed");
  });
})