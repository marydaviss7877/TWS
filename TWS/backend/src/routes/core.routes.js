const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const config = require('../config/environment');

router.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
  res.json({
    status: dbState === 1 ? 'OK' : 'DEGRADED',
    message: 'TWS Backend Server Running',
    timestamp: new Date().toISOString(),
    environment: config.get('NODE_ENV') || 'development',
    database: { status: dbStatus, readyState: dbState }
  });
});

router.get('/metrics', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
