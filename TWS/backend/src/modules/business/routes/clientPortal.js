const express = require('express');
const { authenticateToken, requireRole } = require('../../../middleware/auth/auth');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const Project = require('../../../models/Project');
const Card = require('../../../models/Card');
const ProjectClient = require('../../../models/Client');
const { TimeEntry } = require('../../../models/Finance');

const router = express.Router();

const PROJECT_SELECT_FIELDS = [
  '_id',
  'name',
  'description',
  'status',
  'priority',
  'timeline',
  'metrics',
  'tags',
  'createdAt',
  'updatedAt',
  'settings.portalSettings',
  'settings.clientCanApprove',
  'settings.clientCanComment'
].join(' ');

const CARD_SELECT_FIELDS = [
  '_id',
  'projectId',
  'title',
  'description',
  'status',
  'priority',
  'dueDate',
  'startDate',
  'completedAt',
  'attachments',
  'clientApproval',
  'comments',
  'assignees',
  'createdAt',
  'updatedAt'
].join(' ');

const CLIENT_CARD_STATUSES = ['todo', 'in_progress', 'review', 'testing', 'done', 'blocked'];

const getOrgIdFromReq = (req) => req.user?.orgId?._id || req.user?.orgId || req.orgId || null;

const mapDeliverable = (card) => ({
  _id: card._id,
  projectId: card.projectId,
  title: card.title,
  description: card.description,
  status: card.status,
  priority: card.priority,
  dueDate: card.dueDate,
  startDate: card.startDate,
  completedAt: card.completedAt,
  attachments: Array.isArray(card.attachments) ? card.attachments : [],
  assignees: Array.isArray(card.assignees) ? card.assignees : [],
  comments: Array.isArray(card.comments) ? card.comments : [],
  clientApproval: card.clientApproval || null,
  createdAt: card.createdAt,
  updatedAt: card.updatedAt
});

const getClientContext = async (req) => {
  const { _id: userId } = req.user;
  const orgId = getOrgIdFromReq(req);
  if (!orgId) {
    return { error: { status: 400, message: 'Organization context required' } };
  }

  const client = await ProjectClient.findOne({ userId, orgId, status: { $ne: 'inactive' } })
    .select('_id orgId portal userId');

  if (!client) {
    return { error: { status: 404, message: 'Client record not found' } };
  }

  if (client.portal?.enabled === false) {
    return { error: { status: 403, message: 'Client portal access is disabled for this account' } };
  }

  return { userId, orgId, client };
};

const resolveProjectForClient = async ({ projectId, orgId, client }) => {
  const project = await Project.findOne({
    _id: projectId,
    orgId,
    clientId: client._id
  }).select(PROJECT_SELECT_FIELDS);

  if (!project) {
    return { error: { status: 404, message: 'Project not found or access denied' } };
  }

  if (!project.settings?.portalSettings?.allowClientPortal) {
    return { error: { status: 403, message: 'Client portal is disabled for this project' } };
  }

  return { project };
};

const resolveCardForClient = async ({ cardId, orgId, client }) => {
  const card = await Card.findById(cardId)
    .select(CARD_SELECT_FIELDS)
    .populate({
      path: 'projectId',
      select: PROJECT_SELECT_FIELDS
    });

  if (!card || !card.projectId) {
    return { error: { status: 404, message: 'Deliverable not found' } };
  }

  const project = card.projectId;
  if (String(project.orgId) !== String(orgId) || String(project.clientId) !== String(client._id)) {
    return { error: { status: 403, message: 'Access denied' } };
  }

  if (!project.settings?.portalSettings?.allowClientPortal) {
    return { error: { status: 403, message: 'Client portal is disabled for this project' } };
  }

  return { card, project };
};

// Get client's projects (accessible by client role). Scoped by orgId so clients cannot see other tenants' data.
router.get('/projects', authenticateToken, requireRole(['client']), ErrorHandler.asyncHandler(async (req, res) => {
  const context = await getClientContext(req);
  if (context.error) {
    return res.status(context.error.status).json({ success: false, message: context.error.message });
  }

  const { orgId, client } = context;
  const projects = await Project.find({
    clientId: client._id,
    orgId,
    'settings.portalSettings.allowClientPortal': true
  })
    .select(PROJECT_SELECT_FIELDS)
    .sort({ updatedAt: -1 });

  // Add pending approvals count for each project (Card may have orgId; filter by project ownership)
  const projectsWithApprovals = await Promise.all(
    projects.map(async (project) => {
      const pendingCount = await Card.countDocuments({
        projectId: project._id,
        status: { $in: ['review', 'testing'] },
        clientVisible: true
      });

      return {
        _id: project._id,
        name: project.name,
        description: project.description,
        status: project.status,
        priority: project.priority,
        timeline: project.timeline || {},
        metrics: project.metrics || {},
        pendingApprovals: pendingCount
      };
    })
  );

  res.json({
    success: true,
    data: projectsWithApprovals
  });
}));

