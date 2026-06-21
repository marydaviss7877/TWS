#!/usr/bin/env node
/**
 * Health monitoring script
 * Continuously monitors application health
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const config = require('../src/config/health-check-config.json');
const baseUrl = process.env.BASE_URL || 'http://localhost:4000';

class HealthMonitor {
  constructor() {
    this.isHealthy = true;
    this.lastCheck = null;
    this.consecutiveFailures = 0;
    this.maxFailures = 3;
  }

  async checkHealth() {
    try {
      const response = await axios.get(`${baseUrl}/health`, { timeout: 5000 });
      
      if (response.status === 200) {
        this.isHealthy = true;
        this.consecutiveFailures = 0;
        console.log(`✅ Health check passed: ${new Date().toISOString()}`);
      } else {
        throw new Error(`Health check failed with status: ${response.status}`);
      }
    } catch (error) {
      this.consecutiveFailures++;
      this.isHealthy = false;
      console.error(`❌ Health check failed: ${error.message}`);
      
      if (this.consecutiveFailures >= this.maxFailures) {
        console.error(`🚨 Critical: ${this.consecutiveFailures} consecutive health check failures`);
        await this.sendAlert('critical', 'Health check failed multiple times');
      }
    }
    
    this.lastCheck = new Date();
  }

  async sendAlert(severity, message) {
    console.log(`🚨 ALERT [${severity.toUpperCase()}]: ${message}`);
    // Implement actual alerting logic here
  }

  start() {
    console.log('🔍 Starting health monitoring...');
    setInterval(() => this.checkHealth(), config.healthChecks.interval);
    this.checkHealth(); // Initial check
  }
}

const monitor = new HealthMonitor();
monitor.start();
