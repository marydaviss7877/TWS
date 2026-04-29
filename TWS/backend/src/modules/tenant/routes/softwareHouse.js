const express = require('express');
const mongoose = require('mongoose');
// Use mergeParams: true to access :tenantSlug from parent route
const router = express.Router({ mergeParams: true });
const { requireRole } = require('../../../middleware/auth/rbac');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const Tenant = require('../../../models/tenant/Tenant');
const SoftwareHouseRole = require('../../../models/admin-platform/SoftwareHouseRole');
const Project = require('../../../models/project-delivery/Project');
const Card = require('../../../models/industry/Card');
const Sprint = require('../../../models/project-delivery/Sprint');
const DevelopmentMetrics = require('../../../models/analytics/DevelopmentMetrics');
const { TimeEntry, Transaction, Invoice, Bill, ProjectCosting, ChartOfAccounts, CashFlowForecast, Vendor } = require('../../../models/finance/Finance');
const Expense = require('../../../models/finance/Expense');
const Client = require('../../../models/industry/Client');
const Workspace = require('../../../models/org/Workspace');
const ProjectMember = require('../../../models/project-delivery/ProjectMember');
const tenantOrgService = require('../../../services/tenant/tenant-org.service');
const timeTrackingService = require('../../../services/softwareHouse/time-tracking.service');
const { getProjectMetricsForRequest } = require('../../../services/tenant/project-organization-metrics.service');

// Use tenant ERP auth middleware used by other tenant routes to keep
// software-house endpoints compatible with active cookie sessions.
const unifiedSoftwareHouseAuth = require('../../../middleware/auth/verifyERPToken');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const shFinanceRead = requireErpAccess({ module: 'finance', action: 'read' });
const shFinanceWrite = requireErpAccess({ module: 'finance', action: 'write' });
const { checkUsageLimitSoftwareHouseOnly, checkReadOnlySoftwareHouseOnly } = require('../../../middleware/common/featureGate');

/**
 * orgId filter for find() and aggregation $match.
 * Merges every plausible org id (JWT/middleware vs tenant document) so Project queries match stored shapes.
 * Aggregation does not apply Mongoose casting; legacy docs may store orgId as a string.
 */
function buildOrgIdQueryFromSources(...sources) {
  const idStrings = new Set();
  const add = (v) => {
    if (v == null || v === '') return;
    let x = v;
    if (typeof x === 'object' && x._id) x = x._id;
    idStrings.add(String(x));
  };
  sources.forEach(add);
  if (idStrings.size === 0) return {};
  const candidates = [];
  for (const s of idStrings) {
    if (mongoose.Types.ObjectId.isValid(s)) {
      try {
        candidates.push(new mongoose.Types.ObjectId(s));
      } catch (_) {
        /* ignore */
      }
    }
    candidates.push(s);
  }
  const unique = [...new Map(candidates.map((v) => [String(v), v])).values()];
  return { orgId: { $in: unique } };
}

// Get tenant software house configuration
router.get('/config', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const orgId = req.user.orgId;
  
  const tenant = await Tenant.findOne({ _id: tenantId, orgId })
    .select('name erpCategory softwareHouseConfig erpModules');
  
  if (!tenant) {
    return res.status(404).json({
      success: false,
      message: 'Tenant not found'
    });
  }
  
  if (tenant.erpCategory !== 'software_house') {
    return res.status(400).json({
      success: false,
      message: 'Tenant is not configured as a software house'
    });
  }
  
  res.json({
    success: true,
    data: {
      tenant: {
        name: tenant.name,
        erpCategory: tenant.erpCategory,
        erpModules: tenant.erpModules
      },
      softwareHouseConfig: tenant.softwareHouseConfig || {}
    }
  });
}));

// Update tenant software house configuration
router.put('/config', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const orgId = req.user.orgId;
  const updates = req.body;
  
  const tenant = await Tenant.findOne({ _id: tenantId, orgId });
  
  if (!tenant) {
    return res.status(404).json({
      success: false,
      message: 'Tenant not found'
    });
  }
  
  // Ensure tenant is configured as software house
  if (tenant.erpCategory !== 'software_house') {
    return res.status(400).json({
      success: false,
      message: 'Tenant must be configured as software_house to update software house configuration'
    });
  }
  
  // Update software house configuration
  tenant.softwareHouseConfig = {
    ...tenant.softwareHouseConfig,
    ...updates
  };
  
  await tenant.save();
  
  res.json({
    success: true,
    data: tenant.softwareHouseConfig,
    message: 'Software house configuration updated successfully'
  });
}));

