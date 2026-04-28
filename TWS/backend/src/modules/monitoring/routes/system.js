const express = require('express');
const router = express.Router();
const SystemMonitoringService = require('../../../services/SystemMonitoringService');

// Use the singleton instance directly
const monitoringService = SystemMonitoringService;

// Middleware to ensure monitoring service is available
const ensureMonitoringService = (req, res, next) => {
  if (!monitoringService) {
    return res.status(503).json({
      success: false,
      message: 'Monitoring service is not available'
    });
  }
  req.monitoringService = monitoringService;
  next();
};

// Get system health overview
router.get('/health', ensureMonitoringService, async (req, res) => {
  try {
    const systemHealth = await req.monitoringService.getSystemHealth();
    res.json({
      success: true,
      data: systemHealth
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system health',
      error: error.message
    });
  }
});

// Get all metrics
router.get('/metrics', ensureMonitoringService, async (req, res) => {
  try {
    const systemHealth = await req.monitoringService.getSystemHealth();
    res.json({
      success: true,
      data: systemHealth
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metrics',
      error: error.message
    });
  }
});

// Get specific metric category
router.get('/metrics/:category', ensureMonitoringService, async (req, res) => {
  try {
    const { category } = req.params;
    const systemHealth = await req.monitoringService.getSystemHealth();
    
    let categoryData = {};
    switch (category) {
      case 'cpu':
        categoryData = { cpuUsage: systemHealth.cpuUsage };
        break;
      case 'memory':
        categoryData = { memoryUsage: systemHealth.memoryUsage };
        break;
      case 'disk':
        categoryData = { diskUsage: systemHealth.diskUsage };
        break;
      case 'network':
        categoryData = { networkStats: systemHealth.networkStats };
        break;
      case 'services':
        categoryData = { services: systemHealth.services };
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid metric category'
        });
    }
    
    res.json({
      success: true,
      data: {
        category: category,
        metrics: categoryData,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error(`Error fetching ${req.params.category} metrics:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch ${req.params.category} metrics`,
      error: error.message
    });
  }
});

// Get alerts
router.get('/alerts', ensureMonitoringService, (req, res) => {
  try {
    res.status(501).json({
      success: false,
      message: 'Monitoring alerts telemetry is not available yet.',
      code: 'FEATURE_UNAVAILABLE'
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
});

// Get logs
router.get('/logs', ensureMonitoringService, (req, res) => {
  try {
    res.status(501).json({
      success: false,
      message: 'Monitoring logs telemetry is not available yet.',
      code: 'FEATURE_UNAVAILABLE'
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch logs',
      error: error.message
    });
  }
});

// Get threats
router.get('/threats', ensureMonitoringService, (req, res) => {
  try {
    res.status(501).json({
      success: false,
      message: 'Monitoring threat telemetry is not available yet.',
      code: 'FEATURE_UNAVAILABLE'
    });
  } catch (error) {
    console.error('Error fetching threats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch threats',
      error: error.message
    });
  }
});

// Get system status
router.get('/status', ensureMonitoringService, async (req, res) => {
  try {
    const systemHealth = await req.monitoringService.getSystemHealth();
    
    res.json({
      success: true,
      data: {
        status: systemHealth.status,
        uptime: systemHealth.uptime,
        responseTime: systemHealth.responseTime,
        timestamp: systemHealth.timestamp
      }
    });
  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system status',
      error: error.message
    });
  }
});

module.exports = router;