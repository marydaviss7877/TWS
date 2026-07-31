const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
// Use mergeParams: true to access :tenantSlug from parent route (/api/tenant/:tenantSlug/organization)
const router = express.Router({ mergeParams: true });
const Tenant = require('../../../models/tenant/Tenant');
const Organization = require('../../../models/org/Organization');
const DepartmentAccess = require('../../../models/org/DepartmentAccess');
const User = require('../../../models/users-auth/User');
const Employee = require('../../../models/hr-payroll/Employee');
const LeaveRequest = require('../../../models/hr-payroll/LeaveRequest');
const { PayrollRecord, PayrollCycle } = require('../../../models/hr-payroll/Payroll');
const { buildEmployeeTimeMap, buildPayrollTimeSnapshot } = require('../../../services/hr/payroll-time-sync.service');
const OrgLeavePolicy = require('../../../models/org/OrgLeavePolicy');
const TenantSettings = require('../../../models/tenant/TenantSettings');
const TenantAuditLog = require('../../../models/tenant/TenantAuditLog');
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../../../middleware/auth/auth');
const tenantOrgService = require('../../../services/tenant/tenant-org.service');
const recruitmentService = require('../../../services/hr/recruitment.service');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const { tokenVerificationLimiter, strictLimiter } = require('../../../middleware/rateLimiting/rateLimiter');

const attendanceRead = requireErpAccess({ module: 'attendance', action: 'read', checkRevocation: false });
const attendanceWrite = requireErpAccess({ module: 'attendance', action: 'write', checkRevocation: false });
const employeesRead = requireErpAccess({ module: 'employees', action: 'read', checkRevocation: false });
const employeesWrite = requireErpAccess({ module: 'employees', action: 'write', checkRevocation: false });
const ADMIN_LIKE_ROLES = new Set(['owner', 'admin', 'super_admin', 'org_manager', 'org_admin', 'tenant_owner', 'hr']);

const TenantMiddleware = require('../../../middleware/tenant/tenantMiddleware');
const { checkUsageLimitSoftwareHouseOnly, checkReadOnlySoftwareHouseOnly } = require('../../../middleware/common/featureGate');
const CLIENT_PORTAL_ROLES = new Set(['client', 'customer']);
const SETTINGS_ADMIN_ROLES = new Set([
  'owner',
  'admin',
  'super_admin',
  'org_manager',
  'org_admin',
  'tenant_owner',
  'ceo'
]);

const denyClientSettingsAccess = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (CLIENT_PORTAL_ROLES.has(role)) {
    return res.status(403).json({
      success: false,
      message: 'Client users cannot access organization settings.',
      code: 'CLIENT_SETTINGS_FORBIDDEN'
    });
  }
  next();
};

const requireSettingsAdmin = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (!SETTINGS_ADMIN_ROLES.has(role)) {
    return res.status(403).json({
      success: false,
      message: 'Only organization admins can modify organization settings.',
      code: 'SETTINGS_ADMIN_REQUIRED'
    });
  }
  next();
};

// Gates user-management writes (create/update/delete/password reset) to admin-like roles.
// req.user.role is resolved server-side from TenantUser/User in verifyERPToken — never client-supplied.
const requireUserManagementAdmin = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (!SETTINGS_ADMIN_ROLES.has(role)) {
    return res.status(403).json({
      success: false,
      message: 'Only organization admins can manage users.',
      code: 'USER_MANAGEMENT_ADMIN_REQUIRED'
    });
  }
  next();
};

const getExistingUploadPathOrNull = async (relativePath) => {
  if (!relativePath || typeof relativePath !== 'string' || !relativePath.startsWith('/uploads/')) {
    return null;
  }
  try {
    const absolutePath = path.join(process.cwd(), relativePath.replace(/^\//, ''));
    await fs.access(absolutePath);
    return relativePath;
  } catch {
    return null;
  }
};

const setTimeOnDate = (baseDate, hhmm) => {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [hh, mm] = hhmm.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(hh, mm, 0, 0);
  return d;
};

const resolvePayrollPeriodRange = (period) => {
  if (!period) return null;
  const periodDate = new Date(`${period}-01T00:00:00.000Z`);
  if (Number.isNaN(periodDate.getTime())) return null;
  const start = new Date(Date.UTC(periodDate.getUTCFullYear(), periodDate.getUTCMonth(), 1));
  const end = new Date(Date.UTC(periodDate.getUTCFullYear(), periodDate.getUTCMonth() + 1, 1));
  return { start, end };
};

// @deprecated - Use verifyERPToken middleware instead
// This function is kept for backward compatibility but should not be used in new code
// Will be removed in a future version
const verifyTenantOrgAccess = async (req, res, next) => {
  try {
    const { tenantSlug } = req.params;
    // SECURITY FIX: Accept token from cookies (Software House/Education use cookies) OR Authorization header
    let token = req.cookies?.accessToken;
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.replace('Bearer ', '').trim();
      } else if (authHeader) {
        token = authHeader.trim();
      }
    }
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }
    
    // Check if token is empty or malformed
    if (!token || token === 'undefined' || token === 'null' || token.length < 10) {
      return res.status(401).json({ success: false, message: 'Invalid or missing token' });
    }

    // Verify token using jwtService for proper validation
    const jwtService = require('../../../services/auth/jwt.service');
    let decoded;
    try {
      // Try to verify using jwtService first (handles issuer/audience validation)
      decoded = jwtService.verifyAccessToken(token);
    } catch (jwtServiceError) {
      // Fallback to direct JWT verification if jwtService fails (for tenant_owner tokens)
      try {
        const envConfig = require('../../../config/environment');
        const jwtConfig = envConfig.getJWTConfig();
        decoded = jwt.verify(token, jwtConfig.secret, {
          issuer: 'tws-backend',
          audience: 'tws-frontend'
        });
      } catch (jwtError) {
        // Only log if it's not a malformed token (to reduce spam)
        if (jwtError.message !== 'jwt malformed') {
          console.error('Token verification failed:', jwtError.message);
        }
        // If token is expired, provide a more helpful error message
        if (jwtError.name === 'TokenExpiredError') {
          return res.status(401).json({ 
            success: false, 
            message: 'Token expired', 
            error: 'TokenExpiredError',
            expiredAt: jwtError.expiredAt
          });
        }
        // For malformed tokens, return a clearer message
        if (jwtError.message === 'jwt malformed') {
          return res.status(401).json({ success: false, message: 'Invalid token format' });
        }
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
    }
    
    // SECURITY FIX: Single deterministic lookup to prevent enumeration attacks
    // Only try slug first, then ObjectId if it matches format
    // Don't try multiple fallbacks as it enables timing attacks
    let tenant = null;
    
    // Check if tenantSlug looks like MongoDB ObjectId (24 hex chars)
    const isObjectId = /^[0-9a-f]{24}$/i.test(tenantSlug);
    
    if (isObjectId) {
      // If it's an ObjectId format, try findById first (faster)
      tenant = await Tenant.findById(tenantSlug).lean();
    } else {
      // Otherwise, try slug lookup (most common case)
      tenant = await Tenant.findOne({ slug: tenantSlug }).lean();
    }
    
    // SECURITY FIX: Log failed lookup attempts for security monitoring
    if (!tenant) {
      console.error('❌ Tenant not found:', { 
        tenantSlug, 
        searchedBy: isObjectId ? 'id' : 'slug',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // SECURITY FIX: Log security event for failed tenant lookup
      try {
        const auditService = require('../../../services/compliance/audit.service');
        await auditService.logEvent({
          action: 'TENANT_LOOKUP_FAILED',
          userId: decoded?.userId || 'anonymous',
          userEmail: decoded?.email || 'unknown',
          userRole: decoded?.role || 'unknown',
          organization: null,
          tenantId: 'unknown',
          resource: 'TENANT',
          resourceId: tenantSlug,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.get('User-Agent'),
          details: {
            method: req.method,
            endpoint: req.path,
            reason: 'Tenant not found',
            searchedBy: isObjectId ? 'id' : 'slug'
          },
          severity: 'medium',
          status: 'failure'
        });
      } catch (auditError) {
        console.error('Failed to log tenant lookup failure:', auditError);
      }
      
      return res.status(404).json({ 
        success: false, 
        message: 'Tenant not found',
        code: 'TENANT_NOT_FOUND',
        traceId: req.headers['x-request-id'] || req.id
      });
    }
    
    // SECURITY FIX: Check if tenant is deleted/disabled
    if (tenant.isDeleted || tenant.status === 'disabled' || tenant.status === 'suspended') {
      return res.status(403).json({ 
        success: false, 
        message: 'Tenant access is disabled',
        code: 'TENANT_DISABLED',
        traceId: req.headers['x-request-id'] || req.id
      });
    }
    
    // Log tenant structure for debugging
    console.log('🔍 Tenant found:', {
      tenantId: tenant._id.toString(),
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      organizationId: tenant.organizationId?.toString(),
      orgId: tenant.orgId?.toString(),
      erpCategory: tenant.erpCategory
    });

    // Check if user has access to this tenant
    let hasAccess = false;
    
    // Log decoded token for debugging
    console.log('🔍 Token verification - decoded token:', {
      type: decoded.type,
      role: decoded.role,
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      id: decoded.id,
      _id: decoded._id,
      email: decoded.email,
      ownerId: decoded.ownerId,
      ownerEmail: decoded.ownerEmail,
      tenantSlug: decoded.tenantSlug,
      allKeys: Object.keys(decoded)
    });
    
    console.log('🔍 Tenant matching check:', {
      decodedType: decoded.type,
      decodedTenantId: decoded.tenantId,
      decodedUserId: decoded.userId,
      tenantId: tenant._id.toString(),
      tenantIdMatch: decoded.tenantId === tenant._id.toString(),
      userIdMatch: decoded.userId === tenant._id.toString()
    });
    
    // Case 1: Tenant owner access (tenant_owner token type)
    if (decoded.type === 'tenant_owner' && 
        (decoded.tenantId === tenant._id.toString() || 
         decoded.userId === tenant._id.toString())) {
      hasAccess = true;
      // CRITICAL FIX: Set req.user for tenant_owner tokens so requireRole middleware works
      // Use 'owner' role which is recognized by RBAC (level 70 in role hierarchy)
      req.user = {
        _id: decoded.userId || decoded.ownerId || decoded.id || tenant._id,
        role: 'owner', // Always use 'owner' role for tenant_owner tokens (matches requireRole(['owner']))
        type: decoded.type,
        email: decoded.ownerEmail || decoded.email,
        tenantId: decoded.tenantId || tenant._id.toString(),
        tenantSlug: decoded.tenantSlug || tenant.slug,
        orgId: tenant.orgId || tenant.organizationId
      };
      req.decoded = decoded;
      console.log('✅ Tenant owner access granted - req.user set:', {
        userId: req.user._id,
        role: req.user.role,
        email: req.user.email,
        tenantSlug: tenantSlug,
        hasUser: !!req.user,
        userKeys: Object.keys(req.user)
      });
    }
    
    // Case 1.5: Check for admin token types (tws_admin, etc.)
    // Admin tokens should have access to all tenants
    if (!hasAccess && (decoded.type === 'tws_admin' || decoded.type === 'admin')) {
      hasAccess = true;
      req.user = {
        _id: decoded._id || decoded.userId || decoded.id,
        role: decoded.role || 'admin',
        type: decoded.type,
        email: decoded.email
      };
      req.decoded = decoded;
      console.log('✅ Admin token access granted (admin token type):', {
        tokenType: decoded.type,
        role: decoded.role,
        tenantSlug: tenantSlug
      });
    }
    
    // Case 1.6: Check for admin roles directly in token (before user lookup)
    // This handles cases where userId might be missing but role is present in token
    if (!hasAccess && decoded.type !== 'tenant_owner') {
      const tokenRole = decoded.role || decoded.userRole;
      const isAdminFromToken = tokenRole && ['admin', 'super_admin', 'superadmin', 'platform_admin', 'platform_super_admin'].includes(tokenRole.toLowerCase());
      
      if (isAdminFromToken) {
        hasAccess = true;
        // Create a minimal user object from token data
        req.user = {
          _id: decoded._id || decoded.userId || decoded.id,
          role: tokenRole,
          type: decoded.type,
          email: decoded.email
        };
        req.decoded = decoded;
        console.log('✅ Admin user access granted from token role:', {
          tokenRole: tokenRole,
          decodedType: decoded.type,
          tenantSlug: tenantSlug
        });
      }
    }
    
    // Case 2: Tenant users authenticated via main auth (org-based access)
    // Check if user is an org-bound user and their orgId matches the tenant's orgId
    // Regular user tokens have type: 'access' (not 'user'), so check for userId or id
    if (!hasAccess && decoded.type !== 'tenant_owner') {
      try {
        // Try multiple possible fields for user ID
        const userId = decoded.userId || decoded.id || decoded._id || 
                      (typeof decoded.userId === 'object' ? decoded.userId._id : null) ||
                      (typeof decoded.id === 'object' ? decoded.id._id : null);
        
        if (!userId) {
          console.log('⚠️ No userId found in token:', { 
            decodedKeys: Object.keys(decoded),
            decodedType: decoded.type 
          });
          
          // Fallback: Try to fetch user by email if userId is missing but email exists
          if (decoded.email && decoded.type === 'access') {
            try {
              console.log('🔍 Attempting to fetch user by email:', decoded.email);
              const userByEmail = await User.findOne({ email: decoded.email })
                .select('role orgId tenantId _id')
                .populate('orgId', 'slug name _id')
                .lean();
              
              if (userByEmail) {
                const isAdminUser = ['admin', 'super_admin', 'superadmin'].includes(userByEmail.role?.toLowerCase());
                if (isAdminUser) {
                  hasAccess = true;
                  req.user = userByEmail;
                  req.decoded = decoded;
                  console.log('✅ Admin user access granted via email lookup:', {
                    userId: userByEmail._id.toString(),
                    userRole: userByEmail.role,
                    tenantSlug: tenantSlug
                  });
                } else {
                  console.log('⚠️ User found by email but not admin:', {
                    email: decoded.email,
                    role: userByEmail.role
                  });
                }
              }
            } catch (emailLookupError) {
              console.error('❌ Error fetching user by email:', emailLookupError);
            }
          }
          
          // Skip org-bound user check if no userId and email lookup didn't grant access
          if (!hasAccess) {
            // Continue to next check
          }
        } else {
          console.log('🔍 Checking org-bound user access:', {
            decodedType: decoded.type,
            decodedUserId: decoded.userId,
            decodedId: decoded.id,
            userId,
            tenantSlug
          });
          
          // Fetch user with all necessary fields - use lean() for better performance and to get all fields
          // IMPORTANT: Populate orgId to get slug for matching
          const user = await User.findById(userId)
            .select('role orgId tenantId')
            .populate('orgId', 'slug name _id')
            .lean();
          
          // If orgId is not populated (still ObjectId), fetch it manually
          if (user && user.orgId && typeof user.orgId === 'string') {
            const Organization = require('../../../models/org/Organization');
            const org = await Organization.findById(user.orgId).select('slug name _id').lean();
            if (org) {
              user.orgId = org;
            }
          }
          
          const userTenantId = user?.tenantId;
          
          if (user) {
            const isOrgBasedUser = ['principal', 'head_teacher', 'teacher', 'student', 'owner', 'admin', 'org_manager'].includes(user.role);
            
            console.log('🔍 User found:', {
              userId: user._id.toString(),
              userRole: user.role,
              isOrgBasedUser,
              orgId: user.orgId?._id?.toString(),
              orgSlug: user.orgId?.slug,
              orgName: user.orgId?.name,
              userTenantId: userTenantId
            });
            
            // Check if user has access to this tenant
            if (isOrgBasedUser) {
              // Method 1: Match by orgId slug (tenant slug usually matches org slug)
              // This is the PRIMARY and MOST COMMON match for org-bound users
              const orgSlugMatches = user.orgId?.slug === tenantSlug;
              
              // EARLY RETURN: If org slug matches tenant slug, grant access immediately
              // This handles 99% of org-bound user access cases
              if (orgSlugMatches) {
                hasAccess = true;
                req.user = user;
                req.decoded = decoded;
                console.log('✅ Education user access granted - orgSlug matches tenantSlug (PRIMARY MATCH):', {
                  orgSlug: user.orgId?.slug,
                  tenantSlug: tenantSlug,
                  userRole: user.role
                });
              } else {
                // Continue with other matching methods only if primary match fails
              
                // Method 2: Match by orgId if tenant has orgId reference
                const orgIdMatches = tenant.orgId && user.orgId?._id?.toString() === tenant.orgId.toString();
              
                // Method 3: Match by tenant slug with tenant's _id (if tenant slug is ObjectId)
                const tenantIdMatches = tenant._id.toString() === tenantSlug || tenant.tenantId === tenantSlug;
              
                // Method 4: Match by user's tenantId field (if it exists) with tenant slug
                const userTenantIdMatches = userTenantId && (
                  userTenantId === tenantSlug || 
                  userTenantId === tenant._id.toString() ||
                  userTenantId === tenant.tenantId ||
                  (typeof userTenantId === 'object' && userTenantId.toString() === tenant._id.toString())
                );
              
                // Method 5: If tenant has a slug field, match it directly
                const tenantSlugMatches = tenant.slug === tenantSlug;
              
                // Method 6: If tenant slug matches org slug (common case for legacy)
                const tenantSlugMatchesOrgSlug = tenant.slug === user.orgId?.slug;
              
                // Method 7: Try to find tenant by organization - if org has a tenant with matching slug
                let orgTenantMatches = false;
                if (user.orgId?._id) {
                  try {
                    // Check if there's a tenant that belongs to this organization
                    const orgTenant = await Tenant.findOne({ 
                      $or: [
                        { orgId: user.orgId._id },
                        { slug: user.orgId.slug },
                        { tenantId: user.orgId.slug }
                      ]
                    });
                    if (orgTenant && (orgTenant._id.toString() === tenant._id.toString() || orgTenant.slug === tenantSlug)) {
                      orgTenantMatches = true;
                    }
                  } catch (orgTenantError) {
                    // Ignore error, just continue with other checks
                  }
                }
              
                // Method 8: Most permissive - if tenant slug matches org slug, grant access
                // This is the most common case for legacy: tenant slug = org slug
                const tenantSlugEqualsOrgSlug = tenantSlug === user.orgId?.slug || tenant.slug === user.orgId?.slug;
              
                // CRITICAL FIX: Add explicit check for tenant.organizationId or tenant.orgId matching user.orgId
                // This is the most reliable match for org-bound users
                // Check both organizationId (set during legacy signup) and orgId (if exists)
                // MUST be declared BEFORE console.log to avoid "before initialization" error
                const tenantOrgId = tenant.organizationId || tenant.orgId;
                const tenantOrgIdMatches = tenantOrgId && 
                                           user.orgId?._id && 
                                           tenantOrgId.toString() === user.orgId._id.toString();
              
                console.log('🔍 Education user access check (fallback methods):', {
                  userId: user._id.toString(),
                  userRole: user.role,
                  orgSlug: user.orgId?.slug,
                  orgIdType: typeof user.orgId,
                  orgIdValue: user.orgId,
                  tenantSlug: tenantSlug,
                  tenantActualSlug: tenant.slug,
                  orgIdMatches,
                  tenantIdMatches,
                  tenantSlugMatches,
                  tenantSlugMatchesOrgSlug,
                  tenantSlugEqualsOrgSlug,
                  userTenantIdMatches,
                  orgTenantMatches,
                  tenantOrgId: tenant.orgId?.toString(),
                  tenantOrganizationId: tenant.organizationId?.toString(),
                  tenantId: tenant._id.toString(),
                  userTenantId: userTenantId,
                  tenantOrgIdMatches: tenantOrgIdMatches
                });
              
                if (orgIdMatches || tenantSlugMatches || tenantSlugMatchesOrgSlug || tenantSlugEqualsOrgSlug || userTenantIdMatches || orgTenantMatches || tenantOrgIdMatches) {
                  hasAccess = true;
                  // Set user on request for use in route handlers
                  req.user = user;
                  req.decoded = decoded;
                  console.log('✅ Education user access granted via fallback matching criteria:', {
                    orgIdMatches,
                    tenantSlugMatches,
                    tenantSlugMatchesOrgSlug,
                    tenantSlugEqualsOrgSlug,
                    userTenantIdMatches,
                    orgTenantMatches,
                    tenantOrgIdMatches
                  });
                } else {
                  console.log('❌ Education user access denied - no matching criteria');
                  console.log('❌ Detailed mismatch:', {
                    userOrgId: user.orgId?._id?.toString(),
                    tenantOrgId: tenant.organizationId?.toString(),
                    tenantSlugFromParam: tenantSlug,
                    tenantSlugFromDB: tenant.slug,
                    userOrgSlug: user.orgId?.slug
                  });
                }
              } // Close the else block for orgSlugMatches check
            } else {
              // Case 3: Admin users and other privileged roles should have access to tenants
              // Check if user has admin or super_admin role
              const isAdminUser = ['admin', 'super_admin', 'superadmin'].includes(user.role?.toLowerCase());
              
              if (isAdminUser) {
                // Admin users have access to all tenants
                hasAccess = true;
                req.user = user;
                req.decoded = decoded;
                console.log('✅ Admin user access granted:', {
                  userId: user._id.toString(),
                  userRole: user.role,
                  tenantSlug: tenantSlug
                });
              } else {
                // Check if user has tenantId that matches this tenant
                const userTenantIdMatches = userTenantId && (
                  userTenantId === tenantSlug || 
                  userTenantId === tenant._id.toString() ||
                  userTenantId === tenant.tenantId ||
                  (typeof userTenantId === 'object' && userTenantId.toString() === tenant._id.toString())
                );
                
                // CRITICAL FIX: Also check if user's orgId matches tenant's organizationId
                // This is needed for software house employees whose tokens don't have tenantId
                const tenantOrgId = tenant.organizationId || tenant.orgId;
                const userOrgIdMatches = tenantOrgId && 
                                         user.orgId && 
                                         (tenantOrgId.toString() === user.orgId.toString() ||
                                          (typeof user.orgId === 'object' && user.orgId._id && tenantOrgId.toString() === user.orgId._id.toString()));
                
                // Also check if tenantSlug matches orgSlug (common for software house)
                const tenantSlugMatchesOrgSlug = user.orgId?.slug && 
                                                  (tenantSlug === user.orgId.slug || tenant.slug === user.orgId.slug);
                
                if (userTenantIdMatches || userOrgIdMatches || tenantSlugMatchesOrgSlug) {
                  hasAccess = true;
                  req.user = user;
                  req.decoded = decoded;
                  console.log('✅ User access granted:', {
                    userId: user._id.toString(),
                    userRole: user.role,
                    userTenantId: userTenantId,
                    tenantSlug: tenantSlug,
                    userTenantIdMatches,
                    userOrgIdMatches,
                    tenantSlugMatchesOrgSlug,
                    userOrgId: typeof user.orgId === 'object' ? user.orgId._id?.toString() : user.orgId?.toString(),
                    tenantOrgId: tenantOrgId?.toString()
                  });
                } else {
                  console.log('⚠️ User is not an org-bound user or admin, and tenantId/orgId does not match:', {
                    userRole: user.role,
                    userTenantId: userTenantId,
                    tenantSlug: tenantSlug,
                    userOrgId: typeof user.orgId === 'object' ? user.orgId._id?.toString() : user.orgId?.toString(),
                    tenantOrgId: tenantOrgId?.toString()
                  });
                }
              }
            }
          } else {
            console.log('❌ User not found for userId:', userId);
          }
        }
      } catch (userError) {
        console.error('❌ Error checking org-bound user access:', userError);
        console.error('Error stack:', userError.stack);
      }
    }
    
    if (!hasAccess) {
      console.error('❌ Access denied:', {
        decodedType: decoded.type,
        decodedTenantId: decoded.tenantId,
        decodedUserId: decoded.userId,
        tenantId: tenant._id.toString(),
        tenantSlug: tenantSlug
      });
      return res.status(403).json({ success: false, message: 'Access denied to this tenant' });
    }

    // DEBUG: Verify req.user is set before proceeding
    if (!req.user) {
      console.error('❌ CRITICAL: hasAccess=true but req.user is not set!', {
        decodedType: decoded.type,
        hasAccess,
        decodedKeys: Object.keys(decoded)
      });
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error: User context not set' 
      });
    }

    // Set tenant in request for TenantMiddleware
    req.tenant = tenant;
    req.tenantId = tenant.tenantId || tenant._id.toString();
    req.tenantSlug = tenant.slug;

    // DEBUG: Log final state before calling next()
    console.log('✅ verifyTenantOrgAccess - Proceeding to next middleware:', {
      hasAccess,
      hasUser: !!req.user,
      userRole: req.user?.role,
      tenantSlug: tenantSlug,
      path: req.path
    });

    // Continue to set tenant context (which will set up database connection)
    next();
  } catch (error) {
    console.error('Tenant org access verification error:', error);
    return res.status(401).json({ success: false, message: 'Invalid token or access denied' });
  }
};

