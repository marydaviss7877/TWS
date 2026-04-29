const express = require('express');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const Card = require('../../../models/industry/Card');
const Project = require('../../../models/project-delivery/Project');
const { TimeEntry } = require('../../../models/finance/Finance');
const timeTrackingService = require('../../../services/softwareHouse/time-tracking.service');
const { aggregateTimeSources } = require('../../../services/business/timeAggregation.service');

const router = express.Router();
const timeRead = requireErpAccess({ module: 'projects', action: ['read', 'read_own'], checkRevocation: false });
const timeWrite = requireErpAccess({ module: 'projects', action: 'write', checkRevocation: false });

router.use(verifyERPToken);

const CARD_TAG_PREFIX = 'card:';
const toCardTag = (cardId) => `${CARD_TAG_PREFIX}${cardId}`;
const toHoursFromMinutes = (minutes) => Math.round((Number(minutes || 0) / 60) * 100) / 100;
const toMinutesFromHours = (hours) => Math.round(Number(hours || 0) * 60);

// Unified read-only aggregation across card-based and finance time-entry sources.
router.get('/aggregate/summary', timeRead, ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  const { projectId, userId, from, to } = req.query;

  const data = await aggregateTimeSources({ orgId, projectId, userId, from, to });

  res.json({
    success: true,
    data
  });
}));

// Start time tracking for a card
router.post('/start', timeWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { cardId, description } = req.body;
  const orgId = req.user.orgId;
  const { _id: userId } = req.user;

  if (!cardId) {
    return res.status(400).json({
      success: false,
      message: 'Card ID is required'
    });
  }

  const card = await Card.findOne({ _id: cardId, orgId });
  if (!card) {
    return res.status(404).json({
      success: false,
      message: 'Card not found'
    });
  }

  // Centralized source-of-truth: finance time entries with card tag metadata.
  const existingEntry = await TimeEntry.findOne({
    orgId,
    employeeId: userId,
    'timer.isRunning': true,
    tags: toCardTag(cardId)
  });

  if (existingEntry) {
    return res.status(400).json({
      success: false,
      message: 'Time tracking already started for this card'
    });
  }

  const timeEntry = await timeTrackingService.startTimer(
    orgId,
    userId,
    card.projectId,
    null,
    description || card.title || 'Card work'
  );
  timeEntry.tags = Array.isArray(timeEntry.tags) ? timeEntry.tags : [];
  if (!timeEntry.tags.includes(toCardTag(cardId))) {
    timeEntry.tags.push(toCardTag(cardId));
  }
  await timeEntry.save();

  res.json({
    success: true,
    message: 'Time tracking started',
    data: {
      entryId: timeEntry._id,
      financeTimeEntryId: timeEntry._id,
      cardId,
      start: timeEntry.timer?.startedAt || timeEntry.createdAt,
      billable: timeEntry.billable
    }
  });
}));

// Stop time tracking for a card
router.post('/stop', timeWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { cardId } = req.body;
  const orgId = req.user.orgId;
  const { _id: userId } = req.user;

  if (!cardId) {
    return res.status(400).json({
      success: false,
      message: 'Card ID is required'
    });
  }

  const card = await Card.findOne({ _id: cardId, orgId });
  if (!card) {
    return res.status(404).json({
      success: false,
      message: 'Card not found'
    });
  }

  // Stop centralized finance timer for this card tag.
  const activeEntry = await TimeEntry.findOne({
    orgId,
    employeeId: userId,
    'timer.isRunning': true,
    tags: toCardTag(cardId)
  });

  if (!activeEntry) {
    return res.status(400).json({
      success: false,
      message: 'No active time tracking found for this card'
    });
  }

  const stoppedEntry = await timeTrackingService.stopTimer(orgId, userId, activeEntry._id);
  const duration = toMinutesFromHours(stoppedEntry.hours);

  res.json({
    success: true,
    message: 'Time tracking stopped',
    data: {
      entryId: stoppedEntry._id,
      financeTimeEntryId: stoppedEntry._id,
      cardId,
      minutes: duration,
      hours: stoppedEntry.hours,
      end: stoppedEntry.timer?.stoppedAt || stoppedEntry.updatedAt,
      billable: stoppedEntry.billable,
      description: stoppedEntry.description || ''
    }
  });
}));

