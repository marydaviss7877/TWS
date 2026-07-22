// TWS Backend Server - Merged Entry Point
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

console.log('🚀 Starting TWS Backend Server...');

// Load TWS Configuration System
const config = require('./src/config/environment');

// Basic Express setup
const app = express();
const server = createServer(app);

// Trust Railway's reverse proxy so express-rate-limit reads the real client IP
// from X-Forwarded-For instead of throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set('trust proxy', 1);

// SECURITY FIX: Reduce request size limit for better DoS protection
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Cookie parser for CSRF protection
app.use(cookieParser());

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Security middleware
app.use(helmet());
app.use(compression());
app.use(mongoSanitize());

// TLS verification middleware
const { verifyTLS, checkTLSConfiguration } = require('./src/middleware/security/tlsVerification');
app.use(verifyTLS);
checkTLSConfiguration();

// CORS configuration — allow root domain + all tenant subdomains
// Read env vars with .trim() so Railway trailing newlines/spaces don't break comparisons.
// Also strip protocol and trailing slashes so BASE_DOMAIN can be used as a bare hostname.
const baseDomain = (process.env.BASE_DOMAIN || 'tws.up.railway.app')
  .trim()
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '')
  .trim();
const explicitOrigin = (process.env.CORS_ORIGIN || '')
  .trim()
  .replace(/\/+$/, '')
  .trim();
const allowOrigin = (origin, callback) => {
  if (!origin) return callback(null, true); // server-to-server / health checks
  if (
    origin === 'http://localhost:4000' ||
    origin === `https://${baseDomain}` ||
    origin === `http://${baseDomain}` ||
    origin.endsWith(`.${baseDomain}`)
  ) {
    return callback(null, true);
  }
  // Fall back to explicit CORS_ORIGIN if set (e.g. a custom staging domain)
  if (explicitOrigin && origin === explicitOrigin) return callback(null, true);
  return callback(new Error(`CORS: origin ${origin} not allowed`));
};
app.use(cors({ origin: allowOrigin, credentials: true }));

const limiter = rateLimit({
  windowMs: config.get('RATE_LIMIT_WINDOW_MS') || 15 * 60 * 1000,
  max: config.get('RATE_LIMIT_MAX_REQUESTS') || 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((config.get('RATE_LIMIT_WINDOW_MS') || 15 * 60 * 1000) / 1000)
    });
  },
  skip: (req) => req.path === '/health' || req.path === '/api/health'
});
app.use('/api/', limiter);

console.log('✅ Global rate limiting ENABLED');

// Query Filter Middleware
const { autoInjectOrgFilter } = require('./src/middleware/security/queryFilterMiddleware');
app.use('/api/', autoInjectOrgFilter);
console.log('✅ Query filter middleware ENABLED to prevent data leakage (Issue #9.2 Fix)');

// Logging
app.use(morgan('combined'));

// Centralized newly-created routes
const centralizedRoutes = require('./src/routes/index');
app.use('/', centralizedRoutes);

// MongoDB connection
async function connectToMongoDB() {
  try {
    const mongoUri = (config.get('MONGO_URI') || '').replace(/\s+/g, '');

    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is not set');
    }
    
    console.log('🔗 Connecting to MongoDB...');
    console.log('📍 Connection string format:', mongoUri.includes('mongodb+srv://') ? 'MongoDB Atlas (SRV)' : 'Standard MongoDB');
    
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      retryWrites: true,
      retryReads: true,
      directConnection: false,
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
    throw error;
  }
}

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: allowOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
  maxHttpBufferSize: 1e6
});