// Apply middleware chain: verify tenant access → set tenant context (database connection)
// NOTE: These middlewares apply to ALL routes defined after this point
// General tenant info endpoint (accessible without full tenant context)
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const { tenantSlug } = req.params;
    
    // Get tenant info
    let tenant = await Tenant.findOne({ slug: tenantSlug })
      .select('name slug erpCategory erpModules status subscription.plan');
    if (!tenant && /^[0-9a-f]{24}$/i.test(tenantSlug)) {
      tenant = await Tenant.findById(tenantSlug)
        .select('name slug erpCategory erpModules status subscription.plan');
    }
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        erpCategory: tenant.erpCategory,
        erpModules: tenant.erpModules,
        status: tenant.status,
        plan: tenant.subscription?.plan
      }
    });
  } catch (error) {
    console.error('Error fetching tenant info:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tenant info',
      error: error.message
    });
  }
});

// ── Organization Profile (GET + PUT) ─────────────────────────────────────────
// Returns full org profile: name, description, contactInfo, businessInfo, branding, subscription
router.get('/profile', verifyERPToken, async (req, res) => {
  try {
    const { tenantSlug } = req.params;
    const tenant = await Tenant.findOne({ slug: tenantSlug })
      .select('name slug description contactInfo businessInfo branding subscription erpCategory erpModules status createdAt');
    if (!tenant) return res.status(404).json({ success: false, message: 'Organization not found' });
    const tenantObj = tenant.toObject();
    const safeLogo = await getExistingUploadPathOrNull(tenantObj.branding?.logo);
    tenantObj.branding = { ...(tenantObj.branding || {}), logo: safeLogo };
    res.json({ success: true, data: tenantObj });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching organization profile', error: err.message });
  }
});

// Update org profile (name, description, contactInfo, businessInfo, branding colors)
router.put('/profile', verifyERPToken, requireSettingsAdmin, async (req, res) => {
  try {
    const { tenantSlug } = req.params;
    const { name, description, contactInfo, businessInfo, branding } = req.body;

    const allowed = {};
    if (name)         allowed.name        = name;
    if (description !== undefined) allowed.description = description;
    if (contactInfo)  allowed.contactInfo = contactInfo;
    if (businessInfo) allowed.businessInfo = businessInfo;
    if (branding)     allowed.branding    = branding;

    const tenant = await Tenant.findOneAndUpdate(
      { slug: tenantSlug },
      { $set: allowed },
      { new: true, runValidators: true }
    ).select('name slug description contactInfo businessInfo branding subscription erpCategory erpModules status');

    if (!tenant) return res.status(404).json({ success: false, message: 'Organization not found' });
    res.json({ success: true, data: tenant, message: 'Organization profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating organization profile', error: err.message });
  }
});

// @deprecated - verifyERPToken middleware now sets tenantContext automatically
// This function is kept for backward compatibility but should not be used in new code
// Will be removed in a future version
// Use standardized orgId helper utility
const { ensureOrgId } = require('../../../utils/orgIdHelper');

const buildTenantContext = async (req) => {
  const tenant = req.tenant;
  
  console.log('🔍 buildTenantContext - Initial state:', {
    tenantSlug: tenant?.slug,
    hasTenantContext: !!req.tenantContext,
    existingOrgId: req.orgId || req.tenantContext?.orgId,
    tenantOrgId: req.tenant?.orgId,
    tenantOrganizationId: req.tenant?.organizationId
  });
  
  // Use standardized orgId helper utility
  let orgId;
  try {
    orgId = await ensureOrgId(req);
    console.log('✅ Found orgId using standardized utility:', orgId);
  } catch (error) {
    console.error('❌ Error getting orgId in buildTenantContext:', error.message);
    // Fallback to sync method if async fails
    orgId = req.orgId || req.tenantContext?.orgId || req.tenant?.organizationId || req.tenant?.orgId || req.user?.orgId?.toString() || null;
    if (orgId) {
      console.log('✅ Using fallback orgId:', orgId);
    }
  }
  
  // Build tenant context object
  const tenantContext = {
    tenantId: req.tenantContext?.tenantId || req.tenantId || tenant?.tenantId || tenant?._id?.toString(),
    tenantSlug: req.tenantContext?.tenantSlug || req.tenantSlug || tenant?.slug,
    orgId: orgId,
    hasSeparateDatabase: req.tenantContext?.hasSeparateDatabase || false,
    tenantConnection: req.tenantConnection || null,
    connectionReady: req.tenantContext?.connectionReady || false
  };
  
  console.log('✅ buildTenantContext result:', {
    tenantId: tenantContext.tenantId,
    tenantSlug: tenantContext.tenantSlug,
    orgId: tenantContext.orgId
  });
  
  // Set tenantContext on request object for use in route handlers
  req.tenantContext = tenantContext;
  
  return tenantContext;
};

// ==================== DASHBOARD ROUTES ====================

// Get dashboard overview
router.get('/dashboard', verifyERPToken, async (req, res) => {
  try {
    // Use tenantContext from middleware (verifyERPToken sets it)
    const tenantContext = req.tenantContext || {
      tenantId: req.tenantId,
      tenantSlug: req.tenantSlug,
      orgId: req.orgId,
      hasSeparateDatabase: false,
      connectionReady: true
    };
    
    console.log('Dashboard request - tenantContext:', {
      tenantId: tenantContext.tenantId,
      tenantSlug: tenantContext.tenantSlug,
      orgId: tenantContext.orgId,
      hasSeparateDatabase: tenantContext.hasSeparateDatabase,
      connectionReady: tenantContext.connectionReady
    });
    
    const dashboardData = await tenantOrgService.getDashboardOverview(tenantContext);
    res.json({ success: true, data: dashboardData });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch dashboard overview',
      error: error.message 
    });
  }
});

// Get dashboard analytics
router.get('/dashboard/analytics', verifyERPToken, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || {
      tenantId: req.tenantId,
      tenantSlug: req.tenantSlug,
      orgId: req.orgId,
      hasSeparateDatabase: false,
      connectionReady: true
    };
    const analytics = await tenantOrgService.getDashboardAnalytics(tenantContext);
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard analytics', error: error.message });
  }
});

// ==================== ANALYTICS ROUTES ====================

// Get analytics overview
router.get('/analytics', verifyERPToken, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || {
      tenantId: req.tenantId,
      tenantSlug: req.tenantSlug,
      orgId: req.orgId,
      hasSeparateDatabase: false,
      connectionReady: true
    };
    const analytics = await tenantOrgService.getAnalyticsOverview(tenantContext);
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics overview', error: error.message });
  }
});

