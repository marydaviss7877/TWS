const { flattenCatalogForSync } = require('../permissionCatalogSync.service');

describe('permissionCatalogSync.service', () => {
  test('flattenCatalogForSync returns unique codes with descriptions', () => {
    const rows = flattenCatalogForSync();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    const codes = new Set(rows.map((r) => r.code));
    expect(codes.size).toBe(rows.length);
    for (const row of rows) {
      expect(row.code).toBeTruthy();
      expect(row.code).not.toBe('*');
      expect(row.description).toBeTruthy();
      expect(row.permissionGroup).toMatch(/^catalog:/);
    }
  });
});
