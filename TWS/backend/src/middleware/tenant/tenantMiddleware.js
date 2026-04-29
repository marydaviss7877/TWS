const Tenant = require('../../models/tenant/Tenant');
const jwt = require('jsonwebtoken');

/**
 * Tenant-aware middleware for API routes
 * This middleware ensures that all requests are properly scoped to a tenant
 */
class TenantMiddleware {
  
  /**
   * Extract tenant information from request
   * Supports multiple methods: subdomain, header, JWT token, or URL parameter
   */
  static extractTenant(req, res, next) {
    try {
      let tenantId = null;
      let tenant = null;

      // Method 1: Extract from subdomain (e.g., tenant1.tws.com)
      const host = req.get('host');
      if (host && host.includes('.')) {
        const subdomain = host.split('.')[0];
        if (subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'admin') {
          tenantId = subdomain;
        }
      }

      // Method 2: Extract from X-Tenant-ID header
      if (!tenantId && req.headers['x-tenant-id']) {
        tenantId = req.headers['x-tenant-id'];
      }

      // Method 3: Extract from JWT token
      if (!tenantId && req.headers.authorization) {
        const token = req.headers.authorization.replace('Bearer ', '');
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded.tenantId) {
            tenantId = decoded.tenantId;
          }
        } catch (jwtError) {
          // Token might be invalid, continue with other methods
        }
      }

      // Method 4: Extract from URL parameter
      if (!tenantId && req.params.tenantId) {
        tenantId = req.params.tenantId;
      }

