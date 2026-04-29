const express = require('express');
const router = express.Router();
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const Sprint = require('../../../models/project-delivery/Sprint');
const Project = require('../../../models/project-delivery/Project');
const Card = require('../../../models/industry/Card');
const Activity = require('../../../models/analytics/Activity');
const sprintRead = requireErpAccess({ module: 'projects', action: ['read', 'read_own'], checkRevocation: false });
const sprintWrite = requireErpAccess({ module: 'projects', action: 'write', checkRevocation: false });
router.use(verifyERPToken);

// Get all sprints for a project
router.get('/project/:projectId', sprintRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { status, limit = 10, page = 1 } = req.query;
  
  let query = { projectId };
  if (status) {
    query.status = status;
  }
  
  const sprints = await Sprint.find(query)
    .populate('team.userId', 'name email avatar')
    .populate('createdBy', 'name email')
    .sort({ sprintNumber: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await Sprint.countDocuments(query);
  
  res.json({
    success: true,
    data: sprints,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    }
  });
}));

// Get active sprint for a project
router.get('/project/:projectId/active', sprintRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  
  const activeSprint = await Sprint.findOne({ 
    projectId, 
    status: 'active' 
  })
    .populate('team.userId', 'name email avatar')
    .populate('backlog.cardId')
    .populate('createdBy', 'name email');
  
  if (!activeSprint) {
    return res.json({
      success: true,
      data: null,
      message: 'No active sprint found'
    });
  }
  
  res.json({
    success: true,
    data: activeSprint
  });
}));

// Create a new sprint
router.post('/', sprintWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId, name, description, startDate, endDate, goal, team } = req.body;
  const orgId = req.user.orgId;
  const workspaceId = req.user.workspaceId;
  
  // Get the next sprint number
  const lastSprint = await Sprint.findOne({ projectId })
    .sort({ sprintNumber: -1 });
  const sprintNumber = lastSprint ? lastSprint.sprintNumber + 1 : 1;
  
  const sprint = new Sprint({
    projectId,
    workspaceId,
    orgId,
    name,
    description,
    sprintNumber,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    goal,
    team: team || [],
    createdBy: req.user.userId
  });
  
  await sprint.save();
  
  // Log activity
  await Activity.create({
    orgId,
    workspaceId,
    projectId,
    type: 'sprint_created',
    description: `Sprint "${name}" created`,
    userId: req.user.userId,
    metadata: { sprintId: sprint._id, sprintNumber }
  });
  
  res.status(201).json({
    success: true,
    data: sprint,
    message: 'Sprint created successfully'
  });
}));

// Update sprint
router.put('/:sprintId', sprintWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { sprintId } = req.params;
  const updates = req.body;
  
  const sprint = await Sprint.findByIdAndUpdate(
    sprintId,
    { ...updates, updatedAt: new Date() },
    { new: true, runValidators: true }
  );
  
  if (!sprint) {
    return res.status(404).json({
      success: false,
      message: 'Sprint not found'
    });
  }
  
  // Log activity
  await Activity.create({
    orgId: sprint.orgId,
    workspaceId: sprint.workspaceId,
    projectId: sprint.projectId,
    type: 'sprint_updated',
    description: `Sprint "${sprint.name}" updated`,
    userId: req.user.userId,
    metadata: { sprintId: sprint._id }
  });
  
  res.json({
    success: true,
    data: sprint,
    message: 'Sprint updated successfully'
  });
}));

// Start sprint
router.post('/:sprintId/start', sprintWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { sprintId } = req.params;
  
  const sprint = await Sprint.findById(sprintId);
  if (!sprint) {
    return res.status(404).json({
      success: false,
      message: 'Sprint not found'
    });
  }
  
  // Check if there's already an active sprint
  const activeSprint = await Sprint.findOne({ 
    projectId: sprint.projectId, 
    status: 'active' 
  });
  
  if (activeSprint && activeSprint._id.toString() !== sprintId) {
    return res.status(400).json({
      success: false,
      message: 'Another sprint is already active for this project'
    });
  }
  
  sprint.status = 'active';
  sprint.ceremonies.planning.completed = new Date();
  await sprint.save();
  
  // Log activity
  await Activity.create({
    orgId: sprint.orgId,
    workspaceId: sprint.workspaceId,
    projectId: sprint.projectId,
    type: 'sprint_started',
    description: `Sprint "${sprint.name}" started`,
    userId: req.user.userId,
    metadata: { sprintId: sprint._id, sprintNumber: sprint.sprintNumber }
  });
  
  res.json({
    success: true,
    data: sprint,
    message: 'Sprint started successfully'
  });
}));

