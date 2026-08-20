/**
 * SUPRA ADMIN PERMISSION SETS
 * Simple RBAC for Platform-Level Operations
 * NO ABAC, NO Tenant Scoping - Just Role → Permissions
 */

const PLATFORM_PERMISSIONS = {
  
  // ==========================================
  // 1. TENANT MANAGEMENT
  // ==========================================
  TENANTS: {
    CREATE: 'tenants:create',           // Create new tenant
    READ: 'tenants:read',               // View tenant details
    UPDATE: 'tenants:update',           // Update tenant info
    DELETE: 'tenants:delete',           // Delete tenant
    SUSPEND: 'tenants:suspend',         // Suspend tenant
    ACTIVATE: 'tenants:activate',       // Activate tenant
    CONFIGURE: 'tenants:configure',     // Configure tenant settings
    EXPORT: 'tenants:export',           // Export tenant data
  },

  // ==========================================
  // 2. BILLING & SUBSCRIPTIONS
  // ==========================================
  BILLING: {
    READ: 'billing:read',               // View billing info
    UPDATE: 'billing:update',           // Update billing details
    PROCESS: 'billing:process',         // Process payments
    REFUND: 'billing:refund',           // Issue refunds
    INVOICES: 'billing:invoices',       // Manage invoices
    REPORTS: 'billing:reports',         // Billing reports
  },

  SUBSCRIPTIONS: {
    READ: 'subscriptions:read',         // View subscriptions
    CREATE: 'subscriptions:create',     // Create subscription
    UPDATE: 'subscriptions:update',     // Update subscription
    CANCEL: 'subscriptions:cancel',     // Cancel subscription
    UPGRADE: 'subscriptions:upgrade',   // Upgrade plan
    DOWNGRADE: 'subscriptions:downgrade', // Downgrade plan
  },

  // ==========================================
  // 3. PLATFORM USERS (Supra Admins)
  // ==========================================
  PLATFORM_USERS: {
    CREATE: 'platform_users:create',    // Create platform admin
    READ: 'platform_users:read',        // View platform admins
    UPDATE: 'platform_users:update',    // Update platform admin
    DELETE: 'platform_users:delete',    // Delete platform admin
    ASSIGN_ROLE: 'platform_users:assign_role', // Assign platform roles
  },

  // ==========================================
  // 4. ANALYTICS & MONITORING
  // ==========================================
  ANALYTICS: {
    READ: 'analytics:read',             // View analytics
    EXPORT: 'analytics:export',         // Export analytics data
    TENANT_USAGE: 'analytics:tenant_usage', // Tenant usage stats
    REVENUE: 'analytics:revenue',       // Revenue analytics
    SYSTEM_HEALTH: 'analytics:system_health', // System health metrics
  },

  // ==========================================
  // 5. SYSTEM CONFIGURATION
  // ==========================================
  SYSTEM: {
    READ: 'system:read',                // View system settings
    UPDATE: 'system:update',            // Update system settings
    MAINTENANCE: 'system:maintenance',  // Maintenance mode
    BACKUP: 'system:backup',            // Backup system
    RESTORE: 'system:restore',          // Restore from backup
    LOGS: 'system:logs',                // View system logs
  },

  // ==========================================
  // 6. SUPPORT & TICKETS
  // ==========================================
  SUPPORT: {
    READ: 'support:read',               // View support tickets
    CREATE: 'support:create',           // Create ticket
    UPDATE: 'support:update',           // Update ticket
    CLOSE: 'support:close',             // Close ticket
    ASSIGN: 'support:assign',           // Assign ticket to agent
  },

  // ==========================================
  // 7. NOTIFICATIONS
  // ==========================================
  NOTIFICATIONS: {
    READ: 'notifications:read',         // View notifications
    CREATE: 'notifications:create',     // Send platform-wide notifications
    DELETE: 'notifications:delete',     // Delete notifications
  },

  // ==========================================
  // 8. AUDIT LOGS
  // ==========================================
  AUDIT: {
    READ: 'audit:read',                 // View audit logs
    EXPORT: 'audit:export',             // Export audit logs
  },

  // ==========================================
  // 9. TEMPLATES (For Tenant Creation)
  // ==========================================
  TEMPLATES: {
    READ: 'templates:read',             // View ERP templates
    CREATE: 'templates:create',         // Create template
    UPDATE: 'templates:update',         // Update template
    DELETE: 'templates:delete',         // Delete template
  }
};

