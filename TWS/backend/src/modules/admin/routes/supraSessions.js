const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../../../middleware/auth/auth');
const { requirePlatformPermission, PLATFORM_PERMISSIONS } = require('../../../middleware/auth/platformRBAC');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const Session = require('../../../models/core/Session');
const Department = require('../../../models/org/Department');
const DepartmentAccess = require('../../../models/org/DepartmentAccess');

// Apply authentication middleware (authorization is handled per-route with granular permissions)
router.use(authenticateToken);

const RANGE_MS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000
};

// Resolve a timeRange query param into the current window plus the
// immediately preceding window of equal length (used for growth %).
function resolveRange(timeRange) {
  const span = RANGE_MS[timeRange] || RANGE_MS['7d'];
  const now = new Date();
  const since = new Date(now.getTime() - span);
  const prevSince = new Date(since.getTime() - span);
  return { now, since, prevSince };
}

function growthPct(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

// Max number of sessions concurrently open, via a sweep over start/end events.
function peakConcurrency(sessions, now) {
  const events = [];
  for (const s of sessions) {
    const start = new Date(s.loginTime).getTime();
    const end = new Date(s.logoutTime || (s.status === 'active' ? now : s.expiresAt) || now).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;
    events.push([start, 1], [end, -1]);
  }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let concurrent = 0;
  let peak = 0;
  for (const [, delta] of events) {
    concurrent += delta;
    if (concurrent > peak) peak = concurrent;
  }
  return peak;
}

function averageDurationMinutes(sessions, now) {
  if (!sessions.length) return 0;
  const totalMs = sessions.reduce((sum, s) => {
    const end = new Date(s.logoutTime || (s.status === 'active' ? now : s.expiresAt) || now).getTime();
    const start = new Date(s.loginTime).getTime();
    return sum + Math.max(0, end - start);
  }, 0);
  return Math.round(totalMs / sessions.length / 60000);
}

// Get all active sessions
router.get('/sessions', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    const { tenantId, userId, status = 'active' } = req.query;
    
    // Mock session data - in real implementation, this would query actual sessions
    const sessions = [
      {
        id: 'sess_001',
        userId: 'user_001',
        tenantId: 'tenant_001',
        userName: 'John Doe',
        tenantName: 'TechCorp Solutions',
        email: 'john@techcorp.com',
        role: 'admin',
        status: 'active',
        loginTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        lastActivity: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        location: 'New York, US',
        device: 'Desktop',
        browser: 'Chrome',
        os: 'Windows 10'
      },
      {
        id: 'sess_002',
        userId: 'user_002',
        tenantId: 'tenant_002',
        userName: 'Jane Smith',
        tenantName: 'StartupXYZ',
        email: 'jane@startupxyz.com',
        role: 'manager',
        status: 'active',
        loginTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        lastActivity: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        location: 'San Francisco, US',
        device: 'Desktop',
        browser: 'Safari',
        os: 'macOS'
      },
      {
        id: 'sess_003',
        userId: 'user_003',
        tenantId: 'tenant_001',
        userName: 'Mike Johnson',
        tenantName: 'TechCorp Solutions',
        email: 'mike@techcorp.com',
        role: 'employee',
        status: 'idle',
        loginTime: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        lastActivity: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
        location: 'Chicago, US',
        device: 'Mobile',
        browser: 'Safari',
        os: 'iOS'
      }
    ];

    // Filter sessions based on query parameters
    let filteredSessions = sessions;
    
    if (tenantId) {
      filteredSessions = filteredSessions.filter(session => session.tenantId === tenantId);
    }
    
    if (userId) {
      filteredSessions = filteredSessions.filter(session => session.userId === userId);
    }
    
    if (status) {
      filteredSessions = filteredSessions.filter(session => session.status === status);
    }

    res.json({
      success: true,
      sessions: filteredSessions,
      total: filteredSessions.length,
      summary: {
        active: sessions.filter(s => s.status === 'active').length,
        idle: sessions.filter(s => s.status === 'idle').length,
        total: sessions.length
      }
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch sessions' 
    });
  }
});

