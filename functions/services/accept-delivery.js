const FirestoreRepository = require("../utils/firestore");

class AcceptDelivery {
  constructor(hederaClient, firestoreRepo = FirestoreRepository) {
    /**
     * Initialize AcceptDelivery service with Hedera and Firestore clients.
     *
     * @param {HederaClient} hederaClient - Hedera blockchain client for contract interactions
     * @param {FirestoreRepository} firestoreRepo - Firestore repository for data management
     */
    this.hederaClient = hederaClient;
    this.firestoreRepo = firestoreRepo;
  }

  async execute(orderId, deliveryAgentId) {
    /**
     * Execute delivery acceptance process:
     * 1. Retrieve order details
     * 2. Validate order and delivery agent
     * 3. Call acceptDeliveryAsAgent on Hedera contract
     * 4. Update order status
     *
     * @param {string} orderId - Unique identifier for the order
     * @param {string} deliveryAgentId - ID of the delivery agent
     * @returns {Promise<Object>} Updated order details
     */
    try {
      console.log(`Processing delivery acceptance for order ${orderId} by agent ${deliveryAgentId}`);

      // 1. Retrieve order details from Firestore
      const orderResults = await this.firestoreRepo.read("orders", orderId);

      if (!orderResults || orderResults.length === 0) {
        throw new Error(`Order ${orderId} not found`);
      }

      const orderData = orderResults[0];

      // 2. Validate order and delivery agent
      if (orderData.delivery_agent_id !== deliveryAgentId) {
        throw new Error(`Delivery agent ${deliveryAgentId} not assigned to order ${orderId}`);
      }

      if (orderData.status !== "ASSIGNED") {
        throw new Error(`Order ${orderId} is in status ${orderData.status}, must be ASSIGNED to accept delivery`);
      }

      // Ensure agent has a wallet created in Hedera
      await this.hederaClient.createUserWallet(deliveryAgentId);

      // 3. Call acceptDeliveryAsAgent on Hedera contract
      const contractId = orderData.contract_id;
      if (!contractId) {
        throw new Error(`No contract ID found for order ${orderId}`);
      }

      console.log(`Executing Hedera contract acceptDeliveryAsAgent for order ${orderId}, contract ${contractId}`);

      // Execute contract method - using the correct method from HederaClient
      const receipt = await this.hederaClient.acceptDeliveryAsAgent(deliveryAgentId, contractId);

      console.log(`Delivery acceptance transaction successful: ${JSON.stringify(receipt)}`);

      // 4. Update order status in Firestore
      const updatedOrder = {
        ...orderData,
        status: "IN_DELIVERY",
        delivery_accepted_at: new Date().toISOString(),
      };

      // Update the order in Firestore
      await this.firestoreRepo.update("orders", orderId, updatedOrder);

      // Get current contract state for verification
      const contractState = await this.hederaClient.getContractState(contractId);

      return {
        order: updatedOrder,
        contract_state: contractState,
        message: "Delivery accepted successfully",
      };
    } catch (error) {
      console.error(`Delivery acceptance failed for order ${orderId}:`, error);
      throw error;
    }
  }
}

module.exports = AcceptDelivery;
