const express = require('express');
const router = express.Router();
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const ProjectAccess = require('../../../models/ProjectAccess');
const Project = require('../../../models/Project');
const User = require('../../../models/User');
const Team = require('../../../models/Team');
const projectAccessRead = requireErpAccess({ module: 'projects', action: ['read', 'read_own'], checkRevocation: false });
const projectAccessWrite = requireErpAccess({ module: 'projects', action: 'write', checkRevocation: false });

router.use(verifyERPToken);

// Get project access for a specific project
router.get('/project/:projectId', projectAccessRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { accessType, status } = req.query;
  const orgId = req.user.orgId;
  
  let query = { projectId, orgId };
  
  if (accessType) {
    query.accessType = accessType;
  }
  
  if (status) {
    query.status = status;
  }
  
  const accessList = await ProjectAccess.find(query)
    .populate('userId', 'name email avatar department')
    .populate('teamId', 'name description')
    .populate('roleId', 'name roleType level')
    .populate('grantedBy', 'name email')
    .sort({ createdAt: -1 });
  
  res.json({
    success: true,
    data: accessList
  });
}));

// Get user's project access
router.get('/user/:userId', projectAccessRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status, projectId } = req.query;
  const orgId = req.user.orgId;
  
  let query = { userId, orgId };
  
  if (status) {
    query.status = status;
  }
  
  if (projectId) {
    query.projectId = projectId;
  }
  
  const userAccess = await ProjectAccess.find(query)
    .populate('projectId', 'name description status clientId')
    .populate('roleId', 'name roleType level')
    .populate('grantedBy', 'name email')
    .sort({ createdAt: -1 });
  
  res.json({
    success: true,
    data: userAccess
  });
}));

// Grant project access
router.post('/grant', projectAccessWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const {
    projectId,
    userId,
    teamId,
    roleId,
    accessType,
    projectRole,
    accessLevel,
    permissions,
    phaseAccess,
    techStackAccess,
    timeAllocation,
    hourlyRate,
    expiresAt,
    isPermanent,
    notes
  } = req.body;
  
  const orgId = req.user.orgId;
  const tenantId = req.user.tenantId;
  
  // Validate project exists
  const project = await Project.findOne({ _id: projectId, orgId });
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }
  
  // Check if access already exists
  const existingAccess = await ProjectAccess.findOne({
    projectId,
    userId: userId || null,
    teamId: teamId || null,
    roleId: roleId || null,
    orgId
  });
  
  if (existingAccess) {
    return res.status(400).json({
      success: false,
      message: 'Access already granted for this user/team/role'
    });
  }
  
  const projectAccess = new ProjectAccess({
    projectId,
    orgId,
    tenantId,
    userId,
    teamId,
    roleId,
    accessType,
    permissions: permissions || {},
    projectRole,
    accessLevel,
    phaseAccess: phaseAccess || {},
    techStackAccess: techStackAccess || {},
    timeAllocation: timeAllocation || {},
    hourlyRate,
    expiresAt,
    isPermanent: isPermanent !== false,
    notes,
    grantedBy: req.user.userId
  });
  
  await projectAccess.save();
  
  // Populate the response
  await projectAccess.populate([
    { path: 'userId', select: 'name email avatar' },
    { path: 'teamId', select: 'name description' },
    { path: 'roleId', select: 'name roleType level' },
    { path: 'grantedBy', select: 'name email' }
  ]);
  
  res.status(201).json({
    success: true,
    data: projectAccess,
    message: 'Project access granted successfully'
  });
}));

// Update project access
router.put('/:accessId', projectAccessWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { accessId } = req.params;
  const updates = req.body;
  const orgId = req.user.orgId;
  
  const projectAccess = await ProjectAccess.findOneAndUpdate(
    { _id: accessId, orgId },
    { ...updates, updatedAt: new Date() },
    { new: true, runValidators: true }
  )
    .populate('userId', 'name email avatar')
    .populate('teamId', 'name description')
    .populate('roleId', 'name roleType level')
    .populate('grantedBy', 'name email');
  
  if (!projectAccess) {
    return res.status(404).json({
      success: false,
      message: 'Project access not found'
    });
  }
  
  res.json({
    success: true,
    data: projectAccess,
    message: 'Project access updated successfully'
  });
}));

// Revoke project access
router.delete('/:accessId', projectAccessWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { accessId } = req.params;
  const orgId = req.user.orgId;
  
  const projectAccess = await ProjectAccess.findOneAndDelete({ _id: accessId, orgId });
  
  if (!projectAccess) {
    return res.status(404).json({
      success: false,
      message: 'Project access not found'
    });
  }
  
  res.json({
    success: true,
    message: 'Project access revoked successfully'
  });
}));

