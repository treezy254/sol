/**
 * Seed Data Generator
 * Located at: /tests/seed.js
 * 
 * This script creates test data for 3 stores (automotive, computer/electronics, kitchen)
 * with 10+ products each and their respective store owners.
 * It also handles uploading product images and audio files to Firebase Storage.
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const FirestoreRepository = require('../utils/firestore');
const FirebaseStorage = require('../utils/firebase-storage');
const { handleService } = require('../api/index');

// Models
class Product {
  constructor(productId, storeId, name, description, price, category, subcategory, stock, tags, images, audio) {
    this.product_id = productId;
    this.store_id = storeId;
    this.name = name;
    this.description = description;
    this.price = price;
    this.category = category;
    this.subcategory = subcategory;
    this.stock = stock;
    this.tags = tags;
    this.images = images;
    this.audio = audio; // Path to audio file in Firebase storage
  }

  create(repo) {
    const data = {
      document_tag: this.product_id,
      contents: {...this},
    };
    repo.write("products", data);
  }
}

class Store {
  constructor(storeId, ownerId, storeName, description, location) {
    this.store_id = storeId;
    this.owner_id = ownerId;
    this.store_name = storeName;
    this.description = description;
    this.location = location; // Should be an object with latitude & longitude
  }

  create(repo) {
    const data = {
      document_tag: this.store_id,
      contents: {...this},
    };
    repo.write("stores", data);
  }
}

// Initialize repositories
const firestoreRepo = new FirestoreRepository();
const storageRepo = new FirebaseStorage();

// Path configurations
const ASSETS_DIR = path.join(__dirname, '../assets');
const IMAGES_DIR = path.join(ASSETS_DIR, 'images');
const AUDIO_PATH = path.join(ASSETS_DIR, 'audio', 'test-audio.wav');

/**
 * Uploads an image file to Firebase Storage
 * @param {string} filePath - Path to the image file
 * @param {string} productName - Name of the product (for storage path)
 * @param {string} storeCategory - Store category (automotive, tech, kitchen)
 * @returns {Promise<string>} - Download URL of the uploaded image
 */
async function uploadProductImage(filePath, productName, storeCategory) {
  try {
    const sanitizedName = productName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const storagePath = `products/${storeCategory}/${sanitizedName}.jpg`;
    const downloadUrl = await storageRepo.uploadFile(filePath, storagePath);
    return downloadUrl;
  } catch (error) {
    console.error(`Error uploading image for ${productName}:`, error);
    return null;
  }
}

/**
 * Uploads the audio file to Firebase Storage
 * @param {string} audioPath - Path to the audio file
 * @param {string} productName - Name of the product (for storage path)
 * @param {string} storeCategory - Store category (automotive, tech, kitchen)
 * @returns {Promise<string>} - Download URL of the uploaded audio
 */
async function uploadProductAudio(audioPath, productName, storeCategory) {
  try {
    const sanitizedName = productName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const storagePath = `audio/${storeCategory}/${sanitizedName}.wav`;
    const downloadUrl = await storageRepo.uploadFile(audioPath, storagePath);
    return downloadUrl;
  } catch (error) {
    console.error(`Error uploading audio for ${productName}:`, error);
    return null;
  }
}

/**
 * Finds the image file for a product
 * @param {string} productName - Name of the product
 * @returns {string|null} - Path to the image file or null if not found
 */
function findProductImagePath(productName) {
  const sanitizedName = productName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  // Try various image file extensions
  const possibleExtensions = ['.jpeg', '.jpg', '.png'];
  
  for (const ext of possibleExtensions) {
    const possiblePath = path.join(IMAGES_DIR, sanitizedName + ext);
    if (fs.existsSync(possiblePath)) {
      return possiblePath;
    }
  }
  
  // Try with exact product name
  for (const ext of possibleExtensions) {
    const possiblePath = path.join(IMAGES_DIR, productName + ext);
    if (fs.existsSync(possiblePath)) {
      return possiblePath;
    }
  }
  
  console.warn(`No image found for product: ${productName}`);
  return null;
}

// Create store owners
async function createStoreOwners() {
  console.log("Creating store owners...");
  
  const owners = [
    {
      email: "auto_store@example.com",
      password: "Password123!",
      displayName: "Auto Shop Owner"
    },
    {
      email: "tech_store@example.com",
      password: "Password123!",
      displayName: "Tech Store Owner"
    },
    {
      email: "kitchen_store@example.com",
      password: "Password123!",
      displayName: "Kitchen Store Owner"
    }
  ];

  const ownerIds = [];
  
  for (const owner of owners) {
    try {
      const result = await handleService("createUser", owner);
      if (result.success) {
        console.log(`Created store owner: ${owner.displayName} with ID: ${result.userId}`);
        ownerIds.push(result.userId);
      } else {
        console.error(`Failed to create store owner: ${owner.displayName}`, result.message);
      }
    } catch (error) {
      console.error(`Error creating store owner: ${owner.displayName}`, error);
    }
  }
  
  return ownerIds;
}

