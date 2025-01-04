module.exports = (() => {
    const userMethods = require('../apiMethods/reportMethods');
   
    return {
        getAllReports: (req, res) => userMethods.getAllReports(req, res),

        // createUser: (req, res) => userMethods.createUser(req, res),
    };
})();
