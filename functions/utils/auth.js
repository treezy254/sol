import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(fs.readFileSync("config/serviceAccountKey.json", "utf-8"));
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const authService = getAuth();

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

export default FirebaseAuthService;