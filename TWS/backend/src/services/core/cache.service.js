/**
 * Cache Service — in-memory Map with TTL.
 * Redis dependency removed.
 */

class CacheService {
  constructor() {
    this.initialized = false;
    this.cache = new Map();
    this.ttlMap = new Map();
  }

  async initialize() {
    if (this.initialized) return;
    this.cleanupInterval = setInterval(() => this.cleanupExpired(), 60000);
    console.log('🗄️  Cache Service initialized (in-memory)');
    this.initialized = true;
  }

  async set(key, value, ttlSeconds = 3600) {
    if (!this.initialized) await this.initialize();
    this.cache.set(key, value);
    if (ttlSeconds > 0) {
      this.ttlMap.set(key, Date.now() + ttlSeconds * 1000);
    }
    return true;
  }

  async get(key) {
    if (!this.initialized) await this.initialize();
    if (this.ttlMap.has(key) && Date.now() > this.ttlMap.get(key)) {
      this.cache.delete(key);
      this.ttlMap.delete(key);
      return null;
    }
    return this.cache.get(key) ?? null;
  }

  async delete(key) {
    this.cache.delete(key);
    this.ttlMap.delete(key);
    return true;
  }

  async invalidatePattern(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) { this.cache.delete(key); this.ttlMap.delete(key); deleted++; }
    }
    return deleted;
  }

  async clear() {
    this.cache.clear();
    this.ttlMap.clear();
    return true;
  }

  async has(key) {
    if (this.ttlMap.has(key) && Date.now() > this.ttlMap.get(key)) {
      this.cache.delete(key); this.ttlMap.delete(key); return false;
    }
    return this.cache.has(key);
  }

  cleanupExpired() {
    const now = Date.now();
    for (const [key, expiresAt] of this.ttlMap.entries()) {
      if (now > expiresAt) { this.cache.delete(key); this.ttlMap.delete(key); }
    }
  }

  async healthCheck() { return this.initialized; }

  async getMetrics() {
    return { status: 'active', initialized: this.initialized, cacheSize: this.cache.size };
  }

  async shutdown() {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.cache.clear(); this.ttlMap.clear(); this.initialized = false;
    console.log('🗄️  Cache Service shut down');
  }
}

module.exports = new CacheService();