// ==========================================
// ROLE DEFINITIONS
// ==========================================

const PLATFORM_ROLES = {
  
  // ------------------------------------------
  // 1. PLATFORM SUPER ADMIN (God Mode)
  // ------------------------------------------
  platform_super_admin: ['*'], // All permissions
  
  // ------------------------------------------
  // 2. PLATFORM ADMIN (Full Access)
  // ------------------------------------------
  platform_admin: [
    // Tenants
    'tenants:create',
    'tenants:read',
    'tenants:update',
    'tenants:delete',
    'tenants:suspend',
    'tenants:activate',
    'tenants:configure',
    'tenants:export',
    
    // Billing
    'billing:read',
    'billing:update',
    'billing:process',
    'billing:refund',
    'billing:invoices',
    'billing:reports',
    
    // Subscriptions
    'subscriptions:read',
    'subscriptions:create',
    'subscriptions:update',
    'subscriptions:cancel',
    'subscriptions:upgrade',
    'subscriptions:downgrade',
    
    // Platform Users
    'platform_users:create',
    'platform_users:read',
    'platform_users:update',
    'platform_users:delete',
    'platform_users:assign_role',
    
    // Analytics
    'analytics:read',
    'analytics:export',
    'analytics:tenant_usage',
    'analytics:revenue',
    'analytics:system_health',
    
    // System
    'system:read',
    'system:update',
    'system:maintenance',
    'system:backup',
    'system:restore',
    'system:logs',
    
    // Support
    'support:read',
    'support:create',
    'support:update',
    'support:close',
    'support:assign',
    
    // Notifications
    'notifications:read',
    'notifications:create',
    'notifications:delete',
    
    // Audit
    'audit:read',
    'audit:export',
    
    // Templates
    'templates:read',
    'templates:create',
    'templates:update',
    'templates:delete',
  ],
  
  // ------------------------------------------
  // 3. PLATFORM SUPPORT (Customer Support)
  // ------------------------------------------
  platform_support: [
    // Tenants (Read Only)
    'tenants:read',
    
    // Support (Full Access)
    'support:read',
    'support:create',
    'support:update',
    'support:close',
    'support:assign',
    
    // Analytics (Limited)
    'analytics:read',
    'analytics:tenant_usage',
    
    // Notifications
    'notifications:read',
    'notifications:create',
    
    // Audit (Read Only)
    'audit:read',
  ],
  
  // ------------------------------------------
  // 4. PLATFORM BILLING (Finance Team)
  // ------------------------------------------
  platform_billing: [
    // Tenants (Read Only)
    'tenants:read',
    
    // Billing (Full Access)
    'billing:read',
    'billing:update',
    'billing:process',
    'billing:refund',
    'billing:invoices',
    'billing:reports',
    
    // Subscriptions (Full Access)
    'subscriptions:read',
    'subscriptions:create',
    'subscriptions:update',
    'subscriptions:cancel',
    'subscriptions:upgrade',
    'subscriptions:downgrade',
    
    // Analytics (Revenue Only)
    'analytics:revenue',
    'analytics:tenant_usage',
    
    // Audit (Read Only)
    'audit:read',
  ],
  
  // ------------------------------------------
  // 5. PLATFORM ANALYST (Data/Reports)
  // ------------------------------------------
  platform_analyst: [
    // Tenants (Read Only)
    'tenants:read',
    
    // Analytics (Full Access)
    'analytics:read',
    'analytics:export',
    'analytics:tenant_usage',
    'analytics:revenue',
    'analytics:system_health',
    
    // Audit (Read Only)
    'audit:read',
    'audit:export',
    
    // Billing (Read Only)
    'billing:read',
    'billing:reports',
  ],
  
  // ------------------------------------------
  // 6. PLATFORM DEVELOPER (Tech Team)
  // ------------------------------------------
  platform_developer: [
    // System (Full Access)
    'system:read',
    'system:update',
    'system:maintenance',
    'system:backup',
    'system:restore',
    'system:logs',
    
    // Templates (Full Access)
    'templates:read',
    'templates:create',
    'templates:update',
    'templates:delete',
    
    // Tenants (Read Only)
    'tenants:read',
    
    // Audit (Read Only)
    'audit:read',
  ],
};

// ==========================================
// PERMISSION CHECKER
// ==========================================

