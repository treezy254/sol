/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });



import * as functions from "firebase-functions";
import { importService, createServiceDependencies, SERVICE_REGISTRY } from "./servicesRegistry";

export const api = functions.https.onRequest(async (req, res) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        res.set({
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type",
        });
        return res.status(204).send("");
    }

    res.set("Access-Control-Allow-Origin", "*");

    try {
        // Validate request method
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Only POST requests are supported" });
        }

        // Parse request body
        const body = req.body;
        if (!body) {
            return res.status(400).json({ error: "Invalid JSON payload" });
        }

        // Extract service name and payload
        const { service: serviceName, payload = {} } = body;

        // Validate service name
        if (!serviceName || !SERVICE_REGISTRY[serviceName]) {
            return res.status(400).json({ error: `Invalid service: ${serviceName}` });
        }

        // Import and instantiate service
        const [servicePath, methodName] = SERVICE_REGISTRY[serviceName];
        const ServiceClass = await importService(servicePath);

        // Inject dependencies
        const dependencies = createServiceDependencies();
        const serviceInstance = new ServiceClass(
            ...Object.keys(dependencies).filter((key) => servicePath.includes(key)).map((key) => dependencies[key])
        );

        // Call the appropriate method dynamically
        const result = await serviceInstance[methodName](payload);

        return res.status(200).json(result);
    } catch (error) {
        console.error(`API Error: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});
