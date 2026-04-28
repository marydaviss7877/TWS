/**
 * Encryption Service for PHI (Protected Health Information)
 * Provides field-level encryption for HIPAA compliance
 */

const crypto = require('crypto');
const securityConfig = require('../../config/security');

class EncryptionService {
  constructor() {
    // Use environment variable for encryption key (store in AWS KMS, Azure Key Vault, etc.)
    this.algorithm = 'aes-256-gcm';
    this.key = this.getEncryptionKey();
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
  }

  /**
   * Get encryption key from environment or config
   */
  getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;

    if (!key) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('ENCRYPTION_KEY must be set');
      }
      // Allow development to boot without a configured encryption key.
      console.warn('⚠️ ENCRYPTION_KEY missing; using non-persistent development fallback key');
      return crypto.scryptSync('dev-encryption-fallback-key', 'enc-salt', 32);
    }
    
    // Convert hex string to buffer if needed
    if (typeof key === 'string' && key.length === 64) {
      return Buffer.from(key, 'hex');
    }
    
    // Pad or truncate to 32 bytes
    const keyBuffer = Buffer.from(key);
    if (keyBuffer.length !== 32) {
      const paddedKey = Buffer.alloc(32);
      keyBuffer.copy(paddedKey, 0, 0, Math.min(keyBuffer.length, 32));
      return paddedKey;
    }
    
    return keyBuffer;
  }

  /**
   * Encrypt text data
   */
  encrypt(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }
    
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: this.algorithm
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt encrypted data
   */
  decrypt(encryptedData) {
    if (!encryptedData || typeof encryptedData !== 'object' || !encryptedData.encrypted) {
      return encryptedData;
    }
    
    try {
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt a field value (checks HIPAA compliance mode)
   */
  encryptField(value) {
    if (!securityConfig.compliance.hipaa.enabled || !securityConfig.compliance.hipaa.requireFieldLevelEncryption) {
      return value; // No encryption if HIPAA disabled
    }
    
    if (typeof value === 'string' && value.length > 0) {
      return this.encrypt(value);
    }
    return value;
  }

  /**
   * Decrypt a field value (checks HIPAA compliance mode)
   */
  decryptField(value) {
    if (!securityConfig.compliance.hipaa.enabled) {
      return value;
    }
    
    if (value && typeof value === 'object' && value.encrypted) {
      return this.decrypt(value);
    }
    return value;
  }

  /**
   * Encrypt an object's PHI fields
   */
  encryptPHIObject(obj, phiFields) {
    if (!securityConfig.compliance.hipaa.enabled || !securityConfig.compliance.hipaa.requireFieldLevelEncryption) {
      return obj;
    }

    const encrypted = { ...obj };
    
    phiFields.forEach(field => {
      const fieldValue = this.getNestedValue(encrypted, field);
      if (fieldValue) {
        this.setNestedValue(encrypted, field, this.encryptField(fieldValue));
      }
    });
    
    return encrypted;
  }

  /**
   * Decrypt an object's PHI fields
   */
  decryptPHIObject(obj, phiFields) {
    if (!securityConfig.compliance.hipaa.enabled) {
      return obj;
    }

    const decrypted = { ...obj };
    
    phiFields.forEach(field => {
      const fieldValue = this.getNestedValue(decrypted, field);
      if (fieldValue && typeof fieldValue === 'object' && fieldValue.encrypted) {
        this.setNestedValue(decrypted, field, this.decryptField(fieldValue));
      }
    });
    
    return decrypted;
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}

// Create singleton instance
const encryptionService = new EncryptionService();

module.exports = encryptionService;
