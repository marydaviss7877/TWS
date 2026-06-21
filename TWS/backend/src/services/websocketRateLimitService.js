const envConfig = require('../config/environment-validator');
const auditService = require('./compliance/audit.service');

// In-memory rate-limit counters replacing Redis
const _counters = new Map(); // key -> { value, expiresAt }
function _incr(key) {
  const entry = _counters.get(key);
  if (!entry || Date.now() > entry.expiresAt) return 1; // reset
  entry.value++;
  return entry.value;
}
const redisNoop = {
  incr:    async (key)           => { const e = _counters.get(key); const v = e && Date.now() <= e.expiresAt ? e.value + 1 : 1; _counters.set(key, { value: v, expiresAt: e?.expiresAt || Date.now() + 60000 }); return v; },
  incrby:  async ()              => 0,
  expire:  async (key, ttl)      => { const e = _counters.get(key); if (e) e.expiresAt = Date.now() + ttl * 1000; return 'OK'; },
  sadd:    async (key, member)   => { const s = _counters.get(key)?.value || new Set(); s.add(member); _counters.set(key, { value: s, expiresAt: Date.now() + 3600000 }); return 1; },
  srem:    async (key, member)   => { const s = _counters.get(key)?.value; if (s) s.delete(member); return 0; },
  scard:   async (key)           => { const s = _counters.get(key)?.value; return s instanceof Set ? s.size : 0; },
  smembers:async (key)           => { const s = _counters.get(key)?.value; return s instanceof Set ? [...s] : []; },
  setex:   async (key, ttl, val) => { _counters.set(key, { value: val, expiresAt: Date.now() + ttl * 1000 }); return 'OK'; },
  get:     async (key)           => { const e = _counters.get(key); return (e && Date.now() <= e.expiresAt) ? e.value : null; },
  exists:  async (key)           => { const e = _counters.get(key); return (e && Date.now() <= e.expiresAt) ? 1 : 0; },
  info:    async ()              => '# Memory\nused_memory:0\n'
};

/**
 * WebSocket Rate Limiting Service
 * Implements rate limiting for WebSocket connections and events
 */
class WebSocketRateLimitService {
  constructor() {
    this.redis = redisNoop;
    this.rateLimits = {
      // Connection limits
      connections: {
        windowMs: 60 * 1000, // 1 minute
        maxConnections: 10, // Max 10 connections per IP per minute
        maxConcurrent: 5 // Max 5 concurrent connections per user
      },
      
      // Message limits
      messages: {
        windowMs: 60 * 1000, // 1 minute
        maxMessages: 100, // Max 100 messages per user per minute
        burstLimit: 10 // Max 10 messages in 10 seconds
      },
      
      // Typing indicators
      typing: {
        windowMs: 10 * 1000, // 10 seconds
        maxEvents: 5 // Max 5 typing events per 10 seconds
      },
      
      // Reactions
      reactions: {
        windowMs: 60 * 1000, // 1 minute
        maxReactions: 50 // Max 50 reactions per user per minute
      },
      
      // File uploads
      uploads: {
        windowMs: 60 * 1000, // 1 minute
        maxUploads: 10, // Max 10 uploads per user per minute
        maxSize: 100 * 1024 * 1024 // Max 100MB per minute
      },
      
      // Search requests
      search: {
        windowMs: 60 * 1000, // 1 minute
        maxSearches: 20 // Max 20 searches per user per minute
      }
    };

    this.blockedIPs = new Set();
    this.blockedUsers = new Set();
  }

  /**
   * Check connection rate limit
   */
  async checkConnectionLimit(socket, userId = null) {
    const ip = socket.handshake.address;
    const key = `ws:conn:${ip}`;
    const userKey = userId ? `ws:user:${userId}` : null;

    try {
      // Check IP-based connection limit
      const ipConnections = await this.redis.incr(key);
      if (ipConnections === 1) {
        await this.redis.expire(key, Math.ceil(this.rateLimits.connections.windowMs / 1000));
      }

      if (ipConnections > this.rateLimits.connections.maxConnections) {
        await this.logRateLimitViolation('connection', ip, userId, {
          connections: ipConnections,
          limit: this.rateLimits.connections.maxConnections
        });
        return { allowed: false, reason: 'Too many connections from IP' };
      }

      // Check user-based concurrent connection limit
      if (userKey) {
        const userConnections = await this.redis.scard(userKey);
        if (userConnections >= this.rateLimits.connections.maxConcurrent) {
          await this.logRateLimitViolation('concurrent_connection', ip, userId, {
            connections: userConnections,
            limit: this.rateLimits.connections.maxConcurrent
          });
          return { allowed: false, reason: 'Too many concurrent connections' };
        }

        // Add connection to user set
        await this.redis.sadd(userKey, socket.id);
        await this.redis.expire(userKey, 3600); // 1 hour
      }

      return { allowed: true };

    } catch (error) {
      console.error('Connection rate limit check failed:', error);
      return { allowed: true }; // Fail open
    }
  }