// Get department access information
router.get('/department-access', async (req, res) => {
  try {
    const { tenantId } = req.query;
    
    // Mock department access data
    const departmentAccess = [
      {
        id: 'dept_001',
        tenantId: 'tenant_001',
        departmentName: 'Engineering',
        totalUsers: 25,
        activeUsers: 18,
        inactiveUsers: 7,
        permissions: ['read', 'write', 'admin'],
        lastAccessed: new Date(Date.now() - 1 * 60 * 60 * 1000),
        accessLevel: 'full',
        modules: ['projects', 'hr', 'finance']
      },
      {
        id: 'dept_002',
        tenantId: 'tenant_001',
        departmentName: 'Human Resources',
        totalUsers: 8,
        activeUsers: 6,
        inactiveUsers: 2,
        permissions: ['read', 'write'],
        lastAccessed: new Date(Date.now() - 2 * 60 * 60 * 1000),
        accessLevel: 'limited',
        modules: ['hr', 'finance']
      },
      {
        id: 'dept_003',
        tenantId: 'tenant_002',
        departmentName: 'Marketing',
        totalUsers: 12,
        activeUsers: 10,
        inactiveUsers: 2,
        permissions: ['read'],
        lastAccessed: new Date(Date.now() - 30 * 60 * 1000),
        accessLevel: 'readonly',
        modules: ['projects', 'clients']
      }
    ];

    // Filter by tenant if specified
    let filteredAccess = departmentAccess;
    if (tenantId) {
      filteredAccess = departmentAccess.filter(dept => dept.tenantId === tenantId);
    }

    res.json({
      success: true,
      departmentAccess: filteredAccess,
      total: filteredAccess.length
    });
  } catch (error) {
    console.error('Get department access error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch department access information' 
    });
  }
});

// Get all departments
router.get('/departments', async (req, res) => {
  try {
    const { tenantId } = req.query;
    
    // Mock departments data
    const departments = [
      {
        id: 'dept_001',
        tenantId: 'tenant_001',
        name: 'Engineering',
        description: 'Software development and technical operations',
        manager: 'John Doe',
        totalEmployees: 25,
        activeEmployees: 18,
        budget: 500000,
        status: 'active',
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        lastModified: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'dept_002',
        tenantId: 'tenant_001',
        name: 'Human Resources',
        description: 'Employee management and HR operations',
        manager: 'Jane Smith',
        totalEmployees: 8,
        activeEmployees: 6,
        budget: 150000,
        status: 'active',
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'dept_003',
        tenantId: 'tenant_002',
        name: 'Marketing',
        description: 'Marketing and customer acquisition',
        manager: 'Mike Johnson',
        totalEmployees: 12,
        activeEmployees: 10,
        budget: 200000,
        status: 'active',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        lastModified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ];

    // Filter by tenant if specified
    let filteredDepartments = departments;
    if (tenantId) {
      filteredDepartments = departments.filter(dept => dept.tenantId === tenantId);
    }

    res.json({
      success: true,
      departments: filteredDepartments,
      total: filteredDepartments.length
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch departments' 
    });
  }
});

// Get session analytics
router.get('/analytics/sessions', async (req, res) => {
  try {
    const { timeRange = '7d', tenantId } = req.query;
    const { now, since, prevSince } = resolveRange(timeRange);

    const tenantFilter = {};
    if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) tenantFilter.tenantId = tenantId;

    const [currentSessions, previousSessions, activeSessions] = await Promise.all([
      Session.find({ ...tenantFilter, loginTime: { $gte: since } })
        .select('tenantId userId loginTime logoutTime expiresAt status deviceInfo')
        .populate('tenantId', 'name')
        .lean(),
      Session.find({ ...tenantFilter, loginTime: { $gte: prevSince, $lt: since } })
        .select('tenantId loginTime logoutTime expiresAt status')
        .lean(),
      Session.countDocuments({ ...tenantFilter, status: 'active', expiresAt: { $gt: now } })
    ]);

    const totalSessions = currentSessions.length;
    const averageSessionDuration = averageDurationMinutes(currentSessions, now);
    const prevAverageDuration = averageDurationMinutes(previousSessions, now);

    // Daily trends
    const dayBuckets = new Map();
    for (const s of currentSessions) {
      const day = new Date(s.loginTime).toISOString().slice(0, 10);
      if (!dayBuckets.has(day)) dayBuckets.set(day, { sessions: 0, users: new Set() });
      const bucket = dayBuckets.get(day);
      bucket.sessions += 1;
      bucket.users.add(String(s.userId));
    }
    const sessionTrends = [...dayBuckets.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, b]) => ({ date, sessions: b.sessions, activeUsers: b.users.size }));

    // Device / browser breakdown (percentage of sessions in range)
    const deviceCounts = {};
    const browserCounts = {};
    for (const s of currentSessions) {
      const device = s.deviceInfo?.device || 'Unknown';
      const browser = s.deviceInfo?.browser || 'Unknown';
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
      browserCounts[browser] = (browserCounts[browser] || 0) + 1;
    }
    const toPercent = (counts) => Object.fromEntries(
      Object.entries(counts).map(([k, v]) => [k, totalSessions ? Math.round((v / totalSessions) * 1000) / 10 : 0])
    );

    // Per-tenant leaderboard
    const tenantBuckets = new Map();
    for (const s of currentSessions) {
      const tid = s.tenantId?._id ? String(s.tenantId._id) : String(s.tenantId);
      if (!tenantBuckets.has(tid)) {
        tenantBuckets.set(tid, { tenantName: s.tenantId?.name || 'Unknown', sessions: [] });
      }
      tenantBuckets.get(tid).sessions.push(s);
    }
    const prevTenantCounts = new Map();
    for (const s of previousSessions) {
      const tid = String(s.tenantId);
      prevTenantCounts.set(tid, (prevTenantCounts.get(tid) || 0) + 1);
    }
    const topTenants = [...tenantBuckets.entries()]
      .map(([tid, { tenantName, sessions }]) => ({
        tenantId: tid,
        tenantName,
        totalSessions: sessions.length,
        activeSessions: sessions.filter((s) => s.status === 'active' && new Date(s.expiresAt) > now).length,
        averageDuration: averageDurationMinutes(sessions, now),
        peakUsers: peakConcurrency(sessions, now),
        growth: growthPct(sessions.length, prevTenantCounts.get(tid) || 0)
      }))
      .sort((a, b) => b.totalSessions - a.totalSessions)
      .slice(0, 5);

    const analytics = {
      timeRange,
      totalSessions,
      activeSessions,
      averageSessionDuration,
      peakConcurrentUsers: peakConcurrency(currentSessions, now),
      sessionGrowth: growthPct(totalSessions, previousSessions.length),
      durationGrowth: growthPct(averageSessionDuration, prevAverageDuration),
      sessionTrends,
      hourlyDistribution: [],
      deviceBreakdown: toPercent(deviceCounts),
      browserBreakdown: toPercent(browserCounts),
      topTenants,
      insights: []
    };

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Get session analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session analytics'
    });
  }
});

