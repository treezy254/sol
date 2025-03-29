import {
  Client,
  AccountCreateTransaction,
  FileCreateTransaction,
  FileAppendTransaction,
  ContractCreateTransaction,
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  PrivateKey,
  Hbar,
} from "@hashgraph/sdk";
import * as fs from "fs/promises";
import crypto from "crypto";

// Utility function to ensure valid Ethereum-style address
function formatEthereumAddress(address) {
  // Remove '0x' if present, then ensure 40 characters
  const cleanAddress = address.replace(/^0x/, "");

  // Pad or truncate to ensure 40 characters
  const formattedAddress = cleanAddress.padStart(40, "0").slice(-40);

  return "0x" + formattedAddress;
}

class MockDatabase {
  constructor() {
    this.customers = new Map();
  }

  async setCustomer(uid, data) {
    this.customers.set(uid, data);
    return data;
  }

  async getCustomer(uid) {
    return this.customers.get(uid) || null;
  }
}

export class HederaClient {
  constructor(operatorId, operatorKey) {
    try {
      // Setup mock database
      this.db = new MockDatabase();

      // Setup Hedera client
      this.client = Client.forTestnet();
      this.client.setOperator(operatorId, PrivateKey.fromString(operatorKey));
      
      // Store the operator credentials for reference
      this.operatorId = operatorId;
      this.operatorKey = PrivateKey.fromString(operatorKey);
      
      // Initialize empty wallets for participants
      this.wallets = {
        customer: null,
        deliveryAgent: null,
        storeOwner: null
      };
    } catch (error) {
      console.error(`Initialization error: ${error}`);
      throw error;
    }
  }

  async createParticipantWallets() {
    try {
      // Create wallet for customer
      const customerPrivateKey = PrivateKey.generate();
      const customerPublicKey = customerPrivateKey.publicKey;
      const customerTx = await new AccountCreateTransaction()
        .setKey(customerPublicKey)
        .setInitialBalance(new Hbar(50))  // Higher initial balance
        .execute(this.client);
      const customerReceipt = await customerTx.getReceipt(this.client);
      const customerAccountId = customerReceipt.accountId;
      
      // Create wallet for delivery agent
      const agentPrivateKey = PrivateKey.generate();
      const agentPublicKey = agentPrivateKey.publicKey;
      const agentTx = await new AccountCreateTransaction()
        .setKey(agentPublicKey)
        .setInitialBalance(new Hbar(50))
        .execute(this.client);
      const agentReceipt = await agentTx.getReceipt(this.client);
      const agentAccountId = agentReceipt.accountId;
      
      // Create wallet for store owner
      const storeOwnerPrivateKey = PrivateKey.generate();
      const storeOwnerPublicKey = storeOwnerPrivateKey.publicKey;
      const storeOwnerTx = await new AccountCreateTransaction()
        .setKey(storeOwnerPublicKey)
        .setInitialBalance(new Hbar(50))
        .execute(this.client);
      const storeOwnerReceipt = await storeOwnerTx.getReceipt(this.client);
      const storeOwnerAccountId = storeOwnerReceipt.accountId;
      
      // Store wallet information
      this.wallets = {
        customer: {
          accountId: customerAccountId.toString(),
          privateKey: customerPrivateKey
        },
        deliveryAgent: {
          accountId: agentAccountId.toString(),
          privateKey: agentPrivateKey
        },
        storeOwner: {
          accountId: storeOwnerAccountId.toString(), 
          privateKey: storeOwnerPrivateKey
        }
      };
      
      return {
        customer: customerAccountId.toString(),
        deliveryAgent: agentAccountId.toString(),
        storeOwner: storeOwnerAccountId.toString()
      };
    } catch (error) {
      console.error(`Wallet creation error: ${error}`);
      throw error;
    }
  }

  // Helper method to temporarily switch the client operator
  async _executeAsUser(accountId, privateKey, operation) {
    // Store current operator
    const currentOperator = {
      accountId: this.operatorId,
      privateKey: this.operatorKey
    };
    
    try {
      // Switch to the specified user
      this.client.setOperator(accountId, privateKey);
      
      // Execute the operation
      const result = await operation();
      
      // Switch back to original operator
      this.client.setOperator(currentOperator.accountId, currentOperator.privateKey);
      
      return result;
    } catch (error) {
      // Make sure we switch back even if there's an error
      this.client.setOperator(currentOperator.accountId, currentOperator.privateKey);
      throw error;
    }
  }

