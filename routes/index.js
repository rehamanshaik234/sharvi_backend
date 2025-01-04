module.exports = (() => {
    const express = require('express');
    const router = express.Router();

    // Import route files
    const userRoutes = require('./userRoutes');
    const productRoutes = require('./productRoutes');
    console.log('trtyu')
    // Attach routes
    router.use('/', userRoutes);
    router.use('/products', productRoutes);

    return router;
})();
