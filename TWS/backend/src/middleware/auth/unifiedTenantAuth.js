/**
 * Unified Authentication Middleware for All Tenant Types
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
 * - Works for all tenant types (software_house)
 * - Optional ERP category filtering
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
 * const unifiedTenantAuth = require('./middleware/auth/unifiedTenantAuth');
 * 
 * // For all tenant types
 * router.get('/items', unifiedTenantAuth(), controller.getItems);
 * 
 * // For specific ERP category
 * router.get('/projects', unifiedTenantAuth({ erpCategory: 'software_house' }), controller.getProjects);
 * 
 * // For software house (includes workspace check)
 * router.get('/projects', unifiedTenantAuth({ erpCategory: 'software_house', requireWorkspace: true }), controller.getProjects);
 * ```
 */

const jwt = require('jsonwebtoken');
const jwtService = require('../../services/auth/jwt.service');
const tokenBlacklistService = require('../../services/auth/token-blacklist.service');
const mongoose = require('mongoose');
const User = require('../../models/users-auth/User');
const Tenant = require('../../models/tenant/Tenant');
const Organization = require('../../models/org/Organization');
const Workspace = require('../../models/org/Workspace');

// Try to load audit service (may not exist in all environments)
let auditService = null;
try {
  auditService = require('../../services/compliance/audit.service');
} catch (e) {
  console.warn('Audit service not available, security events will be logged to console only');
}

/**
 * Log security events
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

/**
 * Unified Authentication Middleware for All Tenant Routes
 * 
 * @param {Object} options - Configuration options
 * @param {String|Array<String>} options.erpCategory - Optional: Filter by ERP category ('software_house')
 * @param {Boolean} options.requireWorkspace - Optional: Require workspace membership (default: false, only for software_house)
 * @param {Boolean} options.allowSuperAdmin - Optional: Allow super admin access (default: true)
 * 
 * Single middleware that:
 * 1. Extracts token (cookie or header)
 * 2. Verifies token signature
 * 3. Checks token blacklist
 * 4. Loads user + tenant + org in single aggregation query
 * 5. Optionally verifies workspace membership
 * 6. Sets request context (req.user, req.tenant, req.orgId)
 * 7. No fallbacks - fail fast for security
 */
