/**
 * Audit Logging Middleware
 * Logs important actions for security and compliance
 */

// Use the existing AuditLog model
let AuditLog;
try {
  AuditLog = require('../../models/AuditLog');
} catch (error) {
  console.warn('AuditLog model not found, audit logging will be disabled');
  AuditLog = null;
}

/**
 * Create audit log entry
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {String} action - Action performed
 * @param {String} resource - Resource affected
 * @param {String} status - Success or failure
 * @param {String} details - Additional details
 */
const createAuditLog = async (req, res, action, resource, status, details = {}) => {
  try {
    const user = req.user || req.parent;
    if (!user?._id || !user?.email || !user?.role) return;

    const normalizedAction = String(action || 'CUSTOM').toUpperCase();
    const allowedActions = new Set([
      'CREATE', 'READ', 'UPDATE', 'DELETE',
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      'AUTH_SUCCESS', 'AUTH_FAILED', 'AUTH_REFRESH', 'AUTH_REVOKE',
      'PASSWORD_CHANGE', 'PASSWORD_RESET',
      'PERMISSION_CHANGE', 'ROLE_CHANGE',
      'DATA_EXPORT', 'DATA_IMPORT',
      'API_ACCESS', 'FILE_UPLOAD', 'FILE_DOWNLOAD',
      'PAYMENT_PROCESSED', 'SUBSCRIPTION_CHANGE',
      'TENANT_CREATED', 'TENANT_UPDATED', 'TENANT_DELETED', 'TENANT_LOOKUP_FAILED',
      'USER_CREATED', 'USER_UPDATED', 'USER_DELETED',
      'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELETED',
      'ATTENDANCE_CREATED', 'ATTENDANCE_UPDATED', 'ATTENDANCE_DELETED',
      'INVOICE_CREATED', 'INVOICE_UPDATED', 'INVOICE_DELETED',
      'RESOURCE_CREATED', 'RESOURCE_UPDATED', 'RESOURCE_DELETED',
      'CUSTOM'
    ]);
    const safeAction = allowedActions.has(normalizedAction) ? normalizedAction : 'CUSTOM';

    const normalizedResource = String(resource || 'SYSTEM').toUpperCase();
    const allowedResources = new Set([
      'USER', 'ORGANIZATION', 'TENANT', 'PROJECT', 'CLIENT',
      'EMPLOYEE', 'ATTENDANCE', 'INVOICE', 'SUBSCRIPTION',
      'PAYMENT', 'FILE', 'API', 'SYSTEM', 'AUDIT_LOG',
      'AUTH', 'SESSION', 'RESOURCE', 'TASK', 'SPRINT', 'MILESTONE',
      'PATIENT', 'MEDICAL_RECORD', 'PRESCRIPTION', 'APPOINTMENT',
      'DOCTOR', 'LAB_RESULT', 'BILLING_CLAIM'
    ]);
    const safeResource = allowedResources.has(normalizedResource) ? normalizedResource : 'SYSTEM';

    const auditData = {
      tenantId: String(req.tenantContext?.tenantId || req.tenantId || req.user?.tenantId || 'unknown'),
      orgId: req.tenantContext?.orgId || null,
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: safeAction,
      resource: safeResource,
      ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      method: req.method,
      endpoint: req.path,
      metadata: {
        ...details,
        timestamp: new Date()
      },
      result: {
        status: status === 'success' ? 'success' : (status === 'partial' ? 'partial' : 'failure')
      }
    };

    // Don't await to avoid blocking the request
    if (AuditLog) {
      AuditLog.create(auditData).catch(err => {
        console.error('Error creating audit log:', err);
      });
    }
  } catch (error) {
    console.error('Error in audit logging:', error);
  }
};

/**
 * Audit logging middleware
 * Automatically logs API requests
 */
const auditLogMiddleware = (options = {}) => {
  const {
    logSuccess = true,
    logFailure = true,
    excludePaths = ['/health', '/status']
  } = options;

  return async (req, res, next) => {
    // Skip excluded paths
    if (excludePaths.some(path => req.path.includes(path))) {
      return next();
    }

    const startTime = Date.now();
    const originalSend = res.send;

    // Override res.send to capture response
    res.send = function (body) {
      const duration = Date.now() - startTime;
      const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure';

      // Determine action and resource from request
      const action = req.method.toLowerCase();
      const resource = req.path.split('/').pop() || req.path;

      // Log based on options
      if ((status === 'success' && logSuccess) || (status === 'failure' && logFailure)) {
        createAuditLog(req, res, action, resource, status, {
          statusCode: res.statusCode,
          duration
        });
      }

      // Call original send
      originalSend.call(this, body);
    };

    next();
  };
};

/**
 * Manual audit log function for important actions
 */
const logAction = async (req, action, resource, status, details) => {
  await createAuditLog(req, null, action, resource, status, details);
};

module.exports = {
  auditLogMiddleware,
  logAction,
  createAuditLog
};
