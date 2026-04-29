const express = require('express');
// Use mergeParams: true to access :tenantSlug from parent route
const router = express.Router({ mergeParams: true });
const { requireRole } = require('../../../../middleware/auth/auth');
const ErrorHandler = require('../../../../middleware/common/errorHandler');
const Tenant = require('../../../../models/tenant/Tenant');
const SoftwareHouseRole = require('../../../../models/admin-platform/SoftwareHouseRole');
const Project = require('../../../../models/project-delivery/Project');
const Card = require('../../../../models/industry/Card');
const Sprint = require('../../../../models/project-delivery/Sprint');
const DevelopmentMetrics = require('../../../../models/analytics/DevelopmentMetrics');
const { TimeEntry } = require('../../../../models/finance/Finance');
const Client = require('../../../../models/industry/Client');
const tenantOrgService = require('../../../../services/tenant/tenant-org.service');
const timeTrackingService = require('../../../../services/softwareHouse/time-tracking.service');

// Use simplified ERP token verification middleware (sets req.user, req.tenant, req.orgId from tenant JWT/cookie)
const verifyERPToken = require('../../../../middleware/auth/verifyERPToken');
router.use(verifyERPToken);

/** Roles that can read software-house workspace data (dashboard, project lists, etc.) */
const SOFTWARE_HOUSE_TEAM_READ_ROLES = [
  'owner', 'admin', 'super_admin', 'org_manager', 'org_admin', 'tenant_owner',
  'project_manager', 'manager', 'employee', 'contractor', 'contributor',
  'developer', 'engineer', 'programmer', 'staff',
  'hr', 'finance', 'ceo', 'cfo', 'department_lead', 'pmo',
];

