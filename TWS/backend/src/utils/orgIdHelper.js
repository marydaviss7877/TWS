/**
 * Organization ID Helper Utility
 * 
 * STANDARDIZED APPROACH FOR ORG ID RESOLUTION
 * 
 * IMPORTANT CONCEPTS:
 * - Tenant: Platform-level entity (multi-tenant SaaS platform)
 * - Organization: Tenant-level workspace (within a tenant, there can be organizations)
 * - orgId: Organization ObjectId - used for data isolation within tenant
 * - tenantId: Tenant ObjectId - used for platform-level isolation
 * 
 * RULE: For tenant-level data isolation, ALWAYS use orgId, not tenantId
 * 
 * This utility provides a standardized way to extract orgId from request context
 * with proper fallback chain and error handling.
 */

const Organization = require('../models/org/Organization');
const Tenant = require('../models/tenant/Tenant');
const User = require('../models/users-auth/User');

/**
 * Get Organization ID from request context
 * 
 * Fallback chain (in order of preference):
 * 1. req.orgId (already set by middleware)
 * 2. req.tenantContext?.orgId (from tenant context middleware)
 * 3. req.tenant?.organizationId (from tenant model)
 * 4. req.tenant?.orgId (legacy tenant field)
 * 5. Organization lookup by tenant slug (organization.slug === tenant.slug)
 * 6. req.user?.orgId (from authenticated user)
 * 7. Admin user lookup by tenant owner credentials
 * 
 * @param {Object} req - Express request object
 * @param {Object} options - Options
 * @param {Boolean} options.required - If true, throws error if orgId not found
 * @param {Boolean} options.allowFallback - If false, only uses req.orgId (strict mode)
 * @returns {Promise<String|ObjectId|null>} Organization ID or null
 */
async function getOrgId(req, options = {}) {
  const { required = false, allowFallback = true } = options;
  
  let orgId = null;
  
  // Priority 1: Direct orgId from request (set by middleware)
  if (req.orgId) {
    orgId = req.orgId.toString();
    return orgId;
  }
  
  if (!allowFallback) {
    if (required) {
      throw new Error('orgId not found in request context (strict mode)');
    }
    return null;
  }
  
  // Priority 2: From tenant context
  if (req.tenantContext?.orgId) {
    orgId = req.tenantContext.orgId.toString();
    return orgId;
  }
  
  // Priority 3: From tenant model (organizationId field)
  if (req.tenant?.organizationId) {
    orgId = req.tenant.organizationId.toString();
    return orgId;
  }
  
  // Priority 4: From tenant model (legacy orgId field)
  if (req.tenant?.orgId) {
    orgId = req.tenant.orgId.toString();
    return orgId;
  }
  
  // Priority 5: Organization lookup by tenant slug
  // Common pattern: organization.slug === tenant.slug
  if (req.tenant?.slug) {
    try {
      const organization = await Organization.findOne({ 
        slug: req.tenant.slug 
      }).lean();
      
      if (organization) {
        orgId = organization._id.toString();
        return orgId;
      }
    } catch (error) {
      console.error('Error looking up organization by slug:', error);
    }
  }

  // Priority 5b: Resolve tenant from URL param (e.g. /api/tenant/:tenantSlug/departments)
  const tenantSlug = req.params?.tenantSlug;
  if (tenantSlug && typeof tenantSlug === 'string' && /^[a-zA-Z0-9_-]+$/.test(tenantSlug)) {
    try {
      const Tenant = require('../models/tenant/Tenant');
      const tenant = await Tenant.findOne({ slug: tenantSlug })
        .select('organizationId orgId slug')
        .lean();
      if (tenant) {
        const tid = tenant.organizationId || tenant.orgId;
        if (tid) {
          orgId = tid.toString();
          return orgId;
        }
        const organization = await Organization.findOne({ slug: tenant.slug }).select('_id').lean();
        if (organization) {
          orgId = organization._id.toString();
          return orgId;
        }
      }
    } catch (error) {
      console.error('Error resolving orgId from tenantSlug:', error);
    }
  }
  
  // Priority 6: From authenticated user (support both ObjectId and populated ref)
  if (req.user?.orgId) {
    const raw = req.user.orgId;
    if (raw && typeof raw === 'object' && raw._id) {
      orgId = raw._id.toString();
    } else if (raw) {
      orgId = raw.toString();
    }
    if (orgId && /^[0-9a-f]{24}$/i.test(orgId)) return orgId;
    orgId = null;
  }
  
  // Priority 7: Admin user lookup by tenant owner credentials
  if (req.tenant?.ownerCredentials?.email) {
    try {
      const adminUser = await User.findOne({ 
        email: req.tenant.ownerCredentials.email,
        role: { $in: ['owner', 'super_admin', 'org_manager'] }
      }).select('orgId').lean();
      
      if (adminUser?.orgId) {
        orgId = adminUser.orgId.toString();
        return orgId;
      }
    } catch (error) {
      console.error('Error looking up admin user:', error);
    }
  }
  
  // If required and not found, throw error
  if (required && !orgId) {
    throw new Error('Organization ID not found in request context');
  }
  
  return orgId;
}

