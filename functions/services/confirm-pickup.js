class ConfirmPickup {
    constructor(hederaClient, firestoreRepo) {
        /**
         * Initialize ConfirmPickup service with Hedera and Firestore clients.
         * @param {HederaClient} hederaClient - Hedera blockchain client for contract interactions
         * @param {FirestoreRepository} firestoreRepo - Firestore repository for data management
         */
        this.hederaClient = hederaClient;
        this.firestoreRepo = firestoreRepo;
    }

    async execute(orderId, deliveryAgentId) {
        /**
         * Confirm order pickup and update status to in transit.
         * @param {string} orderId - Unique identifier for the order
         * @param {string} deliveryAgentId - ID of the delivery agent
         * @returns {Promise<Object>} - Updated order details
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

            if (!["ASSIGNED", "PICKED_UP"].includes(orderContents.status)) {
                throw new Error(`Cannot confirm pickup. Current status: ${orderContents.status}`);
            }

            // 3. Retrieve contract details
            const contractId = orderContents.contract_id;
            if (!contractId) {
                throw new Error(`No contract found for order ${orderId}`);
            }

            // 4. Call confirm_pickup on Hedera contract
            await this.hederaClient.confirmPickup(contractId);

            // 5. Update order status
            const updatedOrder = {
                ...orderContents,
                status: "IN_TRANSIT",
                in_transit_at: new Date().toISOString()
            };

            // 6. Persist updated order
            await this.firestoreRepo.write("orders", orderId, { contents: updatedOrder });

            return {
                order: updatedOrder,
                message: "Order confirmed in transit"
            };
        } catch (error) {
            console.error(`Pickup confirmation failed for order ${orderId}:`, error);
            throw error;
        }
    }
}

module.exports = ConfirmPickup;
