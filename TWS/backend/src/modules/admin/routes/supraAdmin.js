/**
 * @deprecated Use ./supra-admin instead. This file is kept for reference only.
 * All routes have been split into: dashboard, tenants, users, billing, departments, access, masterErp, system
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../../middleware/auth/auth');
const { body, validationResult } = require('express-validator');
const os = require('os');
const mongoose = require('mongoose');

// Import Platform RBAC for Supra Admin permissions
const { 
  PlatformRBAC, 
  requirePlatformPermission, 
  requirePlatformRole,
  PLATFORM_PERMISSIONS 
} = require('../../../middleware/auth/platformRBAC');

// Import models
const TWSAdmin = require('../../../models/TWSAdmin');
const Tenant = require('../../../models/Tenant');
const User = require('../../../models/User');
const Organization = require('../../../models/Organization');
const Billing = require('../../../models/Billing');
const MasterERP = require('../../../models/MasterERP');
const Department = require('../../../models/Department');
const bcrypt = require('bcryptjs');

// Import services
const tenantService = require('../../../services/tenant/tenant.service');
const analyticsService = require('../../../services/analytics/analytics.service');
const systemMonitoringService = require('../../../services/SystemMonitoringService');
const billingService = require('../../../services/billingService');
const auditService = require('../../../services/compliance/audit.service');
const ValidationMiddleware = require('../../../middleware/validation/validation');
const ErrorHandler = require('../../../middleware/common/errorHandler');

// Apply authentication middleware (authorization is handled per-route with granular permissions)
router.use(authenticateToken);

// ==================== DASHBOARD & ANALYTICS ====================

// Get dashboard overview
router.get('/dashboard', requirePlatformPermission(PLATFORM_PERMISSIONS.ANALYTICS.READ), async (req, res) => {
  const startTime = Date.now();
  try {
    // Get real data from database - OPTIMIZED: Parallelize all independent queries
    // Note: Exclude cancelled tenants to match tenants list page behavior
    const baseFilter = { status: { $ne: 'cancelled' } };
    
    // Calculate previous period data (30 days ago) for percentage change calculations
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // OPTIMIZATION: Run all tenant counts in parallel
    const [
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      cancelledTenants,
      previousTotalTenants,
      previousActiveTenants,
      previousTrialTenants,
      recentTenants,
      topTenants,
      totalUsers
    ] = await Promise.all([
      // Current period counts
      Tenant.countDocuments(baseFilter),
      Tenant.countDocuments({ ...baseFilter, status: 'active' }),
      Tenant.countDocuments({ ...baseFilter, 'subscription.plan': 'trial' }),
      Tenant.countDocuments({ ...baseFilter, status: 'suspended' }),
      Tenant.countDocuments({ status: 'cancelled' }),
      // Previous period counts
      Tenant.countDocuments({ ...baseFilter, createdAt: { $lt: thirtyDaysAgo } }),
      Tenant.countDocuments({ ...baseFilter, status: 'active', createdAt: { $lt: thirtyDaysAgo } }),
      Tenant.countDocuments({ ...baseFilter, 'subscription.plan': 'trial', createdAt: { $lt: thirtyDaysAgo } }),
      // Recent tenants
      Tenant.find(baseFilter).sort({ createdAt: -1 }).limit(5).select('name createdAt status').lean(),
      // Top tenants
      Tenant.find({ ...baseFilter, status: 'active' }).sort({ createdAt: -1 }).limit(5).select('name slug plan status').lean(),
      // User count (only active users)
      User.countDocuments({ status: 'active' })
    ]);
    
    // Calculate percentage changes (only if previous period has data)
    const calculatePercentageChange = (current, previous) => {
      if (previous === 0) {
        return current > 0 ? 100 : null;
      }
      if (current === 0 && previous === 0) {
        return null;
      }
      const change = ((current - previous) / previous) * 100;
      return Math.round(change * 10) / 10;
    };
    
    const totalTenantsChange = calculatePercentageChange(totalTenants, previousTotalTenants);
    const activeTenantsChange = calculatePercentageChange(activeTenants, previousActiveTenants);
    const trialTenantsChange = calculatePercentageChange(trialTenants, previousTrialTenants);
    
    // Process tenant data
    const topTenantsWithRevenue = topTenants.map((tenant) => ({
      ...tenant,
      totalRevenue: 0,
      invoiceCount: 0,
      status: tenant.status || 'active'
    }));
    
    const currentRevenue = topTenantsWithRevenue.reduce((sum, t) => sum + (t.totalRevenue || 0), 0);
    const actualRevenue = currentRevenue > 0 ? currentRevenue : null;
    const revenueChange = totalTenantsChange !== null ? totalTenantsChange : null;
    
    // OPTIMIZATION: Get system health in parallel (non-blocking, don't wait if slow)
    // System health can be slow due to OS calls, so we'll get it but not block the response
    let systemHealthData = null;
    const systemHealthPromise = systemMonitoringService.getSystemHealth()
      .then(data => systemHealthData = data)
      .catch(err => {
        console.warn('System health check failed (non-critical):', err.message);
        systemHealthData = null;
      });
    
    // Wait for system health with timeout (max 2 seconds)
    try {
      await Promise.race([
        systemHealthPromise,
        new Promise((resolve) => setTimeout(() => resolve(null), 2000))
      ]);
    } catch (err) {
      // Ignore errors, systemHealthData will be null
    }
    
    // Only include metrics that have real data - no hardcoded fallbacks
    const systemHealth = {
      totalUsers: totalUsers > 0 ? totalUsers : null,
      avgResponseTime: systemHealthData?.responseTime && systemHealthData.responseTime > 0 
        ? systemHealthData.responseTime 
        : null
    };
    
    const dashboardData = {
      overview: {
        totalTenants,
        activeTenants,
        totalRevenue: actualRevenue,
        monthlyGrowth: revenueChange,
        trialTenants,
        cancelledTenants,
        totalTenantsChange,
        activeTenantsChange,
        trialTenantsChange
      },
      tenantStats: {
        active: activeTenants,
        trial: trialTenants,
        suspended: suspendedTenants,
        cancelled: cancelledTenants
      },
      systemHealth,
      recentActivity: {
        recentTenants: recentTenants.length > 0 
          ? recentTenants.map(t => ({
              name: t.name || 'Unnamed Tenant',
              createdAt: t.createdAt,
              status: t.status
            }))
          : []
      },
      topTenants: {
        topRevenue: topTenantsWithRevenue
      }
    };
    
    const loadTime = Date.now() - startTime;
    console.log(`✅ Dashboard loaded in ${loadTime}ms`);
    res.json(dashboardData);
  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch dashboard data',
      error: error.message 
    });
  }
});

// Get system-wide analytics
router.get('/analytics', requirePlatformPermission(PLATFORM_PERMISSIONS.ANALYTICS.READ), async (req, res) => {
  try {
    const { period = '30d', metric = 'all' } = req.query;
    const analytics = { message: 'Analytics service removed' };
    res.json(analytics);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

// Get ERP statistics (alias for tenant-erp/erp/statistics)
router.get('/erp/stats', requirePlatformPermission(PLATFORM_PERMISSIONS.ANALYTICS.READ), async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    // Get ERP category distribution
    const categoryStats = await Tenant.aggregate([
      {
        $group: {
          _id: '$erpCategory',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    // Calculate time range for new tenants
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Get new tenants by category
    const newTenantsByCategory = await Tenant.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$erpCategory',
          newCount: { $sum: 1 }
        }
      }
    ]);
    
    // Get module usage statistics
    const moduleStats = await Tenant.aggregate([
      {
        $unwind: '$erpModules'
      },
      {
        $group: {
          _id: '$erpModules',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    const statistics = {
      categoryDistribution: categoryStats,
      newTenantsByCategory,
      moduleUsage: moduleStats,
      timeRange,
      generatedAt: new Date()
    };
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Get ERP stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch ERP statistics',
      error: error.message 
    });
  }
});

// ==================== TENANT MANAGEMENT ====================

// Get all tenants
router.get('/tenants', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.READ), async (req, res) => {
  try {
    const { page = 1, limit = 100, status, search, includeCancelled } = req.query;
    const filter = {};
    
    // Exclude cancelled/deleted tenants by default (they are hard deleted now, but keep this for backwards compatibility)
    // Only show cancelled if explicitly requested via status='cancelled' or includeCancelled=true
    if (status) {
      filter.status = status;
    } else if (includeCancelled === 'true' || includeCancelled === true) {
      // Include all tenants including cancelled
      // No status filter
    } else {
      // By default, exclude cancelled tenants (in case some still exist from soft delete)
      filter.status = { $ne: 'cancelled' };
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    const tenants = await Tenant.find(filter)
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Tenant.countDocuments(filter);
    
    // Also get total count including cancelled for reference
    const totalIncludingCancelled = await Tenant.countDocuments({});
    
    console.log('Tenants API Query:', {
      filter,
      found: tenants.length,
      total: total,
      totalIncludingCancelled,
      page,
      limit
    });
    
    res.json({
      tenants,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      },
      summary: {
        total,
        totalIncludingCancelled, // For reference
        active: await Tenant.countDocuments({ ...filter, status: 'active' }),
        suspended: await Tenant.countDocuments({ ...filter, status: 'suspended' }),
        trialing: await Tenant.countDocuments({ ...filter, status: 'trialing' }),
        cancelled: totalIncludingCancelled - total // Count of cancelled tenants
      }
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ message: 'Failed to fetch tenants', error: error.message });
  }
});

// Get single tenant (requires access reason for platform admins)
const requirePlatformAdminAccessReason = require('../../../middleware/auth/requirePlatformAdminAccessReason');
router.get('/tenants/:id', requirePlatformAdminAccessReason(), async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('supportNotes.createdBy', 'fullName');
    
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    
    // Get tenant usage data (this is tenant data, requires access reason)
    const usage = await tenantService.getTenantUsage(req.params.id);
    
    res.json({ tenant, usage });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({ message: 'Failed to fetch tenant' });
  }
});

// Tenant creation by Supra Admin removed: tenants must be created through signup pages only (see SRS).

// Update tenant (requires access reason - modifies tenant data)
router.put('/tenants/:id', requirePlatformAdminAccessReason(), async (req, res) => {
  try {
    const tenant = await tenantService.updateTenant(req.params.id, req.body, req.user._id);
    
    // Log tenant modification to audit trail
    const platformAdminAccessService = require('../../../services/tenant/platform-admin-access.service');
    await platformAdminAccessService.logPlatformAdminAccess({
      platformAdminId: req.user._id,
      platformAdminEmail: req.user.email,
      platformAdminName: req.user.fullName,
      tenantId: req.params.id,
      tenantName: tenant.name,
      reason: req.body.accessReason || req.headers['x-access-reason'] || 'tenant_update',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method
    });
    
    res.json(tenant);
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({ message: 'Failed to update tenant' });
  }
});

// Suspend/Activate tenant (requires access reason - modifies tenant status)
router.put('/tenants/:id/status', requirePlatformAdminAccessReason(), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'cancelled', 'trialing'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const updatedBy = req.user?._id || req.twsAdmin?._id || 'system';
    const tenant = await tenantService.updateTenantStatus(req.params.id, status, updatedBy);
    
    // Log tenant status change to audit trail
    const platformAdminAccessService = require('../../../services/tenant/platform-admin-access.service');
    await platformAdminAccessService.logPlatformAdminAccess({
      platformAdminId: req.user._id,
      platformAdminEmail: req.user.email,
      platformAdminName: req.user.fullName,
      tenantId: req.params.id,
      tenantName: tenant.name,
      reason: req.body.accessReason || req.headers['x-access-reason'] || 'tenant_status_change',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method
    });
    
    res.json({ success: true, data: tenant, message: 'Tenant status updated successfully' });
  } catch (error) {
    console.error('Update tenant status error:', error);
    res.status(500).json({ message: 'Failed to update tenant status', error: error.message });
  }
});

// Delete all cancelled tenants permanently (hard delete - DESTRUCTIVE)
router.delete('/tenants/cancelled', requirePlatformAdminAccessReason(), async (req, res) => {
  try {
    // Find all cancelled tenants
    const cancelledTenants = await Tenant.find({ status: 'cancelled' }).select('_id name slug');
    
    if (!cancelledTenants || cancelledTenants.length === 0) {
      return res.json({
        success: true,
        message: 'No cancelled tenants found to delete',
        data: { deleted: [], failed: [], total: 0 }
      });
    }
    
    // Require justification for bulk deletion of cancelled tenants
    const justification = req.body.justification || req.headers['x-justification'];
    if (!justification || justification.length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Justification is required for deleting all cancelled tenants (minimum 50 characters)',
        code: 'JUSTIFICATION_REQUIRED',
        cancelledTenantsCount: cancelledTenants.length
      });
    }
    
    const tenantIds = cancelledTenants.map(t => t._id.toString());
    const deletedBy = req.user?._id || req.twsAdmin?._id || 'system';
    
    console.log(`🗑️  Deleting ${cancelledTenants.length} cancelled tenant(s) permanently...`);
    
    // Use existing bulk delete service
    const results = await tenantService.deleteTenantsBulk(tenantIds, deletedBy);
    
    // Log each deletion to audit trail
    const platformAdminAccessService = require('../../../services/tenant/platform-admin-access.service');
    for (const tenantId of results.deleted) {
      const tenant = cancelledTenants.find(t => t._id.toString() === tenantId);
      await platformAdminAccessService.logPlatformAdminAccess({
        platformAdminId: req.user._id,
        platformAdminEmail: req.user.email,
        platformAdminName: req.user.fullName,
        tenantId: tenantId,
        tenantName: tenant?.name || 'Unknown',
        reason: req.body.accessReason || req.headers['x-access-reason'] || 'bulk_delete_cancelled_tenants',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method
      });
    }
    
    const allOk = results.failed.length === 0;
    console.log(`✅ Deleted ${results.deleted.length} cancelled tenant(s), ${results.failed.length} failed`);
    
    res.status(allOk ? 200 : 207).json({
      success: allOk,
      message: allOk
        ? `${results.deleted.length} cancelled tenant(s) permanently deleted`
        : `Deleted ${results.deleted.length}; ${results.failed.length} failed`,
      data: {
        ...results,
        totalCancelled: cancelledTenants.length,
        deletedCount: results.deleted.length,
        failedCount: results.failed.length
      }
    });
  } catch (error) {
    console.error('Delete cancelled tenants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete cancelled tenants',
      error: error.message
    });
  }
});

// Bulk delete tenants (hard delete) - must be before /tenants/:id (requires access reason - DESTRUCTIVE)
router.delete('/tenants/bulk', requirePlatformAdminAccessReason(), async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Request body must include an array of tenant ids' });
    }
    
    // Require justification for bulk delete (more sensitive than single delete)
    const justification = req.body.justification || req.headers['x-justification'];
    if (!justification || justification.length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Justification is required for bulk tenant deletion (minimum 50 characters)',
        code: 'JUSTIFICATION_REQUIRED'
      });
    }
    
    const deletedBy = req.user?._id || req.twsAdmin?._id || 'system';
    const results = await tenantService.deleteTenantsBulk(ids, deletedBy);
    
    // Log bulk delete to audit trail
    const platformAdminAccessService = require('../../../services/tenant/platform-admin-access.service');
    for (const tenantId of results.deleted) {
      await platformAdminAccessService.logPlatformAdminAccess({
        platformAdminId: req.user._id,
        platformAdminEmail: req.user.email,
        platformAdminName: req.user.fullName,
        tenantId: tenantId,
        tenantName: 'Bulk Delete',
        reason: req.body.accessReason || req.headers['x-access-reason'] || 'bulk_tenant_deletion',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method
      });
    }
    
    const allOk = results.failed.length === 0;
    res.status(allOk ? 200 : 207).json({
      success: allOk,
      message: allOk
        ? `${results.deleted.length} tenant(s) and all associated data deleted successfully`
        : `Deleted ${results.deleted.length}; ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    console.error('Bulk delete tenants error:', error);
    res.status(500).json({ success: false, message: 'Failed to bulk delete tenants', error: error.message });
  }
});

// Delete tenant (hard delete: removes tenant and all associated data - users, orgs, portal data)
// REQUIRES ACCESS REASON - DESTRUCTIVE OPERATION
router.delete('/tenants/:id', requirePlatformAdminAccessReason(), async (req, res) => {
  try {
    // Get tenant before deletion for audit logging
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    
    // Require justification for tenant deletion (destructive operation)
    const justification = req.body.justification || req.headers['x-justification'];
    if (!justification || justification.length < 30) {
      return res.status(400).json({
        success: false,
        message: 'Justification is required for tenant deletion (minimum 30 characters)',
        code: 'JUSTIFICATION_REQUIRED'
      });
    }
    
    const deletedBy = req.user?._id || req.twsAdmin?._id || 'system';
    
    // Log deletion to audit trail BEFORE deletion
    const platformAdminAccessService = require('../../../services/tenant/platform-admin-access.service');
    await platformAdminAccessService.logPlatformAdminAccess({
      platformAdminId: req.user._id,
      platformAdminEmail: req.user.email,
      platformAdminName: req.user.fullName,
      tenantId: req.params.id,
      tenantName: tenant.name,
      reason: req.body.accessReason || req.headers['x-access-reason'] || 'tenant_deletion',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method
    });
    
    // Pass hardDelete=true for complete removal: tenant, users, organizations, and all portal data
    await tenantService.deleteTenant(req.params.id, deletedBy, true);
    res.json({ success: true, message: 'Tenant and all associated data deleted successfully' });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete tenant', error: error.message });
  }
});

// Change tenant owner password (requires access reason - SENSITIVE OPERATION)
router.put('/tenants/:id/password', [
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], requirePlatformAdminAccessReason(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Get tenant before password change for audit logging
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    
    // Require justification for password change (sensitive operation)
    const justification = req.body.justification || req.headers['x-justification'];
    if (!justification || justification.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Justification is required for password change (minimum 20 characters)',
        code: 'JUSTIFICATION_REQUIRED'
      });
    }
    
    const { newPassword } = req.body;
    await tenantService.changeTenantOwnerPassword(req.params.id, newPassword, req.user._id);
    
    // Log password change to audit trail
    const platformAdminAccessService = require('../../../services/tenant/platform-admin-access.service');
    await platformAdminAccessService.logPlatformAdminAccess({
      platformAdminId: req.user._id,
      platformAdminEmail: req.user.email,
      platformAdminName: req.user.fullName,
      tenantId: req.params.id,
      tenantName: tenant.name,
      reason: req.body.accessReason || req.headers['x-access-reason'] || 'password_reset',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method
    });
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});


// ==================== USER MANAGEMENT ====================

// Get all TWS Admins (Supra Admin portal users)
// Requires: platform_users:read permission
router.get('/admins', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.READ), async (req, res) => {
  try {
    const admins = await TWSAdmin.find({ status: 'active' })
      .select('-password -refreshTokens -twoFASecret')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: admins
    });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch admins',
      error: error.message 
    });
  }
});

// Create TWS Admin (Supra Admin Portal User)
// Requires: platform_users:create permission
// This creates users specifically for managing Supra Admin portal operations (Finance, HR, ERP Management, etc.)
router.post('/admins', 
  requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.CREATE),
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('role').optional().isIn(['platform_super_admin', 'platform_admin', 'platform_support', 'platform_billing', 'platform_analyst', 'platform_developer']).withMessage('Valid role is required'),
    body('phone').optional().isString(),
    body('department').optional().isString()
  ], 
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }
      
      const { email, password, fullName, role, phone, department, status } = req.body;
      
      // Get actual role from database (not overridden role from auth middleware)
      // For TWSAdmin users, fetch the actual role from the database
      let assignerRole = req.user?.role;
      if (req.authContext?.type === 'tws_admin' && req.user?._id) {
        const actualAdmin = await TWSAdmin.findById(req.user._id).select('role');
        if (actualAdmin) {
          assignerRole = actualAdmin.role; // Use actual database role
        }
      }
      
      // Normalize email
      let normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail.includes('@gmail.com')) {
        const [localPart, domain] = normalizedEmail.split('@');
        normalizedEmail = localPart.replace(/\./g, '') + '@' + domain;
      }
      
      // Check if admin already exists
      let existingAdmin = await TWSAdmin.findOne({ email: normalizedEmail });
      if (!existingAdmin && email.includes('@gmail.com')) {
        existingAdmin = await TWSAdmin.findOne({ email: email.toLowerCase().trim() });
      }
      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Admin with this email already exists'
        });
      }
      
      // Determine target role (default to platform_admin if not provided)
      const targetRole = role || 'platform_admin';
      
      // SECURITY: Validate role assignment (prevent privilege escalation)
      if (!PlatformRBAC.canAssignRole(assignerRole, targetRole)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `You cannot assign role '${targetRole}'. Only platform_super_admin can assign all roles, and platform_admin can assign roles except platform_super_admin.`,
          assignerRole: assignerRole,
          targetRole: targetRole
        });
      }
      
      // Validate role exists in platform RBAC
      if (!PlatformRBAC.isValidRole(targetRole)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role: ${targetRole}`,
          validRoles: PlatformRBAC.getAllRoles()
        });
      }
      
      // Create TWSAdmin
      const adminData = {
        email: normalizedEmail,
        password,
        fullName,
        role: targetRole,
        phone: phone || '',
        department: department || 'Platform Administration',
        status: status || 'active'
      };
      
      const admin = new TWSAdmin(adminData);
      await admin.save();
      
      // Log user creation to audit trail
      const auditService = require('../../../services/compliance/audit.service');
      await auditService.logEvent({
        action: 'PLATFORM_USER_CREATED',
        performedBy: req.user._id,
        details: {
          createdUserId: admin._id,
          createdUserEmail: admin.email,
          createdUserRole: admin.role,
          assignerRole: assignerRole,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        },
        severity: 'high',
        status: 'success'
      });
      
      res.status(201).json({
        success: true,
        message: 'Supra Admin portal user created successfully',
        data: {
          admin: {
            _id: admin._id,
            email: admin.email,
            fullName: admin.fullName,
            role: admin.role,
            department: admin.department,
            status: admin.status
          }
        }
      });
    } catch (error) {
      console.error('Create admin error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to create admin',
        error: error.message 
      });
    }
  }
);

// ==================== SUPRA ADMIN PORTAL USER MANAGEMENT ====================

// Get all Supra Admin portal users (TWSAdmin users for portal management)
// Requires: platform_users:read permission
router.get('/portal-users', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.READ), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, role, status, portalResponsibility } = req.query;
    const filter = {};
    
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      filter.role = role;
    }
    
    if (status) {
      filter.status = status;
    }
    
    // Filter by portal responsibility (via department or custom field)
    if (portalResponsibility) {
      filter.department = { $regex: portalResponsibility, $options: 'i' };
    }
    
    const admins = await TWSAdmin.find(filter)
      .select('-password -refreshTokens -twoFASecret')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    const total = await TWSAdmin.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        users: admins,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get portal users error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch portal users',
      error: error.message 
    });
  }
});

// Get all TWS Admin users (Supra Admin / TWS internal employees)
// Requires: platform_users:read permission
router.get('/users', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.READ), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, role, status } = req.query;
    const filter = {};
    
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      filter.role = role;
    }
    
    if (status) {
      filter.status = status;
    }
    
    const users = await TWSAdmin.find(filter)
      .select('-password -refreshTokens -twoFASecret')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    const total = await TWSAdmin.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch users',
      error: error.message 
    });
  }
});

// Get single TWS Admin user
router.get('/users/:id', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.READ), async (req, res) => {
  try {
    const user = await TWSAdmin.findById(req.params.id)
      .select('-password -refreshTokens -twoFASecret')
      .lean();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

// Create TWS Admin user (Supra Admin / TWS internal employee)
// Requires: platform_users:create permission
router.post('/users', 
  requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.CREATE),
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('fullName').notEmpty().trim().withMessage('Full name is required'),
    body('role').optional().isIn(['platform_super_admin', 'platform_admin', 'platform_support', 'platform_billing', 'platform_analyst', 'platform_developer']).withMessage('Valid role is required'),
    body('phone').optional().isString().trim(),
    body('department').optional().isString().trim(),
    body('status').optional().isIn(['active', 'suspended', 'inactive']).withMessage('Status must be active, suspended, or inactive')
  ],
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.asyncHandler(async (req, res) => {
    try {
      console.log('📝 Creating TWS Admin user:', {
        email: req.body.email,
        fullName: req.body.fullName,
        role: req.body.role,
        hasPassword: !!req.body.password,
        passwordLength: req.body.password?.length
      });
      
      const { email, password, fullName, role, phone, department, status } = req.body;
      const assignerRole = req.user?.role;
      
      // Validate required fields (double-check)
      if (!email || !password || !fullName) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
          errors: [
            !email && { field: 'email', message: 'Email is required' },
            !password && { field: 'password', message: 'Password is required' },
            !fullName && { field: 'fullName', message: 'Full name is required' }
          ].filter(Boolean)
        });
      }
      
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters',
          errors: [{ field: 'password', message: 'Password must be at least 8 characters' }]
        });
      }
      
      // Normalize email - Gmail addresses should have dots removed for consistency
      let normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail.includes('@gmail.com')) {
        const [localPart, domain] = normalizedEmail.split('@');
        normalizedEmail = localPart.replace(/\./g, '') + '@' + domain;
      }
      
      // Check if admin already exists (try both with and without dots for Gmail)
      let existingAdmin = await TWSAdmin.findOne({ email: normalizedEmail });
      if (!existingAdmin && email.includes('@gmail.com')) {
        existingAdmin = await TWSAdmin.findOne({ email: email.toLowerCase().trim() });
      }
      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
      
      // Determine target role (default to platform_admin if not provided)
      const targetRole = role || 'platform_admin';
      
      console.log('🔐 Role assignment check:', {
        assignerRole: assignerRole,
        targetRole: targetRole,
        canAssign: PlatformRBAC.canAssignRole(assignerRole, targetRole)
      });
      
      // SECURITY: Validate role assignment (prevent privilege escalation)
      if (!PlatformRBAC.canAssignRole(assignerRole, targetRole)) {
        console.warn('❌ Role assignment denied:', {
          assignerRole,
          targetRole,
          reason: 'Insufficient permissions'
        });
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `You cannot assign role '${targetRole}'. Only platform_super_admin can assign all roles, and platform_admin can assign roles except platform_super_admin.`,
          assignerRole: assignerRole,
          targetRole: targetRole,
          validRolesForAssigner: assignerRole === 'platform_super_admin' 
            ? ['platform_super_admin', 'platform_admin', 'platform_support', 'platform_billing', 'platform_analyst', 'platform_developer']
            : assignerRole === 'platform_admin'
            ? ['platform_admin', 'platform_support', 'platform_billing', 'platform_analyst', 'platform_developer']
            : []
        });
      }
      
      // Validate role exists in platform RBAC
      if (!PlatformRBAC.isValidRole(targetRole)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role: ${targetRole}`,
          validRoles: PlatformRBAC.getAllRoles()
        });
      }
      
      // Create TWSAdmin
      const adminData = {
        email: normalizedEmail,
        password,
        fullName,
        role: targetRole,
        phone: phone || '',
        department: department || 'Platform Administration',
        status: status || 'active'
      };
      
      console.log('💾 Creating TWSAdmin with data:', {
        email: adminData.email,
        fullName: adminData.fullName,
        role: adminData.role,
        hasPassword: !!adminData.password,
        passwordLength: adminData.password?.length
      });
      
      const admin = new TWSAdmin(adminData);
      
      try {
        await admin.save();
        console.log('✅ TWSAdmin saved successfully:', admin._id);
      } catch (saveError) {
        console.error('❌ TWSAdmin save error:', saveError);
        throw saveError; // Re-throw to be caught by outer catch
      }
      
      // Log user creation to audit trail
      const auditService = require('../../../services/compliance/audit.service');
      try {
        await auditService.logEvent({
          action: 'PLATFORM_USER_CREATED',
          performedBy: req.user._id,
          details: {
            createdUserId: admin._id,
            createdUserEmail: admin.email,
            createdUserRole: admin.role,
            assignerRole: assignerRole,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
          },
          severity: 'high',
          status: 'success'
        });
      } catch (auditError) {
        // Don't fail user creation if audit logging fails
        console.warn('⚠️ Audit logging failed (non-critical):', auditError.message);
      }
      
      console.log('✅ TWS Admin user created successfully:', {
        userId: admin._id,
        email: admin.email,
        role: admin.role
      });
      
      res.status(201).json({
        success: true,
        message: 'TWS Admin user created successfully',
        data: {
          user: {
            _id: admin._id,
            email: admin.email,
            fullName: admin.fullName,
            role: admin.role,
            department: admin.department,
            status: admin.status
          }
        }
      });
    } catch (error) {
      console.error('Create user error:', error);
      
      // Handle duplicate email error (MongoDB unique constraint)
      if (error.code === 11000 || error.message.includes('duplicate key')) {
        return res.status(400).json({ 
          success: false,
          message: 'User with this email already exists',
          error: 'DUPLICATE_EMAIL'
        });
      }
      
      // Handle validation errors from mongoose
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        return res.status(400).json({ 
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }
      
      res.status(500).json({ 
        success: false,
        message: 'Failed to create user',
        error: error.message 
      });
    }
  })
);

// Update TWS Admin user
// Requires: platform_users:update permission
router.patch('/users/:id', 
  requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.UPDATE),
  [
    body('fullName').optional().notEmpty().withMessage('Full name cannot be empty'),
    body('role').optional().isIn(['platform_super_admin', 'platform_admin', 'platform_support', 'platform_billing', 'platform_analyst', 'platform_developer']).withMessage('Valid role is required'),
    body('status').optional().isIn(['active', 'suspended', 'inactive']).withMessage('Valid status is required'),
    body('phone').optional().isString(),
    body('department').optional().isString()
  ], 
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const userId = req.params.id;
    const updateData = req.body;
    
    // Get actual role from database (not overridden role from auth middleware)
    // For TWSAdmin users, fetch the actual role from the database
    let assignerRole = req.user?.role;
    if (req.authContext?.type === 'tws_admin' && req.user?._id) {
      const actualAdmin = await TWSAdmin.findById(req.user._id).select('role');
      if (actualAdmin) {
        assignerRole = actualAdmin.role; // Use actual database role
      }
    }
    
    // Get existing user to check current role
    const existingUser = await TWSAdmin.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // SECURITY: If role is being changed, validate role assignment
    if (updateData.role && updateData.role !== existingUser.role) {
      if (!PlatformRBAC.canAssignRole(assignerRole, updateData.role)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `You cannot assign role '${updateData.role}'. Only platform_super_admin can assign all roles, and platform_admin can assign roles except platform_super_admin.`,
          assignerRole: assignerRole,
          targetRole: updateData.role,
          currentRole: existingUser.role
        });
      }
      
      // Validate role exists in platform RBAC
      if (!PlatformRBAC.isValidRole(updateData.role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role: ${updateData.role}`,
          validRoles: PlatformRBAC.getAllRoles()
        });
      }
    }
    
    // Remove fields that shouldn't be updated directly
    delete updateData.password;
    delete updateData.email;
    delete updateData._id;
    
    const user = await TWSAdmin.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -refreshTokens -twoFASecret');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Log user update to audit trail
    const auditService = require('../../../services/compliance/audit.service');
    await auditService.logEvent({
      action: 'PLATFORM_USER_UPDATED',
      performedBy: req.user._id,
      details: {
        updatedUserId: userId,
        updatedUserEmail: user.email,
        changes: updateData,
        assignerRole: assignerRole,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      },
      severity: 'medium',
      status: 'success'
    });
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

// Delete TWS Admin user
// Requires: platform_users:delete permission
router.delete('/users/:id', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.DELETE), async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Get user FIRST (don't delete yet) - needed for security checks and audit logging
    const user = await TWSAdmin.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // SECURITY: Prevent self-deletion
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You cannot delete your own account'
      });
    }
    
    // SECURITY: Prevent deletion of platform_super_admin by non-super-admin
    if (user.role === 'platform_super_admin' && req.user.role !== 'platform_super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Only platform_super_admin can delete platform_super_admin users'
      });
    }
    
    // Log user deletion to audit trail BEFORE deletion
    const auditService = require('../../../services/compliance/audit.service');
    await auditService.logEvent({
      action: 'PLATFORM_USER_DELETED',
      performedBy: req.user._id,
      details: {
        deletedUserId: user._id,
        deletedUserEmail: user.email,
        deletedUserRole: user.role,
        assignerRole: req.user.role,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      },
      severity: 'high',
      status: 'success'
    });
    
    // Delete user AFTER all security checks and audit logging
    await TWSAdmin.findByIdAndDelete(userId);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

// Remove user from Supra Admin portal responsibility
// Remove portal responsibility from user
// Requires: platform_users:update permission
router.patch('/users/:id/remove-portal-responsibility', 
  requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.UPDATE), 
  async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    user.supraAdminPortalResponsibility = null;
    user.supraAdminPortalAssignedAt = null;
    user.supraAdminPortalRemovedAt = new Date();
    user.supraAdminPortalRemovedBy = req.user._id;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'User removed from Supra Admin portal responsibility',
      data: {
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email
        }
      }
    });
  } catch (error) {
    console.error('Remove portal responsibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove portal responsibility',
      error: error.message
    });
  }
});

// ==================== SYSTEM MONITORING ====================

// Get system health - Returns real-time data in format expected by frontend
router.get('/system-health', requirePlatformPermission(PLATFORM_PERMISSIONS.ANALYTICS.SYSTEM_HEALTH), ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const health = await systemMonitoringService.getSystemHealth();
    const os = require('os');
    const mongoose = require('mongoose');
    
    // Transform to format expected by frontend
    const transformedHealth = {
      overall: {
        status: health.status || 'healthy',
        uptime: health.uptime || '0 days, 0 hours, 0 minutes',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        lastRestart: new Date(Date.now() - os.uptime() * 1000).toISOString()
      },
      system: {
        cpu: {
          usage: health.cpuUsage || 0,
          cores: os.cpus().length,
          loadAverage: os.loadavg() || [0, 0, 0]
        },
        memory: {
          total: os.totalmem(),
          used: os.totalmem() - os.freemem(),
          free: os.freemem(),
          percentage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
        },
        disk: {
          total: health.diskUsage?.total ? parseFloat(health.diskUsage.total.replace(/[^0-9.]/g, '')) * (health.diskUsage.total.includes('GB') ? 1024 : health.diskUsage.total.includes('TB') ? 1024 * 1024 : 1) : 0,
          used: health.diskUsage?.used ? parseFloat(health.diskUsage.used.replace(/[^0-9.]/g, '')) * (health.diskUsage.used.includes('GB') ? 1024 : health.diskUsage.used.includes('TB') ? 1024 * 1024 : 1) : 0,
          free: health.diskUsage?.free ? parseFloat(health.diskUsage.free.replace(/[^0-9.]/g, '')) * (health.diskUsage.free.includes('GB') ? 1024 : health.diskUsage.free.includes('TB') ? 1024 * 1024 : 1) : 0,
          percentage: health.diskUsage?.percentage || 0
        },
        network: {
          bytesIn: 0, // Would need to track this over time
          bytesOut: 0 // Would need to track this over time
        }
      },
      performance: {
        responseTime: {
          avg: health.responseTime || 0,
          p95: Math.round((health.responseTime || 0) * 1.5),
          p99: Math.round((health.responseTime || 0) * 2)
        },
        throughput: {
          requestsPerSecond: 0, // Would need to track this
          errorsPerSecond: 0 // Would need to track this
        }
      },
      services: {
        database: {
          status: health.services?.database?.status || 'unknown',
          responseTime: health.services?.database?.responseTime || 0,
          uptime: health.uptime || '0 days, 0 hours, 0 minutes'
        },
        api: {
          status: health.services?.api?.status || 'healthy',
          responseTime: health.services?.api?.responseTime || 0,
          uptime: health.uptime || '0 days, 0 hours, 0 minutes'
        },
        storage: {
          status: health.services?.storage?.status || 'healthy',
          responseTime: 0,
          uptime: health.uptime || '0 days, 0 hours, 0 minutes'
        },
        redis: {
          status: health.services?.redis?.status || (process.env.REDIS_DISABLED === 'true' ? 'disabled' : 'unknown'),
          responseTime: health.services?.redis?.responseTime || 0,
          uptime: health.uptime || '0 days, 0 hours, 0 minutes'
        }
      },
      security: {
        sslCertificate: {
          expiresAt: null // Would need to check actual certificate
        },
        firewall: {
          blockedRequests: 0 // Would need to track this
        },
        vulnerabilities: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        }
      },
      timestamp: health.timestamp || new Date()
    };
    
    // Ensure we always return a valid response
    if (!health || health.status === 'error') {
      return res.json({
        success: false,
        message: health?.error || 'Failed to fetch system health',
        data: transformedHealth
      });
    }
    
    res.json({
      success: true,
      data: transformedHealth
    });
  } catch (error) {
    console.error('Get system health error:', error);
    // Return a fallback health object even on error
    res.json({ 
      success: false,
      message: 'Failed to fetch system health',
      error: error.message,
      data: {
        overall: {
          status: 'error',
          uptime: 'Unknown',
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        },
        system: {
          cpu: { usage: 0, cores: 0, loadAverage: [0, 0, 0] },
          memory: { total: 0, used: 0, free: 0, percentage: 0 },
          disk: { total: 0, used: 0, free: 0, percentage: 0 },
          network: { bytesIn: 0, bytesOut: 0 }
        },
        services: {
          database: { status: 'unknown', responseTime: 0, uptime: 'Unknown' },
          api: { status: 'unknown', responseTime: 0, uptime: 'Unknown' },
          storage: { status: 'unknown', responseTime: 0, uptime: 'Unknown' },
          redis: { status: 'unknown', responseTime: 0, uptime: 'Unknown' }
        },
        timestamp: new Date()
      }
    });
  }
}));

// Get monitoring alerts
router.get('/monitoring/alerts', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    // In a real app, this would query an alerts collection
    const alerts = [
      {
        id: 1,
        type: 'warning',
        service: 'database',
        message: 'High connection count detected',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        severity: 'medium'
      },
      {
        id: 2,
        type: 'info',
        service: 'api',
        message: 'Scheduled maintenance completed',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        severity: 'low'
      }
    ];
    
    res.json({
      success: true,
      alerts: alerts.slice(0, parseInt(limit)),
      total: alerts.length
    });
  } catch (error) {
    console.error('Get monitoring alerts error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch monitoring alerts' 
    });
  }
});

// Get system logs
router.get('/monitoring/logs', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.LOGS), async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    // In a real app, this would query a logs collection
    const logs = [
      {
        id: 1,
        level: 'info',
        message: 'User login successful',
        service: 'auth',
        timestamp: new Date(Date.now() - 1 * 60 * 1000),
        userId: 'user123'
      },
      {
        id: 2,
        level: 'warning',
        message: 'API rate limit exceeded',
        service: 'api',
        timestamp: new Date(Date.now() - 3 * 60 * 1000),
        ip: '192.168.1.100'
      }
    ];
    
    res.json({
      success: true,
      logs: logs.slice(0, parseInt(limit)),
      total: logs.length
    });
  } catch (error) {
    console.error('Get system logs error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch system logs' 
    });
  }
});

// Get monitoring metrics
router.get('/monitoring/metrics', requirePlatformPermission(PLATFORM_PERMISSIONS.ANALYTICS.READ), async (req, res) => {
  try {
    // In a real app, this would query actual system metrics
    const metrics = {
      cpu: {
        usage: 45.2,
        cores: 8,
        load: [1.2, 1.5, 1.3]
      },
      memory: {
        used: 62.5,
        total: 16384,
        available: 6144
      },
      disk: {
        used: 65.8,
        total: 1000,
        available: 342
      },
      network: {
        in: 125.5,
        out: 89.3,
        connections: 245
      },
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Get monitoring metrics error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch monitoring metrics' 
    });
  }
});

// Get security threats
router.get('/monitoring/threats', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    // In a real app, this would query a threats collection
    const threats = [
      {
        id: 1,
        type: 'suspicious_login',
        severity: 'high',
        source: '192.168.1.100',
        description: 'Multiple failed login attempts detected',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        status: 'active'
      },
      {
        id: 2,
        type: 'unusual_activity',
        severity: 'medium',
        source: '192.168.1.101',
        description: 'Unusual API access pattern detected',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        status: 'investigating'
      }
    ];
    
    res.json({
      success: true,
      threats: threats.slice(0, parseInt(limit)),
      total: threats.length
    });
  } catch (error) {
    console.error('Get security threats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch security threats' 
    });
  }
});

// ==================== SYSTEM SETTINGS ====================

// Get system settings
router.get('/settings', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    // This would typically come from a SystemSettings model
    const settings = {
      systemName: 'GTS - Global Technology Solutions',
      version: '1.0.0',
      maintenanceMode: false,
      registrationEnabled: true,
      defaultTrialDays: 14,
      maxTenantsPerAdmin: 100,
      backupSettings: {
        frequency: 'daily',
        retention: 30
      },
      emailSettings: {
        enabled: true,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        fromEmail: 'noreply@tws.com'
      },
      securitySettings: {
        passwordMinLength: 8,
        sessionTimeout: 24,
        ipWhitelist: []
      },
      notificationSettings: {
        emailNotifications: true,
        systemAlerts: true,
        maintenanceAlerts: true,
        securityAlerts: true
      }
    };
    
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
});

// Update system settings
router.put('/settings', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.UPDATE), async (req, res) => {
  try {
    // This would typically update a SystemSettings model
    // For now, just return success
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Failed to update settings' });
  }
});

// Test session management endpoints
router.get('/test-sessions', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, testType, search } = req.query;
    
    // In a real app, this would query a TestSession collection
    const testSessions = [
      {
        id: 1,
        name: 'API Load Test - User Authentication',
        description: 'Load testing the user authentication endpoints',
        testType: 'load',
        status: 'completed',
        progress: 100,
        targetUrl: 'https://api.example.com/auth',
        duration: 30,
        concurrentUsers: 100,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 35 * 60 * 1000),
        results: {
          avgResponseTime: 245,
          throughput: 85.2,
          errorRate: 0.5,
          successRate: 99.5
        }
      },
      {
        id: 2,
        name: 'Database Stress Test',
        description: 'Stress testing database connections and queries',
        testType: 'stress',
        status: 'running',
        progress: 65,
        targetUrl: 'https://api.example.com/database',
        duration: 60,
        concurrentUsers: 500,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000)
      },
      {
        id: 3,
        name: 'Security Penetration Test',
        description: 'Security testing for vulnerabilities',
        testType: 'security',
        status: 'pending',
        progress: 0,
        targetUrl: 'https://api.example.com/security',
        duration: 120,
        concurrentUsers: 1,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
      },
      {
        id: 4,
        name: 'Performance Benchmark',
        description: 'Performance testing for critical endpoints',
        testType: 'performance',
        status: 'failed',
        progress: 45,
        targetUrl: 'https://api.example.com/performance',
        duration: 45,
        concurrentUsers: 200,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        startedAt: new Date(Date.now() - 6 * 60 * 60 * 1000 + 5 * 60 * 1000),
        failedAt: new Date(Date.now() - 6 * 60 * 60 * 1000 + 25 * 60 * 1000)
      },
      {
        id: 5,
        name: 'Integration Test Suite',
        description: 'End-to-end integration testing',
        testType: 'integration',
        status: 'stopped',
        progress: 30,
        targetUrl: 'https://api.example.com/integration',
        duration: 90,
        concurrentUsers: 50,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        startedAt: new Date(Date.now() - 12 * 60 * 60 * 1000 + 5 * 60 * 1000),
        stoppedAt: new Date(Date.now() - 12 * 60 * 60 * 1000 + 32 * 60 * 1000)
      }
    ];
    
    // Apply filters
    let filteredSessions = testSessions;
    
    if (status) {
      filteredSessions = filteredSessions.filter(session => session.status === status);
    }
    
    if (testType) {
      filteredSessions = filteredSessions.filter(session => session.testType === testType);
    }
    
    if (search) {
      filteredSessions = filteredSessions.filter(session =>
        session.name.toLowerCase().includes(search.toLowerCase()) ||
        session.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    res.json(filteredSessions);
  } catch (error) {
    console.error('Get test sessions error:', error);
    res.status(500).json({ message: 'Failed to fetch test sessions' });
  }
});

router.get('/test-sessions/stats', requirePlatformPermission(PLATFORM_PERMISSIONS.ANALYTICS.READ), async (req, res) => {
  try {
    // In a real app, this would calculate from actual test session data
    const stats = {
      totalTests: 5,
      runningTests: 1,
      completedTests: 1,
      failedTests: 1,
      stoppedTests: 1,
      pendingTests: 1,
      successRate: 80.0,
      avgResponseTime: 245,
      totalDuration: 345 // minutes
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Get test session stats error:', error);
    res.status(500).json({ message: 'Failed to fetch test session statistics' });
  }
});

router.post('/test-sessions', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.UPDATE), async (req, res) => {
  try {
    const { name, description, testType, targetUrl, duration, concurrentUsers } = req.body;
    
    // In a real app, this would create a new test session in the database
    const newTestSession = {
      id: Date.now(),
      name,
      description,
      testType,
      status: 'pending',
      progress: 0,
      targetUrl,
      duration: parseInt(duration),
      concurrentUsers: parseInt(concurrentUsers),
      createdAt: new Date()
    };
    
    res.status(201).json(newTestSession);
  } catch (error) {
    console.error('Create test session error:', error);
    res.status(500).json({ message: 'Failed to create test session' });
  }
});

router.post('/test-sessions/:id/start', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.UPDATE), async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real app, this would start the actual test session
    const updatedSession = {
      id: parseInt(id),
      status: 'running',
      startedAt: new Date(),
      progress: 0
    };
    
    res.json(updatedSession);
  } catch (error) {
    console.error('Start test session error:', error);
    res.status(500).json({ message: 'Failed to start test session' });
  }
});

router.post('/test-sessions/:id/stop', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.UPDATE), async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real app, this would stop the actual test session
    const updatedSession = {
      id: parseInt(id),
      status: 'stopped',
      stoppedAt: new Date()
    };
    
    res.json(updatedSession);
  } catch (error) {
    console.error('Stop test session error:', error);
    res.status(500).json({ message: 'Failed to stop test session' });
  }
});

router.delete('/test-sessions/:id', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.UPDATE), async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real app, this would delete the test session from the database
    res.json({ message: 'Test session deleted successfully', id: parseInt(id) });
  } catch (error) {
    console.error('Delete test session error:', error);
    res.status(500).json({ message: 'Failed to delete test session' });
  }
});

// Debug endpoints
router.get('/debug/system-info', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    const systemInfo = {
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      nodeVersion: process.version,
      uptime: process.uptime(),
      memoryUsage: Math.round((process.memoryUsage().heapUsed / 1024 / 1024 / 1024) * 100),
      cpuUsage: Math.round(Math.random() * 100), // Mock CPU usage
      databaseStatus: 'connected',
      redisStatus: 'connected',
      platform: process.platform,
      arch: process.arch,
      pid: process.pid
    };
    
    res.json(systemInfo);
  } catch (error) {
    console.error('Get system info error:', error);
    res.status(500).json({ message: 'Failed to fetch system info' });
  }
});

router.get('/debug/logs', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.LOGS), async (req, res) => {
  try {
    // In a real app, this would query a logs collection
    const logs = [
      {
        id: 1,
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        level: 'info',
        message: 'System initialized successfully',
        source: 'system',
        details: { component: 'TWSAdmin', action: 'startup' }
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        level: 'warning',
        message: 'High memory usage detected',
        source: 'monitoring',
        details: { memoryUsage: '85%', threshold: '80%' }
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        level: 'error',
        message: 'Database connection timeout',
        source: 'database',
        details: { timeout: '5000ms', retries: 3 }
      },
      {
        id: 4,
        timestamp: new Date(Date.now() - 20 * 60 * 1000),
        level: 'info',
        message: 'User authentication successful',
        source: 'auth',
        details: { userId: 'user123', ip: '192.168.1.1' }
      },
      {
        id: 5,
        timestamp: new Date(Date.now() - 25 * 60 * 1000),
        level: 'debug',
        message: 'Cache miss for key: user:123',
        source: 'cache',
        details: { key: 'user:123', operation: 'get' }
      }
    ];
    
    res.json(logs);
  } catch (error) {
    console.error('Get debug logs error:', error);
    res.status(500).json({ message: 'Failed to fetch debug logs' });
  }
});

router.get('/debug/performance', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    const performanceMetrics = {
      avgResponseTime: Math.round(Math.random() * 500 + 100),
      requestsPerMinute: Math.round(Math.random() * 200 + 50),
      errorRate: Math.round(Math.random() * 5 * 100) / 100,
      memoryUsage: Math.round((process.memoryUsage().heapUsed / 1024 / 1024 / 1024) * 100),
      cpuUsage: Math.round(Math.random() * 100),
      activeConnections: Math.round(Math.random() * 100 + 10),
      totalRequests: Math.round(Math.random() * 10000 + 1000),
      successRate: Math.round((Math.random() * 10 + 90) * 100) / 100
    };
    
    res.json(performanceMetrics);
  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({ message: 'Failed to fetch performance metrics' });
  }
});

router.delete('/debug/logs', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.UPDATE), async (req, res) => {
  try {
    // In a real app, this would clear the logs collection
    res.json({ message: 'Debug logs cleared successfully' });
  } catch (error) {
    console.error('Clear debug logs error:', error);
    res.status(500).json({ message: 'Failed to clear debug logs' });
  }
});

// Infrastructure management endpoints
router.get('/infrastructure/servers', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    // Get real system information
    const hostname = os.hostname();
    const platform = os.platform();
    const arch = os.arch();
    const cpuCount = os.cpus().length;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercentage = Math.round((usedMem / totalMem) * 100);
    const uptime = os.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const uptimeString = `${days} days, ${hours} hours, ${minutes} minutes`;
    
    // Get CPU usage
    const cpuUsage = await systemMonitoringService.getCPUUsage();
    
    // Get network interfaces for IP address
    const networkInterfaces = os.networkInterfaces();
    let ipAddress = 'N/A';
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];
      for (const iface of interfaces) {
        if (!iface.internal && iface.family === 'IPv4') {
          ipAddress = iface.address;
          break;
        }
      }
      if (ipAddress !== 'N/A') break;
    }
    
    // Determine status based on resource usage
    let status = 'online';
    if (cpuUsage > 90 || memPercentage > 90) {
      status = 'warning';
    } else if (cpuUsage > 95 || memPercentage > 95) {
      status = 'critical';
    }
    
    const server = {
      id: 1,
      name: `${hostname} (${platform})`,
      ipAddress: ipAddress,
      status: status,
      cpuUsage: cpuUsage,
      memoryUsage: memPercentage,
      uptime: uptimeString,
      lastUpdated: new Date(),
      type: 'application',
      description: `TWS Backend Server - ${platform} ${arch} with ${cpuCount} CPU cores`,
      metrics: {
        cpu: cpuUsage,
        memory: memPercentage,
        responseTime: await systemMonitoringService.getAverageResponseTime(),
        uptime: uptimeString,
        totalMemory: systemMonitoringService.formatBytes(totalMem),
        usedMemory: systemMonitoringService.formatBytes(usedMem),
        freeMemory: systemMonitoringService.formatBytes(freeMem)
      },
      systemInfo: {
        platform: platform,
        arch: arch,
        cpuCount: cpuCount,
        nodeVersion: process.version,
        pid: process.pid
      }
    };
    
    res.json({
      success: true,
      data: [server]
    });
  } catch (error) {
    console.error('Get servers error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch servers',
      error: error.message
    });
  }
});

router.get('/infrastructure/databases', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    const databases = [];
    
    // Get MongoDB connection info
    if (mongoose.connection.readyState === 1) {
      const start = Date.now();
      try {
        await mongoose.connection.db.admin().ping();
        const responseTime = Date.now() - start;
        
        // Get database stats
        const dbStats = await mongoose.connection.db.stats();
        const dbSize = dbStats.dataSize || 0;
        const storageSize = dbStats.storageSize || 0;
        const indexes = dbStats.indexes || 0;
        const collections = dbStats.collections || 0;
        
        // Get connection pool info
        const connectionState = mongoose.connection.readyState;
        const connectionStates = {
          0: 'disconnected',
          1: 'connected',
          2: 'connecting',
          3: 'disconnecting'
        };
        
        const dbName = mongoose.connection.db.databaseName;
        const host = mongoose.connection.host;
        const port = mongoose.connection.port;
        
        databases.push({
          id: 1,
          name: `MongoDB - ${dbName}`,
          type: 'MongoDB',
          status: connectionState === 1 ? 'healthy' : 'degraded',
          connections: {
            active: mongoose.connection.db.serverConfig?.s?.pool?.totalConnectionCount || 0,
            max: mongoose.connection.db.serverConfig?.s?.pool?.maxPoolSize || 100
          },
          size: systemMonitoringService.formatBytes(storageSize),
          responseTime: responseTime,
          lastUpdated: new Date(),
          description: `Primary MongoDB database at ${host}:${port}`,
          metrics: {
            connections: mongoose.connection.db.serverConfig?.s?.pool?.totalConnectionCount || 0,
            size: systemMonitoringService.formatBytes(storageSize),
            dataSize: systemMonitoringService.formatBytes(dbSize),
            responseTime: responseTime,
            collections: collections,
            indexes: indexes,
            state: connectionStates[connectionState] || 'unknown'
          },
          connectionInfo: {
            host: host,
            port: port,
            database: dbName,
            state: connectionStates[connectionState] || 'unknown'
          }
        });
      } catch (dbError) {
        databases.push({
          id: 1,
          name: 'MongoDB',
          type: 'MongoDB',
          status: 'error',
          connections: { active: 0, max: 100 },
          size: 'N/A',
          responseTime: 0,
          lastUpdated: new Date(),
          description: 'MongoDB connection error',
          error: dbError.message
        });
      }
    } else {
      databases.push({
        id: 1,
        name: 'MongoDB',
        type: 'MongoDB',
        status: 'disconnected',
        connections: { active: 0, max: 100 },
        size: 'N/A',
        responseTime: 0,
        lastUpdated: new Date(),
        description: 'MongoDB is not connected',
        error: 'Database connection not established'
      });
    }
    
    res.json({
      success: true,
      data: databases
    });
  } catch (error) {
    console.error('Get databases error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch databases',
      error: error.message
    });
  }
});

router.get('/infrastructure/apis', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    // List of main API endpoints based on actual routes
    const apiGroups = [
      { name: 'Authentication API', endpoint: '/api/auth', description: 'User authentication and authorization endpoints' },
      { name: 'User Management API', endpoint: '/api/users', description: 'User CRUD operations and profile management' },
      { name: 'Tenant Management API', endpoint: '/api/tenant', description: 'Tenant and organization management' },
      { name: 'Supra Admin API', endpoint: '/api/supra-admin', description: 'Supra admin panel endpoints' },
      { name: 'Education API', endpoint: '/api/tenant/:tenantSlug/org/:orgSlug/education', description: 'Education ERP endpoints' },
      { name: 'Healthcare API', endpoint: '/api/tenant/:tenantSlug/org/:orgSlug/healthcare', description: 'Healthcare ERP endpoints' },
      { name: 'Projects API', endpoint: '/api/projects', description: 'Project management endpoints' },
      { name: 'HR API', endpoint: '/api/employees', description: 'Employee and HR management' },
      { name: 'Attendance API', endpoint: '/api/attendance', description: 'Attendance tracking endpoints' },
      { name: 'Analytics API', endpoint: '/api/analytics', description: 'Analytics and reporting endpoints' },
      { name: 'Files API', endpoint: '/api/files', description: 'File upload and management endpoints' },
      { name: 'Notifications API', endpoint: '/api/notifications', description: 'Notification system endpoints' }
    ];
    
    const apis = apiGroups.map((api, index) => {
      // Mock metrics - in production, these would come from actual request logs
      const avgResponseTime = Math.floor(Math.random() * 100) + 50;
      const status = avgResponseTime < 200 ? 'healthy' : avgResponseTime < 500 ? 'warning' : 'degraded';
      
      return {
        id: index + 1,
        name: api.name,
        endpoint: api.endpoint,
        status: status,
        responseTime: { 
          avg: avgResponseTime, 
          max: avgResponseTime * 2 
        },
        requestsPerMinute: Math.floor(Math.random() * 200) + 10,
        errorRate: Math.random() * 2,
        lastUpdated: new Date(),
        description: api.description,
        metrics: {
          responseTime: avgResponseTime,
          requestsPerMinute: Math.floor(Math.random() * 200) + 10,
          errorRate: Math.random() * 2
        }
      };
    });
    
    res.json({
      success: true,
      data: apis
    });
  } catch (error) {
    console.error('Get APIs error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch APIs',
      error: error.message
    });
  }
});

router.get('/infrastructure/security', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    const security = [];
    
    // Check TLS/SSL status
    const tlsEnabled = process.env.NODE_ENV === 'production' || process.env.ENABLE_TLS === 'true';
    security.push({
      id: 1,
      name: 'TLS/SSL Encryption',
      type: 'Transport Security',
      status: tlsEnabled ? 'healthy' : 'warning',
      threatsBlocked: { today: 0, total: 0 },
      lastScan: new Date(),
      lastUpdated: new Date(),
      description: tlsEnabled ? 'TLS encryption enabled for secure connections' : 'TLS encryption not enabled (development mode)',
      metrics: {
        enabled: tlsEnabled,
        lastScan: new Date()
      }
    });
    
    // Check authentication status
    security.push({
      id: 2,
      name: 'Authentication System',
      type: 'Access Control',
      status: 'healthy',
      threatsBlocked: { today: 0, total: 0 },
      lastScan: new Date(),
      lastUpdated: new Date(),
      description: 'JWT-based authentication with role-based access control',
      metrics: {
        method: 'JWT',
        rbacEnabled: true,
        lastScan: new Date()
      }
    });
    
    // Check MongoDB security
    const mongoConnected = mongoose.connection.readyState === 1;
    security.push({
      id: 3,
      name: 'Database Security',
      type: 'Data Protection',
      status: mongoConnected ? 'healthy' : 'warning',
      threatsBlocked: { today: 0, total: 0 },
      lastScan: new Date(),
      lastUpdated: new Date(),
      description: mongoConnected ? 'MongoDB connection secured' : 'MongoDB connection not established',
      metrics: {
        connected: mongoConnected,
        encryption: 'At-rest encryption (if configured)',
        lastScan: new Date()
      }
    });
    
    // Check rate limiting status
    const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED === 'true';
    security.push({
      id: 4,
      name: 'Rate Limiting',
      type: 'DoS Protection',
      status: rateLimitEnabled ? 'healthy' : 'warning',
      threatsBlocked: { today: 0, total: 0 },
      lastScan: new Date(),
      lastUpdated: new Date(),
      description: rateLimitEnabled ? 'Rate limiting enabled to prevent DoS attacks' : 'Rate limiting disabled (development mode)',
      metrics: {
        enabled: rateLimitEnabled,
        lastScan: new Date()
      }
    });
    
    res.json({
      success: true,
      data: security
    });
  } catch (error) {
    console.error('Get security components error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch security components',
      error: error.message
    });
  }
});

router.get('/infrastructure/stats', requirePlatformPermission(PLATFORM_PERMISSIONS.ANALYTICS.READ), async (req, res) => {
  try {
    // Get actual counts from real infrastructure
    const serverCount = 1; // Current server
    const activeServers = mongoose.connection.readyState === 1 ? 1 : 0;
    const databaseCount = mongoose.connection.readyState === 1 ? 1 : 0;
    const activeDatabases = mongoose.connection.readyState === 1 ? 1 : 0;
    const apiEndpoints = 12; // Based on API groups defined
    const healthyApis = apiEndpoints; // All APIs are considered healthy
    const securityComponents = 4; // TLS, Auth, DB, Rate Limiting
    
    // Check security component health
    const tlsEnabled = process.env.NODE_ENV === 'production' || process.env.ENABLE_TLS === 'true';
    const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED === 'true';
    const authEnabled = true; // Always enabled
    const dbConnected = mongoose.connection.readyState === 1;
    
    const healthySecurity = [tlsEnabled, authEnabled, dbConnected, rateLimitEnabled].filter(Boolean).length;
    
    // Calculate security score
    const securityScore = (healthySecurity / securityComponents) * 100;
    
    // Determine overall health
    let overallHealth = 'good';
    if (activeServers === 0 || activeDatabases === 0) {
      overallHealth = 'critical';
    } else if (securityScore < 75) {
      overallHealth = 'warning';
    }
    
    const stats = {
      totalServers: serverCount,
      activeServers: activeServers,
      totalDatabases: databaseCount,
      activeDatabases: activeDatabases,
      apiEndpoints: apiEndpoints,
      healthyApis: healthyApis,
      securityComponents: securityComponents,
      healthySecurity: healthySecurity,
      securityScore: securityScore,
      overallHealth: overallHealth,
      lastUpdated: new Date()
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get infrastructure stats error:', error);
    // Fallback to basic stats if detailed fetch fails
    const stats = {
      totalServers: 1,
      activeServers: mongoose.connection.readyState === 1 ? 1 : 0,
      totalDatabases: 1,
      activeDatabases: mongoose.connection.readyState === 1 ? 1 : 0,
      apiEndpoints: 12,
      healthyApis: 12,
      securityComponents: 4,
      healthySecurity: 4,
      securityScore: 100,
      overallHealth: mongoose.connection.readyState === 1 ? 'good' : 'warning',
      lastUpdated: new Date()
    };
    
    res.json({
      success: true,
      data: stats
    });
  }
});

// Get monitoring infrastructure
router.get('/infrastructure/monitoring', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    const monitoring = [];
    
    // System Monitoring Service
    monitoring.push({
      id: 1,
      name: 'System Monitoring Service',
      type: 'Metrics Collection',
      status: 'healthy',
      endpoints: 1,
      metricsCollected: 8, // CPU, Memory, Disk, Network, Services, etc.
      lastUpdated: new Date(),
      description: 'Built-in system monitoring service for real-time metrics',
      metrics: {
        endpoints: 1,
        metricsCollected: 8,
        retention: 'Real-time'
      }
    });
    
    // Health Check Endpoint
    monitoring.push({
      id: 2,
      name: 'Health Check API',
      type: 'Health Monitoring',
      status: 'healthy',
      endpoints: 1,
      lastUpdated: new Date(),
      description: 'System health check endpoint at /api/supra-admin/system-health',
      metrics: {
        endpoint: '/api/supra-admin/system-health',
        status: 'active'
      }
    });
    
    // MongoDB Monitoring
    if (mongoose.connection.readyState === 1) {
      monitoring.push({
        id: 3,
        name: 'MongoDB Monitoring',
        type: 'Database Monitoring',
        status: 'healthy',
        endpoints: 1,
        lastUpdated: new Date(),
        description: 'MongoDB connection and performance monitoring',
        metrics: {
          connectionState: 'connected',
          database: mongoose.connection.db.databaseName
        }
      });
    }
    
    // Application Logging
    monitoring.push({
      id: 4,
      name: 'Application Logging',
      type: 'Logging',
      status: 'healthy',
      logsProcessed: 0, // Would need actual log count
      storageUsed: 'N/A',
      lastUpdated: new Date(),
      description: 'Application logging via Morgan and console',
      metrics: {
        method: 'Morgan + Console',
        level: process.env.LOG_LEVEL || 'info'
      }
    });
    
    res.json({
      success: true,
      data: monitoring
    });
  } catch (error) {
    console.error('Get monitoring infrastructure error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch monitoring infrastructure',
      error: error.message
    });
  }
});

// Get network infrastructure
router.get('/infrastructure/networks', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), async (req, res) => {
  try {
    const networks = [];
    const networkInterfaces = os.networkInterfaces();
    let networkId = 1;
    
    // Get real network interfaces
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];
      let hasExternal = false;
      let ipv4Address = null;
      let ipv6Address = null;
      let macAddress = null;
      
      for (const iface of interfaces) {
        if (!iface.internal) {
          hasExternal = true;
          if (iface.family === 'IPv4' && !ipv4Address) {
            ipv4Address = iface.address;
          } else if (iface.family === 'IPv6' && !ipv6Address) {
            ipv6Address = iface.address;
          }
          if (!macAddress) {
            macAddress = iface.mac;
          }
        }
      }
      
      if (hasExternal || interfaces.length > 0) {
        const firstInterface = interfaces[0];
        const networkType = firstInterface.internal ? 'Internal' : 'External';
        const status = 'healthy'; // Network interfaces are typically healthy if they exist
        
        networks.push({
          id: networkId++,
          name: `${interfaceName} (${networkType})`,
          type: firstInterface.internal ? 'Internal' : 'LAN',
          status: status,
          bandwidth: { 
            used: 0, // Cannot determine actual bandwidth usage without network monitoring tools
            total: 1000, // Placeholder - would need actual network interface speed
            unit: 'Mbps' 
          },
          devices: 1, // Current server
          lastUpdated: new Date(),
          description: `${networkType.toLowerCase()} network interface`,
          metrics: {
            bandwidth: { 
              used: 0, 
              total: 1000, 
              unit: 'Mbps' 
            },
            devices: 1,
            latency: 0
          },
          interfaceInfo: {
            name: interfaceName,
            ipv4: ipv4Address || 'N/A',
            ipv6: ipv6Address || 'N/A',
            mac: macAddress || 'N/A',
            internal: firstInterface.internal,
            family: firstInterface.family
          }
        });
      }
    }
    
    // If no external networks found, add at least one entry
    if (networks.length === 0) {
      networks.push({
        id: 1,
        name: 'Local Network',
        type: 'LAN',
        status: 'healthy',
        bandwidth: { used: 0, total: 1000, unit: 'Mbps' },
        devices: 1,
        lastUpdated: new Date(),
        description: 'Local network interface',
        metrics: {
          bandwidth: { used: 0, total: 1000, unit: 'Mbps' },
          devices: 1,
          latency: 0
        }
      });
    }
    
    res.json({
      success: true,
      data: networks
    });
  } catch (error) {
    console.error('Get network infrastructure error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch network infrastructure',
      error: error.message
    });
  }
});

router.post('/infrastructure/servers/:id/restart', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.MAINTENANCE), async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real app, this would restart the actual server
    res.json({ message: 'Server restart initiated', serverId: parseInt(id) });
  } catch (error) {
    console.error('Restart server error:', error);
    res.status(500).json({ message: 'Failed to restart server' });
  }
});

router.post('/infrastructure/security/:id/scan', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.UPDATE), async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real app, this would initiate a security scan
    res.json({ message: 'Security scan initiated', securityId: parseInt(id) });
  } catch (error) {
    console.error('Run security scan error:', error);
    res.status(500).json({ message: 'Failed to run security scan' });
  }
});

// Department Management Endpoints
// Platform-level departments only (not tenant-level departments)
// Platform Admins can create, edit, and delete platform departments
router.get('/departments', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.READ), async (req, res) => {
  try {
    // Fetch platform departments (where tenantId is null - platform-level only)
    // Note: departmentHead for platform departments references TWSAdmin, not User
    let departments = await Department.find({ 
      tenantId: null,
      orgId: null 
    })
    .populate('parentDepartment', 'name code')
    .sort({ name: 1 })
    .lean();

    // Manually populate departmentHead for platform departments (TWSAdmin, not User)
    // Since we use .lean(), we need to populate manually
    const departmentHeadIds = departments
      .filter(d => d.departmentHead)
      .map(d => d.departmentHead.toString());
    
    if (departmentHeadIds.length > 0) {
      // Fetch all TWSAdmins that are managers
      const managers = await TWSAdmin.find({ 
        _id: { $in: departmentHeadIds } 
      })
      .select('fullName email role')
      .lean();
      
      // Create a map for quick lookup
      const managerMap = new Map();
      managers.forEach(manager => {
        managerMap.set(manager._id.toString(), manager);
      });
      
      // Attach manager data to departments
      departments.forEach(dept => {
        if (dept.departmentHead) {
          const managerId = dept.departmentHead.toString();
          const manager = managerMap.get(managerId);
          if (manager) {
            dept.departmentHead = manager;
          } else {
            // If not found in TWSAdmin, try User (for backward compatibility)
            // But for platform departments, this shouldn't happen
            dept.departmentHead = null;
          }
        }
      });
    }

    // Always ensure "Platform Administration" exists
    const platformAdminDept = departments.find(d => 
      d.name === 'Platform Administration' || d.name === 'Platform Administrator'
    );

    // If "Platform Administration" doesn't exist, create it
    if (!platformAdminDept) {
      try {
        const defaultDept = new Department({
          name: 'Platform Administration',
          code: 'PA',
          description: 'Platform-level department for Supra Admin users',
          status: 'active',
          tenantId: null,
          orgId: null,
          createdBy: req.user._id || new mongoose.Types.ObjectId(),
          defaultPermissions: ['read', 'write', 'admin']
        });
        await defaultDept.save();
        
        // Add it to the departments array
        departments.unshift(defaultDept.toObject());
      } catch (createError) {
        console.error('Error creating default Platform Administration department:', createError);
        // If creation fails, still return it as a virtual/default entry
        departments.unshift({
          _id: 'default-platform-administration',
          name: 'Platform Administration',
          code: 'PA',
          description: 'Platform-level department for Supra Admin users',
          status: 'active',
          isPlatformDepartment: true,
          isDefault: true
        });
      }
    } else {
      // Ensure "Platform Administration" is first in the list
      departments = departments.filter(d => 
        d.name !== 'Platform Administration' && d.name !== 'Platform Administrator'
      );
      departments.unshift(platformAdminDept);
    }

    // Build hierarchy: group departments by parent-child relationships
    const departmentMap = new Map();
    const rootDepartments = [];

    // First pass: create map of all departments
    departments.forEach(dept => {
      departmentMap.set(dept._id.toString(), {
        ...dept,
        children: []
      });
    });

    // Second pass: build parent-child relationships
    departments.forEach(dept => {
      const deptObj = departmentMap.get(dept._id.toString());
      if (dept.parentDepartment) {
        const parentId = dept.parentDepartment.toString();
        const parent = departmentMap.get(parentId);
        if (parent) {
          parent.children.push(deptObj);
        } else {
          // Parent not found, treat as root
          rootDepartments.push(deptObj);
        }
      } else {
        // No parent, it's a root department
        rootDepartments.push(deptObj);
      }
    });

    // Return hierarchical structure (root departments with children)
    res.json({
      success: true,
      data: rootDepartments
    });
  } catch (error) {
    console.error('Error fetching platform departments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch platform departments'
    });
  }
});

// POST endpoint - Create new platform department
router.post('/departments', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.CONFIGURE), [
  body('name').notEmpty().withMessage('Department name is required'),
  body('code').notEmpty().withMessage('Department code is required'),
  body('description').optional().isString(),
  body('status').optional().isIn(['active', 'inactive', 'archived']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, code, description, status, color, managerId, parentId, budget, location, contact, permissions } = req.body;

    // Check if department code already exists for platform departments
    const existingDept = await Department.findOne({ 
      code: code.toUpperCase(),
      tenantId: null,
      orgId: null
    });

    if (existingDept) {
      return res.status(400).json({
        success: false,
        message: `Department with code "${code}" already exists`
      });
    }

    // Create platform department (tenantId and orgId are null for platform-level)
    const department = new Department({
      name,
      code: code.toUpperCase(),
      description: description || '',
      status: status || 'active',
      tenantId: null, // Platform-level department
      orgId: null, // Platform-level department
      parentDepartment: parentId || null,
      departmentHead: managerId || null,
      departmentHeadModel: managerId ? 'TWSAdmin' : undefined, // Platform departments use TWSAdmin as manager
      color: color || '#1890ff',
      defaultPermissions: permissions || ['read'],
      createdBy: req.user._id,
      createdByModel: 'TWSAdmin', // Specify model type for refPath
      metadata: {
        budget: budget || 0,
        location: location || '',
        contact: contact || ''
      }
    });

    await department.save();

    res.status(201).json({
      success: true,
      message: 'Platform department created successfully',
      data: department
    });
  } catch (error) {
    console.error('Error creating platform department:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      errors: error.errors
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create platform department',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// PUT endpoint - Update platform department
router.put('/departments/:id', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.UPDATE), [
  body('name').optional().notEmpty().withMessage('Department name cannot be empty'),
  body('code').optional().notEmpty().withMessage('Department code cannot be empty'),
  body('status').optional().isIn(['active', 'inactive', 'archived']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Find platform department (must be platform-level, not tenant-level)
    const department = await Department.findOne({ 
      _id: id,
      tenantId: null,
      orgId: null
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Platform department not found'
      });
    }

    // If code is being updated, check for duplicates
    if (updateData.code && updateData.code.toUpperCase() !== department.code) {
      const existingDept = await Department.findOne({ 
        code: updateData.code.toUpperCase(),
        tenantId: null,
        orgId: null,
        _id: { $ne: id }
      });

      if (existingDept) {
        return res.status(400).json({
          success: false,
          message: `Department with code "${updateData.code}" already exists`
        });
      }
      updateData.code = updateData.code.toUpperCase();
    }

    // Update department
    Object.assign(department, updateData);
    if (updateData.managerId) {
      department.departmentHead = updateData.managerId;
      department.departmentHeadModel = 'TWSAdmin'; // Platform departments use TWSAdmin
    }
    if (updateData.parentId !== undefined) department.parentDepartment = updateData.parentId || null;
    if (updateData.permissions) department.defaultPermissions = updateData.permissions;
    if (updateData.budget !== undefined || updateData.location || updateData.contact) {
      department.metadata = {
        ...department.metadata,
        budget: updateData.budget !== undefined ? updateData.budget : department.metadata?.budget || 0,
        location: updateData.location || department.metadata?.location || '',
        contact: updateData.contact || department.metadata?.contact || ''
      };
    }

    await department.save();

    res.json({
      success: true,
      message: 'Platform department updated successfully',
      data: department
    });
  } catch (error) {
    console.error('Error updating platform department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update platform department',
      error: error.message
    });
  }
});

// DELETE endpoint - Delete platform department
router.delete('/departments/:id', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.DELETE), async (req, res) => {
  try {
    const { id } = req.params;

    // Find platform department (must be platform-level, not tenant-level)
    const department = await Department.findOne({ 
      _id: id,
      tenantId: null,
      orgId: null
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Platform department not found'
      });
    }

    // Prevent deletion of "Platform Administration" - it must always exist
    if (department.name === 'Platform Administration' || department.name === 'Platform Administrator') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete "Platform Administration" department. This is a system default department that must always exist.'
      });
    }

    // Check if any TWSAdmin users are using this department
    const usersWithDept = await TWSAdmin.countDocuments({ 
      department: department.name,
      status: 'active'
    });

    if (usersWithDept > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department. ${usersWithDept} active platform admin(s) are assigned to this department. Please reassign them first.`
      });
    }

    // Delete the department
    await Department.deleteOne({ _id: id });

    res.json({
      success: true,
      message: 'Platform department deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting platform department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete platform department',
      error: error.message
    });
  }
});

// Tenant-Department Assignment Endpoints
// NOTE: Platform departments are NOT assigned to tenants - they are for platform administrators only
// Tenant-level departments are managed within each tenant's ERP system
// These endpoints are kept for backward compatibility but return empty data
router.get('/tenant-departments', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.READ), async (req, res) => {
  try {
    // Platform departments are not assigned to tenants
    // Tenant-level departments are managed within each tenant's ERP
    res.json({
      success: true,
      data: [],
      message: 'Platform departments are not assigned to tenants. Tenant departments are managed within each tenant\'s ERP system.'
    });
  } catch (error) {
    console.error('Error fetching tenant-departments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenant-departments'
    });
  }
});

router.post('/tenant-departments', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.CONFIGURE), async (req, res) => {
  try {
    // Platform departments cannot be assigned to tenants
    return res.status(400).json({
      success: false,
      message: 'Platform departments cannot be assigned to tenants. Tenant departments are managed within each tenant\'s ERP system.'
    });
  } catch (error) {
    console.error('Error assigning departments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign departments'
    });
  }
});

router.delete('/tenant-departments/:tenantId/:departmentId', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.UPDATE), async (req, res) => {
  try {
    // Platform departments cannot be removed from tenants (they were never assigned)
    return res.status(400).json({
      success: false,
      message: 'Platform departments are not assigned to tenants. Tenant departments are managed within each tenant\'s ERP system.'
    });
  } catch (error) {
    console.error('Error removing department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove department'
    });
  }
});

// ==================== BILLING ROUTES ====================

// Get billing overview
router.get('/billing/overview', requirePlatformPermission(PLATFORM_PERMISSIONS.BILLING.READ), async (req, res) => {
  try {
    const overview = await billingService.getBillingOverview();
    res.json(overview);
  } catch (error) {
    console.error('Billing overview error:', error);
    res.status(500).json({ message: 'Failed to fetch billing overview' });
  }
});

// Create invoice
router.post('/billing/invoices', requirePlatformPermission(PLATFORM_PERMISSIONS.BILLING.INVOICES), async (req, res) => {
  try {
    const { tenantId, total, description, dueDate, invoiceNumber } = req.body;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant is required' });
    }
    const invoice = await billingService.createInvoiceFromForm(
      { tenantId, total, description, dueDate, invoiceNumber },
      req.user._id
    );
    const formatted = {
      ...invoice.toObject(),
      total: invoice.totalAmount,
      status: invoice.paymentStatus,
      tenant: invoice.tenantId
    };
    res.status(201).json({ success: true, invoice: formatted, data: { invoice: formatted } });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create invoice' });
  }
});

// Update invoice (mark paid, etc.)
router.put('/billing/invoices/:id', requirePlatformPermission(PLATFORM_PERMISSIONS.BILLING.INVOICES), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, paymentDate } = req.body;
    const invoice = await Billing.findById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    const newStatus = paymentStatus || status;
    if (newStatus) {
      // Map frontend status to Billing paymentStatus (pending, paid, failed, refunded, cancelled)
      const validStatuses = ['pending', 'paid', 'failed', 'refunded', 'cancelled'];
      invoice.paymentStatus = validStatuses.includes(newStatus) ? newStatus : (newStatus === 'sent' ? 'pending' : newStatus);
      if (invoice.paymentStatus === 'paid') {
        invoice.paidAt = paymentDate ? new Date(paymentDate) : new Date();
      }
    }
    await invoice.save();
    const populated = await Billing.findById(id).populate('tenantId', 'name slug email').lean();
    const formatted = {
      ...populated,
      total: populated.totalAmount,
      status: populated.paymentStatus,
      tenant: populated.tenantId
    };
    res.json({ success: true, invoice: formatted });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update invoice' });
  }
});

// Get all invoices
router.get('/billing/invoices', requirePlatformPermission(PLATFORM_PERMISSIONS.BILLING.INVOICES), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, tenantId } = req.query;
    const filter = {};
    
    if (status) filter.paymentStatus = status;
    if (tenantId) filter.tenantId = tenantId;
    
    const invoices = await Billing.find(filter)
      .populate('tenantId', 'name slug email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    const total = await Billing.countDocuments(filter);
    
    // Map Billing model fields to frontend expected format (total, status, tenant)
    const invoicesFormatted = invoices.map(inv => ({
      ...inv,
      total: inv.totalAmount,
      status: inv.paymentStatus,
      tenant: inv.tenantId
    }));
    
    res.json({
      data: {
        invoices: invoicesFormatted,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      },
      invoices: invoicesFormatted,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Failed to fetch invoices' });
  }
});

// Debug endpoint to verify user exists and test password (development only)
if (process.env.NODE_ENV === 'development') {
  router.post('/users/debug-verify', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check TWSAdmin
      const twsAdmin = await TWSAdmin.findOne({ email: normalizedEmail });
      
      if (twsAdmin) {
        let passwordMatch = false;
        if (password) {
          passwordMatch = await twsAdmin.comparePassword(password);
        }
        
        return res.json({
          success: true,
          found: true,
          model: 'TWSAdmin',
          user: {
            _id: twsAdmin._id,
            email: twsAdmin.email,
            fullName: twsAdmin.fullName,
            role: twsAdmin.role,
            status: twsAdmin.status,
            department: twsAdmin.department,
            hasPassword: !!twsAdmin.password,
            passwordMatch: password ? passwordMatch : 'not tested'
          }
        });
      }
      
      // Check User model
      const user = await User.findOne({ email: normalizedEmail });
      
      if (user) {
        let passwordMatch = false;
        if (password) {
          passwordMatch = await user.comparePassword(password);
        }
        
        return res.json({
          success: true,
          found: true,
          model: 'User',
          user: {
            _id: user._id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            status: user.status,
            hasPassword: !!user.password,
            passwordMatch: password ? passwordMatch : 'not tested'
          }
        });
      }
      
      return res.json({
        success: true,
        found: false,
        message: 'User not found in TWSAdmin or User models',
        searchedEmail: normalizedEmail
      });
    } catch (error) {
      console.error('Debug verify error:', error);
      res.status(500).json({
        success: false,
        message: 'Error verifying user',
        error: error.message
      });
    }
  });
}

// ==================== PLATFORM ADMIN ACCESS CONTROL ====================

const platformAdminAccessService = require('../../../services/tenant/platform-admin-access.service');
const PlatformAdminApproval = require('../../../models/PlatformAdminApproval');

// Request approval for tenant access
router.post('/access/request-approval', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.READ), async (req, res) => {
  try {
    const { tenantId, reason, justification } = req.body;

    if (!tenantId || !reason || !justification) {
      return res.status(400).json({
        success: false,
        message: 'tenantId, reason, and justification are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Validate reason
    const reasonValidation = platformAdminAccessService.validateAccessReason(reason);
    if (!reasonValidation.valid) {
      return res.status(400).json({
        success: false,
        message: reasonValidation.error,
        code: reasonValidation.code,
        allowedReasons: reasonValidation.allowedReasons
      });
    }

    // Validate justification length
    if (justification.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Justification must be at least 20 characters',
        code: 'INVALID_JUSTIFICATION'
      });
    }

    // Get tenant
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Create approval request
    const approvalResult = await platformAdminAccessService.createApprovalRequest({
      platformAdminId: req.user._id,
      platformAdminEmail: req.user.email,
      platformAdminName: req.user.fullName,
      tenantId: tenant._id,
      tenantName: tenant.name,
      reason,
      justification,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method
    });

    if (!approvalResult.success) {
      return res.status(400).json({
        success: false,
        message: approvalResult.error,
        code: 'APPROVAL_REQUEST_FAILED'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Approval request created successfully',
      data: {
        approval: approvalResult.approval,
        status: 'pending',
        message: 'Approval request is pending. You will be notified when it is reviewed.'
      }
    });
  } catch (error) {
    console.error('Request approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create approval request',
      error: error.message
    });
  }
});

// Approve access request (for managers/security team)
router.post('/access/approve/:approvalId', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.ASSIGN_ROLE), async (req, res) => {
  try {
    const { approvalId } = req.params;
    const approval = await PlatformAdminApproval.findById(approvalId);

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found'
      });
    }

    if (approval.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Approval request is already ${approval.status}`,
        code: 'INVALID_APPROVAL_STATUS'
      });
    }

    // Update approval
    approval.status = 'approved';
    approval.approvedBy = req.user._id;
    approval.approvedAt = new Date();
    approval.accessGranted = true;
    approval.accessGrantedAt = new Date();
    approval.accessExpiresAt = new Date(Date.now() + (60 * 60 * 1000)); // 1 hour

    await approval.save();

    res.json({
      success: true,
      message: 'Approval granted successfully',
      data: {
        approval,
        accessExpiresAt: approval.accessExpiresAt
      }
    });
  } catch (error) {
    console.error('Approve access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve access request',
      error: error.message
    });
  }
});

// Reject access request
router.post('/access/reject/:approvalId', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.UPDATE), async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required (minimum 10 characters)',
        code: 'MISSING_REJECTION_REASON'
      });
    }

    const approval = await PlatformAdminApproval.findById(approvalId);

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found'
      });
    }

    if (approval.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Approval request is already ${approval.status}`,
        code: 'INVALID_APPROVAL_STATUS'
      });
    }

    // Update approval
    approval.status = 'rejected';
    approval.rejectedBy = req.user._id;
    approval.rejectedAt = new Date();
    approval.rejectionReason = rejectionReason;

    await approval.save();

    res.json({
      success: true,
      message: 'Approval request rejected',
      data: { approval }
    });
  } catch (error) {
    console.error('Reject access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject access request',
      error: error.message
    });
  }
});

// Get approval requests (for current platform admin)
router.get('/access/approvals', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.READ), async (req, res) => {
  try {
    const { status, tenantId } = req.query;
    const filter = {
      platformAdminId: req.user._id
    };

    if (status) {
      filter.status = status;
    }

    if (tenantId) {
      filter.tenantId = tenantId;
    }

    const approvals = await PlatformAdminApproval.find(filter)
      .populate('tenantId', 'name slug')
      .populate('approvedBy', 'fullName email')
      .populate('rejectedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: approvals
    });
  } catch (error) {
    console.error('Get approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approval requests',
      error: error.message
    });
  }
});

// Get all pending approvals (for managers/security team)
router.get('/access/pending-approvals', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.READ), async (req, res) => {
  try {
    // Additional check: Only super admin and platform admin can view all pending approvals
    if (req.user.role !== 'platform_super_admin' && req.user.role !== 'platform_admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view all approval requests',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const approvals = await PlatformAdminApproval.find({ status: 'pending' })
      .populate('platformAdminId', 'fullName email')
      .populate('tenantId', 'name slug erpCategory subscription')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: approvals
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending approval requests',
      error: error.message
    });
  }
});

// Revoke active approval
router.post('/access/revoke/:approvalId', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.UPDATE), async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { revocationReason } = req.body;

    if (!revocationReason || revocationReason.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Revocation reason is required (minimum 10 characters)',
        code: 'MISSING_REVOCATION_REASON'
      });
    }

    const approval = await PlatformAdminApproval.findById(approvalId);

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: 'Approval not found'
      });
    }

    if (approval.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Approval is ${approval.status}, cannot revoke`,
        code: 'INVALID_APPROVAL_STATUS'
      });
    }

    // Revoke approval
    await approval.revoke(req.user._id, revocationReason);

    res.json({
      success: true,
      message: 'Approval revoked successfully',
      data: { approval }
    });
  } catch (error) {
    console.error('Revoke approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke approval',
      error: error.message
    });
  }
});

// ==================== MASTER ERP TEMPLATES ====================

// Get all Master ERP templates
router.get('/master-erp', requirePlatformPermission(PLATFORM_PERMISSIONS.TEMPLATES.READ), async (req, res) => {
  try {
    const masterERPs = await MasterERP.find()
      .sort({ usageCount: -1 })
      .populate('createdBy', 'fullName email');

    res.json({
      success: true,
      data: masterERPs
    });
  } catch (error) {
    console.error('Get Master ERP templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve Master ERP templates',
      error: error.message
    });
  }
});

// Create new Master ERP template
router.post('/master-erp', 
  requirePlatformPermission(PLATFORM_PERMISSIONS.TEMPLATES.CREATE),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('industry').isIn(['software_house', 'education', 'healthcare', 'finance']).withMessage('Invalid industry'),
    body('description').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const masterERP = new MasterERP({
        ...req.body,
        createdBy: req.user._id
      });

      await masterERP.save();

      // Log the action
      await auditService.logAdminEvent(
        'MASTER_ERP_CREATE',
        req.user._id,
        null,
        {
          masterERPId: masterERP._id,
          industry: masterERP.industry,
          details: {
            action: 'master_erp_create',
            templateName: masterERP.name
          }
        }
      );

      res.status(201).json({
        success: true,
        message: 'Master ERP template created successfully',
        data: masterERP
      });
    } catch (error) {
      console.error('Create Master ERP template error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create Master ERP template',
        error: error.message
      });
    }
  }
);

module.exports = router;
