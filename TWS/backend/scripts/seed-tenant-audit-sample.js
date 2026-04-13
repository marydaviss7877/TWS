/**
 * Inserts sample TenantAuditLog rows for a tenant org (e.g. devsinc).
 * UI: /:tenantSlug/org/audit → GET /api/tenant/:tenantSlug/audit
 *
 * Usage (from backend folder):
 *   node scripts/seed-tenant-audit-sample.js
 *   TENANT_SLUG=devsinc node scripts/seed-tenant-audit-sample.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const Tenant = require('../src/models/Tenant');
const User = require('../src/models/User');
const TenantUser = require('../src/models/TenantUser');
const TenantAuditLog = require('../src/models/TenantAuditLog');

const SAMPLE_EVENTS = [
  { action: 'READ', resourceType: 'payroll', resourceId: 'payroll-run-2026-04', ip: '192.168.1.10' },
  { action: 'UPDATE', resourceType: 'project', resourceId: '507f1f77bcf86cd799439011', ip: '192.168.1.10' },
  { action: 'READ', resourceType: 'finance', resourceId: 'invoice-list', ip: '10.0.0.5' },
  { action: 'CREATE', resourceType: 'employee', resourceId: 'new-hire-draft', ip: '203.0.113.44' },
  { action: 'READ', resourceType: 'audit', resourceId: 'self', ip: '127.0.0.1' },
  { action: 'UPDATE', resourceType: 'settings', resourceId: 'org-notifications', ip: '198.51.100.2' },
  { action: 'READ', resourceType: 'project', resourceId: 'sprint-board', ip: '192.168.1.22' },
  { action: 'DELETE', resourceType: 'report', resourceId: 'draft-export-12', ip: '192.168.1.10' },
  { action: 'READ', resourceType: 'attendance', resourceId: 'week-2026-14', ip: '10.0.0.5' },
  { action: 'EXPORT', resourceType: 'payroll', resourceId: 'csv-q1', ip: '192.168.1.10' }
];

async function resolveUser(tenant) {
  const orgId = tenant.organizationId || tenant.orgId;
  if (!orgId) return null;
  let user = await User.findOne({ orgId }).sort({ createdAt: 1 }).lean();
  if (user) return user;
  const tu = await TenantUser.findOne({ tenantId: tenant._id }).lean();
  if (tu?.userId) {
    user = await User.findById(tu.userId).lean();
  }
  return user;
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('Set MONGO_URI (or MONGODB_URI) in backend/.env');
    process.exit(1);
  }

  const preferred = process.env.TENANT_SLUG;
  const slugCandidates = [...new Set([preferred, 'devsinc', 'devsin'].filter(Boolean))];

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  let tenant = null;
  let usedSlug = null;
  for (const slug of slugCandidates) {
    tenant = await Tenant.findOne({ slug: String(slug).toLowerCase() });
    if (tenant) {
      usedSlug = slug;
      break;
    }
  }

  if (!tenant) {
    console.error(`No tenant found for slugs: ${slugCandidates.join(', ')}`);
    process.exit(1);
  }

  const orgId = tenant.organizationId || tenant.orgId;
  if (!orgId) {
    console.error(`Tenant "${usedSlug}" has no organizationId / orgId — cannot scope audit logs.`);
    process.exit(1);
  }

  const user = await resolveUser(tenant);
  if (!user?._id) {
    console.error(`No user found for org ${orgId} — add a user or TenantUser first.`);
    process.exit(1);
  }

  const now = Date.now();
  const docs = SAMPLE_EVENTS.map((ev, i) => ({
    tenantId: tenant._id,
    orgId,
    userId: user._id,
    action: ev.action,
    resourceType: ev.resourceType,
    resourceId: ev.resourceId,
    ip: ev.ip,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/115.0',
    metadata: { source: 'seed-tenant-audit-sample', sampleIndex: i },
    createdAt: new Date(now - (SAMPLE_EVENTS.length - i) * 3600000)
  }));

  await TenantAuditLog.insertMany(docs);
  console.log(`Inserted ${docs.length} TenantAuditLog row(s) for tenant slug="${usedSlug}" (tenantId=${tenant._id}, orgId=${orgId}, userId=${user._id}).`);
  console.log('Open: http://localhost:3000/' + usedSlug + '/org/audit');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
