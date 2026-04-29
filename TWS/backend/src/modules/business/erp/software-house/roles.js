const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../../../../middleware/auth/auth');
const ErrorHandler = require('../../../../middleware/common/errorHandler');
const SoftwareHouseRole = require('../../../../models/admin-platform/SoftwareHouseRole');
const ProjectAccess = require('../../../../models/project-delivery/ProjectAccess');
const User = require('../../../../models/users-auth/User');

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
  
  const roles = await SoftwareHouseRole.find(query).sort({ level: 1, roleType: 1 });
  
  res.json({
    success: true,
    data: roles
  });
}));

// Get role by ID
router.get('/:id', authenticateToken, requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const role = await SoftwareHouseRole.findOne({
    _id: req.params.id,
    orgId: req.user.orgId
  });
  
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
router.post('/', authenticateToken, requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const { roleType, level, name, description, hourlyRate, techStackAccess, projectTypeAccess } = req.body;
  
  if (!roleType || !level || !name) {
    return res.status(400).json({
      success: false,
      message: 'Role type, level, and name are required'
    });
  }
  
  // Check if role already exists
  const existingRole = await SoftwareHouseRole.findOne({
    orgId: req.user.orgId,
    roleType,
    level
  });
  
  if (existingRole) {
    return res.status(400).json({
      success: false,
      message: 'Role with this type and level already exists'
    });
  }
  
  const role = new SoftwareHouseRole({
    orgId: req.user.orgId,
    roleType,
    level,
    name,
    description,
    hourlyRate,
    techStackAccess: techStackAccess || {},
    projectTypeAccess: projectTypeAccess || {},
    isActive: true
  });
  
  await role.save();
  
  res.status(201).json({
    success: true,
    message: 'Role created successfully',
    data: role
  });
}));

// Update role
router.put('/:id', authenticateToken, requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const role = await SoftwareHouseRole.findOne({
    _id: req.params.id,
    orgId: req.user.orgId
  });
  
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role not found'
    });
  }
  
  const { name, description, hourlyRate, techStackAccess, projectTypeAccess, isActive } = req.body;
  
  if (name) role.name = name;
  if (description !== undefined) role.description = description;
  if (hourlyRate !== undefined) role.hourlyRate = hourlyRate;
  if (techStackAccess) role.techStackAccess = techStackAccess;
  if (projectTypeAccess) role.projectTypeAccess = projectTypeAccess;
  if (isActive !== undefined) role.isActive = isActive;
  
  await role.save();
  
  res.json({
    success: true,
    message: 'Role updated successfully',
    data: role
  });
}));

// Delete role
router.delete('/:id', authenticateToken, requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const role = await SoftwareHouseRole.findOne({
    _id: req.params.id,
    orgId: req.user.orgId
  });
  
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role not found'
    });
  }
  
  // Check if role is assigned to any users
  const usersWithRole = await User.countDocuments({
    orgId: req.user.orgId,
    'softwareHouseRole.roleId': req.params.id
  });
  
  if (usersWithRole > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete role. It is assigned to ${usersWithRole} user(s)`
    });
  }
  
  await role.deleteOne();
  
  res.json({
    success: true,
    message: 'Role deleted successfully'
  });
}));

// Assign role to user
router.post('/:id/assign', authenticateToken, requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required'
    });
  }
  
  const role = await SoftwareHouseRole.findOne({
    _id: req.params.id,
    orgId: req.user.orgId
  });
  
  if (!role) {
    return res.status(404).json({
      success: false,
      message: 'Role not found'
    });
  }
  
  const user = await User.findOne({
    _id: userId,
    orgId: req.user.orgId
  });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  user.softwareHouseRole = {
    roleId: role._id,
    roleType: role.roleType,
    level: role.level,
    assignedAt: new Date()
  };
  
  await user.save();
  
  res.json({
    success: true,
    message: 'Role assigned successfully',
    data: user
  });
}));

// Remove role from user
router.delete('/:id/assign/:userId', authenticateToken, requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.params.userId,
    orgId: req.user.orgId
  });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  if (!user.softwareHouseRole || user.softwareHouseRole.roleId.toString() !== req.params.id) {
    return res.status(400).json({
      success: false,
      message: 'User does not have this role assigned'
    });
  }
  
  user.softwareHouseRole = undefined;
  await user.save();
  
  res.json({
    success: true,
    message: 'Role removed successfully'
  });
}));

// Get users with specific role
router.get('/:id/users', authenticateToken, requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const users = await User.find({
    orgId: req.user.orgId,
    'softwareHouseRole.roleId': req.params.id
  }).select('fullName email softwareHouseRole');
  
  res.json({
    success: true,
    data: users
  });
}));

module.exports = router;