// Complete sprint
router.post('/:sprintId/complete', sprintWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { sprintId } = req.params;
  const { reviewNotes, retrospectiveNotes } = req.body;
  
  const sprint = await Sprint.findById(sprintId);
  if (!sprint) {
    return res.status(404).json({
      success: false,
      message: 'Sprint not found'
    });
  }
  
  sprint.status = 'completed';
  sprint.ceremonies.review.completed = new Date();
  sprint.ceremonies.review.demoNotes = reviewNotes;
  sprint.ceremonies.retrospective.completed = new Date();
  sprint.ceremonies.retrospective.notes = retrospectiveNotes;
  
  // Calculate final metrics
  sprint.metrics.velocity = sprint.capacity.completedStoryPoints;
  
  await sprint.save();
  
  // Log activity
  await Activity.create({
    orgId: sprint.orgId,
    workspaceId: sprint.workspaceId,
    projectId: sprint.projectId,
    type: 'sprint_completed',
    description: `Sprint "${sprint.name}" completed`,
    userId: req.user.userId,
    metadata: { 
      sprintId: sprint._id, 
      sprintNumber: sprint.sprintNumber,
      velocity: sprint.metrics.velocity
    }
  });
  
  res.json({
    success: true,
    data: sprint,
    message: 'Sprint completed successfully'
  });
}));

// Add card to sprint backlog
router.post('/:sprintId/backlog', sprintWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { sprintId } = req.params;
  const { cardId } = req.body;
  
  const sprint = await Sprint.findById(sprintId);
  if (!sprint) {
    return res.status(404).json({
      success: false,
      message: 'Sprint not found'
    });
  }
  
  // Check if card exists and belongs to the same project
  const card = await Card.findById(cardId);
  if (!card || card.projectId.toString() !== sprint.projectId.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Card not found or does not belong to this project'
    });
  }
  
  // Add to backlog if not already present
  const existingBacklogItem = sprint.backlog.find(item => 
    item.cardId.toString() === cardId
  );
  
  if (!existingBacklogItem) {
    sprint.backlog.push({
      cardId,
      addedBy: req.user.userId
    });
    
    await sprint.save();
    
    // Log activity
    await Activity.create({
      orgId: sprint.orgId,
      workspaceId: sprint.workspaceId,
      projectId: sprint.projectId,
      type: 'card_added_to_sprint',
      description: `Card "${card.title}" added to sprint "${sprint.name}"`,
      userId: req.user.userId,
      metadata: { sprintId: sprint._id, cardId }
    });
  }
  
  res.json({
    success: true,
    data: sprint,
    message: 'Card added to sprint backlog'
  });
}));

// Remove card from sprint backlog
router.delete('/:sprintId/backlog/:cardId', sprintWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { sprintId, cardId } = req.params;
  
  const sprint = await Sprint.findById(sprintId);
  if (!sprint) {
    return res.status(404).json({
      success: false,
      message: 'Sprint not found'
    });
  }
  
  sprint.backlog = sprint.backlog.filter(item => 
    item.cardId.toString() !== cardId
  );
  
  await sprint.save();
  
  // Log activity
  await Activity.create({
    orgId: sprint.orgId,
    workspaceId: sprint.workspaceId,
    projectId: sprint.projectId,
    type: 'card_removed_from_sprint',
    description: `Card removed from sprint "${sprint.name}"`,
    userId: req.user.userId,
    metadata: { sprintId: sprint._id, cardId }
  });
  
  res.json({
    success: true,
    data: sprint,
    message: 'Card removed from sprint backlog'
  });
}));

// Get sprint metrics
router.get('/:sprintId/metrics', sprintRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { sprintId } = req.params;
  
  const sprint = await Sprint.findById(sprintId)
    .populate('backlog.cardId')
    .populate('team.userId', 'name email');
  
  if (!sprint) {
    return res.status(404).json({
      success: false,
      message: 'Sprint not found'
    });
  }
  
  // Calculate additional metrics
  const totalCards = sprint.backlog.length;
  const completedCards = sprint.backlog.filter(item => 
    item.cardId && item.cardId.status === 'completed'
  ).length;
  
  const completionRate = totalCards > 0 ? (completedCards / totalCards) * 100 : 0;
  
  const metrics = {
    ...sprint.metrics,
    totalCards,
    completedCards,
    completionRate,
    progress: sprint.progress,
    health: sprint.health
  };
  
  res.json({
    success: true,
    data: metrics
  });
}));

module.exports = router;
