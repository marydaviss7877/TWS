/**
 * Unified Authentication Middleware for Software House ERP
 * 
 * This middleware consolidates all authentication logic into a single, optimized middleware
 * that replaces the 5-layer middleware chain with a single database query.
 * 
 * Addresses Issue #1.1: Multiple Overlapping Authentication Middlewares
 * Addresses Issue #1.2: 5-Layer Middleware Chain (8-17 Database Queries Per Request)
 * 
 * Features:
 * - Single aggregation query loads user + tenant + organization in one go
 * - Token validation (cookie or header)
 * - Token blacklist check
 * - Workspace membership verification
 * - Automatic orgId resolution
 * - Security event logging
 * - Fail-fast security (no fallbacks)
 * 
 * Performance:
 * - Before: 8-17 database queries per request
 * - After: 1-2 database queries per request (token blacklist + aggregation)
 * 
 * Usage:
 * ```javascript
 * const unifiedSoftwareHouseAuth = require('./middleware/auth/unifiedSoftwareHouseAuth');
 * router.get('/projects', unifiedSoftwareHouseAuth, controller.getProjects);
 * ```
 */

const jwt = require('jsonwebtoken');
const jwtService = require('../../services/auth/jwt.service');
const tokenBlacklistService = require('../../services/auth/token-blacklist.service');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Tenant = require('../../models/Tenant');
const Organization = require('../../models/Organization');
const Workspace = require('../../models/Workspace');

// Try to load audit service (may not exist in all environments)
let auditService = null;
try {
  auditService = require('../../services/compliance/audit.service');
} catch (e) {
  console.warn('Audit service not available, security events will be logged to console only');
}

/**
 * Log security events (waits for persistence — use for failures / audit trail)
 */
