const mongoose = require('mongoose');

const employeeMetricsSchema = new mongoose.Schema({
  // Employee Reference
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  // Time Period
  period: {
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    year: {
      type: Number,
      required: true
    },
    month: {
      type: Number,
      min: 1,
      max: 12
    },
    week: {
      type: Number,
      min: 1,
      max: 53
    },
    day: {
      type: Number,
      min: 1,
      max: 31
    }
  },
  
  // Attendance Metrics
  attendance: {
    totalDays: {
      type: Number,
      default: 0
    },
    presentDays: {
      type: Number,
      default: 0
    },
    absentDays: {
      type: Number,
      default: 0
    },
    lateArrivals: {
      type: Number,
      default: 0
    },
    earlyDepartures: {
      type: Number,
      default: 0
    },
    workFromHomeDays: {
      type: Number,
      default: 0
    },
    overtimeHours: {
      type: Number,
      default: 0
    },
    attendanceRate: {
      type: Number,
      default: 0 // percentage
    },
    punctualityRate: {
      type: Number,
      default: 0 // percentage
    },
    averageHoursPerDay: {
      type: Number,
      default: 0
    },
    totalHoursWorked: {
      type: Number,
      default: 0
    }
  },
  
  // Productivity Metrics
  productivity: {
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 75
    },
    billableUtilization: {
      type: Number,
      default: 0 // percentage
    },
    billableHours: {
      type: Number,
      default: 0
    },
    nonBillableHours: {
      type: Number,
      default: 0
    },
    taskCompletionRate: {
      type: Number,
      default: 0 // percentage
    },
    tasksCompleted: {
      type: Number,
      default: 0
    },
    tasksAssigned: {
      type: Number,
      default: 0
    },
    averageTaskCompletionTime: {
      type: Number,
      default: 0 // in hours
    },
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 80
    },
    reworkRate: {
      type: Number,
      default: 0 // percentage
    }
  },
  
  // Project Performance
  projectPerformance: {
    activeProjects: {
      type: Number,
      default: 0
    },
    completedProjects: {
      type: Number,
      default: 0
    },
    onTimeDeliveryRate: {
      type: Number,
      default: 0 // percentage
    },
    budgetAdherenceRate: {
      type: Number,
      default: 0 // percentage
    },
    clientSatisfactionScore: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    projectContribution: {
      type: Number,
      default: 0 // percentage of project success
    },
    leadershipScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    collaborationScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  
  // Financial Impact
  financial: {
    revenueGenerated: {
      type: Number,
      default: 0
    },
    costToCompany: {
      type: Number,
      default: 0
    },
    profitContribution: {
      type: Number,
      default: 0
    },
    roi: {
      type: Number,
      default: 0 // return on investment percentage
    },
    hourlyRate: {
      type: Number,
      default: 0
    },
    costPerHour: {
      type: Number,
      default: 0
    },
    valueGenerated: {
      type: Number,
      default: 0 // revenue - cost
    }
  },
  
  // Skill Development
  skills: {
    technicalSkills: [{
      skill: String,
      level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        default: 'beginner'
      },
      improvement: {
        type: Number,
        default: 0 // percentage improvement
      },
      lastAssessed: Date
    }],
    softSkills: [{
      skill: String,
      level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        default: 'beginner'
      },
      improvement: {
        type: Number,
        default: 0
      },
      lastAssessed: Date
    }],
    certifications: [{
      name: String,
      issuer: String,
      obtainedDate: Date,
      expiryDate: Date,
      status: {
        type: String,
        enum: ['active', 'expired', 'pending'],
        default: 'active'
      }
    }],
    trainingHours: {
      type: Number,
      default: 0
    },
    coursesCompleted: {
      type: Number,
      default: 0
    }
  },
  
  // Performance Reviews
  reviews: {
    overallRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    lastReviewDate: Date,
    nextReviewDate: Date,
    goals: [{
      title: String,
      description: String,
      targetDate: Date,
      status: {
        type: String,
        enum: ['not-started', 'in-progress', 'completed', 'cancelled'],
        default: 'not-started'
      },
      progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      weight: {
        type: Number,
        default: 1
      }
    }],
    feedback: [{
      type: {
        type: String,
        enum: ['positive', 'constructive', 'negative'],
        required: true
      },
      comment: String,
      givenBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      givenAt: {
        type: Date,
        default: Date.now
      },
      category: {
        type: String,
        enum: ['technical', 'communication', 'leadership', 'collaboration', 'punctuality', 'quality'],
        default: 'technical'
      }
    }]
  },
  
  // Engagement Metrics
  engagement: {
    satisfactionScore: {
      type: Number,
      min: 1,
      max: 5,
      default: 4
    },
    motivationLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    retentionRisk: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    },
    teamCollaboration: {
      type: Number,
      min: 0,
      max: 100,
      default: 75
    },
    initiativeScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 70
    },
    innovationContribution: {
      type: Number,
      default: 0
    },
    mentoringScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  
  // Workload & Capacity
  workload: {
    currentCapacity: {
      type: Number,
      default: 0 // percentage
    },
    optimalCapacity: {
      type: Number,
      default: 80 // percentage
    },
    overworkHours: {
      type: Number,
      default: 0
    },
    underworkHours: {
      type: Number,
      default: 0
    },
    stressLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    workLifeBalance: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    burnoutRisk: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    }
  },
  
  // Career Development
  career: {
    careerLevel: {
      type: String,
      enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'principal', 'director', 'executive'],
      default: 'entry'
    },
    promotionEligibility: {
      type: Boolean,
      default: false
    },
    nextPromotionDate: Date,
    careerPath: String,
    mentorship: {
      isMentor: {
        type: Boolean,
        default: false
      },
      isMentee: {
        type: Boolean,
        default: false
      },
      mentorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      menteeIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    },
    aspirations: [String],
    developmentNeeds: [String]
  },
  
  // Recognition & Rewards
  recognition: {
    awards: [{
      name: String,
      type: {
        type: String,
        enum: ['performance', 'innovation', 'teamwork', 'leadership', 'customer_service'],
        default: 'performance'
      },
      awardedDate: Date,
      awardedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      description: String
    }],
    bonuses: [{
      type: {
        type: String,
        enum: ['performance', 'annual', 'project', 'retention', 'signing', 'referral'],
        required: true
      },
      amount: {
        type: Number,
        required: true
      },
      description: String,
      awardedDate: {
        type: Date,
        default: Date.now
      },
      awardedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }],
    promotions: [{
      fromLevel: String,
      toLevel: String,
      promotionDate: Date,
      reason: String,
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  },
  
  // Health & Wellness
  wellness: {
    healthScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 80
    },
    sickDays: {
      type: Number,
      default: 0
    },
    mentalHealthScore: {
      type: Number,
      min: 1,
      max: 5,
      default: 4
    },
    stressIndicators: [{
      indicator: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low'
      },
      reportedDate: Date
    }],
    wellnessPrograms: [{
      program: String,
      participationDate: Date,
      completionDate: Date,
      score: Number
    }]
  },
  
  // Predictive Analytics
  predictions: {
    performanceForecast: {
      nextMonth: {
        type: Number,
        min: 0,
        max: 100,
        default: 75
      },
      nextQuarter: {
        type: Number,
        min: 0,
        max: 100,
        default: 75
      },
      confidence: {
        type: Number,
        min: 0,
        max: 100,
        default: 70
      }
    },
    churnRisk: {
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low'
      },
      riskScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 25
      },
      riskFactors: [String],
      mitigationActions: [String]
    },
    growthPotential: {
      potential: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      },
      readinessForPromotion: {
        type: Number,
        min: 0,
        max: 100,
        default: 50
      },
      skillGaps: [String],
      developmentRecommendations: [String]
    }
  },
  
  // Metadata
  calculatedAt: {
    type: Date,
    default: Date.now
  },
  calculationVersion: {
    type: String,
    default: '1.0'
  },
  dataQuality: {
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    issues: [{
      type: String,
      description: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low'
      }
    }]
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
employeeMetricsSchema.index({ employeeId: 1, 'period.type': 1, 'period.startDate': 1 });
employeeMetricsSchema.index({ userId: 1, 'period.type': 1, 'period.startDate': 1 });
employeeMetricsSchema.index({ orgId: 1, 'period.type': 1, 'period.startDate': 1 });
employeeMetricsSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });
employeeMetricsSchema.index({ calculatedAt: -1 });

