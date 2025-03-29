import { v4 as uuidv4 } from 'uuid';

class ProductCreationService {
    constructor(assistantService, embeddingService, productRepo, storageRepo) {
        this.assistantService = assistantService;
        this.embeddingService = embeddingService;
        this.productRepo = productRepo;
        this.storageRepo = storageRepo;
    }

    _generateProductId() {
        /** Generate a unique product ID */
        return uuidv4();
    }

    async _extractProductAttributes(tempAudioPath, tempImagePaths, metadata) {
        /** Extract product attributes using Gemini AI */
        try {
            const prompt = `
            Based on the provided images and audio description, extract the following product details:
            - Product name
            - Detailed description
            - Appropriate price
            - Category and subcategory
            - Relevant tags
            
            Additional context: ${metadata.additional_info || ""}
            Please provide the attributes in a structured JSON format.
            `;

            const rawAttributes = await this.assistantService.processContent({
                schema: {
                    name: "string",
                    description: "string",
                    price: "number",
                    category: "string",
                    subcategory: "string",
                    tags: ["string"]
                },
                text: prompt,
                imagePath: tempImagePaths.length > 0 ? tempImagePaths[0] : null,
                audioPath: tempAudioPath,
                useJson: true
            });

            console.log("Debug - raw attributes output:", rawAttributes);

            return typeof rawAttributes === "string" ? JSON.parse(rawAttributes) : rawAttributes;
        } catch (error) {
            throw new Error(`Failed to extract product attributes: ${error.message}`);
        }
    }

    async createProduct(tempImagePaths, tempAudioPath, metadata) {
        /**
         * Create a product using the provided images, audio description, and metadata.
         */
        try {
            // 1. Generate product ID
            const productId = this._generateProductId();

            // 2. Extract product attributes
            const attributes = await this._extractProductAttributes(tempAudioPath, tempImagePaths, metadata);

            // 3. Store images and audio in Firebase Storage
            let imageUrls, audioUrl;
            try {
                ({ imageUrls, audioUrl } = await this.storageRepo.storeProductFiles(
                    metadata.store_id,
                    productId,
                    tempImagePaths,
                    tempAudioPath
                ));
            } catch (error) {
                throw new Error(`Failed to store product files: ${error.message}`);
            }

            // 4. Create embedding for search indexing
            try {
                const searchText = `${attributes.name} ${attributes.description} ${attributes.tags.join(" ")}`;
                await this.embeddingService.indexText(searchText, productId);
            } catch (error) {
                throw new Error(`Failed to create search embedding: ${error.message}`);
            }

            // 5. Create product object
            const product = {
                product_id: productId,
                store_id: metadata.store_id,
                name: attributes.name,
                description: attributes.description,
                price: attributes.price,
                category: attributes.category,
                subcategory: attributes.subcategory,
                images: imageUrls,
                audio: audioUrl,
                stock: metadata.stock || 0,
                tags: attributes.tags || []
            };

            // 6. Save to Firestore
            try {
                await this.productRepo.write("products", productId, product);
            } catch (error) {
                throw new Error(`Failed to save product to database: ${error.message}`);
            }

            return product;
        } catch (error) {
            throw new Error(`Product creation failed: ${error.message}`);
        }
    }
}

export default ProductCreationService;