// Get tenant software house metrics
router.get('/metrics', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const orgId = req.user.orgId;
  
  // Get project metrics
  const projectMetrics = await Project.aggregate([
    { $match: { orgId: orgId } },
    {
      $group: {
        _id: null,
        totalProjects: { $sum: 1 },
        activeProjects: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        completedProjects: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        onTrackProjects: {
          $sum: { $cond: [{ $eq: ['$status', 'on_track'] }, 1, 0] }
        },
        atRiskProjects: {
          $sum: { $cond: [{ $eq: ['$status', 'at_risk'] }, 1, 0] }
        },
        delayedProjects: {
          $sum: { $cond: [{ $eq: ['$status', 'delayed'] }, 1, 0] }
        },
        totalBudget: { $sum: '$budget' },
        spentBudget: { $sum: '$spent' }
      }
    }
  ]);
  
  // Get sprint metrics
  const sprintMetrics = await Sprint.aggregate([
    { $match: { orgId: orgId } },
    {
      $group: {
        _id: null,
        activeSprints: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        completedSprints: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalVelocity: { $avg: '$velocity' }
      }
    }
  ]);
  
  // Get development metrics
  const devMetrics = await DevelopmentMetrics.aggregate([
    { $match: { orgId: orgId } },
    {
      $group: {
        _id: null,
        avgCodeCoverage: { $avg: '$codeQuality.coverage' },
        avgClientSatisfaction: { $avg: '$clientSatisfaction.rating' },
        totalBugs: { $sum: '$bugAnalytics.totalBugs' },
        totalFeatures: { $sum: '$featureDelivery.featuresDelivered' }
      }
    }
  ]);
  
  // Get team metrics
  const teamMetrics = await SoftwareHouseRole.aggregate([
    { $match: { orgId: orgId, isActive: true } },
    {
      $group: {
        _id: null,
        totalTeamMembers: { $sum: 1 },
        developers: {
          $sum: { $cond: [{ $eq: ['$roleType', 'developer'] }, 1, 0] }
        },
        techLeads: {
          $sum: { $cond: [{ $eq: ['$roleType', 'tech_lead'] }, 1, 0] }
        },
        projectManagers: {
          $sum: { $cond: [{ $eq: ['$roleType', 'project_manager'] }, 1, 0] }
        }
      }
    }
  ]);
  
  const metrics = {
    projects: projectMetrics[0] || {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      onTrackProjects: 0,
      atRiskProjects: 0,
      delayedProjects: 0,
      totalBudget: 0,
      spentBudget: 0
    },
    sprints: sprintMetrics[0] || {
      activeSprints: 0,
      completedSprints: 0,
      totalVelocity: 0
    },
    development: devMetrics[0] || {
      avgCodeCoverage: 0,
      avgClientSatisfaction: 0,
      totalBugs: 0,
      totalFeatures: 0
    },
    team: teamMetrics[0] || {
      totalTeamMembers: 0,
      developers: 0,
      techLeads: 0,
      projectManagers: 0
    }
  };
  
  res.json({
    success: true,
    data: metrics
  });
}));

// Get tenant projects with software house details
router.get('/projects', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'project_manager', 'employee', 'contractor']), ErrorHandler.asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const orgId = req.user.orgId;
  const { status, projectType, methodology } = req.query;
  
  let query = { orgId };
  
  if (status) {
    query.status = status;
  }
  
  if (projectType) {
    query.projectType = projectType;
  }
  
  if (methodology) {
    query.methodology = methodology;
  }
  
  const projects = await Project.find(query)
    .populate('clientId', 'name email')
    .populate('teamMembers', 'name email avatar')
    .select('name description status projectType methodology techStack budget spent startDate endDate clientId teamMembers')
    .sort({ createdAt: -1 });
  
  res.json({
    success: true,
    data: projects
  });
}));

// Get tenant active sprints
router.get('/sprints', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'project_manager', 'employee', 'contractor']), ErrorHandler.asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const orgId = req.user.orgId;
  const { status } = req.query;
  
  let query = { orgId };
  
  if (status) {
    query.status = status;
  }
  
  const sprints = await Sprint.find(query)
    .populate('projectId', 'name clientId')
    .populate('teamMembers', 'name email avatar')
    .select('name projectId startDate endDate status goal capacity velocity backlogCards teamMembers')
    .sort({ startDate: -1 });
  
  res.json({
    success: true,
    data: sprints
  });
}));

// Get tenant development analytics
router.get('/analytics', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const orgId = req.user.orgId;
  const { projectId, timeRange } = req.query;
  
  let query = { orgId };
  
  if (projectId) {
    query.projectId = projectId;
  }
  
  // Add time range filter if provided
  if (timeRange) {
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    query.createdAt = { $gte: startDate };
  }
  
  const analytics = await DevelopmentMetrics.find(query)
    .populate('projectId', 'name clientId')
    .select('projectId velocity burndownData codeQuality teamPerformance clientSatisfaction projectHealth bugAnalytics featureDelivery')
    .sort({ createdAt: -1 });
  
  res.json({
    success: true,
    data: analytics
  });
}));

// Get tenant team members with software house roles
router.get('/team', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'project_manager', 'hr']), ErrorHandler.asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const orgId = req.user.orgId;
  
  const teamMembers = await SoftwareHouseRole.find({ orgId, isActive: true })
    .populate('createdBy', 'name email avatar')
    .select('name roleType level hourlyRate techStackAccess projectTypeAccess isActive')
    .sort({ level: 1, name: 1 });
  
  res.json({
    success: true,
    data: teamMembers
  });
}));

