/**
 * User's departments service (Plan Phase 2).
 * Returns department IDs the user has access to via TenantDepartmentAccess.
 * Used for filtering workspaces/projects and visibility.
 */
const TenantDepartmentAccess = require('../../models/TenantDepartmentAccess');

/**
 * Get list of department IDs the user has active access to (tenant-scoped).
 * @param {string|ObjectId} tenantId
 * @param {string|ObjectId} userId
 * @returns {Promise<string[]>} Array of department ID strings
 */
async function getUserDepartmentIds(tenantId, userId) {
  if (!tenantId || !userId) return [];
  const list = await TenantDepartmentAccess.findActiveForUser(tenantId, userId);
  const ids = list
    .map((d) => (d.departmentId && (d.departmentId._id || d.departmentId))?.toString())
    .filter(Boolean);
  return [...new Set(ids)];
}

/**
 * Check if we should apply department-based visibility for this user in this tenant.
 * When user has at least one TenantDepartmentAccess record, apply filter; otherwise show all (backward compat).
 * @param {string|ObjectId} tenantId
 * @param {string|ObjectId} userId
 * @returns {Promise<boolean>}
 */
async function shouldFilterByDepartment(tenantId, userId) {
  if (!tenantId || !userId) return false;
  const count = await TenantDepartmentAccess.countDocuments({
    tenantId,
    userId,
    status: 'active',
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }]
  });
  return count > 0;
}

module.exports = {
  getUserDepartmentIds,
  shouldFilterByDepartment
};
