const jwt = require('jsonwebtoken');
const jwtService = require('../../services/auth/jwt.service');
const tokenBlacklistService = require('../../services/auth/token-blacklist.service');
const User = require('../../models/users-auth/User');
const TWSAdmin = require('../../models/admin-platform/TWSAdmin');
const auditService = require('../../services/compliance/audit.service');
const { setSecureCookie, setRefreshTokenCookie, clearSecureCookie } = require('../security/cookieSecurity');
const AuditLog = require('../../models/core/AuditLog');

/**
 * Set authentication cookies
 * SECURITY FIX: Uses secure cookie helpers for HTTPS enforcement
 * @param {object} res - Express response object
 * @param {string} accessToken - Access token
 * @param {string} refreshToken - Refresh token
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
  // Decode tokens to get expiration times
  const accessDecoded = jwt.decode(accessToken);
  const refreshDecoded = jwt.decode(refreshToken);
  
  const accessExpiresIn = accessDecoded?.exp 
    ? (accessDecoded.exp - Math.floor(Date.now() / 1000)) * 1000 
    : 15 * 60 * 1000; // Default 15 minutes
  
  const refreshExpiresIn = refreshDecoded?.exp 
    ? (refreshDecoded.exp - Math.floor(Date.now() / 1000)) * 1000 
    : 30 * 24 * 60 * 60 * 1000; // Default 30 days

  // SECURITY FIX: Use secure cookie helpers
  setSecureCookie(res, 'accessToken', accessToken, { maxAge: accessExpiresIn });
  setRefreshTokenCookie(res, 'refreshToken', refreshToken, { maxAge: refreshExpiresIn });
};

/**
 * Clear authentication cookies
 * SECURITY FIX: Uses secure cookie helper
 * @param {object} res - Express response object
 */
const clearAuthCookies = (res) => {
  clearSecureCookie(res, 'accessToken');
  clearSecureCookie(res, 'refreshToken');
};

