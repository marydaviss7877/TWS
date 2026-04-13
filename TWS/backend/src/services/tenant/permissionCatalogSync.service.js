/**
 * Copies enforced permission catalog entries into the Permission collection
 * so tenant role UIs (Create Role) can assign codes already validated by roles routes.
 */

const Permission = require('../../models/Permission');
const { buildPermissionCatalog } = require('./permissionCatalog.service');

const MAX_DESCRIPTION = 1000;

/**
 * Flatten catalog sections to unique codes (skip wildcard-only pseudo code).
 * @returns {{ code: string, description: string, permissionGroup: string }[]}
 */
function flattenCatalogForSync() {
  const catalog = buildPermissionCatalog();
  const sections = [
    ['softwareHouse', catalog.softwareHouse],
    ['organization', catalog.organization],
    ['organizationHrSubroles', catalog.organizationHrSubroles],
    ['organizationFinanceSubroles', catalog.organizationFinanceSubroles]
  ];
  const byCode = new Map();

  for (const [groupKey, section] of sections) {
    const title = section?.title || groupKey;
    for (const row of section?.entries || []) {
      if (!row?.code || row.code === '*') continue;
      const code = String(row.code).toLowerCase().trim();
      if (!code) continue;
      if (byCode.has(code)) continue;

      const parts = [
        title,
        row.module ? `Module: ${row.module}` : null,
        row.rolesDisplay ? `Roles: ${row.rolesDisplay}` : null,
        Array.isArray(row.accessTypes) && row.accessTypes.length
          ? `Access: ${row.accessTypes.join(', ')}`
          : null
      ].filter(Boolean);
      let description = parts.join(' — ');
      if (description.length > MAX_DESCRIPTION) {
        description = `${description.slice(0, MAX_DESCRIPTION - 3)}...`;
      }

      byCode.set(code, {
        code,
        description,
        permissionGroup: `catalog:${groupKey}`
      });
    }
  }
  return [...byCode.values()];
}

/**
 * Insert missing Permission documents for the current tenant/org scope.
 * @param {{ tenantId?: import('mongoose').Types.ObjectId, orgId?: import('mongoose').Types.ObjectId, createdBy?: import('mongoose').Types.ObjectId }} scope
 * @returns {Promise<{ created: number, skipped: number, codesCreated: string[], codesSkipped: string[] }>}
 */
async function syncCatalogToOrgPermissions({ tenantId, orgId, createdBy }) {
  if (!tenantId && !orgId) {
    throw new Error('Cannot sync permissions without tenant or organization context');
  }

  const rows = flattenCatalogForSync();
  const scopeMatch = [];
  if (tenantId) scopeMatch.push({ tenantId });
  if (orgId) scopeMatch.push({ orgId });

  let created = 0;
  let skipped = 0;
  const codesCreated = [];
  const codesSkipped = [];

  for (const row of rows) {
    const existing = await Permission.findOne({
      code: row.code,
      $or: scopeMatch
    })
      .select('_id')
      .lean();

    if (existing) {
      skipped += 1;
      codesSkipped.push(row.code);
      continue;
    }

    try {
      const doc = new Permission({
        code: row.code,
        description: row.description,
        permissionGroup: row.permissionGroup,
        tenantId: tenantId || undefined,
        orgId: orgId || undefined,
        createdBy: createdBy || undefined,
        isActive: true
      });
      await doc.save();
      created += 1;
      codesCreated.push(row.code);
    } catch (e) {
      if (e && e.code === 11000) {
        skipped += 1;
        codesSkipped.push(row.code);
        continue;
      }
      throw e;
    }
  }

  return {
    created,
    skipped,
    catalogCodes: rows.length,
    codesCreated,
    codesSkipped
  };
}

module.exports = {
  flattenCatalogForSync,
  syncCatalogToOrgPermissions
};