// Get department access analytics
router.get('/analytics/department-access', async (req, res) => {
  try {
    const { timeRange = '7d', tenantId } = req.query;
    const { now, since, prevSince } = resolveRange(timeRange);

    const tenantFilter = {};
    if (tenantId && mongoose.Types.ObjectId.isValid(tenantId)) tenantFilter.tenantId = tenantId;

    const [totalDepartments, activeDepartments, currentSessions, previousSessions, accessGrants] = await Promise.all([
      Department.countDocuments(tenantFilter),
      Department.countDocuments({ ...tenantFilter, status: 'active' }),
      Session.find({ ...tenantFilter, loginTime: { $gte: since } })
        .select('userId loginTime logoutTime expiresAt status departmentAccess')
        .lean(),
      Session.find({ ...tenantFilter, loginTime: { $gte: prevSince, $lt: since } })
        .select('loginTime logoutTime expiresAt status departmentAccess')
        .lean(),
      DepartmentAccess.find({ ...tenantFilter, status: 'active' }).select('userId accessLevel').lean()
    ]);

    const totalUsers = new Set(accessGrants.map((a) => String(a.userId))).size;

    const permissionBreakdown = {};
    for (const grant of accessGrants) {
      const level = grant.accessLevel || 'viewer';
      permissionBreakdown[level] = (permissionBreakdown[level] || 0) + 1;
    }

    // A session can carry access to multiple departments; explode into one row per department
    const explode = (sessions) => {
      const rows = [];
      for (const s of sessions) {
        for (const d of (s.departmentAccess || [])) {
          if (d.isActive === false) continue;
          rows.push({ department: d.department, session: s });
        }
      }
      return rows;
    };
    const currentRows = explode(currentSessions);
    const previousRows = explode(previousSessions);

    // Daily trends: distinct departments and distinct users touched per day
    const dayBuckets = new Map();
    for (const { department, session } of currentRows) {
      const day = new Date(session.loginTime).toISOString().slice(0, 10);
      if (!dayBuckets.has(day)) dayBuckets.set(day, { departments: new Set(), users: new Set() });
      const bucket = dayBuckets.get(day);
      bucket.departments.add(department);
      bucket.users.add(String(session.userId));
    }
    const accessTrends = [...dayBuckets.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, b]) => ({ date, departments: b.departments.size, users: b.users.size }));

    // Per-department leaderboard (mirrors the byTenant shape the UI table expects)
    const deptBuckets = new Map();
    for (const { department, session } of currentRows) {
      if (!deptBuckets.has(department)) deptBuckets.set(department, []);
      deptBuckets.get(department).push(session);
    }
    const prevDeptCounts = new Map();
    for (const { department } of previousRows) {
      prevDeptCounts.set(department, (prevDeptCounts.get(department) || 0) + 1);
    }
    const topDepartments = [...deptBuckets.entries()]
      .map(([department, sessions]) => ({
        departmentId: department,
        departmentName: department,
        totalSessions: sessions.length,
        activeSessions: sessions.filter((s) => s.status === 'active' && new Date(s.expiresAt) > now).length,
        averageDuration: averageDurationMinutes(sessions, now),
        peakUsers: peakConcurrency(sessions, now),
        growth: growthPct(sessions.length, prevDeptCounts.get(department) || 0)
      }))
      .sort((a, b) => b.totalSessions - a.totalSessions)
      .slice(0, 5);

    const analytics = {
      timeRange,
      totalDepartments,
      activeDepartments,
      totalUsers,
      activeUsers: totalUsers,
      accessTrends,
      permissionBreakdown,
      topDepartments
    };

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Get department access analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department access analytics'
    });
  }
});

