module.exports = (() => {
    const express = require('express');
    const router = express.Router();
    const productHandler = require('../handlers/productHandler');

    // Define routes
    router.get('/', productHandler.getAllProducts);
    router.post('/', productHandler.createProduct);

    return router;
})();
