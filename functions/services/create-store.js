import { v4 as uuidv4 } from 'uuid';

class CreateStore {
    constructor(repo) {
        this.repo = repo;
    }

    async createStore(storeData) {
        /**
         * Create a new store with the provided information.
         */
        const contents = storeData.contents;
        if (!contents) {
            throw new Error("Store data must contain 'contents'");
        }

        // Validate required fields
        const requiredFields = ['owner_id', 'store_name', 'description', 'location'];
        for (const field of requiredFields) {
            if (!(field in contents)) {
                throw new Error(`Missing required field in contents: ${field}`);
            }
        }

        // Generate store_id if not provided
        if (!contents.store_id) {
            contents.store_id = uuidv4();
        }

        // Create store in Firestore
        try {
            await this.repo.write("stores", contents.store_id, contents);
        } catch (error) {
            throw new Error(`Failed to create store: ${error.message}`);
        }

        return contents;
    }
}

export default CreateStore;
