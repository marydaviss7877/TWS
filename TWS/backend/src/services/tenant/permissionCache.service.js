/**
 * Permission cache and revocation list — in-memory only (no Redis).
 * resolved:{tenantId}:{userId} → permissions, TTL 15 min (aligns with JWT).
 * revoked:{tenantId}:{userId}  → flagged users.
 */

const RESOLVED_PREFIX = 'resolved:';
const REVOKED_PREFIX  = 'revoked:';
const TTL_SECONDS     = 900; // 15 min

const memoryResolved = new Map(); // key -> { data, expiresAt }
const memoryRevoked  = new Set(); // "tenantId:userId"

// No-op — kept for API compatibility (callers that call init() won't break)
function init() {}

function getResolvedFromMemory(key) {
  const entry = memoryResolved.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    memoryResolved.delete(key);
    return null;
  }
  return typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data);
}

function setResolvedMemory(key, value, ttlSeconds) {
  memoryResolved.set(key, { data: value, expiresAt: Date.now() + ttlSeconds * 1000 });
  if (ttlSeconds > 0) setTimeout(() => memoryResolved.delete(key), ttlSeconds * 1000);
}

async function getResolved(tenantId, userId) {
  return getResolvedFromMemory(RESOLVED_PREFIX + tenantId + ':' + userId);
}

async function setResolved(tenantId, userId, payload, ttlSeconds = TTL_SECONDS) {
  const value = typeof payload === 'string' ? payload : JSON.stringify(payload);
  setResolvedMemory(RESOLVED_PREFIX + tenantId + ':' + userId, value, ttlSeconds);
}

async function delResolved(tenantId, userId) {
  memoryResolved.delete(RESOLVED_PREFIX + tenantId + ':' + userId);
}

async function delResolvedForTenant(tenantId) {
  for (const key of memoryResolved.keys()) {
    if (key.startsWith(RESOLVED_PREFIX + tenantId + ':')) memoryResolved.delete(key);
  }
}

async function addRevoked(tenantId, userId) {
  memoryRevoked.add(tenantId + ':' + userId);
}

async function removeRevoked(tenantId, userId) {
  memoryRevoked.delete(tenantId + ':' + userId);
}

async function isRevoked(tenantId, userId) {
  return memoryRevoked.has(tenantId + ':' + userId);
}

module.exports = {
  init, TTL_SECONDS,
  getResolved, setResolved, delResolved, delResolvedForTenant,
  addRevoked, removeRevoked, isRevoked
};