  _getEthereumAddressFromAccount(accountId) {
    // Create consistent address format for all participants
    const accountStr = accountId.toString();
    // Simply pad the account number with zeros to create a deterministic address
    const paddedStr = accountStr.replace(/\./g, '').padStart(40, '0');
    const address = "0x" + paddedStr;
    
    console.log(`Converted Hedera account ${accountId} to fixed Ethereum address ${address}`);
    return address;
  }

  // Modified deployContract method to set our customer account as the deployer
  async deployContract(amount, deliveryFee, bytecodePath = 'contracts/LogisticsEscrow.bin') {
    try {
      if (!this.wallets.customer || !this.wallets.storeOwner) {
        throw new Error("Must create participant wallets before deploying contract");
      }
      
      // Read bytecode
      const bytecode = await fs.readFile(bytecodePath, 'utf8');
      
      // Get store owner Ethereum address format - use the consistent format
      const storeOwnerId = this._getEthereumAddressFromAccount(this.wallets.storeOwner.accountId);
      
      console.log(`Deploying contract with:\nStore Owner: ${storeOwnerId}\nAmount: ${amount}\nDelivery Fee: ${deliveryFee}`);

      // Create file to store bytecode
      const fileTx = new FileCreateTransaction()
        .setKeys([this.client.operatorPublicKey]);
      const fileResponse = await fileTx.execute(this.client);
      const fileReceipt = await fileResponse.getReceipt(this.client);
      const fileId = fileReceipt.fileId;
      console.log(`File created with ID: ${fileId}`);

      // Append bytecode to file
      const appendTx = new FileAppendTransaction()
        .setFileId(fileId)
        .setContents(bytecode);
      await appendTx.execute(this.client);
      console.log('Bytecode successfully appended to file');
      
      // Deploy contract as customer
      return this._executeAsUser(
        this.wallets.customer.accountId,
        this.wallets.customer.privateKey,
        async () => {
          // Log the customer's Ethereum address for verification
          const customerAddress = this._getEthereumAddressFromAccount(this.wallets.customer.accountId);
          console.log(`Customer deploying contract from address: ${customerAddress}`);
          
          const contractTx = new ContractCreateTransaction()
            .setBytecodeFileId(fileId)
            .setGas(2000000)
            .setConstructorParameters(
              new ContractFunctionParameters()
                .addAddress(storeOwnerId)
                .addUint256(amount)
                .addUint256(deliveryFee)
            );
          
          const contractResponse = await contractTx.execute(this.client);
          console.log('Contract deployment transaction executed');
          
          const contractReceipt = await contractResponse.getReceipt(this.client);
          console.log('Contract receipt obtained');
          
          return contractReceipt.contractId;
        }
      );
    } catch (error) {
      console.error(`Contract deployment error: ${error}`);
      throw error;
    }
  }

  async executeContract(
    contractId,
    functionName,
    params = null,
    gas = 75000,
    payableAmount = 0,
    executorWallet = null // Optional wallet to execute as
  ) {
    try {
      let transaction = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(gas);

      if (params) {
        const funcParams = new ContractFunctionParameters();
        params.forEach((param) => {
          if (typeof param === "string") {
            funcParams.addAddress(param);
          } else if (typeof param === "number") {
            funcParams.addUint256(param);
          }
        });

        transaction = transaction.setFunction(functionName, funcParams);
      } else {
        transaction = transaction.setFunction(functionName);
      }

      if (payableAmount > 0) {
        transaction = transaction.setPayableAmount(new Hbar(payableAmount));
      }

      // If a specific executor wallet is provided, execute as that user
      if (executorWallet) {
        return this._executeAsUser(
          executorWallet.accountId,
          executorWallet.privateKey,
          async () => {
            const response = await transaction.execute(this.client);
            return await response.getReceipt(this.client);
          }
        );
      } else {
        // Otherwise execute as the current operator
        const response = await transaction.execute(this.client);
        return await response.getReceipt(this.client);
      }
    } catch (error) {
      console.error(`Contract execution error: ${error}`);
      throw error;
    }
  }

