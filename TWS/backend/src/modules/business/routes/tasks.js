const express = require('express');
const router = express.Router();
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const Task = require('../../../models/Task');
const Project = require('../../../models/Project');
const ProjectMember = require('../../../models/ProjectMember');
const Activity = require('../../../models/Activity');
const autoCalculationService = require('../../../services/nucleusAutoCalculationService');
router.use(verifyERPToken);

// Get all tasks for organization with filtering
router.get('/',  ErrorHandler.asyncHandler(async (req, res) => {
  const { 
    projectId, 
    departmentId,
    assignee, 
    status, 
    priority, 
    search, 
    dueDate, 
    page = 1, 
    limit = 50,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;
  
  const orgId = req.user.orgId;
  const skip = (page - 1) * limit;
  
  let query = { orgId };
  
  // Apply filters
  if (projectId) query.projectId = projectId;
  if (departmentId) query.departmentId = departmentId;
  if (assignee) query.assignee = assignee;
  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (dueDate) {
    const date = new Date(dueDate);
    query.dueDate = {
      $gte: new Date(date.setHours(0, 0, 0, 0)),
      $lte: new Date(date.setHours(23, 59, 59, 999))
    };
  }
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { labels: { $in: [new RegExp(search, 'i')] } }
    ];
  }
  
  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  const tasks = await Task.find(query)
    .populate('assignee', 'fullName email avatar')
    .populate('reporter', 'fullName email')
    .populate('projectId', 'name slug')
    .populate('departmentId', 'name code')
    .populate('listId', 'name')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));
  
  const total = await Task.countDocuments(query);
  
  res.json({
    success: true,
    data: {
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// Get tasks grouped by status (for Kanban board)
router.get('/kanban',  ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId, assignee } = req.query;
  const orgId = req.user.orgId;
  
  let query = { orgId };
  if (projectId) query.projectId = projectId;
  if (assignee) query.assignee = assignee;
  
  const tasks = await Task.find(query)
    .populate('assignee', 'fullName email avatar')
    .populate('reporter', 'fullName email')
    .populate('projectId', 'name slug')
    .populate('listId', 'name')
    .sort({ order: 1, createdAt: -1 });
  
  // Group tasks by status
  const groupedTasks = {
    todo: tasks.filter(task => task.status === 'todo'),
    in_progress: tasks.filter(task => task.status === 'in_progress'),
    under_review: tasks.filter(task => task.status === 'under_review'),
    completed: tasks.filter(task => task.status === 'completed')
  };
  
  res.json({
    success: true,
    data: { tasks: groupedTasks }
  });
}));

// Get single task
router.get('/:taskId',  ErrorHandler.asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const orgId = req.user.orgId;
  
  const task = await Task.findOne({ _id: taskId, orgId })
    .populate('assignee', 'fullName email avatar department jobTitle')
    .populate('reporter', 'fullName email')
    .populate('projectId', 'name slug description')
    .populate('listId', 'name')
    .populate('comments.userId', 'fullName email avatar')
    .populate('timeEntries.userId', 'fullName email')
    .populate('dependencies.taskId', 'title status priority');
  
  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }
  
  // Check if user has access to this task's project
  const member = await ProjectMember.findOne({
    projectId: task.projectId._id,
    userId: req.user._id,
    status: 'active'
  });
  
  if (!member && !['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this task'
    });
  }
  
  res.json({
    success: true,
    data: { task }
  });
}));

