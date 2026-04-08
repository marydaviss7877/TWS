/**
 * Tenant audit log API (Plan Phase 2, §10).
 * GET /api/tenant/:tenantSlug/audit — list with filters (user, date, module).
 * Access: CEO / Department Head (own dept) per matrix.
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
const { requireRole } = require('../../../middleware/auth/auth');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const TenantAuditLog = require('../../../models/TenantAuditLog');

router.use(verifyERPToken);
const auditAccess = requireErpAccess({
  allowedRoles: ['owner', 'admin', 'super_admin', 'ceo', 'department_lead'],
  checkRevocation: true,
  sensitive: true,
  auditResourceType: 'audit'
});

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
    const { userId, resourceType, action, dateFrom, dateTo, limit = 100, skip = 0 } = req.query;
    const query = { tenantId, orgId };
    if (userId) query.userId = userId;
    if (resourceType) query.resourceType = resourceType;
    if (action) query.action = action;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    const [logs, total] = await Promise.all([
      TenantAuditLog.find(query)
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(Math.min(parseInt(limit) || 100, 500))
        .lean(),
      TenantAuditLog.countDocuments(query)
    ]);
    res.json({
      success: true,
      data: logs,
      pagination: { total, limit: parseInt(limit) || 100, skip: parseInt(skip) }
    });
  })
);

module.exports = router;
