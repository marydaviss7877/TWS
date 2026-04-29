const express = require('express');
const router = express.Router();
const Tenant = require('../../../models/tenant/Tenant');
const TenantProvisioningService = require('../../../services/tenantProvisioningService');
const TenantMiddleware = require('../../../middleware/tenant/tenantMiddleware');
const { TenantController } = require('../../../routes/tenantRouter');

/**
 * Tenant Management Controller
 * Handles tenant creation, provisioning, and management
 */
class TenantManagementController extends TenantController {
  constructor() {
    super();
    this.model = Tenant;
  }

  /**
   * Create a new tenant with complete ERP instance
   */
  async createTenant(req, res) {
    await this.handleAsync(async () => {
      this.requirePermission('manage');
      
      const tenantData = {
        tenantId: this.generateTenantId(req.body.name),
        companyName: req.body.name,
        slug: req.body.slug || this.generateSlug(req.body.name),
        adminEmail: req.body.adminEmail,
        adminName: req.body.adminName,
        domain: req.body.domain,
        industry: req.body.industry,
        companySize: req.body.companySize,
        timezone: req.body.timezone || 'UTC',
        currency: req.body.currency || 'USD',
        language: req.body.language || 'en',
        address: req.body.address,
        phone: req.body.phone,
        website: req.body.website,
        planId: req.body.planId || 'trial'
      };

      // Provision the tenant with complete ERP instance
      const result = await TenantProvisioningService.provisionTenant(tenantData);
      
      return {
        tenant: result.tenant,
        adminUser: result.adminUser,
        organization: result.organization,
        message: 'Tenant created successfully with complete ERP instance'
      };
    }, req, res);
  }

  /**
   * Get tenant details
   */
  async getTenant(req, res) {
    await this.handleAsync(async () => {
      this.requirePermission('read');
      
      const tenant = await Tenant.findOne({ tenantId: req.params.tenantId });
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      
      return tenant;
    }, req, res);
  }

  /**
   * Update tenant information
   */
  async updateTenant(req, res) {
    await this.handleAsync(async () => {
      this.requirePermission('write');
      
      const tenant = await Tenant.findOne({ tenantId: req.params.tenantId });
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      
      const updatedTenant = await Tenant.findByIdAndUpdate(
        tenant._id,
        req.body,
        { new: true, runValidators: true }
      );
      
      return updatedTenant;
    }, req, res);
  }

  /**
   * Get tenant onboarding status
   */
  async getOnboardingStatus(req, res) {
    await this.handleAsync(async () => {
      this.requirePermission('read');
      
      const status = await TenantProvisioningService.getOnboardingStatus(req.params.tenantId);
      return status;
    }, req, res);
  }

  /**
   * Complete onboarding step
   */
  async completeOnboardingStep(req, res) {
    await this.handleAsync(async () => {
      this.requirePermission('write');
      
      const result = await TenantProvisioningService.completeOnboardingStep(
        req.params.tenantId,
        req.body.stepName
      );
      
      return result;
    }, req, res);
  }

  /**
   * Deactivate tenant
   */
  async deactivateTenant(req, res) {
    await this.handleAsync(async () => {
      this.requirePermission('manage');
      
      const result = await TenantProvisioningService.deactivateTenant(req.params.tenantId);
      return result;
    }, req, res);
  }

  /**
   * Reactivate tenant
   */
  async reactivateTenant(req, res) {
    await this.handleAsync(async () => {
      this.requirePermission('manage');
      
      const result = await TenantProvisioningService.reactivateTenant(req.params.tenantId);
      return result;
    }, req, res);
  }

  /**
   * Get tenant statistics
   */
  async getTenantStats(req, res) {
    await this.handleAsync(async () => {
      this.requirePermission('read');
      
      const tenant = await Tenant.findOne({ tenantId: req.params.tenantId });
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      
      // Get comprehensive tenant statistics
      const stats = {
        basic: {
          name: tenant.name,
          status: tenant.status,
          createdAt: tenant.createdAt,
          lastActivity: tenant.usage?.lastActivity
        },
        subscription: tenant.subscription,
        usage: tenant.usage,
        limits: tenant.limits,
        features: tenant.features,
        onboarding: {
          status: tenant.onboarding?.status,
          progress: TenantProvisioningService.calculateOnboardingProgress(tenant.onboarding?.steps || [])
        }
      };
      
      return stats;
    }, req, res);
  }

