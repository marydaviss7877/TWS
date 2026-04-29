const Tenant = require('../../models/tenant/Tenant');
const User = require('../../models/users-auth/User');
const Organization = require('../../models/org/Organization');
const tokenBlacklistService = require('../auth/token-blacklist.service');
const AuditLog = require('../../models/core/AuditLog');
const mongoose = require('mongoose');

// Additional models for full cascade delete (lazy load to avoid circular deps)
let Billing, Session, TenantSettings, TenantUser, TenantRole, DefaultContact, OnboardingChecklist;
let Department, DepartmentAccess, Role, Permission, Project, Deliverable;
let ChangeRequest, ChangeRequestAudit, Approval, Analytics;
try { Billing = require('../../models/finance/Billing'); } catch (_) {}
try { Session = require('../../models/core/Session'); } catch (_) {}
try { TenantSettings = require('../../models/tenant/TenantSettings'); } catch (_) {}
try { TenantUser = require('../../models/tenant/TenantUser'); } catch (_) {}
try { TenantRole = require('../../models/tenant/TenantRole'); } catch (_) {}
try { DefaultContact = require('../../models/org/DefaultContact'); } catch (_) {}
try { OnboardingChecklist = require('../../models/admin-platform/OnboardingChecklist'); } catch (_) {}
try { Department = require('../../models/org/Department'); } catch (_) {}
try { DepartmentAccess = require('../../models/org/DepartmentAccess'); } catch (_) {}
try { Role = require('../../models/core/Role'); } catch (_) {}
try { Permission = require('../../models/core/Permission'); } catch (_) {}
try { Project = require('../../models/project-delivery/Project'); } catch (_) {}
try { Deliverable = require('../../models/project-delivery/Deliverable'); } catch (_) {}
try { ChangeRequest = require('../../models/project-delivery/ChangeRequest'); } catch (_) {}
try { ChangeRequestAudit = require('../../models/project-delivery/ChangeRequestAudit'); } catch (_) {}
try { Approval = require('../../models/core/Approval'); } catch (_) {}
try { Analytics = require('../../models/analytics/Analytics'); } catch (_) {}

/**
 * Tenant Lifecycle Service
 * Handles tenant suspension, reactivation, and deletion with proper cascade operations
 */
