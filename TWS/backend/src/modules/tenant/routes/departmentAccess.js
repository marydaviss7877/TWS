/**
 * Tenant-admin department access (Plan Phase 1).
 * Base path: /api/tenant/:tenantSlug/department-access
 * CEO/HR/Dept Head can grant, revoke, suspend department access with optional expiry.
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
const { body, validationResult } = require('express-validator');
const { requireRole } = require('../../../middleware/auth/auth');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const TenantDepartmentAccess = require('../../../models/tenant/TenantDepartmentAccess');
const Department = require('../../../models/org/Department');
const User = require('../../../models/users-auth/User');
const { getTenantFilter } = require('../../../utils/orgIdHelper');
const { invalidateResolvedPermissions } = require('../../../services/tenant/permissionResolver.service');
const permissionCache = require('../../../services/tenant/permissionCache.service');

router.use(verifyERPToken);

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  next();
};

const adminAccess = requireErpAccess({ allowedRoles: ['owner', 'admin', 'super_admin'] });

// List department access (tenant-scoped; admins see all, others could be restricted later)
router.get(
  '/',
  adminAccess,
  requireRole(['owner', 'admin', 'super_admin']),
  ErrorHandler.asyncHandler(async (req, res) => {
    const tenantId = req.tenant?._id || req.tenantContext?.tenantId || req.user?.tenantId;
    const orgId = req.tenantContext?.orgId || req.user?.orgId;
    if (!tenantId || !orgId) {
      return res.status(400).json({ success: false, message: 'Tenant context required' });
    }
    const { userId, departmentId, status } = req.query;
    const filter = { tenantId, orgId };
    if (userId) filter.userId = userId;
    if (departmentId) filter.departmentId = departmentId;
    if (status) filter.status = status;
    const list = await TenantDepartmentAccess.find(filter)
      .populate('userId', 'fullName email')
      .populate('departmentId', 'name code')
      .populate('grantedBy', 'fullName email')
      .sort({ grantedAt: -1 })
      .lean();
    res.json({ success: true, data: list });
  })
);

// Get my department access (for "user's departments")
router.get(
  '/me',
  ErrorHandler.asyncHandler(async (req, res) => {
    const tenantId = req.tenant?._id || req.tenantContext?.tenantId || req.user?.tenantId;
    const userId = req.user?._id;
    if (!tenantId || !userId) {
      return res.json({ success: true, data: [] });
    }
    const list = await TenantDepartmentAccess.findActiveForUser(tenantId, userId);
    res.json({ success: true, data: list });
  })
);

// Grant department access (tenant admin only)
router.post(
  '/',
  adminAccess,
  requireRole(['owner', 'admin', 'super_admin']),
  [
    body('userId').isMongoId().withMessage('Valid user ID required'),
    body('departmentId').isMongoId().withMessage('Valid department ID required'),
    body('permissions').optional().isArray(),
    body('accessLevel').optional().isIn(['viewer', 'contributor', 'editor', 'admin', 'owner']),
    body('expiresAt').optional().isISO8601()
  ],
  handleValidation,
  ErrorHandler.asyncHandler(async (req, res) => {
    const tenantId = req.tenant?._id || req.tenantContext?.tenantId || req.user?.tenantId;
    const orgId = req.tenantContext?.orgId || req.user?.orgId;
    if (!tenantId || !orgId) {
      return res.status(400).json({ success: false, message: 'Tenant context required' });
    }
    const { userId, departmentId, permissions, accessLevel, expiresAt } = req.body;
    const filter = await getTenantFilter(req);
    const department = await Department.findOne({ _id: departmentId, ...filter });
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    const existing = await TenantDepartmentAccess.findOne({
      tenantId,
      userId,
      departmentId,
      status: 'active'
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'User already has access to this department' });
    }
    const record = new TenantDepartmentAccess({
      tenantId,
      orgId,
      userId,
      departmentId,
      department: department.name,
      permissions: permissions || ['read'],
      accessLevel: accessLevel || 'viewer',
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      grantedBy: req.user._id
    });
    record.auditLog.push({ action: 'granted', performedBy: req.user._id });
    await record.save();
    await invalidateResolvedPermissions(tenantId, userId);
    await permissionCache.removeRevoked(tenantId.toString(), userId.toString());
    await record.populate([{ path: 'userId', select: 'fullName email' }, { path: 'departmentId', select: 'name code' }, { path: 'grantedBy', select: 'fullName email' }]);
    res.status(201).json({ success: true, data: record });
  })
);

// Update department access
router.put(
  '/:id',
  adminAccess,
  requireRole(['owner', 'admin', 'super_admin']),
  [
    body('permissions').optional().isArray(),
    body('accessLevel').optional().isIn(['viewer', 'contributor', 'editor', 'admin', 'owner']),
    body('expiresAt').optional().custom((v) => v === null || v === undefined || (typeof v === 'string' && v.length > 0))
  ],
  handleValidation,
  ErrorHandler.asyncHandler(async (req, res) => {
    const tenantId = req.tenant?._id || req.tenantContext?.tenantId || req.user?.tenantId;
    const record = await TenantDepartmentAccess.findOne({ _id: req.params.id, tenantId });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Access record not found' });
    }
    if (req.body.permissions !== undefined) record.permissions = req.body.permissions;
    if (req.body.accessLevel !== undefined) record.accessLevel = req.body.accessLevel;
    if (req.body.expiresAt !== undefined) {
      record.expiresAt = (req.body.expiresAt != null && req.body.expiresAt !== '')
        ? new Date(req.body.expiresAt)
        : null;
    }
    record.auditLog.push({ action: 'modified', performedBy: req.user._id });
    await record.save();
    await invalidateResolvedPermissions(tenantId, record.userId);
    await record.populate([{ path: 'userId', select: 'fullName email' }, { path: 'departmentId', select: 'name code' }]);
    res.json({ success: true, data: record });
  })
);

// Revoke
router.post(
  '/:id/revoke',
  adminAccess,
  requireRole(['owner', 'admin', 'super_admin']),
  body('reason').optional().isString(),
  handleValidation,
  ErrorHandler.asyncHandler(async (req, res) => {
    const tenantId = req.tenant?._id || req.tenantContext?.tenantId || req.user?.tenantId;
    const record = await TenantDepartmentAccess.findOne({ _id: req.params.id, tenantId });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Access record not found' });
    }
    const targetUserId = record.userId?.toString?.() || record.userId;
    await record.revoke(req.user._id, req.body?.reason);
    await invalidateResolvedPermissions(tenantId, targetUserId, { addRevoked: true });
    res.json({ success: true, message: 'Access revoked' });
  })
);

// Suspend
router.post(
  '/:id/suspend',
  adminAccess,
  requireRole(['owner', 'admin', 'super_admin']),
  body('reason').optional().isString(),
  handleValidation,
  ErrorHandler.asyncHandler(async (req, res) => {
    const tenantId = req.tenant?._id || req.tenantContext?.tenantId || req.user?.tenantId;
    const record = await TenantDepartmentAccess.findOne({ _id: req.params.id, tenantId });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Access record not found' });
    }
    const targetUserId = record.userId?.toString?.() || record.userId;
    await record.suspend(req.user._id, req.body?.reason);
    await invalidateResolvedPermissions(tenantId, targetUserId);
    res.json({ success: true, message: 'Access suspended' });
  })
);

// Cleanup expired (can be called by cron or admin)
router.post(
  '/cleanup-expired',
  adminAccess,
  requireRole(['owner', 'admin', 'super_admin']),
  ErrorHandler.asyncHandler(async (req, res) => {
    const tenantId = req.tenant?._id || req.tenantContext?.tenantId || req.user?.tenantId;
    const toExpire = await TenantDepartmentAccess.find({
      tenantId,
      status: 'active',
      expiresAt: { $lt: new Date() }
    }).select('userId').lean();
    const result = await TenantDepartmentAccess.cleanupExpired();
    for (const r of toExpire) {
      const uid = r.userId?.toString?.() || r.userId;
      if (uid) await invalidateResolvedPermissions(tenantId, uid, { addRevoked: true });
    }
    res.json({ success: true, message: 'Expired access cleaned up', modifiedCount: result.modifiedCount });
  })
);

module.exports = router;
