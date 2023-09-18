require("@nomiclabs/hardhat-waffle");
require("@nomicfoundation/hardhat-verify");
require("hardhat-abi-exporter");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("dotenv").config();

// var secrets = require("./secrets");

task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000,
          },
        },
      },
      {
        version: "0.8.13",
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000,
          },
        },
      },
    ],
  },

  etherscan: {
    apiKey: "HPKAPICD1T596TESJ48KX8HPRKUIDEU1AF",
  },

  networks: {

    mainnet: {
      url: "https://eth-mainnet.g.alchemy.com/v2/GVXuT70D8zhAUh1OpTUqox4IspgKG9hU",
      accounts:  ["0x9e650e31f11c9e9977c4cbe18e2ef8fe6429519b78454ca04c909b8a86210fc2"],
    },

    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/wjjmnkDh0iZjVS5fKa3gewlZ9sUjSJ7Y",
      accounts:  ["0x9e650e31f11c9e9977c4cbe18e2ef8fe6429519b78454ca04c909b8a86210fc2"],
    },

    hardhat: {}
  },

  abiExporter: {
    path: "./hardhat/artifacts/contracts",
    clear: true,
    flat: true,
    only: ["Coinfort.sol", "Oracle.sol", "MyERC20.sol"],
  },
  gasReporter: {
    currency: "CHF",
    gasPrice: 12,
    excludeContracts: ["token/"],
  },
};