const express = require('express');
const router = express.Router({ mergeParams: true });
const { requireRole } = require('../middleware/auth/auth');
const ErrorHandler = require('../middleware/common/errorHandler');
const { TimeEntry } = require('../models/finance/Finance');
const timeTrackingService = require('../services/softwareHouse/time-tracking.service');
const unifiedSoftwareHouseAuth = require('../middleware/auth/unifiedSoftwareHouseAuth');

// ==================== TIME TRACKING ====================

// Start timer
router.post('/start', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  const userId = req.user._id;
  const { projectId, taskId, description } = req.body;

  try {
    const timeEntry = await timeTrackingService.startTimer(
      orgId,
      userId,
      projectId,
      taskId,
      description
    );

    res.json({ success: true, data: timeEntry });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}));
  
// Stop timer
router.post('/stop/:timeEntryId', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  const userId = req.user._id;
  const { timeEntryId } = req.params;

  try {
    const timeEntry = await timeTrackingService.stopTimer(
      orgId,
      userId,
      timeEntryId
    );

    res.json({ success: true, data: timeEntry });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}));

// Get active timer
router.get('/active', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  const userId = req.user._id;

  const activeTimer = await TimeEntry.findOne({
    orgId,
    employeeId: userId,
    'timer.isRunning': true
  })
    .populate('projectId', 'name')
    .populate('taskId', 'title');

  if (activeTimer && activeTimer.timer.startedAt) {
    const currentTime = new Date();
    const elapsedHours = (currentTime - activeTimer.timer.startedAt) / (1000 * 60 * 60);
    activeTimer.currentElapsedHours = Math.round(elapsedHours * 100) / 100;
  }

  res.json({ success: true, data: activeTimer });
}));

// Get time entries
router.get('/entries', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager', 'hr']), ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  const userId = req.user._id;
  
  // Filter by user if not admin/owner
  const filters = { ...req.query };
  if (req.user.role !== 'owner' && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    filters.employeeId = userId;
  }
  
  try {
    const result = await timeTrackingService.getTimeEntries(orgId, filters);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Legacy route for backward compatibility
router.get('/', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager', 'hr']), ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  const userId = req.user._id;
  
  const filters = { ...req.query };
  if (req.user.role !== 'owner' && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    filters.employeeId = userId;
  }

  try {
    const result = await timeTrackingService.getTimeEntries(orgId, { ...filters, limit: 100 });
    res.json({ success: true, data: result.timeEntries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Get today's time tracking summary
router.get('/today', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager', 'hr']), ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  const userId = req.user._id;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const filters = {
    startDate: today.toISOString(),
    endDate: tomorrow.toISOString()
  };
  
  // Filter by user if not admin
  if (req.user.role !== 'owner' && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    filters.employeeId = userId;
  }
  
  try {
    const result = await timeTrackingService.getTimeEntries(orgId, filters);
    const stats = await timeTrackingService.getTimeEntryStats(orgId, filters);
    
    // Group by project
    const projects = {};
    result.timeEntries.forEach(entry => {
      const projectName = entry.projectId?.name || 'Unknown';
      if (!projects[projectName]) {
        projects[projectName] = {
          name: projectName,
          hours: 0,
          billable: false
        };
      }
      projects[projectName].hours += entry.hours || 0;
      if (entry.billable) {
        projects[projectName].billable = true;
      }
    });
    
    res.json({
      success: true,
      data: {
        totalHours: stats.totalHours,
        billableHours: stats.billableHours,
        projects: Object.values(projects),
        entries: result.timeEntries
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Create manual time entry
router.post('/entries', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  const userId = req.user._id;

  try {
    const timeEntry = await timeTrackingService.createTimeEntry(
      orgId,
      userId,
      req.body
    );

    res.status(201).json({ success: true, data: timeEntry });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}));

// Legacy route for backward compatibility
router.post('/entry', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  const userId = req.user._id;

  try {
    const timeEntry = await timeTrackingService.createTimeEntry(
      orgId,
      userId,
      req.body
    );

    res.status(201).json({ success: true, data: timeEntry, message: 'Time entry created successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}));

// Get time entry stats
router.get('/stats', unifiedSoftwareHouseAuth, ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  const userId = req.user._id;
  
  const filters = { ...req.query };
  // Filter by user if not admin
  if (req.user.role !== 'owner' && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    filters.employeeId = userId;
  }
  
  try {
    const stats = await timeTrackingService.getTimeEntryStats(orgId, filters);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Approve time entry
router.post('/entries/:timeEntryId/approve', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  const { timeEntryId } = req.params;
  const approvedBy = req.user._id;

  try {
    const timeEntry = await timeTrackingService.approveTimeEntry(
      orgId,
      timeEntryId,
      approvedBy
    );
  
    res.json({ success: true, data: timeEntry });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}));

// Reject time entry
router.post('/entries/:timeEntryId/reject', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  const { timeEntryId } = req.params;
  const { rejectionReason } = req.body;
  const rejectedBy = req.user._id;

  try {
    const timeEntry = await timeTrackingService.rejectTimeEntry(
      orgId,
      timeEntryId,
      rejectedBy,
      rejectionReason
    );

    res.json({ success: true, data: timeEntry });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}));

// Update time entry
router.patch('/entries/:timeEntryId', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  const { timeEntryId } = req.params;

  try {
    const timeEntry = await timeTrackingService.updateTimeEntry(
      orgId,
      timeEntryId,
      req.body
    );

    res.json({ success: true, data: timeEntry });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}));

// Delete time entry
router.delete('/entries/:timeEntryId', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  const { timeEntryId } = req.params;

  try {
    await timeTrackingService.deleteTimeEntry(orgId, timeEntryId);
    res.json({ success: true, message: 'Time entry deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}));

module.exports = router;
