const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../../../middleware/auth/auth');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const Project = require('../../../models/Project');
const ProjectClient = require('../../../models/Client');
const ProjectMember = require('../../../models/ProjectMember');
const ProjectBoard = require('../../../models/Board');
const ProjectList = require('../../../models/List');
const Card = require('../../../models/Card');
const ProjectTemplate = require('../../../models/ProjectTemplate');
const Activity = require('../../../models/Activity');
const Milestone = require('../../../models/Milestone');

// Get all projects for organization
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, clientId, search, departmentId, primaryDepartmentId } = req.query;
    const orgId = req.user.orgId;
    
    let query = { orgId };
    
    // Department filtering
    if (primaryDepartmentId) {
      query.primaryDepartmentId = primaryDepartmentId;
    } else if (departmentId) {
      // Find projects where departmentId is in departments array
      query.departments = departmentId;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (clientId) {
      query.clientId = clientId;
    }
    
    if (search) {
      const searchQuery = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      };
      
      // Merge search query with existing query
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          searchQuery
        ];
        delete query.$or;
      } else {
        query.$or = searchQuery.$or;
      }
    }
    
    const projects = await Project.find(query)
      .populate('clientId', 'name contact.primary.email')
      .populate('primaryDepartmentId', 'name code')
      .populate('departments', 'name code')
      .populate('templateId', 'name category')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: { projects }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching projects',
      error: error.message
    });
  }
});

// Get portfolio metrics
router.get('/metrics', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  const { orgId } = req.user;

  // Project status distribution
  const statusDistribution = await Project.aggregate([
    { $match: { orgId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $project: { status: '$_id', count: 1, _id: 0 } }
  ]);

  // Team utilization: not yet implemented (requires ProjectMember/department capacity data)
  const utilization = [];

  // Revenue metrics
  const revenueMetrics = await Project.aggregate([
    { $match: { orgId } },
    {
      $group: {
        _id: null,
        totalBudget: { $sum: '$budget' },
        avgBudget: { $avg: '$budget' }
      }
    }
  ]);

  const revenue = revenueMetrics[0] || { totalBudget: 0, avgBudget: 0 };

  // Performance metrics (simplified)
  const performance = {
    avgCycleTime: 12, // days
    onTimeDelivery: 85, // percentage
    clientSatisfaction: 8.5 // out of 10
  };

  // Revenue at risk (projects that are overdue or at risk)
  const atRiskProjects = await Project.countDocuments({
    orgId,
    status: { $in: ['at_risk', 'overdue'] }
  });

  const atRiskRevenue = await Project.aggregate([
    { $match: { orgId, status: { $in: ['at_risk', 'overdue'] } } },
    { $group: { _id: null, total: { $sum: '$budget' } } }
  ]);

  res.json({
    success: true,
    data: {
      statusDistribution,
      utilization,
      revenue: {
        ...revenue,
        atRisk: atRiskRevenue[0]?.total || 0
      },
      performance,
      atRiskProjects
    }
  });
}));

// Manager cockpit dashboard (stub structure for frontend compatibility)
router.get('/manager/cockpit', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user?.orgId;
  const activeCount = await Project.countDocuments({ orgId, status: 'active' });
  res.json({
    success: true,
    data: {
      todayDeliverables: [],
      teamStatus: [],
      clientAlerts: [],
      budgetStatus: [],
      riskIndicators: [],
      quickStats: {
        activeProjects: activeCount,
        teamMembers: 0,
        overdueTasks: 0,
        budgetBurnRate: 0
      }
    }
  });
}));

// Project templates list (org-scoped; frontend compatibility)
router.get('/templates', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user?.orgId;
  const templates = await ProjectTemplate.find({ $or: [{ orgId }, { isPublic: true }] })
    .select('name description category')
    .lean();
  res.json({
    success: true,
    data: templates.map(t => ({
      ...t,
      category: t.category || 'other',
      usageCount: 0,
      rating: 0
    }))
  });
}));

// Upcoming milestones (org-scoped)
router.get('/milestones/upcoming', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user?.orgId;
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const milestones = await Milestone.find({
    orgId,
    dueDate: { $gte: now, $lte: thirtyDays },
    status: { $in: ['pending', 'in_progress'] }
  })
    .populate('projectId', 'name')
    .sort({ dueDate: 1 })
    .limit(20)
    .lean();
  res.json({
    success: true,
    data: milestones
  });
}));

// Get single project
router.get('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const orgId = req.user.orgId;
    
    const project = await Project.findOne({ _id: projectId, orgId })
      .populate('clientId')
      .populate('templateId')
      .populate('files.uploadedBy', 'fullName email');
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check if user has access to this project
    const member = await ProjectMember.findOne({
      projectId,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!member && !['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this project'
      });
    }
    
    res.json({
      success: true,
      data: { project }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching project',
      error: error.message
    });
  }
});

