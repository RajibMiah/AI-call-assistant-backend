const { exec } = require('child_process');
const app = require('./app');

const PORT = process.env.PORT || 5000;
const LOCAL_URL = `http://localhost:${PORT}`;
let PUBLIC_URL = "";

// Function to log server URLs
const showUrls = () => {
    console.log(`\n🚀 Server running locally at: ${LOCAL_URL}`);
    if (PUBLIC_URL) {
        console.log(`🌍 Public URL (HTTPS): ${PUBLIC_URL}`);
    } else {
        console.log("⚠️ Waiting for public HTTPS URL from localhost.run...");
    }
};

// Start Express server
const server = app.listen(PORT, () => {
    showUrls();
});

// Graceful shutdown
const cleanup = () => {
    console.log("\n🛑 Stopping the server and SSH tunnel...");
    server.close(() => {
        console.log("✅ Express server stopped.");
        process.exit(0);
    });
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
