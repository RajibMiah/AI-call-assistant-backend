const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// 🌍 Middleware
app.use(express.json()); // Parse JSON requests
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data
app.use(cors({ origin: '*', credentials: true })); // Enable CORS with credentials support
app.use(helmet()); // Security headers
app.use(morgan('dev')); // Logger
app.use(compression()); // Gzip compression
app.use(cookieParser()); // Cookie parsing

// 🚀 Routes
// app.use('/api/auth', require('./routes/auth.routes')); // Authentication routes
// app.use('/api/users', require('./routes/user.routes')); // User routes
app.use('/api/appointments', require('./routes/appointment.routes'));

// ✅ Fix the `/initiate` Route
app.get('/', (req, res) => {
    res.status(200).json({
        message: "Server responded"
    });
});

// ❌ Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Export the app instance for server.js
module.exports = app;
