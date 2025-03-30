class ConfirmDelivery {
    constructor(hederaClient, firestoreRepo) {
        this.hederaClient = hederaClient;
        this.firestoreRepo = firestoreRepo;
    }

    async execute(orderId, customerId) {
        try {
            // 1. Retrieve order details
            const orderData = await this.firestoreRepo.read("orders", orderId);
            
            if (!orderData) {
                throw new Error(`Order ${orderId} not found`);
            }
            
            const orderContents = orderData.contents;
            
            // 2. Validate order and customer
            if (orderContents.user_id !== customerId) {
                throw new Error("Customer not authorized to confirm this delivery");
            }
            
            if (orderContents.status !== "IN_TRANSIT") {
                throw new Error(`Cannot confirm delivery. Current status: ${orderContents.status}`);
            }
            
            // 3. Retrieve contract and additional details
            const { contract_id, store_id, delivery_agent_id } = orderContents;
            
            if (!contract_id || !store_id || !delivery_agent_id) {
                throw new Error(`Missing required information for order ${orderId}`);
            }
            
            // 4. Call confirm_delivery on Hedera contract
            await this.hederaClient.confirmDelivery({
                contractId: contract_id,
                customerId: customerId,
                storeId: store_id,
                agentId: delivery_agent_id
            });
            
            // 5. Update order status
            const updatedOrder = {
                ...orderContents,
                status: "DELIVERED",
                delivered_at: new Date().toISOString()
            };
            
            // 6. Persist updated order
            await this.firestoreRepo.write("orders", orderId, { contents: updatedOrder });
            
            return {
                order: updatedOrder,
                message: "Order delivery confirmed successfully"
            };
        } catch (error) {
            console.error(`Delivery confirmation failed for order ${orderId}:`, error);
            throw error;
        }
    }
}

module.exports = ConfirmDelivery;
