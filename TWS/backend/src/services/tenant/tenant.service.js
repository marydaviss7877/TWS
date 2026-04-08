const Tenant = require('../../models/Tenant');
const User = require('../../models/User');
const Organization = require('../../models/Organization');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const databaseProvisioningService = require('../core/databaseProvisioning.service');
const tenantConnectionPool = require('./tenant-connection-pool.service');
const logger = require('../../utils/logger');

class TenantService {
  
  // Create a new tenant
  async createTenant(tenantData, createdBy) {
    try {
      // Generate unique slug
      const baseSlug = tenantData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      let slug = baseSlug;
      let counter = 1;
      
      while (await Tenant.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Generate unique tenantId
      const tenantId = tenantData.tenantId || `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Get industry type from tenantData
      const industryType = tenantData.erpCategory || tenantData.industry || 'business';
      
      // Automatically assign ERP modules based on industry category
      const industryModules = {
        education: ['students', 'teachers', 'classes', 'grades', 'courses', 'academic_year', 'exams', 'admissions'],
        software_house: ['development_methodology', 'tech_stack', 'project_types', 'time_tracking', 'code_quality', 'client_portal'],
        healthcare: ['patients', 'doctors', 'appointments', 'medical_records', 'prescriptions', 'departments', 'billing']
      };
      
      // Common modules available to all industries
      const commonModules = ['hr', 'finance', 'projects', 'operations', 'clients', 'reports', 'messaging', 'meetings', 'attendance', 'roles'];
      
      // Get industry-specific modules for the selected category
      const categoryModules = industryModules[industryType] || [];
      
      // Combine common modules with industry-specific modules
      // If erpModules are provided in tenantData, use those (but validate them)
      // Otherwise, auto-assign based on category
      let finalModules = tenantData.erpModules || [];
      
      if (finalModules.length === 0) {
        // Auto-assign modules: common modules + industry-specific modules
        finalModules = [...commonModules, ...categoryModules];
      } else {
        // Validate provided modules match the category
        const allowedModules = [...commonModules, ...categoryModules];
        finalModules = finalModules.filter(module => allowedModules.includes(module));
        
        // If validation removed all modules, use defaults
        if (finalModules.length === 0) {
          finalModules = [...commonModules.slice(0, 5), ...categoryModules.slice(0, 3)];
        }
      }
      
      // Remove duplicates
      finalModules = [...new Set(finalModules)];
      
      console.log(`✅ Auto-assigning ERP modules for ${industryType}: ${finalModules.join(', ')}`);

      // Provision tenant database BEFORE creating tenant record
      logger.info(`Provisioning database for tenant: ${tenantId} (${slug})`);
      let databaseInfo;
      try {
        databaseInfo = await databaseProvisioningService.provisionTenantDatabase(
          tenantId,
          slug,
          industryType
        );
        logger.info(`Database provisioned successfully for tenant ${tenantId}: ${databaseInfo.dbName}`);
      } catch (dbError) {
        logger.error(`Failed to provision database for tenant ${tenantId}:`, dbError);
        // If database provisioning fails, we can still create tenant with shared database
        // But log the error for investigation
        databaseInfo = {
          name: `tws_${slug}`,
          connectionString: `${process.env.MONGO_URI?.replace(/\/[^/]*$/, '')}/tws_${slug}`,
          status: 'failed',
          error: dbError.message
        };
      }

      // Set default values
      const tenant = new Tenant({
        ...tenantData,
        tenantId,
        slug,
        createdBy,
        status: 'active',
        erpCategory: industryType,
        erpModules: finalModules, // Auto-assigned based on category
        ownerCredentials: {
          ...tenantData.ownerCredentials,
          isActive: true // Ensure owner credentials are active
        },
        database: {
          name: databaseInfo.dbName,
          connectionString: databaseInfo.connectionString,
          status: databaseInfo.status === 'success' ? 'active' : 'pending',
          provisionedAt: new Date()
        },
        onboarding: {
          completed: false,
          steps: [
            { step: 'database_created', completed: databaseInfo.status === 'success', completedAt: databaseInfo.status === 'success' ? new Date() : null },
            { step: 'setup_complete', completed: false },
            { step: 'first_user_created', completed: false },
            { step: 'first_project_created', completed: false }
          ]
        }
      });
      
      await tenant.save();
      
      // If database was provisioned successfully, pre-warm the connection
      if (databaseInfo.status === 'success') {
        try {
          await tenantConnectionPool.getTenantConnection(tenantId, slug);
          logger.info(`Connection pre-warmed for tenant: ${tenantId}`);
        } catch (connError) {
          logger.warn(`Failed to pre-warm connection for tenant ${tenantId}:`, connError.message);
          // Non-critical error, continue
        }
      }
      
      // Create default organization for this tenant (non-blocking)
      try {
        await this.createDefaultOrganization(tenant._id, tenantData, tenantId);
      } catch (orgError) {
        logger.error('Failed to create default organization:', orgError);
        // Continue with tenant creation even if organization creation fails
      }
      
      return tenant;
    } catch (error) {
      logger.error('Error creating tenant:', error);
      throw new Error(`Failed to create tenant: ${error.message}`);
    }
  }
  
  // Create default organization for tenant
  async createDefaultOrganization(tenantDbId, tenantData, tenantId) {
    try {
      // Get tenant connection if separate database is used
      let OrganizationModel = Organization;
      try {
        const tenantConnection = await tenantConnectionPool.getTenantConnection(tenantId);
        if (tenantConnection && tenantConnection.readyState === 1) {
          // Use tenant-specific connection for Organization model
          const { getOrCreateModelOnConnection } = require('../../utils/modelSchemaHelper');
          OrganizationModel = getOrCreateModelOnConnection(tenantConnection, 'Organization', Organization);
        }
      } catch (connError) {
        // If connection fails, use default connection (shared database)
        logger.warn(`Using default connection for organization creation: ${connError.message}`);
      }

      // Generate unique slug for organization
      const baseSlug = tenantData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      let orgSlug = baseSlug;
      let counter = 1;
      
      // Check in tenant database if using separate DB, otherwise check in default DB
      const existingOrg = await OrganizationModel.findOne({ slug: orgSlug });
      while (existingOrg) {
        orgSlug = `${baseSlug}-${counter}`;
        const checkOrg = await OrganizationModel.findOne({ slug: orgSlug });
        if (!checkOrg) break;
        counter++;
      }
      
      const organizationData = {
        name: tenantData.name,
        slug: orgSlug,
        description: tenantData.description || '',
        industry: tenantData.businessInfo?.industry || '',
        size: tenantData.businessInfo?.companySize || '1-10',
        contactInfo: {
          companyName: tenantData.name,
          address: tenantData.contactInfo?.address || {},
          email: tenantData.contactInfo?.email || '',
          taxId: tenantData.businessInfo?.taxId || ''
        },
        settings: {
          timezone: tenantData.settings?.timezone || 'UTC',
          currency: tenantData.settings?.currency || 'USD',
          workingHours: tenantData.settings?.workingHours || {
            start: '09:00',
            end: '17:00',
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          }
        },
        status: 'active'
      };

      // Add tenantId if model supports it
      if (OrganizationModel.schema.paths.tenantId) {
        organizationData.tenantId = tenantId;
      }

      const organization = new OrganizationModel(organizationData);
      await organization.save();
      
      logger.info(`Default organization created for tenant: ${tenantId}`);
      return organization;
    } catch (error) {
      logger.error('Error creating default organization:', error);
      // Don't throw error, just log it - organization creation is not critical for tenant creation
      return null;
    }
  }
  
  // Update tenant
  async updateTenant(tenantId, updateData, updatedBy) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      // Slug is immutable after creation (FR2: would break bookmarks and integrations)
      const { slug, ...safeUpdateData } = updateData;
      if (slug !== undefined && String(slug).toLowerCase() !== String(tenant.slug).toLowerCase()) {
        throw new Error('Tenant slug cannot be changed after creation. It is immutable to preserve bookmarked URLs and integrations.');
      }
      // Update tenant data (slug never written from updateData)
      Object.assign(tenant, safeUpdateData);
      await tenant.save();
      
      // Log activity
      await this.logTenantActivity(tenantId, 'updated', `Tenant updated by ${updatedBy}`, updatedBy);
      
      return tenant;
    } catch (error) {
      throw new Error(`Failed to update tenant: ${error.message}`);
    }
  }
  
  // Update tenant status
  async updateTenantStatus(tenantId, status, updatedBy) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      
      const oldStatus = tenant.status;
      tenant.status = status;
      
      // Update tenant status
      
      await tenant.save();
      
      // Log activity
      await this.logTenantActivity(tenantId, 'status_changed', 
        `Status changed from ${oldStatus} to ${status}`, updatedBy);
      
      return tenant;
    } catch (error) {
      throw new Error(`Failed to update tenant status: ${error.message}`);
    }
  }
  
  // Delete multiple tenants (hard delete - permanently remove all)
  async deleteTenantsBulk(ids, deletedBy) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new Error('No tenant IDs provided');
    }
    const results = { deleted: [], failed: [] };
    for (const id of ids) {
      try {
        await this.deleteTenant(id, deletedBy, true);
        results.deleted.push(id);
      } catch (err) {
        results.failed.push({ id, error: err.message });
      }
    }
    return results;
  }

  // Delete tenant (hard delete - permanently remove)
  async deleteTenant(tenantId, deletedBy, hardDelete = false) {
    try {
      const tenantLifecycleService = require('./tenant-lifecycle.service');
      
      // Use the comprehensive lifecycle service
      const result = await tenantLifecycleService.deleteTenant(tenantId, hardDelete, deletedBy);
      
      return { 
        message: hardDelete ? 'Tenant permanently deleted successfully' : 'Tenant soft deleted successfully',
        ...result
      };
    } catch (error) {
      throw new Error(`Failed to delete tenant: ${error.message}`);
    }
  }

  // Suspend tenant
  async suspendTenant(tenantId, reason, suspendedBy) {
    try {
      const tenantLifecycleService = require('./tenant-lifecycle.service');
      const tenant = await tenantLifecycleService.suspendTenant(tenantId, reason, suspendedBy);
      return tenant;
    } catch (error) {
      throw new Error(`Failed to suspend tenant: ${error.message}`);
    }
  }

  // Reactivate tenant
  async reactivateTenant(tenantId, reactivatedBy) {
    try {
      const tenantLifecycleService = require('./tenant-lifecycle.service');
      const tenant = await tenantLifecycleService.reactivateTenant(tenantId, reactivatedBy);
      return tenant;
    } catch (error) {
      throw new Error(`Failed to reactivate tenant: ${error.message}`);
    }
  }

  // Change tenant owner password
  async changeTenantOwnerPassword(tenantId, newPassword, changedBy) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      // Update the password
      tenant.ownerCredentials.password = hashedPassword;
      await tenant.save();
      
      // Log activity
      await this.logTenantActivity(tenantId, 'password_changed', 'Tenant owner password changed', changedBy);
      
      return { message: 'Password changed successfully' };
    } catch (error) {
      throw new Error(`Failed to change password: ${error.message}`);
    }
  }
  
  // Get tenant usage statistics
  // NOTE: This accesses tenant user data (User.countDocuments) - requires platform admin access reason
  async getTenantUsage(tenantId) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      
      // SECURITY: This queries tenant user data - should only be called with proper access reason
      // Get actual usage from tenant's database
      const usage = {
        users: await User.countDocuments({ orgId: tenantId }),
        projects: await Organization.countDocuments({ _id: tenantId }), // This would be from Project model
        storage: tenant.usage.totalStorage,
        lastActivity: tenant.usage.lastActivity
      };
      
      // Update tenant usage
      tenant.usage = {
        ...tenant.usage,
        ...usage
      };
      await tenant.save();
      
      return usage;
    } catch (error) {
      throw new Error(`Failed to get tenant usage: ${error.message}`);
    }
  }
  
  // Get tenant analytics
  async getTenantAnalytics(tenantId, period = '30d') {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      
      const analytics = {
        usage: await this.getTenantUsage(tenantId),
        activity: await this.getTenantActivityAnalytics(tenantId, period)
      };
      
      return analytics;
    } catch (error) {
      throw new Error(`Failed to get tenant analytics: ${error.message}`);
    }
  }
  
  
  // Get tenant activity analytics
  async getTenantActivityAnalytics(tenantId, period) {
    try {
      const startDate = this.getPeriodStartDate(period);
      
      // This would typically query the tenant's activity logs
      // For now, return mock data
      return {
        activeUsers: Math.floor(Math.random() * 50) + 10,
        projectsCreated: Math.floor(Math.random() * 20) + 5,
        tasksCompleted: Math.floor(Math.random() * 100) + 50,
        lastLogin: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to get activity analytics: ${error.message}`);
    }
  }
  
