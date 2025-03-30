import { Order } from "../domain/models.js";

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
         * 2. Deploy Hedera smart contract between customer and store
         * 3. Fund contract from customer wallet with product price and delivery fee
         * 4. Persist order in Firestore
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
            
            // 2. Deploy Hedera smart contract between customer and store
            // Note: User wallets should already exist from signup
            console.log(`Deploying contract for order between user ${userId} and store ${storeId}`);
            const contractId = await this.hederaClient.deployContract(
                userId,  // Order owner (customer)
                storeId, // Store owner
                totalPrice,
                deliveryFee
            );
            console.log(`Contract deployed with ID: ${contractId}`);
            
            // 3. Fund contract from customer wallet
            console.log(`Funding contract ${contractId} with ${totalPrice} + ${deliveryFee} HBAR`);
            await this.hederaClient.fundContract(
                userId,      // Order owner funds the contract
                contractId,
                totalPrice,
                deliveryFee
            );
            console.log(`Contract funded successfully`);
            
            // 4. Create and persist order in Firestore with contract details
            const order = new Order(
                orderId,
                userId,
                storeId,
                totalPrice,
                deliveryFee,
                "INITIATED", // Initial status matches contract state
                new Date().toISOString(),
                contractId.toString(),
                null // No delivery agent assigned yet
            );
            
            order.create(this.firestoreRepo);
            console.log(`Order ${orderId} persisted in Firestore`);
            
            // 5. Verify contract state
            const contractState = await this.hederaClient.getContractState(contractId);
            console.log(`Contract state verified: ${JSON.stringify(contractState)}`);
            
            return {
                order: {
                    order_id: order.order_id,
                    user_id: order.user_id,
                    store_id: order.store_id,
                    total_price: order.total_price,
                    delivery_fee: order.delivery_fee,
                    status: order.status,
                    timestamp: order.timestamp,
                    contract_id: order.contract_id
                },
                contractId: contractId.toString(),
                contractState
            };
        } catch (error) {
            console.error(`Order creation failed: ${error.message}`);
            throw error;
        }
    }
}

export default CreateOrder;