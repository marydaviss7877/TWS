const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
// Use mergeParams: true to access :tenantSlug from parent route (/api/tenant/:tenantSlug/organization)
const router = express.Router({ mergeParams: true });
const Tenant = require('../../../models/Tenant');
const Organization = require('../../../models/Organization');
const DepartmentAccess = require('../../../models/DepartmentAccess');
const User = require('../../../models/User');
const TenantSettings = require('../../../models/TenantSettings');
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../../../middleware/auth/auth');
const tenantOrgService = require('../../../services/tenant/tenant-org.service');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const { tokenVerificationLimiter, strictLimiter } = require('../../../middleware/rateLimiting/rateLimiter');

const attendanceRead = requireErpAccess({ module: 'attendance', action: 'read', checkRevocation: false });
const attendanceWrite = requireErpAccess({ module: 'attendance', action: 'write', checkRevocation: false });
const employeesRead = requireErpAccess({ module: 'employees', action: 'read', checkRevocation: false });
const employeesWrite = requireErpAccess({ module: 'employees', action: 'write', checkRevocation: false });

const TenantMiddleware = require('../../../middleware/tenant/tenantMiddleware');
const { checkUsageLimitSoftwareHouseOnly, checkReadOnlySoftwareHouseOnly } = require('../../../middleware/common/featureGate');
const CLIENT_PORTAL_ROLES = new Set(['client', 'customer']);

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
    // Check if user is an education user and their orgId matches the tenant's orgId
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
          
          // Skip education user check if no userId and email lookup didn't grant access
          if (!hasAccess) {
            // Continue to next check
          }
        } else {
          console.log('🔍 Checking education user access:', {
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
            const Organization = require('../../../models/Organization');
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
              // This is the PRIMARY and MOST COMMON match for education users
              const orgSlugMatches = user.orgId?.slug === tenantSlug;
              
              // EARLY RETURN: If org slug matches tenant slug, grant access immediately
              // This handles 99% of education user access cases
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
              
                // Method 6: If tenant slug matches org slug (common case for education)
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
                // This is the most common case for education: tenant slug = org slug
                const tenantSlugEqualsOrgSlug = tenantSlug === user.orgId?.slug || tenant.slug === user.orgId?.slug;
              
                // CRITICAL FIX: Add explicit check for tenant.organizationId or tenant.orgId matching user.orgId
                // This is the most reliable match for education users
                // Check both organizationId (set during education signup) and orgId (if exists)
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
                  console.log('⚠️ User is not an education user or admin, and tenantId/orgId does not match:', {
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
        console.error('❌ Error checking education user access:', userError);
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
      .select('name slug erpCategory erpModules educationConfig status subscription.plan');
    if (!tenant && /^[0-9a-f]{24}$/i.test(tenantSlug)) {
      tenant = await Tenant.findById(tenantSlug)
        .select('name slug erpCategory erpModules educationConfig status subscription.plan');
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
        educationConfig: tenant.educationConfig || null,
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
router.get('/profile', authenticateToken, async (req, res) => {
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
router.put('/profile', verifyERPToken, async (req, res) => {
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

// Get analytics reports
router.get('/analytics/reports', verifyERPToken, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { type, period, module } = req.query;
    const reports = await tenantOrgService.getAnalyticsReports(tenantContext, { type, period, module });
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Analytics reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics reports', error: error.message });
  }
});

// ==================== HR ATTENDANCE ROUTES ====================

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
router.post('/hr/attendance/check-in', verifyERPToken, attendanceWrite, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { employeeId, ...checkInData } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'employeeId is required' });
    }
    const attendance = await tenantOrgService.attendanceCheckIn(tenantContext, employeeId, checkInData);
    res.json({ success: true, data: attendance });
  } catch (error) {
    console.error('Check-in error:', error);
    const status = error.message && (error.message.includes('Already checked in') || error.message.includes('not found')) ? 400 : 500;
    res.status(status).json({ success: false, message: error.message || 'Check-in failed', error: error.message });
  }
});

// Check-out
router.post('/hr/attendance/check-out', verifyERPToken, attendanceWrite, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { employeeId, ...checkOutData } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'employeeId is required' });
    }
    const attendance = await tenantOrgService.attendanceCheckOut(tenantContext, employeeId, checkOutData);
    res.json({ success: true, data: attendance });
  } catch (error) {
    console.error('Check-out error:', error);
    const status = error.message && (error.message.includes('No check-in') || error.message.includes('Already checked out') || error.message.includes('not found')) ? 400 : 500;
    res.status(status).json({ success: false, message: error.message || 'Check-out failed', error: error.message });
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

    const User = require('../../../models/User');
    const TenantUser = require('../../../models/TenantUser');
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
      const crypto = require('crypto');
      existingTU.invitation.invitationToken = crypto.randomBytes(32).toString('hex');
      existingTU.invitation.invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      existingTU.status = 'pending';
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

    const Organization = require('../../../models/Organization');
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
  const TenantUser = require('../../../models/TenantUser');
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

  const TenantUser = require('../../../models/TenantUser');
  const User = require('../../../models/User');
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

// ==================== USER MANAGEMENT ROUTES ====================

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
router.post('/users', verifyERPToken, checkReadOnlySoftwareHouseOnly, checkUsageLimitSoftwareHouseOnly('users', 1), async (req, res) => {
  try {
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
    const TenantUser = require('../../../models/TenantUser');
    const tenantUser = await TenantUser.findOne({ userId: id, tenantId }).select('roles hrSubRole financeSubRole status').lean();
    if (tenantUser) {
      userObj.role = tenantUser.roles?.[0]?.role || userObj.role;
      userObj.hrSubRole = tenantUser.hrSubRole ?? null;
      userObj.financeSubRole = tenantUser.financeSubRole ?? null;
      userObj.portalTenantStatus = tenantUser.status;
    }
    res.json({ success: true, data: userObj });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

// Admin: set user password (no "view password" — replaces hash; optional activation from pending)
router.patch('/users/:id/admin-password', verifyERPToken, strictLimiter, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
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
router.put('/users/:id', verifyERPToken, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const tenantId = req.tenant?._id || tenantContext?.tenantId;
    const { id } = req.params;
    const { hrSubRole, financeSubRole, ...userData } = req.body;

    if (hrSubRole !== undefined) {
      const valid = ['manager', 'executive', 'payroll_officer'].includes(hrSubRole);
      if (hrSubRole !== null && hrSubRole !== '' && !valid) {
        return res.status(400).json({ success: false, message: 'hrSubRole must be one of: manager, executive, payroll_officer' });
      }
      const TenantUser = require('../../../models/TenantUser');
      const { invalidateResolvedPermissions } = require('../../../services/tenant/permissionResolver.service');
      const tenantUser = await TenantUser.findOne({ userId: id, tenantId });
      if (tenantUser) {
        tenantUser.hrSubRole = (hrSubRole === null || hrSubRole === '') ? undefined : hrSubRole;
        await tenantUser.save();
        await invalidateResolvedPermissions(tenantId, id);
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
      const TenantUser = require('../../../models/TenantUser');
      const { invalidateResolvedPermissions } = require('../../../services/tenant/permissionResolver.service');
      const tenantUser = await TenantUser.findOne({ userId: id, tenantId });
      if (tenantUser) {
        tenantUser.financeSubRole = (financeSubRole === null || financeSubRole === '') ? undefined : financeSubRole;
        await tenantUser.save();
        await invalidateResolvedPermissions(tenantId, id);
      }
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
router.post('/profile/logo', verifyERPToken, (req, res, next) => {
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
router.delete('/profile/logo', verifyERPToken, async (req, res) => {
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
    const salt = await bcrypt.genSalt(10);
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

// Delete user
router.delete('/users/:id', verifyERPToken, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const { id } = req.params;
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

// ==================== REPORTS ROUTES ====================

// Get reports overview
router.get('/reports', verifyERPToken, async (req, res) => {
  try {
    const tenantContext = req.tenantContext || await buildTenantContext(req);
    const reports = await tenantOrgService.getReportsOverview(tenantContext);
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
});

// Generate report
router.post('/reports/generate',
  verifyERPToken, async (req, res) => {
  try {
    const tenantContext = await buildTenantContext(req);
    const { type, parameters } = req.body;
    const report = await tenantOrgService.generateReport(tenantContext, type, parameters);
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
});

// ==================== SETTINGS ROUTES ====================

// Get all settings
router.get('/settings', verifyTenantOrgAccess, denyClientSettingsAccess, async (req, res) => {
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
router.put('/settings/general', verifyERPToken, denyClientSettingsAccess, async (req, res) => {
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
router.put('/settings/notifications', verifyERPToken, denyClientSettingsAccess, async (req, res) => {
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
router.put('/settings/security', verifyERPToken, denyClientSettingsAccess, async (req, res) => {
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
router.get('/settings/theme', verifyTenantOrgAccess, denyClientSettingsAccess, async (req, res) => {
  try {
    console.log('🎨 GET /settings/theme called', { 
      tenantSlug: req.params.tenantSlug,
      tenantId: req.tenant?._id,
      userId: req.user?._id
    });
    
    const tenantContext = await buildTenantContext(req);
    const { tenantId, orgId } = tenantContext;
    
    console.log('🎨 Tenant context:', { tenantId, orgId: orgId?.toString() });
    
    const settings = await TenantSettings.getOrCreate(tenantId, orgId);
    
    console.log('🎨 Settings found/created:', {
      settingsId: settings._id,
      theme: settings.theme,
      hasTheme: !!settings.theme,
      themeName: settings.theme?.name
    });
    
    const themeResponse = settings.theme || {
      name: 'default',
      colors: { primary: '#6366F1', secondary: '#10B981', accent: '#A855F7' },
      fonts: { heading: 'Geist', body: 'Inter' }
    };
    
    console.log('🎨 Returning theme:', JSON.stringify(themeResponse, null, 2));
    
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
router.put('/settings/theme', verifyTenantOrgAccess, denyClientSettingsAccess, async (req, res) => {
  try {
    console.log('🎨 PUT /settings/theme called', { 
      tenantSlug: req.params.tenantSlug,
      tenantId: req.tenant?._id,
      userId: req.user?._id,
      body: req.body 
    });
    
    const tenantContext = await buildTenantContext(req);
    const { tenantId, orgId } = tenantContext;
    
    console.log('🎨 Tenant context:', { tenantId, orgId: orgId?.toString() });
    
    const settings = await TenantSettings.getOrCreate(tenantId, orgId);
    console.log('🎨 Settings before update:', {
      settingsId: settings._id,
      currentTheme: settings.theme
    });
    
    await settings.updateTheme(req.body);
    
    // Reload from database to get the updated theme
    await settings.save();
    const updatedSettings = await TenantSettings.findById(settings._id);
    
    console.log('🎨 Theme settings updated successfully:', {
      settingsId: updatedSettings._id,
      theme: updatedSettings.theme,
      themeName: updatedSettings.theme?.name
    });
    
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
router.put('/settings', verifyERPToken, denyClientSettingsAccess, async (req, res) => {
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
router.get('/me/permissions', verifyTenantOrgAccess, async (req, res) => {
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
    const MODULES = [
      'projects', 'hr', 'finance', 'payroll', 'documents', 'analytics', 'nucleus',
      'audit', 'clients', 'settings', 'attendance', 'leave', 'reports', 'tasks'
    ];
    const modules = {};
    const perms = resolved.permissions || [];
    const hasWildcard = perms.includes('*:*');
    MODULES.forEach(m => {
      modules[m] = {
        read: hasWildcard || perms.includes(m + ':read') || perms.includes(m + ':*'),
        write: hasWildcard || perms.includes(m + ':write') || perms.includes(m + ':*'),
        delete: hasWildcard || perms.includes(m + ':delete') || perms.includes(m + ':*')
      };
    });
    const ProjectMember = require('../../../models/ProjectMember');
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
const projectsRoutes = require('./projects');
// Rate limiting and ERP token verification (module access control removed per product decision)
router.use('/projects', tokenVerificationLimiter, verifyERPToken, projectsRoutes);

// Nucleus Project OS - Approval and Change Request routes
const approvalsRoutes = require('./approvals');
const changeRequestsRoutes = require('./changeRequests');
const deliverablesRoutes = require('./deliverables');
const documentsRoutes = require('./documents');
router.use('/approvals', tokenVerificationLimiter, verifyERPToken, approvalsRoutes);
router.use('/change-requests', tokenVerificationLimiter, verifyERPToken, changeRequestsRoutes);
router.use('/deliverables', tokenVerificationLimiter, verifyERPToken, deliverablesRoutes);
router.use('/documents', tokenVerificationLimiter, verifyERPToken, documentsRoutes);

// Note: The routes below are legacy routes that may still be used by older frontend code
// The new routes above provide comprehensive CRUD operations

// Log all registered routes for debugging
console.log('✅ Tenant organization routes registered:', {
  routes: [
    'GET /dashboard',
    'GET /dashboard/analytics',
    'GET /analytics',
    'GET /analytics/reports',
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
    'GET /reports',
    'POST /reports/generate',
    'GET /settings',
    'PUT /settings',
    'GET /user-departments',
    'GET /me/permissions',
    'GET /permission-catalog',
    'GET /role-catalog'
  ]
});

// Export router as default
module.exports = router;

// Export middleware and helper functions for use in other route files
// @deprecated - Use verifyERPToken from '../../../middleware/verifyERPToken' instead
module.exports.verifyTenantOrgAccess = verifyTenantOrgAccess;
module.exports.buildTenantContext = buildTenantContext;
// Export new middleware for convenience
module.exports.verifyERPToken = verifyERPToken;
