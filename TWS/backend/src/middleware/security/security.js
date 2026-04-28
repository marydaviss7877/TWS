const crypto = require('crypto');
const { AuditLog, SecurityEvent, RolePermission } = require('../../models/Security');

const getRequiredEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY is required');
  }
  return key;
};

// Audit logging middleware
const auditLog = (entityType, action, options = {}) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the action after response is sent
      setImmediate(async () => {
        try {
          const auditData = {
            entityType,
            action,
            userId: req.user?._id,
            userEmail: req.user?.email,
            userRole: req.user?.role,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionID,
            orgId: req.user?.orgId,
            metadata: options.metadata || {}
          };

          // Add entity ID if available
          if (req.params.id) {
            auditData.entityId = req.params.id;
          } else if (req.body._id) {
            auditData.entityId = req.body._id;
          }

          // Add changes for update operations
          if (action === 'update' && options.trackChanges) {
            auditData.changes = {
              before: options.beforeData,
              after: req.body,
              fields: Object.keys(req.body)
            };
          }

          await AuditLog.create(auditData);
        } catch (error) {
          console.error('Audit logging failed:', error);
        }
      });
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Enhanced permission checking middleware
const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user's role permissions
      const rolePermission = await RolePermission.findOne({
        role: req.user.role,
        orgId: req.user.orgId
      });

      if (!rolePermission) {
        await logSecurityEvent('permission_denied', 'medium', 
          `No role permissions found for user ${req.user.email}`, 
          { userId: req.user._id, role: req.user.role, resource, action },
          req
        );
        
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      // Check specific permission
      const hasPermission = rolePermission.permissions[resource]?.[action];
      
      if (!hasPermission) {
        await logSecurityEvent('permission_denied', 'medium', 
          `Access denied for ${action} on ${resource}`, 
          { userId: req.user._id, role: req.user.role, resource, action },
          req
        );
        
        return res.status(403).json({
          success: false,
          message: `Permission denied: ${action} on ${resource}`
        });
      }

      // Check field restrictions
      if (rolePermission.fieldRestrictions?.maskedFields?.length > 0) {
        req.maskedFields = rolePermission.fieldRestrictions.maskedFields;
      }
      
      if (rolePermission.fieldRestrictions?.readOnlyFields?.length > 0) {
        req.readOnlyFields = rolePermission.fieldRestrictions.readOnlyFields;
      }

      next();
    } catch (error) {
      console.error('Permission check failed:', error);
      res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
};

// Data masking middleware
const maskSensitiveData = (fields) => {
  return (req, res, next) => {
    if (req.maskedFields) {
      const maskFields = (obj, maskedFields) => {
        if (Array.isArray(obj)) {
          return obj.map(item => maskFields(item, maskedFields));
        } else if (obj && typeof obj === 'object') {
          const masked = { ...obj };
          maskedFields.forEach(field => {
            if (masked[field]) {
              masked[field] = '***MASKED***';
            }
          });
          return masked;
        }
        return obj;
      };

      const originalJson = res.json;
      res.json = function(data) {
        const maskedData = maskFields(data, req.maskedFields);
        return originalJson.call(this, maskedData);
      };
    }
    next();
  };
};

