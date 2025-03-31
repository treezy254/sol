/**
 * Service Handler - Manages routing to appropriate service implementations
 * Located at: /api/index.js
 */

// Import service classes
const CreateUserService = require("../services/create-user");
const {GetUser} = require("../services/get-user");
const CreateOrder = require("../services/create-order");
const CreateProduct = require("../services/create-product");
const CreateStore = require("../services/create-store");
const GetOrder = require("../services/get-order");
const GetProduct = require("../services/get-product");
const ConfirmPickup = require("../services/confirm-pickup");
const ConfirmDelivery = require("../services/confirm-delivery");
const AcceptDelivery = require("../services/accept-delivery");
const GetStore = require("../services/get-store");
const ProductSearchService = require("../services/search-products");

// Import repositories and clients
const FirestoreRepository = require("../utils/firestore");
const {HederaClient} = require("../utils/hedera");

// Your Hedera operator credentials - should be loaded from environment variables
const HEDERA_OPERATOR_ID = process.env.HEDERA_OPERATOR_ID;
const HEDERA_OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY;

// Create instances of shared dependencies
const firestoreRepo = new FirestoreRepository();
const hederaClient = new HederaClient(HEDERA_OPERATOR_ID, HEDERA_OPERATOR_KEY);

// Service registry - maps service names to their handler functions
const serviceRegistry = {
  // User management services
  "createUser": async (params) => {
    const {email, password, displayName} = params;
    const service = new CreateUserService(HEDERA_OPERATOR_ID, HEDERA_OPERATOR_KEY);
    return await service.execute(email, password, displayName);
  },

  "getUser": async (params) => {
    const {firebaseUid} = params;
    const service = new GetUser(HEDERA_OPERATOR_ID, HEDERA_OPERATOR_KEY);
    return await service.execute(firebaseUid);
  },

  // Order management services
  "createOrder": async (params) => {
    const {userId, storeId, totalPrice, deliveryFee} = params;
    const service = new CreateOrder(firestoreRepo, hederaClient);
    return await service.execute(userId, storeId, totalPrice, deliveryFee);
  },

  "getOrder": async (params) => {
    const {orderId} = params;
    const service = new GetOrder(firestoreRepo);
    return await service.byId(orderId);
  },

  "getOrders": async (params) => {
    const {status} = params;
    const service = new GetOrder(firestoreRepo);
    return await service.filterByStatus(status);
  },

  // Product services
  "createProduct": async (params) => {
    const { tempImagePaths, tempAudioPath, metadata } = params;
    const geminiHandler = new GeminiHandler();
    const embeddingService = new EmbeddingService();
    const storageRepo = new FirebaseStorage();
    const service = new ProductCreationService(geminiHandler, embeddingService, firestoreRepo, storageRepo);
    return await service.createProduct(tempImagePaths, tempAudioPath, metadata);
  },

  "getProduct": async (params) => {
    const {productId} = params;
    const productRepo = firestoreRepo; // Using the same firestore repo, adjust if needed
    const service = new GetProduct(productRepo);
    return await service.getProduct(productId);
  },

  // Store services
  "createStore": async (params) => {
    const { storeData } = params;
    const service = new CreateStore(firestoreRepo);
    return await service.createStore(storeData);
  },
  
  "getStore": async (params) => {
    const {storeId} = params;
    const service = new GetStore(firestoreRepo);
    return await service.getStore(storeId);
  },

  // Product search service
  "searchProducts": async (params) => {
    const {query, storeId, limit = 20} = params;
    const service = new ProductSearchService();
    return await service.searchProducts(query, storeId, limit);
  },

  // Order fulfillment services
  "confirmPickup": async (params) => {
    const {orderId, storeOwnerId} = params;
    const service = new ConfirmPickup(hederaClient, firestoreRepo);
    return await service.execute(orderId, storeOwnerId);
  },

  "confirmDelivery": async (params) => {
    const {orderId, deliveryAgentId} = params;
    const service = new ConfirmDelivery(hederaClient, firestoreRepo);
    return await service.execute(orderId, deliveryAgentId);
  },

  "acceptDelivery": async (params) => {
    const {orderId, deliveryAgentId} = params;
    const service = new AcceptDelivery(hederaClient, firestoreRepo);
    return await service.execute(orderId, deliveryAgentId);
  },
};

/**
 * Main service handler function
 * @param {string} serviceName - The name of the service to execute
 * @param {object} params - Parameters to pass to the service
 * @return {object} Result of the service execution
 */
exports.handleService = async (serviceName, params = {}) => {
  try {
    // Check if the requested service exists
    if (!serviceRegistry[serviceName]) {
      return {
        success: false,
        message: `Service '${serviceName}' not found`,
      };
    }

    // Execute the service with the provided parameters
    const result = await serviceRegistry[serviceName](params);
    return result;
  } catch (error) {
    console.error(`Error executing service '${serviceName}':`, error);
    return {
      success: false,
      message: "Error executing service",
      error: error.message,
    };
  }
};
