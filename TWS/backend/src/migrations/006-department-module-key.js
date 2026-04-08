/**
 * UPR Phase 3.2: Set moduleKey on existing Department records.
 * Maps department name/code to moduleKey enum where inferrable; others remain null.
 */
const VALID_MODULE_KEYS = [
  'projects', 'hr', 'finance', 'payroll', 'documents', 'analytics', 'nucleus',
  'clients', 'deals', 'audit', 'attendance', 'leave', 'notifications', 'settings'
];

const NAME_TO_MODULE = {
  project: 'projects', projects: 'projects',
  hr: 'hr', human: 'hr', 'human resources': 'hr',
  finance: 'finance', accounting: 'finance',
  payroll: 'payroll',
  document: 'documents', documents: 'documents',
  analytic: 'analytics', analytics: 'analytics', report: 'analytics',
  nucleus: 'nucleus',
  client: 'clients', clients: 'clients', sales: 'clients',
  deal: 'deals', deals: 'deals',
  audit: 'audit',
  attendance: 'attendance',
  leave: 'leave',
  notification: 'notifications', notifications: 'notifications',
  setting: 'settings', settings: 'settings',
  development: 'projects', dev: 'projects', engineering: 'projects',
  design: 'projects', qa: 'projects', 'quality assurance': 'projects'
};

function inferModuleKey(name, code) {
  const key = (code || name || '').toString().toLowerCase().trim();
  const nameKey = (name || '').toString().toLowerCase().trim();
  if (NAME_TO_MODULE[key]) return NAME_TO_MODULE[key];
  if (NAME_TO_MODULE[nameKey]) return NAME_TO_MODULE[nameKey];
  for (const [k, v] of Object.entries(NAME_TO_MODULE)) {
    if (nameKey.includes(k) || key.includes(k)) return v;
  }
  return null;
}

const migration = {
  version: '006',
  name: 'department-module-key',
  description: 'Set moduleKey on existing Department records (UPR Phase 3.2)',

  async up(db) {
    console.log('Running migration: department-module-key (up)');
    const departments = db.collection('departments');
    const cursor = departments.find({ $or: [{ moduleKey: { $exists: false } }, { moduleKey: null }] });
    let updated = 0;
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const inferred = inferModuleKey(doc.name, doc.code);
      if (inferred && VALID_MODULE_KEYS.includes(inferred)) {
        await departments.updateOne(
          { _id: doc._id },
          { $set: { moduleKey: inferred } }
        );
        updated++;
      }
    }
    console.log(`  Set moduleKey on ${updated} departments.`);
  },

  async down(db) {
    console.log('Running migration: department-module-key (down)');
    const result = await db.collection('departments').updateMany(
      { moduleKey: { $exists: true, $ne: null } },
      { $unset: { moduleKey: '' } }
    );
    console.log(`  Cleared moduleKey from ${result.modifiedCount} departments.`);
  }
};

module.exports = migration;