// Initialize tenant as software house
router.post('/initialize', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const orgId = req.user.orgId;
  const { 
    defaultMethodology = 'agile',
    supportedMethodologies = ['agile', 'scrum'],
    techStack = {},
    supportedProjectTypes = ['web_application', 'mobile_app'],
    developmentSettings = {},
    billingConfig = {},
    teamConfig = {},
    qualityConfig = {}
  } = req.body;
  
  const tenant = await Tenant.findOne({ _id: tenantId, orgId });
  
  if (!tenant) {
    return res.status(404).json({
      success: false,
      message: 'Tenant not found'
    });
  }
  
  // Update tenant to software house category
  tenant.erpCategory = 'software_house';
  
  // Set default ERP modules for software house
  tenant.erpModules = [
    'hr', 'finance', 'projects', 'operations', 
    'clients', 'reports', 'messaging', 'attendance', 'roles'
  ];
  
  // Initialize software house configuration
  tenant.softwareHouseConfig = {
    defaultMethodology,
    supportedMethodologies,
    techStack: {
      frontend: techStack.frontend || [],
      backend: techStack.backend || [],
      database: techStack.database || [],
      cloud: techStack.cloud || [],
      tools: techStack.tools || []
    },
    supportedProjectTypes,
    developmentSettings: {
      defaultSprintDuration: 14,
      storyPointScale: 'fibonacci',
      codeQualityTracking: true,
      ...developmentSettings
    },
    billingConfig: {
      defaultHourlyRate: 0,
      currency: 'USD',
      billingCycle: 'monthly',
      invoiceTemplate: 'standard',
      autoInvoiceGeneration: false,
      ...billingConfig
    },
    teamConfig: {
      maxTeamSize: 50,
      allowRemoteWork: true,
      requireTimeTracking: true,
      allowOvertime: true,
      maxOvertimeHours: 20,
      ...teamConfig
    },
    qualityConfig: {
      codeReviewRequired: true,
      testingRequired: true,
      documentationRequired: true,
      minCodeCoverage: 80,
      maxTechnicalDebt: 20,
      ...qualityConfig
    }
  };
  
  await tenant.save();
  
  res.json({
    success: true,
    data: tenant.softwareHouseConfig,
    message: 'Tenant initialized as software house successfully'
  });
}));

// ==================== TIME TRACKING ====================

