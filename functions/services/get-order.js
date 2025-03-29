import FirestoreRepository from './utils/repositories';

class GetOrder {
    constructor(firestoreRepo) {
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
            const orderData = await this.firestoreRepo.read("orders", orderId);
            return orderData ? orderData.contents : null;
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
            const queryResults = await this.firestoreRepo.query("orders", [
                ["contents.user_id", "==", userId]
            ]);
            return queryResults.map(result => result.contents);
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
            const queryResults = await this.firestoreRepo.query("orders", [
                ["contents.store_id", "==", storeId]
            ]);
            return queryResults.map(result => result.contents);
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
            const queryResults = await this.firestoreRepo.query("orders", [
                ["contents.status", "==", status]
            ]);
            return queryResults.map(result => result.contents);
        } catch (error) {
            console.error(`Error retrieving orders with status ${status}: ${error.message}`);
            throw error;
        }
    }

    async recentOrders(limit = 10) {
        /**
         * Retrieve most recent orders.
         * @param {number} limit - Number of recent orders to retrieve
         * @return {Array<Object>} - List of recent orders
         */
        try {
            const queryResults = await this.firestoreRepo.query("orders", [], [
                ["contents.timestamp", "desc"]
            ], limit);
            return queryResults.map(result => result.contents);
        } catch (error) {
            console.error(`Error retrieving recent orders: ${error.message}`);
            throw error;
        }
    }
}

export default GetOrder;
