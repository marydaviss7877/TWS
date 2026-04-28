const express = require('express');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const Project = require('../../../models/Project');
const Card = require('../../../models/Card');
const ProjectClient = require('../../../models/Client');
const Organization = require('../../../models/Organization');
const { TimeEntry, Invoice } = require('../../../models/Finance');

const router = express.Router();
const clientPortalAccess = requireErpAccess({ allowedRoles: ['client', 'customer'], checkRevocation: true });
router.use(verifyERPToken);

const PROJECT_SELECT_FIELDS = [
  '_id',
  'orgId',
  'clientId',
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
  'clientVisible',
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
  projectId: typeof card.projectId === 'object' && card.projectId?._id ? card.projectId._id : card.projectId,
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
    .select('_id orgId portal userId contact');

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
  const card = await Card.findById(cardId).select(CARD_SELECT_FIELDS);
  if (!card || !card.projectId) {
    return { error: { status: 404, message: 'Deliverable not found' } };
  }

  const project = await Project.findOne({
    _id: card.projectId,
    orgId,
    clientId: client._id
  }).select(PROJECT_SELECT_FIELDS);

  if (!project) {
    return { error: { status: 403, message: 'Access denied' } };
  }

  if (!project.settings?.portalSettings?.allowClientPortal) {
    return { error: { status: 403, message: 'Client portal is disabled for this project' } };
  }

  return { card, project };
};

// Get client's projects (accessible by client role). Scoped by orgId so clients cannot see other tenants' data.
router.get('/projects', clientPortalAccess, ErrorHandler.asyncHandler(async (req, res) => {
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
router.get('/projects/:projectId', clientPortalAccess, ErrorHandler.asyncHandler(async (req, res) => {
  const context = await getClientContext(req);
  if (context.error) {
    return res.status(context.error.status).json({ success: false, message: context.error.message });
  }

  const projectResult = await resolveProjectForClient({
    projectId: req.params.projectId,
    orgId: context.orgId,
    client: context.client
  });

  if (projectResult.error) {
    return res.status(projectResult.error.status).json({ success: false, message: projectResult.error.message });
  }
  const { project } = projectResult;

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
router.get('/projects/:projectId/deliverables', clientPortalAccess, ErrorHandler.asyncHandler(async (req, res) => {
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
router.post('/cards/:cardId/approve', clientPortalAccess, ErrorHandler.asyncHandler(async (req, res) => {
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

  if (card.clientVisible === false) {
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
router.get('/projects/:projectId/timeline', clientPortalAccess, ErrorHandler.asyncHandler(async (req, res) => {
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
router.get('/projects/:projectId/timesheets/summary', clientPortalAccess, ErrorHandler.asyncHandler(async (req, res) => {
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

// Get client-safe invoices for a specific project.
router.get('/projects/:projectId/invoices', clientPortalAccess, ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const context = await getClientContext(req);
  if (context.error) {
    return res.status(context.error.status).json({ success: false, message: context.error.message });
  }

  const projectResult = await resolveProjectForClient({ projectId, orgId: context.orgId, client: context.client });
  if (projectResult.error) {
    return res.status(projectResult.error.status).json({ success: false, message: projectResult.error.message });
  }

  const invoices = await Invoice.find({
    orgId: context.orgId,
    $or: [
      { clientId: context.client._id },
      { clientEmail: context.client.contact?.primary?.email || null },
      { 'items.projectId': projectId }
    ]
  })
    .select('invoiceNumber issueDate dueDate total status currency paidAmount remainingAmount notes items')
    .sort({ issueDate: -1 })
    .lean();

  const safeInvoices = invoices
    .filter((inv) => Array.isArray(inv.items) ? inv.items.some((item) => String(item.projectId) === String(projectId)) : true)
    .map((inv) => ({
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      total: Number(inv.total || 0),
      status: inv.status || 'draft',
      currency: inv.currency || 'USD',
      paidAmount: Number(inv.paidAmount || 0),
      remainingAmount: Number(inv.remainingAmount || Math.max(0, Number(inv.total || 0) - Number(inv.paidAmount || 0))),
      notes: inv.notes || ''
    }));

  return res.json({
    success: true,
    data: safeInvoices
  });
}));

// Get client-safe project documents derived from visible deliverable attachments.
router.get('/projects/:projectId/documents', clientPortalAccess, ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const context = await getClientContext(req);
  if (context.error) {
    return res.status(context.error.status).json({ success: false, message: context.error.message });
  }

  const projectResult = await resolveProjectForClient({ projectId, orgId: context.orgId, client: context.client });
  if (projectResult.error) {
    return res.status(projectResult.error.status).json({ success: false, message: projectResult.error.message });
  }

  const cards = await Card.find({
    projectId,
    clientVisible: true,
    attachments: { $exists: true, $ne: [] }
  })
    .select('_id title status updatedAt attachments')
    .sort({ updatedAt: -1 })
    .lean();

  const documents = [];
  cards.forEach((card) => {
    (card.attachments || []).forEach((att, index) => {
      if (!att?.url) return;
      documents.push({
        id: `${card._id}:${index}`,
        name: att.name || `Attachment ${index + 1}`,
        url: att.url,
        type: att.type || 'file',
        size: Number(att.size || 0),
        deliverableId: card._id,
        deliverableTitle: card.title,
        deliverableStatus: card.status,
        updatedAt: card.updatedAt
      });
    });
  });

  return res.json({
    success: true,
    data: documents
  });
}));

// Get client-safe contact profile for the workspace organization and assigned client.
router.get('/contact', clientPortalAccess, ErrorHandler.asyncHandler(async (req, res) => {
  const context = await getClientContext(req);
  if (context.error) {
    return res.status(context.error.status).json({ success: false, message: context.error.message });
  }

  const organization = await Organization.findById(context.orgId)
    .select('name slug contactInfo businessInfo')
    .lean();

  return res.json({
    success: true,
    data: {
      organization: {
        name: organization?.name || null,
        website: organization?.contactInfo?.website || null,
        email: organization?.contactInfo?.email || null,
        phone: organization?.contactInfo?.phone || null,
        address: organization?.contactInfo?.address || {}
      },
      client: {
        id: context.client._id,
        primaryContact: context.client.contact?.primary || {},
        billingContact: context.client.contact?.billing || {},
        technicalContact: context.client.contact?.technical || {},
        accessLevel: context.client.portal?.accessLevel || 'approve'
      }
    }
  });
}));

// Add comment to a deliverable. Org-scoped.
router.post('/cards/:cardId/comments', clientPortalAccess, ErrorHandler.asyncHandler(async (req, res) => {
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
  if (card.clientVisible === false) {
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
