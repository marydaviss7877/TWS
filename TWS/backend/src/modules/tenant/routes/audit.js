/**
 * Tenant audit log API (Plan Phase 2, §10).
 * GET /api/tenant/:tenantSlug/audit — list with filters, full-text style search, ERP summary facets.
 */
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router({ mergeParams: true });
const { requireRole } = require('../../../middleware/auth/auth');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const TenantAuditLog = require('../../../models/tenant/TenantAuditLog');

router.use(verifyERPToken);
const auditAccess = requireErpAccess({
  allowedRoles: ['owner', 'admin', 'super_admin', 'ceo', 'department_lead'],
  checkRevocation: true,
  sensitive: true,
  auditResourceType: 'audit'
});

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  const s = String(id);
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : null;
}

function buildActionFilter(rawAction) {
  const action = String(rawAction || '').trim();
  if (!action) return null;

  const normalized = action.toUpperCase();
  const aliases = {
    READ: ['READ', 'read', 'GET', 'get', 'access', 'ACCESS'],
    CREATE: ['CREATE', 'create', 'POST', 'post'],
    UPDATE: ['UPDATE', 'update', 'PUT', 'put', 'PATCH', 'patch'],
    DELETE: ['DELETE', 'delete'],
    EXPORT: ['EXPORT', 'export', 'DATA_EXPORT', 'data_export'],
    IMPORT: ['IMPORT', 'import', 'DATA_IMPORT', 'data_import'],
    APPROVE: ['APPROVE', 'approve']
  };

  if (aliases[normalized]) {
    return { $in: aliases[normalized] };
  }
  return action;
}

function buildAuditQuery({ tenantId, orgId, userId, resourceType, action, dateFrom, dateTo, search }) {
  const tid = toObjectId(tenantId);
  const oid = toObjectId(orgId);
  if (!tid || !oid) {
    return { error: 'Invalid tenant or organization id' };
  }
  const and = [{ tenantId: tid }, { orgId: oid }];

  if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
    and.push({ userId: new mongoose.Types.ObjectId(String(userId)) });
  }
  if (resourceType && String(resourceType).trim()) {
    and.push({ resourceType: String(resourceType).trim() });
  }
  const actionFilter = buildActionFilter(action);
  if (actionFilter) {
    and.push({ action: actionFilter });
  }
  if (dateFrom || dateTo) {
    const range = {};
    if (dateFrom) range.$gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }
    and.push({ createdAt: range });
  }
  if (search && String(search).trim()) {
    const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(escaped, 'i');
    and.push({
      $or: [
        { action: rx },
        { resourceType: rx },
        { resourceId: rx },
        { ip: rx },
        { userAgent: rx }
      ]
    });
  }

  return { query: { $and: and } };
}

router.get(
  '/',
  auditAccess,
  requireRole(['owner', 'admin', 'super_admin', 'ceo', 'department_lead']),
  ErrorHandler.asyncHandler(async (req, res) => {
    const tenantId = req.tenant?._id || req.tenantContext?.tenantId || req.user?.tenantId;
    const orgId = req.tenantContext?.orgId || req.user?.orgId;
    if (!tenantId || !orgId) {
      return res.status(400).json({ success: false, message: 'Tenant context required' });
    }
    const {
      userId,
      resourceType,
      action,
      dateFrom,
      dateTo,
      search,
      limit = 100,
      skip = 0,
      includeSummary = '1'
    } = req.query;

    const built = buildAuditQuery({
      tenantId,
      orgId,
      userId,
      resourceType,
      action,
      dateFrom,
      dateTo,
      search
    });
    if (built.error) {
      return res.status(400).json({ success: false, message: built.error });
    }
    const { query } = built;
    const lim = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
    const sk = Math.max(parseInt(skip, 10) || 0, 0);

    const wantSummary = String(includeSummary) !== '0' && String(includeSummary).toLowerCase() !== 'false';

    const listPromise = TenantAuditLog.find(query)
      .populate('userId', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip(sk)
      .limit(lim)
      .lean();

    const countPromise = TenantAuditLog.countDocuments(query);

    const summaryPromise = wantSummary
      ? Promise.all([
          TenantAuditLog.aggregate([
            { $match: query },
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 15 }
          ]),
          TenantAuditLog.aggregate([
            { $match: query },
            { $group: { _id: '$resourceType', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 15 }
          ]),
          TenantAuditLog.aggregate([
            { $match: query },
            {
              $group: {
                _id: null,
                earliest: { $min: '$createdAt' },
                latest: { $max: '$createdAt' },
                distinctUsers: { $addToSet: '$userId' }
              }
            },
            {
              $project: {
                _id: 0,
                earliest: 1,
                latest: 1,
                uniqueUserCount: { $size: '$distinctUsers' }
              }
            }
          ])
        ])
      : Promise.resolve(null);

    const [logs, total, summaryRaw] = await Promise.all([listPromise, countPromise, summaryPromise]);

    let summary = null;
    if (summaryRaw) {
      const [byAction, byResourceType, rangeAgg] = summaryRaw;
      summary = {
        byAction: (byAction || []).map((r) => ({ key: r._id || '—', count: r.count })),
        byResourceType: (byResourceType || []).map((r) => ({ key: r._id || '—', count: r.count })),
        dateRange: rangeAgg[0] || null,
        uniqueUserCount: rangeAgg[0]?.uniqueUserCount ?? 0
      };
    }

    res.json({
      success: true,
      data: logs,
      pagination: { total, limit: lim, skip: sk, hasMore: sk + logs.length < total },
      summary,
      filtersEcho: {
        userId: userId || null,
        resourceType: resourceType || null,
        action: action || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        search: search || null
      }
    });
  })
);

module.exports = router;
