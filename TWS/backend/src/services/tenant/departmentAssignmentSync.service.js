const mongoose = require('mongoose');
const TenantUser = require('../../models/TenantUser');
const User = require('../../models/User');
const Employee = require('../../models/Employee');
const TenantDepartmentAccess = require('../../models/TenantDepartmentAccess');
const Department = require('../../models/Department');

const DEFAULT_DEPARTMENT_TEMPLATE = [
  { name: 'Human Resources', code: 'HR', description: 'Hiring, policies, and people operations', moduleKey: 'hr' },
  { name: 'Finance', code: 'FIN', description: 'Finance planning and controls', moduleKey: 'finance' },
  { name: 'Accounts & Taxation', code: 'ACC', description: 'Accounting, taxation, and compliance filings', moduleKey: 'finance' },
  { name: 'Sales', code: 'SALES', description: 'Lead generation and client acquisition', moduleKey: 'clients' },
  { name: 'Marketing', code: 'MKT', description: 'Brand, campaigns, and digital marketing', moduleKey: 'clients' },
  { name: 'Business Development', code: 'BD', description: 'Partnerships and growth opportunities', moduleKey: 'clients' },
  { name: 'UI/UX Design', code: 'DESIGN', description: 'Product design, user research, and prototyping', moduleKey: 'projects' },
  { name: 'Software Development', code: 'DEV', description: 'Application engineering and feature delivery', moduleKey: 'projects' },
  { name: 'Quality Assurance', code: 'QA', description: 'Testing and quality control', moduleKey: 'projects' },
  { name: 'DevOps & Infrastructure', code: 'DEVOPS', description: 'CI/CD, cloud infrastructure, and deployment', moduleKey: 'projects' },
  { name: 'Project Management', code: 'PM', description: 'Project planning, timelines, and delivery governance', moduleKey: 'projects' },
  { name: 'Customer Support', code: 'SUPPORT', description: 'Customer onboarding and issue resolution', moduleKey: null },
  { name: 'Operations', code: 'OPS', description: 'Internal operations and administration', moduleKey: null }
];

/**
 * When a Department display name changes, update denormalized string fields that matched the old name
 * (exact match, same tenant/org). This is intentionally conservative and does not rewrite arbitrary text.
 */
async function syncDepartmentNameAssignments({ departmentDoc, oldName, newName }) {
  const oldT = (oldName || '').trim();
  const newT = (newName || '').trim();
  if (!oldT || !newT || oldT === newT) {
    return { tenantUsers: 0, users: 0, employees: 0, departmentAccess: 0 };
  }

  const tenantId = departmentDoc.tenantId;
  const orgId = departmentDoc.orgId;
  const deptId = departmentDoc._id;

  const [tu, usr, emp, tda] = await Promise.all([
    tenantId
      ? TenantUser.updateMany(
          { tenantId, 'tenantSpecificInfo.department': oldT },
          { $set: { 'tenantSpecificInfo.department': newT } }
        )
      : { modifiedCount: 0 },
    orgId
      ? User.updateMany({ orgId, department: oldT }, { $set: { department: newT } })
      : { modifiedCount: 0 },
    orgId
      ? Employee.updateMany(
          { $or: [{ orgId }, { organizationId: orgId }], department: oldT },
          { $set: { department: newT } }
        )
      : { modifiedCount: 0 },
    TenantDepartmentAccess.updateMany({ departmentId: deptId }, { $set: { department: newT } })
  ]);

  return {
    tenantUsers: tu.modifiedCount || 0,
    users: usr.modifiedCount || 0,
    employees: emp.modifiedCount || 0,
    departmentAccess: tda.modifiedCount || 0
  };
}

/**
 * Create starter departments for an org when their codes are not already taken. Idempotent per code.
 */
async function seedDepartmentTemplate({ tenantId, orgId, createdBy }) {
  if (!orgId) {
    throw new Error('orgId is required to seed departments');
  }
  const tid = mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : null;
  const oid = mongoose.Types.ObjectId.isValid(orgId) ? new mongoose.Types.ObjectId(orgId) : null;
  const creatorId = mongoose.Types.ObjectId.isValid(createdBy) ? new mongoose.Types.ObjectId(createdBy) : null;
  if (!oid) {
    throw new Error('orgId must be a valid ObjectId to seed departments');
  }

  const created = [];
  const skipped = [];

  for (const row of DEFAULT_DEPARTMENT_TEMPLATE) {
    const code = row.code.toUpperCase().trim();
    const exists = await Department.findOne({
      code,
      $or: [{ orgId: oid }, ...(tid ? [{ tenantId: tid }] : [])]
    })
      .select('_id')
      .lean();

    if (exists) {
      skipped.push({ code, reason: 'exists' });
      continue;
    }

    const doc = new Department({
      name: row.name.trim(),
      code,
      description: row.description || undefined,
      tenantId: tid || undefined,
      orgId: oid,
      moduleKey: row.moduleKey || undefined,
      status: 'active',
      createdBy: creatorId || undefined,
      createdByModel: creatorId ? 'User' : 'TWSAdmin'
    });
    await doc.save();
    created.push({ _id: doc._id, code, name: doc.name });
  }

  return { created, skipped, template: DEFAULT_DEPARTMENT_TEMPLATE.map((r) => r.code) };
}

module.exports = {
  DEFAULT_DEPARTMENT_TEMPLATE,
  syncDepartmentNameAssignments,
  seedDepartmentTemplate
};