// ==================== HR ATTENDANCE ROUTES ====================

// Get HR overview
router.get('/hr', verifyERPToken, employeesRead, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const overview = await tenantOrgService.getHROverview(tenantContext);
    res.json({ success: true, data: overview });
  } catch (error) {
    console.error('Get HR overview error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch HR overview', error: error.message });
  }
});

// Get attendance data (list + summary for a date or month, optional employeeId for employee portal)
router.get('/hr/attendance', verifyERPToken, attendanceRead, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { date, employeeId, month } = req.query;
    const data = await tenantOrgService.getAttendanceData(tenantContext, { date, employeeId, month });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get HR attendance error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance', error: error.message });
  }
});

// Software House Attendance Engine config (departments, categories, user types)
router.get('/hr/attendance/config', verifyERPToken, attendanceRead, async (req, res) => {
  try {
    const config = tenantOrgService.getSoftwareHouseAttendanceConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Get attendance config error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance config', error: error.message });
  }
});

// Check-in


// HR-only manual punch adjustment (check-in/check-out times)
router.patch('/hr/attendance/:id/punch', verifyERPToken, attendanceWrite, async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!ADMIN_LIKE_ROLES.has(role)) {
      return res.status(403).json({ success: false, message: 'Only HR/Admin can adjust attendance punch times' });
    }

    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { id } = req.params;
    const { checkInTime, checkOutTime, reason } = req.body || {};

    if (!checkInTime && !checkOutTime) {
      return res.status(400).json({ success: false, message: 'At least one of checkInTime or checkOutTime is required (HH:mm)' });
    }
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ success: false, message: 'Reason is required for punch adjustments' });
    }

    const models = tenantOrgService.getTenantModels(tenantContext);
    const Attendance = models.Attendance;
    const record = await Attendance.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const oldCheckIn = record.checkIn?.timestamp ? new Date(record.checkIn.timestamp) : null;
    const oldCheckOut = record.checkOut?.timestamp ? new Date(record.checkOut.timestamp) : null;
    const baseDate = record.date || new Date();
    const nextCheckIn = checkInTime ? setTimeOnDate(baseDate, checkInTime) : oldCheckIn;
    const nextCheckOut = checkOutTime ? setTimeOnDate(baseDate, checkOutTime) : oldCheckOut;

    if (checkInTime && !nextCheckIn) {
      return res.status(400).json({ success: false, message: 'Invalid checkInTime format; expected HH:mm' });
    }
    if (checkOutTime && !nextCheckOut) {
      return res.status(400).json({ success: false, message: 'Invalid checkOutTime format; expected HH:mm' });
    }
    if (nextCheckIn && nextCheckOut && nextCheckOut < nextCheckIn) {
      return res.status(400).json({ success: false, message: 'checkOutTime cannot be earlier than checkInTime' });
    }

    if (nextCheckIn) {
      record.checkIn = record.checkIn || {};
      record.checkIn.timestamp = nextCheckIn;
    }
    if (nextCheckOut) {
      record.checkOut = record.checkOut || {};
      record.checkOut.timestamp = nextCheckOut;
    }
    if (nextCheckIn && nextCheckOut) {
      const durationMs = nextCheckOut - nextCheckIn;
      record.durationMinutes = Math.max(0, Math.floor(durationMs / (1000 * 60)));
      record.overtimeMinutes = Math.max(0, record.durationMinutes - 8 * 60);
    }
    record.lastActivity = new Date();
    record.correctionRequests = record.correctionRequests || [];
    record.correctionRequests.push({
      requestedBy: req.user?._id,
      reason: String(reason).trim(),
      requestedAt: new Date(),
      approvedBy: req.user?._id,
      approvedAt: new Date(),
      status: 'approved',
      comments: 'HR manual punch adjustment',
      changes: {
        checkIn: { from: oldCheckIn, to: nextCheckIn },
        checkOut: { from: oldCheckOut, to: nextCheckOut }
      }
    });

    await record.save();
    await record.populate('userId', 'fullName email');

    try {
      await TenantAuditLog.logEvent({
        tenantId: tenantContext.tenantId,
        orgId: tenantContext.orgId,
        userId: req.user?._id,
        action: 'attendance_punch_adjusted',
        resourceType: 'attendance',
        resourceId: record._id,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        metadata: {
          reason: String(reason).trim(),
          oldCheckIn,
          oldCheckOut,
          newCheckIn: nextCheckIn,
          newCheckOut: nextCheckOut
        }
      });
    } catch (auditErr) {
      console.warn('Attendance punch audit log failed:', auditErr.message);
    }

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Adjust attendance punch error:', error);
    res.status(500).json({ success: false, message: 'Failed to adjust attendance punch', error: error.message });
  }
});

router.get('/hr/attendance/pending-corrections', verifyERPToken, attendanceRead, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const models = tenantOrgService.getTenantModels(tenantContext);
    const Attendance = models.Attendance;
    const records = await Attendance.find({
      organizationId: tenantContext.orgId,
      'correctionRequests.status': 'pending'
    })
      .populate('userId', 'fullName email')
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    const pending = records.flatMap((record) =>
      (record.correctionRequests || [])
        .filter((cr) => cr.status === 'pending')
        .map((cr) => ({
          correctionId: cr._id,
          attendanceId: record._id,
          employeeName: record.userId?.fullName || record.userId?.email || record.employeeId,
          employeeId: record.employeeId,
          date: record.date,
          reason: cr.reason,
          requestedAt: cr.requestedAt
        }))
    );
    res.json({ success: true, data: { pending, count: pending.length } });
  } catch (error) {
    console.error('Get pending corrections error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending corrections', error: error.message });
  }
});

router.post('/hr/attendance/:id/mark-absent', verifyERPToken, attendanceWrite, async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!ADMIN_LIKE_ROLES.has(role)) {
      return res.status(403).json({ success: false, message: 'Only HR/Admin can mark absent' });
    }
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const models = tenantOrgService.getTenantModels(tenantContext);
    const Attendance = models.Attendance;
    const record = await Attendance.findOne({ _id: req.params.id, organizationId: tenantContext.orgId });
    if (!record) return res.status(404).json({ success: false, message: 'Attendance record not found' });
    const reason = String(req.body?.reason || 'Marked absent by HR').trim();

    record.status = 'absent';
    record.checkIn = record.checkIn || {};
    record.checkOut = record.checkOut || {};
    record.checkIn.notes = reason;
    record.checkOut.notes = reason;
    record.durationMinutes = 0;
    record.overtimeMinutes = 0;
    record.isActive = false;
    record.lastActivity = new Date();
    await record.save();

    await TenantAuditLog.logEvent({
      tenantId: tenantContext.tenantId,
      orgId: tenantContext.orgId,
      userId: req.user?._id,
      action: 'attendance_marked_absent',
      resourceType: 'attendance',
      resourceId: record._id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { reason }
    });

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Mark absent error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark absent', error: error.message });
  }
});

router.post('/hr/attendance/:id/request-correction', verifyERPToken, attendanceWrite, async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!ADMIN_LIKE_ROLES.has(role)) {
      return res.status(403).json({ success: false, message: 'Only HR/Admin can request correction on behalf' });
    }
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const models = tenantOrgService.getTenantModels(tenantContext);
    const Attendance = models.Attendance;
    const record = await Attendance.findOne({ _id: req.params.id, organizationId: tenantContext.orgId });
    if (!record) return res.status(404).json({ success: false, message: 'Attendance record not found' });
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ success: false, message: 'Reason is required' });

    record.correctionRequests = record.correctionRequests || [];
    record.correctionRequests.push({
      requestedBy: req.user?._id,
      reason,
      requestedAt: new Date(),
      status: 'pending',
      comments: 'Created by HR on behalf of employee'
    });
    await record.save();

    await TenantAuditLog.logEvent({
      tenantId: tenantContext.tenantId,
      orgId: tenantContext.orgId,
      userId: req.user?._id,
      action: 'attendance_correction_requested_on_behalf',
      resourceType: 'attendance',
      resourceId: record._id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { reason }
    });

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Request correction on behalf error:', error);
    res.status(500).json({ success: false, message: 'Failed to request correction', error: error.message });
  }
});

router.post('/hr/attendance/:attendanceId/corrections/:correctionId/decision', verifyERPToken, attendanceWrite, async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!ADMIN_LIKE_ROLES.has(role)) {
      return res.status(403).json({ success: false, message: 'Only HR/Admin can decide correction requests' });
    }
    const { status, comments } = req.body || {};
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be approved or rejected' });
    }

    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const models = tenantOrgService.getTenantModels(tenantContext);
    const Attendance = models.Attendance;
    const record = await Attendance.findOne({ _id: req.params.attendanceId, organizationId: tenantContext.orgId });
    if (!record) return res.status(404).json({ success: false, message: 'Attendance record not found' });

    const correction = (record.correctionRequests || []).find((c) => String(c._id) === String(req.params.correctionId));
    if (!correction) {
      return res.status(404).json({ success: false, message: 'Correction request not found' });
    }
    correction.status = status;
    correction.approvedBy = req.user?._id;
    correction.approvedAt = new Date();
    if (comments) correction.comments = String(comments).trim();
    await record.save();

    await TenantAuditLog.logEvent({
      tenantId: tenantContext.tenantId,
      orgId: tenantContext.orgId,
      userId: req.user?._id,
      action: status === 'approved' ? 'attendance_correction_approved' : 'attendance_correction_rejected',
      resourceType: 'attendance',
      resourceId: record._id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { correctionId: req.params.correctionId, comments: correction.comments || '' }
    });

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Correction decision error:', error);
    res.status(500).json({ success: false, message: 'Failed to decide correction request', error: error.message });
  }
});

router.get('/hr/attendance/:id/audit', verifyERPToken, attendanceRead, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const models = tenantOrgService.getTenantModels(tenantContext);
    const Attendance = models.Attendance;
    const record = await Attendance.findOne({ _id: req.params.id, organizationId: tenantContext.orgId })
      .populate('userId', 'fullName email')
      .lean();
    if (!record) return res.status(404).json({ success: false, message: 'Attendance record not found' });

    const logs = await TenantAuditLog.find({
      tenantId: tenantContext.tenantId,
      orgId: tenantContext.orgId,
      resourceType: 'attendance',
      resourceId: String(req.params.id)
    })
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const correctionTrail = (record.correctionRequests || []).map((cr) => ({
      id: cr._id,
      status: cr.status,
      reason: cr.reason,
      requestedAt: cr.requestedAt,
      approvedAt: cr.approvedAt,
      comments: cr.comments
    }));
    res.json({ success: true, data: { correctionTrail, auditLogs: logs } });
  } catch (error) {
    console.error('Get attendance audit error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance audit trail', error: error.message });
  }
});

router.post('/hr/attendance/bulk-action', verifyERPToken, attendanceWrite, async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (!ADMIN_LIKE_ROLES.has(role)) {
      return res.status(403).json({ success: false, message: 'Only HR/Admin can run bulk actions' });
    }
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const models = tenantOrgService.getTenantModels(tenantContext);
    const Attendance = models.Attendance;
    const { action, attendanceIds = [], reason } = req.body || {};
    if (!Array.isArray(attendanceIds) || attendanceIds.length === 0) {
      return res.status(400).json({ success: false, message: 'attendanceIds array is required' });
    }

    let modifiedCount = 0;
    if (action === 'mark_absent') {
      const result = await Attendance.updateMany(
        { _id: { $in: attendanceIds }, organizationId: tenantContext.orgId },
        {
          $set: {
            status: 'absent',
            durationMinutes: 0,
            overtimeMinutes: 0,
            isActive: false,
            lastActivity: new Date()
          }
        }
      );
      modifiedCount = result.modifiedCount || 0;
    } else if (action === 'mark_present') {
      const result = await Attendance.updateMany(
        { _id: { $in: attendanceIds }, organizationId: tenantContext.orgId },
        { $set: { status: 'present', lastActivity: new Date() } }
      );
      modifiedCount = result.modifiedCount || 0;
    } else if (action === 'approve_corrections') {
      const result = await Attendance.updateMany(
        { _id: { $in: attendanceIds }, organizationId: tenantContext.orgId },
        {
          $set: {
            'correctionRequests.$[elem].status': 'approved',
            'correctionRequests.$[elem].approvedBy': req.user?._id,
            'correctionRequests.$[elem].approvedAt': new Date()
          }
        },
        { arrayFilters: [{ 'elem.status': 'pending' }] }
      );
      modifiedCount = result.modifiedCount || 0;
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported bulk action' });
    }

    await TenantAuditLog.logEvent({
      tenantId: tenantContext.tenantId,
      orgId: tenantContext.orgId,
      userId: req.user?._id,
      action: 'attendance_bulk_action',
      resourceType: 'attendance',
      resourceId: action,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadata: { action, attendanceIdsCount: attendanceIds.length, reason: reason || '' }
    });

    res.json({ success: true, data: { modifiedCount } });
  } catch (error) {
    console.error('Bulk attendance action error:', error);
    res.status(500).json({ success: false, message: 'Failed bulk attendance action', error: error.message });
  }
});

// ==================== HR EMPLOYEES ROUTES ====================

// Get employees list (with pagination and filters)
router.get('/hr/employees', verifyERPToken, employeesRead, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { page, limit, department, status, userId } = req.query;
    const data = await tenantOrgService.getEmployees(tenantContext, { page, limit, department, status, userId });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get HR employees error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employees', error: error.message });
  }
});

// Get single employee by ID
router.get('/hr/employees/:id', verifyERPToken, employeesRead, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { id } = req.params;
    const employee = await tenantOrgService.getEmployeeById(tenantContext, id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.json({ success: true, data: { employee } });
  } catch (error) {
    console.error('Get HR employee error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employee', error: error.message });
  }
});

// Create employee
router.post('/hr/employees', verifyERPToken, employeesWrite, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const employeeData = req.body;
    if (!employeeData) {
      return res.status(400).json({ success: false, message: 'Employee data is required' });
    }
    // jobTitle is the only truly required field (name is resolved inside the service)
    if (!employeeData.jobTitle) {
      return res.status(400).json({ success: false, message: 'jobTitle is required' });
    }
    const employee = await tenantOrgService.createEmployee(tenantContext, {
      ...employeeData,
      invitedBy: req.user?._id
    });
    const temporaryPassword = employee._temporaryPassword || undefined;
    const portalInviteSent = employee._portalInviteSent;
    const portalInviteSkipped = employee._portalInviteSkipped;
    delete employee._temporaryPassword;
    delete employee._portalInviteSent;
    delete employee._portalInviteSkipped;
    res.status(201).json({
      success: true,
      data: {
        employee,
        ...(temporaryPassword && { temporaryPassword, mustChangePassword: true }),
        ...(portalInviteSent && { portalInviteSent: true }),
        ...(portalInviteSkipped && { portalInviteSkipped })
      }
    });
  } catch (error) {
    console.error('Create HR employee error:', error);
    const status = error.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ success: false, message: error.message || 'Failed to create employee', error: error.message });
  }
});

// Update employee
router.patch('/hr/employees/:id', verifyERPToken, employeesWrite, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { id } = req.params;
    const employeeData = req.body || {};

    if (!employeeData || Object.keys(employeeData).length === 0) {
      return res.status(400).json({ success: false, message: 'Employee update data is required' });
    }

    const employee = await tenantOrgService.updateEmployee(tenantContext, id, employeeData);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found or no valid fields to update' });
    }

    return res.json({ success: true, data: { employee } });
  } catch (error) {
    console.error('Update HR employee error:', error);
    const status = error.name === 'ValidationError' ? 400 : 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to update employee', error: error.message });
  }
});