  /**
   * List all tenants (SupraAdmin only)
   */
  async listTenants(req, res) {
    await this.handleAsync(async () => {
      // Only SupraAdmin can list all tenants
      if (this.user.role !== 'supra_admin') {
        throw new Error('Access denied: SupraAdmin role required');
      }
      
      const { page = 1, limit = 10, status, search } = req.query;
      const skip = (page - 1) * limit;
      
      let query = {};
      if (status) query.status = status;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { 'contactInfo.email': { $regex: search, $options: 'i' } },
          { tenantId: { $regex: search, $options: 'i' } }
        ];
      }
      
      const tenants = await Tenant.find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
      
      const total = await Tenant.countDocuments(query);
      
      return {
        tenants,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    }, req, res);
  }

  /**
   * Generate unique tenant ID
   */
  generateTenantId(companyName) {
    const base = companyName.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const timestamp = Date.now().toString(36);
    return `${base}-${timestamp}`;
  }

  /**
   * Generate unique tenant slug
   */
  generateSlug(companyName) {
    return companyName.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

const controller = new TenantManagementController();

// SupraAdmin routes (no tenant middleware required)
// Tenant creation by Supra Admin removed: tenants must be created through signup pages only (see SRS).

router.get('/list', async (req, res) => {
  await controller.handleAsync(async () => {
    if (req.user?.role !== 'supra_admin') {
      throw new Error('Access denied: SupraAdmin role required');
    }
    
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } },
        { tenantId: { $regex: search, $options: 'i' } }
      ];
    }
    
    const tenants = await Tenant.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    const total = await Tenant.countDocuments(query);
    
    return {
      tenants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }, req, res);
});

// Tenant-specific routes (require tenant middleware)
router.get('/:tenantId', 
  TenantMiddleware.extractTenant,
  TenantMiddleware.validateTenant,
  async (req, res) => {
    await controller.handleAsync(async () => {
      const tenant = await Tenant.findOne({ tenantId: req.params.tenantId });
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      return tenant;
    }, req, res);
  }
);

router.put('/:tenantId',
  TenantMiddleware.extractTenant,
  TenantMiddleware.validateTenant,
  TenantMiddleware.setTenantContext, // Set up database connection
  async (req, res) => {
    await controller.handleAsync(async () => {
      const tenant = await Tenant.findOne({ tenantId: req.params.tenantId });
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      
      const updatedTenant = await Tenant.findByIdAndUpdate(
        tenant._id,
        req.body,
        { new: true, runValidators: true }
      );
      
      return updatedTenant;
    }, req, res);
  }
);

router.get('/:tenantId/onboarding',
  TenantMiddleware.extractTenant,
  TenantMiddleware.validateTenant,
  async (req, res) => {
    await controller.handleAsync(async () => {
      const status = await TenantProvisioningService.getOnboardingStatus(req.params.tenantId);
      return status;
    }, req, res);
  }
);

router.post('/:tenantId/onboarding/complete-step',
  TenantMiddleware.extractTenant,
  TenantMiddleware.validateTenant,
  async (req, res) => {
    await controller.handleAsync(async () => {
      const result = await TenantProvisioningService.completeOnboardingStep(
        req.params.tenantId,
        req.body.stepName
      );
      return result;
    }, req, res);
  }
);

router.get('/:tenantId/stats',
  TenantMiddleware.extractTenant,
  TenantMiddleware.validateTenant,
  async (req, res) => {
    await controller.handleAsync(async () => {
      const tenant = await Tenant.findOne({ tenantId: req.params.tenantId });
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      
      const stats = {
        basic: {
          name: tenant.name,
          status: tenant.status,
          createdAt: tenant.createdAt,
          lastActivity: tenant.usage?.lastActivity
        },
        subscription: tenant.subscription,
        usage: tenant.usage,
        limits: tenant.limits,
        features: tenant.features,
        onboarding: {
          status: tenant.onboarding?.status,
          progress: TenantProvisioningService.calculateOnboardingProgress(tenant.onboarding?.steps || [])
        }
      };
      
      return stats;
    }, req, res);
  }
);

// Admin-only routes
router.post('/:tenantId/deactivate',
  TenantMiddleware.extractTenant,
  TenantMiddleware.validateTenant,
  async (req, res) => {
    await controller.handleAsync(async () => {
      if (req.user?.role !== 'supra_admin') {
        throw new Error('Access denied: SupraAdmin role required');
      }
      
      const result = await TenantProvisioningService.deactivateTenant(req.params.tenantId);
      return result;
    }, req, res);
  }
);

router.post('/:tenantId/reactivate',
  TenantMiddleware.extractTenant,
  TenantMiddleware.validateTenant,
  async (req, res) => {
    await controller.handleAsync(async () => {
      if (req.user?.role !== 'supra_admin') {
        throw new Error('Access denied: SupraAdmin role required');
      }
      
      const result = await TenantProvisioningService.reactivateTenant(req.params.tenantId);
      return result;
    }, req, res);
  }
);

module.exports = router;