  /**
   * Check message rate limit
   */
  async checkMessageLimit(userId, chatId = null) {
    const key = `ws:msg:${userId}`;
    const burstKey = `ws:burst:${userId}`;

    try {
      // Check per-minute limit
      const messages = await this.redis.incr(key);
      if (messages === 1) {
        await this.redis.expire(key, Math.ceil(this.rateLimits.messages.windowMs / 1000));
      }

      if (messages > this.rateLimits.messages.maxMessages) {
        await this.logRateLimitViolation('message', null, userId, {
          messages,
          limit: this.rateLimits.messages.maxMessages,
          chatId
        });
        return { allowed: false, reason: 'Message rate limit exceeded' };
      }

      // Check burst limit (10 messages in 10 seconds)
      const burstMessages = await this.redis.incr(burstKey);
      if (burstMessages === 1) {
        await this.redis.expire(burstKey, 10);
      }

      if (burstMessages > this.rateLimits.messages.burstLimit) {
        await this.logRateLimitViolation('message_burst', null, userId, {
          burstMessages,
          limit: this.rateLimits.messages.burstLimit,
          chatId
        });
        return { allowed: false, reason: 'Message burst limit exceeded' };
      }

      return { allowed: true };

    } catch (error) {
      console.error('Message rate limit check failed:', error);
      return { allowed: true }; // Fail open
    }
  }

  /**
   * Check typing indicator rate limit
   */
  async checkTypingLimit(userId) {
    const key = `ws:typing:${userId}`;

    try {
      const events = await this.redis.incr(key);
      if (events === 1) {
        await this.redis.expire(key, Math.ceil(this.rateLimits.typing.windowMs / 1000));
      }

      if (events > this.rateLimits.typing.maxEvents) {
        return { allowed: false, reason: 'Typing rate limit exceeded' };
      }

      return { allowed: true };

    } catch (error) {
      console.error('Typing rate limit check failed:', error);
      return { allowed: true }; // Fail open
    }
  }

  /**
   * Check reaction rate limit
   */
  async checkReactionLimit(userId) {
    const key = `ws:reaction:${userId}`;

    try {
      const reactions = await this.redis.incr(key);
      if (reactions === 1) {
        await this.redis.expire(key, Math.ceil(this.rateLimits.reactions.windowMs / 1000));
      }

      if (reactions > this.rateLimits.reactions.maxReactions) {
        await this.logRateLimitViolation('reaction', null, userId, {
          reactions,
          limit: this.rateLimits.reactions.maxReactions
        });
        return { allowed: false, reason: 'Reaction rate limit exceeded' };
      }

      return { allowed: true };

    } catch (error) {
      console.error('Reaction rate limit check failed:', error);
      return { allowed: true }; // Fail open
    }
  }

  /**
   * Check file upload rate limit
   */
  async checkUploadLimit(userId, fileSize = 0) {
    const key = `ws:upload:${userId}`;
    const sizeKey = `ws:upload_size:${userId}`;

    try {
      // Check upload count
      const uploads = await this.redis.incr(key);
      if (uploads === 1) {
        await this.redis.expire(key, Math.ceil(this.rateLimits.uploads.windowMs / 1000));
      }

      if (uploads > this.rateLimits.uploads.maxUploads) {
        await this.logRateLimitViolation('upload', null, userId, {
          uploads,
          limit: this.rateLimits.uploads.maxUploads
        });
        return { allowed: false, reason: 'Upload rate limit exceeded' };
      }

      // Check upload size
      const totalSize = await this.redis.incrby(sizeKey, fileSize);
      if (totalSize === fileSize) {
        await this.redis.expire(sizeKey, Math.ceil(this.rateLimits.uploads.windowMs / 1000));
      }

      if (totalSize > this.rateLimits.uploads.maxSize) {
        await this.logRateLimitViolation('upload_size', null, userId, {
          totalSize,
          limit: this.rateLimits.uploads.maxSize
        });
        return { allowed: false, reason: 'Upload size limit exceeded' };
      }

      return { allowed: true };

    } catch (error) {
      console.error('Upload rate limit check failed:', error);
      return { allowed: true }; // Fail open
    }
  }