// Rate limiting middleware
const rateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const key = `${req.ip}-${req.user?._id || 'anonymous'}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    if (requests.has(key)) {
      const userRequests = requests.get(key).filter(time => time > windowStart);
      requests.set(key, userRequests);
    } else {
      requests.set(key, []);
    }
    
    const userRequests = requests.get(key);
    
    if (userRequests.length >= maxRequests) {
      logSecurityEvent('rate_limit_exceeded', 'medium', 
        `Rate limit exceeded for ${req.ip}`, 
        { ipAddress: req.ip, userId: req.user?._id, requests: userRequests.length },
        req
      );
      
      return res.status(429).json({
        success: false,
        message: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    userRequests.push(now);
    next();
  };
};

// Input validation and sanitization
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Remove potentially dangerous characters
      return obj.replace(/[<>\"'%;()&+]/g, '');
    } else if (Array.isArray(obj)) {
      return obj.map(sanitize);
    } else if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  
  next();
};

// Helpers shared by encrypt/decrypt middleware (AES-256-CBC + random IV)
function _encryptValue(value, keyStr) {
  const key = crypto.scryptSync(keyStr, 'twssalt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  return iv.toString('hex') + ':' + cipher.update(value, 'utf8', 'hex') + cipher.final('hex');
}

function _decryptValue(stored, keyStr) {
  const colonIdx = stored.indexOf(':');
  if (colonIdx === 32) {
    const iv = Buffer.from(stored.slice(0, 32), 'hex');
    const data = stored.slice(33);
    const key = crypto.scryptSync(keyStr, 'twssalt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
  }
  return stored; // legacy unencrypted or unknown format — pass through
}

// Encryption middleware for sensitive data
const encryptSensitiveData = (fields) => {
  return async (req, res, next) => {
    try {
      if (req.body && fields.length > 0) {
        const encryptionKey = getRequiredEncryptionKey();

        for (const field of fields) {
          if (req.body[field]) {
            req.body[field] = _encryptValue(req.body[field], encryptionKey);
          }
        }
      }
      next();
    } catch (error) {
      console.error('Encryption failed:', error);
      res.status(500).json({
        success: false,
        message: 'Data encryption failed'
      });
    }
  };
};

// Decryption middleware for sensitive data
const decryptSensitiveData = (fields) => {
  return async (req, res, next) => {
    try {
      if (res.locals.data && fields.length > 0) {
        const encryptionKey = getRequiredEncryptionKey();

        const decrypt = (obj) => {
          if (Array.isArray(obj)) {
            return obj.map(decrypt);
          } else if (obj && typeof obj === 'object') {
            const decrypted = { ...obj };
            fields.forEach(field => {
              if (decrypted[field] && typeof decrypted[field] === 'string') {
                try {
                  decrypted[field] = _decryptValue(decrypted[field], encryptionKey);
                } catch (error) {
                  // If decryption fails, keep original value
                  console.warn(`Failed to decrypt field ${field}:`, error.message);
                }
              }
            });
            return decrypted;
          }
          return obj;
        };
        
        res.locals.data = decrypt(res.locals.data);
      }
      next();
    } catch (error) {
      console.error('Decryption failed:', error);
      res.status(500).json({
        success: false,
        message: 'Data decryption failed'
      });
    }
  };
};

// Security event logging
const logSecurityEvent = async (eventType, severity, description, details = {}, req = null) => {
  try {
    await SecurityEvent.create({
      eventType,
      severity,
      userId: req?.user?._id,
      userEmail: req?.user?.email,
      userRole: req?.user?.role,
      description,
      details,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent'),
      sessionId: req?.sessionID,
      orgId: req?.user?.orgId
    });
  } catch (error) {
    console.error('Security event logging failed:', error);
  }
};

// Session security middleware
const secureSession = (req, res, next) => {
  // Check for suspicious session activity
  if (req.user && req.user.lastLogin) {
    const timeSinceLastLogin = Date.now() - new Date(req.user.lastLogin).getTime();
    const suspiciousThreshold = 24 * 60 * 60 * 1000; // 24 hours
    
    if (timeSinceLastLogin > suspiciousThreshold) {
      logSecurityEvent('suspicious_activity', 'medium', 
        'Long time since last login detected', 
        { 
          userId: req.user._id, 
          timeSinceLastLogin: timeSinceLastLogin,
          lastLogin: req.user.lastLogin 
        }, 
        req
      );
    }
  }
  
  next();
};

// Data export security
const secureExport = (req, res, next) => {
  // Log all data exports
  logSecurityEvent('export', 'medium', 
    `Data export requested: ${req.query.format || 'unknown'}`, 
    { 
      userId: req.user._id, 
      exportType: req.query.type,
      format: req.query.format,
      filters: req.query 
    }, 
    req
  );
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
};

module.exports = {
  auditLog,
  requirePermission,
  maskSensitiveData,
  rateLimit,
  sanitizeInput,
  encryptSensitiveData,
  decryptSensitiveData,
  logSecurityEvent,
  secureSession,
  secureExport
};