// Create new task
router.post('/',  ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  const {
    projectId,
    boardId,
    listId,
    title,
    description,
    assignee,
    dueDate,
    priority = 'medium',
    labels = [],
    estimatedHours,
    subtasks = []
  } = req.body;
  
  // Verify project exists and user has access
  const project = await Project.findOne({ _id: projectId, orgId });
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }
  
  // Check if user has permission to create tasks in this project
  const member = await ProjectMember.findOne({
    projectId,
    userId: req.user._id,
    status: 'active'
  });
  
  if (!member && !['super_admin', 'org_manager', 'pmo', 'project_manager'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to create tasks in this project'
    });
  }
  
  // Get next order number for the list
  const lastTask = await Task.findOne({ listId }).sort({ order: -1 });
  const order = lastTask ? lastTask.order + 1 : 0;
  
  const task = new Task({
    orgId,
    projectId,
    boardId,
    listId,
    title,
    description,
    assignee,
    dueDate,
    priority,
    labels,
    estimatedHours,
    subtasks,
    reporter: req.user._id,
    order
  });
  
  await task.save();
  
  // Populate the created task
  await task.populate([
    { path: 'assignee', select: 'fullName email avatar' },
    { path: 'reporter', select: 'fullName email' },
    { path: 'projectId', select: 'name slug' },
    { path: 'listId', select: 'name' }
  ]);
  
  // Nucleus: Auto-update deliverable progress if task is linked to deliverable
  if (task.milestoneId) {
    try {
      await autoCalculationService.onTaskLinked(task.milestoneId, task._id);
    } catch (error) {
      console.warn('Error updating deliverable progress:', error.message);
      // Don't fail task creation if deliverable update fails
    }
  }
  
  // Log activity
  const activity = new Activity({
    orgId,
    projectId,
    userId: req.user._id,
    entityType: 'task',
    entityId: task._id,
    action: 'created',
    details: { title: task.title, assignee: task.assignee?.fullName }
  });
  await activity.save();
  
  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: { task }
  });
}));

// Update task
router.patch('/:taskId',  ErrorHandler.asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const orgId = req.user.orgId;
  const updates = req.body;
  
  const task = await Task.findOne({ _id: taskId, orgId });
  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }
  
  // Check permissions
  const member = await ProjectMember.findOne({
    projectId: task.projectId,
    userId: req.user._id,
    status: 'active'
  });
  
  const canEdit = member && (
    member.permissions.canEditCards || 
    ['owner', 'manager'].includes(member.role) ||
    task.assignee?.toString() === req.user._id.toString()
  );
  
  if (!canEdit && !['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to update this task'
    });
  }
  
  // Store old status for Nucleus auto-calculation
  const oldStatus = task.status;
  const oldMilestoneId = task.milestoneId;
  
  // Handle status updates
  if (updates.status && updates.status !== task.status) {
    await task.updateStatus(updates.status);
    delete updates.status; // Remove from updates since it's handled by the method
  }
  
  // Update other fields
  Object.assign(task, updates);
  await task.save();
  
  // Nucleus: Auto-update deliverable progress if task status changed or milestone changed
  if (task.milestoneId && (oldStatus !== task.status || oldMilestoneId !== task.milestoneId)) {
    try {
      await autoCalculationService.onTaskStatusChange(task._id);
    } catch (error) {
      console.warn('Error updating deliverable progress:', error.message);
      // Don't fail task update if deliverable update fails
    }
  }
  
  // Populate updated task
  await task.populate([
    { path: 'assignee', select: 'fullName email avatar' },
    { path: 'reporter', select: 'fullName email' },
    { path: 'projectId', select: 'name slug' },
    { path: 'listId', select: 'name' }
  ]);
  
  // Log activity
  const activity = new Activity({
    orgId,
    projectId: task.projectId,
    userId: req.user._id,
    entityType: 'task',
    entityId: task._id,
    action: 'updated',
    details: updates
  });
  await activity.save();
  
  res.json({
    success: true,
    message: 'Task updated successfully',
    data: { task }
  });
}));

// Update task status (for drag and drop)
router.patch('/:taskId/status',  ErrorHandler.asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { status, listId, order } = req.body;
  const orgId = req.user.orgId;
  
  const task = await Task.findOne({ _id: taskId, orgId });
  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }
  
  // Check permissions
  const member = await ProjectMember.findOne({
    projectId: task.projectId,
    userId: req.user._id,
    status: 'active'
  });
  
  const canEdit = member && (
    member.permissions.canEditCards || 
    ['owner', 'manager'].includes(member.role) ||
    task.assignee?.toString() === req.user._id.toString()
  );
  
  if (!canEdit && !['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to update this task'
    });
  }
  
  // Store old status for Nucleus auto-calculation
  const oldStatus = task.status;
  
  // Update status and related fields
  task.status = status;
  if (listId) task.listId = listId;
  if (order !== undefined) task.order = order;
  
  // Set completion date if status is completed
  if (status === 'completed' && !task.completedDate) {
    task.completedDate = new Date();
    task.progress = 100;
  } else if (status !== 'completed' && task.completedDate) {
    task.completedDate = null;
  }
  
  await task.save();
  
  await task.save();
  
  // Nucleus: Auto-update deliverable progress if task status changed and is linked to deliverable
  if (task.milestoneId && oldStatus !== task.status) {
    try {
      await autoCalculationService.onTaskStatusChange(task._id);
    } catch (error) {
      console.warn('Error updating deliverable progress:', error.message);
      // Don't fail task update if deliverable update fails
    }
  }
  
  // Log activity
  const activity = new Activity({
    orgId,
    projectId: task.projectId,
    userId: req.user._id,
    entityType: 'task',
    entityId: task._id,
    action: 'status_changed',
    details: { from: oldStatus, to: status }
  });
  await activity.save();
  
  res.json({
    success: true,
    message: 'Task status updated successfully',
    data: { task }
  });
}));

