import FirebaseAuthService from './utils/auth';
import HederaClient from './utils/hedera';

class CreateUser {
    constructor(operatorId, operatorKey) {
        this.authService = new FirebaseAuthService();
        this.hederaClient = new HederaClient(operatorId, operatorKey);
    }

    async execute(email, password, displayName = null) {
        /**
         * Creates a new user in Firebase Auth and then generates a Hedera wallet for them.
         */
        try {
            // Create user in Firebase Auth
            const userResponse = await this.authService.signup(email, password, displayName);
            
            if (userResponse.error) {
                return { success: false, message: "Failed to create user", error: userResponse.error };
            }

            const firebaseUid = userResponse.uid;

            // Create Hedera wallet
            const walletResponse = await this.hederaClient.createWallet(firebaseUid);

            return { success: true, user: userResponse, wallet: walletResponse };
        } catch (error) {
            return { success: false, message: "Failed to create wallet", error: error.message };
        }
    }
}

export default CreateUser;
