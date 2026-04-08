/**
 * In-memory store replacing Redis.
 * Same interface as the old ioredis-backed config so all callers work unchanged.
 */

const store = new Map();   // key -> { value, expiresAt }

function _isExpired(entry) {
  return entry.expiresAt !== null && Date.now() > entry.expiresAt;
}

function _get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (_isExpired(entry)) { store.delete(key); return null; }
  return entry.value;
}

function _set(key, value, ttlSeconds = null) {
  store.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
  });
}

// In-memory client that mirrors the ioredis API surface used in this project
const memoryClient = {
  get:      async (key)                => _get(key),
  set:      async (key, value)         => { _set(key, value); return 'OK'; },
  setex:    async (key, ttl, value)    => { _set(key, value, ttl); return 'OK'; },
  del:      async (key)                => { store.delete(key); return 1; },
  exists:   async (key)                => (_get(key) !== null ? 1 : 0),
  expire:   async (key, ttl)           => {
    const entry = store.get(key);
    if (entry) { entry.expiresAt = Date.now() + ttl * 1000; }
    return entry ? 1 : 0;
  },
  keys:     async (pattern) => {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return [...store.keys()].filter(k => regex.test(k));
  },
  hget:     async (key, field)         => { const h = _get(key); return h ? h[field] ?? null : null; },
  hset:     async (key, field, value)  => { const h = _get(key) || {}; h[field] = value; _set(key, h); return 1; },
  hdel:     async (key, field)         => { const h = _get(key); if (h) { delete h[field]; _set(key, h); } return 1; },
  hgetall:  async (key)                => _get(key) || {},
  sadd:     async (key, member)        => { const s = _get(key) || new Set(); s.add(member); _set(key, s); return 1; },
  srem:     async (key, member)        => { const s = _get(key); if (s) s.delete(member); return 1; },
  smembers: async (key)                => { const s = _get(key); return s ? [...s] : []; },
  incr:     async (key)                => { const v = parseInt(_get(key) || '0') + 1; _set(key, String(v)); return v; },
  publish:  async ()                   => 0,
  subscribe: async ()                  => {},
  unsubscribe: async ()                => {}
};

// Cleanup expired keys every 5 minutes
setInterval(() => {
  for (const [key, entry] of store.entries()) {
    if (_isExpired(entry)) store.delete(key);
  }
}, 5 * 60 * 1000);

console.log('ℹ️  Redis replaced with in-memory store');

module.exports = {
  getRedis:         () => memoryClient,
  isRedisAvailable: () => false,   // always false → callers know to use fallback paths

  async get(key)                     { return memoryClient.get(key); },
  async set(key, value, ttl = null)  { return ttl ? memoryClient.setex(key, ttl, value) : memoryClient.set(key, value); },
  async del(key)                     { return memoryClient.del(key); },
  async exists(key)                  { return memoryClient.exists(key); }
};