const authenticateToken = async (req, res, next) => {
  try {
    // Try to get token from cookie first (more secure), then fallback to header
    let token = req.cookies?.accessToken;
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Auth check:', {
        hasCookie: !!req.cookies?.accessToken,
        hasAuthHeader: !!req.headers['authorization'],
        cookies: Object.keys(req.cookies || {}),
        path: req.path
      });
    }
    
    if (!token) {
      // Fallback to Authorization header if no cookie (for backward compatibility)
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    // If no token from either source, return 401 (user not authenticated)
    // This is expected during signup when user is not logged in yet
    if (!token || token.trim().length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required. Please log in.',
        code: 'UNAUTHORIZED',
        traceId: req.headers['x-request-id'] || req.id
      });
    }

    // Check if token is blacklisted
    if (await tokenBlacklistService.isTokenBlacklisted(token)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has been revoked' 
      });
    }

    // Development mode: Handle mock tokens
    if (process.env.NODE_ENV !== 'production' && token.startsWith('mock-jwt-token-')) {
      // Extract role from mock token (format: mock-jwt-token-{role}-{timestamp})
      const tokenParts = token.split('-');
      const roleIndex = tokenParts.findIndex(part => part === 'token') + 1;
      const role = tokenParts[roleIndex] || 'super_admin';
      
      // Create mock user object based on role
      const mockUser = {
        _id: '507f1f77bcf86cd799439015',
        id: '507f1f77bcf86cd799439015',
        email: 'admin@tws.com',
        fullName: 'TWS Admin',
        role: role === 'super_admin' ? 'super_admin' : role,
        status: 'active',
        orgId: {
          _id: '507f1f77bcf86cd799439012',
          name: 'TWS Organization',
          slug: 'tws-org',
          status: 'active'
        },
        permissions: ['*']
      };
      
      // Add security context to request
      req.user = mockUser;
      req.token = token;
      req.authContext = {
        userId: mockUser._id,
        orgId: mockUser.orgId._id,
        role: mockUser.role,
        type: role === 'super_admin' ? 'tws_admin' : 'user',
        tokenIssuedAt: Math.floor(Date.now() / 1000),
        tokenExpiresAt: Math.floor(Date.now() / 1000) + 3600
      };
      
      console.log('🔧 Development mode: Using mock authentication for role:', role);
      return next();
    }

    // Verify token - handle tenant_owner tokens separately
    let decoded;
    
    // First decode without verification to check token type
    const tempDecoded = jwt.decode(token);
    if (!tempDecoded) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format',
        code: 'INVALID_TOKEN'
      });
    }
    
    // If it's a tenant_owner token, verify directly with jwt
    if (tempDecoded.type === 'tenant_owner') {
      const envConfig = require('../../config/environment');
      const jwtConfig = envConfig.getJWTConfig();
      try {
        decoded = jwt.verify(token, jwtConfig.secret, {
          issuer: 'tws-backend',
          audience: 'tws-frontend'
        });
      } catch (directJwtError) {
        if (directJwtError.name === 'TokenExpiredError') {
          return res.status(401).json({ 
            success: false, 
            message: 'Token expired',
            code: 'TOKEN_EXPIRED'
          });
        }
        console.error('Tenant owner token verification failed:', directJwtError.message);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
    } else {
      // For regular tokens, use jwtService
      try {
        decoded = jwtService.verifyAccessToken(token);
      } catch (jwtError) {
        if (jwtError.message === 'Token expired') {
          return res.status(401).json({ 
            success: false, 
            message: 'Token expired',
            code: 'TOKEN_EXPIRED'
          });
        }
        console.error('Token verification failed:', jwtError.message);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
    }
    
    let user = null;
    
    // Handle tenant_owner token type (from tenant login)
    if (decoded.type === 'tenant_owner') {
      const Tenant = require('../models/tenant/Tenant');
      const tenant = await Tenant.findById(decoded.tenantId || decoded.userId)
        .select('name slug status orgId ownerCredentials erpCategory erpModules');
      
      if (!tenant) {
        return res.status(401).json({ 
          success: false, 
          message: 'Tenant not found' 
        });
      }
      
      if (tenant.status !== 'active') {
        return res.status(403).json({ 
          success: false, 
          message: 'Tenant account is not active' 
        });
      }
      
      // Create a user-like object for tenant owner
      user = {
        _id: tenant._id,
        id: tenant._id.toString(),
        email: tenant.ownerCredentials.email,
        fullName: tenant.ownerCredentials.fullName || tenant.name,
        role: 'owner',
        status: 'active',
        orgId: tenant.orgId,
        tenantId: tenant._id.toString(),
        tenantSlug: tenant.slug,
        type: 'tenant_owner',
        isTenantOwner: true
      };
    } else if (decoded.userId && typeof decoded.userId === 'object' && decoded.userId.type === 'tws_admin') {
      // TWS Admin token structure (userId is an object)
      user = await TWSAdmin.findById(decoded.userId._id)
        .select('-password -refreshTokens -twoFASecret');
    } else if (decoded.type === 'tws_admin') {
      // Alternative TWS Admin token structure
      user = await TWSAdmin.findById(decoded._id)
        .select('-password -refreshTokens -twoFASecret');
    } else {
      // Regular user token structure
      const userId = typeof decoded.userId === 'object' ? decoded.userId._id : decoded.userId;
      user = await User.findById(userId)
        .select('-password -refreshTokens -twoFASecret')
        .populate('orgId', 'name slug status');
    }
    
    if (!user) {
      // Log suspicious activity
      await auditService.logSecurityEvent(
        auditService.auditActions.LOGIN_FAILED,
        null,
        null,
        {
          reason: 'User not found for valid token',
          details: { 
            userId: decoded.userId || decoded._id, 
            type: decoded.type || 'user' 
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'high'
        }
      );
      
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }

    // Check user status
    if (user.status !== 'active') {
      await auditService.logSecurityEvent(
        auditService.auditActions.LOGIN_FAILED,
        user._id,
        user.orgId,
        {
          reason: 'Inactive user attempted access',
          details: { status: user.status },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium'
        }
      );
      
      return res.status(403).json({ 
        success: false, 
        message: 'Account is not active' 
      });
    }

    // Determine user type for organization check
    const isTWSAdmin = (decoded.userId && typeof decoded.userId === 'object' && decoded.userId.type === 'tws_admin') || 
                       decoded.type === 'tws_admin';

    // Check organization status (only for regular users)
    if (!isTWSAdmin && user.orgId && user.orgId.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: 'Organization is not active' 
      });
    }

    // Add security context to request
    req.user = user;
    req.token = token;
    
    // ✅ Issue #1.4 Fix: Do NOT override role - use authContext for platform access
    // TWSAdmin users keep their actual stored role (platform_support, etc.)
    // Platform routes should check req.authContext.platformRole or req.authContext.hasPlatformAccess
    req.authContext = {
      userId: user._id,
      orgId: user.orgId?._id,
      role: user.role, // Use ACTUAL stored role - never override
      platformRole: user.role, // Same - actual role for RBAC checks
      type: isTWSAdmin ? 'tws_admin' : 'user',
      hasPlatformAccess: isTWSAdmin, // TWSAdmin users have platform access
      tokenIssuedAt: decoded.iat,
      tokenExpiresAt: decoded.exp
    };

    next();
  } catch (error) {
    // Log authentication failures
    await auditService.logSecurityEvent(
      auditService.auditActions.LOGIN_FAILED,
      null,
      null,
      {
        reason: error.message,
        details: { error: error.name },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'medium'
      }
    );

    if (error.message === 'Token expired') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
};

