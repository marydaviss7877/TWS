const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken, requireRole } = require('../../../middleware/auth/auth');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const Role = require('../../../models/core/Role');
const Permission = require('../../../models/core/Permission');
const { syncRoleCatalogToOrg } = require('../../../services/tenant/roleCatalogSync.service');

// Test route to verify router is working
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Roles route is working', tenantSlug: req.params.tenantSlug });
});

// Get all roles
router.get('/', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const orgId = req.user.orgId;
  const { includeInactive } = req.query;
  
  let query = { $or: [{ tenantId }, { orgId }, { tenantId: null, orgId: null }] };
  
  if (includeInactive !== 'true') {
    query.isActive = true;
  }
  
  const roles = await Role.find(query)
    .populate('createdBy', 'fullName email')
    .sort({ name: 1 });
  
  res.json({
    success: true,
    data: roles
  });
}));

// Sync enforced role catalog → Role documents (idempotent; intersects permission codes with DB)
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
        message: 'Tenant or organization context is required to import roles.'
      });
    }
    const summary = await syncRoleCatalogToOrg({
      tenantId,
      orgId,
      createdBy: req.user.userId || req.user._id
    });
    let message = `Imported ${summary.created} new role(s); ${summary.skipped} already existed.`;
    if (summary.partialPermissions?.length > 0) {
      message +=
        ' Some permission codes were not in the database and were omitted from new roles — run Import catalog on Permissions first.';
    }
    res.status(200).json({
      success: true,
      data: summary,
      message
    });
  })
);

// Get role by ID
router.get('/:id', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;
  const orgId = req.user.orgId;
  
  const role = await Role.findOne({
    _id: id,
    $or: [{ tenantId }, { orgId }, { tenantId: null, orgId: null }]
  })
    .populate('createdBy', 'fullName email')
    .populate('permissions');
  
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role not found'
    });
  }
  
  res.json({
    success: true,
    data: role
  });
}));

// Create new role
router.post('/', authenticateToken, requireRole(['owner', 'admin', 'super_admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const orgId = req.user.orgId;
  const { name, slug, description, permissions } = req.body;
  
  // Validate required fields
  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Name is required'
    });
  }
  
  // Generate slug if not provided
  const roleSlug = slug || Role.generateSlug(name);
  
  // Check if role with same slug already exists for this tenant/org
  const existingRole = await Role.findOne({ 
    slug: roleSlug.toLowerCase().trim(),
    $or: [{ tenantId }, { orgId }]
  });
  if (existingRole) {
    return res.status(400).json({
      success: false,
      message: 'Role with this slug already exists'
    });
  }
  
  // Validate permissions if provided
  if (permissions && Array.isArray(permissions) && permissions.length > 0) {
    const permissionCodes = permissions.map(p => typeof p === 'string' ? p : p.code);
    const validPermissions = await Permission.find({
      code: { $in: permissionCodes },
      $or: [{ tenantId }, { orgId }, { tenantId: null, orgId: null }],
      isActive: true
    });
    
    if (validPermissions.length !== permissionCodes.length) {
      return res.status(400).json({
        success: false,
        message: 'Some permissions are invalid or not found'
      });
    }
  }
  
  const role = new Role({
    name: name.trim(),
    slug: roleSlug.toLowerCase().trim(),
    description: description ? description.trim() : undefined,
    permissions: permissions && Array.isArray(permissions) 
      ? permissions.map(p => typeof p === 'string' ? p : p.code)
      : [],
    tenantId,
    orgId,
    createdBy: req.user.userId || req.user._id,
    isActive: true
  });
  
  await role.save();
  
  res.status(201).json({
    success: true,
    data: role,
    message: 'Role created successfully'
  });
}));

// Update role
router.put('/:id', authenticateToken, requireRole(['owner', 'admin', 'super_admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;
  const orgId = req.user.orgId;
  const { name, slug, description, permissions, isActive } = req.body;
  
  const role = await Role.findOne({
    _id: id,
    $or: [{ tenantId }, { orgId }]
  });
  
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role not found'
    });
  }
  
  // Check if slug is being changed and if new slug already exists for this tenant/org
  const newSlug = slug || (name ? Role.generateSlug(name) : role.slug);
  if (newSlug.toLowerCase().trim() !== role.slug) {
    const existingRole = await Role.findOne({ 
      slug: newSlug.toLowerCase().trim(),
      $or: [{ tenantId }, { orgId }],
      _id: { $ne: id }
    });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Role with this slug already exists'
      });
    }
    role.slug = newSlug.toLowerCase().trim();
  }
  
  if (name !== undefined) {
    role.name = name.trim();
  }
  
  if (description !== undefined) {
    role.description = description ? description.trim() : undefined;
  }
  
  if (permissions !== undefined && Array.isArray(permissions)) {
    // Validate permissions
    const permissionCodes = permissions.map(p => typeof p === 'string' ? p : p.code);
    const validPermissions = await Permission.find({
      code: { $in: permissionCodes },
      $or: [{ tenantId }, { orgId }, { tenantId: null, orgId: null }],
      isActive: true
    });
    
    if (validPermissions.length !== permissionCodes.length) {
      return res.status(400).json({
        success: false,
        message: 'Some permissions are invalid or not found'
      });
    }
    
    role.permissions = permissionCodes;
  }
  
  if (isActive !== undefined) {
    role.isActive = isActive;
  }
  
  await role.save();
  
  res.json({
    success: true,
    data: role,
    message: 'Role updated successfully'
  });
}));

// Delete role
router.delete('/:id', authenticateToken, requireRole(['owner', 'admin', 'super_admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;
  const orgId = req.user.orgId;
  
  const role = await Role.findOne({
    _id: id,
    $or: [{ tenantId }, { orgId }]
  });
  
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role not found'
    });
  }
  
  // Soft delete by setting isActive to false
  role.isActive = false;
  await role.save();
  
  res.json({
    success: true,
    message: 'Role deleted successfully'
  });
}));

module.exports = router;