  async getContractState(contractId) {
    try {
      // Check the current status
      const statusQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("currentStatus");
      const statusResult = await statusQuery.execute(this.client);
      
      // Check if delivery agent is assigned
      const agentQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("deliveryAgent");
      const agentResult = await agentQuery.execute(this.client);
      
      // Check product amount
      const amountQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("productAmount");
      const amountResult = await amountQuery.execute(this.client);
      
      // Parse the results (status is an enum, so it comes back as a number)
      const status = statusResult.getUint256(0).toNumber();
      const agent = agentResult.getAddress(0);
      const amount = amountResult.getUint256(0).toNumber();
      
      console.log(`Contract state:
        Status: ${status} (0=Initiated, 1=AgentAssigned, 2=PickedUp, 3=Delivered, 4=Failed)
        Delivery Agent: ${agent}
        Product Amount: ${amount}`);
      
      return {
        status,
        agent,
        amount
      };
    } catch (error) {
      console.error(`Error getting contract state: ${error}`);
      throw error;
    }
  }

  async fundContract(contractId, amount, deliveryFee) {
    if (!this.wallets.customer) {
      throw new Error("Customer wallet not initialized");
    }
    
    // Calculate the exact amount in tinybars for precise payment
    const totalAmount = amount + deliveryFee;
    console.log(`Funding contract with: ${totalAmount} HBAR`);
    console.log(`Customer address: ${this._getEthereumAddressFromAccount(this.wallets.customer.accountId)}`);
    
    // Execute as customer with proper HBAR conversion
    return this._executeAsUser(
      this.wallets.customer.accountId,
      this.wallets.customer.privateKey,
      async () => {
        const transaction = new ContractExecuteTransaction()
          .setContractId(contractId)
          .setGas(400000)
          .setFunction("fundContract")
          .setPayableAmount(new Hbar(totalAmount)); // Use Hbar constructor for proper conversion
        
        console.log(`Executing fundContract transaction...`);
        const response = await transaction.execute(this.client);
        console.log(`Getting transaction receipt...`);
        return await response.getReceipt(this.client);
      }
    );
  }

  async confirmPickup(contractId) {
    if (!this.wallets.storeOwner) {
      throw new Error("Store owner wallet not initialized");
    }
    
    // Execute as store owner
    return this.executeContract(
      contractId,
      "confirmPickup",
      null, 
      100000, // Increased gas limit
      0,
      this.wallets.storeOwner
    );
  }

  // Updated method for delivery agent acceptance
  async acceptDeliveryAsAgent(contractId) {
    if (!this.wallets.deliveryAgent) {
      throw new Error("Delivery agent wallet not initialized");
    }
    
    // Get the product amount to stake from the contract
    const state = await this.getContractState(contractId);
    const amountToStake = state.amount;
    
    console.log(`Delivery agent accepting delivery with stake: ${amountToStake} HBAR`);
    console.log(`Delivery agent address: ${this._getEthereumAddressFromAccount(this.wallets.deliveryAgent.accountId)}`);
    
    // Execute as delivery agent with proper HBAR conversion
    return this._executeAsUser(
      this.wallets.deliveryAgent.accountId,
      this.wallets.deliveryAgent.privateKey,
      async () => {
        const transaction = new ContractExecuteTransaction()
          .setContractId(contractId)
          .setGas(500000) // Increased gas limit
          .setFunction("acceptDelivery")
          .setPayableAmount(new Hbar(amountToStake)); // Use Hbar constructor for proper conversion
        
        console.log(`Executing acceptDelivery transaction...`);
        try {
          const response = await transaction.execute(this.client);
          console.log(`Getting transaction receipt...`);
          return await response.getReceipt(this.client);
        } catch (error) {
          console.error(`Transaction failed with details: ${JSON.stringify(error, null, 2)}`);
          throw error;
        }
      }
    );
  }

  // This method can be removed or kept as a legacy version
  async acceptDelivery(contractId, amount) {
    return this.acceptDeliveryAsAgent(contractId);
  }

  async confirmDelivery(contractId) {
    if (!this.wallets.deliveryAgent) {
      throw new Error("Delivery agent wallet not initialized");
    }
    
    // Execute as delivery agent
    return this.executeContract(
      contractId,
      "confirmDelivery",
      null,
      150000, // Increased gas limit
      0,
      this.wallets.deliveryAgent
    );
  }
}