io.use(async (socket, next) => {
  try {
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

    socket.user = { userId: decoded.userId, orgId: decoded.orgId || null };
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', async (socket) => {
  try {
    if (!socket.user.orgId) {
      const User = require('./src/models/users-auth/User');
      const user = await User.findById(socket.user.userId).select('orgId').lean();
      if (user?.orgId) socket.user.orgId = user.orgId.toString();
    }

    if (socket.user.orgId) {
      socket.join(`tenant:${socket.user.orgId}`);
    }
  } catch (err) {
    socket.disconnect(true);
  }
});

// Load routes progressively using new modular structure
async function loadRoutes() {
  console.log('📦 Loading routes...');
  const loadModule = (modulePath, label) => {
    try {
      return require(modulePath);
    } catch (error) {
      console.error(`❌ ${label} failed to load:`, error.message);
      return null;
    }
  };

  // ── Auth Module ──────────────────────────────────────────────────────────────
  try {
    console.log('📦 Loading Auth Module...');
    const authRoutes = loadModule('./src/routes/auth.routes', 'Auth module');
    if (!authRoutes) throw new Error('Auth routes unavailable');
    app.use('/api/auth', authRoutes.authentication);
    app.use('/api/users', authRoutes.users);

    const selfServeSignup = require('./src/routes/selfServeSignup');
    app.use('/api/signup', selfServeSignup);

    const emailValidation = require('./src/routes/emailValidation');
    app.use('/api/email', emailValidation);

    app.use('/api/sessions', authRoutes.sessions);
    app.use('/api/tenant-auth', authRoutes.tenantAuth);
  } catch (error) {
    console.error('❌ Auth module failed to load:', error.message);
  }

  // ── Admin Module ─────────────────────────────────────────────────────────────
  try {
    console.log('📦 Loading Admin Module...');
    const adminRoutes = loadModule('./src/routes/admin.routes', 'Admin module');
    if (!adminRoutes) throw new Error('Admin routes unavailable');
    app.use('/api/admin', adminRoutes.admin);
    app.use('/api/supra-admin', adminRoutes.supraAdmin);
    app.use('/api/admin/moderation', adminRoutes.moderation);
    app.use('/api/admin/attendance-panel', adminRoutes.attendancePanel);
    app.use('/api/supra-admin/sessions', adminRoutes.supraSessions);
    app.use('/api/supra-admin/tenant-erp', adminRoutes.supraTenantERP);
  } catch (error) {
    console.error('❌ Admin module failed to load:', error.message);
  }

  // ── Tenant Module ────────────────────────────────────────────────────────────
  try {
    console.log('📦 Loading Tenant Module...');
    const tenantRoutes = loadModule('./src/routes/tenant.module.routes', 'Tenant module');
    if (!tenantRoutes) throw new Error('Tenant routes unavailable');

    const safeUse = (path, handler) => {
      if (typeof handler !== 'function') return;
      app.use(path, handler);
    };

    safeUse('/api/tenant/management', tenantRoutes.management);
    safeUse('/api/tenant/:tenantSlug/dashboard', tenantRoutes.dashboard);
    safeUse('/api/tenant/switching', tenantRoutes.switching);
    safeUse('/api/tenant/:tenantSlug/organization', tenantRoutes.organization);
    safeUse('/api/tenant/:tenantSlug/software-house', tenantRoutes.softwareHouse);
    safeUse('/api/tenant/:tenantSlug/permissions', tenantRoutes.permissions);
    safeUse('/api/tenant/:tenantSlug/roles', tenantRoutes.roles);
    safeUse('/api/tenant/:tenantSlug/departments', tenantRoutes.departments);
    safeUse('/api/tenant/:tenantSlug/department-access', tenantRoutes.departmentAccess);
    safeUse('/api/tenant/:tenantSlug/audit', tenantRoutes.audit);
  } catch (error) {
    console.error('❌ Tenant module failed to load:', error.message);
  }

  // ── Core Module ──────────────────────────────────────────────────────────────
  try {
    console.log('📦 Loading Core Module...');
    const coreRoutes = loadModule('./src/routes/core.module.routes', 'Core module');
    if (!coreRoutes) throw new Error('Core routes unavailable');
    app.use('/api/health', coreRoutes.health);
    app.use('/api/metrics', coreRoutes.metrics);
    app.use('/api/logs', coreRoutes.logs);
    app.use('/api/security', coreRoutes.security);
    app.use('/api/compliance', coreRoutes.compliance);
    app.use('/api/files', coreRoutes.files);
    app.use('/api/notifications', coreRoutes.notifications);
    app.use('/api/webhooks', coreRoutes.webhooks);
  } catch (error) {
    console.error('❌ Core module failed to load:', error.message);
  }

  // ── Business Module ──────────────────────────────────────────────────────────
  try {
    console.log('📦 Loading Business Module...');
    const businessRoutes = loadModule('./src/routes/business.routes', 'Business module');
    if (!businessRoutes) throw new Error('Business routes unavailable');

    const safeBizUse = (path, handler) => {
      if (typeof handler !== 'function') return;
      app.use(path, handler);
    };

    safeBizUse('/api/employees', businessRoutes.employees);
    safeBizUse('/api/attendance', businessRoutes.attendance);
    safeBizUse('/api/attendance-integration', businessRoutes.attendanceIntegration);
    safeBizUse('/api/payroll', businessRoutes.payroll);
    safeBizUse('/api/finance', businessRoutes.finance);
    safeBizUse('/api/billing', businessRoutes.billing);
    safeBizUse('/api/projects', businessRoutes.projects);
    safeBizUse('/api/project-access', businessRoutes.projectAccess);
    safeBizUse('/api/tasks', businessRoutes.tasks);
    safeBizUse('/api/teams', businessRoutes.teams);
    safeBizUse('/api/time-tracking', businessRoutes.timeTracking);
    safeBizUse('/api/sprints', businessRoutes.sprints);
    safeBizUse('/api/development-metrics', businessRoutes.developmentMetrics);
    safeBizUse('/api/clients', businessRoutes.clients);
    safeBizUse('/api/client-portal', businessRoutes.clientPortal);
    safeBizUse('/api/nucleus-templates', businessRoutes.nucleusTemplates);
    safeBizUse('/api/nucleus-pm', businessRoutes.nucleusPM);
    safeBizUse('/api/nucleus-analytics', businessRoutes.nucleusAnalytics);
    safeBizUse('/api/nucleus-batch', businessRoutes.nucleusBatch);
    safeBizUse('/api/boards', businessRoutes.boards);
    safeBizUse('/api/cards', businessRoutes.cards);
    safeBizUse('/api/lists', businessRoutes.lists);
    safeBizUse('/api/workspaces', businessRoutes.workspaces);
    safeBizUse('/api/templates', businessRoutes.templates);
    safeBizUse('/api/erp-management', businessRoutes.erpManagement);
    safeBizUse('/api/erp-templates', businessRoutes.erpTemplates);
    safeBizUse('/api/master-erp', businessRoutes.masterERP);
    safeBizUse('/api/form-management', businessRoutes.formManagement);
    safeBizUse('/api/resources', businessRoutes.resources);
    safeBizUse('/api/sales', businessRoutes.sales);
    safeBizUse('/api/partners', businessRoutes.partners);
    safeBizUse('/api/software-house-roles', businessRoutes.softwareHouseRoles);
  } catch (error) {
    console.error('❌ Business module failed to load:', error.message);
  }

  // ── Monitoring Module ────────────────────────────────────────────────────────
  try {
    console.log('📦 Loading Monitoring Module...');
    const monitoringRoutes = loadModule('./src/routes/monitoring.routes', 'Monitoring module');
    if (!monitoringRoutes) throw new Error('Monitoring routes unavailable');
    app.use('/api/system-monitoring', monitoringRoutes.system);
    app.use('/api/standalone-monitoring', monitoringRoutes.standalone);
  } catch (error) {
    console.error('❌ Monitoring module failed to load:', error.message);
  }

  // ── Integration Module ───────────────────────────────────────────────────────
  try {
    console.log('📦 Loading Integration Module...');
    const integrationRoutes = loadModule('./src/routes/integration.routes', 'Integration module');
    if (!integrationRoutes) throw new Error('Integration routes unavailable');
    app.use('/api/integrations', integrationRoutes.integrations);
    app.use('/api/timezone', integrationRoutes.timezone);
    app.use('/api/default-contacts', integrationRoutes.defaultContacts);
  } catch (error) {
    console.error('❌ Integration module failed to load:', error.message);
  }

  console.log('📦 All route modules processed');
}

// Load middleware safely
async function loadMiddleware() {
  console.log('📦 Loading middleware...');
  try {
    const errorHandlerModule = require('./src/middleware/common/errorHandler');
    const errorHandler = errorHandlerModule.globalErrorHandler || errorHandlerModule.errorHandler;
    app.use(errorHandler);
  } catch (error) {
    console.error('❌ Error loading middleware:', error.message);
  }
}

app.use((err, req, res, next) => {
  console.error('🚨 Error caught by middleware:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.isDevelopment() ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

async function startServer() {
  console.log('🚀 Starting server initialization...');

  const PORT = config.get('PORT') || 5000;
  await new Promise((resolve, reject) => {
    server.listen(PORT, resolve).on('error', (error) => {
      reject(error);
    });
  });
  console.log(`✅ TWS Backend Server running on port ${PORT}`);

  (async () => {
    try {
      try {
        const cacheService = require('./src/services/core/cache.service');
        await cacheService.initialize();
      } catch (e) {}

      try {
        require('./src/services/auth/token-blacklist.service');
      } catch (e) {}

      await loadRoutes();
      await loadMiddleware();

      app.use('*', (req, res) => {
        res.status(404).json({
          error: 'Not Found',
          message: `Route ${req.originalUrl} not found`,
          timestamp: new Date().toISOString()
        });
      });

      console.log('✅ API routes registered');

      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      let mongoAttempts = 0;
      let mongoConnected = false;
      while (!mongoConnected) {
        try {
          mongoAttempts += 1;
          await connectToMongoDB();
          mongoConnected = true;
        } catch (error) {
          const delayMs = Math.min(30000, 2000 * Math.min(mongoAttempts, 10));
          await sleep(delayMs);
        }
      }

      try {
        const scheduler = require('./src/jobs/scheduler');
        scheduler.start();
      } catch (e) {}

      try {
        require('./src/workers/notificationWorker');
        require('./src/workers/retentionWorker');
      } catch (e) {}

      console.log('✅ Server fully initialized');
    } catch (error) {
      console.error('❌ Background initialization error:', error.message);
    }
  })();
}

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  try {
    const scheduler = require('./src/jobs/scheduler');
    scheduler.stop();
  } catch (error) {}
  try {
    const cacheService = require('./src/services/core/cache.service');
    await cacheService.shutdown();
  } catch (error) {}
  await mongoose.disconnect();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  if (error.code === 'ECONNREFUSED' || (error.errors && error.errors.some && error.errors.some(e => e.code === 'ECONNREFUSED'))) {
    return;
  }
  console.error('🚨 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  const err = reason || {};
  if (
    err.code === 'ECONNREFUSED' ||
    err.name === 'AggregateError' ||
    (err.errors && Array.isArray(err.errors) && err.errors.some(e => e.code === 'ECONNREFUSED')) ||
    (typeof err.message === 'string' && err.message.includes('ECONNREFUSED'))
  ) {
    return;
  }
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = { app, server, startServer, io, getIO: () => io };

if (require.main === module) {
  startServer();
}
