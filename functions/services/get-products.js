class GetProducts {
  constructor(productRepo) {
    this.productRepo = productRepo;
  }

  async getStoreProducts(storeId, category = null, page = 1, pageSize = 20) {
    /**
         * Get all products for a specific store with optional filtering and pagination.
         */
    const filters = [{field: "store_id", op: "==", value: storeId}];
    if (category) {
      filters.push({field: "category", op: "==", value: category});
    }

    // Calculate pagination
    const start = (page - 1) * pageSize;

    const productsData = await this.productRepo.read({
      collection: "products",
      filters: filters,
    });

    // Apply pagination
    return productsData.slice(start, start + pageSize);
  }
}
