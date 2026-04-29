const Tenant = require('../../models/tenant/Tenant');
const Organization = require('../../models/org/Organization');

/**
 * Tenant Validation Middleware for Education Routes
 * Validates tenant access and sets tenant context
 */
const validateTenantAccess = async (req, res, next) => {
  try {
    const { tenantSlug } = req.params;
    const userTenantId = req.user?.tenantId;
    const userOrgId = req.user?.orgId;
    
    if (!tenantSlug) {
      return res.status(400).json({
        success: false,
        message: 'Tenant slug is required in URL'
      });
    }
    
    // Get tenant from slug
    const tenant = await Tenant.findOne({ slug: tenantSlug });
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }
    
    // Check tenant status
    if (tenant.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Tenant is ${tenant.status}. Please contact support.`
      });
    }
    
    // Verify user belongs to tenant (if user is authenticated)
    if (req.user) {
      const User = require('../../models/users-auth/User');
      const WorkspaceMember = require('../../models/WorkspaceMember');
      
      // Get tenant orgId for comparison
      const tenantOrgId = tenant.organizationId || tenant.orgId;
      const userTenantIdStr = userTenantId?.toString();
      const tenantIdStr = tenant._id.toString();
      
      // Check 1: Super admin / platform admin bypass (with security controls)
      const isSuperAdmin = req.user.role === 'super_admin' || 
                         req.user.role === 'platform_admin' ||
                         req.user.role === 'platform_super_admin';
      
      if (isSuperAdmin) {
        // SECURITY FIX: Platform admin access requires reason, audit, and approval
        const platformAdminAccessService = require('../../services/tenant/platform-admin-access.service');
        
        // Get access reason from request (body, header, or query)
        const accessReason = req.body.accessReason || 
                            req.headers['x-access-reason'] || 
                            req.query.accessReason;
        
        // Validate and process platform admin access
        const accessResult = await platformAdminAccessService.validateAndProcessAccess({
          platformAdmin: req.user,
          tenant: tenant,
          reason: accessReason,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          endpoint: req.path,
          method: req.method,
          req: req
        });
        
        if (!accessResult.allowed) {
          return res.status(accessResult.code === 'ACCESS_REASON_REQUIRED' ? 400 : 403).json({
            success: false,
            message: accessResult.error,
            code: accessResult.code,
            ...(accessResult.allowedReasons && { allowedReasons: accessResult.allowedReasons }),
            ...(accessResult.requiresApproval && { requiresApproval: true })
          });
        }
        
        // Log successful access (already logged in validateAndProcessAccess, but log here too for visibility)
        console.log('✅ Platform admin access granted:', { 
          userId: req.user._id, 
          tenantSlug,
          reason: accessReason,
          expiresAt: accessResult.expiresAt
        });
      } else {
        // Check 2: Direct tenantId match
        const directTenantMatch = userTenantIdStr === tenantIdStr;
        
        // Check 3: Tenant slug match (for backward compatibility)
        const tenantSlugMatch = userTenantId === tenantSlug || userTenantId === tenant.slug;
        
        // Check 4: Organization match (most reliable for org-bound users)
        const orgMatch = userOrgId && tenantOrgId && userOrgId.toString() === tenantOrgId.toString();
        
        // Check 5: Workspace membership
        let isWorkspaceMember = false;
        try {
          const membership = await WorkspaceMember.findOne({
            workspaceId: tenant._id,
            userId: req.user._id || req.user.id,
            status: 'active',
            deletedAt: null
          }).lean();
          isWorkspaceMember = !!membership;
        } catch (workspaceError) {
          console.warn('Workspace membership check failed:', workspaceError.message);
        }
        
        // Check 6: Load full user from DB to verify orgId (if not already set correctly)
        let userFromDb = null;
        if (!orgMatch && !directTenantMatch && !isWorkspaceMember) {
          try {
            const userId = req.user._id || req.user.id;
            userFromDb = await User.findById(userId).select('orgId tenantId role').lean();
            if (userFromDb) {
              const dbOrgMatch = userFromDb.orgId && tenantOrgId && 
                                userFromDb.orgId.toString() === tenantOrgId.toString();
              const dbTenantMatch = userFromDb.tenantId && 
                                   userFromDb.tenantId.toString() === tenantIdStr;
              
              if (dbOrgMatch || dbTenantMatch) {
                // Update req.user with correct orgId
                req.user.orgId = userFromDb.orgId;
                req.user.tenantId = userFromDb.tenantId;
                console.log('✅ User orgId/tenantId corrected from database');
              }
            }
          } catch (userError) {
            console.warn('User lookup failed:', userError.message);
          }
        }
        
        // Final access check
        const hasAccess = directTenantMatch || 
                         tenantSlugMatch || 
                         orgMatch || 
                         isWorkspaceMember ||
                         (userFromDb && (
                           (userFromDb.orgId && tenantOrgId && userFromDb.orgId.toString() === tenantOrgId.toString()) ||
                           (userFromDb.tenantId && userFromDb.tenantId.toString() === tenantIdStr)
                         ));
        
        if (!hasAccess) {
          console.error('❌ Tenant access denied:', {
            userId: req.user._id || req.user.id,
            userEmail: req.user.email,
            userRole: req.user.role,
            userTenantId: userTenantIdStr,
            userOrgId: userOrgId?.toString(),
            tenantId: tenantIdStr,
            tenantSlug: tenantSlug,
            tenantOrgId: tenantOrgId?.toString(),
            directTenantMatch,
            tenantSlugMatch,
            orgMatch,
            isWorkspaceMember
          });
          
          return res.status(403).json({
            success: false,
            message: 'Access denied: User does not belong to this tenant',
            debug: process.env.NODE_ENV === 'development' ? {
              userTenantId: userTenantIdStr,
              tenantId: tenantIdStr,
              userOrgId: userOrgId?.toString(),
              tenantOrgId: tenantOrgId?.toString()
            } : undefined
          });
        }
        
        console.log('✅ Tenant access granted:', {
          userId: req.user._id || req.user.id,
          tenantSlug,
          method: directTenantMatch ? 'tenantId' : 
                  orgMatch ? 'orgId' : 
                  isWorkspaceMember ? 'workspace' : 'other'
        });
      }
    }
    
    // Get organization
    let org = null;
    const orgId = tenant.organizationId || tenant.orgId;
    
    if (orgId) {
      org = await Organization.findById(orgId);
    }
    
    // Fallback: find organization by matching slug
    if (!org && tenantSlug) {
      org = await Organization.findOne({ slug: tenantSlug });
    }
    
    if (!org) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found for this tenant'
      });
    }
    
    // Set tenant context
    req.tenantContext = {
      tenantId: tenant._id, // Use ObjectId for consistency
      tenantSlug: tenant.slug,
      tenantIdString: tenant.slug, // Keep string version for backward compatibility
      orgId: org._id,
      orgSlug: org.slug || tenantSlug,
      tenant: tenant,
      organization: org
    };
    
    next();
  } catch (error) {
    console.error('Error validating tenant access:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating tenant access',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = { validateTenantAccess };