export async function runComprehensiveTest() {
  console.log("Starting Comprehensive Hedera Client Test");

  // Your credentials here
  const OPERATOR_ID = "0.0.5787516";
  const OPERATOR_KEY = process.env.HEDERA_PRIVATE_KEY || 
    "302e020100300506032b657004220420aa89ff803a14a0ed8c791295b5819f6bf0bd679cc184155ba85d8475621754c1";

  try {
    // Initialize Hedera Client
    const hederaClient = new HederaClient(OPERATOR_ID, OPERATOR_KEY);
    console.log("✅ Hedera Client Initialized");

    // 1. Create participant wallets
    console.log("\n🧪 Creating participant wallets");
    const participantAccounts = await hederaClient.createParticipantWallets();
    console.log("Created wallets:", participantAccounts);

    // 2. Contract Deployment Test
    console.log("\n🧪 Testing Contract Deployment");
    const amount = 1; // Reduced amount for testing
    const deliveryFee = 1; // Reduced fee for testing
    const contractId = await hederaClient.deployContract(amount, deliveryFee);
    console.log("Deployed Contract ID:", contractId);
    if (!contractId) throw new Error("Contract deployment failed");

    // Check contract state after deployment
    console.log("\n📊 Contract State After Deployment:");
    await hederaClient.getContractState(contractId);

    // 3. Fund Contract Test - This step is critical
    console.log("\n🧪 Testing Contract Funding");
    try {
      // Fund the contract with explicit amounts
      const fundResult = await hederaClient.fundContract(contractId, amount, deliveryFee);
      console.log("✅ Contract Funded Successfully:", fundResult);
      
      // Verify the contract state after funding
      console.log("\n📊 Contract State After Funding:");
      const stateAfterFunding = await hederaClient.getContractState(contractId);
      
      // Ensure the contract is still in the Initiated state (0)
      if (stateAfterFunding.status !== 0) {
        throw new Error(`Contract not in expected Initiated state, current state: ${stateAfterFunding.status}`);
      }
      
      console.log("✅ Contract verified to be in Initiated state, proceeding with tests");
    } catch (error) {
      console.error("❌ Contract funding or verification failed:", error.message);
      console.log("Skipping remaining tests as funding stage failed");
      return;
    }

    // 4. Delivery Agent Acceptance Test
    console.log("\n🧪 Testing Delivery Agent Acceptance");
    try {
      const acceptanceResult = await hederaClient.acceptDeliveryAsAgent(contractId);
      console.log("✅ Delivery Agent Accepted:", acceptanceResult);
      
      // Check contract state after acceptance
      console.log("\n📊 Contract State After Agent Acceptance:");
      const stateAfterAcceptance = await hederaClient.getContractState(contractId);
      
      // Verify that the status changed to AgentAssigned (1)
      if (stateAfterAcceptance.status !== 1) {
        throw new Error(`Contract not in expected AgentAssigned state, current state: ${stateAfterAcceptance.status}`);
      }
      
      console.log("✅ Contract verified to be in AgentAssigned state");
    } catch (error) {
      console.error("❌ Delivery agent acceptance failed:", error.message);
      console.log("Skipping remaining tests as acceptance failed");
      return;
    }

    // 5. Pickup Confirmation Test
    console.log("\n🧪 Testing Pickup Confirmation");
    try {
      const pickupConfirmation = await hederaClient.confirmPickup(contractId);
      console.log("✅ Pickup Confirmed:", pickupConfirmation);
      
      // Check contract state after pickup
      console.log("\n📊 Contract State After Pickup Confirmation:");
      const stateAfterPickup = await hederaClient.getContractState(contractId);
      
      // Verify that the status changed to PickedUp (2)
      if (stateAfterPickup.status !== 2) {
        throw new Error(`Contract not in expected PickedUp state, current state: ${stateAfterPickup.status}`);
      }
      
      console.log("✅ Contract verified to be in PickedUp state");
    } catch (error) {
      console.error("❌ Pickup confirmation failed:", error.message);
      console.log("Skipping remaining tests as pickup confirmation failed");
      return;
    }

    // 6. Delivery Confirmation Test
    console.log("\n🧪 Testing Delivery Confirmation");
    try {
      const confirmDeliveryResult = await hederaClient.confirmDelivery(contractId);
      console.log("✅ Delivery Confirmed:", confirmDeliveryResult);
      
      // Check final contract state
      console.log("\n📊 Final Contract State:");
      const finalState = await hederaClient.getContractState(contractId);
      
      // Verify that the status changed to Delivered (3)
      if (finalState.status !== 3) {
        throw new Error(`Contract not in expected Delivered state, current state: ${finalState.status}`);
      }
      
      console.log("✅ Contract verified to be in Delivered state");
    } catch (error) {
      console.error("❌ Delivery confirmation failed:", error.message);
      return;
    }

    console.log("\n🎉 All Hedera Client Tests Passed Successfully! 🎉");
  } catch (error) {
    console.error("❌ Test Failed:", error);
  }
}

// Uncomment to run the test directly when this file is executed
runComprehensiveTest();