const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

// Development Metrics Schema for Software House Analytics
const DevelopmentMetricsSchema = new mongoose.Schema({
  // Basic Info
  projectId: { type: ObjectId, ref: 'Project', required: true },
  orgId: { type: ObjectId, ref: 'Organization', required: true },
  tenantId: { type: ObjectId, ref: 'Tenant' },
  
  // Time Period
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: true
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  
  // Velocity Metrics
  velocity: {
    storyPointsCompleted: { type: Number, default: 0 },
    storyPointsCommitted: { type: Number, default: 0 },
    velocityTrend: { type: Number, default: 0 }, // percentage change
    averageVelocity: { type: Number, default: 0 }
  },
  
  // Burndown Metrics
  burndown: {
    totalStoryPoints: { type: Number, default: 0 },
    remainingStoryPoints: { type: Number, default: 0 },
    idealBurndown: { type: Number, default: 0 },
    actualBurndown: { type: Number, default: 0 },
    burndownEfficiency: { type: Number, default: 0 } // percentage
  },
  
  // Code Quality Metrics
  codeQuality: {
    linesOfCode: { type: Number, default: 0 },
    codeCoverage: { type: Number, default: 0 }, // percentage
    technicalDebt: { type: Number, default: 0 }, // hours
    codeReviewTime: { type: Number, default: 0 }, // hours
    bugDensity: { type: Number, default: 0 }, // bugs per 1000 lines
    testCoverage: { type: Number, default: 0 } // percentage
  },
  
  // Team Performance Metrics
  teamPerformance: {
    totalHours: { type: Number, default: 0 },
    billableHours: { type: Number, default: 0 },
    nonBillableHours: { type: Number, default: 0 },
    utilizationRate: { type: Number, default: 0 }, // percentage
    overtimeHours: { type: Number, default: 0 },
    averageTaskCompletionTime: { type: Number, default: 0 }, // hours
    taskAccuracy: { type: Number, default: 0 } // percentage
  },
  
  // Client Satisfaction Metrics
  clientSatisfaction: {
    overallRating: { type: Number, default: 0 }, // 1-5 scale
    communicationRating: { type: Number, default: 0 },
    qualityRating: { type: Number, default: 0 },
    timelinessRating: { type: Number, default: 0 },
    feedbackCount: { type: Number, default: 0 },
    complaintsCount: { type: Number, default: 0 }
  },
  
  // Project Health Metrics
  projectHealth: {
    onTimeDelivery: { type: Number, default: 0 }, // percentage
    budgetVariance: { type: Number, default: 0 }, // percentage
    scopeCreep: { type: Number, default: 0 }, // percentage
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    milestoneCompletion: { type: Number, default: 0 } // percentage
  },
  
  // Development Efficiency Metrics
  efficiency: {
    cycleTime: { type: Number, default: 0 }, // average days
    leadTime: { type: Number, default: 0 }, // average days
    throughput: { type: Number, default: 0 }, // tasks per day
    workInProgress: { type: Number, default: 0 },
    blockedTasks: { type: Number, default: 0 }
  },
  
  // Resource Utilization
  resourceUtilization: {
    developerUtilization: { type: Number, default: 0 }, // percentage
    designerUtilization: { type: Number, default: 0 },
    qaUtilization: { type: Number, default: 0 },
    pmUtilization: { type: Number, default: 0 },
    totalCapacity: { type: Number, default: 0 },
    actualCapacity: { type: Number, default: 0 }
  },
  
  // Bug and Issue Metrics
  bugs: {
    totalBugs: { type: Number, default: 0 },
    criticalBugs: { type: Number, default: 0 },
    highBugs: { type: Number, default: 0 },
    mediumBugs: { type: Number, default: 0 },
    lowBugs: { type: Number, default: 0 },
    bugsFixed: { type: Number, default: 0 },
    bugResolutionTime: { type: Number, default: 0 }, // average hours
    bugReopenRate: { type: Number, default: 0 } // percentage
  },
  
  // Feature Delivery Metrics
  features: {
    featuresDelivered: { type: Number, default: 0 },
    featuresInProgress: { type: Number, default: 0 },
    featuresPlanned: { type: Number, default: 0 },
    featureCompletionRate: { type: Number, default: 0 }, // percentage
    averageFeatureTime: { type: Number, default: 0 } // days
  },
  
  // Metadata
  calculatedAt: { type: Date, default: Date.now },
  calculatedBy: { type: ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Indexes for performance
DevelopmentMetricsSchema.index({ projectId: 1, period: 1, startDate: 1 });
DevelopmentMetricsSchema.index({ orgId: 1, period: 1 });
DevelopmentMetricsSchema.index({ tenantId: 1, period: 1 });

// Virtual for overall project score
DevelopmentMetricsSchema.virtual('overallScore').get(function() {
  const velocityScore = Math.min(this.velocity.velocityTrend, 20) / 20 * 25; // 25 points max
  const qualityScore = Math.min(this.codeQuality.codeCoverage, 100) / 100 * 25; // 25 points max
  const satisfactionScore = this.clientSatisfaction.overallRating / 5 * 25; // 25 points max
  const healthScore = Math.min(this.projectHealth.onTimeDelivery, 100) / 100 * 25; // 25 points max
  
  return Math.round(velocityScore + qualityScore + satisfactionScore + healthScore);
});

// Virtual for trend analysis
DevelopmentMetricsSchema.virtual('trends').get(function() {
  return {
    velocity: this.velocity.velocityTrend > 0 ? 'improving' : this.velocity.velocityTrend < 0 ? 'declining' : 'stable',
    quality: this.codeQuality.codeCoverage > 80 ? 'excellent' : this.codeQuality.codeCoverage > 60 ? 'good' : 'needs_improvement',
    satisfaction: this.clientSatisfaction.overallRating > 4 ? 'high' : this.clientSatisfaction.overallRating > 3 ? 'medium' : 'low',
    health: this.projectHealth.riskLevel === 'low' ? 'healthy' : this.projectHealth.riskLevel === 'medium' ? 'moderate' : 'at_risk'
  };
});

module.exports = mongoose.model('DevelopmentMetrics', DevelopmentMetricsSchema);