// Create stores
async function createStores(ownerIds) {
  console.log("Creating stores...");
  
  const storeData = [
    {
      ownerId: ownerIds[0],
      storeName: "AutoZoom Parts & Service",
      description: "Quality automotive parts, accessories, and repair services for all vehicle makes and models.",
      location: { latitude: 37.7749, longitude: -122.4194 },
      category: "automotive"
    },
    {
      ownerId: ownerIds[1],
      storeName: "TechHub Electronics",
      description: "Cutting-edge computers, gadgets, and electronic components for professionals and enthusiasts.",
      location: { latitude: 40.7128, longitude: -74.0060 },
      category: "tech"
    },
    {
      ownerId: ownerIds[2],
      storeName: "GourmetKitchen Essentials",
      description: "Premium kitchenware, appliances, and culinary tools for home chefs and cooking enthusiasts.",
      location: { latitude: 34.0522, longitude: -118.2437 },
      category: "kitchen"
    }
  ];

  const stores = [];
  
  for (const store of storeData) {
    try {
      const storeId = uuidv4();
      const newStore = new Store(
        storeId,
        store.ownerId,
        store.storeName,
        store.description,
        store.location
      );
      
      newStore.create(firestoreRepo);
      console.log(`Created store: ${store.storeName} with ID: ${storeId}`);
      stores.push({
        id: storeId,
        category: store.category,
        name: store.storeName
      });
    } catch (error) {
      console.error(`Error creating store: ${store.storeName}`, error);
    }
  }
  
  return stores;
}

// Create products for automotive store
async function createAutomotiveProducts(store) {
  console.log("Creating automotive products...");
  
  const products = [
    {
      name: "Premium Motor Oil 5W-30",
      description: "Synthetic blend motor oil for maximum engine protection and performance.",
      price: 29.99,
      category: "Engine",
      subcategory: "Oils & Fluids",
      stock: 100,
      tags: ["engine oil", "synthetic", "5W-30", "motor oil"]
    },
    {
      name: "Performance Air Filter",
      description: "High-flow air filter that increases horsepower and acceleration.",
      price: 49.99,
      category: "Engine",
      subcategory: "Filters",
      stock: 75,
      tags: ["air filter", "performance", "engine", "horsepower"]
    },
    {
      name: "Ceramic Brake Pads",
      description: "Low-dust ceramic brake pads for smooth, quiet braking and extended rotor life.",
      price: 89.99,
      category: "Brakes",
      subcategory: "Brake Pads",
      stock: 50,
      tags: ["brake pads", "ceramic", "front", "low dust"]
    },
    {
      name: "Heavy-Duty Car Battery",
      description: "Maintenance-free battery with 3-year warranty and 650 cold cranking amps.",
      price: 129.99,
      category: "Electrical",
      subcategory: "Batteries",
      stock: 30,
      tags: ["battery", "car battery", "heavy duty", "cold cranking amps"]
    },
    {
      name: "LED Headlight Conversion Kit",
      description: "Upgrade to bright white LED headlights with plug-and-play installation.",
      price: 149.99,
      category: "Lighting",
      subcategory: "Headlights",
      stock: 40,
      tags: ["headlights", "LED", "bright", "conversion kit"]
    },
    {
      name: "Windshield Wiper Blades",
      description: "All-season silicone wiper blades for streak-free visibility in any weather.",
      price: 39.99,
      category: "Exterior",
      subcategory: "Wipers",
      stock: 85,
      tags: ["wipers", "wiper blades", "silicone", "all-season"]
    },
    {
      name: "Premium Cabin Air Filter",
      description: "HEPA-grade cabin air filter that removes allergens, dust, and pollutants.",
      price: 24.99,
      category: "HVAC",
      subcategory: "Filters",
      stock: 60,
      tags: ["cabin filter", "air filter", "HEPA", "allergen"]
    },
    {
      name: "Complete Suspension Lift Kit",
      description: "2-inch suspension lift kit with shocks, springs, and hardware for trucks and SUVs.",
      price: 599.99,
      category: "Suspension",
      subcategory: "Lift Kits",
      stock: 15,
      tags: ["lift kit", "suspension", "truck", "SUV", "off-road"]
    },
    {
      name: "Professional OBD2 Scanner",
      description: "Advanced diagnostic scanner for engine codes, live data, and system monitoring.",
      price: 179.99,
      category: "Tools",
      subcategory: "Diagnostics",
      stock: 25,
      tags: ["OBD2", "scanner", "diagnostic", "code reader"]
    },
    {
      name: "All-Weather Floor Mats",
      description: "Custom-fit rubber floor mats to protect your vehicle's interior from dirt and moisture.",
      price: 89.99,
      category: "Interior",
      subcategory: "Floor Mats",
      stock: 45,
      tags: ["floor mats", "all-weather", "rubber", "interior protection"]
    },
    {
      name: "Premium Car Wax Kit",
      description: "Complete car detailing kit with carnauba wax, applicators, and microfiber towels.",
      price: 59.99,
      category: "Exterior",
      subcategory: "Detailing",
      stock: 35,
      tags: ["car wax", "detailing", "carnauba", "shine"]
    },
    {
      name: "Heavy-Duty Tow Strap",
      description: "30,000 lb capacity recovery strap with reinforced loops and protective sleeves.",
      price: 49.99,
      category: "Recovery",
      subcategory: "Towing",
      stock: 20,
      tags: ["tow strap", "recovery", "heavy duty", "off-road"]
    }
  ];

  for (const product of products) {
    try {
      const productId = uuidv4();
      
      // Find and upload product image
      const imagePath = findProductImagePath(product.name);
      let imageUrls = [];
      
      if (imagePath) {
        const imageUrl = await uploadProductImage(imagePath, product.name, store.category);
        if (imageUrl) {
          imageUrls.push(imageUrl);
        }
      }
      
      // Upload audio file
      const audioUrl = await uploadProductAudio(AUDIO_PATH, product.name, store.category);
      
      const newProduct = new Product(
        productId,
        store.id,
        product.name,
        product.description,
        product.price,
        product.category,
        product.subcategory,
        product.stock,
        product.tags,
        imageUrls,
        audioUrl
      );
      
      newProduct.create(firestoreRepo);
      console.log(`Created automotive product: ${product.name}`);
    } catch (error) {
      console.error(`Error creating product: ${product.name}`, error);
    }
  }
}

