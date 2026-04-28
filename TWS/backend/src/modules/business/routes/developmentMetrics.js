const express = require('express');
const router = express.Router();
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const DevelopmentMetrics = require('../../../models/DevelopmentMetrics');
const Project = require('../../../models/Project');
const Card = require('../../../models/Card');
const Sprint = require('../../../models/Sprint');
const metricsRead = requireErpAccess({ module: 'projects', action: ['read', 'read_own'], checkRevocation: false });
const metricsWrite = requireErpAccess({ module: 'projects', action: 'write', checkRevocation: false });
router.use(verifyERPToken);

// Get development metrics for a project
router.get('/project/:projectId', metricsRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { period = 'weekly', limit = 12 } = req.query;
  
  const metrics = await DevelopmentMetrics.find({ 
    projectId, 
    period 
  })
    .sort({ startDate: -1 })
    .limit(parseInt(limit));
  
  res.json({
    success: true,
    data: metrics
  });
}));

// Get organization-wide development metrics
router.get('/organization', metricsRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { period = 'monthly', limit = 12 } = req.query;
  const orgId = req.user.orgId;
  
  const metrics = await DevelopmentMetrics.find({ 
    orgId, 
    period 
  })
    .sort({ startDate: -1 })
    .limit(parseInt(limit));
  
  res.json({
    success: true,
    data: metrics
  });
}));

// Get tenant-specific development metrics
router.get('/tenant/:tenantId', metricsRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { tenantId } = req.params;
  const { period = 'monthly', limit = 12 } = req.query;
  
  const metrics = await DevelopmentMetrics.find({ 
    tenantId, 
    period 
  })
    .populate('projectId', 'name clientId')
    .sort({ startDate: -1 })
    .limit(parseInt(limit));
  
  res.json({
    success: true,
    data: metrics
  });
}));

// Calculate and store development metrics
router.post('/calculate/:projectId', metricsWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { period, startDate, endDate } = req.body;
  const orgId = req.user.orgId;
  
  // Get project details
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    });
  }
  
  // Calculate metrics based on the period
  const metrics = await calculateProjectMetrics(projectId, period, startDate, endDate);
  
  // Store or update metrics
  const existingMetrics = await DevelopmentMetrics.findOne({
    projectId,
    period,
    startDate: new Date(startDate),
    endDate: new Date(endDate)
  });
  
  let savedMetrics;
  if (existingMetrics) {
    savedMetrics = await DevelopmentMetrics.findByIdAndUpdate(
      existingMetrics._id,
      { ...metrics, calculatedAt: new Date(), calculatedBy: req.user.userId },
      { new: true }
    );
  } else {
    savedMetrics = new DevelopmentMetrics({
      projectId,
      orgId,
      tenantId: project.tenantId,
      period,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      ...metrics,
      calculatedBy: req.user.userId
    });
    await savedMetrics.save();
  }
  
  res.json({
    success: true,
    data: savedMetrics,
    message: 'Development metrics calculated and stored successfully'
  });
}));

// Get velocity trends
router.get('/velocity/:projectId', metricsRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { limit = 10 } = req.query;
  
  const metrics = await DevelopmentMetrics.find({ 
    projectId,
    period: 'weekly'
  })
    .select('startDate velocity')
    .sort({ startDate: -1 })
    .limit(parseInt(limit));
  
  const velocityTrend = metrics.map(metric => ({
    date: metric.startDate,
    velocity: metric.velocity.velocityTrend,
    averageVelocity: metric.velocity.averageVelocity
  }));
  
  res.json({
    success: true,
    data: velocityTrend
  });
}));

// Get burndown chart data
router.get('/burndown/:projectId', metricsRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { sprintId } = req.query;
  
  let burndownData;
  
  if (sprintId) {
    // Get sprint-specific burndown
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: 'Sprint not found'
      });
    }
    burndownData = sprint.metrics.burndown;
  } else {
    // Get project burndown from latest metrics
    const latestMetrics = await DevelopmentMetrics.findOne({ 
      projectId,
      period: 'weekly'
    }).sort({ startDate: -1 });
    
    burndownData = latestMetrics ? latestMetrics.burndown : [];
  }
  
  res.json({
    success: true,
    data: burndownData
  });
}));

// Get code quality metrics
router.get('/code-quality/:projectId', metricsRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { limit = 6 } = req.query;
  
  const metrics = await DevelopmentMetrics.find({ 
    projectId,
    period: 'weekly'
  })
    .select('startDate codeQuality')
    .sort({ startDate: -1 })
    .limit(parseInt(limit));
  
  const qualityTrend = metrics.map(metric => ({
    date: metric.startDate,
    codeCoverage: metric.codeQuality.codeCoverage,
    technicalDebt: metric.codeQuality.technicalDebt,
    bugDensity: metric.codeQuality.bugDensity,
    testCoverage: metric.codeQuality.testCoverage
  }));
  
  res.json({
    success: true,
    data: qualityTrend
  });
}));

