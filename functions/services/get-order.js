const FirestoreRepository = require("../utils/firestore");

class GetOrder {
    constructor(firestoreRepo = FirestoreRepository) {
        /**
         * Initialize GetOrder service with Firestore repository.
         * @param {FirestoreRepository} firestoreRepo - Firestore repository for data retrieval
         */
        this.firestoreRepo = firestoreRepo;
    }

    async byId(orderId) {
        /**
         * Retrieve a specific order by its ID.
         * @param {string} orderId - Unique identifier for the order
         * @return {Object|null} - Order details or null if not found
         */
        try {
            const results = await this.firestoreRepo.read("orders", orderId);
            
            if (!results || results.length === 0) {
                return null;
            }
            
            return results[0];
        } catch (error) {
            console.error(`Error retrieving order ${orderId}: ${error.message}`);
            throw error;
        }
    }

    async byUser(userId) {
        /**
         * Retrieve all orders for a specific user.
         * @param {string} userId - ID of the user
         * @return {Array<Object>} - List of user's orders
         */
        try {
            const filters = [
                { field: "user_id", operator: "==", value: userId }
            ];
            
            const results = await this.firestoreRepo.read("orders", null, filters);
            return results || [];
        } catch (error) {
            console.error(`Error retrieving orders for user ${userId}: ${error.message}`);
            throw error;
        }
    }

    async byStore(storeId) {
        /**
         * Retrieve all orders for a specific store.
         * @param {string} storeId - ID of the store
         * @return {Array<Object>} - List of store's orders
         */
        try {
            const filters = [
                { field: "store_id", operator: "==", value: storeId }
            ];
            
            const results = await this.firestoreRepo.read("orders", null, filters);
            return results || [];
        } catch (error) {
            console.error(`Error retrieving orders for store ${storeId}: ${error.message}`);
            throw error;
        }
    }

    async filterByStatus(status) {
        /**
         * Retrieve orders filtered by their current status.
         * @param {string} status - Order status to filter by (e.g., 'PENDING', 'COMPLETED', 'CANCELLED')
         * @return {Array<Object>} - List of orders matching the status
         */
        try {
            const filters = [
                { field: "status", operator: "==", value: status }
            ];
            
            const results = await this.firestoreRepo.read("orders", null, filters);
            return results || [];
        } catch (error) {
            console.error(`Error retrieving orders with status ${status}: ${error.message}`);
            throw error;
        }
    }

    async recentOrders(limit = 10) {
        /**
         * Retrieve most recent orders.
         * Note: This method may need adjustment as the current FirestoreRepository 
         * implementation does not support sorting or limiting
         * @param {number} limit - Number of recent orders to retrieve
         * @return {Array<Object>} - List of recent orders
         */
        try {
            // Since the current FirestoreRepository doesn't have sorting capabilities,
            // we'll just fetch all orders and sort/limit in memory
            const results = await this.firestoreRepo.read("orders");
            
            if (!results || results.length === 0) {
                return [];
            }
            
            // Sort by created_at or timestamp if available
            const sorted = [...results].sort((a, b) => {
                const timeA = a.created_at || a.timestamp || 0;
                const timeB = b.created_at || b.timestamp || 0;
                return new Date(timeB) - new Date(timeA);
            });
            
            // Apply limit
            return sorted.slice(0, limit);
        } catch (error) {
            console.error(`Error retrieving recent orders: ${error.message}`);
            throw error;
        }
    }
}

module.exports = GetOrder;