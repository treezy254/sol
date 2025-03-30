// services/GetUser.js
const FirebaseAuthService = require("../utils/auth");
const {HederaClient} = require("../utils/hedera");

class GetUser {
  constructor(operatorId, operatorKey) {
    this.authService = FirebaseAuthService;
    this.hederaClient = new HederaClient(operatorId, operatorKey);
  }

  async execute(firebaseUid) {
    /**
         * Fetches user details from Firebase and their associated Hedera wallet.
         */
    try {
      // Get user details from Firebase
      const userResponse = await this.authService.getUser(firebaseUid);
      if (userResponse.error) {
        return {success: false, message: "Failed to retrieve user", error: userResponse.error};
      }

      // Get or create Hedera wallet details
      const walletResponse = await this.hederaClient.getOrCreateWallet(firebaseUid);

      return {
        success: true,
        user: userResponse,
        wallet: walletResponse,
      };
    } catch (error) {
      return {
        success: false,
        message: "An error occurred",
        error: error.message,
      };
    }
  }
}

module.exports = {GetUser};