// Start timer
router.post('/time-tracking/start', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.post('/time-tracking/stop/:timeEntryId', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.get('/time-tracking/active', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.get('/time-tracking/entries', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager', 'hr']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.get('/time-tracking', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager', 'hr']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.get('/time-tracking/today', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager', 'hr']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.post('/time-tracking/entries', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.post('/time-tracking/entry', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.get('/time-tracking/stats', unifiedSoftwareHouseAuth, ErrorHandler.asyncHandler(async (req, res) => {
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
router.post('/time-tracking/entries/:timeEntryId/approve', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.post('/time-tracking/entries/:timeEntryId/reject', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.patch('/time-tracking/entries/:timeEntryId', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.delete('/time-tracking/entries/:timeEntryId', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  const { timeEntryId } = req.params;

  try {
    await timeTrackingService.deleteTimeEntry(orgId, timeEntryId);
    res.json({ success: true, message: 'Time entry deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}));

// ==================== CLIENT PORTAL REMOVED ====================
// Client portal functionality has been completely removed from software house ERP

// Get tenant software house dashboard data
router.get('/dashboard', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'project_manager', 'employee', 'contractor']), ErrorHandler.asyncHandler(async (req, res) => {
  try {
    // Tenant already loaded by unifiedSoftwareHouseAuth (skip extra Tenant.findOne round-trip)
    const tenantInfo = req.tenant;
    if (!tenantInfo) {
      return res.status(500).json({ success: false, message: 'Tenant context missing' });
    }
    if (tenantInfo.erpCategory !== 'software_house') {
      return res.status(400).json({ success: false, message: 'Tenant is not configured as a software house' });
    }

    // Same org + department scope as GET /organization/projects/metrics (Projects overview KPIs)
    const { metricsQuery, data: orgProjectMetrics } = await getProjectMetricsForRequest(req);
    if (!metricsQuery || !orgProjectMetrics) {
      return res.status(500).json({ success: false, message: 'Organization context not available' });
    }

    const orgFilter = buildOrgIdQueryFromSources(
      metricsQuery.orgId,
      req.orgId,
      req.user?.orgId,
      tenantInfo.organizationId,
      tenantInfo.orgId
    );
    if (!orgFilter.orgId?.$in?.length) {
      return res.status(400).json({ success: false, message: 'Tenant organization not configured' });
    }

    const safeDefaults = {
      projects: { totalProjects: 0, activeProjects: 0, completedProjects: 0, onTrackProjects: 0, atRiskProjects: 0, delayedProjects: 0, totalBudget: 0, spentBudget: 0 },
      sprints: { activeSprints: 0, completedSprints: 0, totalVelocity: 0, averageVelocity: 0 },
      development: { avgCodeCoverage: 0, avgClientSatisfaction: 0, totalBugs: 0, totalFeatures: 0 },
      team: { totalTeamMembers: 0 }
    };

    const [
      recentProjectsResult,
      activeSprintsResult,
      sprintMetricsResult,
      devMetricsResult,
      teamMetricsResult,
    ] = await Promise.all([
      Project.find(metricsQuery)
        .populate('clientId', 'name email')
        .select('name description status projectType methodology techStack budget timeline team clientId')
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean()
        .then((value) => ({ status: 'fulfilled', value }))
        .catch((reason) => ({ status: 'rejected', reason })),

      Sprint.find({ ...orgFilter, status: 'active' })
        .populate('projectId', 'name clientId')
        .select('name projectId startDate endDate status goal capacity metrics team')
        .sort({ startDate: -1 })
        .limit(3)
        .lean()
        .then((value) => ({ status: 'fulfilled', value }))
        .catch((reason) => ({ status: 'rejected', reason })),

      Sprint.aggregate([
        { $match: orgFilter },
        { $group: {
          _id: null,
          activeSprints: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          completedSprints: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalVelocity: { $avg: { $ifNull: ['$metrics.velocity', 0] } }
        }}
      ])
        .then((value) => ({ status: 'fulfilled', value }))
        .catch((reason) => ({ status: 'rejected', reason })),

      DevelopmentMetrics.aggregate([
        { $match: orgFilter },
        { $group: {
          _id: null,
          avgCodeCoverage: { $avg: { $ifNull: ['$codeQuality.codeCoverage', 0] } },
          avgClientSatisfaction: { $avg: { $ifNull: ['$clientSatisfaction.overallRating', 0] } },
          totalBugs: { $sum: { $ifNull: ['$bugs.totalBugs', 0] } },
          totalFeatures: { $sum: { $ifNull: ['$features.featuresDelivered', 0] } }
        }}
      ])
        .then((value) => ({ status: 'fulfilled', value }))
        .catch((reason) => ({ status: 'rejected', reason })),

      SoftwareHouseRole.aggregate([
        { $match: { ...orgFilter, isActive: true } },
        { $group: { _id: null, totalTeamMembers: { $sum: 1 } } }
      ])
        .then((value) => ({ status: 'fulfilled', value }))
        .catch((reason) => ({ status: 'rejected', reason })),
    ]);

    const recentProjects   = recentProjectsResult.status  === 'fulfilled' ? recentProjectsResult.value  : [];
    const activeSprints    = activeSprintsResult.status   === 'fulfilled' ? activeSprintsResult.value   : [];
    const sprintMetrics    = sprintMetricsResult.status   === 'fulfilled' ? sprintMetricsResult.value   : [];
    const devMetrics       = devMetricsResult.status      === 'fulfilled' ? devMetricsResult.value      : [];
    const teamMetrics      = teamMetricsResult.status     === 'fulfilled' ? teamMetricsResult.value     : [];

    const projectsBlock = {
      totalProjects: orgProjectMetrics.totalProjects,
      activeProjects: orgProjectMetrics.activeProjects,
      completedProjects: orgProjectMetrics.completedProjects,
      onTrackProjects: orgProjectMetrics.onTrackProjects,
      atRiskProjects: orgProjectMetrics.atRiskProjects,
      delayedProjects: orgProjectMetrics.delayedProjects,
      totalBudget: orgProjectMetrics.totalBudget,
      spentBudget: orgProjectMetrics.spentBudget
    };
    const sprintsRaw = sprintMetrics[0] || safeDefaults.sprints;
    const tv = sprintsRaw.totalVelocity;
    const sprintsBlock = {
      ...sprintsRaw,
      averageVelocity: typeof tv === 'number' && !Number.isNaN(tv) ? Math.round(tv * 10) / 10 : 0
    };
    const teamRaw = teamMetrics[0] || safeDefaults.team;

    const dashboardData = {
      tenant: {
        name: tenantInfo.name,
        erpCategory: tenantInfo.erpCategory,
        erpModules: tenantInfo.erpModules,
        softwareHouseConfig: tenantInfo.softwareHouseConfig
      },
      recentProjects,
      activeSprints,
      metrics: {
        projects: projectsBlock,
        sprints: sprintsBlock,
        development: devMetrics[0] || safeDefaults.development,
        team: {
          ...teamRaw,
          totalMembers: teamRaw.totalTeamMembers
        }
      }
    };

    return res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Software house dashboard error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load dashboard',
      error: error.message
    });
  }
}));

// ==================== SOFTWARE-HOUSE FINANCE (READ) ====================
require('./softwareHouseFinanceReads')(router, {
  unifiedSoftwareHouseAuth,
  requireErpAccess,
  Transaction,
  Invoice,
  Bill,
  ChartOfAccounts,
  CashFlowForecast,
  Vendor,
  ProjectCosting
});

require('./softwareHouseFinanceWrites')(router, {
  mongoose,
  unifiedSoftwareHouseAuth,
  shFinanceRead,
  shFinanceWrite,
  Invoice,
  Bill,
  Vendor,
  ChartOfAccounts,
  TimeEntry,
  Project,
  ProjectCosting,
  CashFlowForecast,
  Expense
});

// ==================== SOFTWARE-HOUSE FINANCE: CLIENTS ====================
// Used by tenant finance UI (Accounts Receivable, client management)
const buildTenantContext = (req) => ({
  orgId: req.user.orgId,
  tenantId: req.user.tenantId,
  hasSeparateDatabase: false
});

router.get('/finance/clients', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
  const tenantContext = buildTenantContext(req);
  const options = { status: req.query.status };
  const { clients } = await tenantOrgService.getClients(tenantContext, options);
  res.json({ success: true, data: clients || [] });
}));

router.post('/finance/clients', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const tenantContext = buildTenantContext(req);
  const client = await tenantOrgService.createClient(tenantContext, req.body);
  res.status(201).json({ success: true, data: client });
}));

router.put('/finance/clients/:clientId', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const tenantContext = buildTenantContext(req);
  const client = await tenantOrgService.updateClient(tenantContext, req.params.clientId, req.body);
  res.json({ success: true, data: client });
}));

router.delete('/finance/clients/:clientId', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const tenantContext = buildTenantContext(req);
  const client = await tenantOrgService.deleteClient(tenantContext, req.params.clientId);
  res.json({ success: true, data: client });
}));