// Get tenant software house configuration
router.get('/config', requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const orgId = req.orgId || req.user?.orgId;
  
  const tenant = await Tenant.findOne({ _id: tenantId, $or: [{ orgId }, { organizationId: orgId }] })
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
router.put('/config', requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const orgId = req.orgId || req.user?.orgId;
  const updates = req.body;
  
  const tenant = await Tenant.findOne({ _id: tenantId, $or: [{ orgId }, { organizationId: orgId }] });
  
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
router.get('/metrics', requireRole(['owner', 'admin', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  const orgId = req.orgId || req.user?.orgId;
  
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
router.get('/projects', requireRole(SOFTWARE_HOUSE_TEAM_READ_ROLES), ErrorHandler.asyncHandler(async (req, res) => {
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
router.get('/sprints', requireRole(SOFTWARE_HOUSE_TEAM_READ_ROLES), ErrorHandler.asyncHandler(async (req, res) => {
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
router.get('/analytics', requireRole(['owner', 'admin', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.get('/team', requireRole(['owner', 'admin', 'project_manager', 'hr']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.post('/initialize', requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
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
      clientPortalEnabled: true,
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
router.post('/time-tracking/start', requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.post('/time-tracking/stop/:timeEntryId', requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.get('/time-tracking/active', requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.get('/time-tracking/entries', requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager', 'hr']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.get('/time-tracking', requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager', 'hr']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.get('/time-tracking/today', requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager', 'hr']), ErrorHandler.asyncHandler(async (req, res) => {
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
    
    // Group by project and compute summary directly from today's entries.
    // This keeps the UI cards in sync with what the table shows (including draft/submitted entries).
    const projects = {};
    let totalHours = 0;
    let billableHours = 0;
    result.timeEntries.forEach(entry => {
      const entryHours = Number(entry.hours || 0);
      const projectName = entry.projectId?.name || 'Unknown';
      totalHours += entryHours;
      if (entry.billable) billableHours += entryHours;
      if (!projects[projectName]) {
        projects[projectName] = {
          name: projectName,
          hours: 0,
          billable: false
        };
      }
      projects[projectName].hours += entryHours;
      if (entry.billable) {
        projects[projectName].billable = true;
      }
    });
  
  res.json({
    success: true,
    data: {
        totalHours,
        billableHours,
      projects: Object.values(projects),
        entries: result.timeEntries
    }
  });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}));

// Create manual time entry
router.post('/time-tracking/entries', requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.post('/time-tracking/entry', requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.get('/time-tracking/stats', ErrorHandler.asyncHandler(async (req, res) => {
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
router.post('/time-tracking/entries/:timeEntryId/approve', requireRole(['owner', 'admin', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.post('/time-tracking/entries/:timeEntryId/reject', requireRole(['owner', 'admin', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.patch('/time-tracking/entries/:timeEntryId', requireRole(['owner', 'admin', 'employee', 'contractor', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
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
router.delete('/time-tracking/entries/:timeEntryId', requireRole(['owner', 'admin', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  const { timeEntryId } = req.params;

  try {
    await timeTrackingService.deleteTimeEntry(orgId, timeEntryId);
    res.json({ success: true, message: 'Time entry deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}));

// ==================== CLIENT PORTAL ====================

// Get client portal configuration
router.get('/client-portal/config', requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const { tenantSlug } = req.params;
  
  // Get tenant from slug
  let tenant = await Tenant.findOne({ slug: tenantSlug });
  if (!tenant && /^[0-9a-f]{24}$/i.test(tenantSlug)) {
    tenant = await Tenant.findById(tenantSlug);
  }
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
  
  const tenantInfo = await Tenant.findOne({ _id: tenant._id })
    .select('softwareHouseConfig erpCategory');
  
  const config = tenantInfo.softwareHouseConfig?.clientPortal || {
    enabled: tenantInfo.softwareHouseConfig?.developmentSettings?.clientPortalEnabled || false,
    allowClientAccess: true,
    defaultVisibilityLevel: 'basic',
    features: {
      projectProgress: true,
      timeTracking: false,
      invoices: true,
      documents: true,
      communication: true
    }
  };
  
  res.json({
    success: true,
    data: config
  });
}));

// Update client portal configuration
router.put('/client-portal/config', requireRole(['owner', 'admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const orgId = req.user.orgId;
  const updates = req.body;
  
  const tenant = await Tenant.findOne({ _id: tenantId, orgId });
  
  if (!tenant || tenant.erpCategory !== 'software_house') {
    return res.status(400).json({
      success: false,
      message: 'Tenant is not configured as a software house'
    });
  }
  
  if (!tenant.softwareHouseConfig) {
    tenant.softwareHouseConfig = {};
  }
  
  tenant.softwareHouseConfig.clientPortal = {
    ...tenant.softwareHouseConfig.clientPortal,
    ...updates
  };
  
  // Also update developmentSettings if clientPortalEnabled is changed
  if (updates.enabled !== undefined) {
    if (!tenant.softwareHouseConfig.developmentSettings) {
      tenant.softwareHouseConfig.developmentSettings = {};
    }
    tenant.softwareHouseConfig.developmentSettings.clientPortalEnabled = updates.enabled;
  }
  
  await tenant.save();
  
  res.json({
    success: true,
    data: tenant.softwareHouseConfig.clientPortal,
    message: 'Client portal configuration updated successfully'
  });
}));

// Get projects with client portal access
router.get('/client-portal/projects', requireRole(['owner', 'admin', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user.orgId;
  
  const projects = await Project.find({
    orgId,
    'settings.portalSettings.allowClientPortal': true
  })
    .select('name slug description status clientId settings')
    .populate('clientId', 'name contact')
    .sort({ createdAt: -1 });
  
  res.json({
    success: true,
    data: projects
  });
}));

// Update project client portal settings
router.put('/client-portal/project/:projectId', requireRole(['owner', 'admin', 'project_manager']), ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const orgId = req.user.orgId;
  const { allowClientAccess, clientVisibilityLevel } = req.body;
  
  const project = await Project.findOne({ _id: projectId, orgId });
  
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }
  
  if (allowClientAccess !== undefined) {
    if (!project.settings) project.settings = {};
    if (!project.settings.portalSettings) project.settings.portalSettings = {};
    project.settings.portalSettings.allowClientPortal = allowClientAccess;
  }
  
  if (clientVisibilityLevel) {
    if (!project.settings) project.settings = {};
    if (!project.settings.portalSettings) project.settings.portalSettings = {};
    project.settings.portalSettings.portalVisibility = clientVisibilityLevel;
  }
  
  await project.save();
  
  res.json({
    success: true,
    data: project.settings,
    message: 'Project client portal settings updated successfully'
  });
}));

// Get tenant software house dashboard data
router.get('/dashboard', requireRole(SOFTWARE_HOUSE_TEAM_READ_ROLES), ErrorHandler.asyncHandler(async (req, res) => {
  const tenant = req.tenant;
  const orgId = req.orgId || req.tenantContext?.orgId || req.user?.orgId;
  
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
  
  if (!orgId) {
    return res.status(400).json({
      success: false,
      message: 'Organization context not available'
    });
  }
  
  const tenantId = tenant._id;
  const tenantInfo = tenant;
  
  // Get recent projects (Project model has no team.members path)
  const recentProjects = await Project.find({ orgId })
    .populate('clientId', 'name email')
    .select('name description status projectType methodology techStack budget timeline clientId')
    .sort({ updatedAt: -1 })
    .limit(5);
  
  // Get active sprints
  const activeSprints = await Sprint.find({ orgId, status: 'active' })
    .populate('projectId', 'name clientId')
    .populate('team.userId', 'firstName lastName email')
    .select('name projectId startDate endDate status goal capacity metrics team')
    .sort({ startDate: -1 })
    .limit(3);
  
  // Get metrics (reuse the metrics endpoint logic)
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
  
  const teamMetrics = await SoftwareHouseRole.aggregate([
    { $match: { orgId: orgId, isActive: true } },
    {
      $group: {
        _id: null,
        totalTeamMembers: { $sum: 1 }
      }
    }
  ]);
  
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
        totalTeamMembers: 0
      }
    }
  };
  
  res.json({
    success: true,
    data: dashboardData
  });
}));

// Document Hub – same API as organization/documents (verifyERPToken already applied to router)
// Note: No additional rate limiter needed here since verifyERPToken is already applied to router
// and users are authenticated. The general API rate limiter in app.js handles overall rate limiting.
const documentsRoutes = require('../../routes/documents');
router.use('/documents', documentsRoutes);

module.exports = router;
