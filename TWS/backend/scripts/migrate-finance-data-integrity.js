/**
 * One-time, idempotent Finance integrity migration.
 * - Copies Finance-shaped clients out of the shared legacy `clients` collection.
 * - Replaces global unique numbering indexes with org-scoped unique indexes.
 * Existing source documents are retained for rollback safety.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function dropIfPresent(collection, name) {
  const indexes = await collection.indexes();
  if (indexes.some(index => index.name === name)) await collection.dropIndex(name);
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) throw new Error('MONGO_URI is not configured.');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const legacyClients = db.collection('clients');
  const financeClients = db.collection('finance_clients');
  // Remove indexes accidentally inherited while Finance Client shared/misused
  // other model collection metadata. These fields do not belong to clients.
  for (const name of ['orgId_1_code_1', 'orgId_1_type_1_isActive_1', 'orgId_1_parentAccount_1']) {
    await dropIfPresent(financeClients, name);
  }
  const rows = await legacyClients.find({
    orgId: { $exists: true },
    $or: [{ projectClientId: { $exists: true } }, { defaultHourlyRate: { $exists: true } }]
  }).toArray();
  if (rows.length) {
    await financeClients.bulkWrite(rows.map(row => ({
      updateOne: { filter: { _id: row._id }, update: { $set: row }, upsert: true }
    })), { ordered: false });
  }

  const indexChanges = [
    ['chartofaccounts', 'code_1', { orgId: 1, code: 1 }, 'orgId_1_code_1'],
    ['invoices', 'invoiceNumber_1', { orgId: 1, invoiceNumber: 1 }, 'orgId_1_invoiceNumber_1'],
    ['bills', 'billNumber_1', { orgId: 1, billNumber: 1 }, 'orgId_1_billNumber_1'],
    ['journalentries', 'entryNumber_1', { orgId: 1, entryNumber: 1 }, 'orgId_1_entryNumber_1']
  ];
  for (const [collectionName, oldName, keys, newName] of indexChanges) {
    const collection = db.collection(collectionName);
    await dropIfPresent(collection, oldName);
    await collection.createIndex(keys, { unique: true, name: newName });
  }
  await financeClients.createIndex({ orgId: 1, projectClientId: 1 }, {
    unique: true, sparse: true, name: 'orgId_1_projectClientId_1'
  });

  console.log(JSON.stringify({
    copiedFinanceClients: rows.length,
    financeClientCount: await financeClients.countDocuments(),
    migratedIndexes: indexChanges.map(([collection, , , name]) => `${collection}.${name}`)
  }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => mongoose.disconnect());
