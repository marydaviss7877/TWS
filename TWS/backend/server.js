// Main server entry point
const { app, server, startServer } = require('./src/app.js');

// Note: uncaughtException and unhandledRejection are handled in src/app.js
// with Redis-aware suppression. Do not add handlers here that call process.exit(1)
// unconditionally — they fire before app.js handlers and can kill the process on
// expected errors (e.g., Redis ECONNREFUSED when Redis is not provisioned).

// Start the server
startServer();
