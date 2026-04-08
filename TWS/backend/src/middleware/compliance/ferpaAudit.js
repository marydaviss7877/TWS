const ferpaComplianceService = require('../../services/compliance/ferpa-compliance.service');
const mongoose = require('mongoose');

/**
 * Get list of fields accessed in the request
 * Helper function to extract field names from query parameters
 * 
 * @param {Object} req - Express request object
 * @returns {Array<string>} Array of field names accessed
 */
const getAccessedFields = (req) => {
  const fields = [];
  
  // Check query parameters
  if (req.query?.fields && typeof req.query.fields === 'string') {
    const fieldList = req.query.fields.split(',').map(f => f.trim()).filter(f => f);
    fields.push(...fieldList);
  }
  
  // Check if specific fields are requested
  if (req.query?.include && typeof req.query.include === 'string') {
    const includeList = req.query.include.split(',').map(f => f.trim()).filter(f => f);
    fields.push(...includeList);
  }
  
  return fields;
};

/**
 * Extract student ID from request (params, body, or query)
 * Handles both string and ObjectId formats
 * 
 * @param {Object} req - Express request object
 * @returns {string|null} Student ID as string or null
 */
const extractStudentId = (req) => {
  const studentId = req.params?.id || req.params?.studentId || req.body?.studentId || req.query?.studentId;
  
  if (!studentId) {
    return null;
  }
  
  // Convert ObjectId to string if needed
  if (mongoose.Types.ObjectId.isValid(studentId)) {
    return studentId.toString();
  }
  
  return String(studentId);
};

/**
 * Extract tenant ID from request context
 * Handles multiple tenant context formats for backward compatibility
 * 
 * @param {Object} req - Express request object
 * @returns {string|null} Tenant ID as string or null
 */
const extractTenantId = (req) => {
  if (req.tenantContext) {
    return req.tenantContext.tenantId?.toString() || 
           req.tenantContext.tenantSlug || 
           req.tenantContext.tenantIdString || 
           null;
  }
  
  if (req.tenant) {
    return req.tenant.tenantId?.toString() || 
           req.tenant.slug || 
           req.tenant._id?.toString() || 
           null;
  }
  
  return req.tenantId?.toString() || null;
};

/**
 * FERPA Audit Middleware
 * Automatically logs all student data access for FERPA compliance
 * 
 * @param {string} action - Action being performed (view, create, update, delete)
 * @returns {Function} Express middleware
 */
const auditStudentDataAccess = (action) => {
  return async (req, res, next) => {
    try {
      const studentId = extractStudentId(req);
      
      if (studentId && req.user) {
        const tenantId = extractTenantId(req);
        
        // Log the access asynchronously (don't block request)
        ferpaComplianceService.logStudentDataAccess({
          userId: req.user._id,
          userEmail: req.user.email || req.user.userEmail || 'unknown@tws.com',
          userRole: req.user.role || 'unknown',
          studentId: studentId,
          action: action || 'view',
          details: {
            method: req.method,
            endpoint: req.path || req.originalUrl || req.url,
            query: req.query,
            fieldsAccessed: getAccessedFields(req)
          },
          tenantId: tenantId,
          orgId: req.tenantContext?.orgId || req.tenant?.orgId || null,
          ipAddress: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1',
          userAgent: req.get('User-Agent') || 'unknown'
        }).catch(error => {
          console.error('Failed to log FERPA audit:', error);
          // Don't throw - audit logging failure shouldn't break the request
        });
      }
      
      next();
    } catch (error) {
      console.error('FERPA audit middleware error:', error);
      // Continue even if audit logging fails
      next();
    }
  };
};

/**
 * Validate FERPA access before allowing request
 * Ensures user has legitimate educational purpose for accessing student data
 */
const validateFERPAAccess = async (req, res, next) => {
  try {
    const studentId = extractStudentId(req);
    const userRole = req.user?.role;
    const userId = req.user?._id;
    
    // If no student data access, continue without validation
    if (!studentId || !userRole) {
      return next();
    }
    
    // Convert userId to string for comparison
    const userIdString = userId?.toString() || null;
    const studentIdString = studentId?.toString() || String(studentId);
    
    // Determine action from HTTP method
    const httpMethod = req.method?.toLowerCase() || 'get';
    const action = httpMethod === 'get' ? 'view' : httpMethod;
    
    // Validate access using FERPA compliance service
    const hasAccess = ferpaComplianceService.validateFERPAAccess(
      userRole,
      action,
      studentIdString,
      userIdString
    );
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'FERPA: Access denied. You do not have educational purpose to access this student data.',
        error: 'FERPA_ACCESS_DENIED',
        studentId: studentIdString,
        userRole: userRole
      });
    }
    
    next();
  } catch (error) {
    console.error('FERPA access validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating FERPA access',
      error: 'FERPA_VALIDATION_ERROR'    });
  }
};

module.exports = {
  auditStudentDataAccess,
  validateFERPAAccess
};
