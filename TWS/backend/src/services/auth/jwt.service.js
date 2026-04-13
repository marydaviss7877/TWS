const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const envConfig = require('../../config/environment');

/**
 * Secure JWT Service
 * Handles token generation, validation, and refresh with security best practices
 */
class JWTService {
  constructor() {
    this.jwtConfig = envConfig.getJWTConfig();
    this.tokenBlacklist = new Set();
    this.refreshTokenStore = new Map(); // In production, use Redis
  }

  /**
   * Generate access and refresh tokens
   */
  generateTokens(userId, additionalPayload = {}) {
    const payload = {
      userId,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      ...additionalPayload
    };

    const refreshPayload = {
      userId,
      type: 'refresh',
      jti: crypto.randomUUID(), // JWT ID for tracking
      iat: Math.floor(Date.now() / 1000),
      ...additionalPayload
    };

    const accessToken = jwt.sign(payload, this.jwtConfig.secret, {
      expiresIn: this.jwtConfig.expiresIn,
      issuer: 'tws-backend',
      audience: 'tws-frontend'
    });

    const refreshToken = jwt.sign(refreshPayload, this.jwtConfig.refreshSecret, {
      expiresIn: this.jwtConfig.refreshExpiresIn,
      issuer: 'tws-backend',
      audience: 'tws-frontend'
    });

    // Store refresh token for validation
    this.refreshTokenStore.set(refreshPayload.jti, {
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.parseExpiry(this.jwtConfig.refreshExpiresIn))
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiry(this.jwtConfig.expiresIn),
      refreshExpiresIn: this.parseExpiry(this.jwtConfig.refreshExpiresIn)
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtConfig.secret, {
        issuer: 'tws-backend',
        audience: 'tws-frontend'
      });

      // Check if token is blacklisted
      if (this.tokenBlacklist.has(token)) {
        throw new Error('Token has been revoked');
      }

      // Validate token type
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      // Preserve TokenExpiredError so middleware can return TOKEN_EXPIRED / "Token expired"
      // and clients (e.g. tenant fetch retry) can trigger refresh. Wrapping in Error loses .name.
      if (error.name === 'TokenExpiredError') {
        throw error;
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtConfig.refreshSecret, {
        issuer: 'tws-backend',
        audience: 'tws-frontend'
      });

      // Validate token type
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token exists in store
      const storedToken = this.refreshTokenStore.get(decoded.jti);
      if (!storedToken) {
        throw new Error('Refresh token not found');
      }

      // Check if refresh token is expired
      if (new Date() > storedToken.expiresAt) {
        this.refreshTokenStore.delete(decoded.jti);
        throw new Error('Refresh token expired');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken) {
    const decoded = this.verifyRefreshToken(refreshToken);
    
    // Generate new tokens
    const newTokens = this.generateTokens(decoded.userId);
    
    // Revoke old refresh token
    this.revokeRefreshToken(decoded.jti);
    
    return newTokens;
  }

  /**
   * Revoke access token (add to blacklist)
   */
  revokeAccessToken(token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        // Only blacklist if token hasn't expired
        const expirationTime = decoded.exp * 1000;
        if (Date.now() < expirationTime) {
          this.tokenBlacklist.add(token);
        }
      }
    } catch (error) {
      console.error('Error revoking access token:', error);
    }
  }

  /**
   * Revoke refresh token
   */
  revokeRefreshToken(jti) {
    this.refreshTokenStore.delete(jti);
  }

  /**
   * Revoke all tokens for a user
   */
  revokeAllUserTokens(userId) {
    // Remove all refresh tokens for user
    for (const [jti, tokenData] of this.refreshTokenStore.entries()) {
      if (tokenData.userId === userId) {
        this.refreshTokenStore.delete(jti);
      }
    }

    // Note: Access tokens will expire naturally
    // In production, you might want to maintain a user-based blacklist
  }

  /**
   * Clean up expired tokens
   */
  cleanupExpiredTokens() {
    const now = new Date();
    
    // Clean up expired refresh tokens
    for (const [jti, tokenData] of this.refreshTokenStore.entries()) {
      if (now > tokenData.expiresAt) {
        this.refreshTokenStore.delete(jti);
      }
    }

    // Clean up expired blacklisted tokens
    // This is a simplified approach - in production, use Redis with TTL
    if (this.tokenBlacklist.size > 1000) {
      this.tokenBlacklist.clear();
    }
  }

  /**
   * Parse expiry string to milliseconds
   */
  parseExpiry(expiry) {
    const units = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000
    };

    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 15 * 60 * 1000; // Default 15 minutes
    }

    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash token for storage
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Get token statistics
   */
  getTokenStats() {
    return {
      activeRefreshTokens: this.refreshTokenStore.size,
      blacklistedTokens: this.tokenBlacklist.size,
      lastCleanup: new Date()
    };
  }
}

// Create singleton instance
const jwtService = new JWTService();

// Cleanup expired tokens every hour
setInterval(() => {
  jwtService.cleanupExpiredTokens();
}, 60 * 60 * 1000);

module.exports = jwtService;
