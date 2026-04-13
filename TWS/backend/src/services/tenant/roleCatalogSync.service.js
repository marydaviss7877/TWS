/**
 * Inserts Role documents from roleCatalog for tenant/org (assignable list + Create Role templates).
 * Permission codes are intersected with existing Permission documents in scope (import permissions catalog first).
 */

const Role = require('../../models/Role');
const Permission = require('../../models/Permission');
const { buildRoleCatalog } = require('./roleCatalog.service');

const MAX_DESCRIPTION = 1000;

function flattenRoleCatalogRows() {
  const catalog = buildRoleCatalog();
  const sections = [catalog.softwareHouse, catalog.organization, catalog.organizationHrSubroles];
  const rows = [];
  for (const section of sections) {
    for (const entry of section?.entries || []) {
      if (!entry?.catalogSlug) continue;
      const slug = String(entry.catalogSlug).toLowerCase().trim();
      if (!slug) continue;
      let description = entry.description || '';
      if (description.length > MAX_DESCRIPTION) {
        description = `${description.slice(0, MAX_DESCRIPTION - 3)}...`;
      }
      rows.push({
        slug,
        name: entry.name || slug,
        description,
        permissionCodes: Array.isArray(entry.permissionCodes) ? [...entry.permissionCodes] : []
      });
    }
  }
  return rows;
}

async function syncRoleCatalogToOrg({ tenantId, orgId, createdBy }) {
  if (!tenantId && !orgId) {
    throw new Error('Cannot sync roles without tenant or organization context');
  }

  const scopeMatch = [];
  if (tenantId) scopeMatch.push({ tenantId });
  if (orgId) scopeMatch.push({ orgId });

  const rows = flattenRoleCatalogRows();
  let created = 0;
  let skipped = 0;
  const slugsCreated = [];
  const slugsSkipped = [];
  /** @type {{ slug: string, droppedCodes: string[] }[]} */
  const partialPermissionNote = [];

  for (const row of rows) {
    const existing = await Role.findOne({
      slug: row.slug,
      $or: scopeMatch
    })
      .select('_id')
      .lean();

    if (existing) {
      skipped += 1;
      slugsSkipped.push(row.slug);
      continue;
    }

    let permissionCodes = row.permissionCodes;
    if (permissionCodes.length > 0) {
      const permScope = [
        ...scopeMatch,
        { tenantId: null, orgId: null }
      ];
      const found = await Permission.find({
        code: { $in: permissionCodes },
        $or: permScope,
        isActive: true
      })
        .select('code')
        .lean();
      const have = new Set(found.map((p) => p.code));
      const missing = permissionCodes.filter((c) => !have.has(c));
      permissionCodes = permissionCodes.filter((c) => have.has(c));
      if (missing.length > 0) {
        partialPermissionNote.push({ slug: row.slug, droppedCodes: missing });
      }
    }

    try {
      const doc = new Role({
        name: row.name,
        slug: row.slug,
        description: row.description,
        permissions: permissionCodes,
        tenantId: tenantId || undefined,
        orgId: orgId || undefined,
        createdBy: createdBy || undefined,
        isActive: true
      });
      await doc.save();
      created += 1;
      slugsCreated.push(row.slug);
    } catch (e) {
      if (e && e.code === 11000) {
        skipped += 1;
        slugsSkipped.push(row.slug);
        continue;
      }
      throw e;
    }
  }

  return {
    created,
    skipped,
    catalogRoles: rows.length,
    slugsCreated,
    slugsSkipped,
    partialPermissions: partialPermissionNote
  };
}

module.exports = {
  flattenRoleCatalogRows,
  syncRoleCatalogToOrg
};