// Employee Portal: Get user's workspaces and projects
router.get('/employee-portal/workspaces', unifiedSoftwareHouseAuth, requireRole(['owner', 'admin', 'project_manager', 'employee', 'contractor']), ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const orgId = req.user.orgId;

    if (!userId || !orgId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Organization ID are required'
      });
    }

    // 1. Get or create personal workspace
    let personalWorkspace = await Workspace.findOne({
      orgId,
      ownerId: userId,
      type: 'internal',
      name: { $regex: /^Personal Workspace/i }
    }).populate('ownerId', 'fullName email');

    // If personal workspace doesn't exist, create it
    if (!personalWorkspace) {
      const user = await require('../../../models/users-auth/User').findById(userId).select('fullName email');
      const userName = user?.fullName || 'Employee';
      
      // Generate unique slug
      let slug = `personal-${userId.toString().slice(-6)}`;
      let counter = 1;
      while (await Workspace.findOne({ slug, orgId })) {
        slug = `personal-${userId.toString().slice(-6)}-${counter}`;
        counter++;
      }

      personalWorkspace = new Workspace({
        orgId,
        ownerId: userId,
        name: `Personal Workspace - ${userName}`,
        slug,
        description: 'Your personal workspace for managing tasks',
        type: 'internal',
        members: [{
          userId,
          role: 'owner',
          status: 'active',
          joinedAt: new Date()
        }],
        settings: {
          allowMemberInvites: false,
          clientVisible: false,
          publicBoards: false
        }
      });
      await personalWorkspace.save();
      await personalWorkspace.populate('ownerId', 'fullName email');
    }

    // 2. Get company workspaces (internal workspaces where user is member but not owner, or owner but not personal)
    const companyWorkspaces = await Workspace.find({
      orgId,
      type: 'internal',
      status: 'active',
      $or: [
        { 'members.userId': userId, 'members.status': 'active' },
        { ownerId: userId }
      ],
      _id: { $ne: personalWorkspace._id } // Exclude personal workspace
    })
      .populate('ownerId', 'fullName email')
      .populate('members.userId', 'fullName email')
      .sort({ updatedAt: -1 })
      .limit(50);

    // Filter to only include workspaces where user is actually a member or owner
    const filteredCompanyWorkspaces = companyWorkspaces.filter(ws => {
      const isOwner = ws.ownerId._id.toString() === userId.toString();
      const isMember = ws.members.some(m => 
        m.userId._id.toString() === userId.toString() && m.status === 'active'
      );
      return isOwner || isMember;
    });

    // 3. Get projects where user is a ProjectMember
    const projectMemberships = await ProjectMember.find({
      userId,
      status: 'active'
    }).select('projectId role').lean();

    const projectIds = projectMemberships.map(pm => pm.projectId);

    const companyProjects = await Project.find({
      _id: { $in: projectIds },
      orgId,
      status: { $ne: 'archived' }
    })
      .populate('clientId', 'name email')
      .select('name description status startDate endDate clientId')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      success: true,
      data: {
        personalWorkspace,
        companyWorkspaces: filteredCompanyWorkspaces,
        companyProjects
      }
    });
  } catch (error) {
    console.error('Employee portal workspaces error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load workspaces',
      error: error.message
    });
  }
}));