// Virtual for period identifier
employeeMetricsSchema.virtual('periodId').get(function() {
  switch (this.period.type) {
    case 'daily':
      return `${this.period.year}-${this.period.month.toString().padStart(2, '0')}-${this.period.day.toString().padStart(2, '0')}`;
    case 'weekly':
      return `${this.period.year}-W${this.period.week.toString().padStart(2, '0')}`;
    case 'monthly':
      return `${this.period.year}-${this.period.month.toString().padStart(2, '0')}`;
    case 'quarterly':
      const quarter = Math.ceil(this.period.month / 3);
      return `${this.period.year}-Q${quarter}`;
    case 'yearly':
      return this.period.year.toString();
    default:
      return 'unknown';
  }
});

// Virtual for overall performance score
employeeMetricsSchema.virtual('overallPerformanceScore').get(function() {
  const weights = {
    productivity: 0.3,
    projectPerformance: 0.25,
    financial: 0.2,
    engagement: 0.15,
    skills: 0.1
  };
  
  let score = 0;
  
  // Productivity score (30% weight)
  score += this.productivity.overallScore * weights.productivity;
  
  // Project performance score (25% weight)
  const projectScore = (this.projectPerformance.onTimeDeliveryRate + 
                       this.projectPerformance.budgetAdherenceRate + 
                       (this.projectPerformance.clientSatisfactionScore * 20)) / 3;
  score += projectScore * weights.projectPerformance;
  
  // Financial impact score (20% weight)
  const financialScore = Math.min(100, this.financial.roi + 50); // Normalize ROI to 0-100
  score += financialScore * weights.financial;
  
  // Engagement score (15% weight)
  const engagementScore = (this.engagement.satisfactionScore * 20 + 
                          this.engagement.teamCollaboration + 
                          this.engagement.initiativeScore) / 3;
  score += engagementScore * weights.engagement;
  
  // Skills development score (10% weight)
  const skillsScore = this.skills.trainingHours > 0 ? 
    Math.min(100, (this.skills.coursesCompleted * 20) + (this.skills.trainingHours * 2)) : 50;
  score += skillsScore * weights.skills;
  
  return Math.min(100, Math.max(0, score));
});

