const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

// ✅ Use absolute path
const serviceAccountPath = path.resolve(__dirname, "serviceAccount.json");

// ✅ Read and parse the JSON file
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

// ✅ Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const authService = admin.auth();

class FirebaseAuthService {
    static async signup(email, password, displayName = null) {
        try {
            const user = await authService.createUser({
                email,
                password,
                displayName
            });
            return { uid: user.uid, email: user.email, displayName: user.displayName };
        } catch (error) {
            return { error: error.message };
        }
    }

    static async getUser(uid) {
        try {
            const user = await authService.getUser(uid);
            return {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                phoneNumber: user.phoneNumber,
                photoUrl: user.photoURL
            };
        } catch (error) {
            return { error: error.message };
        }
    }
}