// Delete employee
router.delete('/hr/employees/:id', verifyERPToken, employeesWrite, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { id } = req.params;
    const deleted = await tenantOrgService.deleteEmployee(tenantContext, id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    return res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete HR employee error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete employee', error: error.message });
  }
});

// ==================== HR PAYROLL ROUTES ====================

router.get('/hr/payroll', verifyERPToken, requireErpAccess({ module: 'payroll', action: 'read', checkRevocation: true }), async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const filter = { orgId: tenantContext.orgId };
    const employeesFilter = { orgId: tenantContext.orgId };
    const requestingUserId = String(req.user?._id || req.user?.id || '');
    const canReadAll = String(req.user?.role || '').toLowerCase() !== 'employee';

    if (canReadAll) {
      if (req.query.employeeId) {
        const employee = await Employee.findOne({ orgId: tenantContext.orgId, userId: req.query.employeeId }).select('_id').lean();
        if (employee) filter.employeeId = employee._id;
      } else {
        const employees = await Employee.find(employeesFilter).select('_id').lean();
        filter.employeeId = { $in: employees.map((item) => item._id) };
      }
    } else {
      const employee = await Employee.findOne({ orgId: tenantContext.orgId, userId: requestingUserId }).select('_id').lean();
      if (!employee) {
        return res.json({ success: true, data: { totalAmount: 0, employeeCount: 0, pendingCount: 0, cycleCount: 0, payrollRecords: [] } });
      }
      filter.employeeId = employee._id;
      filter.userId = requestingUserId;
    }

    const [aggregate, employeeCount, pendingCount, cycleCount, payrollRecords] = await Promise.all([
      PayrollRecord.aggregate([
        { $match: filter },
        { $group: { _id: null, totalAmount: { $sum: '$netPay' } } }
      ]),
      PayrollRecord.distinct('employeeId', filter).then((ids) => ids.length),
      PayrollRecord.countDocuments({ ...filter, status: { $in: ['draft', 'pending'] } }),
      PayrollCycle.countDocuments({ orgId: tenantContext.orgId }),
      PayrollRecord.find(filter).sort({ createdAt: -1 }).limit(50).populate('userId', 'fullName email').populate('employeeId', 'employeeId department')
    ]);

    return res.json({
      success: true,
      data: {
        totalAmount: aggregate[0]?.totalAmount || 0,
        employeeCount,
        pendingCount,
        cycleCount,
        payrollRecords
      }
    });
  } catch (error) {
    console.error('Get HR payroll error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch payroll data', error: error.message });
  }
});

router.get('/hr/payroll/analytics', verifyERPToken, requireErpAccess({ module: 'payroll', action: 'read', checkRevocation: true }), async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const requestingUserId = String(req.user?._id || req.user?.id || '');
    const canReadAll = String(req.user?.role || '').toLowerCase() !== 'employee';
    const baseFilter = { orgId: tenantContext.orgId };

    if (!canReadAll) {
      const employee = await Employee.findOne({ orgId: tenantContext.orgId, userId: requestingUserId }).select('_id').lean();
      if (!employee) {
        return res.json({
          success: true,
          data: { monthlyTrend: [], statusBreakdown: [], averageNetPay: 0, payrollVelocityDays: 0 }
        });
      }
      baseFilter.employeeId = employee._id;
      baseFilter.userId = requestingUserId;
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [monthlyTrend, statusBreakdown, averageNetPay, velocityAgg] = await Promise.all([
      PayrollRecord.aggregate([
        { $match: { ...baseFilter, periodStart: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$periodStart' },
              month: { $month: '$periodStart' }
            },
            totalNetPay: { $sum: '$netPay' },
            records: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      PayrollRecord.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 }, totalNetPay: { $sum: '$netPay' } } },
        { $sort: { count: -1 } }
      ]),
      PayrollRecord.aggregate([
        { $match: baseFilter },
        { $group: { _id: null, avg: { $avg: '$netPay' } } }
      ]),
      PayrollRecord.aggregate([
        {
          $match: {
            ...baseFilter,
            approvedAt: { $exists: true, $ne: null },
            createdAt: { $exists: true, $ne: null }
          }
        },
        {
          $project: {
            processingDays: {
              $divide: [{ $subtract: ['$approvedAt', '$createdAt'] }, 1000 * 60 * 60 * 24]
            }
          }
        },
        { $group: { _id: null, avgDays: { $avg: '$processingDays' } } }
      ])
    ]);

    return res.json({
      success: true,
      data: {
        monthlyTrend,
        statusBreakdown,
        averageNetPay: averageNetPay[0]?.avg || 0,
        payrollVelocityDays: velocityAgg[0]?.avgDays || 0
      }
    });
  } catch (error) {
    console.error('Get payroll analytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch payroll analytics', error: error.message });
  }
});

router.post('/hr/payroll/time-sync/preview', verifyERPToken, requireErpAccess({ module: 'payroll', action: 'read', checkRevocation: true }), async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { periodStart, periodEnd, employeeIds = [] } = req.body || {};
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ success: false, message: 'periodStart and periodEnd are required' });
    }

    const employeeFilter = { orgId: tenantContext.orgId, status: { $in: ['active', 'probation', 'on-leave'] } };
    if (Array.isArray(employeeIds) && employeeIds.length > 0) employeeFilter._id = { $in: employeeIds };
    const employees = await Employee.find(employeeFilter).populate('userId', 'fullName email').lean();
    const userIds = employees.map((employee) => employee.userId?._id || employee.userId).filter(Boolean);
    const timeMap = await buildEmployeeTimeMap({
      orgId: tenantContext.orgId,
      periodStart,
      periodEnd,
      employeeUserIds: userIds
    });

    const employeeSummaries = employees.map((employee) => {
      const userId = employee.userId?._id || employee.userId;
      const timeData = timeMap.get(String(userId)) || {};
      const snapshot = buildPayrollTimeSnapshot(employee, timeData, periodStart, periodEnd);
      return {
        employeeId: employee._id,
        userId,
        name: employee.userId?.fullName || employee.employeeId,
        department: employee.department,
        contractType: employee.contractType,
        salaryBase: Number(employee.salary?.base || 0),
        currency: employee.salary?.currency || 'USD',
        ...snapshot
      };
    });

    return res.json({
      success: true,
      data: {
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        employeeCount: employeeSummaries.length,
        employeeSummaries
      }
    });
  } catch (error) {
    console.error('Payroll time sync preview error:', error);
    return res.status(500).json({ success: false, message: 'Failed to preview payroll time sync', error: error.message });
  }
});

router.post('/hr/payroll/process', verifyERPToken, requireErpAccess({ module: 'payroll', action: 'write', checkRevocation: true }), async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { periodStart, periodEnd, employeeIds = [] } = req.body || {};
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ success: false, message: 'periodStart and periodEnd are required' });
    }

    const employeeFilter = { orgId: tenantContext.orgId, status: { $in: ['active', 'probation', 'on-leave'] } };
    if (Array.isArray(employeeIds) && employeeIds.length > 0) employeeFilter._id = { $in: employeeIds };
    const employees = await Employee.find(employeeFilter).populate('userId', 'fullName email');
    const employeeUserIds = employees.map((employee) => employee.userId?._id || employee.userId).filter(Boolean);
    const payrollTimeMap = await buildEmployeeTimeMap({
      orgId: tenantContext.orgId,
      periodStart,
      periodEnd,
      employeeUserIds
    });
    const records = [];
    let createdCount = 0;
    let reusedCount = 0;

    for (const employee of employees) {
      const idempotencyFilter = {
        orgId: tenantContext.orgId,
        employeeId: employee._id,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd)
      };
      const existing = await PayrollRecord.findOne(idempotencyFilter);
      if (existing) {
        records.push(existing);
        reusedCount += 1;
        continue;
      }

      const timeData = payrollTimeMap.get(String(employee.userId?._id || employee.userId)) || {};
      const snapshot = buildPayrollTimeSnapshot(employee, timeData, periodStart, periodEnd);
      const basePay = Number(employee.salary?.base || 0);
      const grossPay = Math.round((basePay + snapshot.overtimePay) * 100) / 100;
      const deductionsTotal = 0;
      const payrollComponents = [
        { name: 'Base Salary', amount: basePay, type: 'earnings' }
      ];
      if (snapshot.overtimePay > 0) {
        payrollComponents.push({
          name: `Overtime (${snapshot.hoursWorked.overtime}h @ ${snapshot.overtimeRate}/h)`,
          amount: snapshot.overtimePay,
          type: 'earnings'
        });
      }
      const payrollRecord = await PayrollRecord.findOneAndUpdate(
        idempotencyFilter,
        {
          $setOnInsert: {
            tenantId: tenantContext.tenantId || null,
            orgId: tenantContext.orgId,
            employeeId: employee._id,
            userId: employee.userId?._id || employee.userId,
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
            components: payrollComponents,
            grossPay,
            deductions: { total: deductionsTotal },
            netPay: grossPay - deductionsTotal,
            hoursWorked: snapshot.hoursWorked,
            hourlyRate: snapshot.hourlyRate,
            overtimeRate: snapshot.overtimeRate,
            notes: [
              `Time sync: total=${snapshot.hoursWorked.total}h`,
              `billable=${snapshot.billableHours}h`,
              `non_billable=${snapshot.nonBillableHours}h`,
              `entries=${snapshot.entryCount}`,
              `projects=${snapshot.projectsCount}`
            ].join(' | '),
            status: 'pending'
          }
        },
        { upsert: true, new: true }
      );
      records.push(payrollRecord);
      createdCount += 1;
    }

    return res.status(201).json({
      success: true,
      message: 'Payroll processed successfully',
      data: {
        payrollRecords: records,
        telemetry: {
          employeesEvaluated: employees.length,
          createdCount,
          reusedCount,
          centralizedTimeSync: true,
          syncedEmployeeCount: employeeUserIds.length
        }
      }
    });
  } catch (error) {
    console.error('Process HR payroll error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process payroll', error: error.message });
  }
});

router.get('/hr/payroll/cycles', verifyERPToken, requireErpAccess({ module: 'payroll', action: 'read', checkRevocation: true }), async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const cycles = await PayrollCycle.find({ orgId: tenantContext.orgId }).sort({ startDate: -1 }).limit(24).lean();
    return res.json({ success: true, data: { cycles } });
  } catch (error) {
    console.error('Get payroll cycles error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch payroll cycles', error: error.message });
  }
});

router.post('/hr/payroll/cycles', verifyERPToken, requireErpAccess({ module: 'payroll', action: 'write', checkRevocation: true }), async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { name, frequency = 'monthly', startDate, endDate, payDate } = req.body || {};
    if (!name || !startDate || !endDate || !payDate) {
      return res.status(400).json({ success: false, message: 'name, startDate, endDate, and payDate are required' });
    }

    const cycle = await PayrollCycle.create({
      orgId: tenantContext.orgId,
      tenantId: tenantContext.tenantId || null,
      name,
      frequency,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      payDate: new Date(payDate),
      status: 'draft',
      processedBy: req.user?._id || req.user?.id
    });

    return res.status(201).json({ success: true, message: 'Payroll cycle created', data: { cycle } });
  } catch (error) {
    console.error('Create payroll cycle error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create payroll cycle', error: error.message });
  }
});

router.post('/hr/payroll/cycles/:id/close', verifyERPToken, requireErpAccess({ module: 'payroll', action: 'admin', checkRevocation: true }), async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const cycle = await PayrollCycle.findOne({ _id: req.params.id, orgId: tenantContext.orgId });
    if (!cycle) return res.status(404).json({ success: false, message: 'Payroll cycle not found' });
    if (cycle.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Payroll cycle already completed' });
    }
    cycle.status = 'completed';
    cycle.processedAt = new Date();
    cycle.processedBy = req.user?._id || req.user?.id;
    await cycle.save();
    return res.json({ success: true, message: 'Payroll cycle closed successfully', data: { cycle } });
  } catch (error) {
    console.error('Close payroll cycle error:', error);
    return res.status(500).json({ success: false, message: 'Failed to close payroll cycle', error: error.message });
  }
});

router.post('/hr/payroll/cycles/:id/start', verifyERPToken, requireErpAccess({ module: 'payroll', action: 'admin', checkRevocation: true }), async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const cycle = await PayrollCycle.findOne({ _id: req.params.id, orgId: tenantContext.orgId });
    if (!cycle) return res.status(404).json({ success: false, message: 'Payroll cycle not found' });
    if (cycle.status !== 'draft') {
      return res.status(400).json({ success: false, message: `Cannot start payroll cycle from ${cycle.status} status` });
    }
    cycle.status = 'processing';
    cycle.processedBy = req.user?._id || req.user?.id;
    await cycle.save();
    return res.json({ success: true, message: 'Payroll cycle started successfully', data: { cycle } });
  } catch (error) {
    console.error('Start payroll cycle error:', error);
    return res.status(500).json({ success: false, message: 'Failed to start payroll cycle', error: error.message });
  }
});

router.post('/hr/payroll/cycles/:id/cancel', verifyERPToken, requireErpAccess({ module: 'payroll', action: 'admin', checkRevocation: true }), async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const cycle = await PayrollCycle.findOne({ _id: req.params.id, orgId: tenantContext.orgId });
    if (!cycle) return res.status(404).json({ success: false, message: 'Payroll cycle not found' });
    if (!['draft', 'processing'].includes(cycle.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel payroll cycle from ${cycle.status} status` });
    }
    cycle.status = 'cancelled';
    cycle.processedBy = req.user?._id || req.user?.id;
    await cycle.save();
    return res.json({ success: true, message: 'Payroll cycle cancelled successfully', data: { cycle } });
  } catch (error) {
    console.error('Cancel payroll cycle error:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel payroll cycle', error: error.message });
  }
});

router.get('/hr/payroll/:id', verifyERPToken, requireErpAccess({ module: 'payroll', action: ['read', 'read_own'], checkRevocation: true }), async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const payrollRecord = await PayrollRecord.findById(req.params.id).populate('employeeId').populate('userId', 'fullName email');
    if (!payrollRecord) return res.status(404).json({ success: false, message: 'Payroll record not found' });

    const employee = await Employee.findOne({ _id: payrollRecord.employeeId?._id || payrollRecord.employeeId, orgId: tenantContext.orgId }).select('userId').lean();
    if (!employee) return res.status(404).json({ success: false, message: 'Payroll record not found' });

    const userIdStr = String(req.user?._id || req.user?.id || '');
    const recordUserId = String(employee.userId || '');
    const canReadAll = String(req.user?.role || '').toLowerCase() !== 'employee';
    if (!canReadAll && recordUserId !== userIdStr) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this payroll record' });
    }

    return res.json({ success: true, data: { payrollRecord } });
  } catch (error) {
    console.error('Get HR payroll record error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch payroll record', error: error.message });
  }
});

router.post('/hr/payroll/:id/approve', verifyERPToken, requireErpAccess({ module: 'payroll', action: 'write', checkRevocation: true }), async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const payrollRecord = await PayrollRecord.findOne({ _id: req.params.id, orgId: tenantContext.orgId });
    if (!payrollRecord) return res.status(404).json({ success: false, message: 'Payroll record not found' });

    const employee = await Employee.findOne({ _id: payrollRecord.employeeId, orgId: tenantContext.orgId }).select('_id').lean();
    if (!employee) return res.status(404).json({ success: false, message: 'Payroll record not found' });

    if (!['draft', 'pending'].includes(payrollRecord.status)) {
      return res.status(400).json({ success: false, message: `Cannot approve payroll from ${payrollRecord.status} status` });
    }

    payrollRecord.status = 'approved';
    payrollRecord.approvedBy = req.user?._id || req.user?.id;
    payrollRecord.approvedAt = new Date();
    if (req.body?.notes) payrollRecord.notes = req.body.notes;
    await payrollRecord.save();
    return res.json({ success: true, message: 'Payroll approved successfully', data: { payrollRecord } });
  } catch (error) {
    console.error('Approve HR payroll error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve payroll', error: error.message });
  }
});

router.post('/hr/payroll/:id/mark-paid', verifyERPToken, requireErpAccess({ module: 'payroll', action: 'write', checkRevocation: true }), async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const payrollRecord = await PayrollRecord.findOne({ _id: req.params.id, orgId: tenantContext.orgId });
    if (!payrollRecord) return res.status(404).json({ success: false, message: 'Payroll record not found' });
    const employee = await Employee.findOne({ _id: payrollRecord.employeeId, orgId: tenantContext.orgId }).select('_id').lean();
    if (!employee) return res.status(404).json({ success: false, message: 'Payroll record not found' });

    if (payrollRecord.status !== 'approved') {
      return res.status(400).json({ success: false, message: `Cannot mark payroll as paid from ${payrollRecord.status} status` });
    }

    payrollRecord.status = 'paid';
    payrollRecord.paidAt = new Date();
    payrollRecord.paymentMethod = req.body?.paymentMethod || payrollRecord.paymentMethod || 'bank-transfer';
    await payrollRecord.save();
    return res.json({ success: true, message: 'Payroll marked as paid', data: { payrollRecord } });
  } catch (error) {
    console.error('Mark payroll paid error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark payroll paid', error: error.message });
  }
});

router.post('/hr/payroll/:id/cancel', verifyERPToken, requireErpAccess({ module: 'payroll', action: 'write', checkRevocation: true }), async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const payrollRecord = await PayrollRecord.findOne({ _id: req.params.id, orgId: tenantContext.orgId });
    if (!payrollRecord) return res.status(404).json({ success: false, message: 'Payroll record not found' });
    const employee = await Employee.findOne({ _id: payrollRecord.employeeId, orgId: tenantContext.orgId }).select('_id').lean();
    if (!employee) return res.status(404).json({ success: false, message: 'Payroll record not found' });

    if (!['draft', 'pending', 'approved'].includes(payrollRecord.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel payroll from ${payrollRecord.status} status` });
    }

    payrollRecord.status = 'cancelled';
    if (req.body?.notes) payrollRecord.notes = req.body.notes;
    await payrollRecord.save();
    return res.json({ success: true, message: 'Payroll cancelled successfully', data: { payrollRecord } });
  } catch (error) {
    console.error('Cancel HR payroll error:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel payroll', error: error.message });
  }
});