// Create new project
router.post('/', authenticateToken, requireRole(['super_admin', 'org_manager', 'pmo', 'project_manager']), async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const {
      clientId,
      name,
      description,
      budget,
      timeline,
      templateId,
      settings
    } = req.body;
    
    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const project = new Project({
      orgId,
      clientId,
      name,
      slug,
      description,
      budget,
      timeline,
      templateId,
      settings: {
        allowClientAccess: true,
        clientCanComment: true,
        clientCanApprove: true,
        requireApproval: false,
        ...settings
      }
    });
    
    await project.save();
    
    // Add creator as project owner
    const projectMember = new ProjectMember({
      projectId: project._id,
      userId: req.user._id,
      role: 'owner',
      permissions: {
        canCreateCards: true,
        canEditCards: true,
        canDeleteCards: true,
        canManageMembers: true,
        canViewBudget: true,
        canManageFiles: true,
        canTrackTime: true,
        canApproveDeliverables: true
      }
    });
    
    await projectMember.save();
    
    // Create default board if template is provided
    if (templateId) {
      const template = await ProjectTemplate.findById(templateId);
      if (template && template.boards.length > 0) {
        const defaultBoard = template.boards[0];
        
        const board = new ProjectBoard({
          projectId: project._id,
          name: defaultBoard.name,
          type: defaultBoard.type,
          order: 0,
          settings: {
            allowMemberInvites: true,
            clientVisible: true
          }
        });
        
        await board.save();
        
        // Create lists from template
        for (let i = 0; i < defaultBoard.lists.length; i++) {
          const listTemplate = defaultBoard.lists[i];
          const list = new ProjectList({
            boardId: board._id,
            projectId: project._id,
            name: listTemplate.name,
            order: listTemplate.order,
            color: listTemplate.color,
            settings: listTemplate.settings
          });
          
          await list.save();
        }
      }
    } else {
      // Create default board with basic lists
      const board = new ProjectBoard({
        projectId: project._id,
        name: 'Main Board',
        type: 'main',
        order: 0
      });
      
      await board.save();
      
      const defaultLists = [
        { name: 'Backlog', order: 0, color: '#6B7280' },
        { name: 'In Progress', order: 1, color: '#3B82F6' },
        { name: 'Review', order: 2, color: '#F59E0B' },
        { name: 'Done', order: 3, color: '#10B981' }
      ];
      
      for (const listData of defaultLists) {
        const list = new ProjectList({
          boardId: board._id,
          projectId: project._id,
          ...listData
        });
        await list.save();
      }
    }
    
    // Log activity
    const activity = new Activity({
      orgId,
      projectId: project._id,
      userId: req.user._id,
      entityType: 'project',
      entityId: project._id,
      action: 'created',
      details: { name: project.name }
    });
    await activity.save();
    
    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: { project }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating project',
      error: error.message
    });
  }
});

// Update project
router.patch('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const orgId = req.user.orgId;
    
    const project = await Project.findOne({ _id: projectId, orgId });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check permissions
    const member = await ProjectMember.findOne({
      projectId,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!member || !['owner', 'manager'].includes(member.role)) {
      if (!['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update project'
        });
      }
    }
    
    const updates = req.body;
    if (updates.name) {
      updates.slug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    
    Object.assign(project, updates);
    await project.save();
    
    // Log activity
    const activity = new Activity({
      orgId,
      projectId: project._id,
      userId: req.user._id,
      entityType: 'project',
      entityId: project._id,
      action: 'updated',
      details: updates
    });
    await activity.save();
    
    res.json({
      success: true,
      message: 'Project updated successfully',
      data: { project }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating project',
      error: error.message
    });
  }
});

// Delete project
router.delete('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const orgId = req.user.orgId;
    
    const project = await Project.findOne({ _id: projectId, orgId });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check permissions - only owners and super admins can delete
    const member = await ProjectMember.findOne({
      projectId,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!member || member.role !== 'owner') {
      if (!['super_admin', 'org_manager'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to delete project'
        });
      }
    }
    
    // Log activity before deleting
    const activity = new Activity({
      orgId,
      projectId: project._id,
      userId: req.user._id,
      entityType: 'project',
      entityId: project._id,
      action: 'deleted',
      details: { name: project.name }
    });
    await activity.save();
    
    // Delete related project members
    await ProjectMember.deleteMany({ projectId });
    
    // Delete related boards and lists
    const boards = await ProjectBoard.find({ projectId });
    for (const board of boards) {
      await ProjectList.deleteMany({ boardId: board._id });
      await Card.deleteMany({ boardId: board._id });
    }
    await ProjectBoard.deleteMany({ projectId });
    
    // Delete related activities (except the one we just created)
    await Activity.deleteMany({ projectId, _id: { $ne: activity._id } });
    
    // Actually delete the project
    await Project.findByIdAndDelete(projectId);
    
    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting project',
      error: error.message
    });
  }
});

// Get project members
router.get('/:projectId/members', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const orgId = req.user.orgId;
    
    const members = await ProjectMember.find({ projectId, status: 'active' })
      .populate('userId', 'fullName email role department jobTitle')
      .populate('invitedBy', 'fullName email');
    
    res.json({
      success: true,
      data: { members }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching project members',
      error: error.message
    });
  }
});

// Invite member to project
router.post('/:projectId/invite', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, role, permissions } = req.body;
    const orgId = req.user.orgId;
    
    // Check if user has permission to invite
    const member = await ProjectMember.findOne({
      projectId,
      userId: req.user._id,
      status: 'active'
    });
    
    if (!member || !['owner', 'manager'].includes(member.role)) {
      if (!['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to invite members'
        });
      }
    }
    
    // Check if user is already a member
    const existingMember = await ProjectMember.findOne({
      projectId,
      userId,
      status: { $ne: 'removed' }
    });
    
    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this project'
      });
    }
    
    const projectMember = new ProjectMember({
      projectId,
      userId,
      role: role || 'contributor',
      permissions: permissions || {
        canCreateCards: true,
        canEditCards: true,
        canDeleteCards: false,
        canManageMembers: false,
        canViewBudget: false,
        canManageFiles: true,
        canTrackTime: true,
        canApproveDeliverables: false
      },
      invitedBy: req.user._id
    });
    
    await projectMember.save();
    
    // Log activity
    const activity = new Activity({
      orgId,
      projectId,
      userId: req.user._id,
      entityType: 'member',
      entityId: userId,
      action: 'invited',
      details: { role }
    });
    await activity.save();
    
    res.status(201).json({
      success: true,
      message: 'Member invited successfully',
      data: { member: projectMember }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error inviting member',
      error: error.message
    });
  }
});

module.exports = router;
