const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../../../middleware/auth/auth');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const { checkFeatureAccessSoftwareHouseOnly } = require('../../../middleware/common/featureGate');
const SoftwareHouseRole = require('../../../models/SoftwareHouseRole');
const ProjectAccess = require('../../../models/ProjectAccess');
const User = require('../../../models/User');

// Plan feature gate: custom roles only for Software House plans that include it
router.use(authenticateToken, checkFeatureAccessSoftwareHouseOnly('customRoles'));

// Get all software house roles for organization
router.get('/', authenticateToken, requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const { roleType, level, isActive } = req.query;
  const orgId = req.user.orgId;
  
  let query = { orgId };
  
  if (roleType) {
    query.roleType = roleType;
  }
  
  if (level) {
    query.level = level;
  }
  
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }
  
  const roles = await SoftwareHouseRole.find(query)
    .populate('reportsTo', 'name roleType level')
    .populate('manages', 'name roleType level')
    .populate('createdBy', 'name email')
    .sort({ level: 1, name: 1 });
  
  res.json({
    success: true,
    data: roles
  });
}));

// Get role by ID
router.get('/:roleId', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const orgId = req.user.orgId;
  
  const role = await SoftwareHouseRole.findOne({ _id: roleId, orgId })
    .populate('reportsTo', 'name roleType level')
    .populate('manages', 'name roleType level')
    .populate('createdBy', 'name email');
  
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

// Create new software house role
router.post('/', authenticateToken, requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const {
    name,
    description,
    level,
    roleType,
    projectAccess,
    sprintAccess,
    taskAccess,
    timeTrackingAccess,
    clientAccess,
    financialAccess,
    analyticsAccess,
    hrAccess,
    systemAccess,
    moduleAccess,
    techStackAccess,
    projectTypeAccess,
    hourlyRate,
    reportsTo,
    manages
  } = req.body;
  
  const orgId = req.user.orgId;
  const tenantId = req.user.tenantId;
  
  const role = new SoftwareHouseRole({
    orgId,
    tenantId,
    name,
    description,
    level,
    roleType,
    projectAccess: projectAccess || {},
    sprintAccess: sprintAccess || {},
    taskAccess: taskAccess || {},
    timeTrackingAccess: timeTrackingAccess || {},
    clientAccess: clientAccess || {},
    financialAccess: financialAccess || {},
    analyticsAccess: analyticsAccess || {},
    hrAccess: hrAccess || {},
    systemAccess: systemAccess || {},
    moduleAccess: moduleAccess || {},
    techStackAccess: techStackAccess || {},
    projectTypeAccess: projectTypeAccess || {},
    hourlyRate,
    reportsTo,
    manages,
    createdBy: req.user.userId
  });
  
  await role.save();
  
  res.status(201).json({
    success: true,
    data: role,
    message: 'Software house role created successfully'
  });
}));

// Update software house role
router.put('/:roleId', authenticateToken, requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const updates = req.body;
  const orgId = req.user.orgId;
  
  const role = await SoftwareHouseRole.findOneAndUpdate(
    { _id: roleId, orgId },
    { ...updates, updatedAt: new Date() },
    { new: true, runValidators: true }
  );
  
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role not found'
    });
  }
  
  res.json({
    success: true,
    data: role,
    message: 'Software house role updated successfully'
  });
}));

// Delete software house role
router.delete('/:roleId', authenticateToken, requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const orgId = req.user.orgId;
  
  // Check if role is being used by any users
  const usersWithRole = await User.find({ 
    orgId, 
    'softwareHouseRole': roleId 
  });
  
  if (usersWithRole.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete role. It is assigned to ${usersWithRole.length} user(s)`
    });
  }
  
  const role = await SoftwareHouseRole.findOneAndDelete({ _id: roleId, orgId });
  
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role not found'
    });
  }
  
  res.json({
    success: true,
    message: 'Software house role deleted successfully'
  });
}));

// Get role hierarchy
router.get('/hierarchy/tree', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  
  const roles = await SoftwareHouseRole.find({ orgId, isActive: true })
    .select('name roleType level reportsTo manages')
    .populate('reportsTo', 'name roleType level')
    .populate('manages', 'name roleType level')
    .sort({ level: 1 });
  
  // Build hierarchy tree
  const buildHierarchy = (roles, parentId = null) => {
    return roles
      .filter(role => {
        if (parentId === null) {
          return !role.reportsTo;
        }
        return role.reportsTo && role.reportsTo._id.toString() === parentId.toString();
      })
      .map(role => ({
        ...role.toObject(),
        children: buildHierarchy(roles, role._id)
      }));
  };
  
  const hierarchy = buildHierarchy(roles);
  
  res.json({
    success: true,
    data: hierarchy
  });
}));

// Get role permissions summary
router.get('/:roleId/permissions', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const orgId = req.user.orgId;
  
  const role = await SoftwareHouseRole.findOne({ _id: roleId, orgId });
  
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role not found'
    });
  }
  
  const permissions = {
    projectAccess: role.projectAccess,
    sprintAccess: role.sprintAccess,
    taskAccess: role.taskAccess,
    timeTrackingAccess: role.timeTrackingAccess,
    clientAccess: role.clientAccess,
    financialAccess: role.financialAccess,
    analyticsAccess: role.analyticsAccess,
    hrAccess: role.hrAccess,
    systemAccess: role.systemAccess,
    moduleAccess: role.moduleAccess,
    projectTypeAccess: role.projectTypeAccess,
    summary: role.permissionsSummary
  };
  
  res.json({
    success: true,
    data: permissions
  });
}));

// Assign role to user
router.post('/:roleId/assign', authenticateToken, requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const { userId } = req.body;
  const orgId = req.user.orgId;
  
  const role = await SoftwareHouseRole.findOne({ _id: roleId, orgId });
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role not found'
    });
  }
  
  const user = await User.findOne({ _id: userId, orgId });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  user.softwareHouseRole = roleId;
  await user.save();
  
  res.json({
    success: true,
    message: 'Role assigned to user successfully'
  });
}));

// Remove role from user
router.delete('/:roleId/assign/:userId', authenticateToken, requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const { roleId, userId } = req.params;
  const orgId = req.user.orgId;
  
  const user = await User.findOne({ _id: userId, orgId });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  if (user.softwareHouseRole && user.softwareHouseRole.toString() === roleId) {
    user.softwareHouseRole = undefined;
    await user.save();
  }
  
  res.json({
    success: true,
    message: 'Role removed from user successfully'
  });
}));

// Get users with specific role
router.get('/:roleId/users', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const orgId = req.user.orgId;
  
  const users = await User.find({ 
    orgId, 
    softwareHouseRole: roleId 
  })
    .select('name email avatar department isActive')
    .populate('department', 'name');
  
  res.json({
    success: true,
    data: users
  });
}));

// Clone role
router.post('/:roleId/clone', authenticateToken, requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const { name, description } = req.body;
  const orgId = req.user.orgId;
  
  const originalRole = await SoftwareHouseRole.findOne({ _id: roleId, orgId });
  if (!originalRole) {
    return res.status(404).json({
      success: false,
      message: 'Original role not found'
    });
  }
  
  const clonedRole = new SoftwareHouseRole({
    ...originalRole.toObject(),
    _id: undefined,
    name: name || `${originalRole.name} (Copy)`,
    description: description || originalRole.description,
    createdBy: req.user.userId,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  await clonedRole.save();
  
  res.status(201).json({
    success: true,
    data: clonedRole,
    message: 'Role cloned successfully'
  });
}));

module.exports = router;