/**
 * Get Organization ID synchronously (from request only, no DB lookup)
 * Use this when you're certain orgId is already set by middleware
 * 
 * @param {Object} req - Express request object
 * @returns {String|ObjectId|null} Organization ID or null
 */
function getOrgIdSync(req) {
  return req.orgId?.toString() || 
         req.tenantContext?.orgId?.toString() || 
         req.tenant?.organizationId?.toString() || 
         req.tenant?.orgId?.toString() || 
         req.user?.orgId?.toString() || 
         null;
}

/**
 * Ensure orgId is set on request object
 * This should be called by middleware to standardize orgId availability
 * 
 * @param {Object} req - Express request object
 * @returns {Promise<String|ObjectId>} Organization ID
 */
async function ensureOrgId(req) {
  if (req.orgId) {
    return req.orgId.toString();
  }
  
  const orgId = await getOrgId(req, { required: true });
  
  // Set on request for future use
  req.orgId = orgId;
  
  return orgId;
}

/**
 * Build tenant filter for queries
 * Returns appropriate filter based on database isolation strategy
 * 
 * @param {Object} req - Express request object
 * @param {Object} options - Options
 * @param {Boolean} options.useTenantId - If true, also include tenantId filter
 * @returns {Promise<Object>} Query filter object
 */
async function getTenantFilter(req, options = {}) {
  const { useTenantId = false } = options;
  
  const orgId = await getOrgId(req, { required: true });
  const filter = { orgId };
  
  // Include tenantId if requested (for cross-tenant queries)
  if (useTenantId && req.tenantId) {
    filter.tenantId = req.tenantId;
  }
  
  return filter;
}

/**
 * Validate orgId matches between user and tenant
 * Throws error if mismatch (security check)
 * 
 * @param {Object} req - Express request object
 * @param {Boolean} allowSuperAdmin - If true, super admins bypass check
 * @returns {Promise<Boolean>} True if valid
 */
async function validateOrgIdMatch(req, allowSuperAdmin = true) {
  const userOrgId = req.user?.orgId?.toString();
  const tenantOrgId = await getOrgId(req);
  
  // Super admins can bypass
  if (allowSuperAdmin && req.user?.role === 'super_admin') {
    return true;
  }
  
  if (!userOrgId || !tenantOrgId) {
    throw new Error('Missing orgId for validation');
  }
  
  if (userOrgId !== tenantOrgId) {
    throw new Error(`Organization mismatch: user orgId (${userOrgId}) !== tenant orgId (${tenantOrgId})`);
  }
  
  return true;
}

module.exports = {
  getOrgId,
  getOrgIdSync,
  ensureOrgId,
  getTenantFilter,
  validateOrgIdMatch
};
