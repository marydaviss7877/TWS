const jwt = require('jsonwebtoken');

/**
 * Token Blacklist Service — in-memory Map (no Redis dependency).
 */
class TokenBlacklistService {
  constructor() {
    this.tokenBlacklist = new Map(); // token/jti -> { expiresAt }
  }

  async blacklistToken(token, expiresIn = null) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded?.exp) return false;

      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp <= now) return false;

      const ttl = expiresIn || (decoded.exp - now);
      this.tokenBlacklist.set(token, { expiresAt: Date.now() + ttl * 1000 });
      return true;
    } catch { return false; }
  }

  async isTokenBlacklisted(token) {
    const entry = this.tokenBlacklist.get(token);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) { this.tokenBlacklist.delete(token); return false; }
    return true;
  }

  async blacklistRefreshToken(jti, expiresIn = 7 * 24 * 60 * 60) {
    this.tokenBlacklist.set(`refresh:${jti}`, { expiresAt: Date.now() + expiresIn * 1000 });
    return true;
  }

  async isRefreshTokenBlacklisted(jti) {
    const entry = this.tokenBlacklist.get(`refresh:${jti}`);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) { this.tokenBlacklist.delete(`refresh:${jti}`); return false; }
    return true;
  }

  cleanupExpiredTokens() {
    const now = Date.now();
    for (const [key, entry] of this.tokenBlacklist.entries()) {
      if (now > entry.expiresAt) this.tokenBlacklist.delete(key);
    }
  }
}

const tokenBlacklistService = new TokenBlacklistService();
setInterval(() => tokenBlacklistService.cleanupExpiredTokens(), 60 * 60 * 1000);

module.exports = tokenBlacklistService;
