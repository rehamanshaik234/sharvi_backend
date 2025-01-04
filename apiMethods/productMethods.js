module.exports = (() => {
    return {
        getAllProducts: (req, res) => {
            res.json({ message: 'Fetched all products successfully' });
        },
        createProduct: (req, res) => {
            const { name, price } = req.body;
            res.json({ message: 'Product created', data: { name, price } });
        },
    };
})();
