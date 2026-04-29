const AuditLog = require('../../models/core/AuditLog');
const mongoose = require('mongoose');

/**
 * Enhanced Audit Service for Security & Compliance
 * Provides comprehensive audit logging for all security-relevant actions
 */
class AuditService {
  constructor() {
    this.auditActions = {
      // Message actions
      MESSAGE_CREATE: 'message_create',
      MESSAGE_EDIT: 'message_edit',
      MESSAGE_DELETE: 'message_delete',
      MESSAGE_RESTORE: 'message_restore',
      MESSAGE_FLAG: 'message_flag',
      MESSAGE_UNFLAG: 'message_unflag',
      MESSAGE_HIDE: 'message_hide',
      MESSAGE_PIN: 'message_pin',
      MESSAGE_UNPIN: 'message_unpin',
      
      // User actions
      USER_BAN: 'user_ban',
      USER_UNBAN: 'user_unban',
      USER_MUTE: 'user_mute',
      USER_UNMUTE: 'user_unmute',
      USER_ROLE_CHANGE: 'user_role_change',
      USER_STATUS_CHANGE: 'user_status_change',
      
      // Chat actions
      CHAT_CREATE: 'chat_create',
      CHAT_UPDATE: 'chat_update',
      CHAT_DELETE: 'chat_delete',
      CHAT_ARCHIVE: 'chat_archive',
      CHAT_UNARCHIVE: 'chat_unarchive',
      CHAT_MUTE: 'chat_mute',
      CHAT_UNMUTE: 'chat_unmute',
      
      // Security actions
      LOGIN_SUCCESS: 'login_success',
      LOGIN_FAILED: 'login_failed',
      LOGOUT: 'logout',
      PASSWORD_CHANGE: 'password_change',
      TWO_FA_ENABLE: 'two_fa_enable',
      TWO_FA_DISABLE: 'two_fa_disable',
      API_KEY_CREATE: 'api_key_create',
      API_KEY_REVOKE: 'api_key_revoke',
      
      // Admin actions
      ADMIN_ACCESS: 'admin_access',
      DATA_EXPORT: 'data_export',
      DATA_IMPORT: 'data_import',
      SYSTEM_CONFIG_CHANGE: 'system_config_change',
      
      // Compliance actions
      RETENTION_POLICY_CHANGE: 'retention_policy_change',
      DATA_PURGE: 'data_purge',
      AUDIT_EXPORT: 'audit_export',
      COMPLIANCE_REPORT: 'compliance_report'
    };
  }

