const { exec } = require('child_process');
const app = require('./app');

const PORT = process.env.PORT || 5000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost'; // Bind to all interfaces in production
const SERVER_URL = `http://${HOST}:${PORT}`;
let PUBLIC_URL = '';

// Function to log server URLs
const showUrls = () => {
    console.log(`\n🚀 Server running at -- : ${SERVER_URL}`);
};

// Start Express server
const server = app.listen(PORT, HOST, () => {
    showUrls();
});

// Graceful shutdown
const cleanup = () => {
    server.close(() => {
        console.log('✅ Express server stopped.');
        process.exit(0);
    });
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
