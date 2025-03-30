const {Location} = require("../models/Location");
const {Store} = require("../models/Store");

class GetStore {
  constructor(repo) {
    this.repo = repo;
  }

  async getStore(storeId) {
    /**
     * Get details about a specific store.
     */
    const storeData = await this.repo.read({
      collection: "stores",
      identifier: storeId,
    });

    if (!storeData || storeData.length === 0) {
      return null;
    }

    // Convert location object
    storeData[0].location = new Location(storeData[0].location);
    return new Store(storeData[0]);
  }

  async getStoresByOwner(ownerId) {
    /**
     * Get all stores owned by a specific user.
     */
    const storesData = await this.repo.read({
      collection: "stores",
      filters: [{field: "owner_id", op: "==", value: ownerId}],
    });

    return storesData.map((storeData) => {
      storeData.location = new Location(storeData.location);
      return new Store(storeData);
    });
  }
}

module.exports = GetStore;
