/**
 * Separate employee attendance from the shared legacy/education collection and
 * make the optional integration Task identity genuinely optional.
 */
const migration = {
  version: '009',
  name: 'project-task-index-and-hr-attendance',
  description: 'Create partial Task integration identity index and migrate HR attendance to its own collection',

  async up(db) {
    const tasks = db.collection('tasks');
    const indexes = await tasks.indexes();
    const legacy = indexes.find(index =>
      index.key?.tenantId === 1 &&
      index.key?.taskId === 1
    );
    if (legacy) {
      await tasks.dropIndex(legacy.name);
    }
    await tasks.createIndex(
      { tenantId: 1, taskId: 1 },
      {
        name: 'tenantId_1_taskId_1',
        unique: true,
        partialFilterExpression: {
          tenantId: { $type: 'objectId' },
          taskId: { $type: 'string' }
        }
      }
    );

    const sourceExists = (await db.listCollections({ name: 'attendances' }).toArray()).length > 0;
    if (!sourceExists) return;

    const source = db.collection('attendances');
    const target = db.collection('employee_attendances');
    await target.createIndex({ userId: 1, date: 1 });
    await target.createIndex({ employeeId: 1, date: 1 });
    await target.createIndex({ organizationId: 1, date: -1 });

    const cursor = source.find({
      organizationId: { $type: 'objectId' },
      userId: { $type: 'objectId' },
      employeeId: { $type: 'string' }
    });
    let migrated = 0;
    let operations = [];
    while (await cursor.hasNext()) {
      const document = await cursor.next();
      delete document.orgId;
      delete document.studentId;
      delete document.period;
      operations.push({
        updateOne: {
          filter: { _id: document._id },
          update: { $set: document },
          upsert: true
        }
      });
      if (operations.length === 500) {
        await target.bulkWrite(operations, { ordered: false });
        migrated += operations.length;
        operations = [];
      }
    }
    if (operations.length > 0) {
      await target.bulkWrite(operations, { ordered: false });
      migrated += operations.length;
    }
    console.log(`  Migrated ${migrated} employee attendance records.`);
  },

  async down(db) {
    const tasks = db.collection('tasks');
    const indexes = await tasks.indexes();
    const current = indexes.find(index => index.key?.tenantId === 1 && index.key?.taskId === 1);
    if (current) await tasks.dropIndex(current.name);
    await tasks.createIndex(
      { tenantId: 1, taskId: 1 },
      { name: 'tenantId_1_taskId_1', unique: true }
    );
    // Employee attendance is intentionally retained; down migrations must not
    // destroy attendance history.
  }
};

module.exports = migration;