class TenantLifecycleService {
  /**
   * Suspend tenant (temporary disable access)
   * @param {string} tenantId - Tenant ID or slug
   * @param {string} reason - Reason for suspension
   * @param {string} suspendedBy - User ID who suspended
   * @returns {object} Suspended tenant
   */
  async suspendTenant(tenantId, reason, suspendedBy) {
    try {
      // Find tenant by ID or slug
      let tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        tenant = await Tenant.findOne({ slug: tenantId });
      }
      if (!tenant) {
        tenant = await Tenant.findOne({ tenantId });
      }

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Update tenant status
      tenant.status = 'suspended';
      tenant.suspendedAt = new Date();
      tenant.suspensionReason = reason;
      tenant.suspendedBy = suspendedBy;
      await tenant.save();

      // Revoke all API access tokens for tenant users
      await this.revokeAllTenantTokens(tenant);

      // Disable all user logins
      await User.updateMany(
        { 
          $or: [
            { tenantId: tenant.slug },
            { tenantId: tenant._id.toString() },
            { orgId: tenant.organizationId || tenant.orgId }
          ]
        },
        { 
          isActive: false, 
          suspendedAt: new Date(),
          suspensionReason: reason
        }
      );

      // Log the suspension
      await this.logTenantActivity(tenant, 'suspended', reason, suspendedBy);

      return tenant;
    } catch (error) {
      console.error('Error suspending tenant:', error);
      throw error;
    }
  }

  /**
   * Reactivate tenant
   * @param {string} tenantId - Tenant ID or slug
   * @param {string} reactivatedBy - User ID who reactivated
   * @returns {object} Reactivated tenant
   */
  async reactivateTenant(tenantId, reactivatedBy) {
    try {
      // Find tenant by ID or slug
      let tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        tenant = await Tenant.findOne({ slug: tenantId });
      }
      if (!tenant) {
        tenant = await Tenant.findOne({ tenantId });
      }

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Update tenant status
      tenant.status = 'active';
      tenant.suspendedAt = null;
      tenant.suspensionReason = null;
      tenant.suspendedBy = null;
      await tenant.save();

      // Reactivate users
      await User.updateMany(
        { 
          $or: [
            { tenantId: tenant.slug },
            { tenantId: tenant._id.toString() },
            { orgId: tenant.organizationId || tenant.orgId }
          ]
        },
        { 
          isActive: true, 
          suspendedAt: null,
          suspensionReason: null
        }
      );

      // Log the reactivation
      await this.logTenantActivity(tenant, 'reactivated', 'Tenant reactivated', reactivatedBy);

      return tenant;
    } catch (error) {
      console.error('Error reactivating tenant:', error);
      throw error;
    }
  }

  /**
   * Delete tenant (with cascade deletion option)
   * @param {string} tenantId - Tenant ID or slug
   * @param {boolean} hardDelete - If true, permanently delete all data
   * @param {string} deletedBy - User ID who deleted
   * @returns {object} Deletion result
   */
  async deleteTenant(tenantId, hardDelete = false, deletedBy) {
    try {
      // Find tenant by ID or slug
      let tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        tenant = await Tenant.findOne({ slug: tenantId });
      }
      if (!tenant) {
        tenant = await Tenant.findOne({ tenantId });
      }

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const tenantSlug = tenant.slug;
      const tenantObjectId = tenant._id;
      const orgId = tenant.organizationId || tenant.orgId;

      if (hardDelete) {
        // Hard delete - remove tenant and ALL associated data (users, orgs, portal data)
        await this.cascadeDeleteTenantData(tenant);
        await Tenant.findByIdAndDelete(tenant._id);
        
        // Log the deletion
        await this.logTenantActivity(tenant, 'deleted', 'Tenant permanently deleted', deletedBy);
      } else {
        // Soft delete - mark as deleted, retain for retention period
        tenant.status = 'deleted';
        tenant.deletedAt = new Date();
        tenant.deletedBy = deletedBy;
        tenant.retentionUntil = new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000); // 7 years
        await tenant.save();

        // Soft delete all related data
        await this.softDeleteTenantData(tenantSlug, tenantObjectId, orgId);

        // Log the soft deletion
        await this.logTenantActivity(tenant, 'soft_deleted', 'Tenant soft deleted (retained for 7 years)', deletedBy);
      }

      return {
        success: true,
        tenantId: tenant._id,
        tenantSlug,
        hardDelete,
        deletedAt: new Date()
      };
    } catch (error) {
      console.error('Error deleting tenant:', error);
      throw error;
    }
  }

  /**
   * Cascade delete all tenant data (hard delete)
   * Removes: users, organizations, sessions, billing, roles, permissions, departments,
   * projects, deliverables, analytics, audit logs, etc.
   */
  async cascadeDeleteTenantData(tenant) {
    try {
      const tenantSlug = tenant.slug;
      const tenantObjId = tenant._id;
      const tenantIdVariants = [tenantSlug, tenantObjId.toString(), tenant.tenantId].filter(Boolean);

      // Resolve all organizations for this tenant (Organization.tenantId = Tenant._id)
      const orgs = await Organization.find({ tenantId: tenantObjId });
      const orgIds = orgs.map((o) => o._id);
      const tenantOrOrgFilter = {
        $or: [
          { tenantId: { $in: tenantIdVariants } },
          { tenantId: tenantObjId },
          ...(orgIds.length ? [{ orgId: { $in: orgIds } }] : [])
        ]
      };
      const tenantOnlyFilter = {
        $or: [
          { tenantId: { $in: tenantIdVariants } },
          { tenantId: tenantObjId }
        ]
      };

      const run = async (model, filter, label) => {
        if (!model) return;
        try {
          const r = await model.deleteMany(filter);
          if (r.deletedCount > 0) console.log(`   - ${label}: ${r.deletedCount}`);
        } catch (e) {
          console.warn(`Cascade ${label} failed:`, e.message);
        }
      };

      // 1) Sessions, billing, analytics, audit
      await run(Session, tenantOnlyFilter, 'Session');
      await run(Billing, tenantOnlyFilter, 'Billing');
      await run(Analytics, tenantOnlyFilter, 'Analytics');
      await AuditLog.deleteMany(tenantOnlyFilter);

      // 2) Tenant-scoped settings and associations
      await run(TenantSettings, tenantOnlyFilter, 'TenantSettings');
      await run(TenantUser, tenantOnlyFilter, 'TenantUser');
      await run(TenantRole, tenantOnlyFilter, 'TenantRole');
      await run(DefaultContact, tenantOnlyFilter, 'DefaultContact');
      await run(OnboardingChecklist, tenantOnlyFilter, 'OnboardingChecklist');

      // 3) Department access and departments
      await run(DepartmentAccess, tenantOrOrgFilter, 'DepartmentAccess');
      await run(Department, tenantOnlyFilter, 'Department');

      // 4) Roles and permissions
      await run(Role, tenantOnlyFilter, 'Role');
      await run(Permission, tenantOnlyFilter, 'Permission');

      // 5) Projects, deliverables, change requests, approvals
      await run(Project, tenantOnlyFilter, 'Project');
      await run(Deliverable, tenantOnlyFilter, 'Deliverable');
      await run(ChangeRequest, tenantOnlyFilter, 'ChangeRequest');
      await run(ChangeRequestAudit, tenantOnlyFilter, 'ChangeRequestAudit');
      await run(Approval, tenantOnlyFilter, 'Approval');

      // 6) Users (by orgId or tenantId)
      await User.deleteMany(tenantOrOrgFilter);

      // 7) Organizations for this tenant
      await Organization.deleteMany({ tenantId: tenantObjId });

      console.log(`✅ Cascade deleted all data for tenant: ${tenantSlug}`);
    } catch (error) {
      console.error('Error in cascade delete:', error);
      throw error;
    }
  }

  /**
   * Soft delete tenant data (mark as deleted)
   */
  async softDeleteTenantData(tenantSlug, tenantId, orgId) {
    try {
      const tenantIdString = tenantSlug || tenantId.toString();

      // Soft delete users
      await User.updateMany(
        {
          $or: [
            { tenantId: tenantIdString },
            { tenantId: tenantId.toString() },
            { orgId }
          ]
        },
        { isActive: false, isDeleted: true, deletedAt: new Date() }
      );

      // Soft delete organization
      if (orgId) {
        await Organization.findByIdAndUpdate(orgId, {
          status: 'deleted',
          isDeleted: true,
          deletedAt: new Date()
        });
      }

      console.log(`✅ Soft deleted all data for tenant: ${tenantSlug}`);
    } catch (error) {
      console.error('Error in soft delete:', error);
      throw error;
    }
  }

  /**
   * Revoke all tokens for tenant users
   */
  async revokeAllTenantTokens(tenant) {
    try {
      const users = await User.find({
        $or: [
          { tenantId: tenant.slug },
          { tenantId: tenant._id.toString() },
          { orgId: tenant.organizationId || tenant.orgId }
        ]
      });

      // In a production system, you'd track active tokens
      // For now, we rely on token expiration and blacklist service
      // This would require tracking tokens in a database or Redis
      console.log(`⚠️ Token revocation for ${users.length} users - tokens will expire naturally`);
      
      // Note: Full token revocation would require tracking active tokens
      // This is a placeholder for the implementation
    } catch (error) {
      console.error('Error revoking tenant tokens:', error);
      // Don't throw - token revocation failure shouldn't block suspension
    }
  }

  /**
   * Log tenant activity
   */
  async logTenantActivity(tenant, action, reason, performedBy) {
    try {
      await AuditLog.create({
        tenantId: tenant.slug || tenant._id.toString(),
        orgId: tenant.organizationId || tenant.orgId || new mongoose.Types.ObjectId(),
        userId: performedBy ? new mongoose.Types.ObjectId(performedBy) : new mongoose.Types.ObjectId(),
        userEmail: 'system@tws.com',
        userRole: 'system',
        action: `TENANT_${action.toUpperCase()}`,
        resource: 'TENANT',
        resourceId: tenant._id.toString(),
        ipAddress: '127.0.0.1',
        compliance: {
          gdprRelevant: true,
          retentionPeriod: 2555 // 7 years
        },
        result: {
          status: 'success'
        },
        metadata: {
          reason,
          tenantSlug: tenant.slug,
          tenantName: tenant.name
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error logging tenant activity:', error);
      // Don't throw - logging failure shouldn't block operation
    }
  }
}

module.exports = new TenantLifecycleService();
