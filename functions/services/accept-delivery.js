const { FirestoreRepository } = require("./utils/repositories");
const { HederaClient } = require("./utils/hedera");

class AcceptDelivery {
  constructor(hederaClient, firestoreRepo) {
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
     * 3. Call accept_delivery on Hedera contract
     * 4. Update order status
     *
     * @param {string} orderId - Unique identifier for the order
     * @param {string} deliveryAgentId - ID of the delivery agent
     * @returns {Promise<Object>} Updated order details
     */
    try {
      // 1. Retrieve order details
      const orderData = await this.firestoreRepo.read("orders", orderId);

      if (!orderData) {
        throw new Error(`Order ${orderId} not found`);
      }

      const orderContents = orderData.contents;

      // 2. Validate order and delivery agent
      if (orderContents.delivery_agent_id !== deliveryAgentId) {
        throw new Error("Delivery agent not assigned to this order");
      }

      if (orderContents.status !== "ASSIGNED") {
        throw new Error("Order is not in a state to be accepted");
      }

      // Retrieve delivery agent's Hedera wallet
      const agentWallet = await this.hederaClient.getWallet(deliveryAgentId);
      if (!agentWallet) {
        throw new Error(`No Hedera wallet found for delivery agent ${deliveryAgentId}`);
      }

      // 3. Call accept_delivery on Hedera contract
      const contractId = orderContents.contract_id;
      if (!contractId) {
        throw new Error(`No contract found for order ${orderId}`);
      }

      // Calculate delivery amount (could be full amount or a portion)
      const deliveryAmount = orderContents.delivery_fee || 0;

      // Execute contract accept delivery method
      await this.hederaClient.acceptDelivery({
        contractId,
        agentId: deliveryAgentId,
        amount: Math.floor(deliveryAmount * 100), // Convert to smallest unit
      });

      // 4. Update order status
      const updatedOrder = {
        ...orderContents,
        status: "IN_DELIVERY",
        delivery_accepted_at: new Date().toISOString(),
      };

      // Persist updated order
      await this.firestoreRepo.write("orders", orderId, { contents: updatedOrder });

      return {
        order: updatedOrder,
        message: "Delivery accepted successfully",
      };
    } catch (error) {
      console.error(`Delivery acceptance failed for order ${orderId}:`, error);
      throw error;
    }
  }

  async confirmPickup(orderId) {
    /**
     * Confirm pickup of the order by the delivery agent.
     *
     * @param {string} orderId - Unique identifier for the order
     * @returns {Promise<Object>} Updated order details
     */
    try {
      // 1. Retrieve order details
      const orderData = await this.firestoreRepo.read("orders", orderId);

      if (!orderData) {
        throw new Error(`Order ${orderId} not found`);
      }

      const orderContents = orderData.contents;

      // 2. Validate order status
      if (orderContents.status !== "IN_DELIVERY") {
        throw new Error("Order is not ready for pickup confirmation");
      }

      // 3. Call confirm_pickup on Hedera contract
      const contractId = orderContents.contract_id;
      if (!contractId) {
        throw new Error(`No contract found for order ${orderId}`);
      }

      // Execute contract confirm pickup method
      await this.hederaClient.confirmPickup(contractId);

      // 4. Update order status
      const updatedOrder = {
        ...orderContents,
        status: "PICKED_UP",
        pickup_confirmed_at: new Date().toISOString(),
      };

      // Persist updated order
      await this.firestoreRepo.write("orders", orderId, { contents: updatedOrder });

      return {
        order: updatedOrder,
        message: "Order pickup confirmed successfully",
      };
    } catch (error) {
      console.error(`Pickup confirmation failed for order ${orderId}:`, error);
      throw error;
    }
  }
}

module.exports = AcceptDelivery;
