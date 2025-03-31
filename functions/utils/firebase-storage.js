const admin = require("firebase-admin");
const path = require("path");

class FirebaseStorage {
    /**
     * Repository for handling file operations with Firebase Storage.
     */
    constructor() {
        this.bucket = admin.storage().bucket("everyautomate.firebasestorage.app");
    }

    async writeFile(localPath, storagePath) {
        /**
         * Upload a file to Firebase Storage.
         *
         * @param {string} localPath - Path to local file
         * @param {string} storagePath - Desired path in Firebase Storage
         * @returns {Promise<string>} - Public URL of the uploaded file
         */
        await this.bucket.upload(localPath, { destination: storagePath });
        const file = this.bucket.file(storagePath);
        await file.makePublic();
        return file.publicUrl();
    }

    async readFile(storagePath, localPath) {
        /**
         * Download a file from Firebase Storage.
         *
         * @param {string} storagePath - Path in Firebase Storage
         * @param {string} localPath - Desired local path to save file
         * @returns {Promise<string>} - Path to local file
         */
        const file = this.bucket.file(storagePath);
        await file.download({ destination: localPath });
        return localPath;
    }

    async deleteFile(storagePath) {
        /** Delete a file from Firebase Storage. */
        const file = this.bucket.file(storagePath);
        await file.delete();
    }

    async getUrl(storagePath) {
        /** Get public URL for a file without downloading. */
        const file = this.bucket.file(storagePath);
        return file.publicUrl();
    }

    async storeProductFiles(storeId, productId, imagePaths, audioPath) {
        /**
         * Store product-related files in an organized structure.
         *
         * @param {string} storeId - Store identifier
         * @param {string} productId - Product identifier
         * @param {string[]} imagePaths - List of local paths to product images
         * @param {string} audioPath - Local path to audio file
         * @returns {Promise<{ imageUrls: string[], audioUrl: string }>} - Image and audio URLs
         */
        const basePath = `stores/${storeId}/products/${productId}`;
        const imageUrls = [];

        for (let i = 0; i < imagePaths.length; i++) {
            const ext = path.extname(imagePaths[i]);
            const storagePath = `${basePath}/images/image_${i}${ext}`;
            const imageUrl = await this.writeFile(imagePaths[i], storagePath);
            imageUrls.push(imageUrl);
        }

        const audioExt = path.extname(audioPath);
        const audioStoragePath = `${basePath}/audio/description${audioExt}`;
        const audioUrl = await this.writeFile(audioPath, audioStoragePath);

        return { imageUrls, audioUrl };
    }
}

module.exports = FirebaseStorage;
