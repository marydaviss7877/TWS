const mongoose = require('mongoose');
const AuditLog = require('../../models/AuditLog');

class AuditLogger {
  constructor() {
    this.riskFactors = {
      unusualTime: { weight: 2, description: 'Access outside normal hours' },
      newDevice: { weight: 3, description: 'Access from new device' },
      multipleLocations: { weight: 4, description: 'Access from multiple locations' },
      rapidActions: { weight: 3, description: 'Multiple actions in short time' },
      sensitiveData: { weight: 5, description: 'Accessing sensitive data' },
      privilegedAction: { weight: 4, description: 'Performing privileged action' },
      foreignIP: { weight: 3, description: 'Access from foreign IP address' },
      afterHours: { weight: 2, description: 'Access after business hours' },
      suspiciousPattern: { weight: 5, description: 'Suspicious access pattern' },
      dataExport: { weight: 4, description: 'Large data export operation' }
    };

    this.sensitiveActions = [
      'delete', 'export', 'process', 'approve', 'ai_prediction'
    ];

    this.sensitiveEntities = [
      'payroll', 'employee', 'finance', 'compliance'
    ];
  }

  /**
   * Log audit trail for any system action
   */
  async log(auditData) {
    try {
      // Extract basic information
      const {
        entityType,
        entityId,
        action,
        user,
        organizationId,
        changes = {},
        request = {},
        response = {}
      } = auditData;

      // Build audit log entry
      const auditEntry = {
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId),
        action,
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        organizationId: organizationId ? new mongoose.Types.ObjectId(organizationId) : null,
        changes,
        metadata: this.extractMetadata(request, response),
        sensitiveDataAccess: this.assessSensitiveDataAccess(entityType, action, changes),
        complianceFlags: this.checkComplianceRequirements(entityType, action, user.role),
        businessContext: this.extractBusinessContext(auditData)
      };

      // Perform risk assessment
      auditEntry.riskAssessment = await this.assessRisk(auditEntry, user);

      // Check for alerts
      auditEntry.alertsTriggered = this.checkAlerts(auditEntry);

      // Save audit log
      const auditLog = new AuditLog(auditEntry);
      await auditLog.save();

      // Trigger real-time alerts if high risk
      if (auditEntry.riskAssessment.level === 'high' || auditEntry.riskAssessment.level === 'critical') {
        await this.triggerSecurityAlert(auditEntry);
      }

      return auditLog._id;
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Don't throw error to avoid breaking main operation
      return null;
    }
  }

  /**
   * Extract metadata from request and response
   */
  extractMetadata(request, response = {}) {
    const metadata = {
      ipAddress: this.getClientIP(request),
      userAgent: request.headers?.['user-agent'] || '',
      sessionId: request.session?.id || request.sessionID || '',
      requestId: request.id || '',
      endpoint: request.originalUrl || request.url || '',
      method: request.method || '',
      statusCode: response.statusCode || 200,
      responseTime: response.responseTime || 0,
      dataSize: this.calculateDataSize(response)
    };

    // Parse device information
    metadata.device = this.parseDeviceInfo(metadata.userAgent);

    // Get geolocation (would integrate with IP geolocation service)
    metadata.geolocation = this.getGeolocation(metadata.ipAddress);

    return metadata;
  }

  /**
   * Assess if sensitive data is being accessed
   */
  assessSensitiveDataAccess(entityType, action, changes) {
    const access = {
      accessed: false,
      dataTypes: [],
      classification: 'internal',
      encryptionStatus: 'unencrypted'
    };

    // Check if entity type involves sensitive data
    if (this.sensitiveEntities.includes(entityType)) {
      access.accessed = true;
      access.classification = 'confidential';

      // Determine data types based on entity
      switch (entityType) {
        case 'payroll':
          access.dataTypes = ['financial', 'salary', 'tax_info', 'bank_account'];
          access.classification = 'restricted';
          break;
        case 'employee':
          access.dataTypes = ['pii', 'performance'];
          if (changes.after?.bankDetails || changes.after?.taxId) {
            access.dataTypes.push('financial', 'social_security');
            access.classification = 'restricted';
          }
          break;
        case 'finance':
          access.dataTypes = ['financial'];
          break;
        case 'attendance':
          access.dataTypes = ['biometric'];
          break;
      }

      // Check if action involves sensitive operations
      if (this.sensitiveActions.includes(action)) {
        access.classification = 'restricted';
      }
    }

    return access;
  }

  /**
   * Check compliance requirements
   */
  checkComplianceRequirements(entityType, action, userRole) {
    const flags = [];

    // GDPR compliance checks
    if (entityType === 'employee' && action === 'read') {
      flags.push({
        regulation: 'gdpr',
        requirement: 'Data access logging',
        status: 'compliant',
        notes: 'Employee data access logged'
      });
    }

    // SOX compliance for financial data
    if (entityType === 'payroll' || entityType === 'finance') {
      flags.push({
        regulation: 'sox',
        requirement: 'Financial data access control',
        status: userRole === 'finance' || userRole === 'admin' ? 'compliant' : 'needs_review',
        notes: 'Financial data accessed by authorized role'
      });
    }

    // FLSA compliance for payroll processing
    if (entityType === 'payroll' && action === 'process') {
      flags.push({
        regulation: 'flsa',
        requirement: 'Wage and hour compliance',
        status: 'compliant',
        notes: 'Payroll processing tracked for labor law compliance'
      });
    }

    return flags;
  }

  /**
   * Extract business context
   */
  extractBusinessContext(auditData) {
    const context = {
      purpose: this.determinePurpose(auditData),
      justification: auditData.justification || 'Regular business operation',
      approvalRequired: this.requiresApproval(auditData),
      approvedBy: auditData.approvedBy || null,
      approvedAt: auditData.approvedAt || null
    };

    return context;
  }

  /**
   * Assess risk level of the action
   */
  async assessRisk(auditEntry, user) {
    const factors = [];
    let totalScore = 0;

    // Check for unusual time
    const currentHour = new Date().getHours();
    if (currentHour < 6 || currentHour > 22) {
      factors.push({
        factor: 'unusualTime',
        impact: this.riskFactors.unusualTime.weight,
        description: this.riskFactors.unusualTime.description
      });
      totalScore += this.riskFactors.unusualTime.weight;
    }

    // Check for sensitive data access
    if (auditEntry.sensitiveDataAccess.accessed) {
      factors.push({
        factor: 'sensitiveData',
        impact: this.riskFactors.sensitiveData.weight,
        description: this.riskFactors.sensitiveData.description
      });
      totalScore += this.riskFactors.sensitiveData.weight;
    }

    // Check for privileged actions
    if (this.sensitiveActions.includes(auditEntry.action)) {
      factors.push({
        factor: 'privilegedAction',
        impact: this.riskFactors.privilegedAction.weight,
        description: this.riskFactors.privilegedAction.description
      });
      totalScore += this.riskFactors.privilegedAction.weight;
    }

    // Check for rapid actions (would require checking recent audit logs)
    const recentActions = await this.getRecentUserActions(user._id, 5); // Last 5 minutes
    if (recentActions.length > 10) {
      factors.push({
        factor: 'rapidActions',
        impact: this.riskFactors.rapidActions.weight,
        description: this.riskFactors.rapidActions.description
      });
      totalScore += this.riskFactors.rapidActions.weight;
    }

    // Determine risk level
    let level = 'low';
    if (totalScore >= 15) level = 'critical';
    else if (totalScore >= 10) level = 'high';
    else if (totalScore >= 5) level = 'medium';

    return {
      level,
      factors,
      score: Math.min(totalScore * 5, 100) // Convert to 0-100 scale
    };
  }

  /**
   * Check for alerts that should be triggered
   */
  checkAlerts(auditEntry) {
    const alerts = [];

    // High-risk access alert
    if (auditEntry.riskAssessment.level === 'high' || auditEntry.riskAssessment.level === 'critical') {
      alerts.push({
        type: 'high_risk_access',
        severity: auditEntry.riskAssessment.level === 'critical' ? 'critical' : 'error',
        message: `High-risk ${auditEntry.action} action on ${auditEntry.entityType}`,
        automated: true
      });
    }

    // Sensitive data access alert
    if (auditEntry.sensitiveDataAccess.classification === 'restricted') {
      alerts.push({
        type: 'sensitive_data_access',
        severity: 'warning',
        message: `Restricted data accessed: ${auditEntry.sensitiveDataAccess.dataTypes.join(', ')}`,
        automated: true
      });
    }

    // Compliance flag alert
    const nonCompliantFlags = auditEntry.complianceFlags.filter(f => f.status === 'non_compliant');
    if (nonCompliantFlags.length > 0) {
      alerts.push({
        type: 'compliance_violation',
        severity: 'error',
        message: `Compliance violation detected: ${nonCompliantFlags.map(f => f.regulation).join(', ')}`,
        automated: true
      });
    }

    return alerts;
  }

  /**
   * Trigger real-time security alert
   */
  async triggerSecurityAlert(auditEntry) {
    try {
      // This would integrate with notification system
      console.log('SECURITY ALERT:', {
        userId: auditEntry.userId,
        action: auditEntry.action,
        entityType: auditEntry.entityType,
        riskLevel: auditEntry.riskAssessment.level,
        timestamp: new Date()
      });

      // Could send to security team, SIEM system, etc.
    } catch (error) {
      console.error('Failed to trigger security alert:', error);
    }
  }

  /**
   * Helper methods
   */
  getClientIP(request) {
    return request.ip || 
           request.connection?.remoteAddress || 
           request.socket?.remoteAddress ||
           (request.connection?.socket ? request.connection.socket.remoteAddress : null) ||
           '0.0.0.0';
  }

  calculateDataSize(response) {
    if (response.body) {
      return JSON.stringify(response.body).length;
    }
    return 0;
  }

  parseDeviceInfo(userAgent) {
    // Simplified device parsing - would use a library like ua-parser-js
    const device = {
      type: 'desktop',
      os: 'unknown',
      browser: 'unknown',
      version: 'unknown'
    };

    if (userAgent) {
      if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
        device.type = /iPad/.test(userAgent) ? 'tablet' : 'mobile';
      }
      
      if (/Windows/.test(userAgent)) device.os = 'Windows';
      else if (/Mac/.test(userAgent)) device.os = 'macOS';
      else if (/Linux/.test(userAgent)) device.os = 'Linux';
      else if (/Android/.test(userAgent)) device.os = 'Android';
      else if (/iOS/.test(userAgent)) device.os = 'iOS';

      if (/Chrome/.test(userAgent)) device.browser = 'Chrome';
      else if (/Firefox/.test(userAgent)) device.browser = 'Firefox';
      else if (/Safari/.test(userAgent)) device.browser = 'Safari';
      else if (/Edge/.test(userAgent)) device.browser = 'Edge';
    }

    return device;
  }

  getGeolocation(ipAddress) {
    // Would integrate with IP geolocation service
    return {
      country: 'US',
      region: 'CA',
      city: 'San Francisco',
      coordinates: [-122.4194, 37.7749]
    };
  }

  determinePurpose(auditData) {
    const purposes = {
      'payroll': 'Payroll processing and management',
      'employee': 'Employee data management',
      'finance': 'Financial operations',
      'attendance': 'Attendance tracking',
      'compliance': 'Compliance monitoring',
      'ai_config': 'AI system configuration'
    };
    return purposes[auditData.entityType] || 'General business operation';
  }

  requiresApproval(auditData) {
    const highValueActions = ['delete', 'process', 'export'];
    const sensitiveEntities = ['payroll', 'finance'];
    
    return highValueActions.includes(auditData.action) && 
           sensitiveEntities.includes(auditData.entityType);
  }

  async getRecentUserActions(userId, minutesBack = 5) {
    const timeThreshold = new Date(Date.now() - minutesBack * 60 * 1000);
    return await AuditLog.find({
      userId,
      createdAt: { $gte: timeThreshold }
    }).select('action createdAt');
  }

  /**
   * Middleware function for Express
   */
  middleware() {
    return async (req, res, next) => {
      // Store original end function
      const originalEnd = res.end;
      const startTime = Date.now();

      // Override end function to capture response
      res.end = function(chunk, encoding) {
        res.responseTime = Date.now() - startTime;
        
        // Call original end
        originalEnd.call(this, chunk, encoding);
      };

      // Add audit logging function to request
      req.auditLog = async (auditData) => {
        try {
          if (req.user) {
            await this.log({
              ...auditData,
              user: req.user,
              request: req,
              response: res
            });
          }
        } catch (error) {
          console.error('Audit middleware error:', error);
        }
      };

      next();
    };
  }
}

module.exports = { AuditLogger: new AuditLogger(), AuditLog };
