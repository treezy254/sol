import { FirestoreRepository } from "../utils/repositories.js";

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
      contents: { ...this },
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
      contents: { ...this },
    };
    repo.write("stores", data);
  }
}

class User {
  constructor(userId, name, email, walletAddress) {
    this.user_id = userId;
    this.name = name;
    this.email = email;
    this.wallet_address = walletAddress;
  }
}

class Order {
  constructor(orderId, userId, storeId, totalPrice, deliveryFee, status, timestamp, contractId = null, deliveryAgentId = null) {
    this.order_id = orderId;
    this.user_id = userId;
    this.store_id = storeId;
    this.total_price = totalPrice;
    this.delivery_fee = deliveryFee;
    this.status = status;
    this.timestamp = timestamp;
    this.contract_id = contractId;
    this.delivery_agent_id = deliveryAgentId;
  }

  create(repo) {
    const data = {
      document_tag: this.order_id,
      contents: { ...this },
    };
    repo.write("orders", data);
  }
}

export { Product, Store, User, Order };
