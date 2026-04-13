const { flattenRoleCatalogRows } = require('../roleCatalogSync.service');

describe('roleCatalogSync.service', () => {
  test('flattenRoleCatalogRows returns unique slugs', () => {
    const rows = flattenRoleCatalogRows();
    expect(rows.length).toBeGreaterThan(0);
    const slugs = new Set(rows.map((r) => r.slug));
    expect(slugs.size).toBe(rows.length);
    for (const row of rows) {
      expect(row.slug).toBeTruthy();
      expect(row.name).toBeTruthy();
      expect(Array.isArray(row.permissionCodes)).toBe(true);
    }
  });
});