router.get('/hr/payslips', verifyERPToken, requireErpAccess({ module: 'payroll', action: ['read', 'read_own'], checkRevocation: true }), async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { employeeId, period } = req.query;
    const filter = {};
    const periodRange = resolvePayrollPeriodRange(period);
    if (periodRange) filter.periodStart = { $gte: periodRange.start, $lt: periodRange.end };

    const canReadAll = String(req.user?.role || '').toLowerCase() !== 'employee';
    let employee;
    if (employeeId) {
      employee = await Employee.findOne({ orgId: tenantContext.orgId, userId: employeeId }).select('_id userId').lean();
    } else {
      employee = await Employee.findOne({ orgId: tenantContext.orgId, userId: req.user?._id || req.user?.id }).select('_id userId').lean();
    }
    if (!employee) return res.json({ success: true, data: { payslips: [] } });

    if (!canReadAll && String(employee.userId) !== String(req.user?._id || req.user?.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view requested payslips' });
    }

    filter.employeeId = employee._id;
    const payslips = await PayrollRecord.find(filter).sort({ periodStart: -1 }).lean();
    const payload = payslips.map((record) => ({
      _id: record._id,
      period: `${new Date(record.periodStart).toISOString().slice(0, 10)} to ${new Date(record.periodEnd).toISOString().slice(0, 10)}`,
      grossPay: record.grossPay || 0,
      totalDeductions: record.deductions?.total || 0,
      netPay: record.netPay || 0,
      status: record.status || 'draft',
      currency: 'USD'
    }));
    return res.json({ success: true, data: { payslips: payload } });
  } catch (error) {
    console.error('Get HR payslips error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch payslips', error: error.message });
  }
});

router.get('/hr/payslips/:id/download', verifyERPToken, requireErpAccess({ module: 'payroll', action: ['read', 'read_own'], checkRevocation: true }), async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const payrollRecord = await PayrollRecord.findOne({ _id: req.params.id, orgId: tenantContext.orgId }).populate('employeeId').populate('userId', 'fullName email');
    if (!payrollRecord) return res.status(404).json({ success: false, message: 'Payslip not found' });

    const employee = await Employee.findOne({ _id: payrollRecord.employeeId?._id || payrollRecord.employeeId, orgId: tenantContext.orgId }).select('userId employeeId').lean();
    if (!employee) return res.status(404).json({ success: false, message: 'Payslip not found' });

    const canReadAll = String(req.user?.role || '').toLowerCase() !== 'employee';
    if (!canReadAll && String(employee.userId) !== String(req.user?._id || req.user?.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to download this payslip' });
    }

    const periodStart = new Date(payrollRecord.periodStart).toISOString().slice(0, 10);
    const periodEnd = new Date(payrollRecord.periodEnd).toISOString().slice(0, 10);
    const pseudoPdf = [
      'Payroll Payslip',
      `Employee: ${payrollRecord.userId?.fullName || employee.employeeId || 'N/A'}`,
      `Period: ${periodStart} to ${periodEnd}`,
      `Gross Pay: ${payrollRecord.grossPay || 0}`,
      `Deductions: ${payrollRecord.deductions?.total || 0}`,
      `Net Pay: ${payrollRecord.netPay || 0}`,
      `Status: ${payrollRecord.status || 'draft'}`
    ].join('\n');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payslip-${req.params.id}.pdf"`);
    return res.send(Buffer.from(pseudoPdf, 'utf-8'));
  } catch (error) {
    console.error('Download HR payslip error:', error);
    return res.status(500).json({ success: false, message: 'Failed to download payslip', error: error.message });
  }
});

// ==================== HR LEAVE REQUESTS ROUTES ====================

const normalizeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const calculateLeaveDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
};

// List leave requests.
// Employees see their own requests only.
// HR/admin roles can view all or filter by employee userId via ?employeeId=<userId>.
router.get('/hr/leave-requests', verifyERPToken, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const role = String(req.user?.role || '').toLowerCase();
    const isAdminLike = ADMIN_LIKE_ROLES.has(role);

    const filter = { orgId: tenantContext.orgId };
    const requestedEmployeeUserId = req.query.employeeId;

    if (requestedEmployeeUserId) {
      const employee = await Employee.findOne({
        orgId: tenantContext.orgId,
        userId: requestedEmployeeUserId
      }).select('_id userId');
      if (!employee) {
        return res.json({ success: true, data: { leaveRequests: [] } });
      }
      if (!isAdminLike && String(employee.userId) !== String(req.user?._id || req.user?.id)) {
        return res.status(403).json({ success: false, message: 'Access denied for this employee leave data' });
      }
      filter.employeeId = employee._id;
    } else if (!isAdminLike) {
      const selfEmployee = await Employee.findOne({
        orgId: tenantContext.orgId,
        userId: req.user?._id || req.user?.id
      }).select('_id');
      if (!selfEmployee) {
        return res.json({ success: true, data: { leaveRequests: [] } });
      }
      filter.employeeId = selfEmployee._id;
    }

    const leaveRequests = await LeaveRequest.find(filter)
      .populate('employeeId', 'employeeId department jobTitle')
      .populate('userId', 'fullName email profilePicUrl')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: { leaveRequests } });
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leave requests', error: error.message });
  }
});

// Create self leave request
router.post('/hr/leave-requests', verifyERPToken, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { type, startDate, endDate, reason } = req.body || {};

    if (!type || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'type, startDate, endDate, and reason are required' });
    }
    if (!['annual', 'sick', 'personal'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid leave type' });
    }

    const start = normalizeDate(startDate);
    const end = normalizeDate(endDate);
    if (!start || !end) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }
    if (end < start) {
      return res.status(400).json({ success: false, message: 'endDate must be on or after startDate' });
    }

    const employee = await Employee.findOne({
      orgId: tenantContext.orgId,
      userId: req.user?._id || req.user?.id
    });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const days = calculateLeaveDays(start, end);
    const availableBalance = Number(employee.leaveBalance?.[type] ?? 0);
    if (days > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient ${type} leave balance. Available: ${availableBalance} days`
      });
    }

    const leaveRequest = await LeaveRequest.create({
      tenantId: tenantContext.tenantId || null,
      orgId: tenantContext.orgId,
      employeeId: employee._id,
      userId: req.user?._id || req.user?.id,
      type,
      startDate: start,
      endDate: end,
      days,
      reason,
      status: 'pending'
    });

    res.status(201).json({ success: true, message: 'Leave request submitted successfully', data: { leaveRequest } });
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit leave request', error: error.message });
  }
});

// Approve leave request (HR/admin)
router.post('/hr/leave-requests/:id/approve', verifyERPToken, employeesWrite, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const leaveRequest = await LeaveRequest.findOne({ _id: req.params.id, orgId: tenantContext.orgId });
    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot approve a ${leaveRequest.status} request` });
    }

    const employee = await Employee.findOne({ _id: leaveRequest.employeeId, orgId: tenantContext.orgId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found for this leave request' });
    }

    const type = leaveRequest.type;
    const availableBalance = Number(employee.leaveBalance?.[type] ?? 0);
    if (leaveRequest.days > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Cannot approve: insufficient ${type} leave balance (${availableBalance} remaining)`
      });
    }

    employee.leaveBalance[type] = availableBalance - leaveRequest.days;
    await employee.save();

    leaveRequest.status = 'approved';
    leaveRequest.approvedBy = req.user?._id || req.user?.id;
    leaveRequest.approvedAt = new Date();
    leaveRequest.reviewNote = req.body?.note || '';
    await leaveRequest.save();

    res.json({
      success: true,
      message: 'Leave request approved',
      data: { leaveRequest, leaveBalance: employee.leaveBalance }
    });
  } catch (error) {
    console.error('Approve leave request error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve leave request', error: error.message });
  }
});

// Reject leave request (HR/admin)
router.post('/hr/leave-requests/:id/reject', verifyERPToken, employeesWrite, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const leaveRequest = await LeaveRequest.findOne({ _id: req.params.id, orgId: tenantContext.orgId });
    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot reject a ${leaveRequest.status} request` });
    }

    leaveRequest.status = 'rejected';
    leaveRequest.rejectedBy = req.user?._id || req.user?.id;
    leaveRequest.rejectedAt = new Date();
    leaveRequest.reviewNote = req.body?.note || '';
    await leaveRequest.save();

    res.json({ success: true, message: 'Leave request rejected', data: { leaveRequest } });
  } catch (error) {
    console.error('Reject leave request error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject leave request', error: error.message });
  }
});

// ==================== HR LEAVE POLICY ROUTES ====================

const toNumberSafe = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
};

// Get current org leave policy
router.get('/hr/leave-policy', verifyERPToken, employeesRead, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    let policy = await OrgLeavePolicy.findOne({ orgId: tenantContext.orgId }).lean();

    if (!policy) {
      policy = await OrgLeavePolicy.create({
        orgId: tenantContext.orgId,
        tenantId: tenantContext.tenantId || null,
        createdBy: req.user?._id || req.user?.id,
        updatedBy: req.user?._id || req.user?.id
      });
      policy = policy.toObject();
    }

    res.json({ success: true, data: { policy } });
  } catch (error) {
    console.error('Get leave policy error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leave policy', error: error.message });
  }
});

// Upsert org leave policy
router.put('/hr/leave-policy', verifyERPToken, employeesWrite, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const payload = req.body || {};

    const update = {
      name: payload.name || 'Default Leave Policy',
      effectiveFrom: payload.effectiveFrom ? new Date(payload.effectiveFrom) : new Date(),
      isActive: payload.isActive !== false,
      annual: {
        daysPerYear: toNumberSafe(payload?.annual?.daysPerYear, 20),
        carryForwardAllowed: Boolean(payload?.annual?.carryForwardAllowed),
        maxCarryForward: toNumberSafe(payload?.annual?.maxCarryForward, 0)
      },
      sick: {
        daysPerYear: toNumberSafe(payload?.sick?.daysPerYear, 10),
        carryForwardAllowed: Boolean(payload?.sick?.carryForwardAllowed),
        maxCarryForward: toNumberSafe(payload?.sick?.maxCarryForward, 0)
      },
      personal: {
        daysPerYear: toNumberSafe(payload?.personal?.daysPerYear, 5),
        carryForwardAllowed: Boolean(payload?.personal?.carryForwardAllowed),
        maxCarryForward: toNumberSafe(payload?.personal?.maxCarryForward, 0)
      },
      updatedBy: req.user?._id || req.user?.id
    };

    const policy = await OrgLeavePolicy.findOneAndUpdate(
      { orgId: tenantContext.orgId },
      {
        $set: update,
        $setOnInsert: {
          tenantId: tenantContext.tenantId || null,
          createdBy: req.user?._id || req.user?.id
        }
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, message: 'Leave policy saved', data: { policy } });
  } catch (error) {
    console.error('Save leave policy error:', error);
    res.status(500).json({ success: false, message: 'Failed to save leave policy', error: error.message });
  }
});

// Apply current policy balances to all active employees in org
router.post('/hr/leave-policy/apply', verifyERPToken, employeesWrite, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const policy = await OrgLeavePolicy.findOne({ orgId: tenantContext.orgId });
    if (!policy) {
      return res.status(404).json({ success: false, message: 'Leave policy not found for this organization' });
    }

    const balanceSet = {
      'leaveBalance.annual': toNumberSafe(policy.annual?.daysPerYear, 20),
      'leaveBalance.sick': toNumberSafe(policy.sick?.daysPerYear, 10),
      'leaveBalance.personal': toNumberSafe(policy.personal?.daysPerYear, 5)
    };

    const result = await Employee.updateMany(
      { orgId: tenantContext.orgId, status: { $in: ['active', 'probation', 'on-leave'] } },
      { $set: balanceSet }
    );

    res.json({
      success: true,
      message: 'Leave policy applied to employees',
      data: {
        matchedCount: result?.matchedCount ?? result?.n ?? 0,
        modifiedCount: result?.modifiedCount ?? result?.nModified ?? 0,
        appliedBalances: {
          annual: balanceSet['leaveBalance.annual'],
          sick: balanceSet['leaveBalance.sick'],
          personal: balanceSet['leaveBalance.personal']
        }
      }
    });
  } catch (error) {
    console.error('Apply leave policy error:', error);
    res.status(500).json({ success: false, message: 'Failed to apply leave policy', error: error.message });
  }
});

// ---------------------------------------------------------------------------
// INVITE FLOW
// POST /hr/employees/invite — admin sends a portal invite by email
// GET  /hr/employees/invite/accept?token= — validate token (public)
// POST /hr/employees/invite/accept — activate account + set password (public)
// ---------------------------------------------------------------------------