const requireRole = (roles) => {
  return async (req, res, next) => {
    console.log('🔍 requireRole check:', {
      userId: req.user?._id,
      userRole: req.user?.role,
      requiredRoles: roles,
      userEmail: req.user?.email
    });
    
    if (!req.user) {
      console.log('❌ requireRole - No user found');
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Map super_admin to supra_admin for backward compatibility
    // Also check if user has super_admin role when supra_admin is required
    const userRole = req.user.role;
    const roleMapping = {
      'super_admin': ['supra_admin', 'super_admin'],
      'supra_admin': ['supra_admin', 'super_admin']
    };
    
    // Check if user role matches required roles (with mapping)
    const userRolesToCheck = roleMapping[userRole] || [userRole];
    const hasAccess = roles.some(requiredRole => {
      // Direct match
      if (userRolesToCheck.includes(requiredRole)) return true;
      // Check if required role maps to user role
      const requiredRoleMapping = roleMapping[requiredRole] || [requiredRole];
      return requiredRoleMapping.includes(userRole);
    }) || roles.includes(userRole);

    if (!hasAccess) {
      console.log('❌ requireRole - Insufficient permissions. User role:', userRole, 'Required:', roles);
      
      // Log authorization failure for audit
      try {
        await auditService.logSecurityEvent(
          auditService.auditActions.LOGIN_FAILED, // Using LOGIN_FAILED as closest match, could add AUTHORIZATION_DENIED
          req.user._id,
          req.user.orgId,
          {
            resource: 'AUTHORIZATION',
            resourceId: req.params?.id || req.body?.id,
            userId: req.user._id,
            userEmail: req.user.email,
            userRole: userRole,
            status: 'failure',
            details: {
              reason: 'Insufficient role permissions',
              userRole: userRole,
              requiredRoles: roles,
              endpoint: req.path,
              method: req.method,
              ipAddress: req.ip || req.connection?.remoteAddress,
              userAgent: req.get('User-Agent')
            },
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            severity: 'medium'
          }
        );
      } catch (auditError) {
        console.error('Failed to log authorization failure:', auditError);
        // Don't fail the request if audit logging fails
      }
      
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions',
        debug: {
          userRole: userRole,
          requiredRoles: roles,
          hasAccess: false
        }
      });
    }

    console.log('✅ requireRole - Access granted');
    next();
  };
};

const requirePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Define role permissions
    const rolePermissions = {
      super_admin: ['*'], // All permissions
      org_manager: ['*'], // All permissions
      owner: ['*'], // All permissions
      admin: ['users:read', 'users:write', 'employees:read', 'employees:write', 'payroll:read', 'payroll:write', 'finance:read', 'finance:write', 'tasks:read', 'tasks:write', 'attendance:read', 'attendance:write'],
      pmo: ['users:read', 'employees:read', 'tasks:read', 'tasks:write', 'attendance:read'],
      project_manager: ['users:read', 'employees:read', 'tasks:read', 'tasks:write', 'attendance:read'],
      department_lead: ['users:read', 'employees:read', 'tasks:read', 'tasks:write', 'attendance:read'],
      hr: ['users:read', 'employees:read', 'employees:write', 'attendance:read', 'attendance:write', 'tasks:read', 'tasks:write'],
      finance: ['payroll:read', 'payroll:write', 'finance:read', 'finance:write', 'employees:read'],
      manager: ['employees:read', 'tasks:read', 'tasks:write', 'attendance:read'],
      employee: ['tasks:read', 'tasks:write', 'attendance:read', 'attendance:write'],
      contributor: ['tasks:read', 'tasks:write', 'attendance:read', 'attendance:write'],
      contractor: ['tasks:read', 'tasks:write'],
      auditor: ['users:read', 'employees:read', 'payroll:read', 'finance:read', 'attendance:read', 'tasks:read'],
      client: ['tasks:read'], // Limited read access for clients
      reseller: ['tasks:read'] // Limited read access for resellers
    };

    const userPermissions = rolePermissions[req.user.role] || [];
    
    if (!userPermissions.includes('*') && !userPermissions.includes(permission)) {
      // Log authorization failure for audit
      try {
        await auditService.logSecurityEvent(
          auditService.auditActions.LOGIN_FAILED, // Using LOGIN_FAILED as closest match
          req.user._id,
          req.user.orgId,
          {
            resource: 'AUTHORIZATION',
            resourceId: req.params?.id || req.body?.id,
            userId: req.user._id,
            userEmail: req.user.email,
            userRole: req.user.role,
            status: 'failure',
            details: {
              reason: 'Insufficient permission',
              userRole: req.user.role,
              requiredPermission: permission,
              userPermissions: userPermissions,
              endpoint: req.path,
              method: req.method,
              ipAddress: req.ip || req.connection?.remoteAddress,
              userAgent: req.get('User-Agent')
            },
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            severity: 'medium'
          }
        );
      } catch (auditError) {
        console.error('Failed to log authorization failure:', auditError);
        // Don't fail the request if audit logging fails
      }
      
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

const generateTokens = (userId, additionalPayload = {}) => {
  return jwtService.generateTokens(userId, additionalPayload);
};

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  generateTokens,
  setAuthCookies,
  clearAuthCookies
};