// Delete task
router.delete('/:taskId',  ErrorHandler.asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const orgId = req.user.orgId;
  
  const task = await Task.findOne({ _id: taskId, orgId });
  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }
  
  // Check permissions - only owners, managers, and super admins can delete
  const member = await ProjectMember.findOne({
    projectId: task.projectId,
    userId: req.user._id,
    status: 'active'
  });
  
  const canDelete = member && (
    member.permissions.canDeleteCards || 
    ['owner', 'manager'].includes(member.role)
  );
  
  if (!canDelete && !['super_admin', 'org_manager'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to delete this task'
    });
  }
  
  // Log activity before deleting
  const activity = new Activity({
    orgId,
    projectId: task.projectId,
    userId: req.user._id,
    entityType: 'task',
    entityId: task._id,
    action: 'deleted',
    details: { title: task.title }
  });
  await activity.save();
  
  await Task.findByIdAndDelete(taskId);
  
  res.json({
    success: true,
    message: 'Task deleted successfully'
  });
}));

// Add comment to task
router.post('/:taskId/comments',  ErrorHandler.asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { content } = req.body;
  const orgId = req.user.orgId;
  
  const task = await Task.findOne({ _id: taskId, orgId });
  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }
  
  // Check if user has access to this task's project
  const member = await ProjectMember.findOne({
    projectId: task.projectId,
    userId: req.user._id,
    status: 'active'
  });
  
  if (!member && !['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this task'
    });
  }
  
  task.comments.push({
    userId: req.user._id,
    content
  });
  
  await task.save();
  
  // Populate the comment
  await task.populate('comments.userId', 'fullName email avatar');
  const newComment = task.comments[task.comments.length - 1];
  
  res.status(201).json({
    success: true,
    message: 'Comment added successfully',
    data: { comment: newComment }
  });
}));

// Add time entry to task
router.post('/:taskId/time-entries',  ErrorHandler.asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { hours, description, date } = req.body;
  const orgId = req.user.orgId;
  
  const task = await Task.findOne({ _id: taskId, orgId });
  if (!task) {
    return res.status(404).json({
      success: false,
      message: 'Task not found'
    });
  }
  
  // Check if user has access to this task's project
  const member = await ProjectMember.findOne({
    projectId: task.projectId,
    userId: req.user._id,
    status: 'active'
  });
  
  if (!member && !['super_admin', 'org_manager', 'pmo'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this task'
    });
  }
  
  await task.addTimeEntry(req.user._id, hours, description, date);
  
  // Populate the time entry
  await task.populate('timeEntries.userId', 'fullName email');
  const newTimeEntry = task.timeEntries[task.timeEntries.length - 1];
  
  res.status(201).json({
    success: true,
    message: 'Time entry added successfully',
    data: { timeEntry: newTimeEntry, actualHours: task.actualHours }
  });
}));

// Get task statistics
router.get('/stats/overview',  ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.query;
  const orgId = req.user.orgId;
  
  let matchQuery = { orgId };
  if (projectId) matchQuery.projectId = projectId;
  
  const stats = await Task.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        inProgressTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
        },
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$status', 'completed'] },
                  { $lt: ['$dueDate', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        },
        totalEstimatedHours: { $sum: '$estimatedHours' },
        totalActualHours: { $sum: '$actualHours' }
      }
    }
  ]);
  
  const result = stats[0] || {
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    totalEstimatedHours: 0,
    totalActualHours: 0
  };
  
  res.json({
    success: true,
    data: { stats: result }
  });
}));

module.exports = router;
