const FirestoreRepository = require("../utils/firestore");

class ConfirmDelivery {
  constructor(hederaClient, firestoreRepo = FirestoreRepository) {
    /**
         * Initialize ConfirmDelivery service with Hedera and Firestore clients.
         * @param {HederaClient} hederaClient - Hedera blockchain client for contract interactions
         * @param {FirestoreRepository} firestoreRepo - Firestore repository for data management
         */
    this.hederaClient = hederaClient;
    this.firestoreRepo = firestoreRepo;
  }

  async execute(orderId, deliveryAgentId) {
    /**
         * Confirm order delivery by the delivery agent and update status to delivered.
         * @param {string} orderId - Unique identifier for the order
         * @param {string} deliveryAgentId - ID of the delivery agent confirming delivery
         * @returns {Promise<Object>} - Updated order details
         */
    try {
      console.log(`Processing delivery confirmation for order ${orderId} by agent ${deliveryAgentId}`);

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

      // Check if order is in proper state for delivery confirmation
      if (orderData.status !== "IN_TRANSIT") {
        throw new Error(`Cannot confirm delivery. Current status: ${orderData.status}. Must be IN_TRANSIT.`);
      }

      // 3. Retrieve contract ID
      const contractId = orderData.contract_id;
      if (!contractId) {
        throw new Error(`No contract found for order ${orderId}`);
      }

      // 4. Call confirmDelivery on Hedera contract
      // Note: The HederaClient.confirmDelivery method requires only agentId and contractId
      console.log(`Executing Hedera contract confirmDelivery for order ${orderId}, contract ${contractId}`);
      const receipt = await this.hederaClient.confirmDelivery(deliveryAgentId, contractId);

      console.log(`Delivery confirmation transaction successful: ${JSON.stringify(receipt)}`);

      // 5. Update order status in Firestore
      const updatedOrder = {
        ...orderData,
        status: "DELIVERED",
        delivered_at: new Date().toISOString(),
      };

      // 6. Update the order in Firestore
      await this.firestoreRepo.update("orders", orderId, updatedOrder);

      // Get current contract state for verification
      const contractState = await this.hederaClient.getContractState(contractId);

      return {
        order: updatedOrder,
        contract_state: contractState,
        message: "Order delivery confirmed successfully",
      };
    } catch (error) {
      console.error(`Delivery confirmation failed for order ${orderId}:`, error);
      throw error;
    }
  }
}

module.exports = ConfirmDelivery;
