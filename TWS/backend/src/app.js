// TWS Backend Server - Fixed Version
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
// const rateLimit = require('express-rate-limit'); // Unused while rate limiting is disabled
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

console.log('🚀 Starting TWS Backend Server...');

// Load TWS Configuration System
const config = require('../config/environment');

// Basic Express setup
const app = express();
const server = createServer(app);

// SECURITY FIX: Reduce request size limit for better DoS protection
// Project creation endpoint has its own 1MB limit
app.use(express.json({ limit: '5mb' })); // Reduced from 10mb
app.use(express.urlencoded({ extended: true, limit: '5mb' })); // Reduced from 10mb

// Cookie parser for CSRF protection
app.use(cookieParser());

// Serve uploaded files (profile pics, org logos, etc.)
// Use process.cwd() so this matches the same base directory multer uses when saving files.
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Security middleware
app.use(helmet());
app.use(compression());
app.use(mongoSanitize());

// TLS verification for HIPAA compliance
const { verifyTLS, checkTLSConfiguration } = require('./middleware/security/tlsVerification');
app.use(verifyTLS);
checkTLSConfiguration();

// CORS configuration
app.use(cors({
  origin: config.get('CORS_ORIGIN') || 'http://localhost:3000',
  credentials: true
}));

// RATE LIMITING - DISABLED FOR NOW (re-enable for production security)
// const limiter = rateLimit({
//   windowMs: config.get('RATE_LIMIT_WINDOW_MS') || 15 * 60 * 1000,
//   max: config.get('RATE_LIMIT_MAX_REQUESTS') || 100,
//   standardHeaders: true,
//   legacyHeaders: false,
//   handler: (req, res) => {
//     res.status(429).json({
//       success: false,
//       message: 'Too many requests from this IP, please try again later.',
//       code: 'RATE_LIMIT_EXCEEDED',
//       retryAfter: Math.ceil((config.get('RATE_LIMIT_WINDOW_MS') || 15 * 60 * 1000) / 1000)
//     });
//   },
//   skip: (req) => req.path === '/health' || req.path === '/api/health'
// });
// const authLimiter = rateLimit({ ... });
// const signupLimiter = rateLimit({ ... });
// app.use('/api/', limiter);
// app.use('/api/auth/login', authLimiter);
// app.use('/api/auth/register', signupLimiter);
// app.use('/api/tenant-auth/login', authLimiter);

console.log('⚠️ Rate limiting DISABLED (development/convenience)');

// ✅ DATA LEAKAGE PREVENTION - Query Filter Middleware (Issue #9.2 Fix)
// Automatically injects orgId/tenantId filters into all queries to prevent data leakage
const { autoInjectOrgFilter } = require('./middleware/security/queryFilterMiddleware');
app.use('/api/', autoInjectOrgFilter);
console.log('✅ Query filter middleware ENABLED to prevent data leakage (Issue #9.2 Fix)');

// Logging
app.use(morgan('combined'));

// MongoDB connection
async function connectToMongoDB() {
  try {
    const mongoUri = (config.get('MONGO_URI') || '').replace(/\s+/g, '');

    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is not set');
    }
    
    console.log('🔗 Connecting to MongoDB...');
    console.log('📍 Connection string format:', mongoUri.includes('mongodb+srv://') ? 'MongoDB Atlas (SRV)' : 'Standard MongoDB');
    
    // Enhanced connection options for better error handling
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      retryWrites: true,
      retryReads: true,
      // Handle DNS resolution issues
      directConnection: false, // Use SRV records for Atlas
    };
    
    await mongoose.connect(mongoUri, connectionOptions);
    console.log('✅ MongoDB connected successfully');
    console.log('📊 Database:', mongoose.connection.db.databaseName);

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected - login will return 503 until reconnected');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Full error details:', error);
    
    // Provide helpful troubleshooting information
    if (error.code === 'ESERVFAIL') {
      console.error('\n🔍 Troubleshooting DNS Error (ESERVFAIL):');
      console.error('1. Check your internet connection');
      console.error('2. Verify MongoDB Atlas cluster is not paused');
      console.error('3. Check if your IP is whitelisted in MongoDB Atlas');
      console.error('4. Try using a standard connection string instead of SRV');
      console.error('5. Check DNS resolution: nslookup _mongodb._tcp.cluster0.rlfss7x.mongodb.net');
    } else if (error.message.includes('authentication failed')) {
      console.error('\n🔍 Authentication Error:');
      console.error('1. Verify your MongoDB username and password');
      console.error('2. Check if the database user has proper permissions');
    } else if (error.message.includes('timeout')) {
      console.error('\n🔍 Connection Timeout:');
      console.error('1. Check your network connection');
      console.error('2. Verify firewall settings');
      console.error('3. Check MongoDB Atlas network access settings');
    }
    
    throw error;
  }
}

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: config.get('SOCKET_CORS_ORIGIN') || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'], // polling kept as fallback for proxies
  pingInterval: 25000,
  pingTimeout: 60000,
  maxHttpBufferSize: 1e6 // 1MB max message size
});

