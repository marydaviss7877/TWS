const { hasPermission } = require('../../config/permissions');
const AuditLog = require('../../models/core/AuditLog');

/**
 * Require permission middleware
 * Checks if user has permission to perform action on resource
 * 
 * @param {string} resource - Resource name (e.g., 'students', 'grades')
 * @param {string} action - Action name (e.g., 'view', 'create', 'update')
 * @param {object} options - Additional options
 * @param {boolean} options.resourceLevel - Whether to check resource-level access
 * @param {string} options.resourceId - Parameter name for resource ID
 * @returns {Function} Express middleware
 */
const requirePermission = (resource, action, options = {}) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user roles (support multi-role)
      const userRoles = getUserRoles(user);
      
      if (userRoles.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'No valid roles assigned'
        });
      }

      // Check if any role has permission
      let hasAccess = false;
      for (const role of userRoles) {
        if (hasPermission(resource, action, role)) {
          hasAccess = true;
          break;
        }
      }

      if (!hasAccess) {
        // Log audit
        await logPermissionCheck(req, resource, action, false, 'Insufficient permissions');
        return res.status(403).json({
          success: false,
          message: `Permission denied: ${resource}.${action}`,
          required: { resource, action },
          userRoles
        });
      }

      // Log successful permission check (for audit)
      await logPermissionCheck(req, resource, action, true);

      // Resource-level permission check (e.g., teacher can only access assigned classes)
      if (options.resourceLevel) {
        // Check all user roles for resource access
        let hasResourceAccess = false;
        for (const role of userRoles) {
          const access = await checkResourceAccess(role, resource, req, options);
          if (access) {
            hasResourceAccess = true;
            break;
          }
        }
        
        if (!hasResourceAccess) {
          await logPermissionCheck(req, resource, action, false, 'Resource-level access denied');
          return res.status(403).json({
            success: false,
            message: 'Access denied to this resource'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions'
      });
    }
  };
};

/**
 * Check resource-level access
 * @param {string} role - User role
 * @param {string} resource - Resource name
 * @param {object} req - Express request object
 * @param {object} options - Options
 * @returns {boolean} - True if user has access
 */
const checkResourceAccess = async (role, resource, req, options) => {
  const resourceId = req.params[options.resourceId || 'id'] || req.body[options.resourceId || 'id'];
  
  if (!resourceId) {
    return true; // No specific resource, allow
  }

  try {
    // Principal and admin have access to all resources in their tenant
    if (['principal', 'admin'].includes(role)) {
      return true;
    }

    // Default: allow if no specific check
    return true;
  } catch (error) {
    console.error('Resource access check error:', error);
    return false;
  }
};

/**
 * Get all user roles (support multi-role)
 * @param {Object} user - User object
 * @returns {Array} - Array of role strings
 */
const getUserRoles = (user) => {
  const roles = [];
  
  // Primary role
  if (user.role) {
    roles.push(user.role);
  }
  
  // Additional roles from roles array (only active ones)
  if (user.roles && Array.isArray(user.roles)) {
    user.roles.forEach(roleAssignment => {
      if (roleAssignment.status === 'active' && roleAssignment.role) {
        if (!roles.includes(roleAssignment.role)) {
          roles.push(roleAssignment.role);
        }
      }
    });
  }
  
  return roles;
};

/**
 * Log permission check for audit
 */
const logPermissionCheck = async (req, resource, action, granted, reason = '') => {
  try {
    await AuditLog.create({
      action: granted ? 'PERMISSION_GRANTED' : 'PERMISSION_DENIED',
      performedBy: req.user?._id,
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      organization: req.tenantContext?.orgId || req.user?.orgId,
      tenantId: req.tenantContext?.tenantSlug || req.tenantContext?.tenantIdString,
      resource: `${resource}.${action}`,
      resourceId: req.params?.id || req.body?.id,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      details: {
        resource,
        action,
        granted,
        reason,
        userRoles: getUserRoles(req.user),
        path: req.path,
        method: req.method
      },
      severity: granted ? 'low' : 'medium',
      status: granted ? 'success' : 'failure'
    });
  } catch (error) {
    console.error('Failed to log permission check:', error);
    // Don't fail the request if audit logging fails
  }
};

module.exports = {
  requirePermission,
  checkResourceAccess,
  getUserRoles
};
