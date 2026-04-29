module.exports = {
  version: '007',
  description: 'Remove legacy healthcare/HIPAA fields and indexes',

  async up(db) {
    await db.collection('subscriptionplans').updateMany(
      { 'compliance.hipaaCompliant': { $exists: true } },
      { $unset: { 'compliance.hipaaCompliant': '' } }
    );

    await db.collection('portalsubscriptions').updateMany(
      { 'compliance.hipaaCompliant': { $exists: true } },
      { $unset: { 'compliance.hipaaCompliant': '' } }
    );

    await db.collection('auditlogs').updateMany(
      { phiFieldsAccessed: { $exists: true } },
      { $unset: { phiFieldsAccessed: '' } }
    );

    await db.collection('tenants').updateMany(
      { healthcareConfig: { $exists: true } },
      { $unset: { healthcareConfig: '' } }
    );

    const dropIfExists = async (collectionName, indexName) => {
      try {
        const indexes = await db.collection(collectionName).indexes();
        if (indexes.some((idx) => idx.name === indexName)) {
          await db.collection(collectionName).dropIndex(indexName);
        }
      } catch (_) {}
    };

    await dropIfExists('auditlogs', 'phiFieldsAccessed_1');
    await dropIfExists('subscriptionplans', 'compliance.hipaaCompliant_1');
    await dropIfExists('portalsubscriptions', 'compliance.hipaaCompliant_1');
    await dropIfExists('tenants', 'healthcareConfig.hipaaCompliant_1');
  },

  async down(db) {
    return db;
  }
};
module.exports = {
  version: '007',
  description: 'Remove legacy healthcare/HIPAA fields and indexes',

  async up(db) {
    // Remove HIPAA/PHI-style fields from persisted documents.
    await db.collection('subscriptionplans').updateMany(
      { 'compliance.hipaaCompliant': { $exists: true } },
      { $unset: { 'compliance.hipaaCompliant': '' } }
    );

    await db.collection('portalsubscriptions').updateMany(
      { 'compliance.hipaaCompliant': { $exists: true } },
      { $unset: { 'compliance.hipaaCompliant': '' } }
    );

    await db.collection('auditlogs').updateMany(
      { phiFieldsAccessed: { $exists: true } },
      { $unset: { phiFieldsAccessed: '' } }
    );

    await db.collection('tenants').updateMany(
      { healthcareConfig: { $exists: true } },
      { $unset: { healthcareConfig: '' } }
    );

    // Drop potential legacy indexes if they exist.
    const dropIfExists = async (collectionName, indexName) => {
      try {
        const indexes = await db.collection(collectionName).indexes();
        if (indexes.some((idx) => idx.name === indexName)) {
          await db.collection(collectionName).dropIndex(indexName);
        }
      } catch (_) {
        // Best-effort cleanup; ignore absent collections/indexes.
      }
    };

    await dropIfExists('auditlogs', 'phiFieldsAccessed_1');
    await dropIfExists('subscriptionplans', 'compliance.hipaaCompliant_1');
    await dropIfExists('portalsubscriptions', 'compliance.hipaaCompliant_1');
    await dropIfExists('tenants', 'healthcareConfig.hipaaCompliant_1');
  },

  async down(db) {
    // Intentionally not restoring removed healthcare/HIPAA fields.
    // This rollback is a no-op because the removed fields are deprecated.
    return db;
  }
};
