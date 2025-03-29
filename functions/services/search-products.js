import { GeminiHandler } from "./utils/assistantService";
import { EmbeddingService } from "./utils/embeddingService";
import { FirestoreRepository } from "./utils/repositories";

class ProductSearchService {
    constructor(assistantService, embeddingService, productRepo) {
        try {
            this.assistantService = assistantService;
            this.embeddingService = embeddingService;
            this.productRepo = productRepo;
        } catch (error) {
            console.error(`Failed to initialize ProductSearchService: ${error.message}`);
            throw error;
        }
    }

    async _extractSearchFilters(query) {
        try {
            const prompt = `
                Given the search query: '${query}', extract relevant search filters.
                Focus on understanding product attributes like category, subcategory, and tags.
            `;

            return await this.assistantService.processContent({
                schema: "SearchFilters",
                text: prompt,
                useJson: true
            });
        } catch (error) {
            console.error(`Failed to extract search filters from query '${query}': ${error.message}`);
            throw error;
        }
    }

    _buildFilterConditions(filters, storeId) {
        try {
            const conditions = {};
            if (filters?.category) conditions.category = filters.category;
            if (filters?.subcategory) conditions.subcategory = filters.subcategory;
            return conditions;
        } catch (error) {
            console.error(`Failed to build filter conditions: ${error.message}`);
            throw error;
        }
    }

    async _fetchProducts(productIds) {
        const products = [];
        for (const productId of productIds) {
            try {
                const productData = await this.productRepo.read("products", productId);
                if (productData && productData[0]) {
                    products.push(productData[0]); 
                }
            } catch (error) {
                console.error(`Failed to fetch product ${productId}: ${error.message}`);
            }
        }
        return products;
    }

    async searchProducts(query, storeId = null, limit = 20) {
        try {
            const filters = await this._extractSearchFilters(query);
            const queryEmbedding = await this.embeddingService.createEmbedding(query);

            const filterConditions = null; // Not used in this implementation but can be extended

            const searchResults = await this.embeddingService.query({
                queryVector: queryEmbedding,
                topK: limit,
                filterConditions
            });

            const productIds = searchResults.matches.map(result => result.id);
            return await this._fetchProducts(productIds);
        } catch (error) {
            console.error(`Product search failed for query '${query}': ${error.message}`);
            throw error;
        }
    }
}

export { ProductSearchService };
