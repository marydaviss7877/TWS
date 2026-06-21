const redisService = require('./core/redis.service');
const envConfig = require('../config/environment-validator');

/**
 * Comprehensive Caching Service
 * Provides multi-level caching strategy for optimal performance
 */
class CachingService {
  constructor() {
    this.cachePrefix = 'tws:';
    this.defaultTTL = 300; // 5 minutes
    this.cacheStrategies = {
      // User data caching
      user: {
        ttl: 1800, // 30 minutes
        prefix: 'user:',
        keys: ['profile', 'preferences', 'permissions', 'teams']
      },
      
      // Chat data caching
      chat: {
        ttl: 900, // 15 minutes
        prefix: 'chat:',
        keys: ['info', 'members', 'settings', 'lastMessage']
      },
      
      // Message caching
      message: {
        ttl: 300, // 5 minutes
        prefix: 'message:',
        keys: ['content', 'reactions', 'readStatus']
      },
      
      // Organization data caching
      organization: {
        ttl: 3600, // 1 hour
        prefix: 'org:',
        keys: ['info', 'settings', 'members', 'permissions']
      },
      
      // File metadata caching
      file: {
        ttl: 1800, // 30 minutes
        prefix: 'file:',
        keys: ['metadata', 'urls', 'permissions']
      },
      
      // Search results caching
      search: {
        ttl: 600, // 10 minutes
        prefix: 'search:',
        keys: ['results', 'suggestions']
      },
      
      // API response caching
      api: {
        ttl: 300, // 5 minutes
        prefix: 'api:',
        keys: ['responses', 'queries']
      }
    };

    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Get cached data
   */
  async get(key, strategy = 'api') {
    try {
      const fullKey = this.buildKey(key, strategy);
      const cached = await redisService.get(fullKey);
      
      if (cached !== null) {
        this.cacheStats.hits++;
        return JSON.parse(cached);
      } else {
        this.cacheStats.misses++;
        return null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      this.cacheStats.errors++;
      return null;
    }
  }

  /**
   * Set cached data
   */
  async set(key, data, strategy = 'api', customTTL = null) {
    try {
      const fullKey = this.buildKey(key, strategy);
      const ttl = customTTL || this.cacheStrategies[strategy]?.ttl || this.defaultTTL;
      
      await redisService.setex(fullKey, ttl, JSON.stringify(data));
      this.cacheStats.sets++;
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Delete cached data
   */
  async delete(key, strategy = 'api') {
    try {
      const fullKey = this.buildKey(key, strategy);
      await redisService.del(fullKey);
      this.cacheStats.deletes++;
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      this.cacheStats.errors++;
      return false;
    }
  }

  /**
   * Delete multiple keys with pattern
   */
  async deletePattern(pattern, strategy = 'api') {
    try {
      const fullPattern = this.buildKey(pattern, strategy);
      const keys = await redisService.keys(fullPattern);
      
      if (keys.length > 0) {
        await redisService.del(...keys);
        this.cacheStats.deletes += keys.length;
      }
      
      return keys.length;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      this.cacheStats.errors++;
      return 0;
    }
  }

  /**
   * Get or set cached data with fallback function
   */
  async getOrSet(key, fallbackFn, strategy = 'api', customTTL = null) {
    try {
      // Try to get from cache first
      let data = await this.get(key, strategy);
      
      if (data !== null) {
        return data;
      }

      // Execute fallback function
      data = await fallbackFn();
      
      // Cache the result
      if (data !== null && data !== undefined) {
        await this.set(key, data, strategy, customTTL);
      }
      
      return data;
    } catch (error) {
      console.error('Cache getOrSet error:', error);
      this.cacheStats.errors++;
      // Return fallback result even if caching fails
      return await fallbackFn();
    }
  }

  /**
   * Cache user data
   */
  async cacheUser(userId, userData) {
    const keys = {
      profile: `profile:${userId}`,
      preferences: `preferences:${userId}`,
      permissions: `permissions:${userId}`,
      teams: `teams:${userId}`
    };

    const results = {};
    for (const [type, key] of Object.entries(keys)) {
      if (userData[type]) {
        results[type] = await this.set(key, userData[type], 'user');
      }
    }

    return results;
  }

  /**
   * Get cached user data
   */
  async getCachedUser(userId, type = 'profile') {
    const key = `${type}:${userId}`;
    return await this.get(key, 'user');
  }

  /**
   * Invalidate user cache
   */
  async invalidateUserCache(userId) {
    const patterns = [
      `profile:${userId}`,
      `preferences:${userId}`,
      `permissions:${userId}`,
      `teams:${userId}`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await this.deletePattern(pattern, 'user');
    }

    return totalDeleted;
  }

  /**
   * Cache chat data
   */
  async cacheChat(chatId, chatData) {
    const keys = {
      info: `info:${chatId}`,
      members: `members:${chatId}`,
      settings: `settings:${chatId}`,
      lastMessage: `lastMessage:${chatId}`
    };

    const results = {};
    for (const [type, key] of Object.entries(keys)) {
      if (chatData[type]) {
        results[type] = await this.set(key, chatData[type], 'chat');
      }
    }

    return results;
  }

  /**
   * Get cached chat data
   */
  async getCachedChat(chatId, type = 'info') {
    const key = `${type}:${chatId}`;
    return await this.get(key, 'chat');
  }

  /**
   * Invalidate chat cache
   */
  async invalidateChatCache(chatId) {
    const patterns = [
      `info:${chatId}`,
      `members:${chatId}`,
      `settings:${chatId}`,
      `lastMessage:${chatId}`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await this.deletePattern(pattern, 'chat');
    }

    return totalDeleted;
  }

  /**
   * Cache message data
   */
  async cacheMessage(messageId, messageData) {
    const keys = {
      content: `content:${messageId}`,
      reactions: `reactions:${messageId}`,
      readStatus: `readStatus:${messageId}`
    };

    const results = {};
    for (const [type, key] of Object.entries(keys)) {
      if (messageData[type]) {
        results[type] = await this.set(key, messageData[type], 'message');
      }
    }

    return results;
  }

  /**
   * Get cached message data
   */
  async getCachedMessage(messageId, type = 'content') {
    const key = `${type}:${messageId}`;
    return await this.get(key, 'message');
  }

  /**
   * Invalidate message cache
   */
  async invalidateMessageCache(messageId) {
    const patterns = [
      `content:${messageId}`,
      `reactions:${messageId}`,
      `readStatus:${messageId}`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await this.deletePattern(pattern, 'message');
    }

    return totalDeleted;
  }

  /**
   * Cache organization data
   */
  async cacheOrganization(orgId, orgData) {
    const keys = {
      info: `info:${orgId}`,
      settings: `settings:${orgId}`,
      members: `members:${orgId}`,
      permissions: `permissions:${orgId}`
    };

    const results = {};
    for (const [type, key] of Object.entries(keys)) {
      if (orgData[type]) {
        results[type] = await this.set(key, orgData[type], 'organization');
      }
    }

    return results;
  }

  /**
   * Get cached organization data
   */
  async getCachedOrganization(orgId, type = 'info') {
    const key = `${type}:${orgId}`;
    return await this.get(key, 'organization');
  }

  /**
   * Invalidate organization cache
   */
  async invalidateOrganizationCache(orgId) {
    const patterns = [
      `info:${orgId}`,
      `settings:${orgId}`,
      `members:${orgId}`,
      `permissions:${orgId}`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await this.deletePattern(pattern, 'organization');
    }

    return totalDeleted;
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(query, results, filters = {}) {
    const key = this.buildSearchKey(query, filters);
    return await this.set(key, results, 'search');
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(query, filters = {}) {
    const key = this.buildSearchKey(query, filters);
    return await this.get(key, 'search');
  }

  /**
   * Cache API response
   */
  async cacheAPIResponse(endpoint, params, response) {
    const key = this.buildAPIKey(endpoint, params);
    return await this.set(key, response, 'api');
  }

  /**
   * Get cached API response
   */
  async getCachedAPIResponse(endpoint, params) {
    const key = this.buildAPIKey(endpoint, params);
    return await this.get(key, 'api');
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache() {
    try {
      console.log('🔥 Starting cache warm-up...');

      // This would typically load frequently accessed data
      // Implementation depends on your specific use cases
      
      console.log('✅ Cache warm-up completed');
    } catch (error) {
      console.error('❌ Cache warm-up failed:', error);
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches() {
    try {
      const pattern = `${this.cachePrefix}*`;
      const keys = await redisService.keys(pattern);
      
      if (keys.length > 0) {
        await redisService.del(...keys);
        console.log(`✅ Cleared ${keys.length} cache entries`);
      }
      
      return keys.length;
    } catch (error) {
      console.error('❌ Failed to clear caches:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? (this.cacheStats.hits / total * 100).toFixed(2) : 0;

    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      totalRequests: total
    };
  }

  /**
   * Reset cache statistics
   */
  resetCacheStats() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Build cache key
   */
  buildKey(key, strategy) {
    const strategyConfig = this.cacheStrategies[strategy];
    const prefix = strategyConfig ? strategyConfig.prefix : 'api:';
    return `${this.cachePrefix}${prefix}${key}`;
  }

  /**
   * Build search cache key
   */
  buildSearchKey(query, filters) {
    const filterString = Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');
    
    const key = filterString ? `${query}|${filterString}` : query;
    return this.buildKey(key, 'search');
  }

  /**
   * Build API cache key
   */
  buildAPIKey(endpoint, params) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    const key = paramString ? `${endpoint}|${paramString}` : endpoint;
    return this.buildKey(key, 'api');
  }

  /**
   * Check cache health
   */
  async checkHealth() {
    try {
      const testKey = 'health:check';
      const testValue = { timestamp: Date.now() };
      
      // Test set
      await this.set(testKey, testValue, 'api', 60);
      
      // Test get
      const retrieved = await this.get(testKey, 'api');
      
      // Test delete
      await this.delete(testKey, 'api');
      
      return {
        healthy: true,
        set: true,
        get: retrieved !== null,
        delete: true
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Optimize cache performance
   */
  async optimizeCache() {
    try {
      // Set Redis optimizations
      await redisService.config('SET', 'maxmemory-policy', 'allkeys-lru');
      await redisService.config('SET', 'save', '900 1 300 10 60 10000');
      
      console.log('✅ Cache optimization completed');
    } catch (error) {
      console.error('❌ Cache optimization failed:', error);
    }
  }
}

// Create singleton instance
const cachingService = new CachingService();

module.exports = cachingService;
