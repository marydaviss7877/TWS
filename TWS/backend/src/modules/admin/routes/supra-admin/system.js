/**
 * Supra Admin - System Monitoring, Settings, Debug, Infrastructure routes
 */

const { express, os, mongoose } = require('./shared');
const router = express.Router();
const {
  requirePlatformPermission,
  PLATFORM_PERMISSIONS,
  ErrorHandler,
  systemMonitoringService
} = require('./shared');

// System health
/**
 * @swagger
 * /api/supra-admin/system-health:
 *   get:
 *     summary: Get server system health snapshot
 *     description: >
 *       Combines live OS metrics (CPU, memory, load average, uptime) with
 *       systemMonitoringService.getSystemHealth() for service statuses. Returns 200 even
 *       on internal failure, with `success: false` and zeroed-out fields.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health snapshot (see `success` field for actual outcome)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     overall:
 *                       type: object
 *                     system:
 *                       type: object
 *                     performance:
 *                       type: object
 *                     services:
 *                       type: object
 *                     security:
 *                       type: object
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/system-health', requirePlatformPermission(PLATFORM_PERMISSIONS.ANALYTICS.SYSTEM_HEALTH), ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const health = await systemMonitoringService.getSystemHealth();
    const transformedHealth = {
      overall: { status: health.status || 'healthy', uptime: health.uptime || '0 days, 0 hours, 0 minutes', version: process.env.npm_package_version || '1.0.0', environment: process.env.NODE_ENV || 'development', lastRestart: new Date(Date.now() - os.uptime() * 1000).toISOString() },
      system: { cpu: { usage: health.cpuUsage || 0, cores: os.cpus().length, loadAverage: os.loadavg() || [0, 0, 0] }, memory: { total: os.totalmem(), used: os.totalmem() - os.freemem(), free: os.freemem(), percentage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100) }, disk: { total: health.diskUsage?.total ? parseFloat(String(health.diskUsage.total).replace(/[^0-9.]/g, '')) * (String(health.diskUsage.total).includes('GB') ? 1024 : String(health.diskUsage.total).includes('TB') ? 1024 * 1024 : 1) : 0, used: health.diskUsage?.used ? parseFloat(String(health.diskUsage.used).replace(/[^0-9.]/g, '')) * (String(health.diskUsage.used).includes('GB') ? 1024 : String(health.diskUsage.used).includes('TB') ? 1024 * 1024 : 1) : 0, free: health.diskUsage?.free ? parseFloat(String(health.diskUsage.free).replace(/[^0-9.]/g, '')) * (String(health.diskUsage.free).includes('GB') ? 1024 : String(health.diskUsage.free).includes('TB') ? 1024 * 1024 : 1) : 0, percentage: health.diskUsage?.percentage || 0 }, network: { bytesIn: 0, bytesOut: 0 } },
      performance: { responseTime: { avg: health.responseTime || 0, p95: Math.round((health.responseTime || 0) * 1.5), p99: Math.round((health.responseTime || 0) * 2) }, throughput: { requestsPerSecond: 0, errorsPerSecond: 0 } },
      services: { database: { status: health.services?.database?.status || 'unknown', responseTime: health.services?.database?.responseTime || 0, uptime: health.uptime || '0 days, 0 hours, 0 minutes' }, api: { status: health.services?.api?.status || 'healthy', responseTime: health.services?.api?.responseTime || 0, uptime: health.uptime || '0 days, 0 hours, 0 minutes' }, storage: { status: health.services?.storage?.status || 'healthy', responseTime: 0, uptime: health.uptime || '0 days, 0 hours, 0 minutes' }, redis: { status: health.services?.redis?.status || (process.env.REDIS_DISABLED === 'true' ? 'disabled' : 'unknown'), responseTime: health.services?.redis?.responseTime || 0, uptime: health.uptime || '0 days, 0 hours, 0 minutes' } },
      security: { sslCertificate: { expiresAt: null }, firewall: { blockedRequests: 0 }, vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 } },
      timestamp: health.timestamp || new Date()
    };
    if (!health || health.status === 'error') return res.json({ success: false, message: health?.error || 'Failed to fetch system health', data: transformedHealth });
    res.json({ success: true, data: transformedHealth });
  } catch (error) {
    console.error('Get system health error:', error);
    res.json({ success: false, message: 'Failed to fetch system health', error: error.message, data: { overall: { status: 'error', uptime: 'Unknown', version: process.env.npm_package_version || '1.0.0', environment: process.env.NODE_ENV || 'development' }, system: { cpu: { usage: 0, cores: 0, loadAverage: [0, 0, 0] }, memory: { total: 0, used: 0, free: 0, percentage: 0 }, disk: { total: 0, used: 0, free: 0, percentage: 0 }, network: { bytesIn: 0, bytesOut: 0 } }, services: { database: { status: 'unknown', responseTime: 0, uptime: 'Unknown' }, api: { status: 'unknown', responseTime: 0, uptime: 'Unknown' }, storage: { status: 'unknown', responseTime: 0, uptime: 'Unknown' }, redis: { status: 'unknown', responseTime: 0, uptime: 'Unknown' } }, timestamp: new Date() } });
  }
}));

/**
 * @swagger
 * /api/supra-admin/settings:
 *   get:
 *     summary: Get platform system settings
 *     description: Currently a hardcoded settings object, not read from a persisted config store.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 systemName:
 *                   type: string
 *                 version:
 *                   type: string
 *                 maintenanceMode:
 *                   type: boolean
 *                 registrationEnabled:
 *                   type: boolean
 *                 defaultTrialDays:
 *                   type: integer
 *                 maxTenantsPerAdmin:
 *                   type: integer
 *                 backupSettings:
 *                   type: object
 *                 emailSettings:
 *                   type: object
 *                 securitySettings:
 *                   type: object
 *                 notificationSettings:
 *                   type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/settings', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    const settings = { systemName: 'TWS - The Wolf Stack', version: '1.0.0', maintenanceMode: false, registrationEnabled: true, defaultTrialDays: 14, maxTenantsPerAdmin: 100, backupSettings: { frequency: 'daily', retention: 30 }, emailSettings: { enabled: true, smtpHost: 'smtp.gmail.com', smtpPort: 587, fromEmail: 'noreply@noreply.tws.enterprises' }, securitySettings: { passwordMinLength: 8, sessionTimeout: 24, ipWhitelist: [] }, notificationSettings: { emailNotifications: true, systemAlerts: true, maintenanceAlerts: true, securityAlerts: true } };
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

/**
 * @swagger
 * /api/supra-admin/settings:
 *   put:
 *     summary: Update platform system settings (stub)
 *     description: >
 *       Stub implementation — accepts any body and always reports success without
 *       persisting anything.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Reports success (no-op)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/settings', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.UPDATE), async (req, res) => {
  try {
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update settings' });
  }
});

/**
 * @swagger
 * /api/supra-admin/infrastructure/servers:
 *   get:
 *     summary: Get live server infrastructure metrics
 *     description: Reports metrics for the single Node.js process/host this backend is running on (via the `os` module), not a fleet of servers.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Server metrics (single-element array)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/infrastructure/servers', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    const hostname = os.hostname();
    const platform = os.platform();
    const arch = os.arch();
    const cpuCount = os.cpus().length;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memPercentage = Math.round(((totalMem - freeMem) / totalMem) * 100);
    const uptime = os.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const uptimeString = `${days} days, ${hours} hours, ${minutes} minutes`;
    const cpuUsage = await systemMonitoringService.getCPUUsage();
    const networkInterfaces = os.networkInterfaces();
    let ipAddress = 'N/A';
    for (const ifaceName in networkInterfaces) {
      for (const iface of networkInterfaces[ifaceName]) {
        if (!iface.internal && iface.family === 'IPv4') { ipAddress = iface.address; break; }
      }
      if (ipAddress !== 'N/A') break;
    }
    let status = 'online';
    if (cpuUsage > 90 || memPercentage > 90) status = 'warning';
    else if (cpuUsage > 95 || memPercentage > 95) status = 'critical';
    const server = { id: 1, name: `${hostname} (${platform})`, ipAddress, status, cpuUsage, memoryUsage: memPercentage, uptime: uptimeString, lastUpdated: new Date(), type: 'application', description: `TWS Backend Server - ${platform} ${arch} with ${cpuCount} CPU cores`, metrics: { cpu: cpuUsage, memory: memPercentage, responseTime: await systemMonitoringService.getAverageResponseTime(), uptime: uptimeString, totalMemory: systemMonitoringService.formatBytes(totalMem), usedMemory: systemMonitoringService.formatBytes(totalMem - freeMem), freeMemory: systemMonitoringService.formatBytes(freeMem) }, systemInfo: { platform, arch, cpuCount, nodeVersion: process.version, pid: process.pid } };
    res.json({ success: true, data: [server] });
  } catch (error) {
    console.error('Get servers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch servers', error: error.message });
  }
});

/**
 * @swagger
 * /api/supra-admin/infrastructure/databases:
 *   get:
 *     summary: Get live database (MongoDB) infrastructure metrics
 *     description: Pings the current mongoose connection and reports stats/response time; returns a disconnected/error entry if unreachable.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database metrics (single-element array)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/infrastructure/databases', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    const databases = [];
    if (mongoose.connection.readyState === 1) {
      const start = Date.now();
      try {
        await mongoose.connection.db.admin().ping();
        const responseTime = Date.now() - start;
        const dbStats = await mongoose.connection.db.stats();
        const connectionStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
        databases.push({ id: 1, name: `MongoDB - ${mongoose.connection.db.databaseName}`, type: 'MongoDB', status: 'healthy', connections: { active: mongoose.connection.db.serverConfig?.s?.pool?.totalConnectionCount || 0, max: 100 }, size: systemMonitoringService.formatBytes(dbStats.storageSize || 0), responseTime, lastUpdated: new Date(), description: `Primary MongoDB database at ${mongoose.connection.host}:${mongoose.connection.port}`, metrics: { connections: mongoose.connection.db.serverConfig?.s?.pool?.totalConnectionCount || 0, size: systemMonitoringService.formatBytes(dbStats.storageSize || 0), dataSize: systemMonitoringService.formatBytes(dbStats.dataSize || 0), responseTime, collections: dbStats.collections || 0, indexes: dbStats.indexes || 0, state: connectionStates[mongoose.connection.readyState] || 'unknown' } });
      } catch (err) {
        databases.push({ id: 1, name: 'MongoDB', type: 'MongoDB', status: 'error', connections: { active: 0, max: 100 }, size: 'N/A', responseTime: 0, lastUpdated: new Date(), description: 'MongoDB connection error', error: err.message });
      }
    } else {
      databases.push({ id: 1, name: 'MongoDB', type: 'MongoDB', status: 'disconnected', connections: { active: 0, max: 100 }, size: 'N/A', responseTime: 0, lastUpdated: new Date(), description: 'MongoDB is not connected', error: 'Database connection not established' });
    }
    res.json({ success: true, data: databases });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch databases', error: error.message });
  }
});

/**
 * @swagger
 * /api/supra-admin/infrastructure/apis:
 *   get:
 *     summary: List API groups and their (hardcoded) health metrics
 *     description: Response time, requests/min, and error rate are static placeholder values, not measured metrics.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API group list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/infrastructure/apis', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    const apiGroups = [{ name: 'Authentication API', endpoint: '/api/auth', description: 'User authentication' }, { name: 'User Management API', endpoint: '/api/users', description: 'User CRUD' }, { name: 'Supra Admin API', endpoint: '/api/supra-admin', description: 'Supra admin panel' }];
    const apis = apiGroups.map((api, i) => ({ id: i + 1, name: api.name, endpoint: api.endpoint, status: 'healthy', responseTime: { avg: 100, max: 200 }, requestsPerMinute: 50, errorRate: 0.5, lastUpdated: new Date(), description: api.description }));
    res.json({ success: true, data: apis });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch APIs', error: error.message });
  }
});

/**
 * @swagger
 * /api/supra-admin/infrastructure/security:
 *   get:
 *     summary: Get security component status (TLS, auth, DB, rate limiting)
 *     description: Derived from process.env flags and mongoose connection state; threat counts are always zero (not tracked).
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Security component list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/infrastructure/security', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    const tlsEnabled = process.env.NODE_ENV === 'production' || process.env.ENABLE_TLS === 'true';
    const mongoConnected = mongoose.connection.readyState === 1;
    const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED === 'true';
    const security = [
      { id: 1, name: 'TLS/SSL Encryption', type: 'Transport Security', status: tlsEnabled ? 'healthy' : 'warning', threatsBlocked: { today: 0, total: 0 }, lastScan: new Date(), lastUpdated: new Date(), description: tlsEnabled ? 'TLS encryption enabled' : 'TLS not enabled (dev)', metrics: { enabled: tlsEnabled } },
      { id: 2, name: 'Authentication System', type: 'Access Control', status: 'healthy', threatsBlocked: { today: 0, total: 0 }, lastScan: new Date(), lastUpdated: new Date(), description: 'JWT-based authentication', metrics: { method: 'JWT', rbacEnabled: true } },
      { id: 3, name: 'Database Security', type: 'Data Protection', status: mongoConnected ? 'healthy' : 'warning', threatsBlocked: { today: 0, total: 0 }, lastScan: new Date(), lastUpdated: new Date(), description: mongoConnected ? 'MongoDB secured' : 'MongoDB not connected', metrics: { connected: mongoConnected } },
      { id: 4, name: 'Rate Limiting', type: 'DoS Protection', status: rateLimitEnabled ? 'healthy' : 'warning', threatsBlocked: { today: 0, total: 0 }, lastScan: new Date(), lastUpdated: new Date(), description: rateLimitEnabled ? 'Rate limiting enabled' : 'Rate limiting disabled', metrics: { enabled: rateLimitEnabled } }
    ];
    res.json({ success: true, data: security });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch security components', error: error.message });
  }
});

/**
 * @swagger
 * /api/supra-admin/infrastructure/stats:
 *   get:
 *     summary: Get aggregate infrastructure health stats
 *     description: >
 *       Rolls up server/database/API/security counts into a single `overallHealth`
 *       verdict. On internal error still returns 200 with a best-effort fallback payload.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregate stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalServers:
 *                       type: integer
 *                     activeServers:
 *                       type: integer
 *                     totalDatabases:
 *                       type: integer
 *                     activeDatabases:
 *                       type: integer
 *                     apiEndpoints:
 *                       type: integer
 *                     healthyApis:
 *                       type: integer
 *                     securityComponents:
 *                       type: integer
 *                     healthySecurity:
 *                       type: integer
 *                     securityScore:
 *                       type: number
 *                     overallHealth:
 *                       type: string
 *                       enum: [critical, warning, good]
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/infrastructure/stats', requirePlatformPermission(PLATFORM_PERMISSIONS.ANALYTICS.READ), async (req, res) => {
  try {
    const activeServers = mongoose.connection.readyState === 1 ? 1 : 0;
    const tlsEnabled = process.env.NODE_ENV === 'production' || process.env.ENABLE_TLS === 'true';
    const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED === 'true';
    const healthySecurity = [tlsEnabled, true, mongoose.connection.readyState === 1, rateLimitEnabled].filter(Boolean).length;
    const stats = { totalServers: 1, activeServers, totalDatabases: 1, activeDatabases: activeServers, apiEndpoints: 12, healthyApis: 12, securityComponents: 4, healthySecurity, securityScore: (healthySecurity / 4) * 100, overallHealth: activeServers === 0 ? 'critical' : healthySecurity < 3 ? 'warning' : 'good', lastUpdated: new Date() };
    res.json({ success: true, data: stats });
  } catch (error) {
    res.json({ success: true, data: { totalServers: 1, activeServers: mongoose.connection.readyState === 1 ? 1 : 0, totalDatabases: 1, activeDatabases: mongoose.connection.readyState === 1 ? 1 : 0, apiEndpoints: 12, healthyApis: 12, securityComponents: 4, healthySecurity: 4, securityScore: 100, overallHealth: mongoose.connection.readyState === 1 ? 'good' : 'warning', lastUpdated: new Date() } });
  }
});

/**
 * @swagger
 * /api/supra-admin/infrastructure/monitoring:
 *   get:
 *     summary: List active monitoring integrations
 *     description: Mostly static entries describing the built-in monitoring service and health-check endpoint; adds a MongoDB entry only when connected.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monitoring integration list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/infrastructure/monitoring', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    const monitoring = [{ id: 1, name: 'System Monitoring Service', type: 'Metrics Collection', status: 'healthy', endpoints: 1, metricsCollected: 8, lastUpdated: new Date(), description: 'Built-in system monitoring', metrics: { endpoints: 1, metricsCollected: 8 } }, { id: 2, name: 'Health Check API', type: 'Health Monitoring', status: 'healthy', endpoints: 1, lastUpdated: new Date(), description: 'System health at /api/supra-admin/system-health', metrics: { endpoint: '/api/supra-admin/system-health' } }];
    if (mongoose.connection.readyState === 1) monitoring.push({ id: 3, name: 'MongoDB Monitoring', type: 'Database Monitoring', status: 'healthy', endpoints: 1, lastUpdated: new Date(), description: 'MongoDB monitoring', metrics: { connectionState: 'connected', database: mongoose.connection.db.databaseName } });
    res.json({ success: true, data: monitoring });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch monitoring infrastructure', error: error.message });
  }
});

/**
 * @swagger
 * /api/supra-admin/infrastructure/networks:
 *   get:
 *     summary: List host network interfaces
 *     description: Enumerates OS network interfaces via the `os` module; bandwidth/device counts are placeholder values, not measured.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Network interface list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/infrastructure/networks', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    const networks = [];
    const networkInterfaces = os.networkInterfaces();
    let networkId = 1;
    for (const ifaceName in networkInterfaces) {
      const interfaces = networkInterfaces[ifaceName];
      let hasExternal = false;
      let ipv4Address = null;
      for (const iface of interfaces) {
        if (!iface.internal) { hasExternal = true; if (iface.family === 'IPv4') ipv4Address = iface.address; }
      }
      if (hasExternal || interfaces.length > 0) {
        networks.push({ id: networkId++, name: `${ifaceName}`, type: interfaces[0].internal ? 'Internal' : 'LAN', status: 'healthy', bandwidth: { used: 0, total: 1000, unit: 'Mbps' }, devices: 1, lastUpdated: new Date(), description: 'Network interface', interfaceInfo: { name: ifaceName, ipv4: ipv4Address || 'N/A', internal: interfaces[0].internal } });
      }
    }
    if (networks.length === 0) networks.push({ id: 1, name: 'Local Network', type: 'LAN', status: 'healthy', bandwidth: { used: 0, total: 1000, unit: 'Mbps' }, devices: 1, lastUpdated: new Date(), description: 'Local network interface' });
    res.json({ success: true, data: networks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch network infrastructure', error: error.message });
  }
});

/**
 * @swagger
 * /api/supra-admin/infrastructure/servers/{id}/restart:
 *   post:
 *     summary: Restart a server (stub)
 *     description: Stub implementation — always reports success, does not actually restart any process.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Restart initiated (no-op)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 serverId:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/infrastructure/servers/:id/restart', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.MAINTENANCE), async (req, res) => {
  try {
    res.json({ message: 'Server restart initiated', serverId: parseInt(req.params.id) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to restart server' });
  }
});

/**
 * @swagger
 * /api/supra-admin/infrastructure/security/{id}/scan:
 *   post:
 *     summary: Run a security scan (stub)
 *     description: Stub implementation — always reports success, does not actually run a scan.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Scan initiated (no-op)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 securityId:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/infrastructure/security/:id/scan', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.UPDATE), async (req, res) => {
  try {
    res.json({ message: 'Security scan initiated', securityId: parseInt(req.params.id) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to run security scan' });
  }
});

module.exports = router;