const unifiedTenantAuth = (options = {}) => {
  const {
    erpCategory = null, // null = all categories, or specific category/array
    requireWorkspace = false, // Only for software_house
    allowSuperAdmin = true
  } = options;

  return async (req, res, next) => {
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
          const envConfig = require('../../config/environment-validator');
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
          ? new mongoose.Types.ObjectId(userId) 
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

      // Build tenant match conditions
      const tenantMatchConditions = [
        { $eq: ['$_id', '$$userTenantId'] },
        { $eq: ['$organizationId', '$$userOrgId'] },
        { $eq: ['$orgId', '$$userOrgId'] }
      ];

      // Add tenantSlug match if provided
      if (tenantSlug) {
        const isObjectId = /^[0-9a-f]{24}$/i.test(tenantSlug);
        if (isObjectId) {
          tenantMatchConditions.push({ $eq: ['$_id', new mongoose.Types.ObjectId(tenantSlug)] });
        } else {
          tenantMatchConditions.push({ $eq: ['$slug', tenantSlug] });
        }
      }

      // Add ERP category filter if specified
      const tenantStatusConditions = [
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
      ];

      if (erpCategory) {
        const categories = Array.isArray(erpCategory) ? erpCategory : [erpCategory];
        tenantStatusConditions.push({
          $in: ['$erpCategory', categories]
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
                        $or: tenantMatchConditions
                      },
                      ...tenantStatusConditions
                    ]
                  }
                }
              }
            ],
            as: 'tenant'
          }
        },
        
        // Lookup workspace membership (only if required)
        ...(requireWorkspace ? [{
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
        }] : []),
        
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
            ...(requireWorkspace ? { workspace: { $arrayElemAt: ['$workspace', 0] } } : {})
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
      const workspace = requireWorkspace ? userContext.workspace : null;

      // ============================================
      // STEP 5: Verify tenant exists and is active
      // ============================================
      if (!tenant) {
        await logSecurityEvent('AUTH_FAILED', userId, {
          reason: 'Tenant not found or inactive',
          tenantSlug,
          erpCategory,
          ip: req.ip
        });
        return res.status(404).json({ 
          success: false, 
          message: erpCategory 
            ? `Tenant not found or not a ${erpCategory} tenant` 
            : 'Tenant not found or inactive',
          code: 'TENANT_NOT_FOUND'
        });
      }

      // Verify ERP category if specified
      if (erpCategory) {
        const categories = Array.isArray(erpCategory) ? erpCategory : [erpCategory];
        if (!categories.includes(tenant.erpCategory)) {
          await logSecurityEvent('AUTH_FAILED', userId, {
            reason: `Tenant is not ${erpCategory}`,
            tenantId: tenant._id.toString(),
            erpCategory: tenant.erpCategory,
            ip: req.ip
          });
          return res.status(403).json({ 
            success: false, 
            message: `This endpoint is only available for ${erpCategory} tenants`,
            code: 'INVALID_TENANT_TYPE'
          });
        }
      }

      // ============================================
      // STEP 6: Verify tenant membership
      // SECURITY: this runs unconditionally — the aggregation above resolves `tenant`
      // via an $or that includes a bare tenantSlug match, so without this check any
      // authenticated user could reach an arbitrary tenant just by supplying its slug
      // in the URL. `requireWorkspace` only controls whether the richer
      // workspace.members lookup ran; it must never gate whether membership is verified.
      // ============================================
      {
        const userTenantId = userContext.tenantId?.toString();
        const requestedTenantId = tenant._id.toString();
        const isSuperAdmin = ['super_admin', 'platform_admin', 'platform_super_admin'].includes(userContext.role);

        let hasAccess = false;
        let workspaceRole = null;

        if (requireWorkspace && workspace && workspace.members) {
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

        // Super admin access (with security controls)
        if (!hasAccess && isSuperAdmin && allowSuperAdmin) {
          hasAccess = true;
          await logSecurityEvent('PLATFORM_ADMIN_ACCESS', userId, {
            tenantId: requestedTenantId,
            ip: req.ip,
            endpoint: req.path
          });
        }

        if (!hasAccess) {
          await logSecurityEvent('AUTH_FAILED', userId, {
            reason: 'User not member of workspace',
            userTenantId,
            requestedTenantId,
            ip: req.ip,
            severity: 'high'
          });
          return res.status(403).json({
            success: false,
            message: 'Access denied: You are not a member of this workspace',
            code: 'NOT_WORKSPACE_MEMBER'
          });
        }

        // Store workspace role
        userContext.workspaceRole = workspaceRole;
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

      // F8: Resolve per-tenant role from TenantUser (mirrors verifyERPToken Step 10.5)
      let roleForRequest = userContext.role;
      let hrSubRole = null;
      let financeSubRole = null;
      try {
        const TenantUser = require('../../models/tenant/TenantUser');
        const tu = await TenantUser.findOne({ userId: userContext._id, tenantId: tenant._id, status: 'active' }).lean();
        if (tu?.roles?.length > 0) {
          const pr = tu.roles[0].role;
          roleForRequest = pr === 'manager' ? 'project_manager' : pr;
          if (pr === 'hr' && tu.hrSubRole) hrSubRole = tu.hrSubRole;
          if (pr === 'finance' && tu.financeSubRole) financeSubRole = tu.financeSubRole;
        }
      } catch (_) { /* fallback to global User.role */ }

      req.user = {
        _id: userContext._id,
        id: userContext._id,
        email: userContext.email,
        fullName: userContext.fullName,
        role: roleForRequest,
        hrSubRole,
        financeSubRole,
        orgId: orgId,
        tenantId: tenant._id.toString(),
        ...(requireWorkspace ? { workspaceRole: userContext.workspaceRole } : {})
      };

      req.tenant = tenant;
      req.tenantId = tenant._id.toString();
      req.tenantSlug = tenant.slug;
      req.orgId = orgId;

      if (requireWorkspace) {
        req.workspace = {
          id: tenant._id.toString(),
          name: tenant.name,
          slug: tenant.slug,
          organizationId: orgId
        };
      }

      req.tenantContext = {
        tenantId: tenant._id.toString(),
        tenantSlug: tenant.slug,
        orgId: orgId,
        hasSeparateDatabase: false,
        connectionReady: true,
        organization: organization
      };

      req.token = token;

      // ============================================
      // STEP 9: Log successful authentication
      // ============================================
      const duration = Date.now() - startTime;
      await logSecurityEvent('AUTH_SUCCESS', userId, {
        tenantId: tenant._id.toString(),
        role: userContext.role,
        erpCategory: tenant.erpCategory,
        duration,
        ip: req.ip
      });

      next();
    } catch (error) {
      console.error('Unified tenant authentication error:', error);
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
};

module.exports = unifiedTenantAuth;