// Get time entries for a card
router.get('/card/:cardId', timeRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { cardId } = req.params;
  const orgId = req.user.orgId;
  const { _id: userId } = req.user;

  const card = await Card.findOne({ _id: cardId, orgId }).lean();

  if (!card) {
    return res.status(404).json({
      success: false,
      message: 'Card not found'
    });
  }

  const filter = { orgId, tags: toCardTag(cardId) };
  if (!['super_admin', 'org_manager', 'pmo', 'project_manager'].includes(req.user.role)) {
    filter.employeeId = userId;
  }
  const entriesRaw = await TimeEntry.find(filter)
    .populate('employeeId', 'fullName email')
    .sort({ date: -1, createdAt: -1 })
    .lean();
  const entries = entriesRaw.map((entry) => ({
    _id: entry._id,
    userId: entry.employeeId,
    start: entry.timer?.startedAt || entry.createdAt,
    end: entry.timer?.stoppedAt || entry.updatedAt,
    minutes: toMinutesFromHours(entry.hours),
    billable: entry.billable,
    description: entry.description || entry.task || ''
  }));
  const actualHours = entriesRaw.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);

  res.json({
    success: true,
    data: {
      cardId: card._id,
      estimatedHours: card.timeTracking?.estimatedHours || 0,
      actualHours,
      entries: entries.sort((a, b) => new Date(b.start) - new Date(a.start))
    }
  });
}));

// Get time entries for a project
router.get('/project/:projectId', timeRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const orgId = req.user.orgId;

  const project = await Project.findOne({ _id: projectId, orgId });
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }

  const cards = await Card.find({ orgId, projectId }).select('_id title timeTracking.estimatedHours').lean();
  const entries = await TimeEntry.find({ orgId, projectId })
    .populate('employeeId', 'fullName email')
    .sort({ date: -1, createdAt: -1 })
    .lean();

  // Aggregate time data
  const timeData = {
    totalEstimatedHours: 0,
    totalActualHours: 0,
    totalBillableHours: 0,
    entries: [],
    byUser: {},
    byCard: []
  };

  const cardLookup = new Map(cards.map((card) => [String(card._id), card]));
  cards.forEach(card => {
    timeData.totalEstimatedHours += card.timeTracking.estimatedHours || 0;
    timeData.byCard.push({
      cardId: card._id,
      cardTitle: card.title,
      estimatedHours: card.timeTracking?.estimatedHours || 0,
      actualHours: 0,
      entries: []
    });
  });
  entries.forEach((entry) => {
    const hours = Number(entry.hours || 0);
    timeData.totalActualHours += hours;
    timeData.totalBillableHours += entry.billable ? hours : 0;
    const cardTag = (entry.tags || []).find((tag) => typeof tag === 'string' && tag.startsWith(CARD_TAG_PREFIX));
    const cardId = cardTag ? cardTag.slice(CARD_TAG_PREFIX.length) : null;
    const cardMeta = cardId ? cardLookup.get(String(cardId)) : null;
    timeData.entries.push({
      _id: entry._id,
      userId: entry.employeeId,
      start: entry.timer?.startedAt || entry.createdAt,
      end: entry.timer?.stoppedAt || entry.updatedAt,
      minutes: toMinutesFromHours(hours),
      billable: entry.billable,
      description: entry.description || entry.task || '',
      cardTitle: cardMeta?.title || '',
      cardId: cardMeta?._id || cardId
    });
    const bucketUserId = entry.employeeId?._id ? String(entry.employeeId._id) : 'unknown';
    if (!timeData.byUser[bucketUserId]) {
      timeData.byUser[bucketUserId] = {
        user: entry.employeeId || null,
        totalHours: 0,
        billableHours: 0,
        entries: []
      };
    }
    timeData.byUser[bucketUserId].totalHours += hours;
    timeData.byUser[bucketUserId].billableHours += entry.billable ? hours : 0;
    timeData.byUser[bucketUserId].entries.push(entry);
    if (cardMeta) {
      const byCard = timeData.byCard.find((cardRow) => String(cardRow.cardId) === String(cardMeta._id));
      if (byCard) {
        byCard.actualHours += hours;
        byCard.entries.push(entry);
      }
    }
  });

  res.json({
    success: true,
    data: timeData
  });
}));

