const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireRole } = require('../../../middleware/auth/auth');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const Permission = require('../../../models/core/Permission');
const { syncCatalogToOrgPermissions } = require('../../../services/tenant/permissionCatalogSync.service');

// Get all permissions
router.get('/', authenticateToken, requireRole(['owner', 'admin', 'super_admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const orgId = req.user.orgId;
  const { includeInactive } = req.query;
  
  let query = { $or: [{ tenantId }, { orgId }, { tenantId: null, orgId: null }] };
  
  if (includeInactive !== 'true') {
    query.isActive = true;
  }
  
  const permissions = await Permission.find(query)
    .populate('createdBy', 'fullName email')
    .sort({ code: 1 });
  
  res.json({
    success: true,
    data: permissions
  });
}));

// Sync enforced catalog → Permission documents (idempotent; for role assignment UI)
router.post(
  '/sync-from-catalog',
  authenticateToken,
  requireRole(['owner', 'admin', 'super_admin']),
  ErrorHandler.asyncHandler(async (req, res) => {
    const tenantId = req.user.tenantId;
    const orgId = req.user.orgId;
    if (!tenantId && !orgId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant or organization context is required to import permissions.'
      });
    }
    const summary = await syncCatalogToOrgPermissions({
      tenantId,
      orgId,
      createdBy: req.user.userId || req.user._id
    });
    res.status(200).json({
      success: true,
      data: summary,
      message: `Imported ${summary.created} new permission(s); ${summary.skipped} already existed.`
    });
  })
);

// Get permission by ID
router.get('/:id', authenticateToken, requireRole(['owner', 'admin', 'super_admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;
  const orgId = req.user.orgId;
  
  const permission = await Permission.findOne({
    _id: id,
    $or: [{ tenantId }, { orgId }, { tenantId: null, orgId: null }]
  }).populate('createdBy', 'fullName email');
  
  if (!permission) {
    return res.status(404).json({
      success: false,
      message: 'Permission not found'
    });
  }
  
  res.json({
    success: true,
    data: permission
  });
}));

// Create new permission
router.post('/', authenticateToken, requireRole(['owner', 'admin', 'super_admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const orgId = req.user.orgId;
  const { code, description, permissionGroup } = req.body;
  
  // Validate required fields
  if (!code || !description) {
    return res.status(400).json({
      success: false,
      message: 'Code and description are required'
    });
  }
  
  // Check if permission with same code already exists for this tenant/org
  const existingPermission = await Permission.findOne({ 
    code: code.toLowerCase().trim(),
    $or: [{ tenantId }, { orgId }]
  });
  if (existingPermission) {
    return res.status(400).json({
      success: false,
      message: 'Permission with this code already exists'
    });
  }
  
  const permission = new Permission({
    code: code.toLowerCase().trim(),
    description: description.trim(),
    permissionGroup: permissionGroup ? permissionGroup.trim() : undefined,
    tenantId,
    orgId,
    createdBy: req.user.userId || req.user._id,
    isActive: true
  });
  
  await permission.save();
  
  res.status(201).json({
    success: true,
    data: permission,
    message: 'Permission created successfully'
  });
}));

// Update permission
router.put('/:id', authenticateToken, requireRole(['owner', 'admin', 'super_admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;
  const orgId = req.user.orgId;
  const { code, description, permissionGroup, isActive } = req.body;
  
  const permission = await Permission.findOne({
    _id: id,
    $or: [{ tenantId }, { orgId }]
  });
  
  if (!permission) {
    return res.status(404).json({
      success: false,
      message: 'Permission not found'
    });
  }
  
  // Check if code is being changed and if new code already exists for this tenant/org
  if (code && code.toLowerCase().trim() !== permission.code) {
    const existingPermission = await Permission.findOne({ 
      code: code.toLowerCase().trim(),
      $or: [{ tenantId }, { orgId }],
      _id: { $ne: id }
    });
    if (existingPermission) {
      return res.status(400).json({
        success: false,
        message: 'Permission with this code already exists'
      });
    }
    permission.code = code.toLowerCase().trim();
  }
  
  if (description !== undefined) {
    permission.description = description.trim();
  }
  
  if (permissionGroup !== undefined) {
    permission.permissionGroup = permissionGroup ? permissionGroup.trim() : undefined;
  }
  
  if (isActive !== undefined) {
    permission.isActive = isActive;
  }
  
  await permission.save();
  
  res.json({
    success: true,
    data: permission,
    message: 'Permission updated successfully'
  });
}));

// Delete permission
router.delete('/:id', authenticateToken, requireRole(['owner', 'admin', 'super_admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;
  const orgId = req.user.orgId;
  
  const permission = await Permission.findOne({
    _id: id,
    $or: [{ tenantId }, { orgId }]
  });
  
  if (!permission) {
    return res.status(404).json({
      success: false,
      message: 'Permission not found'
    });
  }
  
  // Soft delete by setting isActive to false
  permission.isActive = false;
  await permission.save();
  
  res.json({
    success: true,
    message: 'Permission deleted successfully'
  });
}));

module.exports = router;