  /**
   * Log an audit event
   */
  async logEvent({
    action,
    performedBy,
    targetUser = null,
    targetMessage = null,
    targetChat = null,
    reason = null,
    details = {},
    organization,
    ipAddress = '127.0.0.1',
    userAgent = null,
    severity = 'info',
    resource = 'SYSTEM',
    resourceId = null,
    tenantId = 'default',
    userId = null,
    userEmail = 'system@tws.com',
    userRole = 'system',
    status = 'success'
  }) {
    try {
      const auditLog = new AuditLog({
        // Required fields
        tenantId,
        orgId: organization || new mongoose.Types.ObjectId(),
        userId: userId || new mongoose.Types.ObjectId(),
        userEmail,
        userRole,
        action,
        resource,
        resourceId,
        ipAddress,
        'result.status': status,
        
        // Optional fields
        requestId: details.requestId,
        sessionId: details.sessionId,
        userAgent,
        method: details.method,
        endpoint: details.endpoint,
        changes: details.changes,
        metadata: {
          ...details,
          severity,
          targetUser,
          targetMessage,
          targetChat,
          reason
        },
        compliance: {
          gdprRelevant: details.gdprRelevant || false,
          dataSubject: details.dataSubject,
          legalBasis: details.legalBasis,
          retentionPeriod: details.retentionPeriod || 2555,
          dataCategories: details.dataCategories || []
        },
        security: {
          riskLevel: details.riskLevel || 'low',
          suspiciousActivity: details.suspiciousActivity || false,
          geolocation: details.geolocation,
          deviceFingerprint: details.deviceFingerprint
        },
        result: {
          status,
          errorCode: details.errorCode,
          errorMessage: details.errorMessage,
          responseTime: details.responseTime,
          recordsAffected: details.recordsAffected
        }
      });

      await auditLog.save();
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AUDIT] ${action} by ${performedBy} in org ${organization}:`, {
          targetUser,
          targetMessage,
          targetChat,
          reason,
          severity
        });
      }

      return auditLog;
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw error to avoid breaking the main operation
      return null;
    }
  }

  /**
   * Log message-related events
   */
  async logMessageEvent(action, messageId, performedBy, orgId, options = {}) {
    return this.logEvent({
      action,
      performedBy,
      targetMessage: messageId,
      organization: orgId,
      resource: 'MESSAGE',
      resourceId: messageId,
      tenantId: options.tenantId || 'default',
      userId: options.userId || performedBy,
      userEmail: options.userEmail || 'system@tws.com',
      userRole: options.userRole || 'system',
      status: options.status || 'success',
      reason: options.reason,
      details: options.details,
      ipAddress: options.ipAddress || '127.0.0.1',
      userAgent: options.userAgent,
      severity: options.severity || 'info'
    });
  }

  /**
   * Log user-related events
   */
  async logUserEvent(action, targetUserId, performedBy, orgId, options = {}) {
    return this.logEvent({
      action,
      performedBy,
      targetUser: targetUserId,
      organization: orgId,
      resource: 'USER',
      resourceId: targetUserId,
      tenantId: options.tenantId || 'default',
      userId: options.userId || performedBy,
      userEmail: options.userEmail || 'system@tws.com',
      userRole: options.userRole || 'system',
      status: options.status || 'success',
      reason: options.reason,
      details: options.details,
      ipAddress: options.ipAddress || '127.0.0.1',
      userAgent: options.userAgent,
      severity: options.severity || 'info'
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(action, performedBy, orgId, options = {}) {
    return this.logEvent({
      action,
      performedBy,
      organization: orgId,
      resource: options.resource || 'SYSTEM',
      resourceId: options.resourceId,
      tenantId: options.tenantId || 'default',
      userId: options.userId || performedBy,
      userEmail: options.userEmail || 'system@tws.com',
      userRole: options.userRole || 'system',
      status: options.status || 'success',
      details: {
        ...options.details,
        securityEvent: true
      },
      ipAddress: options.ipAddress || '127.0.0.1',
      userAgent: options.userAgent,
      severity: options.severity || 'warning'
    });
  }

  /**
   * Log admin actions
   */
  async logAdminEvent(action, performedBy, orgId, options = {}) {
    return this.logEvent({
      action,
      performedBy,
      organization: orgId,
      resource: options.resource || 'SYSTEM',
      resourceId: options.resourceId,
      tenantId: options.tenantId || 'default',
      userId: options.userId || performedBy,
      userEmail: options.userEmail || 'system@tws.com',
      userRole: options.userRole || 'admin',
      status: options.status || 'success',
      reason: options.reason,
      details: {
        ...options.details,
        adminAction: true
      },
      ipAddress: options.ipAddress || '127.0.0.1',
      userAgent: options.userAgent,
      severity: options.severity || 'info'
    });
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLog(userId, orgId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      action = null,
      startDate = null,
      endDate = null
    } = options;

    const query = {
      $or: [
        { performedBy: userId },
        { targetUser: userId }
      ],
      organization: orgId
    };

    if (action) {
      query.action = action;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    return AuditLog.find(query)
      .populate('performedBy', 'fullName email role')
      .populate('targetUser', 'fullName email role')
      .populate('targetMessage', 'content type')
      .populate('targetChat', 'name type')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);
  }

  /**
   * Get moderation audit logs
   */
  async getModerationLog(orgId, options = {}) {
    const {
      limit = 100,
      offset = 0,
      startDate = null,
      endDate = null
    } = options;

    const moderationActions = [
      this.auditActions.MESSAGE_FLAG,
      this.auditActions.MESSAGE_HIDE,
      this.auditActions.MESSAGE_DELETE,
      this.auditActions.USER_BAN,
      this.auditActions.USER_UNBAN,
      this.auditActions.USER_MUTE,
      this.auditActions.USER_UNMUTE
    ];

    const query = {
      action: { $in: moderationActions },
      organization: orgId
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    return AuditLog.find(query)
      .populate('performedBy', 'fullName email role')
      .populate('targetUser', 'fullName email role')
      .populate('targetMessage', 'content type')
      .populate('targetChat', 'name type')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);
  }

  /**
   * Get security audit logs
   */
  async getSecurityLog(orgId, options = {}) {
    const {
      limit = 100,
      offset = 0,
      startDate = null,
      endDate = null
    } = options;

    const securityActions = [
      this.auditActions.LOGIN_SUCCESS,
      this.auditActions.LOGIN_FAILED,
      this.auditActions.LOGOUT,
      this.auditActions.PASSWORD_CHANGE,
      this.auditActions.TWO_FA_ENABLE,
      this.auditActions.TWO_FA_DISABLE,
      this.auditActions.API_KEY_CREATE,
      this.auditActions.API_KEY_REVOKE
    ];

    const query = {
      action: { $in: securityActions },
      organization: orgId
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    return AuditLog.find(query)
      .populate('performedBy', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);
  }

  /**
   * Get admin audit logs
   */
  async getAdminLog(orgId, options = {}) {
    const {
      limit = 100,
      offset = 0,
      startDate = null,
      endDate = null
    } = options;

    const adminActions = [
      this.auditActions.ADMIN_ACCESS,
      this.auditActions.DATA_EXPORT,
      this.auditActions.DATA_IMPORT,
      this.auditActions.SYSTEM_CONFIG_CHANGE,
      this.auditActions.RETENTION_POLICY_CHANGE,
      this.auditActions.DATA_PURGE,
      this.auditActions.AUDIT_EXPORT,
      this.auditActions.COMPLIANCE_REPORT
    ];

    const query = {
      action: { $in: adminActions },
      organization: orgId
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    return AuditLog.find(query)
      .populate('performedBy', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);
  }

  /**
   * Export audit logs to CSV format
   */
  async exportAuditLogs(orgId, options = {}) {
    const {
      startDate = null,
      endDate = null,
      actions = null,
      format = 'csv'
    } = options;

    const query = { organization: orgId };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (actions && actions.length > 0) {
      query.action = { $in: actions };
    }

    const logs = await AuditLog.find(query)
      .populate('performedBy', 'fullName email role')
      .populate('targetUser', 'fullName email role')
      .populate('targetMessage', 'content type')
      .populate('targetChat', 'name type')
      .sort({ createdAt: -1 });

    if (format === 'csv') {
      return this.convertToCSV(logs);
    }

    return logs;
  }

  /**
   * Convert audit logs to CSV format
   */
  convertToCSV(logs) {
    const headers = [
      'Timestamp',
      'Action',
      'Performed By',
      'Target User',
      'Target Message',
      'Target Chat',
      'Reason',
      'IP Address',
      'User Agent',
      'Details'
    ];

    const rows = logs.map(log => [
      log.createdAt.toISOString(),
      log.action,
      log.performedBy ? `${log.performedBy.fullName} (${log.performedBy.email})` : '',
      log.targetUser ? `${log.targetUser.fullName} (${log.targetUser.email})` : '',
      log.targetMessage ? log.targetMessage.content?.substring(0, 100) : '',
      log.targetChat ? log.targetChat.name : '',
      log.reason || '',
      log.ipAddress || '',
      log.userAgent || '',
      JSON.stringify(log.details)
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(orgId, options = {}) {
    const {
      startDate = null,
      endDate = null
    } = options;

    const query = { organization: orgId };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const stats = await AuditLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          lastOccurrence: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return stats;
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  async cleanupOldLogs(orgId, retentionDays = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await AuditLog.deleteMany({
      organization: orgId,
      createdAt: { $lt: cutoffDate }
    });

    return result.deletedCount;
  }

  /**
   * Log client portal settings changes
   * SECURITY: Comprehensive audit trail for client portal configuration changes
   */
  async logClientPortalChange(projectId, userId, action, changes, req) {
    try {
      const Project = require('../../models/project-delivery/Project');
      const project = await Project.findById(projectId).select('name clientId tenantId orgId');
      
      return await this.logEvent({
        action: `CLIENT_PORTAL_${action.toUpperCase()}`,
        performedBy: userId?.toString() || 'system',
        userId: userId?.toString() || 'system',
        userEmail: req.user?.email || req.clientUser?.email || 'unknown',
        userRole: req.user?.role || req.clientUser?.role || 'unknown',
        organization: project?.orgId || req.user?.orgId || null,
        tenantId: project?.tenantId?.toString() || req.tenant?._id?.toString() || req.user?.tenantId || 'default',
        resource: 'CLIENT_PORTAL_SETTINGS',
        resourceId: projectId?.toString(),
        resourceName: project?.name || 'Unknown Project',
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.get('User-Agent'),
        details: {
          projectId: projectId?.toString(),
          projectName: project?.name,
          clientId: project?.clientId?.toString(),
          changes: changes, // Before/after values
          action: action,
          timestamp: new Date().toISOString()
        },
        severity: action === 'disable' || action === 'access_denied' ? 'high' : 'medium',
        status: 'success'
      });
    } catch (error) {
      console.error('Failed to log client portal change:', error);
      // Don't throw - audit logging failure shouldn't break the operation
      return null;
    }
  }
}

// Singleton instance
const auditService = new AuditService();

module.exports = auditService;