// Update time entry
router.put('/entry/:entryId', timeWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { entryId } = req.params;
  const { description, billable, minutes } = req.body;
  const orgId = req.user.orgId;
  const { _id: userId } = req.user;

  const entry = await TimeEntry.findOne({ _id: entryId, orgId });
  if (!entry) {
    return res.status(404).json({
      success: false,
      message: 'Time entry not found'
    });
  }
  
  // Check permissions - users can only edit their own entries unless they're admin/manager
  if (entry.employeeId.toString() !== userId.toString() && 
      !['super_admin', 'org_manager', 'pmo', 'project_manager'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Permission denied'
    });
  }

  const updates = {};
  if (description !== undefined) updates.description = description;
  if (billable !== undefined) updates.billable = billable;
  if (minutes !== undefined) updates.hours = toHoursFromMinutes(minutes);
  const updated = await timeTrackingService.updateTimeEntry(orgId, entryId, updates);

  res.json({
    success: true,
    message: 'Time entry updated',
    data: {
      _id: updated._id,
      employeeId: updated.employeeId,
      hours: updated.hours,
      minutes: toMinutesFromHours(updated.hours),
      billable: updated.billable,
      description: updated.description || ''
    }
  });
}));

// Delete time entry
router.delete('/entry/:entryId', timeWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { entryId } = req.params;
  const orgId = req.user.orgId;
  const { _id: userId } = req.user;

  const entry = await TimeEntry.findOne({ _id: entryId, orgId });
  if (!entry) {
    return res.status(404).json({
      success: false,
      message: 'Time entry not found'
    });
  }

  // Check permissions
  if (entry.employeeId.toString() !== userId.toString() && 
      !['super_admin', 'org_manager', 'pmo', 'project_manager'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Permission denied'
    });
  }

  await timeTrackingService.deleteTimeEntry(orgId, entryId);

  res.json({
    success: true,
    message: 'Time entry deleted'
  });
}));

// Get user's time tracking summary
router.get('/user/summary', timeRead, ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  const { _id: userId } = req.user;
  const { startDate, endDate } = req.query;

  const query = { orgId, employeeId: userId };
  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const entries = await TimeEntry.find(query)
    .populate('projectId', 'name')
    .sort({ date: -1, createdAt: -1 })
    .lean();

  const summary = {
    totalHours: 0,
    billableHours: 0,
    entries: [],
    byProject: {},
    byCard: []
  };

  entries.forEach((entry) => {
    const hours = Number(entry.hours || 0);
    summary.totalHours += hours;
    summary.billableHours += entry.billable ? hours : 0;
    const cardTag = (entry.tags || []).find((tag) => typeof tag === 'string' && tag.startsWith(CARD_TAG_PREFIX));
    const cardId = cardTag ? cardTag.slice(CARD_TAG_PREFIX.length) : null;
    summary.entries.push({
      _id: entry._id,
      start: entry.timer?.startedAt || entry.createdAt,
      end: entry.timer?.stoppedAt || entry.updatedAt,
      minutes: toMinutesFromHours(hours),
      billable: entry.billable,
      description: entry.description || entry.task || '',
      cardId,
      projectName: entry.projectId?.name
    });
    const projectId = entry.projectId?._id ? String(entry.projectId._id) : null;
    if (projectId) {
      if (!summary.byProject[projectId]) {
        summary.byProject[projectId] = {
          projectName: entry.projectId?.name || 'Unknown',
          totalHours: 0,
          billableHours: 0
        };
      }
      summary.byProject[projectId].totalHours += hours;
      summary.byProject[projectId].billableHours += entry.billable ? hours : 0;
    }
    if (cardId) {
      let byCard = summary.byCard.find((cardRow) => String(cardRow.cardId) === String(cardId));
      if (!byCard) {
        byCard = {
          cardId,
          cardTitle: '',
          projectName: entry.projectId?.name,
          hours: 0
        };
        summary.byCard.push(byCard);
      }
      byCard.hours += hours;
    }
  });

  res.json({
    success: true,
    data: summary
  });
}));

module.exports = router;
