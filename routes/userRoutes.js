module.exports = (() => {
    const express = require('express');
    const router = express.Router();
    const userHandler = require('../handlers/userHandler');

    // Define routes
    router.post('/sales-report', userHandler.getAllReports);
    console.log('enter route')
    // router.post('/', userHandler.createUser);

    return router;
})();
