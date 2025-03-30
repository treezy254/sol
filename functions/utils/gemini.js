const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiHandler {
    constructor() {
        this.apiKey = "AIzaSyBUbJ72Ki9Rgiit1w2nHr8V6BS3veCJhHs";  // Replace with your valid API key
        this.modelName = "gemini-1.5-flash";
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: this.modelName });
    }

    async processContent({ schema, text = null, imagePath = null, audioPath = null, useJson = true }) {
    const contentParts = [];

    if (text) {
        contentParts.push({ role: "user", parts: [{ text }] });
    }

    if (imagePath) {
        try {
            const imageData = await this.loadImage(imagePath);
            contentParts.push({ parts: [{ inlineData: { data: imageData, mimeType: "image/png" } }] });
        } catch (error) {
            console.error("Error loading image:", error);
        }
    }


    if (audioPath) {
            try {
                const audioFile = await this.uploadAudio(audioPath);
                contentParts.push(audioFile); // Properly include uploaded audio in the request
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

        // Extract the generated text from the response
        const responseData = await response.response; // Ensure correct data extraction
        if (responseData && responseData.candidates && responseData.candidates.length > 0) {
            return responseData.candidates[0].content.parts[0].text; // Extract the text
        } else {
            throw new Error("No generated content found in the response");
        }
    } catch (error) {
        console.error("Error generating content:", error);
        throw error;
    }
}

    async loadImage(imagePath) {
        const fs = require("fs");
        return fs.promises.readFile(imagePath, { encoding: "base64" });
    }

    async uploadAudio(audioPath) {
        try {
            const myfile = await this.genAI.files.upload({
                file: path.resolve(audioPath),
                config: { mimeType: "audio/mpeg" }, // Ensure correct MIME type
            });
            console.log("Uploaded file:", myfile);

            return {
                parts: [{ inlineData: { data: myfile.uri, mimeType: myfile.mimeType } }],
            };
        } catch (error) {
            console.error("Error uploading audio file:", error);
            throw error;
        }
    }
}

module.exports = GeminiHandler;


