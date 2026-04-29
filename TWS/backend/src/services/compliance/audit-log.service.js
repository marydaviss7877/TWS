const AuditLog = require('../../models/core/AuditLog');
const logger = require('../../utils/logger');

/**
 * Audit Log Service
 * 
 * Handles audit logging for compliance and security monitoring
 */
class AuditLogService {
  constructor() {
    this.logQueue = [];
    this.batchSize = 100;
    this.flushInterval = 5000; // 5 seconds
    this.isProcessing = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    // Start batch processing
    this.startBatchProcessing();
    logger.info('AuditLogService initialized');
  }

  /**
   * Start batch processing for audit logs
   */
  startBatchProcessing() {
    setInterval(() => {
      this.processBatch();
    }, this.flushInterval);
  }

  /**
   * Log an audit event
   */
  async logEvent(eventData) {
    try {
      const auditLog = new AuditLog({
        tenantId: eventData.tenantId,
        orgId: eventData.orgId,
        userId: eventData.userId,
        userEmail: eventData.userEmail,
        userRole: eventData.userRole,
        action: eventData.action,
        resource: eventData.resource,
        resourceId: eventData.resourceId,
        requestId: eventData.requestId,
        sessionId: eventData.sessionId,
        ipAddress: eventData.ipAddress,
        userAgent: eventData.userAgent,
        method: eventData.method,
        endpoint: eventData.endpoint,
        changes: eventData.changes,
        metadata: eventData.metadata,
        compliance: eventData.compliance || {
          gdprRelevant: false,
          retentionPeriod: 2555 // 7 years default
        },
        security: eventData.security || {
          riskLevel: 'low',
          suspiciousActivity: false
        },
        result: eventData.result,
        timestamp: eventData.timestamp || new Date()
      });

      // Add to queue for batch processing
      this.logQueue.push(auditLog);

      // Process immediately if queue is full
      if (this.logQueue.length >= this.batchSize) {
        await this.processBatch();
      }

      logger.debug(`Audit event queued: ${eventData.action} on ${eventData.resource}`);
    } catch (error) {
      logger.error('Failed to log audit event:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Process batch of audit logs
   */
  async processBatch() {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.logQueue.splice(0, this.batchSize);
      
      if (batch.length > 0) {
        await AuditLog.insertMany(batch, { ordered: false });
        logger.debug(`Processed ${batch.length} audit logs`);
      }
    } catch (error) {
      logger.error('Failed to process audit log batch:', error);
      // Re-queue failed logs (with limit to prevent infinite loop)
      if (this.logQueue.length < 1000) {
        this.logQueue.unshift(...batch);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Log user login
   */
  async logLogin(userId, userEmail, userRole, tenantId, orgId, ipAddress, userAgent, sessionId, success = true) {
    await this.logEvent({
      tenantId,
      orgId,
      userId,
      userEmail,
      userRole,
      action: success ? 'LOGIN' : 'LOGIN_FAILED',
      resource: 'USER',
      resourceId: userId,
      sessionId,
      ipAddress,
      userAgent,
      result: {
        status: success ? 'success' : 'failure'
      },
      security: {
        riskLevel: success ? 'low' : 'medium',
        suspiciousActivity: !success
      }
    });
  }

  /**
   * Log user logout
   */
  async logLogout(userId, userEmail, userRole, tenantId, orgId, sessionId) {
    await this.logEvent({
      tenantId,
      orgId,
      userId,
      userEmail,
      userRole,
      action: 'LOGOUT',
      resource: 'USER',
      resourceId: userId,
      sessionId,
      result: {
        status: 'success'
      }
    });
  }

  /**
   * Log data access
   */
  async logDataAccess(userId, userEmail, userRole, tenantId, orgId, resource, resourceId, ipAddress, userAgent, requestId) {
    await this.logEvent({
      tenantId,
      orgId,
      userId,
      userEmail,
      userRole,
      action: 'READ',
      resource,
      resourceId,
      requestId,
      ipAddress,
      userAgent,
      result: {
        status: 'success'
      }
    });
  }

  /**
   * Log data creation
   */
  async logDataCreation(userId, userEmail, userRole, tenantId, orgId, resource, resourceId, newData, ipAddress, userAgent, requestId) {
    await this.logEvent({
      tenantId,
      orgId,
      userId,
      userEmail,
      userRole,
      action: 'CREATE',
      resource,
      resourceId,
      requestId,
      ipAddress,
      userAgent,
      changes: {
        after: newData
      },
      result: {
        status: 'success'
      }
    });
  }

  /**
   * Log data update
   */
  async logDataUpdate(userId, userEmail, userRole, tenantId, orgId, resource, resourceId, oldData, newData, ipAddress, userAgent, requestId) {
    const changes = this.calculateChanges(oldData, newData);
    
    await this.logEvent({
      tenantId,
      orgId,
      userId,
      userEmail,
      userRole,
      action: 'UPDATE',
      resource,
      resourceId,
      requestId,
      ipAddress,
      userAgent,
      changes: {
        before: oldData,
        after: newData,
        fields: changes
      },
      result: {
        status: 'success'
      }
    });
  }

  /**
   * Log data deletion
   */
  async logDataDeletion(userId, userEmail, userRole, tenantId, orgId, resource, resourceId, deletedData, ipAddress, userAgent, requestId) {
    await this.logEvent({
      tenantId,
      orgId,
      userId,
      userEmail,
      userRole,
      action: 'DELETE',
      resource,
      resourceId,
      requestId,
      ipAddress,
      userAgent,
      changes: {
        before: deletedData
      },
      result: {
        status: 'success'
      },
      security: {
        riskLevel: 'high'
      }
    });
  }

  /**
   * Log password change
   */
  async logPasswordChange(userId, userEmail, userRole, tenantId, orgId, ipAddress, userAgent) {
    await this.logEvent({
      tenantId,
      orgId,
      userId,
      userEmail,
      userRole,
      action: 'PASSWORD_CHANGE',
      resource: 'USER',
      resourceId: userId,
      ipAddress,
      userAgent,
      result: {
        status: 'success'
      },
      security: {
        riskLevel: 'medium'
      }
    });
  }

  /**
   * Log permission change
   */
  async logPermissionChange(userId, userEmail, userRole, tenantId, orgId, targetUserId, oldPermissions, newPermissions, ipAddress, userAgent) {
    await this.logEvent({
      tenantId,
      orgId,
      userId,
      userEmail,
      userRole,
      action: 'PERMISSION_CHANGE',
      resource: 'USER',
      resourceId: targetUserId,
      ipAddress,
      userAgent,
      changes: {
        before: { permissions: oldPermissions },
        after: { permissions: newPermissions }
      },
      result: {
        status: 'success'
      },
      security: {
        riskLevel: 'high'
      }
    });
  }

  /**
   * Log data export
   */
  async logDataExport(userId, userEmail, userRole, tenantId, orgId, resource, exportType, recordCount, ipAddress, userAgent) {
    await this.logEvent({
      tenantId,
      orgId,
      userId,
      userEmail,
      userRole,
      action: 'DATA_EXPORT',
      resource,
      ipAddress,
      userAgent,
      metadata: {
        exportType,
        recordCount
      },
      result: {
        status: 'success',
        recordsAffected: recordCount
      },
      compliance: {
        gdprRelevant: true,
        dataCategories: ['personal_data']
      },
      security: {
        riskLevel: 'medium'
      }
    });
  }

  /**
   * Log API access
   */
  async logApiAccess(userId, userEmail, userRole, tenantId, orgId, method, endpoint, ipAddress, userAgent, requestId, responseTime, status) {
    await this.logEvent({
      tenantId,
      orgId,
      userId,
      userEmail,
      userRole,
      action: 'API_ACCESS',
      resource: 'API',
      requestId,
      ipAddress,
      userAgent,
      method,
      endpoint,
      result: {
        status: status === 200 ? 'success' : 'failure',
        responseTime
      }
    });
  }

  /**
   * Log file upload
   */
  async logFileUpload(userId, userEmail, userRole, tenantId, orgId, fileName, fileSize, fileType, ipAddress, userAgent) {
    await this.logEvent({
      tenantId,
      orgId,
      userId,
      userEmail,
      userRole,
      action: 'FILE_UPLOAD',
      resource: 'FILE',
      ipAddress,
      userAgent,
      metadata: {
        fileName,
        fileSize,
        fileType
      },
      result: {
        status: 'success'
      }
    });
  }

  /**
   * Log file download
   */
  async logFileDownload(userId, userEmail, userRole, tenantId, orgId, fileName, fileSize, fileType, ipAddress, userAgent) {
    await this.logEvent({
      tenantId,
      orgId,
      userId,
      userEmail,
      userRole,
      action: 'FILE_DOWNLOAD',
      resource: 'FILE',
      ipAddress,
      userAgent,
      metadata: {
        fileName,
        fileSize,
        fileType
      },
      result: {
        status: 'success'
      }
    });
  }

  /**
   * Calculate changes between old and new data
   */
  calculateChanges(oldData, newData) {
    const changes = [];
    
    if (!oldData || !newData) {
      return changes;
    }

    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
    for (const key of allKeys) {
      const oldValue = oldData[key];
      const newValue = newData[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          oldValue,
          newValue
        });
      }
    }
    
    return changes;
  }

  /**
   * Get audit logs for a tenant
   */
  async getTenantLogs(tenantId, options = {}) {
    try {
      const {
        limit = 100,
        offset = 0,
        startDate,
        endDate,
        action,
        resource,
        userId
      } = options;

      const query = { tenantId };
      
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = startDate;
        if (endDate) query.timestamp.$lte = endDate;
      }
      
      if (action) query.action = action;
      if (resource) query.resource = resource;
      if (userId) query.userId = userId;

      return await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(offset);
    } catch (error) {
      logger.error(`Failed to get audit logs for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get GDPR relevant logs
   */
  async getGDPRLogs(tenantId, dataSubject = null) {
    try {
      return await AuditLog.getGDPRLogs(tenantId, dataSubject);
    } catch (error) {
      logger.error(`Failed to get GDPR logs for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get security events
   */
  async getSecurityEvents(tenantId, riskLevel = null) {
    try {
      return await AuditLog.getSecurityEvents(tenantId, riskLevel);
    } catch (error) {
      logger.error(`Failed to get security events for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get audit trail for a resource
   */
  async getResourceAuditTrail(resource, resourceId, tenantId) {
    try {
      return await AuditLog.getResourceAuditTrail(resource, resourceId, tenantId);
    } catch (error) {
      logger.error(`Failed to get audit trail for ${resource} ${resourceId}:`, error);
      throw error;
    }
  }

  /**
   * Get compliance report
   */
  async getComplianceReport(tenantId, startDate, endDate) {
    try {
      return await AuditLog.getComplianceReport(tenantId, startDate, endDate);
    } catch (error) {
      logger.error(`Failed to get compliance report for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(userId, startDate, endDate) {
    try {
      return await AuditLog.getUserActivitySummary(userId, startDate, endDate);
    } catch (error) {
      logger.error(`Failed to get user activity summary for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(tenantId, options = {}) {
    try {
      const logs = await this.getTenantLogs(tenantId, options);
      
      return logs.map(log => ({
        timestamp: log.timestamp,
        userEmail: log.userEmail,
        userRole: log.userRole,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        ipAddress: log.ipAddress,
        result: log.result.status,
        gdprRelevant: log.compliance.gdprRelevant,
        riskLevel: log.security.riskLevel
      }));
    } catch (error) {
      logger.error(`Failed to export audit logs for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Health check for the service
   */
  async healthCheck() {
    try {
      // Check if we can access the database
      await AuditLog.findOne().limit(1);
      return true;
    } catch (error) {
      logger.error('AuditLogService health check failed:', error);
      return false;
    }
  }

  /**
   * Record log (alias for logEvent with simplified interface)
   * Maintains backward compatibility with existing code
   */
  async recordLog(logData) {
    return this.logEvent({
      tenantId: logData.tenantId,
      orgId: logData.orgId,
      userId: logData.userId,
      userEmail: logData.userEmail || 'system@tws.com',
      userRole: logData.userRole || 'system',
      action: logData.action,
      resource: logData.entityType || logData.resource || 'SYSTEM',
      resourceId: logData.entityId || logData.resourceId,
      changes: logData.changes,
      metadata: logData.metadata,
      ipAddress: logData.ipAddress || '127.0.0.1',
      userAgent: logData.userAgent,
      result: logData.result || { status: 'success' }
    });
  }

  /**
   * Get service metrics
   */
  async getMetrics() {
    return {
      queueSize: this.logQueue.length,
      batchSize: this.batchSize,
      flushInterval: this.flushInterval,
      isProcessing: this.isProcessing,
      status: 'healthy'
    };
  }

  /**
   * Shutdown the service
   */
  async shutdown() {
    // Process remaining logs in queue
    await this.processBatch();
    logger.info('AuditLogService shut down');
  }
}

// Create singleton instance
const auditLogService = new AuditLogService();

module.exports = auditLogService;