  // Log tenant activity
  async logTenantActivity(tenantId, action, details, performedBy) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) return;
      
      tenant.supportNotes.push({
        note: `${action}: ${details}`,
        createdBy: performedBy,
        createdAt: new Date()
      });
      
      await tenant.save();
    } catch (error) {
      console.error('Failed to log tenant activity:', error);
    }
  }
  
  // Get period start date
  getPeriodStartDate(period) {
    const now = new Date();
    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
  
  // Provision tenant (setup complete tenant environment)
  async provisionTenant(tenantId) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }
      
      // Mark onboarding as completed
      tenant.onboarding.completed = true;
      tenant.onboarding.steps.forEach(step => {
        step.completed = true;
        step.completedAt = new Date();
      });
      
      tenant.status = 'active';
      await tenant.save();
      
      // Create initial admin user for the tenant
      await this.createInitialAdminUser(tenant);
      
      return tenant;
    } catch (error) {
      throw new Error(`Failed to provision tenant: ${error.message}`);
    }
  }
  
  // Create initial admin user for tenant
  async createInitialAdminUser(tenant) {
    try {
      // This would create the first admin user for the tenant
      // The user would be created in the tenant's isolated database
      console.log(`Creating initial admin user for tenant: ${tenant.slug}`);
      
      // For now, just log the action
      await this.logTenantActivity(tenant._id, 'provisioned', 
        'Tenant provisioned with initial admin user', tenant.createdBy);
    } catch (error) {
      console.error('Failed to create initial admin user:', error);
    }
  }
}

module.exports = new TenantService();