router.post('/hr/employees/invite', verifyERPToken, employeesWrite, async (req, res) => {
  try {
    const { email, erpRole = 'employee', hrSubRole, financeSubRole } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'email is required' });

    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { tenantId, orgId } = tenantContext;
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context required' });

    const User = require('../../../models/users-auth/User');
    const TenantUser = require('../../../models/tenant/TenantUser');
    const fullName = req.body.fullName || email.split('@')[0];
    const normalizedEmail = email.toLowerCase().trim();

    // Find or create a stub User
    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      const crypto = require('crypto');
      user = new User({
        fullName,
        email: normalizedEmail,
        password: crypto.randomBytes(16).toString('hex'),
        role: 'employee',
        orgId,
        status: 'pending',
        emailVerified: false,
        mustChangePassword: true,
        createdBy: req.user?._id
      });
      await user.save();
    }

    // Guard: already active
    const existingTU = await TenantUser.findOne({ userId: user._id, tenantId });
    if (existingTU && existingTU.status === 'active') {
      return res.status(409).json({ success: false, message: 'This person already has active portal access.' });
    }

    let tenantUser;
    if (existingTU) {
      if (existingTU.status !== 'active') {
        const crypto = require('crypto');
        existingTU.invitation.invitationToken = crypto.randomBytes(32).toString('hex');
        existingTU.invitation.invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        existingTU.status = 'pending';
      }
      if (hrSubRole && erpRole === 'hr') existingTU.hrSubRole = hrSubRole;
      if (financeSubRole && erpRole === 'finance') existingTU.financeSubRole = financeSubRole;
      await existingTU.save();
      tenantUser = existingTU;
    } else {
      tenantUser = await TenantUser.inviteUser(user._id, tenantId, req.user?._id, erpRole);
      if (hrSubRole && erpRole === 'hr') { tenantUser.hrSubRole = hrSubRole; await tenantUser.save(); }
      if (financeSubRole && erpRole === 'finance') { tenantUser.financeSubRole = financeSubRole; await tenantUser.save(); }
    }

    const envConfig = require('../../../config/environment');
    const frontendUrl = envConfig.get('FRONTEND_URL') || process.env.FRONTEND_URL || '';
    const inviteLink = `${frontendUrl}/invite/accept?token=${tenantUser.invitation.invitationToken}`;

    const Organization = require('../../../models/org/Organization');
    const org = await Organization.findById(orgId).select('name').lean();
    const inviter = await User.findById(req.user?._id).select('fullName').lean();

    const emailService = require('../../../services/integrations/email.service');
    emailService.sendEmployeeInviteEmail(
      { fullName, email: normalizedEmail },
      { inviteLink, orgName: org?.name || 'your organisation', role: erpRole, inviterName: inviter?.fullName || 'An admin' }
    ).catch(err => console.warn('Invite email failed (non-fatal):', err.message));

    res.status(201).json({ success: true, message: `Invitation sent to ${normalizedEmail}`, data: { inviteLink, email: normalizedEmail, erpRole } });
  } catch (error) {
    console.error('Invite employee error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to send invite' });
  }
});

// Validate token (called by InviteAccept page on mount)
router.get('/hr/employees/invite/accept', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ success: false, message: 'token required' });
  const TenantUser = require('../../../models/tenant/TenantUser');
  const tenantUser = await TenantUser.findOne({
    'invitation.invitationToken': token,
    'invitation.invitationExpires': { $gt: new Date() },
    status: 'pending'
  }).populate('userId', 'email fullName');
  if (!tenantUser) return res.status(400).json({ success: false, message: 'Invalid or expired invitation link' });
  res.json({ success: true, data: { email: tenantUser.userId?.email, fullName: tenantUser.userId?.fullName, role: tenantUser.roles?.[0]?.role || 'employee' } });
});

// Activate invite — set password and go active
router.post('/hr/employees/invite/accept', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ success: false, message: 'token and password are required' });
  if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

  const TenantUser = require('../../../models/tenant/TenantUser');
  const User = require('../../../models/users-auth/User');
  const tenantUser = await TenantUser.findOne({
    'invitation.invitationToken': token,
    'invitation.invitationExpires': { $gt: new Date() },
    status: 'pending'
  });
  if (!tenantUser) return res.status(400).json({ success: false, message: 'Invalid or expired invitation link' });

  const user = await User.findById(tenantUser.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  user.password = password;
  user.status = 'active';
  user.mustChangePassword = false;
  await user.save();

  tenantUser.status = 'active';
  tenantUser.invitation.acceptedAt = new Date();
  tenantUser.lastActivity = new Date();
  await tenantUser.save();

  const { invalidateResolvedPermissions } = require('../../../services/tenant/permissionResolver.service');
  await invalidateResolvedPermissions(tenantUser.tenantId, user._id).catch(() => {});

  res.json({ success: true, message: 'Account activated. You can now log in.' });
});

// Attendance reports
router.get('/hr/attendance/reports', verifyERPToken, attendanceRead, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { from, to, employeeId, department } = req.query;
    const reports = await tenantOrgService.getAttendanceReports(tenantContext, { from, to, employeeId, department });
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Attendance reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance reports', error: error.message });
  }
});

// Get performance reviews for an employee (employeeId in query is the user id for employee portal)
router.get('/hr/performance-reviews', verifyERPToken, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { employeeId } = req.query;
    const data = await tenantOrgService.getPerformanceReviews(tenantContext, { employeeId });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get performance reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch performance reviews', error: error.message });
  }
});

// HR performance overview for dashboards
router.get('/hr/performance', verifyERPToken, employeesRead, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const models = tenantOrgService.getTenantModels(tenantContext);
    const filter = tenantOrgService.getTenantFilter(tenantContext);
    const employees = await models.Employee.find({ ...filter })
      .populate('userId', 'fullName email')
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    const rows = employees.map((employee) => {
      const notes = Array.isArray(employee.performanceNotes) ? employee.performanceNotes : [];
      const ratings = notes.map((item) => Number(item.rating)).filter((value) => Number.isFinite(value));
      const avgRating = ratings.length ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1)) : 0;
      const lastReviewDate = notes
        .map((item) => item.date ? new Date(item.date) : null)
        .filter((date) => date && !Number.isNaN(date.getTime()))
        .sort((a, b) => b.getTime() - a.getTime())[0];

      const status = avgRating >= 4.5 ? 'Excellent'
        : avgRating >= 4 ? 'Very Good'
          : avgRating >= 3 ? 'Good'
            : avgRating > 0 ? 'Needs Improvement'
              : 'Not Reviewed';

      return {
        id: String(employee._id),
        name: employee.userId?.fullName || employee.employeeId || 'Employee',
        department: employee.department || 'General',
        rating: avgRating,
        lastReview: lastReviewDate ? lastReviewDate.toISOString().slice(0, 10) : 'N/A',
        nextReview: lastReviewDate
          ? new Date(lastReviewDate.getFullYear(), lastReviewDate.getMonth() + 3, lastReviewDate.getDate()).toISOString().slice(0, 10)
          : 'TBD',
        status
      };
    });

    const ratedRows = rows.filter((row) => row.rating > 0);
    const averageRating = ratedRows.length
      ? Number((ratedRows.reduce((sum, row) => sum + row.rating, 0) / ratedRows.length).toFixed(1))
      : 0;

    const reviewsDue = rows.filter((row) => row.nextReview !== 'TBD' && row.nextReview !== 'N/A' && new Date(row.nextReview) <= new Date()).length;
    const topPerformers = rows.filter((row) => row.rating >= 4.5).length;
    const improvementPlans = rows.filter((row) => row.rating > 0 && row.rating < 3.5).length;

    return res.json({
      success: true,
      data: {
        employees: rows,
        stats: { averageRating, reviewsDue, topPerformers, improvementPlans }
      }
    });
  } catch (error) {
    console.error('Get HR performance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch HR performance data', error: error.message });
  }
});

// HR training overview
router.get('/hr/training', verifyERPToken, employeesRead, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const models = tenantOrgService.getTenantModels(tenantContext);
    const filter = tenantOrgService.getTenantFilter(tenantContext);
    const employees = await models.Employee.find({ ...filter, status: { $in: ['active', 'probation', 'on-leave'] } })
      .select('skills department')
      .lean();

    const skillHistogram = new Map();
    let enrolledEmployees = 0;
    for (const employee of employees) {
      const skills = Array.isArray(employee.skills) ? employee.skills : [];
      if (skills.length > 0) enrolledEmployees += 1;
      for (const skill of skills) {
        const name = String(skill?.name || '').trim();
        if (!name) continue;
        skillHistogram.set(name, (skillHistogram.get(name) || 0) + 1);
      }
    }

    const programs = Array.from(skillHistogram.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([title, participants], index) => ({
        id: `${title}-${index}`,
        title,
        participants,
        duration: '4 weeks',
        status: 'Active',
        completion: Math.min(95, 20 + participants * 5)
      }));

    const activePrograms = programs.length;
    const totalCourses = skillHistogram.size;
    const completedThisMonth = programs.reduce((sum, item) => sum + Math.floor((item.participants * item.completion) / 100), 0);

    return res.json({
      success: true,
      data: {
        programs,
        stats: { activePrograms, totalCourses, enrolledEmployees, completedThisMonth }
      }
    });
  } catch (error) {
    console.error('Get HR training error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch HR training data', error: error.message });
  }
});

// HR onboarding overview
router.get('/hr/onboarding', verifyERPToken, employeesRead, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const models = tenantOrgService.getTenantModels(tenantContext);
    const filter = tenantOrgService.getTenantFilter(tenantContext);
    const employees = await models.Employee.find({ ...filter })
      .populate('userId', 'fullName')
      .sort({ hireDate: -1, createdAt: -1 })
      .limit(100)
      .lean();

    const now = Date.now();
    const days = (value) => Math.max(0, Math.floor((now - new Date(value).getTime()) / (1000 * 60 * 60 * 24)));

    const onboardingEmployees = employees
      .filter((employee) => employee.hireDate)
      .slice(0, 20)
      .map((employee) => {
        const daysSinceHire = days(employee.hireDate);
        const progress = Math.min(100, Math.max(10, Math.round((daysSinceHire / 90) * 100)));
        const status = progress >= 100 ? 'Completed' : progress >= 90 ? 'Almost Complete' : 'In Progress';
        return {
          id: String(employee._id),
          name: employee.userId?.fullName || employee.employeeId || 'Employee',
          position: employee.jobTitle || 'Team Member',
          startDate: new Date(employee.hireDate).toISOString().slice(0, 10),
          progress,
          status
        };
      });

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const newHires = employees.filter((employee) => employee.hireDate && new Date(employee.hireDate) >= monthAgo).length;
    const inProgress = onboardingEmployees.filter((employee) => employee.progress < 100).length;
    const completed = onboardingEmployees.filter((employee) => employee.progress >= 100).length;
    const trainingSessions = onboardingEmployees.length * 2;

    return res.json({
      success: true,
      data: {
        employees: onboardingEmployees,
        stats: { newHires, inProgress, completed, trainingSessions }
      }
    });
  } catch (error) {
    console.error('Get HR onboarding error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch HR onboarding data', error: error.message });
  }
});

router.get('/hr/onboarding/checklist', verifyERPToken, employeesRead, async (req, res) => {
  return res.json({
    success: true,
    data: {
      checklist: [
        'Complete HR documentation',
        'IT equipment setup',
        'System access and accounts',
        'Company orientation',
        'Department introduction',
        'Assign mentor/buddy',
        'First project assignment',
        '30-day check-in'
      ]
    }
  });
});

// HR recruitment jobs
router.get('/hr/recruitment/jobs', verifyERPToken, employeesRead, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const result = await recruitmentService.getJobPostings(tenantContext.orgId, req.query || {});
    const jobs = (result?.jobs || []).map((job) => ({
      id: String(job._id || job.id),
      title: job.title || 'Untitled role',
      department: job.metadata?.department || 'General',
      location: job.metadata?.location || 'Remote',
      applicants: Number(job.applicants || 0),
      posted: job.createdAt ? new Date(job.createdAt).toISOString().slice(0, 10) : 'N/A',
      status: job.metadata?.status || 'draft',
      description: job.description || ''
    }));
    return res.json({ success: true, data: { jobs, total: jobs.length } });
  } catch (error) {
    console.error('Get HR recruitment jobs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch job postings', error: error.message });
  }
});

router.get('/hr/recruitment', verifyERPToken, employeesRead, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const result = await recruitmentService.getJobPostings(tenantContext.orgId, req.query || {});
    const jobs = result?.jobs || [];
    const activeCandidates = jobs.reduce((sum, job) => sum + Number(job.applicants || 0), 0);
    const inReview = jobs.reduce((sum, job) => sum + Number(job.inReview || 0), 0);
    const hiredThisMonth = jobs.reduce((sum, job) => sum + Number(job.accepted || 0), 0);
    return res.json({
      success: true,
      data: {
        jobs,
        stats: {
          openPositions: jobs.length,
          activeCandidates,
          inReview,
          hiredThisMonth
        }
      }
    });
  } catch (error) {
    console.error('Get HR recruitment overview error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch recruitment data', error: error.message });
  }
});

router.post('/hr/recruitment/jobs', verifyERPToken, employeesWrite, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { title, department, location, description, employmentType, experienceLevel, salaryRange, status, expiresAt, tags } = req.body || {};
    if (!String(title || '').trim()) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }
    const created = await recruitmentService.createJobPosting(tenantContext.orgId, {
      title: String(title).trim(),
      department: String(department || 'General').trim(),
      location: String(location || 'Remote').trim(),
      description: String(description || '').trim(),
      employmentType: String(employmentType || 'full-time').trim(),
      experienceLevel: String(experienceLevel || 'mid').trim(),
      salaryRange: salaryRange || null,
      status: String(status || 'draft').trim(),
      expiresAt: expiresAt || null,
      tags: Array.isArray(tags) ? tags : []
    });
    return res.status(201).json({
      success: true,
      data: {
        id: String(created._id),
        title: created.title,
        department: created.metadata?.department || 'General',
        location: created.metadata?.location || 'Remote',
        applicants: 0,
        posted: created.createdAt ? new Date(created.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        status: created.metadata?.status || 'draft'
      }
    });
  } catch (error) {
    console.error('Create HR recruitment job error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create job posting', error: error.message });
  }
});

router.put('/hr/recruitment/jobs/:id', verifyERPToken, employeesWrite, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { id } = req.params;
    const FormTemplate = require('../../../models/documents/FormTemplate');
    const updatePayload = {};
    const { title, description, department, location, employmentType, experienceLevel, salaryRange, status, expiresAt, tags } = req.body || {};
    if (title !== undefined) updatePayload.title = String(title || '').trim();
    if (description !== undefined) updatePayload.description = String(description || '').trim();
    if (department !== undefined || location !== undefined || employmentType !== undefined || experienceLevel !== undefined || salaryRange !== undefined || status !== undefined || expiresAt !== undefined || tags !== undefined) {
      updatePayload.metadata = {
        ...(department !== undefined ? { department: String(department || 'General').trim() } : {}),
        ...(location !== undefined ? { location: String(location || 'Remote').trim() } : {}),
        ...(employmentType !== undefined ? { employmentType: String(employmentType || 'full-time').trim() } : {}),
        ...(experienceLevel !== undefined ? { experienceLevel: String(experienceLevel || 'mid').trim() } : {}),
        ...(salaryRange !== undefined ? { salaryRange: salaryRange || null } : {}),
        ...(status !== undefined ? { status: String(status || 'draft').trim() } : {}),
        ...(expiresAt !== undefined ? { expiresAt: expiresAt || null } : {}),
        ...(tags !== undefined ? { tags: Array.isArray(tags) ? tags : [] } : {})
      };
    }

    const updated = await FormTemplate.findOneAndUpdate(
      { _id: id, orgId: tenantContext.orgId, category: 'job_posting', isActive: true },
      { $set: updatePayload },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Job posting not found' });
    }

    return res.json({
      success: true,
      data: {
        id: String(updated._id),
        title: updated.title,
        department: updated.metadata?.department || 'General',
        location: updated.metadata?.location || 'Remote',
        applicants: 0,
        posted: updated.createdAt ? new Date(updated.createdAt).toISOString().slice(0, 10) : 'N/A',
        status: updated.metadata?.status || 'draft'
      }
    });
  } catch (error) {
    console.error('Update HR recruitment job error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update job posting', error: error.message });
  }
});

