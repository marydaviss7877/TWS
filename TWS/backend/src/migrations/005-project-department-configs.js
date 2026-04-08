/**
 * UPR Phase 3: Backfill projectDepartmentConfigs for existing projects.
 * Projects with no configs get: primary department -> dev preset, other departments -> sales_observer.
 * Safe default: deny for unknown departments.
 */
const { buildDefaultProjectDepartmentConfigs } = require('../utils/projectDepartmentView');

const migration = {
  version: '005',
  name: 'project-department-configs',
  description: 'Backfill projectDepartmentConfigs for existing projects (UPR Phase 3)',

  async up(db) {
    console.log('Running migration: project-department-configs (up)');
    const projects = db.collection('projects');

    const cursor = projects.find({
      orgId: { $exists: true, $ne: null },
      $or: [
        { projectDepartmentConfigs: { $exists: false } },
        { projectDepartmentConfigs: { $size: 0 } }
      ]
    });

    let updated = 0;
    while (await cursor.hasNext()) {
      const project = await cursor.next();
      const primaryId = project.primaryDepartmentId || null;
      const deptIds = Array.isArray(project.departments) ? project.departments.filter(Boolean) : [];
      const allDepts = primaryId
        ? [primaryId, ...deptIds.filter(d => (d && d.toString()) !== (primaryId && primaryId.toString()))]
        : deptIds;
      const configs = buildDefaultProjectDepartmentConfigs(primaryId, allDepts);
      if (configs.length > 0) {
        await projects.updateOne(
          { _id: project._id },
          { $set: { projectDepartmentConfigs: configs } }
        );
        updated++;
      }
    }
    console.log(`  Updated ${updated} projects with default projectDepartmentConfigs.`);
  },

  async down(db) {
    console.log('Running migration: project-department-configs (down)');
    const projects = db.collection('projects');
    const result = await projects.updateMany(
      { orgId: { $exists: true }, projectDepartmentConfigs: { $exists: true, $ne: [] } },
      { $unset: { projectDepartmentConfigs: '' } }
    );
    console.log(`  Cleared projectDepartmentConfigs from ${result.modifiedCount} projects.`);
  }
};

module.exports = migration;