// Employee Portal: Create personal workspace (if doesn't exist)
router.post('/employee-portal/workspaces/personal', unifiedSoftwareHouseAuth, checkReadOnlySoftwareHouseOnly, checkUsageLimitSoftwareHouseOnly('workspaces', 1), requireRole(['owner', 'admin', 'project_manager', 'employee', 'contractor']), ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const orgId = req.user.orgId;

    if (!userId || !orgId) {
      return res.status(400).json({
        success: false,
        message: 'User ID and Organization ID are required'
      });
    }

    // Check if personal workspace already exists
    let personalWorkspace = await Workspace.findOne({
      orgId,
      ownerId: userId,
      type: 'internal',
      name: { $regex: /^Personal Workspace/i }
    }).populate('ownerId', 'fullName email');

    if (personalWorkspace) {
      return res.json({
        success: true,
        message: 'Personal workspace already exists',
        data: { workspace: personalWorkspace }
      });
    }

    // Create personal workspace
    const User = require('../../../models/users-auth/User');
    const user = await User.findById(userId).select('fullName email');
    const userName = user?.fullName || 'Employee';
    
    // Generate unique slug
    let slug = `personal-${userId.toString().slice(-6)}`;
    let counter = 1;
    while (await Workspace.findOne({ slug, orgId })) {
      slug = `personal-${userId.toString().slice(-6)}-${counter}`;
      counter++;
    }

    personalWorkspace = new Workspace({
      orgId,
      ownerId: userId,
      name: `Personal Workspace - ${userName}`,
      slug,
      description: 'Your personal workspace for managing tasks',
      type: 'internal',
      members: [{
        userId,
        role: 'owner',
        status: 'active',
        joinedAt: new Date()
      }],
      settings: {
        allowMemberInvites: false,
        clientVisible: false,
        publicBoards: false
      }
    });
    await personalWorkspace.save();
    await personalWorkspace.populate('ownerId', 'fullName email');

    return res.json({
      success: true,
      message: 'Personal workspace created successfully',
      data: { workspace: personalWorkspace }
    });
  } catch (error) {
    console.error('Create personal workspace error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create personal workspace',
      error: error.message
    });
  }
}));


// ==================== FINANCE REPORTS ====================

