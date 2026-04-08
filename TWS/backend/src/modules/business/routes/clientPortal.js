const express = require('express');
const { authenticateToken, requireRole } = require('../../../middleware/auth/auth');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const Project = require('../../../models/Project');
const Card = require('../../../models/Card');
const ProjectClient = require('../../../models/Client');

const router = express.Router();

// Get client's projects (accessible by client role). Scoped by orgId so clients cannot see other tenants' data.
router.get('/projects', authenticateToken, requireRole(['client']), ErrorHandler.asyncHandler(async (req, res) => {
  const { _id: userId } = req.user;
  const orgId = req.user?.orgId || req.orgId;
  if (!orgId) {
    return res.status(400).json({ success: false, message: 'Organization context required' });
  }

  // Find client record (scoped to current org)
  const client = await ProjectClient.findOne({ userId, orgId });
  if (!client) {
    return res.status(404).json({
      success: false,
      message: 'Client record not found'
    });
  }

  // Get projects for this client (org-scoped)
  const projects = await Project.find({ clientId: client._id, orgId })
    .populate('clientId', 'name email')
    .select('-internalNotes -budget -costs');

  // Add pending approvals count for each project (Card may have orgId; filter by project ownership)
  const projectsWithApprovals = await Promise.all(
    projects.map(async (project) => {
      const pendingCount = await Card.countDocuments({
        projectId: project._id,
        status: 'pending_approval',
        clientVisible: true
      });
      
      return {
        ...project.toObject(),
        pendingApprovals: pendingCount
      };
    })
  );

  res.json({
    success: true,
    data: projectsWithApprovals
  });
}));

// Get deliverables for a specific project (client view). Org-scoped.
router.get('/projects/:projectId/deliverables', authenticateToken, requireRole(['client']), ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { _id: userId } = req.user;
  const orgId = req.user?.orgId || req.orgId;
  if (!orgId) {
    return res.status(400).json({ success: false, message: 'Organization context required' });
  }

  const client = await ProjectClient.findOne({ userId, orgId });
  if (!client) {
    return res.status(404).json({
      success: false,
      message: 'Client record not found'
    });
  }

  const project = await Project.findOne({
    _id: projectId,
    clientId: client._id,
    orgId
  });
  
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found or access denied'
    });
  }

  // Get client-visible cards (deliverables)
  const deliverables = await Card.find({
    projectId,
    clientVisible: true
  })
  .populate('assignees', 'fullName')
  .populate('comments.userId', 'fullName')
  .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: deliverables
  });
}));

// Approve or reject a deliverable. Org-scoped.
router.post('/cards/:cardId/approve', authenticateToken, requireRole(['client']), ErrorHandler.asyncHandler(async (req, res) => {
  const { cardId } = req.params;
  const { approved, comment } = req.body;
  const { _id: userId } = req.user;
  const orgId = req.user?.orgId || req.orgId;
  if (!orgId) {
    return res.status(400).json({ success: false, message: 'Organization context required' });
  }

  const card = await Card.findById(cardId)
    .populate('projectId')
    .populate('projectId.clientId');

  if (!card) {
    return res.status(404).json({
      success: false,
      message: 'Card not found'
    });
  }

  const client = await ProjectClient.findOne({ userId, orgId });
  if (!client || !card.projectId?.clientId || card.projectId.clientId._id.toString() !== client._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Update card status
  card.status = approved ? 'approved' : 'rejected';
  card.clientApproval = {
    approved,
    comment,
    approvedBy: userId,
    approvedAt: new Date()
  };

  await card.save();

  // Add approval comment if provided
  if (comment) {
    card.comments.push({
      userId,
      text: `Client ${approved ? 'approved' : 'rejected'}: ${comment}`,
      createdAt: new Date()
    });
    await card.save();
  }

  res.json({
    success: true,
    message: `Deliverable ${approved ? 'approved' : 'rejected'} successfully`,
    data: card
  });
}));

// Get project timeline/milestones (client view). Org-scoped.
router.get('/projects/:projectId/timeline', authenticateToken, requireRole(['client']), ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { _id: userId } = req.user;
  const orgId = req.user?.orgId || req.orgId;
  if (!orgId) {
    return res.status(400).json({ success: false, message: 'Organization context required' });
  }

  const client = await ProjectClient.findOne({ userId, orgId });
  if (!client) {
    return res.status(404).json({
      success: false,
      message: 'Client record not found'
    });
  }

  const project = await Project.findOne({
    _id: projectId,
    clientId: client._id,
    orgId
  });
  
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found or access denied'
    });
  }

  // Get milestone cards
  const milestones = await Card.find({
    projectId,
    clientVisible: true,
    isMilestone: true
  })
  .populate('assignees', 'fullName')
  .sort({ dueDate: 1 });

  res.json({
    success: true,
    data: {
      project: {
        name: project.name,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status
      },
      milestones
    }
  });
}));

// Add comment to a deliverable. Org-scoped.
router.post('/cards/:cardId/comments', authenticateToken, requireRole(['client']), ErrorHandler.asyncHandler(async (req, res) => {
  const { cardId } = req.params;
  const { text } = req.body;
  const { _id: userId } = req.user;
  const orgId = req.user?.orgId || req.orgId;
  if (!orgId) {
    return res.status(400).json({ success: false, message: 'Organization context required' });
  }

  if (!text || text.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Comment text is required'
    });
  }

  const card = await Card.findById(cardId)
    .populate('projectId.clientId');

  if (!card) {
    return res.status(404).json({
      success: false,
      message: 'Card not found'
    });
  }

  const client = await ProjectClient.findOne({ userId, orgId });
  if (!client || !card.projectId?.clientId || card.projectId.clientId._id.toString() !== client._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Add comment
  card.comments.push({
    userId,
    text: text.trim(),
    createdAt: new Date()
  });

  await card.save();

  res.json({
    success: true,
    message: 'Comment added successfully',
    data: card.comments[card.comments.length - 1]
  });
}));

module.exports = router;