class PlatformRBAC {
  /**
   * Check if a platform role has a specific permission
   */
  static hasPermission(role, permission) {
    const permissions = PLATFORM_ROLES[role] || [];
    
    // Super admin has all permissions
    if (permissions.includes('*')) {
      return true;
    }
    
    // Check exact permission
    if (permissions.includes(permission)) {
      return true;
    }
    
    // Check wildcard permissions (e.g., 'tenants:*')
    const [resource, action] = permission.split(':');
    const wildcardPermission = `${resource}:*`;
    
    return permissions.includes(wildcardPermission);
  }
  
  /**
   * Get all permissions for a role
   */
  static getPermissions(role) {
    return PLATFORM_ROLES[role] || [];
  }
  
  /**
   * Check if a role exists
   */
  static isValidRole(role) {
    return Object.keys(PLATFORM_ROLES).includes(role);
  }
  
  /**
   * Get all available platform roles
   */
  static getAllRoles() {
    return Object.keys(PLATFORM_ROLES);
  }
  
  /**
   * Validate role assignment (prevent privilege escalation)
   */
  static canAssignRole(assignerRole, targetRole) {
    // Normalize role: 'super_admin' maps to 'platform_super_admin'
    // This handles cases where auth middleware sets role to 'super_admin' for TWSAdmin users
    let effectiveAssignerRole = assignerRole;
    if (assignerRole === 'super_admin') {
      effectiveAssignerRole = 'platform_super_admin';
    }
    
    // Super admin can assign any role
    if (effectiveAssignerRole === 'platform_super_admin') {
      return true;
    }
    
    // Platform admin can assign roles except super_admin
    if (effectiveAssignerRole === 'platform_admin') {
      return targetRole !== 'platform_super_admin';
    }
    
    // Others cannot assign roles
    return false;
  }
}

// ==========================================
// MIDDLEWARE
// ==========================================

/**
 * Middleware to check platform permissions
 * Usage: requirePlatformPermission('tenants:create')
 */
function requirePlatformPermission(permission) {
  return (req, res, next) => {
    const { role } = req.user || {};
    const authContextType = req.authContext?.type;

    if (!role) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No role assigned to user'
      });
    }

    // SECURITY: platform routes require an actual TWSAdmin session. A regular
    // tenant User can carry role: 'super_admin' too (that value is meaningful
    // within a tenant org), so the role string alone must never grant platform
    // access — only authenticateToken's tws_admin auth context can.
    if (authContextType !== 'tws_admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Platform admin access required',
        authContextType
      });
    }

    // ✅ Issue #1.4 Fix: TWSAdmin users use their ACTUAL stored role for permission checks
    // platform_support gets only support permissions, platform_admin gets admin permissions, etc.
    // No automatic full access - RBAC enforced based on actual role

    // Map super_admin role to platform_super_admin (TWSAdmin's forced display role)
    let effectiveRole = role;
    if (role === 'super_admin') {
      effectiveRole = 'platform_super_admin';
    }

    if (!PlatformRBAC.hasPermission(effectiveRole, permission)) {
      return res.status(403).json({ 
        success: false,
        error: 'Forbidden',
        message: `Permission denied: ${permission}`,
        requiredPermission: permission,
        userRole: role,
        effectiveRole: effectiveRole,
        authContextType: authContextType,
        availablePermissions: PlatformRBAC.getPermissions(effectiveRole)
      });
    }
    
    next();
  };
}

/**
 * Middleware to check if user is platform admin
 * Usage: requirePlatformRole('platform_admin') or requirePlatformRole(['platform_admin', 'platform_super_admin'])
 */
function requirePlatformRole(allowedRoles) {
  return (req, res, next) => {
    const { role } = req.user || {};
    const authContextType = req.authContext?.type;

    if (!role) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No role assigned to user'
      });
    }

    // SECURITY: same TWSAdmin-only restriction as requirePlatformPermission —
    // a tenant User's role string must never satisfy a platform role check.
    if (authContextType !== 'tws_admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Platform admin access required',
        authContextType
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(role)) {
      return res.status(403).json({ 
        success: false,
        error: 'Forbidden',
        message: 'Insufficient role',
        requiredRoles: roles,
        userRole: role
      });
    }
    
    next();
  };
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  PLATFORM_PERMISSIONS,
  PLATFORM_ROLES,
  PlatformRBAC,
  requirePlatformPermission,
  requirePlatformRole,
};
