import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FirestoreRepository } from "./repositories/firestore_repository";
import { HederaClient } from "./utils/hedera";
import { config } from "dotenv";

// Load environment variables
config();

// Initialize Firebase app
admin.initializeApp();

// Service Registry with dynamic import paths
const SERVICE_REGISTRY = {
    accept_delivery: ["./services/accept_delivery/AcceptDelivery", "execute"],
    create_product: ["./services/create_product/CreateProduct", "execute"],
    create_store: ["./services/create_store/CreateStore", "createStore"],
    create_user: ["./services/create_user/CreateUser", "execute"],
    get_product: ["./services/get_product/GetProduct", "getProduct"],
    get_store: ["./services/get_store/GetStore", "getStore"],
    get_store_products: ["./services/get_products/GetProducts", "getStoreProducts"],
    get_user: ["./services/get_user/GetUser", "execute"],
    search_products: ["./services/search_products/ProductSearchService", "searchProducts"],
    create_order: ["./services/create_order/CreateOrder", "execute"],
    get_order_by_id: ["./services/get_order/GetOrder", "getOrderById"],
    get_order_by_user: ["./services/get_order/GetOrder", "getOrderByUser"],
    get_order_by_store: ["./services/get_order/GetOrder", "getOrderByStore"],
    get_contracts: ["./services/get_contracts/GetContracts", "getAvailableContracts"],
    select_contract: ["./services/get_contracts/GetContracts", "selectContract"],
    confirm_pickup: ["./services/confirm_pickup/ConfirmPickup", "execute"],
    confirm_delivery: ["./services/confirm_delivery/ConfirmDelivery", "execute"],
};

async function importService(servicePath) {
    try {
        const [modulePath, className] = servicePath;
        const module = await import(modulePath);
        return module[className];
    } catch (error) {
        console.error(`Error importing service ${servicePath}: ${error.message}`);
        throw new Error(`Service not found: ${servicePath}`);
    }
}

function createServiceDependencies() {
    return {
        firestoreRepo: new FirestoreRepository(),
        hederaClient: new HederaClient(
            process.env.HEDERA_OPERATOR_ID,
            process.env.HEDERA_OPERATOR_KEY
        ),
    };
}

export { importService, createServiceDependencies };