// Virtual for performance trend
employeeMetricsSchema.virtual('performanceTrend').get(function() {
  // This would be calculated by comparing with previous periods
  // For now, return a default value
  return 'stable';
});

// Method to calculate improvement percentage
employeeMetricsSchema.methods.calculateImprovement = function(previousPeriod, metric) {
  if (!previousPeriod || !previousPeriod[metric]) {
    return 0;
  }
  
  const currentValue = this[metric] || 0;
  const previousValue = previousPeriod[metric];
  
  if (previousValue === 0) {
    return currentValue > 0 ? 100 : 0;
  }
  
  return ((currentValue - previousValue) / previousValue) * 100;
};

// Method to get performance insights
employeeMetricsSchema.methods.getPerformanceInsights = function() {
  const insights = [];
  
  // High performance insights
  if (this.productivity.overallScore >= 90) {
    insights.push({
      type: 'positive',
      category: 'productivity',
      message: 'Exceptional productivity performance',
      value: this.productivity.overallScore
    });
  }
  
  if (this.projectPerformance.onTimeDeliveryRate >= 95) {
    insights.push({
      type: 'positive',
      category: 'delivery',
      message: 'Excellent on-time delivery rate',
      value: this.projectPerformance.onTimeDeliveryRate
    });
  }
  
  if (this.financial.roi >= 200) {
    insights.push({
      type: 'positive',
      category: 'financial',
      message: 'High return on investment',
      value: this.financial.roi
    });
  }
  
  // Areas for improvement
  if (this.productivity.billableUtilization < 70) {
    insights.push({
      type: 'improvement',
      category: 'utilization',
      message: 'Low billable utilization',
      value: this.productivity.billableUtilization
    });
  }
  
  if (this.attendance.attendanceRate < 90) {
    insights.push({
      type: 'improvement',
      category: 'attendance',
      message: 'Attendance rate below target',
      value: this.attendance.attendanceRate
    });
  }
  
  if (this.engagement.satisfactionScore < 3) {
    insights.push({
      type: 'concern',
      category: 'engagement',
      message: 'Low job satisfaction',
      value: this.engagement.satisfactionScore
    });
  }
  
  return insights;
};