router.delete('/hr/recruitment/jobs/:id', verifyERPToken, employeesWrite, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { id } = req.params;
    const FormTemplate = require('../../../models/documents/FormTemplate');
    const deleted = await FormTemplate.findOneAndUpdate(
      { _id: id, orgId: tenantContext.orgId, category: 'job_posting', isActive: true },
      { $set: { isActive: false } },
      { new: true }
    ).lean();
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Job posting not found' });
    }
    return res.json({ success: true, message: 'Job posting deleted successfully' });
  } catch (error) {
    console.error('Delete HR recruitment job error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete job posting', error: error.message });
  }
});

router.get('/hr/recruitment/jobs/:id/applications', verifyERPToken, employeesRead, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const applications = await recruitmentService.getJobApplications(tenantContext.orgId, req.params.id);
    return res.json({ success: true, data: { applications, total: applications.length } });
  } catch (error) {
    console.error('Get HR recruitment applications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch job applications', error: error.message });
  }
});

router.get('/hr/recruitment/interviews', verifyERPToken, employeesRead, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const interviews = await recruitmentService.getInterviews(tenantContext.orgId, req.query || {});
    return res.json({ success: true, data: { interviews, total: interviews.length } });
  } catch (error) {
    console.error('Get HR interviews error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch interviews', error: error.message });
  }
});

router.post('/hr/recruitment/interviews', verifyERPToken, employeesWrite, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const interview = await recruitmentService.createInterview(tenantContext.orgId, {
      ...(req.body || {}),
      createdBy: req.user?._id
    });
    return res.status(201).json({ success: true, data: interview });
  } catch (error) {
    console.error('Create HR interview error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create interview', error: error.message });
  }
});

// ==================== USER MANAGEMENT ROUTES ====================

const TENANT_ROLE_ENUM = ['owner', 'admin', 'manager', 'project_manager', 'hr', 'finance', 'employee', 'contractor', 'client'];

const normalizeCustomPermissionCodes = (codes = []) => {
  if (!Array.isArray(codes)) return [];
  const normalized = [];
  const seen = new Set();
  for (const raw of codes) {
    const code = String(raw || '').trim().toLowerCase();
    if (!code) continue;
    const [resource, action] = code.split(':');
    if (!resource || !action) continue;
    if (!/^[a-z0-9_*.-]+$/.test(resource) || !/^[a-z0-9_*.-]+$/.test(action)) continue;
    const key = `${resource}:${action}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ resource, actions: [action] });
  }
  return normalized;
};

// Get users
router.get('/users', verifyERPToken, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { page = 1, limit = 20, role, department, status } = req.query;
    const users = await tenantOrgService.getUsers(tenantContext, { page, limit, role, department, status });
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
  }
});

// Create user
router.post('/users', verifyERPToken, requireUserManagementAdmin, checkReadOnlySoftwareHouseOnly, checkUsageLimitSoftwareHouseOnly('users', 1), async (req, res) => {
  try {
    const requesterRole = String(req.user?.role || '').toLowerCase();
    const requestedRole = String(req.body?.erpRole || req.body?.role || '').trim().toLowerCase();
    if (requestedRole === 'owner' && requesterRole !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only an owner can create another owner account' });
    }
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const userData = req.body;
    const user = await tenantOrgService.createUser(tenantContext, userData);
    const temp = user._temporaryPassword;
    const payload = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
    if (temp) {
      payload.temporaryPassword = temp;
      payload.mustChangePassword = true;
    }
    res.json({ success: true, data: payload });
  } catch (error) {
    console.error('Create user error:', error);
    const dup = /already exists/i.test(error.message || '');
    res.status(dup ? 409 : 500).json({
      success: false,
      message: dup ? error.message : 'Failed to create user',
      error: error.message
    });
  }
});

// Get user by ID (includes TenantUser.role and hrSubRole for UI)
router.get('/users/:id', verifyERPToken, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const tenantId = req.tenant?._id || tenantContext?.tenantId;
    const { id } = req.params;
    const user = await tenantOrgService.getUserById(tenantContext, id);
    const userObj = user?.toObject ? user.toObject() : { ...user };
    const TenantUser = require('../../../models/tenant/TenantUser');
    const tenantUser = await TenantUser.findOne({ userId: id, tenantId })
      .select('roles hrSubRole financeSubRole status metadata.customFields.permissionOverrides')
      .lean();
    if (tenantUser) {
      userObj.role = tenantUser.roles?.[0]?.role || userObj.role;
      userObj.hrSubRole = tenantUser.hrSubRole ?? null;
      userObj.financeSubRole = tenantUser.financeSubRole ?? null;
      userObj.portalTenantStatus = tenantUser.status;
      const roleEntry = tenantUser.roles?.[0];
      userObj.customPermissionCodes = Array.isArray(roleEntry?.permissions)
        ? roleEntry.permissions
            .flatMap((perm) =>
              (perm?.actions || []).map((action) =>
                `${String(perm?.resource || '').trim()}:${String(action || '').trim()}`
              )
            )
            .filter((code) => code !== ':')
        : [];
      userObj.deniedPermissionCodes = Array.isArray(tenantUser?.metadata?.customFields?.permissionOverrides?.deny)
        ? tenantUser.metadata.customFields.permissionOverrides.deny
        : [];
    }
    res.json({ success: true, data: userObj });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

// Admin: set user password (no "view password" — replaces hash; optional activation from pending)
router.patch('/users/:id/admin-password', verifyERPToken, requireUserManagementAdmin, strictLimiter, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const tenantId = req.tenant?._id || tenantContext?.tenantId;
    const requesterRole = String(req.user?.role || '').toLowerCase();
    const TenantUser = require('../../../models/tenant/TenantUser');
    const targetTenantUser = await TenantUser.findOne({ userId: req.params.id, tenantId }).select('roles').lean();
    const targetRole = String(targetTenantUser?.roles?.[0]?.role || '').toLowerCase();
    if (targetRole === 'owner' && requesterRole !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only an owner can reset another owner\'s password' });
    }
    const newPassword = String(req.body.newPassword || '').trim();
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    await tenantOrgService.setUserPasswordByAdmin(tenantContext, req.params.id, newPassword);
    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    const msg = error.message || 'Failed to set password';
    const code = /not in this organization|not found/i.test(msg) ? 404 : 500;
    res.status(code).json({ success: false, message: msg });
  }
});

// Update user (includes TenantUser.hrSubRole / financeSubRole — UPR Phase 2)
router.put('/users/:id', verifyERPToken, requireUserManagementAdmin, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const tenantId = req.tenant?._id || tenantContext?.tenantId;
    const { id } = req.params;
    const { hrSubRole, financeSubRole, role, erpRole, customPermissionCodes, deniedPermissionCodes, ...userData } = req.body;
    const requesterRole = String(req.user?.role || '').toLowerCase();
    const isSelf = String(id) === String(req.user?._id || '');
    console.log('[UPRDBG][PUT incoming]', {
      userId: id,
      actorId: String(req.user?._id || ''),
      role: role || erpRole || null,
      customPermissionCodes: Array.isArray(customPermissionCodes) ? customPermissionCodes : customPermissionCodes ?? null,
      deniedPermissionCodes: Array.isArray(deniedPermissionCodes) ? deniedPermissionCodes : deniedPermissionCodes ?? null
    });
    const requestedRole = String(role || erpRole || '').trim().toLowerCase();
    const roleToApply = requestedRole && TENANT_ROLE_ENUM.includes(requestedRole) ? requestedRole : null;
    const hasCustomOverridePayload = customPermissionCodes !== undefined;
    const hasDeniedOverridePayload = deniedPermissionCodes !== undefined;

    if (requestedRole && !roleToApply) {
      return res.status(400).json({
        success: false,
        message: `role must be one of: ${TENANT_ROLE_ENUM.join(', ')}`
      });
    }

    if (roleToApply === 'owner' && requesterRole !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only an owner can grant the owner role' });
    }

    if (isSelf && roleToApply && roleToApply !== requesterRole) {
      return res.status(403).json({ success: false, message: 'You cannot change your own role' });
    }

    const TenantUser = require('../../../models/tenant/TenantUser');
    const { invalidateResolvedPermissions } = require('../../../services/tenant/permissionResolver.service');
    const tenantUser = await TenantUser.findOne({ userId: id, tenantId });

    if (roleToApply && tenantUser) {
      if (!Array.isArray(tenantUser.roles) || tenantUser.roles.length === 0) {
        tenantUser.roles = [{ role: roleToApply, permissions: [], assignedAt: new Date() }];
      } else {
        tenantUser.roles[0].role = roleToApply;
        tenantUser.roles[0].assignedAt = new Date();
      }
      userData.role = roleToApply; // keep main User.role in sync for existing filters/UI
    }

    if (hasCustomOverridePayload) {
      if (!tenantUser) {
        return res.status(404).json({ success: false, message: 'Tenant user not found for permission override update' });
      }
      const parsedOverrides = normalizeCustomPermissionCodes(customPermissionCodes);
      if (!Array.isArray(tenantUser.roles) || tenantUser.roles.length === 0) {
        tenantUser.roles = [{ role: roleToApply || 'employee', permissions: parsedOverrides, assignedAt: new Date() }];
      } else {
        tenantUser.roles[0].permissions = parsedOverrides;
      }
    }

    if (hasDeniedOverridePayload) {
      if (!tenantUser) {
        return res.status(404).json({ success: false, message: 'Tenant user not found for denied permission update' });
      }
      const parsedDenied = normalizeCustomPermissionCodes(deniedPermissionCodes).map((p) => `${p.resource}:${p.actions[0]}`);
      tenantUser.metadata = tenantUser.metadata || {};
      tenantUser.metadata.customFields = tenantUser.metadata.customFields || {};
      tenantUser.metadata.customFields.permissionOverrides = tenantUser.metadata.customFields.permissionOverrides || {};
      tenantUser.metadata.customFields.permissionOverrides.deny = parsedDenied;
    }

    if (hrSubRole !== undefined) {
      const valid = ['manager', 'executive', 'payroll_officer'].includes(hrSubRole);
      if (hrSubRole !== null && hrSubRole !== '' && !valid) {
        return res.status(400).json({ success: false, message: 'hrSubRole must be one of: manager, executive, payroll_officer' });
      }
      if (tenantUser) {
        tenantUser.hrSubRole = (hrSubRole === null || hrSubRole === '') ? undefined : hrSubRole;
      }
    }

    if (financeSubRole !== undefined) {
      const validFin = ['manager', 'accountant', 'analyst', 'ap_officer', 'ar_officer'].includes(financeSubRole);
      if (financeSubRole !== null && financeSubRole !== '' && !validFin) {
        return res.status(400).json({
          success: false,
          message: 'financeSubRole must be one of: manager, accountant, analyst, ap_officer, ar_officer'
        });
      }
      if (tenantUser) {
        tenantUser.financeSubRole = (financeSubRole === null || financeSubRole === '') ? undefined : financeSubRole;
      }
    }

    if (tenantUser && (roleToApply || hasCustomOverridePayload || hasDeniedOverridePayload || hrSubRole !== undefined || financeSubRole !== undefined)) {
      if (tenantUser.roles?.[0]?.role !== 'hr') {
        tenantUser.hrSubRole = undefined;
      }
      if (tenantUser.roles?.[0]?.role !== 'finance') {
        tenantUser.financeSubRole = undefined;
      }
      await tenantUser.save();
      console.log('[UPRDBG][PUT persisted]', {
        userId: id,
        deniedPermissionCodes: tenantUser?.metadata?.customFields?.permissionOverrides?.deny || []
      });
      await invalidateResolvedPermissions(tenantId, id);
    }

    const user = await tenantOrgService.updateUser(tenantContext, id, userData);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

// ==================== USER PROFILE ROUTES ====================

// Configure multer for profile picture uploads
// ── Org Logo Upload ───────────────────────────────────────────────────────────
const orgLogoStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'org-logos');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const { tenantSlug } = req.params;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `logo-${tenantSlug}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const orgLogoUpload = multer({
  storage: orgLogoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp, svg)'));
  }
});

// POST /profile/logo — upload org logo (admin only)
router.post('/profile/logo', verifyERPToken, requireSettingsAdmin, (req, res, next) => {
  orgLogoUpload.single('logo')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'Logo must be under 2 MB' });
      return res.status(400).json({ success: false, message: err.message || 'Invalid file' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { tenantSlug } = req.params;
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const tenant = await Tenant.findOne({ slug: tenantSlug });
    if (!tenant) { await fs.unlink(req.file.path); return res.status(404).json({ success: false, message: 'Organization not found' }); }

    // Delete old logo if exists
    if (tenant.branding?.logo) {
      try {
        const oldPath = path.join(process.cwd(), tenant.branding.logo.replace(/^\//, ''));
        if (await fs.access(oldPath).then(() => true).catch(() => false)) await fs.unlink(oldPath);
      } catch (_) {}
    }

    const logoUrl = `/uploads/org-logos/${req.file.filename}`;
    tenant.branding = { ...(tenant.branding || {}), logo: logoUrl };
    await tenant.save();

    res.json({ success: true, message: 'Logo uploaded', data: { logoUrl } });
  } catch (err) {
    if (req.file) try { await fs.unlink(req.file.path); } catch (_) {}
    res.status(500).json({ success: false, message: 'Upload failed', error: err.message });
  }
});

// DELETE /profile/logo — remove org logo
router.delete('/profile/logo', verifyERPToken, requireSettingsAdmin, async (req, res) => {
  try {
    const { tenantSlug } = req.params;
    const tenant = await Tenant.findOne({ slug: tenantSlug });
    if (!tenant) return res.status(404).json({ success: false, message: 'Organization not found' });

    if (tenant.branding?.logo) {
      try {
        const p = path.join(process.cwd(), tenant.branding.logo.replace(/^\//, ''));
        if (await fs.access(p).then(() => true).catch(() => false)) await fs.unlink(p);
      } catch (_) {}
      tenant.branding.logo = undefined;
      await tenant.save();
    }
    res.json({ success: true, message: 'Logo removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove logo', error: err.message });
  }
});

const profilePicStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'profile-pictures');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const profilePicUpload = multer({
  storage: profilePicStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Get current user profile
router.get('/users/profile', verifyERPToken, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).select('-password -refreshTokens');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          department: user.department,
          jobTitle: user.jobTitle,
          role: user.role,
          profilePicUrl: await getExistingUploadPathOrNull(user.profilePicUrl),
          status: user.status
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile', error: error.message });
  }
});

// Update user profile
router.patch('/users/profile', verifyERPToken, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    let { fullName, phone, department, jobTitle } = req.body;

    if (fullName !== undefined) {
      fullName = typeof fullName === 'string' ? fullName.trim() : fullName;
      if (!fullName) {
        return res.status(400).json({ success: false, message: 'Full name cannot be empty' });
      }
    }
    if (phone !== undefined && typeof phone === 'string') phone = phone.trim();
    if (department !== undefined && typeof department === 'string') department = department.trim();
    if (jobTitle !== undefined && typeof jobTitle === 'string') jobTitle = jobTitle.trim();

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    if (department !== undefined) user.department = department;
    if (jobTitle !== undefined) user.jobTitle = jobTitle;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          department: user.department,
          jobTitle: user.jobTitle,
          role: user.role,
          profilePicUrl: await getExistingUploadPathOrNull(user.profilePicUrl)
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile', error: error.message });
  }
});

// Change password
router.patch('/users/password', verifyERPToken, strictLimiter, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    // Find user with password field
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Failed to change password', error: error.message });
  }
});

