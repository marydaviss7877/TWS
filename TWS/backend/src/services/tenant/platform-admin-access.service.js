/**
 * Platform Admin Access Control Service
 * Manages platform admin access to tenant data with proper security controls
 */

const auditService = require('../compliance/audit.service');
const Notification = require('../../models/notifications/Notification');
const Tenant = require('../../models/tenant/Tenant');
const User = require('../../models/users-auth/User');
const mongoose = require('mongoose');

// Legitimate reasons for platform admin to access tenant data
const LEGITIMATE_ACCESS_REASONS = [
  'support_troubleshooting',
  'billing_dispute',
  'security_incident',
  'data_migration',
  'compliance_audit',
  'legal_request',
  'system_maintenance',
  'onboarding_assistance'
];

// Sensitive tenant types that require approval
const SENSITIVE_TENANT_TYPES = ['enterprise'];

// Default access duration (1 hour)
const DEFAULT_ACCESS_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

class PlatformAdminAccessService {
  /**
   * Validate access reason
   * @param {string} reason - Access reason
   * @returns {Object} Validation result
   */
  validateAccessReason(reason) {
    if (!reason) {
      return {
        valid: false,
        error: 'Access reason is required',
        code: 'ACCESS_REASON_REQUIRED'
      };
    }

    if (!LEGITIMATE_ACCESS_REASONS.includes(reason)) {
      return {
        valid: false,
        error: 'Invalid access reason',
        code: 'INVALID_ACCESS_REASON',
        allowedReasons: LEGITIMATE_ACCESS_REASONS
      };
    }

    return { valid: true };
  }

  /**
   * Check if tenant requires approval for access
   * @param {Object} tenant - Tenant object
   * @returns {boolean} True if approval required
   */
  requiresApproval(tenant) {
    // Enterprise tenants require approval
    if (tenant.subscription?.plan === 'enterprise') {
      return true;
    }

    // Add other sensitive tenant types here if needed
    return false;
  }

  /**
   * Log platform admin tenant access to audit trail
   * @param {Object} params - Access parameters
   * @returns {Promise<Object>} Audit log entry
   */
  async logPlatformAdminAccess({
    platformAdminId,
    platformAdminEmail,
    platformAdminName,
    tenantId,
    tenantName,
    reason,
    ipAddress,
    userAgent,
    endpoint,
    method
  }) {
    try {
      const auditLog = await auditService.logEvent({
        action: 'CUSTOM',
        performedBy: platformAdminId,
        userId: platformAdminId,
        userEmail: platformAdminEmail,
        userRole: 'platform_admin',
        organization: null, // Platform admin is not part of tenant organization
        tenantId: tenantId.toString(),
        resource: 'TENANT',
        resourceId: tenantId.toString(),
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent || 'Unknown',
        severity: 'high',
        status: 'success',
        details: {
          reason: reason,
          tenantName: tenantName,
          endpoint: endpoint,
          method: method,
          accessType: 'platform_admin_override',
          timestamp: new Date()
        },
        reason: reason
      });

      return auditLog;
    } catch (error) {
      console.error('Failed to log platform admin access:', error);
      // Don't throw - audit logging failure shouldn't break access
      return null;
    }
  }