router.post('/finance/reports/generate', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
  const rawOrgId = req.user.orgId;
  const orgId = mongoose.Types.ObjectId.isValid(rawOrgId) ? new mongoose.Types.ObjectId(rawOrgId) : rawOrgId;
  const { reportId, startDate, endDate } = req.body;
  const start = new Date(startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const end = new Date(endDate || new Date());
  end.setHours(23, 59, 59, 999);
  const periodLabel = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  let data = {};

  if (reportId === 'profit-loss') {
    const [revenueRows, expenseRows] = await Promise.all([
      Transaction.aggregate([
        { $match: { orgId, type: 'revenue', date: { $gte: start, $lte: end } } },
        { $group: { _id: '$category', amount: { $sum: '$amount' } } },
        { $sort: { amount: -1 } }
      ]),
      Transaction.aggregate([
        { $match: { orgId, type: 'expense', date: { $gte: start, $lte: end } } },
        { $group: { _id: '$category', amount: { $sum: '$amount' } } },
        { $sort: { amount: -1 } }
      ])
    ]);
    const totalRevenue = revenueRows.reduce((s, r) => s + r.amount, 0);
    const totalExpenses = expenseRows.reduce((s, r) => s + r.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    data = {
      title: 'Profit & Loss Statement',
      period: periodLabel,
      revenue: {
        total: totalRevenue,
        breakdown: revenueRows.map(r => ({ category: r._id || 'Uncategorized', amount: r.amount }))
      },
      expenses: {
        total: totalExpenses,
        breakdown: expenseRows.map(r => ({ category: r._id || 'Uncategorized', amount: r.amount }))
      },
      netProfit,
      grossMargin: totalRevenue > 0 ? +((netProfit / totalRevenue) * 100).toFixed(1) : 0
    };

  } else if (reportId === 'cash-flow') {
    const [inflowRows, outflowRows, forecasts] = await Promise.all([
      Transaction.aggregate([
        { $match: { orgId, type: 'revenue', date: { $gte: start, $lte: end } } },
        { $group: { _id: { $month: '$date' }, month: { $first: '$date' }, amount: { $sum: '$amount' } } },
        { $sort: { '_id': 1 } }
      ]),
      Transaction.aggregate([
        { $match: { orgId, type: 'expense', date: { $gte: start, $lte: end } } },
        { $group: { _id: { $month: '$date' }, month: { $first: '$date' }, amount: { $sum: '$amount' } } },
        { $sort: { '_id': 1 } }
      ]),
      CashFlowForecast.find({ orgId, 'period.start': { $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) } })
        .sort({ 'period.start': 1 })
        .limit(20)
    ]);
    const totalInflows = inflowRows.reduce((s, r) => s + r.amount, 0);
    const totalOutflows = outflowRows.reduce((s, r) => s + r.amount, 0);
    data = {
      title: 'Cash Flow Statement',
      period: periodLabel,
      operating: { inflows: totalInflows, outflows: totalOutflows, net: totalInflows - totalOutflows },
      monthlyBreakdown: inflowRows.map(r => ({
        month: new Date(r.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        inflow: r.amount,
        outflow: outflowRows.find(o => o._id === r._id)?.amount || 0
      })),
      upcomingForecasts: forecasts.flatMap((f) => {
        const events = [];
        (f.scenarios || []).forEach((scenario) => {
          (scenario.inflows || []).forEach((x) => events.push({ date: x.date, type: 'inflow', amount: x.amount, category: x.category, confidence: 'medium' }));
          (scenario.outflows || []).forEach((x) => events.push({ date: x.date, type: 'outflow', amount: x.amount, category: x.category, confidence: 'medium' }));
        });
        return events;
      }).slice(0, 25)
    };

  } else if (reportId === 'balance-sheet') {
    const accounts = await ChartOfAccounts.find({ orgId }).sort({ code: 1 });
    const byType = (type) => accounts.filter(a => a.type === type).map(a => ({ code: a.code, name: a.name, balance: a.balance || 0 }));
    const sum = (arr) => arr.reduce((s, a) => s + a.balance, 0);
    const assets = byType('asset');
    const liabilities = byType('liability');
    const equity = byType('equity');
    data = {
      title: 'Balance Sheet',
      period: `As of ${end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      assets: { items: assets, total: sum(assets) },
      liabilities: { items: liabilities, total: sum(liabilities) },
      equity: { items: equity, total: sum(equity) }
    };

  } else if (reportId === 'project-profitability') {
    const costings = await ProjectCosting.find({ orgId }).populate('projectId', 'name client').lean();
    data = {
      title: 'Project Profitability Report',
      period: periodLabel,
      projects: costings.map(c => {
        const revenue = c.budget?.totalRevenue || c.budget?.total || 0;
        const costs = c.actualCosts?.total || 0;
        const profit = revenue - costs;
        return {
          name: c.projectId?.name || c.projectName || 'Unknown Project',
          client: c.clientName || 'N/A',
          budget: c.budget?.total || c.budget?.totalRevenue || 0,
          revenue,
          costs,
          profit,
          margin: revenue > 0 ? +((profit / revenue) * 100).toFixed(1) : 0,
          status: c.status || 'active'
        };
      })
    };

  } else if (reportId === 'client-analysis') {
    const invoices = await Invoice.find({ orgId, createdAt: { $gte: start, $lte: end } }).lean();
    const clientMap = {};
    for (const inv of invoices) {
      const key = inv.clientName || 'Unknown';
      if (!clientMap[key]) clientMap[key] = { name: key, revenue: 0, invoices: 0, paid: 0, outstanding: 0 };
      clientMap[key].revenue += inv.total || 0;
      clientMap[key].invoices++;
      if (inv.status === 'paid') clientMap[key].paid += inv.total || 0;
      else clientMap[key].outstanding += (inv.remainingAmount ?? Math.max(0, (inv.total || 0) - (inv.paidAmount || 0)));
    }
    data = {
      title: 'Client Analysis Report',
      period: periodLabel,
      clients: Object.values(clientMap).sort((a, b) => b.revenue - a.revenue).map(c => ({
        ...c,
        avgInvoiceValue: c.invoices > 0 ? +(c.revenue / c.invoices).toFixed(2) : 0,
        paymentTerms: 'Net 30'
      }))
    };

  } else if (reportId === 'time-tracking') {
    const entries = await TimeEntry.find({ orgId, date: { $gte: start, $lte: end } })
      .populate('projectId', 'name')
      .populate('employeeId', 'fullName')
      .lean();
    const byEmployee = {};
    for (const e of entries) {
      const key = e.employeeId?.fullName || e.employeeName || 'Unknown';
      if (!byEmployee[key]) byEmployee[key] = { employee: key, hours: 0, projects: new Set(), billable: 0 };
      byEmployee[key].hours += e.hours || e.duration || 0;
      byEmployee[key].billable += e.billable ? (e.hours || 0) : 0;
      if (e.projectId?.name) byEmployee[key].projects.add(e.projectId.name);
    }
    const totalHours = entries.reduce((s, e) => s + (e.hours || e.duration || 0), 0);
    data = {
      title: 'Time Tracking Report',
      period: periodLabel,
      summary: { totalHours, totalEntries: entries.length },
      byEmployee: Object.values(byEmployee).map(r => ({ ...r, projects: [...r.projects] })).sort((a, b) => b.hours - a.hours)
    };

  } else if (reportId === 'expense-analysis') {
    const rows = await Transaction.aggregate([
      { $match: { orgId, type: 'expense', date: { $gte: start, $lte: end } } },
      { $group: { _id: '$category', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { amount: -1 } }
    ]);
    const total = rows.reduce((s, r) => s + r.amount, 0);
    data = {
      title: 'Expense Analysis',
      period: periodLabel,
      total,
      categories: rows.map(r => ({
        category: r._id || 'Uncategorized',
        amount: r.amount,
        count: r.count,
        percentage: total > 0 ? +((r.amount / total) * 100).toFixed(1) : 0
      }))
    };

  } else if (reportId === 'revenue-trends') {
    const months = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      months.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const rows = await Transaction.aggregate([
      { $match: { orgId, type: 'revenue', date: { $gte: start, $lte: end } } },
      { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, amount: { $sum: '$amount' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    const trend = rows.map((r, i) => {
      const prev = rows[i - 1]?.amount || null;
      return {
        label: new Date(r._id.year, r._id.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: r.amount,
        growth: prev !== null && prev > 0 ? +((( r.amount - prev) / prev) * 100).toFixed(1) : null
      };
    });
    data = {
      title: 'Revenue Trends',
      period: periodLabel,
      trend,
      totalRevenue: rows.reduce((s, r) => s + r.amount, 0),
      avgMonthly: rows.length > 0 ? +(rows.reduce((s, r) => s + r.amount, 0) / rows.length).toFixed(2) : 0
    };

  } else {
    return res.status(400).json({ success: false, message: 'Unknown report type' });
  }

  res.json({ success: true, data });
}));

router.post('/finance/reports/export', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
  const rawOrgId = req.user.orgId;
  const orgId = mongoose.Types.ObjectId.isValid(rawOrgId) ? new mongoose.Types.ObjectId(rawOrgId) : rawOrgId;
  const { reportId, format = 'csv', startDate, endDate } = req.body || {};

  const start = new Date(startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const end = new Date(endDate || new Date());
  end.setHours(23, 59, 59, 999);
  const periodLabel = `${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`;

  let data = {};
  if (reportId === 'profit-loss') {
    const [revenueRows, expenseRows] = await Promise.all([
      Transaction.aggregate([{ $match: { orgId, type: 'revenue', date: { $gte: start, $lte: end } } }, { $group: { _id: '$category', amount: { $sum: '$amount' } } }, { $sort: { amount: -1 } }]),
      Transaction.aggregate([{ $match: { orgId, type: 'expense', date: { $gte: start, $lte: end } } }, { $group: { _id: '$category', amount: { $sum: '$amount' } } }, { $sort: { amount: -1 } }])
    ]);
    const totalRevenue = revenueRows.reduce((s, r) => s + r.amount, 0);
    const totalExpenses = expenseRows.reduce((s, r) => s + r.amount, 0);
    data = {
      title: 'Profit & Loss Statement',
      period: periodLabel,
      revenue: { total: totalRevenue, breakdown: revenueRows.map(r => ({ category: r._id || 'Uncategorized', amount: r.amount })) },
      expenses: { total: totalExpenses, breakdown: expenseRows.map(r => ({ category: r._id || 'Uncategorized', amount: r.amount })) },
      netProfit: totalRevenue - totalExpenses
    };
  } else if (reportId === 'balance-sheet') {
    const accounts = await ChartOfAccounts.find({ orgId }).sort({ code: 1 }).lean();
    const byType = (type) => accounts.filter(a => a.type === type);
    const sum = (arr) => arr.reduce((s, a) => s + Number(a.balance || 0), 0);
    data = { title: 'Balance Sheet', period: periodLabel, assets: { items: byType('asset'), total: sum(byType('asset')) }, liabilities: { items: byType('liability'), total: sum(byType('liability')) }, equity: { items: byType('equity'), total: sum(byType('equity')) } };
  } else if (reportId === 'cash-flow') {
    const tx = await Transaction.find({ orgId, date: { $gte: start, $lte: end } }).lean();
    const inflows = tx.filter(t => t.type === 'revenue').reduce((s, t) => s + Number(t.amount || 0), 0);
    const outflows = tx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
    data = { title: 'Cash Flow Statement', period: periodLabel, operating: { inflows, outflows, net: inflows - outflows }, transactions: tx };
  } else {
    return res.status(400).json({ success: false, message: 'Unsupported report for export' });
  }

  const flattenedRows = [];
  const writeRows = (obj, prefix = '') => {
    Object.entries(obj || {}).forEach(([k, v]) => {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        writeRows(v, key);
      } else {
        flattenedRows.push({
          field: key,
          value: Array.isArray(v) ? JSON.stringify(v) : (v ?? '')
        });
      }
    });
  };
  writeRows(data);

  const normalizedFormat = String(format || 'csv').toLowerCase();
  const baseName = `${reportId || 'finance-report'}-${periodLabel}`;

  const writeCsvResponse = () => {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${baseName}.csv`);
    res.write('field,value\n');
    flattenedRows.forEach((row) => {
      const safeField = String(row.field).replace(/"/g, '""');
      const safeValue = String(row.value).replace(/"/g, '""');
      res.write(`"${safeField}","${safeValue}"\n`);
    });
    res.end();
  };

  if (normalizedFormat === 'csv') {
    return writeCsvResponse();
  }

  if (normalizedFormat === 'xlsx' || normalizedFormat === 'excel') {
    try {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Report');
      sheet.addRow(['field', 'value']);
      flattenedRows.forEach((row) => sheet.addRow([row.field, row.value]));
      sheet.getRow(1).font = { bold: true };
      sheet.getColumn(1).width = 48;
      sheet.getColumn(2).width = 60;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${baseName}.xlsx`);
      await workbook.xlsx.write(res);
      return res.end();
    } catch (_) {
      return writeCsvResponse();
    }
  }

  if (normalizedFormat === 'pdf') {
    try {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 36 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${baseName}.pdf`);
      doc.pipe(res);
      doc.fontSize(14).text(data.title || 'Finance Report');
      doc.moveDown(0.25);
      doc.fontSize(10).text(`Period: ${data.period || periodLabel}`);
      doc.moveDown();
      flattenedRows.forEach((row) => {
        doc.fontSize(9).text(`${row.field}: ${row.value}`);
      });
      doc.end();
      return;
    } catch (_) {
      return writeCsvResponse();
    }
  }

  return res.status(400).json({ success: false, message: 'Unsupported export format' });
}));

module.exports = router;
