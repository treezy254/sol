import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
dotenv.config();

class EmbeddingService {
    constructor() {
        this.apiKey = process.env.PINECONE_API_KEY;
        this.indexName = "products"; // Corrected index name
        this.namespace = "products-index"; // Namespace in Pinecone
        this.pc = new Pinecone({ apiKey: this.apiKey });
    }

    async init() {
        this.index = this.pc.index(this.indexName).namespace(this.namespace);
    }

    async createEmbedding(text) {
        return Array(1024).fill(Math.random()); // Match Pinecone's dimensions
    }

    async indexText(text, vectorId) {
        const embedding = await this.createEmbedding(text);
        const vector = {
            id: vectorId,
            values: embedding, // Ensure correct format for Pinecone
            metadata: { chunk_text: text, category: "example-category" },
        };

        await this.index.upsert([{ id: vectorId, values: embedding, metadata: vector.metadata }]);
        console.log(`✅ Text indexed with vector ID: ${vectorId}`);
    }

    async query(queryVector, topK = 3, filterConditions = null) {
        const queryResponse = await this.index.query({
            vector: queryVector,
            filter: filterConditions,
            topK,
            includeMetadata: true
        });
        return queryResponse;
    }
}

