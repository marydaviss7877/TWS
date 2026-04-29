const express = require('express');
const router = express.Router();
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const Resource = require('../../../models/core/Resource');
const User = require('../../../models/users-auth/User');
const Project = require('../../../models/project-delivery/Project');
const Activity = require('../../../models/analytics/Activity');
const resourcesRead = requireErpAccess({ module: 'employees', action: ['read', 'read_own'], checkRevocation: false });
const resourcesWrite = requireErpAccess({ module: 'employees', action: 'write', checkRevocation: false });
const resourcesAdmin = requireErpAccess({ module: 'employees', action: 'admin', checkRevocation: false });
router.use(verifyERPToken);

// Get all resources with filtering and search
router.get('/', resourcesRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { 
    department, 
    status, 
    availability, 
    search, 
    skill, 
    page = 1, 
    limit = 50,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;
  
  const orgId = req.user.orgId;
  const skip = (page - 1) * limit;
  
  let query = { orgId };
  
  // Apply filters
  if (department) query.department = department;
  if (status) query.status = status;
  if (availability) query['availability.status'] = availability;
  if (skill) {
    query['skills.name'] = { $regex: skill, $options: 'i' };
  }
  
  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  let resources;
  
  if (search) {
    // If search is provided, we need to search in the User collection first
    const users = await User.find({
      orgId,
      $or: [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { jobTitle: { $regex: search, $options: 'i' } }
      ]
    }).select('_id');
    
    const userIds = users.map(user => user._id);
    query.userId = { $in: userIds };
  }
  
  resources = await Resource.find(query)
    .populate('userId', 'fullName email avatar department jobTitle')
    .populate('workload.currentProjects.projectId', 'name slug status')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));
  
  const total = await Resource.countDocuments(query);
  
  res.json({
    success: true,
    data: {
      resources,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// Get resource statistics
router.get('/stats', resourcesRead, ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  
  const stats = await Resource.aggregate([
    { $match: { orgId } },
    {
      $group: {
        _id: null,
        totalResources: { $sum: 1 },
        activeResources: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        availableResources: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', 'active'] },
                  { $eq: ['$availability.status', 'available'] },
                  { $lt: ['$availability.currentAllocation', '$availability.maxAllocation'] }
                ]
              },
              1,
              0
            ]
          }
        },
        avgUtilization: { $avg: '$availability.currentAllocation' },
        totalAllocatedHours: { $sum: '$workload.totalAllocatedHours' }
      }
    }
  ]);
  
  // Department distribution
  const departmentStats = await Resource.aggregate([
    { $match: { orgId } },
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 },
        avgUtilization: { $avg: '$availability.currentAllocation' }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  // Skill distribution
  const skillStats = await Resource.aggregate([
    { $match: { orgId } },
    { $unwind: '$skills' },
    {
      $group: {
        _id: '$skills.name',
        count: { $sum: 1 },
        avgLevel: {
          $avg: {
            $switch: {
              branches: [
                { case: { $eq: ['$skills.level', 'beginner'] }, then: 1 },
                { case: { $eq: ['$skills.level', 'intermediate'] }, then: 2 },
                { case: { $eq: ['$skills.level', 'advanced'] }, then: 3 },
                { case: { $eq: ['$skills.level', 'expert'] }, then: 4 }
              ],
              default: 2
            }
          }
        }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  
  const result = stats[0] || {
    totalResources: 0,
    activeResources: 0,
    availableResources: 0,
    avgUtilization: 0,
    totalAllocatedHours: 0
  };
  
  res.json({
    success: true,
    data: {
      overview: result,
      departmentDistribution: departmentStats,
      topSkills: skillStats
    }
  });
}));

// Get single resource
router.get('/:resourceId', resourcesRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const orgId = req.user.orgId;
  
  const resource = await Resource.findOne({ _id: resourceId, orgId })
    .populate('userId', 'fullName email avatar department jobTitle phone')
    .populate('workload.currentProjects.projectId', 'name slug description status timeline')
    .populate('performance.goals')
    .populate('performance.achievements');
  
  if (!resource) {
    return res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  }
  
  res.json({
    success: true,
    data: { resource }
  });
}));

