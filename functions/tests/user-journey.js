/**
 * User Journey Test Scripts
 * 
 * This file contains test scripts that simulate:
 * 1. Customer user journey
 * 2. Delivery agent user journey
 *
 * These tests run in sequence to ensure data consistency across services.
 */

// Import the service handler
const { handleService } = require('../api/index');

// Test data storage (for passing values between test steps)
const testData = {
  customer: {
    email: 'customer@example.com',
    password: 'customerPass123',
    displayName: 'Test Customer',
    uid: null,
    selectedProduct: null,
    orderId: null
  },
  deliveryAgent: {
    email: 'delivery@example.com',
    password: 'deliveryPass123',
    displayName: 'Test Delivery Agent',
    uid: null
  },
  store: {
    id: 'store-123' // Assuming this store exists in the system
  }
};

// Helper function to log test steps
function logStep(step, description) {
  console.log(`\n------- STEP ${step}: ${description} -------`);
}

// Helper function to run a test step
async function runStep(stepNumber, description, serviceName, params) {
  logStep(stepNumber, description);
  console.log(`Calling service: ${serviceName}`);
  console.log(`Parameters:`, params);
  
  try {
    const result = await handleService(serviceName, params);
    console.log(`Result:`, result);
    
    if (result.success === false) {
      console.error(`❌ Step failed: ${result.message}`);
      throw new Error(`Step ${stepNumber} failed: ${result.message}`);
    } else {
      console.log(`✅ Step completed successfully`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Step error:`, error);
    throw error;
  }
}

// Customer Journey Test
async function testCustomerJourney() {
  console.log('\n🧪 TESTING CUSTOMER JOURNEY 🧪');
  
  try {
    // Step 1: Customer Sign Up
    const signupResult = await runStep(1, 'Customer Sign Up', 'createUser', {
      email: testData.customer.email,
      password: testData.customer.password,
      displayName: testData.customer.displayName
    });
    
    // Store the customer UID for later use
    testData.customer.uid = signupResult.userId;
    
    // Step 2: Customer Searches for Products
    const searchResult1 = await runStep(2, 'Customer Searches Products', 'searchProducts', {
      query: 'pizza',
      storeId: testData.store.id,
      limit: 5
    });
    
    // Step 3: Customer Searches for More Products
    const searchResult2 = await runStep(3, 'Customer Searches More Products', 'searchProducts', {
      query: 'soda',
      storeId: testData.store.id,
      limit: 5
    });
    
    // Choose a product from the search results (if available)
    if (searchResult2.products && searchResult2.products.length > 0) {
      testData.customer.selectedProduct = searchResult2.products[0].id;
    } else if (searchResult1.products && searchResult1.products.length > 0) {
      testData.customer.selectedProduct = searchResult1.products[0].id;
    } else {
      // If no products found, use a default product ID
      testData.customer.selectedProduct = 'product-123';
      console.log('No products found in search results, using default product ID');
    }
    
    // Step 4: Customer Gets Product Details
    const productResult = await runStep(4, 'Customer Gets Product Details', 'getProduct', {
      productId: testData.customer.selectedProduct
    });
    
    // Step 5: Customer Creates an Order
    const orderResult = await runStep(5, 'Customer Creates Order', 'createOrder', {
      userId: testData.customer.uid,
      storeId: testData.store.id,
      totalPrice: 42.99,
      deliveryFee: 5.99
    });
    
    // Store the order ID
    testData.customer.orderId = orderResult.orderId;
    
    // Step 6: Customer Gets Order Details
    await runStep(6, 'Customer Gets Order Details', 'getOrder', {
      orderId: testData.customer.orderId
    });
    
    console.log('\n✅ Customer Journey Completed Successfully');
    return testData.customer.orderId; // Return the order ID for the delivery agent journey
  } catch (error) {
    console.error('❌ Customer Journey Failed:', error);
    throw error;
  }
}

// Delivery Agent Journey Test
async function testDeliveryAgentJourney(orderId) {
  console.log('\n🧪 TESTING DELIVERY AGENT JOURNEY 🧪');
  
  try {
    // Step 1: Delivery Agent Sign Up
    const signupResult = await runStep(1, 'Delivery Agent Sign Up', 'createUser', {
      email: testData.deliveryAgent.email,
      password: testData.deliveryAgent.password,
      displayName: testData.deliveryAgent.displayName
    });
    
    // Store the delivery agent UID
    testData.deliveryAgent.uid = signupResult.userId;
    
    // Step 2: Delivery Agent Gets User Profile
    await runStep(2, 'Delivery Agent Gets User Profile', 'getUser', {
      firebaseUid: testData.deliveryAgent.uid
    });
    
    // Step 3: Delivery Agent Gets Pending Orders
    const pendingOrders = await runStep(3, 'Delivery Agent Gets Pending Orders', 'getOrdersByStatus', {
      status: 'PENDING'
    });
    
    // Use the order ID from the customer journey or from the pending orders list
    const targetOrderId = orderId || 
      (pendingOrders.orders && pendingOrders.orders.length > 0 ? 
        pendingOrders.orders[0].id : 'order-123');
    
    if (!orderId) {
      console.log(`No order ID provided from customer journey, using ${targetOrderId}`);
    }
    
    // Step 4: Delivery Agent Accepts Delivery
    await runStep(4, 'Delivery Agent Accepts Delivery', 'acceptDelivery', {
      orderId: targetOrderId,
      deliveryAgentId: testData.deliveryAgent.uid
    });
    
    // Step 5: Delivery Agent Confirms Pickup
    await runStep(5, 'Delivery Agent Confirms Pickup', 'confirmPickup', {
      orderId: targetOrderId,
      storeOwnerId: testData.store.id // Note: This should be a store owner ID, not store ID
    });
    
    // Step 6: Delivery Agent Confirms Delivery
    await runStep(6, 'Delivery Agent Confirms Delivery', 'confirmDelivery', {
      orderId: targetOrderId,
      deliveryAgentId: testData.deliveryAgent.uid
    });
    
    console.log('\n✅ Delivery Agent Journey Completed Successfully');
  } catch (error) {
    console.error('❌ Delivery Agent Journey Failed:', error);
    throw error;
  }
}

// Run the full test suite
async function runUserJourneyTests() {
  console.log('🚀 Starting User Journey Tests\n');
  
  try {
    // Run the customer journey first
    const orderId = await testCustomerJourney();
    
    // Then run the delivery agent journey with the order created in the customer journey
    await testDeliveryAgentJourney(orderId);
    
    console.log('\n✨ All User Journey Tests Completed Successfully');
  } catch (error) {
    console.error('\n❌ User Journey Tests Failed:', error);
  }
}

// Run the tests
runUserJourneyTests();