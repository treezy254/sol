class GetProduct {
    constructor(productRepo) {
        this.productRepo = productRepo;
    }

    async getProduct(productId) {
        /**
         * Get details about a specific product.
         */
        const productData = await this.productRepo.read({
            collection: "products",
            identifier: productId
        });

        return productData.length > 0 ? productData[0] : null;
    }
}