// Terminate a session
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // In a real implementation, this would terminate the actual session
    res.json({
      success: true,
      message: `Session ${sessionId} terminated successfully`
    });
  } catch (error) {
    console.error('Terminate session error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to terminate session' 
    });
  }
});

// Bulk terminate sessions
router.post('/sessions/bulk-terminate', async (req, res) => {
  try {
    const { sessionIds, reason } = req.body;
    
    if (!sessionIds || !Array.isArray(sessionIds)) {
      return res.status(400).json({
        success: false,
        message: 'Session IDs array is required'
      });
    }

    // In a real implementation, this would terminate multiple sessions
    res.json({
      success: true,
      message: `${sessionIds.length} sessions terminated successfully`,
      terminatedSessions: sessionIds
    });
  } catch (error) {
    console.error('Bulk terminate sessions error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to terminate sessions' 
    });
  }
});

// Grant department access
router.post('/department-access', async (req, res) => {
  try {
    const { userId, department, permissions, accessLevel, tenantId } = req.body;
    
    // In a real implementation, this would create a department access record
    res.json({
      success: true,
      message: 'Department access granted successfully',
      access: {
        id: `dept_access_${Date.now()}`,
        userId,
        department,
        permissions,
        accessLevel,
        tenantId,
        grantedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Grant department access error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to grant department access' 
    });
  }
});

// Revoke department access
router.post('/department-access/:accessId/revoke', async (req, res) => {
  try {
    const { accessId } = req.params;
    const { reason } = req.body;
    
    // In a real implementation, this would revoke the department access
    res.json({
      success: true,
      message: 'Department access revoked successfully',
      accessId,
      revokedAt: new Date()
    });
  } catch (error) {
    console.error('Revoke department access error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to revoke department access' 
    });
  }
});

// Create department
router.post('/departments', async (req, res) => {
  try {
    const { name, description, manager, tenantId, budget } = req.body;
    
    if (!name || !tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Department name and tenant ID are required'
      });
    }
    
    // In a real implementation, this would create a department record
    res.json({
      success: true,
      message: 'Department created successfully',
      department: {
        id: `dept_${Date.now()}`,
        name,
        description,
        manager,
        tenantId,
        budget,
        status: 'active',
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create department' 
    });
  }
});

module.exports = router;
