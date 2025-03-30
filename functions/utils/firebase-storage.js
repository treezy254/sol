import { readFileSync } from "fs";
import { resolve } from "path";
import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";

// ✅ Use absolute path
const serviceAccountPath = resolve("/home/zxxc/Desktop/java/functions/utils/serviceAccount.json");

// ✅ Read and parse the JSON file
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

// ✅ Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
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

// ✅ Debugging output
console.log("✅ FirebaseAuthService initialized successfully!");

// Run test if executed directly
async function main() {
    console.log("\nRunning FirebaseAuthService tests...\n");

    // Test signup
    const email = `testuser${Date.now()}@example.com`; // Unique email
    const password = "SecurePassword123";
    const displayName = "Test User";

    console.log("Testing signup...");
    const signupResult = await FirebaseAuthService.signup(email, password, displayName);
    console.log("Signup Result:", signupResult);

    if (signupResult.error) {
        console.error("Signup failed:", signupResult.error);
        return;
    }

    // Test getUser
    console.log("\nTesting getUser...");
    const getUserResult = await FirebaseAuthService.getUser(signupResult.uid);
    console.log("Get User Result:", getUserResult);

    if (getUserResult.error) {
        console.error("Get User failed:", getUserResult.error);
        return;
    }

    console.log("\nAll tests completed successfully.");
}

// Run the script only if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
