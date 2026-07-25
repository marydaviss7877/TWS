/**
 * Ownership Middleware
 * Automatically injects ownership fields (createdBy, orgId) into request body
 * Addresses Issue #4.4: Data Saved Without Ownership
 * 
 * This middleware ensures all records have proper ownership tracking:
 * - createdBy: User ID who created the record
 * - orgId: Organization ID for tenant-level data isolation
 * - updatedBy: User ID who last updated the record (for updates)
 */

const { ensureOrgId } = require('../../utils/orgIdHelper');

/**
 * Middleware to auto-inject ownership fields for CREATE operations
 * Adds createdBy and orgId to req.body before route handler
 */
const injectOwnership = async (req, res, next) => {
  try {
    // Only inject for authenticated requests
    if (!req.user || !req.user._id) {
      return next(); // Let route handler handle unauthenticated requests
    }

    // Get orgId using standardized utility
    let orgId;
    try {
      orgId = await ensureOrgId(req);
    } catch (error) {
      console.warn('⚠️ Could not get orgId for ownership injection:', error.message);
      // Continue without orgId - route handler should validate
    }

    // Inject ownership fields into request body.
    // SECURITY: always overwrite with server-verified values — never trust a client-supplied
    // orgId/tenantId/createdBy, or a caller could plant records in another tenant's org.
    if (req.body && typeof req.body === 'object') {
      req.body.createdBy = req.user._id;

      if (orgId) {
        req.body.orgId = orgId;
      } else {
        delete req.body.orgId;
      }

      if (req.tenantId) {
        req.body.tenantId = req.tenantId;
      } else {
        delete req.body.tenantId;
      }
    }

    next();
  } catch (error) {
    console.error('❌ Error in injectOwnership middleware:', error);
    // Don't block request - let route handler decide
    next();
  }
};

/**
 * Middleware to auto-inject updatedBy for UPDATE operations
 * Adds updatedBy to req.body before route handler
 */
const injectUpdateOwnership = async (req, res, next) => {
  try {
    // Only inject for authenticated requests
    if (!req.user || !req.user._id) {
      return next();
    }

    // Inject updatedBy into request body
    if (req.body && typeof req.body === 'object') {
      req.body.updatedBy = req.user._id;
      req.body.updatedAt = new Date();
    }

    next();
  } catch (error) {
    console.error('❌ Error in injectUpdateOwnership middleware:', error);
    next();
  }
};

/**
 * Middleware to validate ownership before allowing operations
 * Ensures user has access to the organization they're trying to modify
 */
const validateOwnership = async (req, res, next) => {
  try {
    // Skip validation for super admins
    if (req.user?.role === 'super_admin' || req.user?.role === 'supra_admin') {
      return next();
    }

    // Get orgId from request
    const orgId = await ensureOrgId(req);
    
    if (!orgId) {
      return res.status(403).json({
        success: false,
        message: 'Organization context required',
        code: 'MISSING_ORG_CONTEXT'
      });
    }

    // Validate user belongs to the organization
    if (req.user.orgId && req.user.orgId.toString() !== orgId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Organization mismatch',
        code: 'ORG_MISMATCH'
      });
    }

    next();
  } catch (error) {
    console.error('❌ Error in validateOwnership middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Ownership validation failed',
      code: 'OWNERSHIP_VALIDATION_ERROR'
    });
  }
};

module.exports = {
  injectOwnership,
  injectUpdateOwnership,
  validateOwnership
};