// Get single project detail (client-safe shape). Org-scoped.
router.get('/projects/:projectId', authenticateToken, requireRole(['client']), ErrorHandler.asyncHandler(async (req, res) => {
  const context = await getClientContext(req);
  if (context.error) {
    return res.status(context.error.status).json({ success: false, message: context.error.message });
  }

  const { project } = await resolveProjectForClient({
    projectId: req.params.projectId,
    orgId: context.orgId,
    client: context.client
  });

  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found or access denied' });
  }

  const [pendingApprovals, deliverablesCount] = await Promise.all([
    Card.countDocuments({ projectId: project._id, clientVisible: true, status: { $in: ['review', 'testing'] } }),
    Card.countDocuments({ projectId: project._id, clientVisible: true })
  ]);

  return res.json({
    success: true,
    data: {
      _id: project._id,
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      timeline: project.timeline || {},
      metrics: project.metrics || {},
      tags: project.tags || [],
      pendingApprovals,
      deliverablesCount,
      portalFeatures: {
        timeTracking: !!project.settings?.portalSettings?.features?.timeTracking,
        documents: !!project.settings?.portalSettings?.features?.documents,
        communication: !!project.settings?.portalSettings?.features?.communication
      }
    }
  });
}));

// Get deliverables for a specific project (client view). Org-scoped.
router.get('/projects/:projectId/deliverables', authenticateToken, requireRole(['client']), ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const context = await getClientContext(req);
  if (context.error) {
    return res.status(context.error.status).json({ success: false, message: context.error.message });
  }

  const projectResult = await resolveProjectForClient({ projectId, orgId: context.orgId, client: context.client });
  if (projectResult.error) {
    return res.status(projectResult.error.status).json({ success: false, message: projectResult.error.message });
  }

  // Get client-visible cards (deliverables)
  const deliverables = await Card.find({
    projectId,
    clientVisible: true,
    status: { $in: CLIENT_CARD_STATUSES }
  })
  .select(CARD_SELECT_FIELDS)
  .populate('assignees', 'fullName')
  .populate('comments.userId', 'fullName')
  .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: deliverables.map(mapDeliverable)
  });
}));

// Approve or reject a deliverable. Org-scoped.
router.post('/cards/:cardId/approve', authenticateToken, requireRole(['client']), ErrorHandler.asyncHandler(async (req, res) => {
  const { cardId } = req.params;
  const { approved, comment } = req.body;
  const context = await getClientContext(req);
  if (context.error) {
    return res.status(context.error.status).json({ success: false, message: context.error.message });
  }

  if (typeof approved !== 'boolean') {
    return res.status(400).json({ success: false, message: 'approved boolean is required' });
  }

  const { card, project, error } = await resolveCardForClient({
    cardId,
    orgId: context.orgId,
    client: context.client
  });
  if (error) {
    return res.status(error.status).json({ success: false, message: error.message });
  }

  if (!project.settings?.clientCanApprove || context.client.portal?.accessLevel === 'view_only') {
    return res.status(403).json({ success: false, message: 'You are not allowed to approve deliverables for this project' });
  }

  if (!card.clientVisible) {
    return res.status(403).json({ success: false, message: 'Deliverable is not visible in client portal' });
  }

  // Keep valid workflow states for Card schema while tracking explicit client decision.
  card.status = approved ? 'done' : 'review';
  card.clientApproval = {
    approved,
    comment,
    approvedBy: context.userId,
    approvedAt: new Date()
  };

  // Add approval comment if provided for auditability in timeline.
  if (comment) {
    card.comments.push({
      userId: context.userId,
      text: `Client ${approved ? 'approved' : 'rejected'}: ${comment}`,
      createdAt: new Date()
    });
  }
  await card.save();

  res.json({
    success: true,
    message: `Deliverable ${approved ? 'approved' : 'rejected'} successfully`,
    data: mapDeliverable(card)
  });
}));

