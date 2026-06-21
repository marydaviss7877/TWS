#!/usr/bin/env node
/**
 * Metrics collection script
 * Collects and exports application metrics
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const config = require('../src/config/prometheus-config.json');
const baseUrl = process.env.BASE_URL || 'http://localhost:4000';

class MetricsCollector {
  constructor() {
    this.metrics = {};
  }

  async collectMetrics() {
    try {
      const response = await axios.get(`${baseUrl}/metrics`, { timeout: 5000 });
      const metricsData = response.data;
      
      // Parse and store metrics
      this.metrics = this.parsePrometheusMetrics(metricsData);
      
      console.log(`📊 Metrics collected: ${new Date().toISOString()}`);
      console.log(`   - Total metrics: ${Object.keys(this.metrics).length}`);
      
      // Save to file for external monitoring systems
      const metricsFile = path.join(__dirname, '..', 'logs', 'metrics.json');
      fs.writeFileSync(metricsFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        metrics: this.metrics
      }, null, 2));
      
    } catch (error) {
      console.error(`❌ Metrics collection failed: ${error.message}`);
    }
  }

  parsePrometheusMetrics(data) {
    const metrics = {};
    const lines = data.split('\n');
    
    lines.forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [name, value] = line.split(' ');
        if (name && value) {
          metrics[name] = parseFloat(value);
        }
      }
    });
    
    return metrics;
  }

  start() {
    console.log('📊 Starting metrics collection...');
    setInterval(() => this.collectMetrics(), 60000); // Every minute
    this.collectMetrics(); // Initial collection
  }
}

const collector = new MetricsCollector();
collector.start();