  /**
   * Notify tenant of platform admin access
   * @param {Object} params - Notification parameters
   * @returns {Promise<boolean>} Success status
   */
  async notifyTenant({
    tenantId,
    platformAdminName,
    platformAdminEmail,
    reason,
    endpoint
  }) {
    try {
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        console.warn(`Tenant ${tenantId} not found for notification`);
        return false;
      }

      // Get tenant owner/administrator
      const tenantOwner = await User.findOne({
        email: tenant.ownerCredentials?.email,
        role: { $in: ['owner', 'admin', 'super_admin'] }
      });

      if (!tenantOwner) {
        console.warn(`Tenant owner not found for tenant ${tenantId}`);
        return false;
      }

      // Get tenant organization for notification
      const tenantOrgId = tenant.organizationId || tenant.orgId;
      
      // Create notification
      const notification = new Notification({
        userId: tenantOwner._id,
        orgId: tenantOrgId, // Optional, but include if available
        type: 'platform_admin_access',
        title: 'Platform Administrator Accessed Your Data',
        message: `Platform administrator ${platformAdminName} (${platformAdminEmail}) accessed your tenant data. Reason: ${reason}. Endpoint: ${endpoint}`,
        relatedEntityType: 'TENANT',
        relatedEntityId: tenantId.toString(),
        data: {
          platformAdminName,
          platformAdminEmail,
          reason,
          endpoint,
          timestamp: new Date()
        },
        priority: 'high',
        read: false
      });

      await notification.save();

      // Send email notification
      try {
        const emailService = require('../integrations/email.service');
        const emailSubject = 'Platform Administrator Accessed Your Tenant Data';
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d32f2f;">Security Notification</h2>
            <p>A platform administrator has accessed your tenant data.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Administrator:</strong> ${platformAdminName} (${platformAdminEmail})</p>
              <p><strong>Reason:</strong> ${reason}</p>
              <p><strong>Endpoint:</strong> ${endpoint}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p>If you did not request this access or have concerns, please contact support immediately.</p>
            <p style="color: #666; font-size: 12px;">This is an automated security notification from TWS Platform.</p>
          </div>
        `;
        
        await emailService.sendEmail(
          tenantOwner.email,
          emailSubject,
          emailHtml
        );
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't throw - email failure shouldn't break access
      }

      return true;
    } catch (error) {
      console.error('Failed to notify tenant of platform admin access:', error);
      // Don't throw - notification failure shouldn't break access
      return false;
    }
  }

  /**
   * Check if platform admin has active access session
   * @param {string} platformAdminId - Platform admin ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object|null>} Active access session or null
   */
  async getActiveAccessSession(platformAdminId, tenantId) {
    // In a real implementation, this would check a database table
    // For now, we'll use a simple in-memory store (should be Redis in production)
    // TODO: Implement proper session storage (Redis or database)
    return null;
  }

  /**
   * Create time-limited access session
   * @param {Object} params - Session parameters
   * @returns {Promise<Object>} Access session
   */
  async createAccessSession({
    platformAdminId,
    tenantId,
    reason,
    duration = DEFAULT_ACCESS_DURATION
  }) {
    const expiresAt = new Date(Date.now() + duration);

    // In a real implementation, this would be stored in Redis or database
    // For now, we'll return the session object
    const session = {
      platformAdminId,
      tenantId,
      reason,
      createdAt: new Date(),
      expiresAt,
      active: true
    };

    // TODO: Store in Redis or database
    // await redis.set(`platform_access:${platformAdminId}:${tenantId}`, JSON.stringify(session), 'EX', duration / 1000);

    return session;
  }

  /**
   * Validate and process platform admin tenant access
   * @param {Object} params - Access parameters
   * @returns {Promise<Object>} Access validation result
   */
  async validateAndProcessAccess({
    platformAdmin,
    tenant,
    reason,
    ipAddress,
    userAgent,
    endpoint,
    method,
    req
  }) {
    // 1. Validate reason
    const reasonValidation = this.validateAccessReason(reason);
    if (!reasonValidation.valid) {
      return {
        allowed: false,
        error: reasonValidation.error,
        code: reasonValidation.code,
        allowedReasons: reasonValidation.allowedReasons
      };
    }

    // 2. Check if approval required
    const needsApproval = this.requiresApproval(tenant);
    if (needsApproval) {
      console.warn(`⚠️ Approval required for tenant ${tenant._id} (${tenant.subscription?.plan || tenant.erpCategory})`);
      
      // Check if approval exists
      const approvalCheck = await this.checkApproval(platformAdmin._id, tenant._id, reason);
      if (!approvalCheck.hasApproval) {
        // Check if justification provided (for auto-approval in development)
        const justification = req?.body?.justification || req?.headers['x-justification'];
        
        if (process.env.NODE_ENV === 'development' && justification && justification.length >= 20) {
          // In development, create auto-approval if justification provided
          console.warn('⚠️ Development mode: Auto-approving with justification');
          const autoApproval = await this.createApprovalRequest({
            platformAdminId: platformAdmin._id,
            platformAdminEmail: platformAdmin.email,
            platformAdminName: platformAdmin.fullName,
            tenantId: tenant._id,
            tenantName: tenant.name,
            reason,
            justification,
            ipAddress,
            userAgent,
            endpoint,
            method
          });
          
          // Auto-approve in development
          if (autoApproval.success && autoApproval.approval) {
            const PlatformAdminApproval = require('../../models/admin-platform/PlatformAdminApproval');
            await PlatformAdminApproval.findByIdAndUpdate(autoApproval.approval._id, {
              status: 'approved',
              approvedBy: platformAdmin._id,
              approvedAt: new Date(),
              accessGranted: true,
              accessGrantedAt: new Date(),
              accessExpiresAt: new Date(Date.now() + DEFAULT_ACCESS_DURATION)
            });
          }
        } else {
          return {
            allowed: false,
            error: 'Approval required for enterprise tenant access',
            code: 'APPROVAL_REQUIRED',
            requiresApproval: true,
            approvalError: approvalCheck.error
          };
        }
      } else {
        // Update approval to mark access as granted
        if (approvalCheck.approval) {
          const PlatformAdminApproval = require('../../models/admin-platform/PlatformAdminApproval');
          await PlatformAdminApproval.findByIdAndUpdate(approvalCheck.approval._id, {
            accessGranted: true,
            accessGrantedAt: new Date()
          });
        }
      }
    }

    // 3. Log to audit trail
    const auditLog = await this.logPlatformAdminAccess({
      platformAdminId: platformAdmin._id,
      platformAdminEmail: platformAdmin.email,
      platformAdminName: platformAdmin.fullName,
      tenantId: tenant._id,
      tenantName: tenant.name,
      reason,
      ipAddress,
      userAgent,
      endpoint,
      method
    });

    // 4. Notify tenant
    await this.notifyTenant({
      tenantId: tenant._id,
      platformAdminName: platformAdmin.fullName,
      platformAdminEmail: platformAdmin.email,
      reason,
      endpoint
    });

    // 5. Create time-limited access session
    const accessSession = await this.createAccessSession({
      platformAdminId: platformAdmin._id,
      tenantId: tenant._id,
      reason,
      duration: DEFAULT_ACCESS_DURATION
    });

    // 6. Set access expiration on request object
    if (req) {
      req.platformAdminAccess = {
        session: accessSession,
        expiresAt: accessSession.expiresAt,
        reason,
        tenantId: tenant._id
      };
    }

    return {
      allowed: true,
      auditLog,
      accessSession,
      expiresAt: accessSession.expiresAt
    };
  }

  /**
   * Check if approval exists for platform admin access
   * @param {string} platformAdminId - Platform admin ID
   * @param {string} tenantId - Tenant ID
   * @param {string} reason - Access reason
   * @returns {Promise<Object>} Approval check result
   */
  async checkApproval(platformAdminId, tenantId, reason) {
    try {
      const PlatformAdminApproval = require('../../models/admin-platform/PlatformAdminApproval');
      
      // Find active approval
      const approval = await PlatformAdminApproval.findOne({
        platformAdminId: new mongoose.Types.ObjectId(platformAdminId),
        tenantId: new mongoose.Types.ObjectId(tenantId),
        reason: reason,
        status: 'approved'
      })
      .sort({ createdAt: -1 })
      .lean();

      if (!approval) {
        return {
          hasApproval: false,
          approval: null,
          error: 'No approval found for this access request'
        };
      }

      // Check if approval is expired
      if (approval.accessExpiresAt && new Date() > new Date(approval.accessExpiresAt)) {
        // Mark as expired
        await PlatformAdminApproval.findByIdAndUpdate(approval._id, {
          status: 'expired'
        });
        
        return {
          hasApproval: false,
          approval: null,
          error: 'Approval has expired'
        };
      }

      // Check if approval is revoked
      if (approval.status === 'revoked') {
        return {
          hasApproval: false,
          approval: null,
          error: 'Approval has been revoked'
        };
      }

      return {
        hasApproval: true,
        approval: approval
      };
    } catch (error) {
      console.error('Error checking approval:', error);
      // In development, allow access if approval check fails
      // In production, this should fail securely
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Development mode: Approval check failed, allowing access');
        return { hasApproval: true, approval: null };
      }
      
      return {
        hasApproval: false,
        approval: null,
        error: 'Error checking approval status'
      };
    }
  }

  /**
   * Get allowed access reasons (for API documentation)
   * @returns {Array<string>} List of allowed reasons
   */
  getAllowedReasons() {
    return LEGITIMATE_ACCESS_REASONS;
  }

  /**
   * Create approval request
   * @param {Object} params - Approval request parameters
   * @returns {Promise<Object>} Approval request
   */
  async createApprovalRequest({
    platformAdminId,
    platformAdminEmail,
    platformAdminName,
    tenantId,
    tenantName,
    reason,
    justification,
    ipAddress,
    userAgent,
    endpoint,
    method
  }) {
    try {
      const PlatformAdminApproval = require('../../models/admin-platform/PlatformAdminApproval');
      
      // Check if pending approval already exists
      const existingApproval = await PlatformAdminApproval.findOne({
        platformAdminId: new mongoose.Types.ObjectId(platformAdminId),
        tenantId: new mongoose.Types.ObjectId(tenantId),
        reason: reason,
        status: 'pending'
      });

      if (existingApproval) {
        return {
          success: false,
          error: 'Pending approval request already exists',
          approval: existingApproval
        };
      }

      // Create approval request
      const approval = new PlatformAdminApproval({
        platformAdminId: new mongoose.Types.ObjectId(platformAdminId),
        platformAdminEmail,
        platformAdminName,
        tenantId: new mongoose.Types.ObjectId(tenantId),
        tenantName,
        reason,
        justification,
        status: 'pending',
        ipAddress,
        userAgent,
        endpoint,
        method
      });

      await approval.save();

      // TODO: Notify approvers (manager, security team, etc.)
      // await this.notifyApprovers(approval);

      return {
        success: true,
        approval: approval
      };
    } catch (error) {
      console.error('Error creating approval request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

const serviceInstance = new PlatformAdminAccessService();

// Export service instance and constants
module.exports = serviceInstance;
module.exports.LEGITIMATE_ACCESS_REASONS = LEGITIMATE_ACCESS_REASONS;
module.exports.SENSITIVE_TENANT_TYPES = SENSITIVE_TENANT_TYPES;
module.exports.DEFAULT_ACCESS_DURATION = DEFAULT_ACCESS_DURATION;