// Check user permission for project
router.get('/check/:projectId/:userId/:permission', projectAccessRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId, userId, permission } = req.params;
  const orgId = req.user.orgId;
  
  const projectAccess = await ProjectAccess.findOne({
    projectId,
    userId,
    orgId,
    status: 'active'
  });
  
  if (!projectAccess) {
    return res.json({
      success: true,
      hasPermission: false,
      message: 'No project access found'
    });
  }
  
  if (projectAccess.isExpired()) {
    return res.json({
      success: true,
      hasPermission: false,
      message: 'Project access has expired'
    });
  }
  
  const hasPermission = projectAccess.hasPermission(permission);
  
  res.json({
    success: true,
    hasPermission,
    accessLevel: projectAccess.accessLevel,
    projectRole: projectAccess.projectRole
  });
}));

// Get project team members
router.get('/project/:projectId/team', projectAccessRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { status, projectRole } = req.query;
  const orgId = req.user.orgId;
  
  let query = { projectId, orgId, accessType: 'user' };
  
  if (status) {
    query.status = status;
  }
  
  if (projectRole) {
    query.projectRole = projectRole;
  }
  
  const teamMembers = await ProjectAccess.find(query)
    .populate('userId', 'name email avatar department')
    .populate('roleId', 'name roleType level')
    .sort({ projectRole: 1, 'userId.name': 1 });
  
  res.json({
    success: true,
    data: teamMembers
  });
}));

// Bulk grant access
router.post('/bulk-grant', projectAccessWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId, users, teams, roles, defaultPermissions } = req.body;
  const orgId = req.user.orgId;
  const tenantId = req.user.tenantId;
  
  const accessGrants = [];
  
  // Grant access to users
  if (users && users.length > 0) {
    for (const user of users) {
      const access = new ProjectAccess({
        projectId,
        orgId,
        tenantId,
        userId: user.userId,
        accessType: 'user',
        permissions: user.permissions || defaultPermissions || {},
        projectRole: user.projectRole || 'developer',
        accessLevel: user.accessLevel || 'contributor',
        grantedBy: req.user.userId
      });
      accessGrants.push(access);
    }
  }
  
  // Grant access to teams
  if (teams && teams.length > 0) {
    for (const team of teams) {
      const access = new ProjectAccess({
        projectId,
        orgId,
        tenantId,
        teamId: team.teamId,
        accessType: 'team',
        permissions: team.permissions || defaultPermissions || {},
        projectRole: team.projectRole || 'developer',
        accessLevel: team.accessLevel || 'contributor',
        grantedBy: req.user.userId
      });
      accessGrants.push(access);
    }
  }
  
  // Grant access to roles
  if (roles && roles.length > 0) {
    for (const role of roles) {
      const access = new ProjectAccess({
        projectId,
        orgId,
        tenantId,
        roleId: role.roleId,
        accessType: 'role',
        permissions: role.permissions || defaultPermissions || {},
        projectRole: role.projectRole || 'developer',
        accessLevel: role.accessLevel || 'contributor',
        grantedBy: req.user.userId
      });
      accessGrants.push(access);
    }
  }
  
  const savedAccess = await ProjectAccess.insertMany(accessGrants);
  
  res.status(201).json({
    success: true,
    data: savedAccess,
    message: `Successfully granted access to ${savedAccess.length} entities`
  });
}));

// Update last accessed
router.patch('/:accessId/accessed', projectAccessWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { accessId } = req.params;
  const orgId = req.user.orgId;
  
  const projectAccess = await ProjectAccess.findOne({ _id: accessId, orgId });
  
  if (!projectAccess) {
    return res.status(404).json({
      success: false,
      message: 'Project access not found'
    });
  }
  
  await projectAccess.updateLastAccessed();
  
  res.json({
    success: true,
    message: 'Last accessed updated'
  });
}));

// Get access statistics
router.get('/stats/:projectId', projectAccessRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const orgId = req.user.orgId;
  
  const stats = await ProjectAccess.aggregate([
    { $match: { projectId: projectId, orgId: orgId } },
    {
      $group: {
        _id: null,
        totalAccess: { $sum: 1 },
        activeAccess: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        userAccess: {
          $sum: { $cond: [{ $eq: ['$accessType', 'user'] }, 1, 0] }
        },
        teamAccess: {
          $sum: { $cond: [{ $eq: ['$accessType', 'team'] }, 1, 0] }
        },
        roleAccess: {
          $sum: { $cond: [{ $eq: ['$accessType', 'role'] }, 1, 0] }
        }
      }
    }
  ]);
  
  const roleStats = await ProjectAccess.aggregate([
    { $match: { projectId: projectId, orgId: orgId, accessType: 'user' } },
    {
      $group: {
        _id: '$projectRole',
        count: { $sum: 1 }
      }
    }
  ]);
  
  res.json({
    success: true,
    data: {
      overview: stats[0] || {
        totalAccess: 0,
        activeAccess: 0,
        userAccess: 0,
        teamAccess: 0,
        roleAccess: 0
      },
      roleDistribution: roleStats
    }
  });
}));

module.exports = router;
