const AuditLog = require('../../../models/core/AuditLog');

/**
 * Create default audit log entries
 * @param {Object} tenant - Tenant record
 * @param {Object} organization - Organization record
 * @param {Object} session - MongoDB session
 */
async function createDefaultAuditLogs(tenant, organization, session) {
  try {
    const auditLogs = [
      {
        orgId: organization._id,
        tenantId: tenant.tenantId,
        action: 'TENANT_CREATED',
        entityType: 'Tenant',
        entityId: tenant._id,
        userId: 'system',
        userEmail: 'system@tws.com',
        details: {
          tenantName: tenant.name,
          tenantId: tenant.tenantId
        },
        ipAddress: '127.0.0.1',
        userAgent: 'TWS-Provisioning-Service',
        timestamp: new Date()
      },
      {
        orgId: organization._id,
        tenantId: tenant.tenantId,
        action: 'ORGANIZATION_CREATED',
        entityType: 'Organization',
        entityId: organization._id,
        userId: 'system',
        userEmail: 'system@tws.com',
        details: {
          organizationName: organization.name,
          organizationType: organization.type
        },
        ipAddress: '127.0.0.1',
        userAgent: 'TWS-Provisioning-Service',
        timestamp: new Date()
      }
    ];

    for (const logData of auditLogs) {
      const auditLog = new AuditLog(logData);
      await auditLog.save({ session });
    }
    
  } catch (error) {
    console.error('Error creating default audit logs:', error);
    throw error;
  }
}

module.exports = {
  createDefaultAuditLogs
};