// Create products for tech/computer store
async function createTechProducts(store) {
  console.log("Creating tech/computer products...");
  
  const products = [
    {
      name: "Ultra-Performance Gaming Laptop",
      description: "17.3-inch gaming laptop with RTX 4080, AMD Ryzen 9, 32GB RAM, and 2TB SSD.",
      price: 2499.99,
      category: "Computers",
      subcategory: "Laptops",
      stock: 15,
      tags: ["laptop", "gaming", "RTX 4080", "Ryzen 9"]
    },
    {
      name: "4K Ultra HD Monitor",
      description: "Professional 4K monitor with 99% Adobe RGB, USB-C connectivity, and adjustable stand.",
      price: 699.99,
      category: "Displays",
      subcategory: "Monitors",
      stock: 25,
      tags: ["monitor", "4K", "32-inch", "Adobe RGB"]
    },
    {
      name: "Mechanical Gaming Keyboard",
      description: "RGB backlit mechanical keyboard with hot-swappable switches and programmable keys.",
      price: 149.99,
      category: "Peripherals",
      subcategory: "Keyboards",
      stock: 40,
      tags: ["keyboard", "mechanical", "RGB", "gaming"]
    },
    {
      name: "Wireless Gaming Mouse",
      description: "Ultra-precise wireless mouse with 25K DPI sensor, 10 programmable buttons, and 70-hour battery life.",
      price: 129.99,
      category: "Peripherals",
      subcategory: "Mice",
      stock: 45,
      tags: ["mouse", "wireless", "gaming", "DPI"]
    },
    {
      name: "Noise-Cancelling Headphones",
      description: "Studio-quality wireless headphones with adaptive noise cancellation and 30-hour battery life.",
      price: 349.99,
      category: "Audio",
      subcategory: "Headphones",
      stock: 30,
      tags: ["headphones", "noise-cancelling", "wireless", "studio"]
    },
    {
      name: "High-Performance Desktop PC",
      description: "Custom desktop with Intel i9, RTX 4070, 64GB RAM, and water cooling system.",
      price: 2199.99,
      category: "Computers",
      subcategory: "Desktops",
      stock: 10,
      tags: ["desktop", "PC", "Intel i9", "RTX 4070"]
    },
    {
      name: "External SSD 2TB",
      description: "Portable SSD with 2TB capacity, 2000MB/s read/write speeds, and USB-C connectivity.",
      price: 249.99,
      category: "Storage",
      subcategory: "External",
      stock: 35,
      tags: ["SSD", "external", "2TB", "portable"]
    },
    {
      name: "Wi-Fi 6E Mesh Router",
      description: "Tri-band mesh Wi-Fi system covering up to 7,500 sq ft with speeds up to 11 Gbps.",
      price: 399.99,
      category: "Networking",
      subcategory: "Routers",
      stock: 20,
      tags: ["router", "Wi-Fi 6E", "mesh", "networking"]
    },
    {
      name: "Professional Graphics Tablet",
      description: "Pen display tablet with 22-inch screen, 8192 pressure levels, and tilt recognition.",
      price: 899.99,
      category: "Peripherals",
      subcategory: "Drawing Tablets",
      stock: 15,
      tags: ["graphics tablet", "pen display", "drawing", "digital art"]
    },
    {
      name: "Smart Home Hub",
      description: "Central control hub compatible with all major smart home ecosystems and voice assistants.",
      price: 149.99,
      category: "Smart Home",
      subcategory: "Hubs",
      stock: 25,
      tags: ["smart home", "hub", "automation", "voice control"]
    },
    {
      name: "Professional Streaming Microphone",
      description: "Studio-quality USB condenser microphone with multiple polar patterns and zero-latency monitoring.",
      price: 159.99,
      category: "Audio",
      subcategory: "Microphones",
      stock: 30,
      tags: ["microphone", "streaming", "condenser", "USB"]
    },
    {
      name: "VR Gaming Headset",
      description: "High-resolution VR headset with motion controllers, external tracking, and immersive audio.",
      price: 599.99,
      category: "Gaming",
      subcategory: "VR",
      stock: 12,
      tags: ["VR", "headset", "gaming", "virtual reality"]
    }
  ];

  for (const product of products) {
    try {
      const productId = uuidv4();
      
      // Find and upload product image
      const imagePath = findProductImagePath(product.name);
      let imageUrls = [];
      
      if (imagePath) {
        const imageUrl = await uploadProductImage(imagePath, product.name, store.category);
        if (imageUrl) {
          imageUrls.push(imageUrl);
        }
      }
      
      // Upload audio file
      const audioUrl = await uploadProductAudio(AUDIO_PATH, product.name, store.category);
      
      const newProduct = new Product(
        productId,
        store.id,
        product.name,
        product.description,
        product.price,
        product.category,
        product.subcategory,
        product.stock,
        product.tags,
        imageUrls,
        audioUrl
      );
      
      newProduct.create(firestoreRepo);
      console.log(`Created tech product: ${product.name}`);
    } catch (error) {
      console.error(`Error creating product: ${product.name}`, error);
    }
  }
}

