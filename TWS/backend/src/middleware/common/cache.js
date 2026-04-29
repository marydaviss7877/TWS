const cacheService = require('../../services/core/cache.service');

/**
 * Caching Middleware for Tenant Routes
 * Caches API responses to improve performance
 */

/**
 * Cache middleware
 * @param {number} ttl - Time to live in seconds (default: 1800 = 30 minutes)
 * @param {function} keyGenerator - Optional function to generate cache key
 * @returns {Function} Express middleware
 */
const cache = (ttl = 1800, keyGenerator = null) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if bypassCache query param is present
    if (req.query.bypassCache === 'true') {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator 
        ? keyGenerator(req)
        : `cache:tenant:${req.path}:${JSON.stringify(req.query)}:${req.tenantContext?.tenantSlug || ''}`;

      // Try to get from cache
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function(data) {
        // Cache successful responses only
        if (data.success !== false) {
          cacheService.set(cacheKey, data, ttl).catch(err => {
            console.error('Cache set error:', err);
            // Don't fail request if caching fails
          });
        }
        originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching if there's an error
      next();
    }
  };
};

/**
 * Invalidate cache for a pattern
 * @param {string} pattern - Cache key pattern to invalidate
 */
const invalidateCache = async (pattern) => {
  try {
    await cacheService.invalidatePattern(pattern);
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

/**
 * Invalidate cache for student-related data
 */
const invalidateStudentCache = async (tenantSlug, studentId = null) => {
  const patterns = [
    `cache:tenant:*students*:${tenantSlug}*`,
    `cache:tenant:*student*:${tenantSlug}*`
  ];
  
  if (studentId) {
    patterns.push(`cache:tenant:*student*${studentId}*:${tenantSlug}*`);
  }
  
  for (const pattern of patterns) {
    await invalidateCache(pattern);
  }
};

/**
 * Invalidate cache for grade-related data
 */
const invalidateGradeCache = async (tenantSlug, studentId = null) => {
  const patterns = [
    `cache:tenant:*grades*:${tenantSlug}*`,
    `cache:tenant:*transcript*:${tenantSlug}*`
  ];
  
  if (studentId) {
    patterns.push(`cache:tenant:*grades*${studentId}*:${tenantSlug}*`);
  }
  
  for (const pattern of patterns) {
    await invalidateCache(pattern);
  }
};

module.exports = {
  cache,
  invalidateCache,
  invalidateStudentCache,
  invalidateGradeCache
};
