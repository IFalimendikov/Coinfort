const { ethers, network, run} = require("hardhat");

async function main() {

    // Addresses 
    const managerAddress = "0xf014Bd32689608dA08d96f9Ad812C0De7946a824";

    // // Deploy Coinfort and Oracle

    const COINFORT = await ethers.getContractFactory('Coinfort');
    const coinfort = await COINFORT.deploy(managerAddress);

    console.log( "Coinfort: " + coinfort.address );


    const ORACLE = await ethers.getContractFactory('Oracle');
    const oracle = await ORACLE.deploy(managerAddress, coinfort.address);

    console.log( "Oracle: " + oracle.address );
    const WAIT_BLOCK_CONFIRMATIONS = 3;
    await oracle.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);

    //Verify Coinfort and Oracle contracts

    await run(`verify:verify`, {
      address: coinfort.address,
      constructorArguments: [managerAddress],
    });

    await run(`verify:verify`, {
      address: oracle.address,
      constructorArguments: [managerAddress, coinfort.address],
    });


    // Set Oracle address 
    await coinfort.setOracleAddress(oracle.address);

}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
});