// Get client satisfaction metrics
router.get('/client-satisfaction/:projectId', metricsRead, ErrorHandler.asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { limit = 6 } = req.query;
  
  const metrics = await DevelopmentMetrics.find({ 
    projectId,
    period: 'monthly'
  })
    .select('startDate clientSatisfaction')
    .sort({ startDate: -1 })
    .limit(parseInt(limit));
  
  const satisfactionTrend = metrics.map(metric => ({
    date: metric.startDate,
    overallRating: metric.clientSatisfaction.overallRating,
    communicationRating: metric.clientSatisfaction.communicationRating,
    qualityRating: metric.clientSatisfaction.qualityRating,
    timelinessRating: metric.clientSatisfaction.timelinessRating,
    feedbackCount: metric.clientSatisfaction.feedbackCount
  }));
  
  res.json({
    success: true,
    data: satisfactionTrend
  });
}));

// Helper function to calculate project metrics
async function calculateProjectMetrics(projectId, period, startDate, endDate) {
  // Get all cards for the project in the given period
  const cards = await Card.find({
    projectId,
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
  });
  
  // Get sprints for the project in the given period
  const sprints = await Sprint.find({
    projectId,
    startDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
  });
  
  // Calculate velocity metrics
  const totalStoryPoints = cards.reduce((sum, card) => sum + (card.storyPoints || 0), 0);
  const completedStoryPoints = cards
    .filter(card => card.status === 'completed')
    .reduce((sum, card) => sum + (card.storyPoints || 0), 0);
  
  // Calculate time tracking metrics
  const totalHours = cards.reduce((sum, card) => sum + (card.timeTracking?.logged || 0), 0);
  const billableHours = cards.reduce((sum, card) => sum + (card.timeTracking?.billable || 0), 0);
  const nonBillableHours = cards.reduce((sum, card) => sum + (card.timeTracking?.nonBillable || 0), 0);
  
  // Calculate bug metrics
  const bugCards = cards.filter(card => card.type === 'bug');
  const totalBugs = bugCards.length;
  const criticalBugs = bugCards.filter(card => card.priority === 'critical').length;
  const highBugs = bugCards.filter(card => card.priority === 'high').length;
  const mediumBugs = bugCards.filter(card => card.priority === 'medium').length;
  const lowBugs = bugCards.filter(card => card.priority === 'low').length;
  const bugsFixed = bugCards.filter(card => card.status === 'completed').length;
  
  // Calculate feature metrics
  const featureCards = cards.filter(card => card.type === 'feature' || card.type === 'user_story');
  const featuresDelivered = featureCards.filter(card => card.status === 'completed').length;
  const featuresInProgress = featureCards.filter(card => card.status === 'in_progress').length;
  const featuresPlanned = featureCards.filter(card => card.status === 'todo').length;
  
  return {
    velocity: {
      storyPointsCompleted: completedStoryPoints,
      storyPointsCommitted: totalStoryPoints,
      velocityTrend: 0, // This would need historical data to calculate
      averageVelocity: sprints.length > 0 ? completedStoryPoints / sprints.length : 0
    },
    teamPerformance: {
      totalHours,
      billableHours,
      nonBillableHours,
      utilizationRate: totalHours > 0 ? (billableHours / totalHours) * 100 : 0,
      overtimeHours: 0, // This would need additional data
      averageTaskCompletionTime: 0, // This would need additional data
      taskAccuracy: 0 // This would need additional data
    },
    bugs: {
      totalBugs,
      criticalBugs,
      highBugs,
      mediumBugs,
      lowBugs,
      bugsFixed,
      bugResolutionTime: 0, // This would need additional data
      bugReopenRate: 0 // This would need additional data
    },
    features: {
      featuresDelivered,
      featuresInProgress,
      featuresPlanned,
      featureCompletionRate: featuresPlanned > 0 ? (featuresDelivered / featuresPlanned) * 100 : 0,
      averageFeatureTime: 0 // This would need additional data
    },
    codeQuality: {
      linesOfCode: 0, // This would need integration with code analysis tools
      codeCoverage: 0, // This would need integration with testing tools
      technicalDebt: 0, // This would need integration with code analysis tools
      codeReviewTime: 0, // This would need additional data
      bugDensity: 0, // This would need additional data
      testCoverage: 0 // This would need integration with testing tools
    },
    clientSatisfaction: {
      overallRating: 0, // This would need client feedback data
      communicationRating: 0,
      qualityRating: 0,
      timelinessRating: 0,
      feedbackCount: 0,
      complaintsCount: 0
    },
    projectHealth: {
      onTimeDelivery: 0, // This would need milestone data
      budgetVariance: 0, // This would need budget data
      scopeCreep: 0, // This would need scope change data
      riskLevel: 'low',
      milestoneCompletion: 0 // This would need milestone data
    },
    efficiency: {
      cycleTime: 0, // This would need additional data
      leadTime: 0, // This would need additional data
      throughput: cards.length, // tasks per period
      workInProgress: cards.filter(card => card.status === 'in_progress').length,
      blockedTasks: cards.filter(card => card.status === 'blocked').length
    },
    resourceUtilization: {
      developerUtilization: 0, // This would need role-based data
      designerUtilization: 0,
      qaUtilization: 0,
      pmUtilization: 0,
      totalCapacity: 0,
      actualCapacity: totalHours
    },
    burndown: {
      totalStoryPoints,
      remainingStoryPoints: totalStoryPoints - completedStoryPoints,
      idealBurndown: 0, // This would need calculation based on timeline
      actualBurndown: completedStoryPoints,
      burndownEfficiency: totalStoryPoints > 0 ? (completedStoryPoints / totalStoryPoints) * 100 : 0
    }
  };
}

module.exports = router;