      // Method 5: Extract from query parameter
      if (!tenantId && req.query.tenantId) {
        tenantId = req.query.tenantId;
      }

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required. Provide via subdomain, X-Tenant-ID header, JWT token, or URL parameter.'
        });
      }

      // Store tenant ID in request for use in controllers
      req.tenantId = tenantId;
      req.tenant = tenant; // Will be populated by validateTenant middleware

      next();
    } catch (error) {
      console.error('Error extracting tenant:', error);
      return res.status(500).json({
        success: false,
        message: 'Error processing tenant information'
      });
    }
  }

  /**
   * Validate tenant exists and is active
   */
  static async validateTenant(req, res, next) {
    try {
      if (!req.tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      const tenant = await Tenant.findOne({ 
        $or: [
          { tenantId: req.tenantId },
          { slug: req.tenantId },
          { 'contactInfo.email': req.tenantId }
        ]
      });

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }

      if (tenant.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: `Tenant is ${tenant.status}. Please contact support.`
        });
      }

      // Check subscription status
      if (tenant.subscription && tenant.subscription.status === 'suspended') {
        return res.status(403).json({
          success: false,
          message: 'Tenant subscription is suspended. Please contact billing.'
        });
      }

      // Store tenant in request
      req.tenant = tenant;
      req.tenantId = tenant.tenantId; // Normalize to tenantId

      next();
    } catch (error) {
      console.error('Error validating tenant:', error);
      return res.status(500).json({
        success: false,
        message: 'Error validating tenant'
      });
    }
  }

  /**
   * Ensure user belongs to the tenant
   */
  static async validateTenantUser(req, res, next) {
    try {
      if (!req.user || !req.tenant) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user belongs to this tenant
      if (req.user.tenantId !== req.tenant.tenantId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: User does not belong to this tenant'
        });
      }

      // Check if user is active
      if (req.user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'User account is inactive'
        });
      }

      next();
    } catch (error) {
      console.error('Error validating tenant user:', error);
      return res.status(500).json({
        success: false,
        message: 'Error validating user access'
      });
    }
  }

  /**
   * Check tenant feature access
   */
  static checkFeatureAccess(feature) {
    return async (req, res, next) => {
      try {
        if (!req.tenant) {
          return res.status(400).json({
            success: false,
            message: 'Tenant information required'
          });
        }

        // Check if feature is enabled for this tenant
        const hasAccess = req.tenant.features && req.tenant.features[feature];
        
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: `Feature '${feature}' is not available for your subscription plan`
          });
        }

        next();
      } catch (error) {
        console.error('Error checking feature access:', error);
        return res.status(500).json({
          success: false,
          message: 'Error checking feature access'
        });
      }
    };
  }

  /**
   * Check tenant limits (users, projects, storage, etc.)
   */
  static checkTenantLimits(limitType) {
    return async (req, res, next) => {
      try {
        if (!req.tenant) {
          return res.status(400).json({
            success: false,
            message: 'Tenant information required'
          });
        }

        const limits = req.tenant.limits || {};
        const usage = req.tenant.usage || {};

        // Check if limit is exceeded
        if (limits[limitType] && usage[limitType] >= limits[limitType]) {
          return res.status(403).json({
            success: false,
            message: `${limitType} limit exceeded. Please upgrade your plan.`,
            limit: limits[limitType],
            current: usage[limitType]
          });
        }

        next();
      } catch (error) {
        console.error('Error checking tenant limits:', error);
        return res.status(500).json({
          success: false,
          message: 'Error checking tenant limits'
        });
      }
    };
  }

  /**
   * Set tenant context for database queries
   * Also sets up tenant database connection if available
   */
  static async setTenantContext(req, res, next) {
    try {
      if (!req.tenant) {
        return res.status(400).json({
          success: false,
          message: 'Tenant context required'
        });
      }

      const tenantId = req.tenant.tenantId || req.tenant._id.toString();
      const tenantSlug = req.tenant.slug;

      // Add tenant context to request for use in models
      req.tenantContext = {
        tenantId: tenantId,
        tenantSlug: tenantSlug,
        orgId: req.tenant.orgId,
        database: req.tenant.database?.name,
        connectionString: req.tenant.database?.connectionString,
        hasSeparateDatabase: req.tenant.database?.status === 'active' && req.tenant.database?.connectionString
      };

      // If tenant has separate database, get the connection
      if (req.tenantContext.hasSeparateDatabase) {
        try {
          const tenantConnectionPool = require('../../services/tenant/tenant-connection-pool.service');
          const tenantConnection = await tenantConnectionPool.getTenantConnection(tenantId, tenantSlug);
          
          if (tenantConnection && tenantConnection.readyState === 1) {
            req.tenantConnection = tenantConnection;
            req.tenantContext.connectionReady = true;
          } else {
            req.tenantContext.connectionReady = false;
            // Fall back to shared database
            req.tenantContext.hasSeparateDatabase = false;
          }
        } catch (connError) {
          console.error(`Error getting tenant connection for ${tenantId}:`, connError.message);
          // Fall back to shared database
          req.tenantContext.hasSeparateDatabase = false;
          req.tenantContext.connectionReady = false;
        }
      }

      next();
    } catch (error) {
      console.error('Error setting tenant context:', error);
      return res.status(500).json({
        success: false,
        message: 'Error setting tenant context'
      });
    }
  }

  /**
   * Log tenant activity
   */
  static logTenantActivity(action) {
    return async (req, res, next) => {
      try {
        // Log the activity (implement with your audit logging system)
        if (req.tenant && req.user) {
          console.log(`Tenant Activity: ${req.tenant.tenantId} - User: ${req.user.email} - Action: ${action}`);
          
          // Here you would typically save to an audit log
          // await AuditLog.create({
          //   tenantId: req.tenant.tenantId,
          //   userId: req.user._id,
          //   action: action,
          //   details: req.body,
          //   ipAddress: req.ip,
          //   userAgent: req.get('User-Agent')
          // });
        }

        next();
      } catch (error) {
        console.error('Error logging tenant activity:', error);
        // Don't fail the request if logging fails
        next();
      }
    };
  }

  /**
   * Complete tenant middleware chain
   * Use this for most tenant-scoped routes
   * Includes database connection setup
   */
  static tenantRequired() {
    return [
      TenantMiddleware.extractTenant,
      TenantMiddleware.validateTenant,
      TenantMiddleware.setTenantContext // Sets up database connection
    ];
  }

  /**
   * Complete tenant middleware chain with user validation
   * Use this for authenticated tenant-scoped routes
   * Includes database connection setup
   */
  static tenantUserRequired() {
    return [
      TenantMiddleware.extractTenant,
      TenantMiddleware.validateTenant,
      TenantMiddleware.validateTenantUser,
      TenantMiddleware.setTenantContext // Sets up database connection
    ];
  }

  /**
   * Tenant middleware with feature access check
   */
  static tenantWithFeature(feature) {
    return [
      ...TenantMiddleware.tenantUserRequired(),
      TenantMiddleware.checkFeatureAccess(feature)
    ];
  }

  /**
   * Tenant middleware with limit check
   */
  static tenantWithLimit(limitType) {
    return [
      ...TenantMiddleware.tenantUserRequired(),
      TenantMiddleware.checkTenantLimits(limitType)
    ];
  }
}

module.exports = TenantMiddleware;
