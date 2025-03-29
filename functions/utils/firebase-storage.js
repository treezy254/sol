const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
admin.initializeApp();
const storage = admin.storage().bucket("everyautomate.firebasestorage.app");

class FirebaseStorageRepository {
  static async writeFile(localPath, storagePath) {
    const file = storage.file(storagePath);
    await file.save(require("fs").readFileSync(localPath));
    return file.publicUrl();
  }

  static async readFile(storagePath, localPath) {
    const file = storage.file(storagePath);
    await file.download({ destination: localPath });
    return localPath;
  }

  static async deleteFile(storagePath) {
    const file = storage.file(storagePath);
    await file.delete();
  }

  static async getUrl(storagePath) {
    const file = storage.file(storagePath);
    return file.publicUrl();
  }

  static async storeProductFiles(storeId, productId, imagePaths, audioPath) {
    const basePath = `stores/${storeId}/products/${productId}`;

    // Store images
    const imageUrls = await Promise.all(
      imagePaths.map(async (imagePath, idx) => {
        const extension = imagePath.split(".").pop();
        const storagePath = `${basePath}/images/image_${idx}.${extension}`;
        return await FirebaseStorageRepository.writeFile(imagePath, storagePath);
      })
    );

    // Store audio
    const audioExtension = audioPath.split(".").pop();
    const audioStoragePath = `${basePath}/audio/description.${audioExtension}`;
    const audioUrl = await FirebaseStorageRepository.writeFile(audioPath, audioStoragePath);

    return { imageUrls, audioUrl };
  }
}

module.exports = FirebaseStorageRepository;
