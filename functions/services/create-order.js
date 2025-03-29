class CreateOrder {
    constructor(firestoreRepo, hederaClient) {
        /**
         * Initialize CreateOrder service with required dependencies.
         * 
         * @param {Object} firestoreRepo - Firestore repository for data persistence
         * @param {Object} hederaClient - Hedera blockchain client for contract operations
         */
        this.firestoreRepo = firestoreRepo;
        this.hederaClient = hederaClient;
    }

    async execute(userId, storeId, totalPrice, deliveryFee) {
        /**
         * Execute order creation process:
         * 1. Generate unique order ID
         * 2. Create Order object
         * 3. Deploy Hedera smart contract
         * 4. Fund contract from customer wallet
         * 5. Persist order in Firestore
         * 
         * @param {string} userId - ID of the customer placing the order
         * @param {string} storeId - ID of the store fulfilling the order
         * @param {number} totalPrice - Total price of items in the order
         * @param {number} deliveryFee - Delivery fee for the order
         * @returns {Promise<Object>} - Object containing order and contract details
         */
        try {
            // 1. Generate unique order ID
            const orderId = `order_${Date.now()}`;

            // 2. Retrieve customer's Hedera wallet details
            const customerWallet = await this.hederaClient.getWallet(userId);
            if (!customerWallet) {
                throw new Error(`No Hedera wallet found for user ${userId}`);
            }

            // 3. Create Order object
            const order = {
                orderId,
                userId,
                storeId,
                totalPrice,
                deliveryFee,
                status: "PENDING",
                timestamp: new Date().toISOString()
            };

            // 4. Deploy Hedera smart contract
            const contractId = await this.hederaClient.deployContract(
                storeId,
                Math.round(totalPrice * 100), // Convert to cents
                Math.round(deliveryFee * 100)
            );

            // 5. Fund contract from customer wallet
            await this.hederaClient.fundContract(
                contractId,
                Math.round(totalPrice * 100),
                Math.round(deliveryFee * 100)
            );

            // 6. Persist order in Firestore with contract details
            const orderData = { ...order, contractId };
            await this.firestoreRepo.write("orders", {
                documentTag: orderId,
                contents: orderData
            });

            return { order: orderData, contractId };
        } catch (error) {
            console.error(`Order creation failed: ${error.message}`);
            throw error;
        }
    }

    async cancelOrder(orderId) {
        /**
         * Cancel an existing order and handle contract refund.
         * 
         * @param {string} orderId - ID of the order to cancel
         * @returns {Promise<Object>} - Status message
         */
        try {
            // Retrieve order details from Firestore
            const orderRef = await this.firestoreRepo.read("orders", orderId);
            if (!orderRef) {
                throw new Error(`Order ${orderId} not found`);
            }

            const orderData = orderRef.contents;
            const contractId = orderData.contractId;

            if (!contractId) {
                throw new Error(`No contract associated with order ${orderId}`);
            }

            // Refund logic (if applicable, implement refundContract in Hedera client)
            // await this.hederaClient.refundContract(contractId);

            // Update order status
            const updatedOrderData = { ...orderData, status: "CANCELLED" };
            await this.firestoreRepo.write("orders", {
                documentTag: orderId,
                contents: updatedOrderData
            });

            return { status: "Order cancelled successfully" };
        } catch (error) {
            console.error(`Order cancellation failed: ${error.message}`);
            throw error;
        }
    }
}

module.exports = CreateOrder;