  /**
   * Check search rate limit
   */
  async checkSearchLimit(userId) {
    const key = `ws:search:${userId}`;

    try {
      const searches = await this.redis.incr(key);
      if (searches === 1) {
        await this.redis.expire(key, Math.ceil(this.rateLimits.search.windowMs / 1000));
      }

      if (searches > this.rateLimits.search.maxSearches) {
        await this.logRateLimitViolation('search', null, userId, {
          searches,
          limit: this.rateLimits.search.maxSearches
        });
        return { allowed: false, reason: 'Search rate limit exceeded' };
      }

      return { allowed: true };

    } catch (error) {
      console.error('Search rate limit check failed:', error);
      return { allowed: true }; // Fail open
    }
  }

  /**
   * Remove connection from user tracking
   */
  async removeConnection(userId, socketId) {
    if (!userId) return;

    try {
      const userKey = `ws:user:${userId}`;
      await this.redis.srem(userKey, socketId);
    } catch (error) {
      console.error('Failed to remove connection tracking:', error);
    }
  }

  /**
   * Block IP address
   */
  async blockIP(ip, duration = 3600) { // 1 hour default
    try {
      const key = `ws:blocked:${ip}`;
      await this.redis.setex(key, duration, 'blocked');
      this.blockedIPs.add(ip);
    } catch (error) {
      console.error('Failed to block IP:', error);
    }
  }

  /**
   * Block user
   */
  async blockUser(userId, duration = 3600) { // 1 hour default
    try {
      const key = `ws:blocked_user:${userId}`;
      await this.redis.setex(key, duration, 'blocked');
      this.blockedUsers.add(userId);
    } catch (error) {
      console.error('Failed to block user:', error);
    }
  }

  /**
   * Check if IP is blocked
   */
  async isIPBlocked(ip) {
    try {
      const key = `ws:blocked:${ip}`;
      const blocked = await this.redis.get(key);
      return !!blocked;
    } catch (error) {
      console.error('Failed to check IP block status:', error);
      return false;
    }
  }

  /**
   * Check if user is blocked
   */
  async isUserBlocked(userId) {
    try {
      const key = `ws:blocked_user:${userId}`;
      const blocked = await this.redis.get(key);
      return !!blocked;
    } catch (error) {
      console.error('Failed to check user block status:', error);
      return false;
    }
  }

  /**
   * Log rate limit violation
   */
  async logRateLimitViolation(type, ip, userId, details) {
    try {
      await auditService.logSecurityEvent(
        auditService.auditActions.RATE_LIMIT_EXCEEDED,
        userId,
        null,
        {
          reason: `WebSocket ${type} rate limit exceeded`,
          details: {
            type,
            ip,
            ...details
          },
          ipAddress: ip,
          severity: 'medium'
        }
      );
    } catch (error) {
      console.error('Failed to log rate limit violation:', error);
    }
  }

  /**
   * Get rate limit statistics
   */
  async getStats() {
    try {
      const stats = {
        blockedIPs: this.blockedIPs.size,
        blockedUsers: this.blockedUsers.size,
        rateLimits: this.rateLimits
      };

      // Get Redis stats
      const info = await this.redis.info('memory');
      stats.redisMemory = info;

      return stats;
    } catch (error) {
      console.error('Failed to get rate limit stats:', error);
      return { error: 'Failed to get stats' };
    }
  }

  /**
   * Update rate limits
   */
  updateRateLimits(newLimits) {
    this.rateLimits = { ...this.rateLimits, ...newLimits };
  }

  /**
   * Cleanup expired data
   */
  async cleanup() {
    try {
      // Clean up blocked IPs and users
      for (const ip of this.blockedIPs) {
        const key = `ws:blocked:${ip}`;
        const exists = await this.redis.exists(key);
        if (!exists) {
          this.blockedIPs.delete(ip);
        }
      }

      for (const userId of this.blockedUsers) {
        const key = `ws:blocked_user:${userId}`;
        const exists = await this.redis.exists(key);
        if (!exists) {
          this.blockedUsers.delete(userId);
        }
      }
    } catch (error) {
      console.error('Rate limit cleanup failed:', error);
    }
  }
}

// Create singleton instance
const websocketRateLimitService = new WebSocketRateLimitService();

// Cleanup every 5 minutes
setInterval(() => {
  websocketRateLimitService.cleanup();
}, 5 * 60 * 1000);

module.exports = websocketRateLimitService;