// Method to generate development recommendations
employeeMetricsSchema.methods.generateDevelopmentRecommendations = function() {
  const recommendations = [];
  
  // Skill development recommendations
  if (this.skills.trainingHours < 20) {
    recommendations.push({
      type: 'training',
      priority: 'medium',
      recommendation: 'Increase training hours to improve skill development',
      target: '20+ hours per period'
    });
  }
  
  // Productivity recommendations
  if (this.productivity.billableUtilization < 80) {
    recommendations.push({
      type: 'productivity',
      priority: 'high',
      recommendation: 'Focus on increasing billable work allocation',
      target: '80%+ billable utilization'
    });
  }
  
  // Career development recommendations
  if (this.career.promotionEligibility && this.overallPerformanceScore >= 85) {
    recommendations.push({
      type: 'career',
      priority: 'high',
      recommendation: 'Consider promotion opportunities',
      target: 'Next level advancement'
    });
  }
  
  // Wellness recommendations
  if (this.wellness.stressIndicators.some(indicator => indicator.severity === 'high')) {
    recommendations.push({
      type: 'wellness',
      priority: 'high',
      recommendation: 'Address stress management and work-life balance',
      target: 'Reduce stress indicators'
    });
  }
  
  return recommendations;
};

// Static method to get latest metrics for an employee
employeeMetricsSchema.statics.getLatest = function(employeeId, periodType = 'monthly') {
  return this.findOne({ employeeId, 'period.type': periodType })
    .sort({ 'period.endDate': -1 });
};

// Static method to get metrics for a date range
employeeMetricsSchema.statics.getByDateRange = function(employeeId, startDate, endDate, periodType = 'daily') {
  return this.find({
    employeeId,
    'period.type': periodType,
    'period.startDate': { $gte: startDate },
    'period.endDate': { $lte: endDate }
  }).sort({ 'period.startDate': 1 });
};

// Static method to get top performers
employeeMetricsSchema.statics.getTopPerformers = function(orgId, periodType = 'monthly', limit = 10) {
  return this.find({ orgId, 'period.type': periodType })
    .sort({ 'productivity.overallScore': -1 })
    .limit(limit);
};

// Static method to get employees needing attention
employeeMetricsSchema.statics.getNeedingAttention = function(orgId, periodType = 'monthly') {
  return this.find({
    orgId,
    'period.type': periodType,
    $or: [
      { 'productivity.overallScore': { $lt: 60 } },
      { 'attendance.attendanceRate': { $lt: 85 } },
      { 'engagement.satisfactionScore': { $lt: 3 } },
      { 'predictions.churnRisk.riskLevel': 'high' }
    ]
  }).sort({ 'productivity.overallScore': 1 });
};

// Static method to aggregate team metrics
employeeMetricsSchema.statics.getTeamMetrics = function(orgId, periodType, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        orgId,
        'period.type': periodType,
        'period.startDate': { $gte: startDate },
        'period.endDate': { $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalEmployees: { $sum: 1 },
        averageProductivity: { $avg: '$productivity.overallScore' },
        averageAttendance: { $avg: '$attendance.attendanceRate' },
        averageSatisfaction: { $avg: '$engagement.satisfactionScore' },
        totalRevenue: { $sum: '$financial.revenueGenerated' },
        totalCost: { $sum: '$financial.costToCompany' },
        averageROI: { $avg: '$financial.roi' }
      }
    }
  ]);
};

module.exports = mongoose.model('EmployeeMetrics', employeeMetricsSchema);
