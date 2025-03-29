import { GoogleGenerativeAI } from "@google/generative-ai";

class GeminiHandler {
    constructor() {
        this.apiKey = "AIzaSyBUbJ72Ki9Rgiit1w2nHr8V6BS3veCJhHs";
        this.modelName = "gemini-1.5-flash";
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: this.modelName });
    }

    async processContent({ schema, text = null, imagePath = null, audioPath = null, useJson = true }) {
        const contentParts = [];
        
        if (text) {
            contentParts.push({ text });
        }
        
        if (imagePath) {
            try {
                const imageData = await this.loadImage(imagePath);
                contentParts.push({ image: { inlineData: { data: imageData, mimeType: "image/png" } } });
            } catch (error) {
                console.error("Error loading image:", error);
            }
        }
        
        if (audioPath) {
            try {
                const audioFile = await this.uploadFile(audioPath);
                contentParts.push({ audio: { url: audioFile } });
            } catch (error) {
                console.error("Error uploading audio:", error);
            }
        }
        
        if (contentParts.length === 0) {
            throw new Error("At least one content type (text/image/audio) must be provided");
        }

        const mimeType = useJson ? "application/json" : "text/plain";
        
        try {
            const response = await this.model.generateContent({
                contents: contentParts,
                generationConfig: {
                    responseMimeType: mimeType,
                    responseSchema: schema
                }
            });
            return response.text();
        } catch (error) {
            console.error("Error generating content:", error);
            throw error;
        }
    }

    async loadImage(imagePath) {
        const fs = require("fs");
        return fs.promises.readFile(imagePath, { encoding: "base64" });
    }

    async uploadFile(filePath) {
        // Placeholder for actual file upload logic
        return `https://example.com/${filePath}`;
    }
}

export default GeminiHandler;