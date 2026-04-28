const crypto = require('crypto');
const AuditLog = require('../../models/AuditLog');
const mongoose = require('mongoose');

/**
 * FERPA Compliance Service for Education ERP
 * Handles PII encryption, audit logging, and access control for student data
 */
class FERPAComplianceService {
  constructor() {
    // Use AES-256-GCM for encryption (same as healthcare PHI encryption)
    this.algorithm = 'aes-256-gcm';
    this.key = this.getEncryptionKey();
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
  }

  /**
   * Get encryption key from environment
   * In production, use AWS KMS, Azure Key Vault, or similar
   */
  getEncryptionKey() {
    const key = process.env.FERPA_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;

    if (!key) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('FERPA_ENCRYPTION_KEY or ENCRYPTION_KEY must be set');
      }
      // Keep local/dev servers bootable even when FERPA key is not configured.
      // This avoids crashing unrelated routes (e.g., signup) during development.
      console.warn('⚠️ FERPA_ENCRYPTION_KEY missing; using non-persistent development fallback key');
      return crypto.scryptSync('dev-ferpa-fallback-key', 'ferpa-salt', 32);
    }
    
    // If key is hex string, convert to buffer
    if (key.length === 64) {
      return Buffer.from(key, 'hex');
    }
    
    // Otherwise, derive key from string
    return crypto.scryptSync(key, 'ferpa-salt', 32);
  }

  /**
   * Encrypt student PII (Personally Identifiable Information)
   * Fields: firstName, lastName, dateOfBirth, address, SSN, etc.
   */
  encryptPII(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    try {
      const encryptedData = {};
      
      for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined) {
          encryptedData[key] = value;
          continue;
        }

        const valueString = typeof value === 'object' ? JSON.stringify(value) : String(value);
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
        
        let encrypted = cipher.update(valueString, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        
        encryptedData[key] = {
          encrypted: encrypted,
          iv: iv.toString('hex'),
          authTag: authTag.toString('hex'),
          algorithm: this.algorithm
        };
      }
      
      return encryptedData;
    } catch (error) {
      console.error('FERPA PII encryption error:', error);
      throw new Error('Failed to encrypt student PII');
    }
  }

  /**
   * Decrypt student PII
   */
  decryptPII(encryptedData) {
    if (!encryptedData || typeof encryptedData !== 'object') {
      return encryptedData;
    }

    try {
      const decryptedData = {};
      
      for (const [key, value] of Object.entries(encryptedData)) {
        if (!value || typeof value !== 'object' || !value.encrypted) {
          decryptedData[key] = value;
          continue;
        }

        const decipher = crypto.createDecipheriv(
          this.algorithm,
          this.key,
          Buffer.from(value.iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(value.authTag, 'hex'));
        
        let decrypted = decipher.update(value.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        // Try to parse as JSON if it looks like JSON
        try {
          decryptedData[key] = JSON.parse(decrypted);
        } catch {
          decryptedData[key] = decrypted;
        }
      }
      
      return decryptedData;
    } catch (error) {
      console.error('FERPA PII decryption error:', error);
      throw new Error('Failed to decrypt student PII');
    }
  }

  /**
   * Log student data access for FERPA compliance
   * Must log all access to student educational records
   */
  async logStudentDataAccess({
    userId,
    userEmail,
    userRole,
    studentId,
    action,
    details = {},
    tenantId,
    orgId,
    ipAddress,
    userAgent
  }) {
    try {
      const auditLog = new AuditLog({
        tenantId: tenantId || 'default',
        orgId: orgId || new mongoose.Types.ObjectId(),
        userId: userId || new mongoose.Types.ObjectId(),
        userEmail: userEmail || 'system@tws.com',
        userRole: userRole || 'system',
        action: `STUDENT_DATA_${action.toUpperCase()}`,
        resource: 'STUDENT',
        resourceId: studentId?.toString(),
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent,
        method: details.method || 'GET',
        endpoint: details.endpoint,
        sensitiveDataAccess: true,
        phiFieldsAccessed: details.fieldsAccessed || [],
        compliance: {
          ferpaRelevant: true,
          dataSubject: studentId?.toString(),
          legalBasis: 'educational_purpose',
          retentionPeriod: 2555, // 7 years for FERPA
          dataCategories: ['personal_data', 'sensitive_data']
        },
        security: {
          riskLevel: this.getRiskLevel(action, details),
          suspiciousActivity: false
        },
        result: {
          status: 'success',
          recordsAffected: 1
        },
        metadata: {
          ferpaCompliant: true,
          accessPurpose: this.getAccessPurpose(userRole, action),
          ...details
        },
        timestamp: new Date()
      });

      await auditLog.save();
      return auditLog;
    } catch (error) {
      console.error('FERPA audit logging error:', error);
      // Don't throw - audit logging failure shouldn't break the request
      return null;
    }
  }

  /**
   * Check if user has educational purpose for accessing student data
   * FERPA requires "legitimate educational interest"
   */
  hasEducationalPurpose(userRole, action) {
    const educationalPurposes = {
      'principal': ['view', 'update', 'delete', 'export'],
      'admin': ['view', 'update', 'delete', 'export'],
      'teacher': ['view', 'update'],
      'student': ['viewOwn'],
      'parent': ['viewOwn']
    };

    return educationalPurposes[userRole]?.includes(action) || false;
  }

  /**
   * Get access purpose based on role and action
   */
  getAccessPurpose(userRole, action) {
    const purposes = {
      'principal': 'Administrative oversight and student support',
      'admin': 'Administrative operations',
      'teacher': 'Educational instruction and student evaluation',
      'student': 'Access to own educational records',
      'parent': 'Access to child\'s educational records'
    };

    return purposes[userRole] || 'Educational purpose';
  }

  /**
   * Get risk level for audit logging
   */
  getRiskLevel(action, details) {
    const highRiskActions = ['delete', 'export', 'update'];
    const mediumRiskActions = ['create', 'update'];
    
    if (highRiskActions.includes(action.toLowerCase())) {
      return 'high';
    }
    
    if (mediumRiskActions.includes(action.toLowerCase())) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Validate FERPA access requirements
   * Checks if access meets FERPA requirements
   */
  validateFERPAAccess(userRole, action, studentId, requestingUserId) {
    // Students can only access their own data
    if (userRole === 'student') {
      return studentId === requestingUserId;
    }

    // Check if user has educational purpose
    if (!this.hasEducationalPurpose(userRole, action)) {
      return false;
    }

    return true;
  }

  /**
   * Get FERPA-compliant student data export
   * Includes only data allowed under FERPA
   */
  async exportStudentDataForFERPA(studentId, tenantId, orgId) {
    const Student = require('../../models/industry/Education').Student;
    const student = await Student.findOne({ 
      _id: studentId, 
      tenantId, 
      orgId 
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Return only FERPA-allowed data
    return {
      studentId: student.studentId,
      academicInfo: {
        admissionDate: student.academicInfo?.admissionDate,
        admissionNumber: student.academicInfo?.admissionNumber,
        classId: student.academicInfo?.classId,
        section: student.academicInfo?.section,
        rollNumber: student.academicInfo?.rollNumber,
        academicYear: student.academicInfo?.academicYear,
        status: student.academicInfo?.status
      },
      // PII fields should be decrypted if user has permission
      personalInfo: {
        firstName: student.personalInfo?.firstName,
        lastName: student.personalInfo?.lastName,
        dateOfBirth: student.personalInfo?.dateOfBirth
      }
    };
  }
}

// Create singleton instance
const ferpaComplianceService = new FERPAComplianceService();

module.exports = ferpaComplianceService;