// Create new resource (assign user as resource)
router.post('/', resourcesWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  const {
    userId,
    department,
    jobTitle,
    skills = [],
    availability = {},
    preferences = {},
    cost = {}
  } = req.body;
  
  // Check if user exists and belongs to organization
  const user = await User.findOne({ _id: userId, orgId });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found in organization'
    });
  }
  
  // Check if user is already a resource
  const existingResource = await Resource.findOne({ userId, orgId });
  if (existingResource) {
    return res.status(400).json({
      success: false,
      message: 'User is already registered as a resource'
    });
  }
  
  const resource = new Resource({
    orgId,
    userId,
    department,
    jobTitle,
    skills,
    availability: {
      status: 'available',
      weeklyHours: 40,
      currentAllocation: 0,
      maxAllocation: 100,
      ...availability
    },
    preferences: {
      workingHours: {
        start: '09:00',
        end: '17:00',
        timezone: 'UTC'
      },
      communication: {
        preferredMethod: 'email',
        notificationSettings: {
          email: true,
          push: true,
          sms: false
        }
      },
      maxConcurrentProjects: 3,
      ...preferences
    },
    cost: {
      currency: 'USD',
      ...cost
    }
  });
  
  await resource.save();
  
  // Populate the created resource
  await resource.populate('userId', 'fullName email avatar department jobTitle');
  
  // Log activity
  const activity = new Activity({
    orgId,
    userId: req.user._id,
    entityType: 'resource',
    entityId: resource._id,
    action: 'created',
    details: { 
      resourceName: user.fullName,
      department,
      jobTitle 
    }
  });
  await activity.save();
  
  res.status(201).json({
    success: true,
    message: 'Resource created successfully',
    data: { resource }
  });
}));

// Update resource
router.patch('/:resourceId', resourcesWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const orgId = req.user.orgId;
  const updates = req.body;
  
  const resource = await Resource.findOne({ _id: resourceId, orgId });
  if (!resource) {
    return res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  }
  
  // Check permissions - user can update their own resource profile, or admins can update any
  const canUpdate = resource.userId.toString() === req.user._id.toString() ||
                   ['super_admin', 'org_manager', 'hr_manager'].includes(req.user.role);
  
  if (!canUpdate) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to update this resource'
    });
  }
  
  // Update fields
  Object.assign(resource, updates);
  await resource.save();
  
  // Populate updated resource
  await resource.populate('userId', 'fullName email avatar department jobTitle');
  
  // Log activity
  const activity = new Activity({
    orgId,
    userId: req.user._id,
    entityType: 'resource',
    entityId: resource._id,
    action: 'updated',
    details: updates
  });
  await activity.save();
  
  res.json({
    success: true,
    message: 'Resource updated successfully',
    data: { resource }
  });
}));

// Add project allocation to resource
router.post('/:resourceId/projects', resourcesWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const { projectId, role, allocation, startDate, endDate, hourlyRate } = req.body;
  const orgId = req.user.orgId;
  
  const resource = await Resource.findOne({ _id: resourceId, orgId });
  if (!resource) {
    return res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  }
  
  // Verify project exists
  const project = await Project.findOne({ _id: projectId, orgId });
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }
  
  try {
    await resource.addProject(projectId, role, allocation, startDate, endDate, hourlyRate);
    
    // Populate updated resource
    await resource.populate([
      { path: 'userId', select: 'fullName email avatar' },
      { path: 'workload.currentProjects.projectId', select: 'name slug' }
    ]);
    
    // Log activity
    const activity = new Activity({
      orgId,
      projectId,
      userId: req.user._id,
      entityType: 'resource',
      entityId: resource._id,
      action: 'project_allocated',
      details: { 
        projectName: project.name,
        role,
        allocation 
      }
    });
    await activity.save();
    
    res.json({
      success: true,
      message: 'Project allocated to resource successfully',
      data: { resource }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}));