// Create products for kitchen store
async function createKitchenProducts(store) {
  console.log("Creating kitchen products...");
  
  const products = [
    {
      name: "Professional Chef Knife",
      description: "8-inch high-carbon stainless steel chef's knife with ergonomic handle and precision edge.",
      price: 149.99,
      category: "Cutlery",
      subcategory: "Knives",
      stock: 30,
      tags: ["knife", "chef's knife", "stainless steel", "professional"]
    },
    {
      name: "Stand Mixer",
      description: "5.5-quart stand mixer with 10 speeds, dough hook, whisk, and flat beater attachments.",
      price: 399.99,
      category: "Appliances",
      subcategory: "Mixers",
      stock: 20,
      tags: ["mixer", "stand mixer", "baking", "attachments"]
    },
    {
      name: "Cast Iron Dutch Oven",
      description: "6-quart enameled cast iron dutch oven for perfect roasts, stews, and bread baking.",
      price: 249.99,
      category: "Cookware",
      subcategory: "Dutch Ovens",
      stock: 25,
      tags: ["dutch oven", "cast iron", "enameled", "cookware"]
    },
    {
      name: "Sous Vide Precision Cooker",
      description: "Wi-Fi enabled sous vide immersion circulator with smartphone control and precision temperature.",
      price: 199.99,
      category: "Appliances",
      subcategory: "Specialty",
      stock: 15,
      tags: ["sous vide", "precision cooker", "smart", "immersion"]
    },
    {
      name: "Espresso Machine",
      description: "Semi-automatic espresso machine with built-in burr grinder and milk frother.",
      price: 699.99,
      category: "Appliances",
      subcategory: "Coffee & Espresso",
      stock: 10,
      tags: ["espresso", "coffee machine", "grinder", "milk frother"]
    },
    {
      name: "Non-Stick Cookware Set",
      description: "Professional-grade non-stick cookware set with pots, pans, and lids for all cooking needs.",
      price: 349.99,
      category: "Cookware",
      subcategory: "Sets",
      stock: 15,
      tags: ["cookware", "non-stick", "pots and pans", "set"]
    },
    {
      name: "Knife Sharpening System",
      description: "Multi-angle knife sharpening system with diamond stones and angle guides.",
      price: 129.99,
      category: "Cutlery",
      subcategory: "Accessories",
      stock: 25,
      tags: ["knife sharpener", "sharpening system", "diamond stones", "multi-angle"]
    },
    {
      name: "Digital Kitchen Scale",
      description: "Precision digital scale with 0.1g accuracy, tare function, and multiple measurement units.",
      price: 49.99,
      category: "Tools",
      subcategory: "Measuring",
      stock: 40,
      tags: ["scale", "digital", "measuring", "precision"]
    },
    {
      name: "Silicone Baking Mat Set",
      description: "Non-stick silicone baking mats with measurements and guidelines for perfect pastries.",
      price: 39.99,
      category: "Bakeware",
      subcategory: "Accessories",
      stock: 45,
      tags: ["baking mat", "silicone", "non-stick", "pastry"]
    },
    {
      name: "Professional Blender",
      description: "High-performance blender with 2.2 HP motor, variable speed control, and pulse function.",
      price: 499.99,
      category: "Appliances",
      subcategory: "Blenders",
      stock: 20,
      tags: ["blender", "professional", "high-performance", "variable speed"]
    },
    {
      name: "Ceramic Knife Set",
      description: "5-piece ceramic knife set with bamboo storage block and blade guards.",
      price: 199.99,
      category: "Cutlery",
      subcategory: "Knife Sets",
      stock: 25,
      tags: ["knife set", "ceramic", "block", "bamboo"]
    },
    {
      name: "Instant Pot Pressure Cooker",
      description: "Wi-Fi enabled multi-function pressure cooker with 14 cooking programs and app control.",
      price: 179.99,
      category: "Appliances",
      subcategory: "Pressure Cookers",
      stock: 30,
      tags: ["instant pot", "pressure cooker", "multi-function", "smart"]
    }
  ];

  for (const product of products) {
    try {
      const productId = uuidv4();
      
      // Find and upload product image
      const imagePath = findProductImagePath(product.name);
      let imageUrls = [];
      
      if (imagePath) {
        const imageUrl = await uploadProductImage(imagePath, product.name, store.category);
        if (imageUrl) {
          imageUrls.push(imageUrl);
        }
      }
      
      // Upload audio file
      const audioUrl = await uploadProductAudio(AUDIO_PATH, product.name, store.category);
      
      const newProduct = new Product(
        productId,
        store.id,
        product.name,
        product.description,
        product.price,
        product.category,
        product.subcategory,
        product.stock,
        product.tags,
        imageUrls,
        audioUrl
      );
      
      newProduct.create(firestoreRepo);
      console.log(`Created kitchen product: ${product.name}`);
    } catch (error) {
      console.error(`Error creating product: ${product.name}`, error);
    }
  }
}

