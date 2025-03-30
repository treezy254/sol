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

// Utility function to ensure valid Ethereum-style address
function formatEthereumAddress(address) {
  // Remove '0x' if present, then ensure 40 characters
  const cleanAddress = address.replace(/^0x/, "");

  // Pad or truncate to ensure 40 characters
  const formattedAddress = cleanAddress.padStart(40, "0").slice(-40);

  return "0x" + formattedAddress;
}

export class HederaClient {
  constructor(operatorId, operatorKey) {
    try {
      // Setup Hedera client
      this.client = Client.forTestnet();
      this.client.setOperator(operatorId, PrivateKey.fromString(operatorKey));
      
      // Store the operator credentials for reference
      this.operatorId = operatorId;
      this.operatorKey = PrivateKey.fromString(operatorKey);
      
      // Store user wallets by userId
      this.userWallets = new Map();
    } catch (error) {
      console.error(`Initialization error: ${error}`);
      throw error;
    }
  }

  async createUserWallet(userId) {
    try {
      // Check if user already has a wallet
      if (this.userWallets.has(userId)) {
        return {
          userId,
          accountId: this.userWallets.get(userId).accountId
        };
      }

      // Create new wallet for user
      const userPrivateKey = PrivateKey.generate();
      const userPublicKey = userPrivateKey.publicKey;
      const userTx = await new AccountCreateTransaction()
        .setKey(userPublicKey)
        .setInitialBalance(new Hbar(10))  // Initial balance
        .execute(this.client);
      const userReceipt = await userTx.getReceipt(this.client);
      const userAccountId = userReceipt.accountId;
      
      // Store wallet information
      const walletInfo = {
        accountId: userAccountId.toString(),
        privateKey: userPrivateKey
      };
      
      this.userWallets.set(userId, walletInfo);
      
      return {
        userId,
        accountId: userAccountId.toString()
      };
    } catch (error) {
      console.error(`Wallet creation error for user ${userId}: ${error}`);
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

  async deployContract(orderOwnerId, storeOwnerId, amount, deliveryFee, bytecodePath = 'contracts/LogisticsEscrow.bin') {
    try {
      if (!this.userWallets.has(orderOwnerId) || !this.userWallets.has(storeOwnerId)) {
        throw new Error("Both order owner and store owner must have wallets before deploying contract");
      }
      
      const orderOwnerWallet = this.userWallets.get(orderOwnerId);
      const storeOwnerWallet = this.userWallets.get(storeOwnerId);
      
      // Read bytecode
      const bytecode = await fs.readFile(bytecodePath, 'utf8');
      
      // Get store owner Ethereum address format
      const storeOwnerAddress = this._getEthereumAddressFromAccount(storeOwnerWallet.accountId);
      
      console.log(`Deploying contract for order:
        Order Owner: ${orderOwnerId}
        Store Owner: ${storeOwnerAddress}
        Amount: ${amount}
        Delivery Fee: ${deliveryFee}`);

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
      
      // Deploy contract as order owner
      return this._executeAsUser(
        orderOwnerWallet.accountId,
        orderOwnerWallet.privateKey,
        async () => {
          // Log the order owner's Ethereum address for verification
          const ownerAddress = this._getEthereumAddressFromAccount(orderOwnerWallet.accountId);
          console.log(`Order owner deploying contract from address: ${ownerAddress}`);
          
          const contractTx = new ContractCreateTransaction()
            .setBytecodeFileId(fileId)
            .setGas(2000000)
            .setConstructorParameters(
              new ContractFunctionParameters()
                .addAddress(storeOwnerAddress)
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

  async fundContract(orderOwnerId, contractId, amount, deliveryFee) {
    if (!this.userWallets.has(orderOwnerId)) {
      throw new Error("Order owner wallet not initialized");
    }
    
    const orderOwnerWallet = this.userWallets.get(orderOwnerId);
    
    // Calculate the exact amount in tinybars for precise payment
    const totalAmount = amount + deliveryFee;
    console.log(`Funding contract ${contractId} with: ${totalAmount} HBAR`);
    console.log(`Order owner address: ${this._getEthereumAddressFromAccount(orderOwnerWallet.accountId)}`);
    
    // Execute as order owner with proper HBAR conversion
    return this._executeAsUser(
      orderOwnerWallet.accountId,
      orderOwnerWallet.privateKey,
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

  async acceptDeliveryAsAgent(agentId, contractId) {
    if (!this.userWallets.has(agentId)) {
      throw new Error("Delivery agent wallet not initialized");
    }
    
    const agentWallet = this.userWallets.get(agentId);
    
    // Get the product amount as stored in the contract
    const amountQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("productAmount");
    const amountResult = await amountQuery.execute(this.client);
    const amountToStake = amountResult.getUint256(0).toNumber();
    
    console.log(`Agent ${agentId} accepting delivery with stake: ${amountToStake} HBAR`);
    
    // Explicitly log the Hbar amount being sent
    const paymentAmount = new Hbar(amountToStake);
    console.log(`Payment amount in Hbar: ${paymentAmount.toString()}`);
    console.log(`Payment in tinybars: ${paymentAmount.toTinybars().toString()}`);
    
    return this._executeAsUser(
      agentWallet.accountId,
      agentWallet.privateKey,
      async () => {
        const transaction = new ContractExecuteTransaction()
          .setContractId(contractId)
          .setGas(500000)
          .setFunction("acceptDelivery")
          .setPayableAmount(Hbar.fromTinybars(amountToStake)); // Convert from tinybars

        console.log(`Executing acceptDelivery transaction...`);
        const response = await transaction.execute(this.client);
        console.log(`Getting transaction receipt...`);
        return await response.getReceipt(this.client);
      }
    );
  }

  async confirmPickup(storeOwnerId, contractId) {
    if (!this.userWallets.has(storeOwnerId)) {
        throw new Error("Store owner wallet not initialized");
    }

    const storeOwnerWallet = this.userWallets.get(storeOwnerId);

    return this._executeAsUser(
      storeOwnerWallet.accountId,
      storeOwnerWallet.privateKey,
      async () => {
        const transaction = new ContractExecuteTransaction()
          .setContractId(contractId)
          .setGas(100000)
          .setFunction("confirmPickup");
        
        console.log(`Executing confirmPickup transaction...`);
        const response = await transaction.execute(this.client);
        console.log(`Getting transaction receipt...`);
        return await response.getReceipt(this.client);
      }
    );
  }

  async confirmDelivery(agentId, contractId) {
    if (!this.userWallets.has(agentId)) {
      throw new Error("Delivery agent wallet not initialized");
    }

    const agentWallet = this.userWallets.get(agentId);

    // Check contract state and balance before delivery
    const stateBefore = await this.getContractState(contractId);
    console.log("Contract State Before Delivery:", stateBefore);
    
    // Add a direct call to get contract balance
    const balanceQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getContractBalance");
    const balanceResult = await balanceQuery.execute(this.client);
    const contractBalance = balanceResult.getUint256(0).toNumber();
    
    console.log(`Contract Balance: ${contractBalance} HBAR`);
    console.log(`Required balance for successful delivery:`);
    console.log(`- Product Amount: ${stateBefore.amount} HBAR (to store owner)`);
    console.log(`- Delivery Fee: ${stateBefore.deliveryFee || 'unknown'} HBAR (to delivery agent)`);
    console.log(`- Agent Stake: ${stateBefore.agentStake || 'unknown'} HBAR (back to delivery agent)`);
    
    // Execute as delivery agent
    return this._executeAsUser(
      agentWallet.accountId,
      agentWallet.privateKey,
      async () => {
        const transaction = new ContractExecuteTransaction()
          .setContractId(contractId)
          .setGas(1000000)
          .setFunction("confirmDelivery");
        
        console.log(`Executing confirmDelivery transaction...`);
        const response = await transaction.execute(this.client);
        console.log(`Getting transaction receipt...`);
        return await response.getReceipt(this.client);
      }
    );
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
      
      // Get delivery fee
      const feeQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("deliveryFee");
      const feeResult = await feeQuery.execute(this.client);
      
      // Get agent stake
      const stakeQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("agentStake");
      const stakeResult = await stakeQuery.execute(this.client);
      
      // Get contract balance
      const balanceQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("getContractBalance");
      const balanceResult = await balanceQuery.execute(this.client);
      
      // Parse the results
      const status = statusResult.getUint256(0).toNumber();
      const agent = agentResult.getAddress(0);
      const amount = amountResult.getUint256(0).toNumber();
      const deliveryFee = feeResult.getUint256(0).toNumber();
      const agentStake = stakeResult.getUint256(0).toNumber();
      const balance = balanceResult.getUint256(0).toNumber();
      
      console.log(`Contract state:
        Status: ${status} (0=Initiated, 1=AgentAssigned, 2=PickedUp, 3=Delivered, 4=Failed)
        Delivery Agent: ${agent}
        Product Amount: ${amount}
        Delivery Fee: ${deliveryFee}
        Agent Stake: ${agentStake}
        Contract Balance: ${balance}`);
      
      return {
        status,
        agent,
        amount,
        deliveryFee,
        agentStake,
        balance
      };
    } catch (error) {
      console.error(`Error getting contract state: ${error}`);
      throw error;
    }
  }
}