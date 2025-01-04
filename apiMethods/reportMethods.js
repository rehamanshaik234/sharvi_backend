const axios = require('axios')

module.exports = (() => {
    return {
        getAllReports: async (req, res) => {
           
            
           
        },
        createUser: (req, res) => {
            const { name, email } = req.body;
            res.json({ message: 'User created', data: { name, email } });
        },
    };
})();
