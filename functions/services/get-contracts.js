import HederaClient from './utils/hedera';
import FirestoreRepository from './utils/repositories';

class GetContracts {
    constructor(hederaClient, firestoreRepo) {
        /**
         * Initialize GetContracts service with Hedera and Firestore clients.
         * 
         * @param {HederaClient} hederaClient - Hedera blockchain client for contract interactions
         * @param {FirestoreRepository} firestoreRepo - Firestore repository for additional data retrieval
         */
        this.hederaClient = hederaClient;
        this.firestoreRepo = firestoreRepo;
    }

    async getAvailableContracts(deliveryAgentId = null) {
        /**
         * Retrieve available contracts that can be picked up by delivery agents.
         * 
         * @param {string|null} deliveryAgentId - Optional ID to filter out already assigned contracts
         * @return {Array<Object>} - List of available contract details
         */
        try {
            // Build Firestore query conditions
            const whereClause = [
                ["contents.status", "==", "PENDING"]
            ];
            if (deliveryAgentId) {
                whereClause.push(["contents.delivery_agent_id", "!=", deliveryAgentId]);
            }

            // Query Firestore for pending orders
            const pendingOrders = await this.firestoreRepo.query("orders", whereClause);

            // Transform orders into contract details
            const availableContracts = pendingOrders.map(order => ({
                order_id: order.contents.order_id,
                contract_id: order.contents.contract_id || null,
                store_id: order.contents.store_id,
                total_price: order.contents.total_price,
                delivery_fee: order.contents.delivery_fee,
                timestamp: order.contents.timestamp,
                status: "AVAILABLE"
            }));

            // Sort contracts by timestamp (oldest first)
            availableContracts.sort((a, b) => a.timestamp - b.timestamp);

            return availableContracts;
        } catch (error) {
            console.error(`Error retrieving available contracts: ${error.message}`);
            throw error;
        }
    }

    async selectContract(deliveryAgentId, orderId) {
        /**
         * Allow a delivery agent to select and claim a contract.
         * 
         * @param {string} deliveryAgentId - ID of the delivery agent
         * @param {string} orderId - ID of the order/contract to select
         * @return {Object} - Updated order/contract details
         */
        try {
            // Retrieve the specific order
            const orderData = await this.firestoreRepo.read("orders", orderId);

            if (!orderData) {
                throw new Error(`Order ${orderId} not found`);
            }

            // Check if order is still available
            if (orderData.contents.delivery_agent_id) {
                throw new Error("Contract already assigned to another agent");
            }

            if (orderData.contents.status !== "PENDING") {
                throw new Error("Contract is no longer available");
            }

            // Update order with delivery agent details
            const updatedOrder = {
                ...orderData.contents,
                delivery_agent_id: deliveryAgentId,
                status: "ASSIGNED"
            };

            // Persist updated order
            await this.firestoreRepo.write("orders", orderId, { contents: updatedOrder });

            return updatedOrder;
        } catch (error) {
            console.error(`Error selecting contract for agent ${deliveryAgentId}: ${error.message}`);
            throw error;
        }
    }

    async getAgentContracts(deliveryAgentId) {
        /**
         * Retrieve contracts assigned to a specific delivery agent.
         * 
         * @param {string} deliveryAgentId - ID of the delivery agent
         * @return {Array<Object>} - List of contracts assigned to the agent
         */
        try {
            // Query Firestore for orders assigned to the delivery agent
            const agentOrders = await this.firestoreRepo.query("orders", [
                ["contents.delivery_agent_id", "==", deliveryAgentId]
            ]);

            // Transform orders into contract details
            return agentOrders.map(order => ({
                order_id: order.contents.order_id,
                contract_id: order.contents.contract_id || null,
                store_id: order.contents.store_id,
                total_price: order.contents.total_price,
                delivery_fee: order.contents.delivery_fee,
                status: order.contents.status
            }));
        } catch (error) {
            console.error(`Error retrieving contracts for agent ${deliveryAgentId}: ${error.message}`);
            throw error;
        }
    }
}

export default GetContracts;