// Get project timeline/milestones (client view). Org-scoped.
router.get('/projects/:projectId/timeline', authenticateToken, requireRole(['client']), ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const context = await getClientContext(req);
  if (context.error) {
    return res.status(context.error.status).json({ success: false, message: context.error.message });
  }

  const projectResult = await resolveProjectForClient({ projectId, orgId: context.orgId, client: context.client });
  if (projectResult.error) {
    return res.status(projectResult.error.status).json({ success: false, message: projectResult.error.message });
  }
  const project = projectResult.project;

  // Get milestone cards
  const milestones = await Card.find({
    projectId,
    clientVisible: true,
    isMilestone: true
  })
  .select(CARD_SELECT_FIELDS)
  .populate('assignees', 'fullName')
  .sort({ dueDate: 1 });

  res.json({
    success: true,
    data: {
      project: {
        name: project.name,
        startDate: project.timeline?.startDate || null,
        endDate: project.timeline?.endDate || null,
        status: project.status
      },
      milestones: milestones.map(mapDeliverable)
    }
  });
}));

// Get client-safe timesheet summaries for a project.
router.get('/projects/:projectId/timesheets/summary', authenticateToken, requireRole(['client']), ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const context = await getClientContext(req);
  if (context.error) {
    return res.status(context.error.status).json({ success: false, message: context.error.message });
  }

  const projectResult = await resolveProjectForClient({ projectId, orgId: context.orgId, client: context.client });
  if (projectResult.error) {
    return res.status(projectResult.error.status).json({ success: false, message: projectResult.error.message });
  }

  const range = String(req.query.range || '30d');
  const now = new Date();
  const fromDate = new Date(now);
  if (range === '7d') fromDate.setDate(now.getDate() - 7);
  else if (range === '90d') fromDate.setDate(now.getDate() - 90);
  else fromDate.setDate(now.getDate() - 30);

  const entries = await TimeEntry.find({
    orgId: context.orgId,
    projectId,
    date: { $gte: fromDate, $lte: now }
  })
    .select('employeeId date hours billable status')
    .populate('employeeId', 'fullName email')
    .sort({ date: -1 });

  const totals = entries.reduce((acc, entry) => {
    const hours = Number(entry.hours || 0);
    acc.totalHours += hours;
    if (entry.billable) acc.billableHours += hours;
    else acc.nonBillableHours += hours;
    return acc;
  }, { totalHours: 0, billableHours: 0, nonBillableHours: 0 });

  const byMemberMap = new Map();
  const byDateMap = new Map();
  for (const entry of entries) {
    const memberId = String(entry.employeeId?._id || 'unknown');
    const memberName = entry.employeeId?.fullName || entry.employeeId?.email || 'Unknown';
    const dateKey = new Date(entry.date).toISOString().split('T')[0];
    const hours = Number(entry.hours || 0);

    if (!byMemberMap.has(memberId)) {
      byMemberMap.set(memberId, {
        memberId,
        memberName,
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0
      });
    }
    const memberBucket = byMemberMap.get(memberId);
    memberBucket.totalHours += hours;
    if (entry.billable) memberBucket.billableHours += hours;
    else memberBucket.nonBillableHours += hours;

    if (!byDateMap.has(dateKey)) {
      byDateMap.set(dateKey, { date: dateKey, totalHours: 0 });
    }
    byDateMap.get(dateKey).totalHours += hours;
  }

  res.json({
    success: true,
    data: {
      projectId,
      range,
      fromDate,
      toDate: now,
      totals,
      byMember: Array.from(byMemberMap.values()).sort((a, b) => b.totalHours - a.totalHours),
      byDate: Array.from(byDateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
    }
  });
}));

// Add comment to a deliverable. Org-scoped.
router.post('/cards/:cardId/comments', authenticateToken, requireRole(['client']), ErrorHandler.asyncHandler(async (req, res) => {
  const { cardId } = req.params;
  const { text } = req.body;
  const context = await getClientContext(req);
  if (context.error) {
    return res.status(context.error.status).json({ success: false, message: context.error.message });
  }

  if (!text || text.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Comment text is required'
    });
  }

  const cardResult = await resolveCardForClient({
    cardId,
    orgId: context.orgId,
    client: context.client
  });
  if (cardResult.error) {
    return res.status(cardResult.error.status).json({ success: false, message: cardResult.error.message });
  }
  const { card, project } = cardResult;

  if (!project.settings?.clientCanComment || context.client.portal?.accessLevel === 'view_only') {
    return res.status(403).json({ success: false, message: 'You are not allowed to add comments in this project' });
  }
  if (!card.clientVisible) {
    return res.status(403).json({ success: false, message: 'Deliverable is not visible in client portal' });
  }

  // Add comment
  card.comments.push({
    userId: context.userId,
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
