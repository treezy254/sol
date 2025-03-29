import { HederaClient } from "./utils/hedera.js"; // Adjust the import path as needed

async function runIsolatedTests() {
  console.log("Starting Isolated Hedera Contract Tests");

  // Your credentials here
  const OPERATOR_ID = "0.0.5792103";
  const OPERATOR_KEY = process.env.HEDERA_PRIVATE_KEY || 
    "3030020100300706052b8104000a042204201a5ed9c7aaba500df2b0c417f477a1029cd195af3b63674c88842e5edf6ec0bb";

  try {
    // Initialize Hedera Client
    const hederaClient = new HederaClient(OPERATOR_ID, OPERATOR_KEY);
    console.log("✅ Hedera Client Initialized");

    // You need to provide an existing contract ID that has already been deployed and funded
    const contractId = "0.0.XXXXXX"; // Replace with your actual contract ID
    console.log(`Using existing contract ID: ${contractId}`);

    // Optional: Check initial contract state
    console.log("\n📊 Initial Contract State:");
    await hederaClient.getContractState(contractId);

    // Create participant wallets if needed
    // This is required if you haven't created the wallets yet
    console.log("\n🧪 Creating participant wallets");
    const participantAccounts = await hederaClient.createParticipantWallets();
    console.log("Created wallets:", participantAccounts);

    // 4. Delivery Agent Acceptance Test
    console.log("\n🧪 Testing Delivery Agent Acceptance");
    try {
      const acceptanceResult = await hederaClient.acceptDeliveryAsAgent(contractId);
      console.log("✅ Delivery Agent Accepted:", acceptanceResult);
      
      // Check contract state after acceptance
      console.log("\n📊 Contract State After Agent Acceptance:");
      const stateAfterAcceptance = await hederaClient.getContractState(contractId);
      
      // Verify that the status changed to AgentAssigned (1)
      if (stateAfterAcceptance.status !== 1) {
        throw new Error(`Contract not in expected AgentAssigned state, current state: ${stateAfterAcceptance.status}`);
      }
      
      console.log("✅ Contract verified to be in AgentAssigned state");
    } catch (error) {
      console.error("❌ Delivery agent acceptance failed:", error.message);
      console.log("Skipping remaining tests as acceptance failed");
      return;
    }

    // 5. Pickup Confirmation Test
    console.log("\n🧪 Testing Pickup Confirmation");
    try {
      const pickupConfirmation = await hederaClient.confirmPickup(contractId);
      console.log("✅ Pickup Confirmed:", pickupConfirmation);
      
      // Check contract state after pickup
      console.log("\n📊 Contract State After Pickup Confirmation:");
      const stateAfterPickup = await hederaClient.getContractState(contractId);
      
      // Verify that the status changed to PickedUp (2)
      if (stateAfterPickup.status !== 2) {
        throw new Error(`Contract not in expected PickedUp state, current state: ${stateAfterPickup.status}`);
      }
      
      console.log("✅ Contract verified to be in PickedUp state");
    } catch (error) {
      console.error("❌ Pickup confirmation failed:", error.message);
      console.log("Skipping remaining tests as pickup confirmation failed");
      return;
    }

    // 6. Delivery Confirmation Test
    console.log("\n🧪 Testing Delivery Confirmation");
    try {
      const confirmDeliveryResult = await hederaClient.confirmDelivery(contractId);
      console.log("✅ Delivery Confirmed:", confirmDeliveryResult);
      
      // Check final contract state
      console.log("\n📊 Final Contract State:");
      const finalState = await hederaClient.getContractState(contractId);
      
      // Verify that the status changed to Delivered (3)
      if (finalState.status !== 3) {
        throw new Error(`Contract not in expected Delivered state, current state: ${finalState.status}`);
      }
      
      console.log("✅ Contract verified to be in Delivered state");
    } catch (error) {
      console.error("❌ Delivery confirmation failed:", error.message);
      return;
    }

    console.log("\n🎉 Isolated Tests Completed Successfully! 🎉");
  } catch (error) {
    console.error("❌ Test Failed:", error);
  }
}

// Run the isolated tests
runIsolatedTests();