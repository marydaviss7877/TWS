#!/usr/bin/env node

/**
 * Monitoring and Logging Setup Script
 * Sets up comprehensive monitoring, logging, and health checks
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Supra-Admin Backend Monitoring & Logging');
console.log('=====================================================\n');

// Create monitoring configuration
const monitoringConfig = {
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  monitoring: {
    healthChecks: {
      enabled: true,
      interval: 30000, // 30 seconds
      endpoints: [
        '/health',
        '/api/supra-admin/system-health',
        '/metrics'
      ]
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      format: 'json',
      includeRequestId: true,
      includeUserId: true,
      includeTenantId: true
    },
    metrics: {
      enabled: true,
      collection: {
        requestDuration: true,
        requestCount: true,
        errorRate: true,
        memoryUsage: true,
        cpuUsage: true,
        databaseConnections: true
      }
    },
    alerts: {
      enabled: true,
      thresholds: {
        errorRate: 5, // 5%
        responseTime: 2000, // 2 seconds
        memoryUsage: 80, // 80%
        cpuUsage: 80 // 80%
      }
    }
  }
};

// Create logging configuration
const loggingConfig = {
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  logging: {
    transports: [
      {
        type: 'console',
        level: 'info',
        format: 'combined'
      },
      {
        type: 'file',
        level: 'error',
        filename: 'logs/error.log',
        maxsize: 10485760, // 10MB
        maxFiles: 5
      },
      {
        type: 'file',
        level: 'info',
        filename: 'logs/application.log',
        maxsize: 10485760, // 10MB
        maxFiles: 10
      }
    ],
    structured: {
      enabled: true,
      fields: [
        'timestamp',
        'level',
        'message',
        'requestId',
        'userId',
        'tenantId',
        'method',
        'url',
        'statusCode',
        'responseTime',
        'userAgent',
        'ip'
      ]
    }
  }
};

// Create health check configuration
const healthCheckConfig = {
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  healthChecks: {
    database: {
      enabled: true,
      timeout: 5000,
      retries: 3
    },
    redis: {
      enabled: process.env.REDIS_DISABLED !== 'true',
      timeout: 5000,
      retries: 3
    },
    externalServices: {
      enabled: true,
      services: [
        {
          name: 'email-service',
          url: process.env.EMAIL_SERVICE_URL || 'http://localhost:3001/health',
          timeout: 5000
        }
      ]
    },
    custom: [
      {
        name: 'tenant-isolation',
        description: 'Check tenant isolation integrity',
        timeout: 10000
      },
      {
        name: 'jwt-validation',
        description: 'Check JWT token validation',
        timeout: 5000
      }
    ]
  }
};

// Create Prometheus metrics configuration
const prometheusConfig = {
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  prometheus: {
    enabled: true,
    port: process.env.METRICS_PORT || 9090,
    path: '/metrics',
    collectDefaultMetrics: true,
    customMetrics: [
      {
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        type: 'counter',
        labelNames: ['method', 'route', 'status_code']
      },
      {
        name: 'http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        type: 'histogram',
        labelNames: ['method', 'route'],
        buckets: [0.1, 0.5, 1, 2, 5, 10]
      },
      {
        name: 'tenant_operations_total',
        help: 'Total number of tenant operations',
        type: 'counter',
        labelNames: ['tenant_id', 'operation', 'status']
      },
      {
        name: 'database_connections_active',
        help: 'Number of active database connections',
        type: 'gauge'
      },
      {
        name: 'jwt_tokens_issued_total',
        help: 'Total number of JWT tokens issued',
        type: 'counter',
        labelNames: ['user_type']
      }
    ]
  }
};

// Create alerting configuration
const alertingConfig = {
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  alerting: {
    channels: [
      {
        type: 'email',
        enabled: true,
        recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || ['admin@example.com'],
        smtp: {
          host: process.env.SMTP_HOST || 'localhost',
          port: process.env.SMTP_PORT || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        }
      },
    ],
    rules: [
      {
        name: 'high_error_rate',
        condition: 'error_rate > 5%',
        duration: '5m',
        severity: 'warning',
        description: 'Error rate is above 5% for 5 minutes'
      },
      {
        name: 'high_response_time',
        condition: 'avg_response_time > 2s',
        duration: '5m',
        severity: 'warning',
        description: 'Average response time is above 2 seconds for 5 minutes'
      },
      {
        name: 'high_memory_usage',
        condition: 'memory_usage > 80%',
        duration: '2m',
        severity: 'critical',
        description: 'Memory usage is above 80% for 2 minutes'
      },
      {
        name: 'database_connection_failure',
        condition: 'database_health == false',
        duration: '1m',
        severity: 'critical',
        description: 'Database connection failed'
      },
      {
        name: 'tenant_isolation_violation',
        condition: 'tenant_isolation_violations > 0',
        duration: '0m',
        severity: 'critical',
        description: 'Tenant isolation violation detected'
      }
    ]
  }
};

// Create Docker health check
const dockerHealthCheck = `#!/bin/bash
# Docker health check script for Supra-Admin Backend

set -e

# Check if the application is responding
curl -f http://localhost:4000/health || exit 1

# Check if metrics endpoint is responding
curl -f http://localhost:4000/metrics || exit 1

# Check if the process is running
pgrep -f "node.*server.js" || exit 1

echo "Health check passed"
exit 0
`;

// Create PM2 ecosystem file
const pm2Ecosystem = {
  apps: [
    {
      name: 'supra-admin-backend',
      script: 'server.js',
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      log_file: 'logs/combined.log',
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      watch: process.env.NODE_ENV === 'development',
      ignore_watch: ['node_modules', 'logs'],
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};

// Create systemd service file
const systemdService = `[Unit]
Description=Supra-Admin Backend API
After=network.target mongodb.service redis.service

[Service]
Type=simple
User=node
WorkingDirectory=/opt/supra-admin-backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=4000
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=supra-admin-backend

[Install]
WantedBy=multi-user.target
`;

// Write configuration files
const configs = [
  { name: 'monitoring-config.json', data: monitoringConfig },
  { name: 'logging-config.json', data: loggingConfig },
  { name: 'health-check-config.json', data: healthCheckConfig },
  { name: 'prometheus-config.json', data: prometheusConfig },
  { name: 'alerting-config.json', data: alertingConfig },
  { name: 'ecosystem.config.js', data: `module.exports = ${JSON.stringify(pm2Ecosystem, null, 2)}` },
  { name: 'docker-health-check.sh', data: dockerHealthCheck },
  { name: 'supra-admin-backend.service', data: systemdService }
];

console.log('📁 Creating configuration files...');

configs.forEach(({ name, data }) => {
  const filePath = path.join(__dirname, '..', 'src', 'config', name);
  const dir = path.dirname(filePath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  console.log(`✅ Created: config/${name}`);
});

// Create logs directory
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('✅ Created: logs/ directory');
}

// Create monitoring scripts
const monitoringScripts = [
  {
    name: 'health-monitor.js',
    content: `#!/usr/bin/env node
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
      const response = await axios.get(\`\${baseUrl}/health\`, { timeout: 5000 });
      
      if (response.status === 200) {
        this.isHealthy = true;
        this.consecutiveFailures = 0;
        console.log(\`✅ Health check passed: \${new Date().toISOString()}\`);
      } else {
        throw new Error(\`Health check failed with status: \${response.status}\`);
      }
    } catch (error) {
      this.consecutiveFailures++;
      this.isHealthy = false;
      console.error(\`❌ Health check failed: \${error.message}\`);
      
      if (this.consecutiveFailures >= this.maxFailures) {
        console.error(\`🚨 Critical: \${this.consecutiveFailures} consecutive health check failures\`);
        await this.sendAlert('critical', 'Health check failed multiple times');
      }
    }
    
    this.lastCheck = new Date();
  }

  async sendAlert(severity, message) {
    console.log(\`🚨 ALERT [\${severity.toUpperCase()}]: \${message}\`);
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
`
  },
  {
    name: 'metrics-collector.js',
    content: `#!/usr/bin/env node
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
      const response = await axios.get(\`\${baseUrl}/metrics\`, { timeout: 5000 });
      const metricsData = response.data;
      
      // Parse and store metrics
      this.metrics = this.parsePrometheusMetrics(metricsData);
      
      console.log(\`📊 Metrics collected: \${new Date().toISOString()}\`);
      console.log(\`   - Total metrics: \${Object.keys(this.metrics).length}\`);
      
      // Save to file for external monitoring systems
      const metricsFile = path.join(__dirname, '..', 'logs', 'metrics.json');
      fs.writeFileSync(metricsFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        metrics: this.metrics
      }, null, 2));
      
    } catch (error) {
      console.error(\`❌ Metrics collection failed: \${error.message}\`);
    }
  }

  parsePrometheusMetrics(data) {
    const metrics = {};
    const lines = data.split('\\n');
    
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
`
  }
];

console.log('\n📁 Creating monitoring scripts...');

monitoringScripts.forEach(({ name, content }) => {
  const filePath = path.join(__dirname, '..', 'scripts', name);
  fs.writeFileSync(filePath, content);
  console.log(`✅ Created: scripts/${name}`);
});

// Create environment template
const envTemplate = `# Supra-Admin Backend Environment Configuration
# Copy this file to .env and update the values

# Server Configuration
NODE_ENV=development
PORT=4000
BASE_URL=http://localhost:4000

# Database Configuration
MONGO_URI=mongodb://localhost:27017/tws

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_DISABLED=false
BULLMQ_DISABLED=false

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Security Configuration
ENCRYPTION_MASTER_KEY=your-encryption-master-key-here
BCRYPT_ROUNDS=12

# Email Configuration
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=noreply@example.com

# Monitoring Configuration
LOG_LEVEL=info
METRICS_PORT=9090
ENABLE_METRICS=true

# Alerting Configuration
ALERT_EMAIL_RECIPIENTS=admin@example.com

# External Services
EMAIL_SERVICE_URL=http://localhost:3001/health

# Feature Flags
ENABLE_NOTIFICATIONS=true
ENABLE_EMAIL_SERVICE=true
ENABLE_AWS=false
ENABLE_FIREBASE=false

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
SOCKET_CORS_ORIGIN=http://localhost:3000
`;

const envPath = path.join(__dirname, '..', '.env.template');
fs.writeFileSync(envPath, envTemplate);
console.log('✅ Created: .env.template');

console.log('\n📋 Monitoring Setup Summary');
console.log('===========================');
console.log('✅ Configuration files created in config/');
console.log('✅ Monitoring scripts created in scripts/');
console.log('✅ Environment template created');
console.log('✅ Logs directory created');
console.log('✅ PM2 ecosystem configuration created');
console.log('✅ Systemd service file created');
console.log('✅ Docker health check script created');

console.log('\n🚀 Next Steps:');
console.log('1. Copy .env.template to .env and configure your environment');
console.log('2. Install PM2: npm install -g pm2');
console.log('3. Start with PM2: pm2 start config/ecosystem.config.js');
console.log('4. Run health monitoring: node scripts/health-monitor.js');
console.log('5. Run metrics collection: node scripts/metrics-collector.js');
console.log('6. Set up Prometheus to scrape metrics from /metrics endpoint');

console.log('\n✅ Monitoring setup complete!');
