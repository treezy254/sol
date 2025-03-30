const FirebaseAuthService = require("../utils/auth");
const {HederaClient} = require("../utils/hedera");

class CreateUserService {
  constructor(operatorId, operatorKey) {
    this.authService = FirebaseAuthService;
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
        return {success: false, message: "Failed to create user", error: userResponse.error};
      }

      const firebaseUid = userResponse.uid;

      // Create Hedera wallet for the user
      const walletResponse = await this.hederaClient.createUserWallet(firebaseUid);

      return {
        success: true,
        user: userResponse,
        wallet: walletResponse,
      };
    } catch (error) {
      console.error("Error in CreateUserService:", error);
      return {
        success: false,
        message: "Failed to create user and wallet",
        error: error.message,
      };
    }
  }
}

module.exports = CreateUserService;
