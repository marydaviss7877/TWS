/**
 * UPR Phase 3.2 (Sheets): Set moduleKey='sheets' on existing Department records whose
 * name/code implies a spreadsheet/reporting function. Mirrors 006-department-module-key.js.
 */
const VALID_MODULE_KEYS = [
  'projects', 'hr', 'finance', 'payroll', 'documents', 'sheets', 'analytics', 'nucleus',
  'clients', 'deals', 'audit', 'attendance', 'leave', 'notifications', 'settings'
];

const NAME_TO_MODULE = {
  sheet: 'sheets', sheets: 'sheets',
  spreadsheet: 'sheets', spreadsheets: 'sheets',
  excel: 'sheets'
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
  version: '008',
  name: 'sheets-module-key',
  description: 'Set moduleKey=\'sheets\' on existing Department records (UPR Phase 3.2, Sheets module)',

  async up(db) {
    console.log('Running migration: sheets-module-key (up)');
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
    console.log('Running migration: sheets-module-key (down)');
    const result = await db.collection('departments').updateMany(
      { moduleKey: 'sheets' },
      { $set: { moduleKey: null } }
    );
    console.log(`  Cleared moduleKey from ${result.modifiedCount} departments.`);
  }
};

module.exports = migration;
