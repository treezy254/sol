/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const serviceHandler = require("./api");

// API endpoint that handles all service requests
exports.api = onRequest(async (request, response) => {
  try {
    // Set CORS headers
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    // Only allow POST requests for API calls
    if (request.method !== 'POST') {
      return response.status(405).json({
        success: false,
        message: "Method not allowed. Please use POST."
      });
    }

    const { service, params } = request.body;

    if (!service) {
      return response.status(400).json({
        success: false,
        message: "Missing required parameter: service"
      });
    }

    logger.info(`API request for service: ${service}`, { 
      service, 
      params: JSON.stringify(params),
      structuredData: true 
    });

    // Process the service request through our handler
    const result = await serviceHandler.handleService(service, params);
    
    // Return the response
    response.status(200).json(result);
  } catch (error) {
    logger.error("Error processing API request:", error);
    response.status(500).json({
      success: false,
      message: "An error occurred while processing your request",
      error: error.message
    });
  }
});