// Socket.IO JWT authentication middleware
io.use(async (socket, next) => {
  try {
    // Accept token from handshake auth (preferred) or cookie
    let token = socket.handshake.auth?.token;

    if (!token && socket.handshake.headers.cookie) {
      const match = socket.handshake.headers.cookie
        .split(';')
        .find(c => c.trim().startsWith('accessToken='));
      if (match) token = match.split('=')[1]?.trim();
    }

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const jwtConfig = config.getJWTConfig();
    const decoded = jwt.verify(token, jwtConfig.secret, {
      issuer: 'tws-backend',
      audience: 'tws-frontend'
    });

    // Attach decoded user to socket; look up orgId from DB lazily on first room join
    socket.user = { userId: decoded.userId, orgId: decoded.orgId || null };
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
});

// On connection: auto-join the user's tenant room for scoped broadcasts
io.on('connection', async (socket) => {
  try {
    // If orgId not in token, fetch from User model
    if (!socket.user.orgId) {
      const User = require('./models/User');
      const user = await User.findById(socket.user.userId).select('orgId').lean();
      if (user?.orgId) socket.user.orgId = user.orgId.toString();
    }

    if (socket.user.orgId) {
      socket.join(`tenant:${socket.user.orgId}`);
    }

    socket.on('disconnect', () => {
      // room cleanup is automatic in Socket.IO
    });
  } catch (err) {
    socket.disconnect(true);
  }
});

// Basic routes
app.get('/health', (req, res) => {
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

app.get('/metrics', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Load routes progressively using new modular structure
async function loadRoutes() {
  console.log('📦 Loading routes...');

  // modules is required once — if this fails the server cannot serve any routes
  const modules = require('./modules');

  // ── Auth Module ──────────────────────────────────────────────────────────────
  try {
    console.log('📦 Loading Auth Module...');
    app.use('/api/auth', modules.auth.authentication);
    app.use('/api/users', modules.auth.users);

    const selfServeSignup = require('./routes/selfServeSignup');
    app.use('/api/signup', selfServeSignup);

    const emailValidation = require('./routes/emailValidation');
    app.use('/api/email', emailValidation);

    app.use('/api/sessions', modules.auth.sessions);
    app.use('/api/tenant-auth', modules.auth.tenantAuth);
    console.log('✅ Auth module routes loaded');
  } catch (error) {
    console.error('❌ Auth module failed to load:', error.message);
  }

  // ── Admin Module ─────────────────────────────────────────────────────────────
  try {
    console.log('📦 Loading Admin Module...');
    app.use('/api/admin', modules.admin.admin);
    app.use('/api/supra-admin', modules.admin.supraAdmin);
    app.use('/api/admin/moderation', modules.admin.moderation);
    app.use('/api/admin/attendance-panel', modules.admin.attendancePanel);
    app.use('/api/supra-admin/sessions', modules.admin.supraSessions);
    app.use('/api/supra-admin/tenant-erp', modules.admin.supraTenantERP);
    console.log('✅ Admin module routes loaded');
  } catch (error) {
    console.error('❌ Admin module failed to load:', error.message);
  }

  // ── Tenant Module ────────────────────────────────────────────────────────────
  try {
    console.log('📦 Loading Tenant Module...');

    // Helper: skip routes that failed to load instead of crashing
    const safeUse = (path, handler) => {
      if (typeof handler !== 'function') {
        console.warn(`⚠️  Skipping route ${path} — handler is ${typeof handler} (module may not have loaded)`);
        return;
      }
      app.use(path, handler);
    };

    safeUse('/api/tenant/management', modules.tenant.management);
    safeUse('/api/tenant/:tenantSlug/dashboard', modules.tenant.dashboard);
    safeUse('/api/tenant/switching', modules.tenant.switching);

    // Tenant info route (must come before organization for route precedence)
    const Tenant = require('./models/Tenant');
    const { authenticateToken } = require('./middleware/auth/auth');
    app.get('/api/tenant/:tenantSlug/info', authenticateToken, async (req, res) => {
      try {
        const { tenantSlug } = req.params;
        let tenant = await Tenant.findOne({ slug: tenantSlug })
          .select('name slug erpCategory erpModules educationConfig status subscription.plan');
        if (!tenant && /^[0-9a-f]{24}$/i.test(tenantSlug)) {
          tenant = await Tenant.findById(tenantSlug)
            .select('name slug erpCategory erpModules educationConfig status subscription.plan');
        }
        if (!tenant) {
          return res.status(404).json({ success: false, message: 'Tenant not found' });
        }
        res.json({
          success: true,
          data: {
            id: tenant._id,
            name: tenant.name,
            slug: tenant.slug,
            erpCategory: tenant.erpCategory,
            erpModules: tenant.erpModules,
            educationConfig: tenant.educationConfig || null,
            status: tenant.status,
            plan: tenant.subscription?.plan
          }
        });
      } catch (error) {
        console.error('❌ Error fetching tenant info:', error);
        res.status(500).json({ success: false, message: 'Error fetching tenant info', error: error.message });
      }
    });

    safeUse('/api/tenant/:tenantSlug/organization', modules.tenant.organization);
    safeUse('/api/tenant/:tenantSlug/software-house', modules.tenant.softwareHouse);
    safeUse('/api/tenant/:tenantSlug/permissions', modules.tenant.permissions);
    safeUse('/api/tenant/:tenantSlug/roles', modules.tenant.roles);
    safeUse('/api/tenant/:tenantSlug/departments', modules.tenant.departments);
    safeUse('/api/tenant/:tenantSlug/department-access', modules.tenant.departmentAccess);
    safeUse('/api/tenant/:tenantSlug/audit', modules.tenant.audit);
    console.log('✅ Tenant module routes loaded');
  } catch (error) {
    console.error('❌ Tenant module failed to load:', error.message);
  }

  // ── Core Module ──────────────────────────────────────────────────────────────
  try {
    console.log('📦 Loading Core Module...');
    app.use('/api/health', modules.core.health);
    app.use('/api/metrics', modules.core.metrics);
    app.use('/api/logs', modules.core.logs);
    app.use('/api/security', modules.core.security);
    app.use('/api/compliance', modules.core.compliance);
    app.use('/api/files', modules.core.files);
    app.use('/api/notifications', modules.core.notifications);
    app.use('/api/webhooks', modules.core.webhooks);
    console.log('✅ Core module routes loaded');
  } catch (error) {
    console.error('❌ Core module failed to load:', error.message);
  }

  // ── Business Module ──────────────────────────────────────────────────────────
  try {
    console.log('📦 Loading Business Module...');

    // Helper: skip routes that failed to load instead of crashing
    const safeBizUse = (path, handler) => {
      if (typeof handler !== 'function') {
        console.warn(`⚠️  Skipping route ${path} — handler is ${typeof handler} (module may not have loaded)`);
        return;
      }
      app.use(path, handler);
    };

    // Employee Management
    safeBizUse('/api/employees', modules.business.employees);

    // Attendance Management — single canonical endpoint
    safeBizUse('/api/attendance', modules.business.attendance);
    safeBizUse('/api/attendance-integration', modules.business.attendanceIntegration);

    // Financial Management
    safeBizUse('/api/payroll', modules.business.payroll);
    safeBizUse('/api/finance', modules.business.finance);
    safeBizUse('/api/billing', modules.business.billing);

    // Project Management
    safeBizUse('/api/projects', modules.business.projects);
    safeBizUse('/api/project-access', modules.business.projectAccess);
    safeBizUse('/api/tasks', modules.business.tasks);
    safeBizUse('/api/teams', modules.business.teams);
    safeBizUse('/api/time-tracking', modules.business.timeTracking);
    safeBizUse('/api/sprints', modules.business.sprints);
    safeBizUse('/api/development-metrics', modules.business.developmentMetrics);

    // Client Management
    safeBizUse('/api/clients', modules.business.clients);
    safeBizUse('/api/client-portal', modules.business.clientPortal);

    // Nucleus
    safeBizUse('/api/nucleus-templates', modules.business.nucleusTemplates);
    safeBizUse('/api/nucleus-pm', modules.business.nucleusPM);
    safeBizUse('/api/nucleus-analytics', modules.business.nucleusAnalytics);
    safeBizUse('/api/nucleus-batch', modules.business.nucleusBatch);

    // Workspace Management
    safeBizUse('/api/boards', modules.business.boards);
    safeBizUse('/api/cards', modules.business.cards);
    safeBizUse('/api/lists', modules.business.lists);
    safeBizUse('/api/workspaces', modules.business.workspaces);
    safeBizUse('/api/templates', modules.business.templates);

    // ERP Management
    safeBizUse('/api/erp-management', modules.business.erpManagement);
    safeBizUse('/api/erp-templates', modules.business.erpTemplates);
    safeBizUse('/api/master-erp', modules.business.masterERP);

    // Form & Resource Management
    safeBizUse('/api/form-management', modules.business.formManagement);
    safeBizUse('/api/resources', modules.business.resources);
    safeBizUse('/api/sales', modules.business.sales);
    safeBizUse('/api/partners', modules.business.partners);

    // Software House Specific
    safeBizUse('/api/software-house-roles', modules.business.softwareHouseRoles);
    console.log('✅ Business module routes loaded');
  } catch (error) {
    console.error('❌ Business module failed to load:', error.message);
  }

  // ── Monitoring Module ────────────────────────────────────────────────────────
  try {
    console.log('📦 Loading Monitoring Module...');
    app.use('/api/system-monitoring', modules.monitoring.system);
    app.use('/api/standalone-monitoring', modules.monitoring.standalone);
    console.log('✅ Monitoring module routes loaded');
  } catch (error) {
    console.error('❌ Monitoring module failed to load:', error.message);
  }

  // ── Integration Module ───────────────────────────────────────────────────────
  try {
    console.log('📦 Loading Integration Module...');
    app.use('/api/integrations', modules.integration.integrations);
    app.use('/api/platform-integration', modules.integration.platform);
    app.use('/api/timezone', modules.integration.timezone);
    app.use('/api/default-contacts', modules.integration.defaultContacts);
    console.log('✅ Integration module routes loaded');
  } catch (error) {
    console.error('❌ Integration module failed to load:', error.message);
  }

  console.log('📦 All route modules processed');
}

// Load middleware safely
async function loadMiddleware() {
  console.log('📦 Loading middleware...');
  
  try {
    // Load middleware safely
    const errorHandlerModule = require('./middleware/common/errorHandler');
    const errorHandler = errorHandlerModule.globalErrorHandler || errorHandlerModule.errorHandler;
    
    // Register middleware
    app.use(errorHandler);
    
    console.log('✅ Middleware loaded');
    
  } catch (error) {
    console.error('❌ Error loading middleware:', error.message);
    console.log('⚠️ Continuing without custom error handler');
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Error caught by middleware:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.isDevelopment() ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler will be registered after routes are loaded

// Start server function
async function startServer() {
  try {
    console.log('🚀 Starting server initialization...');
    
    // Initialize Cache Service (for Education ERP and general caching)
    try {
      const cacheService = require('./services/core/cache.service');
      await cacheService.initialize();
      console.log('✅ Cache Service initialized');
    } catch (error) {
      console.warn('⚠️ Cache Service initialization failed:', error.message);
      console.warn('⚠️ Continuing without cache (will use in-memory fallback)');
    }
    
    // Initialize Token Blacklist Service (for token revocation)
    try {
      const tokenBlacklistService = require('./services/auth/token-blacklist.service');
      console.log('✅ Token Blacklist Service initialized');
    } catch (error) {
      console.warn('⚠️ Token Blacklist Service initialization failed:', error.message);
    }
    
    // Connect to MongoDB before accepting requests (avoids 503 "Database connection not ready" on login)
    await connectToMongoDB();

    // Start job scheduler (uses node-cron, no Redis required)
    try {
      const scheduler = require('./jobs/scheduler');
      scheduler.start();
      console.log('✅ Job scheduler started (13 cron jobs active)');
    } catch (error) {
      console.warn('⚠️ Job scheduler failed to start:', error.message);
    }

    // Start BullMQ workers (only when Redis is available)
    if (process.env.REDIS_DISABLED !== 'true') {
      try {
        require('./workers/fileProcessor');
        require('./workers/notificationWorker');
        require('./workers/retentionWorker');
        console.log('✅ Background workers started (fileProcessor, notifications, retention)');
      } catch (error) {
        console.warn('⚠️ Background workers failed to start:', error.message);
      }
    } else {
      console.log('ℹ️  Background workers skipped (REDIS_DISABLED=true)');
    }

    // Load routes (these don't require MongoDB connection)
    await loadRoutes();

    // Load middleware
    await loadMiddleware();
    
    // Register 404 handler AFTER routes are loaded
    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
    
    // Start HTTP server
    const PORT = config.get('PORT') || 5000;
    server.listen(PORT, () => {
      console.log(`✅ TWS Backend Server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
      console.log(`🌍 Environment: ${config.get('NODE_ENV') || 'development'}`);
      console.log(`🔴 Redis: ${config.isRedisEnabled() ? 'Enabled' : 'Disabled'}`);
      console.log(`⚡ BullMQ: ${config.isBullMQEnabled() ? 'Enabled' : 'Disabled'}`);
      console.log(`🗄️  Cache Service: Initialized`);
    }).on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use.`);
        console.error(`💡 To fix this, either:`);
        console.error(`   1. Stop the process using port ${PORT}:`);
        console.error(`      Windows: netstat -ano | findstr :${PORT}`);
        console.error(`      Then: taskkill /PID <PID> /F`);
        console.error(`   2. Use a different port by setting PORT environment variable`);
        console.error(`      Example: PORT=5001 npm start`);
        process.exit(1);
      } else {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    console.error('Full error details:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');

  // Stop job scheduler
  try {
    const scheduler = require('./jobs/scheduler');
    scheduler.stop();
    console.log('✅ Job scheduler stopped');
  } catch (error) {
    console.warn('⚠️ Error stopping job scheduler:', error.message);
  }

  // Shutdown cache service
  try {
    const cacheService = require('./services/core/cache.service');
    await cacheService.shutdown();
    console.log('✅ Cache Service shut down');
  } catch (error) {
    console.warn('⚠️ Error shutting down cache service:', error.message);
  }

  await mongoose.disconnect();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  // Redis ECONNREFUSED is expected when REDIS_DISABLED=true — do not crash
  if (error.code === 'ECONNREFUSED' || (error.errors && error.errors.some && error.errors.some(e => e.code === 'ECONNREFUSED'))) {
    console.warn('⚠️  Redis connection refused (expected when REDIS_DISABLED=true) — continuing:', error.message);
    return;
  }
  console.error('🚨 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  const err = reason || {};
  // Redis / BullMQ ECONNREFUSED errors are expected when Redis is not provisioned.
  // Log a warning but do NOT crash the server.
  if (
    err.code === 'ECONNREFUSED' ||
    err.name === 'AggregateError' ||
    (err.errors && Array.isArray(err.errors) && err.errors.some(e => e.code === 'ECONNREFUSED')) ||
    (typeof err.message === 'string' && err.message.includes('ECONNREFUSED'))
  ) {
    console.warn('⚠️  Redis/BullMQ connection refused — server continues without Redis:', err.message || err);
    return;
  }
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Export for server.js
module.exports = { app, server, startServer, io, getIO: () => io };

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}