// Update project allocation
router.patch('/:resourceId/projects/:projectId', resourcesWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { resourceId, projectId } = req.params;
  const { allocation, role, endDate, hourlyRate } = req.body;
  const orgId = req.user.orgId;
  
  const resource = await Resource.findOne({ _id: resourceId, orgId });
  if (!resource) {
    return res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  }
  
  try {
    if (allocation !== undefined) {
      await resource.updateProjectAllocation(projectId, allocation);
    }
    
    // Update other project fields
    const project = resource.workload.currentProjects.find(
      p => p.projectId.toString() === projectId
    );
    
    if (project) {
      if (role) project.role = role;
      if (endDate) project.endDate = endDate;
      if (hourlyRate) project.hourlyRate = hourlyRate;
      
      await resource.save();
    }
    
    // Populate updated resource
    await resource.populate([
      { path: 'userId', select: 'fullName email avatar' },
      { path: 'workload.currentProjects.projectId', select: 'name slug' }
    ]);
    
    res.json({
      success: true,
      message: 'Project allocation updated successfully',
      data: { resource }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}));

// Remove project allocation
router.delete('/:resourceId/projects/:projectId', resourcesWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { resourceId, projectId } = req.params;
  const orgId = req.user.orgId;
  
  const resource = await Resource.findOne({ _id: resourceId, orgId });
  if (!resource) {
    return res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  }
  
  await resource.removeProject(projectId);
  
  // Populate updated resource
  await resource.populate([
    { path: 'userId', select: 'fullName email avatar' },
    { path: 'workload.currentProjects.projectId', select: 'name slug' }
  ]);
  
  // Log activity
  const activity = new Activity({
    orgId,
    projectId,
    userId: req.user._id,
    entityType: 'resource',
    entityId: resource._id,
    action: 'project_removed',
    details: { projectId }
  });
  await activity.save();
  
  res.json({
    success: true,
    message: 'Project allocation removed successfully',
    data: { resource }
  });
}));

// Add skill to resource
router.post('/:resourceId/skills', resourcesWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const { name, level, category } = req.body;
  const orgId = req.user.orgId;
  
  const resource = await Resource.findOne({ _id: resourceId, orgId });
  if (!resource) {
    return res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  }
  
  // Check if skill already exists
  const existingSkill = resource.skills.find(skill => skill.name.toLowerCase() === name.toLowerCase());
  if (existingSkill) {
    return res.status(400).json({
      success: false,
      message: 'Skill already exists for this resource'
    });
  }
  
  resource.skills.push({ name, level, category });
  await resource.save();
  
  res.json({
    success: true,
    message: 'Skill added successfully',
    data: { resource }
  });
}));

// Update skill
router.patch('/:resourceId/skills/:skillId', resourcesWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { resourceId, skillId } = req.params;
  const { name, level, category } = req.body;
  const orgId = req.user.orgId;
  
  const resource = await Resource.findOne({ _id: resourceId, orgId });
  if (!resource) {
    return res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  }
  
  const skill = resource.skills.id(skillId);
  if (!skill) {
    return res.status(404).json({
      success: false,
      message: 'Skill not found'
    });
  }
  
  if (name) skill.name = name;
  if (level) skill.level = level;
  if (category) skill.category = category;
  
  await resource.save();
  
  res.json({
    success: true,
    message: 'Skill updated successfully',
    data: { resource }
  });
}));

// Remove skill
router.delete('/:resourceId/skills/:skillId', resourcesWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { resourceId, skillId } = req.params;
  const orgId = req.user.orgId;
  
  const resource = await Resource.findOne({ _id: resourceId, orgId });
  if (!resource) {
    return res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  }
  
  resource.skills.pull(skillId);
  await resource.save();
  
  res.json({
    success: true,
    message: 'Skill removed successfully',
    data: { resource }
  });
}));

// Update time tracking
router.patch('/:resourceId/time-tracking', resourcesWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const { hours, period = 'week' } = req.body;
  const orgId = req.user.orgId;
  
  const resource = await Resource.findOne({ _id: resourceId, orgId });
  if (!resource) {
    return res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  }
  
  // Check if user can update their own time tracking or is admin
  const canUpdate = resource.userId.toString() === req.user._id.toString() ||
                   ['super_admin', 'org_manager', 'hr_manager'].includes(req.user.role);
  
  if (!canUpdate) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to update time tracking'
    });
  }
  
  await resource.updateTimeTracking(hours, period);
  
  res.json({
    success: true,
    message: 'Time tracking updated successfully',
    data: { 
      timeTracking: resource.timeTracking,
      utilization: resource.utilizationPercentage
    }
  });
}));

// Delete resource
router.delete('/:resourceId', resourcesAdmin, ErrorHandler.asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const orgId = req.user.orgId;
  
  const resource = await Resource.findOne({ _id: resourceId, orgId });
  if (!resource) {
    return res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  }
  
  // Log activity before deleting
  const activity = new Activity({
    orgId,
    userId: req.user._id,
    entityType: 'resource',
    entityId: resource._id,
    action: 'deleted',
    details: { resourceName: resource.userId?.fullName || 'Unknown' }
  });
  await activity.save();
  
  await Resource.findByIdAndDelete(resourceId);
  
  res.json({
    success: true,
    message: 'Resource deleted successfully'
  });
}));

module.exports = router;
