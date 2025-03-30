/**
 * Test script for all services in the API
 * 
 * To run:
 * 1. Make sure environment variables are set for Hedera credentials
 * 2. Run with Node.js: node test-services.js
 */

// Import the service handler
const { handleService } = require('../api/index');

// Mock data for testing
const mockData = {
  userId: 'test-user-123',
  firebaseUid: 'firebase-uid-123',
  storeId: 'store-123',
  storeOwnerId: 'store-owner-123',
  productId: 'product-123',
  orderId: 'order-123',
  deliveryAgentId: 'delivery-agent-123',
  email: 'test@example.com',
  password: 'securePassword123',
  displayName: 'Test User',
  totalPrice: 50.99,
  deliveryFee: 5.99,
  query: 'pizza',
};

// Helper function to run tests
async function runTest(testName, serviceName, params) {
  console.log(`\n🧪 Testing ${testName}...`);
  console.log(`Parameters:`, params);
  
  try {
    const result = await handleService(serviceName, params);
    console.log(`Result:`, result);
    
    if (result.success === false) {
      console.log(`❌ Test failed: ${result.message}`);
    } else {
      console.log(`✅ Test completed`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Test error:`, error);
    return { success: false, error: error.message };
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 Starting API Service Tests\n');
  
  // 1. User Management Tests
  await runTest('Create User', 'createUser', {
    email: mockData.email,
    password: mockData.password,
    displayName: mockData.displayName
  });
  
  await runTest('Get User', 'getUser', {
    firebaseUid: mockData.firebaseUid
  });
  
  // 2. Order Management Tests
  await runTest('Create Order', 'createOrder', {
    userId: mockData.userId,
    storeId: mockData.storeId,
    totalPrice: mockData.totalPrice,
    deliveryFee: mockData.deliveryFee
  });
  
  await runTest('Get Order', 'getOrder', {
    orderId: mockData.orderId
  });
  
  // 3. Product Services Tests
  await runTest('Get Product', 'getProduct', {
    productId: mockData.productId
  });
  
  await runTest('Search Products', 'searchProducts', {
    query: mockData.query,
    storeId: mockData.storeId,
    limit: 10
  });
  
  // 4. Store Services Tests
  await runTest('Get Store', 'getStore', {
    storeId: mockData.storeId
  });
  
  // 5. Order Fulfillment Tests
  await runTest('Confirm Pickup', 'confirmPickup', {
    orderId: mockData.orderId,
    storeOwnerId: mockData.storeOwnerId
  });
  
  await runTest('Accept Delivery', 'acceptDelivery', {
    orderId: mockData.orderId,
    deliveryAgentId: mockData.deliveryAgentId
  });
  
  await runTest('Confirm Delivery', 'confirmDelivery', {
    orderId: mockData.orderId,
    deliveryAgentId: mockData.deliveryAgentId
  });
  
  console.log('\n✨ All tests completed');
}

// Run all tests
runAllTests().catch(error => {
  console.error('Error running tests:', error);
});