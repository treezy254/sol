const FirestoreRepository = require("../utils/firestore");

class ConfirmPickup {
  constructor(hederaClient, firestoreRepo = FirestoreRepository) {
    /**
         * Initialize ConfirmPickup service with Hedera and Firestore clients.
         * @param {HederaClient} hederaClient - Hedera blockchain client for contract interactions
         * @param {FirestoreRepository} firestoreRepo - Firestore repository for data management
         */
    this.hederaClient = hederaClient;
    this.firestoreRepo = firestoreRepo;
  }

  async execute(orderId, storeOwnerId) {
    /**
         * Confirm order pickup by the store owner and update status to in transit.
         * @param {string} orderId - Unique identifier for the order
         * @param {string} storeOwnerId - ID of the store owner
         * @returns {Promise<Object>} - Updated order details
         */
    try {
      console.log(`Processing pickup confirmation for order ${orderId} by store owner ${storeOwnerId}`);

      // 1. Retrieve order details from Firestore
      const orderResults = await this.firestoreRepo.read("orders", orderId);

      if (!orderResults || orderResults.length === 0) {
        throw new Error(`Order ${orderId} not found`);
      }

      const orderData = orderResults[0];

      // 2. Validate order and store owner
      if (orderData.store_owner_id !== storeOwnerId) {
        throw new Error(`Store owner ${storeOwnerId} not associated with order ${orderId}`);
      }

      // Check if order is in proper state for pickup confirmation
      // Note: Based on the HederaClient, it should be in ASSIGNED (1) or IN_DELIVERY state
      if (!["ASSIGNED", "IN_DELIVERY"].includes(orderData.status)) {
        throw new Error(`Cannot confirm pickup. Current status: ${orderData.status}`);
      }

      // 3. Retrieve contract details
      const contractId = orderData.contract_id;
      if (!contractId) {
        throw new Error(`No contract found for order ${orderId}`);
      }

      // 4. Call confirmPickup on Hedera contract
      // Note: The HederaClient.confirmPickup method requires the storeOwnerId
      console.log(`Executing Hedera contract confirmPickup for order ${orderId}, contract ${contractId}`);
      const receipt = await this.hederaClient.confirmPickup(storeOwnerId, contractId);

      console.log(`Pickup confirmation transaction successful: ${JSON.stringify(receipt)}`);

      // 5. Update order status in Firestore
      const updatedOrder = {
        ...orderData,
        status: "IN_TRANSIT",
        pickup_confirmed_at: new Date().toISOString(),
      };

      // 6. Update the order in Firestore
      await this.firestoreRepo.update("orders", orderId, updatedOrder);

      // Get current contract state for verification
      const contractState = await this.hederaClient.getContractState(contractId);

      return {
        order: updatedOrder,
        contract_state: contractState,
        message: "Order pickup confirmed successfully",
      };
    } catch (error) {
      console.error(`Pickup confirmation failed for order ${orderId}:`, error);
      throw error;
    }
  }
}

module.exports = ConfirmPickup;
