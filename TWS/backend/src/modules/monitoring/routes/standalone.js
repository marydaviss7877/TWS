const express = require('express');
const router = express.Router();
const StandaloneMonitoringService = require('../../../services/StandaloneMonitoringService');

// Initialize the standalone monitoring service
const monitoringService = new StandaloneMonitoringService();

// Start the monitoring service
monitoringService.start();

// Standalone monitoring simulation endpoints are intentionally unavailable in QA mode.
router.get('/metrics', (req, res) => {
  return res.status(501).json({
    success: false,
    code: 'FEATURE_UNAVAILABLE',
    message: 'Standalone monitoring metrics are unavailable in this environment.'
  });
});

// Get system health
router.get('/health', (req, res) => {
  return res.status(501).json({
    success: false,
    code: 'FEATURE_UNAVAILABLE',
    message: 'Standalone monitoring health is unavailable in this environment.'
  });
});

// Get alerts
router.get('/alerts', (req, res) => {
  return res.status(501).json({
    success: false,
    code: 'FEATURE_UNAVAILABLE',
    message: 'Standalone monitoring alerts are unavailable in this environment.'
  });
});

// Get logs
router.get('/logs', (req, res) => {
  return res.status(501).json({
    success: false,
    code: 'FEATURE_UNAVAILABLE',
    message: 'Standalone monitoring logs are unavailable in this environment.'
  });
});

// WebSocket endpoint for real-time updates
router.get('/ws', (req, res) => {
  res.json({ message: 'WebSocket endpoint available at /ws/monitoring' });
});

module.exports = router;
