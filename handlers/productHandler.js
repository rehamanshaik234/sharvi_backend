module.exports = (() => {
    const productMethods = require('../apiMethods/productMethods');

    return {
        getAllProducts: (req, res) => productMethods.getAllProducts(req, res),
        createProduct: (req, res) => productMethods.createProduct(req, res),
    };
})();