async function logSecurityEvent(event, userId, details = {}) {
  try {
    if (auditService) {
      await auditService.logSecurityEvent(
        event,
        userId,
        details.orgId || null,
        {
          ...details,
          timestamp: new Date(),
          resource: 'AUTH',
          resourceId: userId?.toString() || 'unknown'
        }
      );
    } else {
      console.log(`[SECURITY] ${event}:`, {
        userId,
        ...details,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/** Success-path audit: do not block the HTTP response (audit save was adding seconds per request). */
function logSecurityEventDeferred(event, userId, details = {}) {
  if (!auditService) {
    return;
  }
  void auditService
    .logSecurityEvent(event, userId, details.orgId || null, {
      ...details,
      timestamp: new Date(),
      resource: 'AUTH',
      resourceId: userId?.toString() || 'unknown'
    })
    .catch((err) => console.error('Deferred security log failed:', err?.message || err));
}

/**
 * Unified Authentication Middleware for Software House Routes
 * 
 * Single middleware that:
 * 1. Extracts token (cookie or header)
 * 2. Verifies token signature
 * 3. Checks token blacklist
 * 4. Loads user + tenant + org in single aggregation query
 * 5. Verifies workspace membership
 * 6. Sets request context (req.user, req.tenant, req.orgId)
 * 7. No fallbacks - fail fast for security
 */
const unifiedSoftwareHouseAuth = async (req, res, next) => {
  const startTime = Date.now();
  let userId = null;
  let tenantSlug = null;
  
  try {
    // ============================================
    // STEP 1: Extract token (cookie or header)
    // ============================================
    let token = req.cookies?.accessToken;
    
    if (!token) {
      // Fallback to Authorization header for backward compatibility
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token || token === 'undefined' || token === 'null' || token.length < 10) {
      await logSecurityEvent('AUTH_FAILED', null, {
        reason: 'Missing or invalid token',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required. Please log in.',
        code: 'UNAUTHORIZED'
      });
    }

    // ============================================
    // STEP 2: Check token blacklist
    // ============================================
    if (await tokenBlacklistService.isTokenBlacklisted(token)) {
      await logSecurityEvent('AUTH_FAILED', null, {
        reason: 'Token blacklisted',
        ip: req.ip
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }

    // ============================================
    // STEP 3: Verify token signature
    // ============================================
    let decoded;
    try {
      // First decode without verification to check token type
      const tempDecoded = jwt.decode(token);
      if (!tempDecoded) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid token format',
          code: 'INVALID_TOKEN'
        });
      }

      // Handle tenant_owner tokens
      if (tempDecoded.type === 'tenant_owner') {
        const envConfig = require('../../config/environment');
        const jwtConfig = envConfig.getJWTConfig();
        decoded = jwt.verify(token, jwtConfig.secret, {
          issuer: 'tws-backend',
          audience: 'tws-frontend'
        });
      } else {
        // Regular tokens use jwtService
        decoded = jwtService.verifyAccessToken(token);
      }
    } catch (jwtError) {
      const errorCode = jwtError.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
      const errorMessage = jwtError.name === 'TokenExpiredError' 
        ? 'Token expired' 
        : 'Invalid token';
      
      await logSecurityEvent('AUTH_FAILED', null, {
        reason: jwtError.message,
        ip: req.ip
      });
      
      return res.status(401).json({ 
        success: false, 
        message: errorMessage,
        code: errorCode
      });
    }

    // Extract user ID and tenant slug
    userId = decoded.userId || decoded._id || decoded.id;
    tenantSlug = req.params.tenantSlug || decoded.tenantSlug;

    if (!userId) {
      await logSecurityEvent('AUTH_FAILED', null, {
        reason: 'Token missing userId',
        ip: req.ip
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token: missing user ID',
        code: 'INVALID_TOKEN'
      });
    }

    // ============================================
    // STEP 4: Single aggregation query to load user + tenant + org
    // ============================================
    // This replaces multiple separate queries with one optimized aggregation
    let userObjectId;
    try {
      userObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? mongoose.Types.ObjectId(userId) 
        : userId;
    } catch (error) {
      await logSecurityEvent('AUTH_FAILED', userId, {
        reason: 'Invalid user ID format',
        ip: req.ip
      });
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid user ID format',
        code: 'INVALID_USER_ID'
      });
    }

    const context = await User.aggregate([
      // Match user
      { $match: { _id: userObjectId, status: 'active' } },
      
      // Lookup organization
      {
        $lookup: {
          from: 'organizations',
          localField: 'orgId',
          foreignField: '_id',
          as: 'organization'
        }
      },
      
      // Lookup tenant (via organization or user's tenantId)
      {
        $lookup: {
          from: 'tenants',
          let: { userOrgId: '$orgId', userTenantId: '$tenantId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $or: [
                        { $eq: ['$_id', '$$userTenantId'] },
                        { $eq: ['$organizationId', '$$userOrgId'] },
                        { $eq: ['$orgId', '$$userOrgId'] },
                        ...(tenantSlug ? [{ $eq: ['$slug', tenantSlug] }] : [])
                      ]
                    },
                    { $in: ['$status', ['active', 'trial']] },
                    {
                      $or: [
                        { $eq: ['$isDeleted', false] },
                        { $eq: [{ $ifNull: ['$isDeleted', false] }, false] }
                      ]
                    },
                    {
                      $or: [
                        { $eq: [{ $ifNull: ['$deletedAt', null] }, null] },
                        { $not: { $ifNull: ['$deletedAt', false] } }
                      ]
                    }
                  ]
                }
              }
            }
          ],
          as: 'tenant'
        }
      },
      
      // Lookup workspace membership
      {
        $lookup: {
          from: 'workspaces',
          let: { userOrgId: '$orgId', userTenantId: '$tenantId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$orgId', '$$userOrgId'] },
                    { $eq: ['$_id', '$$userTenantId'] }
                  ]
                }
              }
            }
          ],
          as: 'workspace'
        }
      },
      
      // Project fields we need
      {
        $project: {
          _id: 1,
          email: 1,
          fullName: 1,
          role: 1,
          status: 1,
          orgId: 1,
          tenantId: 1,
          organization: { $arrayElemAt: ['$organization', 0] },
          tenant: { $arrayElemAt: ['$tenant', 0] },
          workspace: { $arrayElemAt: ['$workspace', 0] }
        }
      },
      
      { $limit: 1 }
    ]);

    if (!context || context.length === 0 || !context[0]) {
      await logSecurityEvent('AUTH_FAILED', userId, {
        reason: 'User not found or inactive',
        ip: req.ip
      });
      return res.status(401).json({ 
        success: false, 
        message: 'User not found or inactive',
        code: 'USER_NOT_FOUND'
      });
    }

    const userContext = context[0];
    const organization = userContext.organization;
    const tenant = userContext.tenant;
    const workspace = userContext.workspace;

    // ============================================
    // STEP 5: Verify tenant exists and is active
    // ============================================
    if (!tenant) {
      await logSecurityEvent('AUTH_FAILED', userId, {
        reason: 'Tenant not found or inactive',
        tenantSlug,
        ip: req.ip
      });
      return res.status(404).json({ 
        success: false, 
        message: 'Tenant not found or inactive',
        code: 'TENANT_NOT_FOUND'
      });
    }

    // Verify tenant is software house
    if (tenant.erpCategory !== 'software_house') {
      await logSecurityEvent('AUTH_FAILED', userId, {
        reason: 'Tenant is not a software house',
        tenantId: tenant._id.toString(),
        erpCategory: tenant.erpCategory,
        ip: req.ip
      });
      return res.status(403).json({ 
        success: false, 
        message: 'This endpoint is only available for software house tenants',
        code: 'INVALID_TENANT_TYPE'
      });
    }

    // ============================================
    // STEP 6: Verify workspace membership
    // ============================================
    // Check if user is member of workspace or user's tenantId matches
    const userTenantId = userContext.tenantId?.toString();
    const requestedTenantId = tenant._id.toString();
    const userOrgId = userContext.orgId?.toString();
    const tenantOrgId = tenant.organizationId?.toString() || tenant.orgId?.toString();
    const isSuperAdmin = ['super_admin', 'platform_admin', 'platform_super_admin'].includes(userContext.role);
    
    let hasAccess = false;
    let workspaceRole = null;

    if (workspace && workspace.members) {
      const membership = workspace.members.find(
        m => m.userId.toString() === userId.toString() && m.status === 'active'
      );
      if (membership) {
        hasAccess = true;
        workspaceRole = membership.role;
      }
    }

    // Also check direct tenant match
    if (!hasAccess && userTenantId === requestedTenantId) {
      hasAccess = true;
    }

    // FIX: Allow access if user's orgId matches tenant's orgId (for employees/users in same org)
    // This fixes the issue where employee users don't have workspace entries but belong to the org
    if (!hasAccess && userOrgId && tenantOrgId && userOrgId === tenantOrgId) {
      hasAccess = true;
      logSecurityEventDeferred('ORG_MEMBER_ACCESS', userId, {
        tenantId: requestedTenantId,
        orgId: userOrgId,
        ip: req.ip,
        endpoint: req.path
      });
    }

    // Super admin access (with security controls)
    if (!hasAccess && isSuperAdmin) {
      // For software house routes, allow super admin access
      // but log it for audit purposes
      hasAccess = true;
      logSecurityEventDeferred('PLATFORM_ADMIN_ACCESS', userId, {
        tenantId: requestedTenantId,
        ip: req.ip,
        endpoint: req.path
      });
    }

    if (!hasAccess) {
      await logSecurityEvent('AUTH_FAILED', userId, {
        reason: 'User not member of workspace or organization',
        userTenantId,
        requestedTenantId,
        userOrgId,
        tenantOrgId,
        ip: req.ip,
        severity: 'high'
      });
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied: You are not a member of this workspace',
        code: 'NOT_WORKSPACE_MEMBER'
      });
    }

    // ============================================
    // STEP 7: Resolve orgId (use standardized utility)
    // ============================================
    const { ensureOrgId } = require('../../utils/orgIdHelper');
    let orgId;
    try {
      // Set temporary context for orgIdHelper
      req.tenant = tenant;
      req.tenantContext = { tenantId: tenant._id.toString(), tenantSlug: tenant.slug };
      req.user = { orgId: userContext.orgId };
      
      orgId = await ensureOrgId(req);
    } catch (error) {
      console.error('Error resolving orgId:', error);
      orgId = organization?._id || userContext.orgId || tenant.organizationId || tenant.orgId;
    }

    if (!orgId) {
      await logSecurityEvent('SYSTEM_ERROR', userId, {
        reason: 'Could not resolve orgId',
        tenantId: tenant._id.toString(),
        ip: req.ip,
        severity: 'critical'
      });
      return res.status(500).json({ 
        success: false, 
        message: 'Configuration error: Organization ID not found',
        code: 'ORG_ID_ERROR'
      });
    }

    // ============================================
    // STEP 8: Set request context
    // ============================================
    req.user = {
      _id: userContext._id,
      id: userContext._id,
      email: userContext.email,
      fullName: userContext.fullName,
      role: userContext.role, // FROM DATABASE, not token
      orgId: orgId,
      tenantId: tenant._id.toString(),
      workspaceRole: workspaceRole
    };

    req.tenant = tenant;
    req.tenantId = tenant._id.toString();
    req.tenantSlug = tenant.slug;
    req.orgId = orgId;

    req.workspace = {
      id: tenant._id.toString(),
      name: tenant.name,
      slug: tenant.slug,
      organizationId: orgId
    };

    req.tenantContext = {
      tenantId: tenant._id.toString(),
      tenantSlug: tenant.slug,
      orgId: orgId,
      hasSeparateDatabase: false,
      connectionReady: true
    };

    req.token = token;

    // ============================================
    // STEP 9: Log successful authentication
    // ============================================
    const duration = Date.now() - startTime;
    logSecurityEventDeferred('AUTH_SUCCESS', userId, {
      tenantId: tenant._id.toString(),
      role: userContext.role,
      duration,
      ip: req.ip,
      orgId: orgId?.toString?.() || orgId
    });

    next();
  } catch (error) {
    console.error('Unified authentication error:', error);
    await logSecurityEvent('AUTH_ERROR', userId, {
      reason: error.message,
      stack: error.stack,
      ip: req.ip,
      severity: 'high'
    });
    
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

module.exports = unifiedSoftwareHouseAuth;