// Upload profile picture (multer errors handled in wrapper so client gets JSON)
router.post('/users/profile/picture', verifyERPToken, strictLimiter, (req, res, next) => {
  profilePicUpload.single('profilePic')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Image size must be less than 5MB' });
      }
      return res.status(400).json({ success: false, message: err.message || 'Invalid file. Only image files are allowed (jpeg, jpg, png, gif, webp).' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete old profile picture if exists
    if (user.profilePicUrl) {
      try {
        const oldPath = path.join(process.cwd(), user.profilePicUrl.replace(/^\//, ''));
        if (await fs.access(oldPath).then(() => true).catch(() => false)) {
          await fs.unlink(oldPath);
        }
      } catch (oldPicError) {
        console.error('Error deleting old profile picture:', oldPicError);
      }
    }

    // Update user profile picture URL
    // Store relative path from project root
    const relativePath = `/uploads/profile-pictures/${req.file.filename}`;
    user.profilePicUrl = relativePath;
    await user.save();

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        profilePicUrl: relativePath
      }
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }
    res.status(500).json({ success: false, message: 'Failed to upload profile picture', error: error.message });
  }
});

// Upload profile picture for a specific user (admin flow: create user/employee with picture)
router.post('/users/:id/picture', verifyERPToken, strictLimiter, (req, res, next) => {
  profilePicUpload.single('profilePic')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Image size must be less than 5MB' });
      }
      return res.status(400).json({ success: false, message: err.message || 'Invalid file. Only image files are allowed (jpeg, jpg, png, gif, webp).' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const targetUserId = req.params.id;
    const user = await User.findById(targetUserId);
    if (!user) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.profilePicUrl) {
      try {
        const oldPath = path.join(process.cwd(), user.profilePicUrl.replace(/^\//, ''));
        if (await fs.access(oldPath).then(() => true).catch(() => false)) {
          await fs.unlink(oldPath);
        }
      } catch (oldPicError) {
        console.error('Error deleting old profile picture (admin upload):', oldPicError);
      }
    }

    const relativePath = `/uploads/profile-pictures/${req.file.filename}`;
    user.profilePicUrl = relativePath;
    await user.save();

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: { profilePicUrl: relativePath, userId: user._id }
    });
  } catch (error) {
    console.error('Upload user profile picture error:', error);
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }
    res.status(500).json({ success: false, message: 'Failed to upload profile picture', error: error.message });
  }
});

// Serve profile pictures (static file serving)
router.get('/uploads/profile-pictures/:filename', verifyERPToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', 'profile-pictures', filename);
    
    // Security check - ensure path is within uploads directory
    const resolvedPath = path.resolve(filePath);
    const uploadDir = path.resolve(path.join(process.cwd(), 'uploads', 'profile-pictures'));
    
    if (!resolvedPath.startsWith(uploadDir)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.sendFile(resolvedPath);
  } catch (error) {
    console.error('Serve profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve profile picture'
    });
  }
});

// Serve project logos (same auth pattern as profile pictures)
router.get('/uploads/project-logos/:filename', verifyERPToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', 'project-logos', filename);
    const resolvedPath = path.resolve(filePath);
    const uploadDir = path.resolve(path.join(process.cwd(), 'uploads', 'project-logos'));
    if (!resolvedPath.startsWith(uploadDir)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    res.sendFile(resolvedPath);
  } catch (error) {
    console.error('Serve project logo error:', error);
    res.status(500).json({ success: false, message: 'Failed to serve project logo' });
  }
});

// Delete user
router.delete('/users/:id', verifyERPToken, requireUserManagementAdmin, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const tenantId = req.tenant?._id || tenantContext?.tenantId;
    const { id } = req.params;
    const requesterRole = String(req.user?.role || '').toLowerCase();
    const TenantUser = require('../../../models/tenant/TenantUser');
    const targetTenantUser = await TenantUser.findOne({ userId: id, tenantId }).select('roles').lean();
    const targetRole = String(targetTenantUser?.roles?.[0]?.role || '').toLowerCase();
    if (targetRole === 'owner') {
      if (requesterRole !== 'owner') {
        return res.status(403).json({ success: false, message: 'Only an owner can remove another owner' });
      }
      const ownerCount = await TenantUser.countDocuments({ tenantId, status: 'active', 'roles.0.role': 'owner' });
      if (ownerCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot remove the last owner of the organization' });
      }
    }
    await tenantOrgService.deleteUser(tenantContext, id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    const notFound = error.message === 'User not found';
    res.status(notFound ? 404 : 500).json({
      success: false,
      message: notFound ? 'User not found or already removed' : (error.message || 'Failed to delete user')
    });
  }
});

// ==================== FINANCE MODULE ROUTES ====================
// NOTE: Finance routes have been moved to softwareHouse.js as they are software-house-specific
// Finance is no longer a shared module - it's dedicated to software house tenants only

// ==================== PROJECTS MODULE ROUTES ====================
// NOTE: Projects routes are now handled by the projects router mounted above
// The projects router handles: GET /projects, POST /projects, GET /projects/:id, etc.
// All inline project routes have been removed to avoid conflicts with the projects router
// The projects router handles: /projects/tasks, /projects/milestones, etc.

// ==================== SETTINGS ROUTES ====================

// Get all settings
router.get('/settings', verifyERPToken, denyClientSettingsAccess, requireSettingsAdmin, async (req, res) => {
  try {
    const tenantContext = await buildTenantContext(req);
    const { tenantId, orgId } = tenantContext;
    
    // Get or create settings
    let settings = await TenantSettings.getOrCreate(tenantId, orgId);
    
    // If organization name is empty, use tenant name
    if (!settings.general.organizationName && req.tenant) {
      settings.general.organizationName = req.tenant.name || '';
      await settings.save();
    }
    
    res.json({
      success: true,
      data: {
        general: settings.general,
        notifications: settings.notifications,
        security: settings.security
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings', error: error.message });
  }
});

// Update general settings
router.put('/settings/general', verifyERPToken, denyClientSettingsAccess, requireSettingsAdmin, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { tenantId, orgId } = tenantContext;
    
    const settings = await TenantSettings.getOrCreate(tenantId, orgId);
    await settings.updateGeneral(req.body);
    
    res.json({
      success: true,
      message: 'General settings updated successfully',
      data: {
        general: settings.general
      }
    });
  } catch (error) {
    console.error('Update general settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update general settings', error: error.message });
  }
});

// Update notification settings
router.put('/settings/notifications', verifyERPToken, denyClientSettingsAccess, requireSettingsAdmin, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { tenantId, orgId } = tenantContext;
    
    const settings = await TenantSettings.getOrCreate(tenantId, orgId);
    await settings.updateNotifications(req.body);
    
    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: {
        notifications: settings.notifications
      }
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update notification settings', error: error.message });
  }
});

// Update security settings
router.put('/settings/security', verifyERPToken, denyClientSettingsAccess, requireSettingsAdmin, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { tenantId, orgId } = tenantContext;
    
    const settings = await TenantSettings.getOrCreate(tenantId, orgId);
    await settings.updateSecurity(req.body);
    
    res.json({
      success: true,
      message: 'Security settings updated successfully',
      data: {
        security: settings.security
      }
    });
  } catch (error) {
    console.error('Update security settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update security settings', error: error.message });
  }
});

// Get theme settings
router.get('/settings/theme', verifyERPToken, denyClientSettingsAccess, async (req, res) => {
  try {
    const tenantContext = await buildTenantContext(req);
    const { tenantId, orgId } = tenantContext;
    const settings = await TenantSettings.getOrCreate(tenantId, orgId);

    const themeResponse = settings.theme || {
      name: 'default',
      colors: { primary: '#6366F1', secondary: '#10B981', accent: '#A855F7' },
      fonts: { heading: 'Geist', body: 'Inter' }
    };

    res.json({
      success: true,
      data: {
        theme: themeResponse
      }
    });
  } catch (error) {
    console.error('❌ Get theme settings error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Failed to fetch theme settings', error: error.message });
  }
});

// Update theme settings
router.put('/settings/theme', verifyERPToken, denyClientSettingsAccess, requireSettingsAdmin, async (req, res) => {
  try {
    const tenantContext = await buildTenantContext(req);
    const { tenantId, orgId } = tenantContext;

    const settings = await TenantSettings.getOrCreate(tenantId, orgId);
    await settings.updateTheme(req.body);
    
    // Reload from database to get the updated theme
    await settings.save();
    const updatedSettings = await TenantSettings.findById(settings._id);

    res.json({
      success: true,
      message: 'Theme settings updated successfully',
      data: {
        theme: updatedSettings.theme
      }
    });
  } catch (error) {
    console.error('❌ Update theme settings error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Failed to update theme settings', error: error.message });
  }
});

// Update settings (legacy route - for backward compatibility)
router.put('/settings', verifyERPToken, denyClientSettingsAccess, requireSettingsAdmin, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const settingsData = req.body;
    const settings = await tenantOrgService.updateSettings(tenantContext, settingsData);
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

// ==================== UNIFIED PERMISSIONS (UPR) ====================

// Get my resolved permissions (for menu and UI) — Plan Phase 1
router.get('/me/permissions', verifyERPToken, async (req, res) => {
  try {
    const tenantId = req.tenant?._id || req.tenantContext?.tenantId || req.user?.tenantId;
    const userId = req.user?._id;
    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const permissionResolver = require('../../../services/tenant/permissionResolver.service');
    const resolved = await permissionResolver.getResolvedPermissions(userId, tenantId, {
      hrSubRole: req.user?.hrSubRole,
      financeSubRole: req.user?.financeSubRole
    });
    const { buildModuleAccessFromResolved } = require('../../../services/tenant/permissionProjection.service');
    const modules = buildModuleAccessFromResolved(resolved);
    const ProjectMember = require('../../../models/project-delivery/ProjectMember');
    const memberships = await ProjectMember.find({ userId, status: 'active' }).select('projectId').lean();
    const projectIds = memberships.map(m => m.projectId?.toString?.()).filter(Boolean);
    res.json({
      success: true,
      data: {
        modules,
        departmentIds: resolved.departmentIds || [],
        hrSubRole: resolved.hrSubRole || null,
        financeSubRole: resolved.financeSubRole || null,
        projectIds
      }
    });
  } catch (err) {
    console.error('GET /me/permissions error:', err);
    res.status(500).json({ success: false, message: 'Failed to load permissions' });
  }
});

// Read-only catalog: enforced permissions (SH project roles + UPR base roles)
router.get('/permission-catalog', verifyTenantOrgAccess, async (req, res) => {
  try {
    const { buildPermissionCatalog } = require('../../../services/tenant/permissionCatalog.service');
    const data = buildPermissionCatalog();
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /permission-catalog error:', err);
    res.status(500).json({ success: false, message: 'Failed to load permission catalog' });
  }
});

// Read-only catalog: UPR primary + HR sub-roles + Software House project roles
router.get('/role-catalog', verifyTenantOrgAccess, async (req, res) => {
  try {
    const { buildRoleCatalog } = require('../../../services/tenant/roleCatalog.service');
    const data = buildRoleCatalog();
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /role-catalog error:', err);
    res.status(500).json({ success: false, message: 'Failed to load role catalog' });
  }
});

// ==================== USER DEPARTMENT ACCESS ====================

// Get user departments (for navigation and access control)
router.get('/user-departments', verifyTenantOrgAccess, async (req, res) => {
  try {
    console.log('🔵 GET /user-departments called', {
      tenantSlug: req.params.tenantSlug,
      path: req.path,
      url: req.url
    });
    
    const tenantContext = await buildTenantContext(req);
    console.log('🔵 Tenant context built:', {
      tenantId: tenantContext.tenantId,
      tenantSlug: tenantContext.tenantSlug,
      orgId: tenantContext.orgId
    });
    
    // Get userId from token if available
    const userId = req.user?._id?.toString() || req.decoded?.userId || req.decoded?.ownerId || req.query?.userId || null;
    
    // Pass the tenant object directly (already fetched by verifyTenantOrgAccess middleware)
    const tenant = req.tenant;
    console.log('🔵 Tenant object:', {
      id: tenant?._id,
      slug: tenant?.slug,
      erpModules: tenant?.erpModules
    });
    
    const departments = await tenantOrgService.getUserDepartments(tenantContext, userId, tenant);
    console.log('🔵 Departments returned:', departments.length);
    res.json({ success: true, data: departments });
  } catch (error) {
    console.error('❌ Get user departments error:', error);
    console.error('❌ Error stack:', error.stack);
    // Even on error, return default departments to ensure navigation works
    try {
      const defaultDepartments = tenantOrgService.getDefaultDepartments();
      res.json({ success: true, data: defaultDepartments });
    } catch (fallbackError) {
      console.error('❌ Fallback error:', fallbackError);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch user departments', 
        error: error.message 
      });
    }
  }
});

// Projects routes - New comprehensive project management API
const projectsRoutes = require('../../../routes/projects.routes');
// Rate limiting and ERP token verification (module access control removed per product decision)
router.use('/projects', tokenVerificationLimiter, verifyERPToken, projectsRoutes);

// Nucleus Project OS - Approval and Change Request routes
const approvalsRoutes = require('./approvals');
const changeRequestsRoutes = require('./changeRequests');
const deliverablesRoutes = require('./deliverables');
const documentsRoutes = require('./documents');
const sheetsRoutes = require('./sheets');
const portfolioRoutes = require('./portfolio');
router.use('/approvals', tokenVerificationLimiter, verifyERPToken, approvalsRoutes);
router.use('/change-requests', tokenVerificationLimiter, verifyERPToken, changeRequestsRoutes);
router.use('/deliverables', tokenVerificationLimiter, verifyERPToken, deliverablesRoutes);
router.use('/documents', tokenVerificationLimiter, verifyERPToken, documentsRoutes);
router.use('/sheets', tokenVerificationLimiter, verifyERPToken, sheetsRoutes);
router.use('/portfolio', portfolioRoutes);

// Note: The routes below are legacy routes that may still be used by older frontend code
// The new routes above provide comprehensive CRUD operations

// Log all registered routes for debugging (skip in tests)
if (process.env.NODE_ENV !== 'test') {
  console.log('✅ Tenant organization routes registered:', {
    routes: [
      'GET /dashboard',
      'GET /dashboard/analytics',
      'GET /analytics',
      'GET /users',
      'POST /users',
      'GET /users/:id',
      'PUT /users/:id',
      'DELETE /users/:id',
      'GET /hr',
      'GET /hr/employees',
      'POST /hr/employees',
      'GET /hr/payroll',
      'GET /hr/attendance',
      'GET /hr/attendance/config',
      'POST /hr/attendance/check-in',
      'POST /hr/attendance/check-out',
      'GET /hr/attendance/reports',
      // Finance routes moved to /api/tenant/:tenantSlug/software-house/finance/* (software-house specific)
      'GET /projects',
      'POST /projects',
      'GET /projects/:id',
      'PATCH /projects/:id',
      'DELETE /projects/:id',
      'GET /projects/metrics',
      'GET /projects/tasks',
      'POST /projects/tasks',
      'PATCH /projects/tasks/:id',
      'DELETE /projects/tasks/:id',
      'GET /projects/milestones',
      'POST /projects/milestones',
      'PATCH /projects/milestones/:id',
      'GET /projects/resources',
      'GET /projects/timesheets',
      'GET /projects/sprints',
      'GET /projects/clients',
      'POST /projects/clients',
      'PATCH /projects/clients/:id',
      'DELETE /projects/clients/:id',
      'GET /settings',
      'PUT /settings',
      'GET /user-departments',
      'GET /me/permissions',
      'GET /permission-catalog',
      'GET /role-catalog'
    ]
  });
}

// Export router as default
module.exports = router;

// Export middleware and helper functions for use in other route files
// @deprecated - Use verifyERPToken from '../../../middleware/verifyERPToken' instead
module.exports.verifyTenantOrgAccess = verifyTenantOrgAccess;
module.exports.buildTenantContext = buildTenantContext;
// Export new middleware for convenience
module.exports.verifyERPToken = verifyERPToken;
module.exports.requireSettingsAdmin = requireSettingsAdmin;
module.exports.denyClientSettingsAccess = denyClientSettingsAccess;
