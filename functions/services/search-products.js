const GeminiHandler = require("../utils/gemini");
const EmbeddingService = require("../utils/pinecone");
const FirestoreRepository = require("../utils/firestore");


class ProductSearchService {
  constructor() {
    try {
      this.assistantService = new GeminiHandler();
      this.embeddingService = new EmbeddingService();
      this.productRepo = FirestoreRepository;

      // Initialize embedding service
      this.embeddingService.init();
    } catch (error) {
      console.error(`Failed to initialize ProductSearchService: ${error.message}`);
      throw error;
    }
  }


  async _extractSearchFilters(query) {
    try {
      const schema = {
        type: "object",
        properties: {
          category: {type: "string"},
          subcategory: {type: "string"},
          tags: {
            type: "array",
            items: {type: "string"},
          },
          priceRange: {
            type: "object",
            properties: {
              min: {type: "number"},
              max: {type: "number"},
            },
          },
        },
      };

      const prompt = `
                Given the search query: '${query}', extract relevant search filters.
                Focus on understanding product attributes like category, subcategory, tags, and price range.
                Return only the structured data with no explanations.
            `;

      const response = await this.assistantService.processContent({
        schema: schema,
        text: prompt,
        useJson: true,
      });

      // Parse the response if it's returned as a string
      return typeof response === "string" ? JSON.parse(response) : response;
    } catch (error) {
      console.error(`Failed to extract search filters from query '${query}': ${error.message}`);
      // Return empty filters rather than throwing
      return {};
    }
  }


  _buildFilterConditions(filters, storeId) {
    try {
      const conditions = {};

      // Add store filter if provided
      if (storeId) {
        conditions.store_id = storeId;
      }

      // Add category filters if provided
      if (filters?.category) conditions.category = filters.category;
      if (filters?.subcategory) conditions.subcategory = filters.subcategory;

      // Add price range if provided
      if (filters?.priceRange?.min !== undefined || filters?.priceRange?.max !== undefined) {
        conditions.price = {};
        if (filters.priceRange.min !== undefined) conditions.price.$gte = filters.priceRange.min;
        if (filters.priceRange.max !== undefined) conditions.price.$lte = filters.priceRange.max;
      }

      return conditions;
    } catch (error) {
      console.error(`Failed to build filter conditions: ${error.message}`);
      return {};
    }
  }


  async _fetchProducts(productIds) {
    const products = [];
    const uniqueIds = [...new Set(productIds)]; // Remove duplicates

    try {
      // For small sets, fetch individually
      if (uniqueIds.length <= 10) {
        for (const productId of uniqueIds) {
          try {
            const productData = await this.productRepo.read("products", productId);
            if (productData && productData.length > 0) {
              products.push(productData[0]);
            }
          } catch (error) {
            console.error(`Failed to fetch product ${productId}: ${error.message}`);
          }
        }
      } else {
        // For larger sets, consider implementing batch fetching
        // This would require extending FirestoreRepository to support batch operations
        // For now, using individual fetches
        for (const productId of uniqueIds) {
          try {
            const productData = await this.productRepo.read("products", productId);
            if (productData && productData.length > 0) {
              products.push(productData[0]);
            }
          } catch (error) {
            console.error(`Failed to fetch product ${productId}: ${error.message}`);
          }
        }
      }
      return products;
    } catch (error) {
      console.error(`Batch product fetch failed: ${error.message}`);
      return [];
    }
  }

  async searchProducts(query, storeId = null, limit = 20) {
    try {
      // Step 1: Extract semantic search filters
      const filters = await this._extractSearchFilters(query);

      // Step 2: Create embedding for semantic search
      const queryEmbedding = await this.embeddingService.createEmbedding(query);

      // Step 3: Build filter conditions for Pinecone and Firestore
      const filterConditions = this._buildFilterConditions(filters, storeId);

      // Step 4: Perform vector search
      const searchResults = await this.embeddingService.query(
          queryEmbedding,
          limit,
                Object.keys(filterConditions).length > 0 ? filterConditions : null,
      );

      // Step 5: Extract product IDs from search results
      const productIds = searchResults.matches.map((result) => result.id);

      // Step 6: Fetch complete product data
      return await this._fetchProducts(productIds);
    } catch (error) {
      console.error(`Product search failed for query '${query}': ${error.message}`);
      throw new Error(`Search failed: ${error.message}`);
    }
  }
}

module.exports = ProductSearchService;
