const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const connectDB = require('./config/db');

// Initialize App
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load Routes
app.use('/api', routes);

// Database Connection
// connectDB();

// Server Initialization
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
