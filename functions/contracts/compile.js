
// This script assumes you have solc installed
// You can install it with: npm install solc

const solc = require("solc");
const {compile} = solc;
const fs = require("fs");
// import fs from 'fs';

function compileSolidityContract() {
  const contractPath = "contracts/LogisticsEscrow.sol";
  const contractName = "LogisticsEscrow";

  // Read the contract source
  const contractSource = fs.readFileSync(contractPath, "utf8");

  // Prepare input for solc compiler
  const input = {
    language: "Solidity",
    sources: {
      "LogisticsEscrow.sol": {
        content: contractSource,
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
    },
  };

  // Compile the contract
  const output = JSON.parse(compile(JSON.stringify(input)));

  // Check for errors
  if (output.errors) {
    output.errors.forEach((error) => {
      console.error(error.formattedMessage);
    });
  }

  // Extract bytecode and ABI
  const bytecode = output.contracts["LogisticsEscrow.sol"][contractName].evm.bytecode.object;
  const abi = output.contracts["LogisticsEscrow.sol"][contractName].abi;

  // Write bytecode to file
  fs.writeFileSync("contracts/LogisticsEscrow.bin", bytecode);
  console.log("Bytecode written to src/LogisticsEscrow.bin");

  // Write ABI to file
  fs.writeFileSync("contracts/LogisticsEscrow.abi", JSON.stringify(abi, null, 2));
  console.log("ABI written to src/LogisticsEscrow.abi");
}

compileSolidityContract();