// Main seed function
async function seedData() {
  try {
    console.log("Starting data seeding process...");
    
    // Check if assets directory exists
    if (!fs.existsSync(ASSETS_DIR)) {
      throw new Error(`Assets directory not found at: ${ASSETS_DIR}`);
    }
    
    if (!fs.existsSync(IMAGES_DIR)) {
      console.warn(`Images directory not found at: ${IMAGES_DIR}`);
    }
    
    if (!fs.existsSync(AUDIO_PATH)) {
      console.warn(`Audio file not found at: ${AUDIO_PATH}`);
    }
    
    // Create store owners and get their IDs
    const ownerIds = await createStoreOwners();
    if (ownerIds.length !== 3) {
      throw new Error("Failed to create all required store owners");
    }
    
    // Create stores and get their info
    const stores = await createStores(ownerIds);
    if (stores.length !== 3) {
      throw new Error("Failed to create all required stores");
    }
    
    // Create products for each store
    await createAutomotiveProducts(stores[0]);
    await createTechProducts(stores[1]);
    await createKitchenProducts(stores[2]);
    
    console.log("Data seeding completed successfully!");
    return { success: true };
  } catch (error) {
    console.error("Error during data seeding:", error);
    return { success: false, error: error.message };
  }
}

// Execute seed process if this script is run directly
if (require.main === module) {
  seedData()
    .then(result => {
      if (result.success) {
        console.log("Seed completed successfully");
        process.exit(0);
      } else {
        console.error("Seed failed:", result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error("Unhandled error during seeding:", error);
      process.exit(1);
    });
}

module.exports = { seedData };