const { buildRoleCatalog } = require('../roleCatalog.service');

describe('roleCatalog.service', () => {
  test('buildRoleCatalog has three sections with entries and distinct sh- slugs for Software House', () => {
    const cat = buildRoleCatalog();
    expect(cat.softwareHouse.entries.length).toBeGreaterThan(0);
    expect(cat.organization.entries.length).toBeGreaterThan(0);
    expect(cat.organizationHrSubroles.entries.length).toBeGreaterThan(0);
    for (const e of cat.softwareHouse.entries) {
      expect(e.catalogSlug).toMatch(/^sh-/);
    }
    for (const e of cat.organizationHrSubroles.entries) {
      expect(e.catalogSlug).toMatch(/^hr-/);
    }
    const shSlugs = new Set(cat.softwareHouse.entries.map((e) => e.catalogSlug));
    const orgSlugs = new Set(cat.organization.entries.map((e) => e.catalogSlug));
    for (const s of shSlugs) {
      expect(orgSlugs.has(s)).toBe(false);
    }
  });
});
