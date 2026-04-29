const mongoose = require('mongoose');

const clientHealthSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  
  // Health Score (0-100)
  healthScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 75
  },
  
  // Engagement Metrics
  engagement: {
    lastLogin: Date,
    loginFrequency: {
      type: Number,
      default: 0 // logins per month
    },
    projectInteractions: {
      type: Number,
      default: 0 // interactions per month
    },
    supportTickets: {
      type: Number,
      default: 0 // tickets per month
    },
    responseTime: {
      type: Number,
      default: 0 // average response time in hours
    }
  },
  
  // Financial Health
  financial: {
    totalSpent: {
      type: Number,
      default: 0
    },
    averageInvoiceTime: {
      type: Number,
      default: 0 // days to pay
    },
    paymentReliability: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    outstandingAmount: {
      type: Number,
      default: 0
    },
    creditScore: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'unknown'],
      default: 'unknown'
    }
  },
  
  // Project Health
  projectHealth: {
    activeProjects: {
      type: Number,
      default: 0
    },
    completedProjects: {
      type: Number,
      default: 0
    },
    onTimeDelivery: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    budgetAdherence: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    satisfactionScore: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    }
  },
  
  // Churn Risk Assessment
  churnRisk: {
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 25
    },
    riskFactors: [{
      factor: String,
      impact: Number, // 0-10
      description: String,
      detectedAt: {
        type: Date,
        default: Date.now
      }
    }],
    lastAssessment: {
      type: Date,
      default: Date.now
    }
  },
  
  // Communication Patterns
  communication: {
    preferredChannel: {
      type: String,
      enum: ['email', 'phone', 'portal', 'meeting'],
      default: 'email'
    },
    responseTime: {
      type: Number,
      default: 24 // hours
    },
    communicationFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'as-needed'],
      default: 'weekly'
    },
    escalationContacts: [{
      name: String,
      email: String,
      phone: String,
      role: String
    }]
  },
  
  // Renewal & Expansion
  renewal: {
    contractEndDate: Date,
    renewalProbability: {
      type: Number,
      min: 0,
      max: 100,
      default: 75
    },
    expansionOpportunity: {
      type: String,
      enum: ['high', 'medium', 'low', 'none'],
      default: 'medium'
    },
    expansionValue: {
      type: Number,
      default: 0
    },
    lastRenewalDate: Date,
    renewalHistory: [{
      date: Date,
      value: Number,
      term: String,
      status: {
        type: String,
        enum: ['renewed', 'expanded', 'reduced', 'cancelled']
      }
    }]
  },
  
  // Satisfaction Tracking
  satisfaction: {
    overallScore: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    npsScore: {
      type: Number,
      min: 0,
      max: 10,
      default: 8
    },
    surveys: [{
      date: Date,
      score: Number,
      feedback: String,
      category: {
        type: String,
        enum: ['project', 'support', 'billing', 'overall']
      }
    }],
    complaints: [{
      date: Date,
      description: String,
      category: String,
      status: {
        type: String,
        enum: ['open', 'investigating', 'resolved', 'closed']
      },
      resolution: String
    }]
  },
  
  // Growth Indicators
  growth: {
    revenueGrowth: {
      type: Number,
      default: 0 // percentage
    },
    projectGrowth: {
      type: Number,
      default: 0 // percentage
    },
    teamGrowth: {
      type: Number,
      default: 0 // percentage
    },
    lastGrowthAssessment: Date
  },
  
  // Alerts & Notifications
  alerts: [{
    type: {
      type: String,
      enum: ['churn_risk', 'payment_delay', 'satisfaction_drop', 'engagement_low', 'renewal_due']
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    message: String,
    triggeredAt: {
      type: Date,
      default: Date.now
    },
    acknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    acknowledgedAt: Date
  }],
  
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for performance
clientHealthSchema.index({ clientId: 1 });
clientHealthSchema.index({ orgId: 1 });
clientHealthSchema.index({ healthScore: 1 });
clientHealthSchema.index({ 'churnRisk.riskLevel': 1 });
clientHealthSchema.index({ 'renewal.contractEndDate': 1 });
clientHealthSchema.index({ lastUpdated: 1 });

// Compound indexes
clientHealthSchema.index({ orgId: 1, 'churnRisk.riskLevel': 1 });
clientHealthSchema.index({ orgId: 1, healthScore: 1 });

// Virtual for health status
clientHealthSchema.virtual('healthStatus').get(function() {
  if (this.healthScore >= 80) return 'excellent';
  if (this.healthScore >= 60) return 'good';
  if (this.healthScore >= 40) return 'fair';
  return 'poor';
});

// Virtual for days until renewal
clientHealthSchema.virtual('daysUntilRenewal').get(function() {
  if (!this.renewal.contractEndDate) return null;
  const now = new Date();
  const renewalDate = new Date(this.renewal.contractEndDate);
  const diffTime = renewalDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to calculate health score
clientHealthSchema.methods.calculateHealthScore = function() {
  let score = 100;
  
  // Engagement factors (30% weight)
  const engagementScore = this.calculateEngagementScore();
  score = (score * 0.7) + (engagementScore * 0.3);
  
  // Financial factors (25% weight)
  const financialScore = this.calculateFinancialScore();
  score = (score * 0.75) + (financialScore * 0.25);
  
  // Project health factors (25% weight)
  const projectScore = this.calculateProjectScore();
  score = (score * 0.75) + (projectScore * 0.25);
  
  // Satisfaction factors (20% weight)
  const satisfactionScore = this.calculateSatisfactionScore();
  score = (score * 0.8) + (satisfactionScore * 0.2);
  
  this.healthScore = Math.max(0, Math.min(100, Math.round(score)));
  this.lastUpdated = new Date();
  
  return this.healthScore;
};

// Method to calculate engagement score
clientHealthSchema.methods.calculateEngagementScore = function() {
  let score = 100;
  
  // Login frequency (recent logins are good)
  if (this.engagement.lastLogin) {
    const daysSinceLogin = (new Date() - this.engagement.lastLogin) / (1000 * 60 * 60 * 24);
    if (daysSinceLogin > 30) score -= 30;
    else if (daysSinceLogin > 14) score -= 15;
    else if (daysSinceLogin > 7) score -= 5;
  } else {
    score -= 50; // Never logged in
  }
  
  // Project interactions
  if (this.engagement.projectInteractions < 1) score -= 20;
  else if (this.engagement.projectInteractions > 10) score += 10;
  
  // Support tickets (too many is bad)
  if (this.engagement.supportTickets > 5) score -= 15;
  else if (this.engagement.supportTickets === 0) score += 5;
  
  // Response time
  if (this.engagement.responseTime > 48) score -= 20;
  else if (this.engagement.responseTime < 4) score += 10;
  
  return Math.max(0, Math.min(100, score));
};

// Method to calculate financial score
clientHealthSchema.methods.calculateFinancialScore = function() {
  let score = 100;
  
  // Payment reliability
  score = (score * 0.6) + (this.financial.paymentReliability * 0.4);
  
  // Outstanding amount (high outstanding is bad)
  if (this.financial.outstandingAmount > this.financial.totalSpent * 0.1) {
    score -= 20;
  }
  
  // Average invoice time
  if (this.financial.averageInvoiceTime > 30) score -= 15;
  else if (this.financial.averageInvoiceTime < 7) score += 10;
  
  // Credit score
  switch (this.financial.creditScore) {
    case 'excellent': score += 10; break;
    case 'good': score += 5; break;
    case 'fair': score -= 5; break;
    case 'poor': score -= 20; break;
    case 'unknown': score -= 10; break;
  }
  
  return Math.max(0, Math.min(100, score));
};

// Method to calculate project score
clientHealthSchema.methods.calculateProjectScore = function() {
  let score = 100;
  
  // On-time delivery
  score = (score * 0.4) + (this.projectHealth.onTimeDelivery * 0.6);
  
  // Budget adherence
  score = (score * 0.4) + (this.projectHealth.budgetAdherence * 0.6);
  
  // Satisfaction score
  const satisfactionScore = (this.projectHealth.satisfactionScore / 5) * 100;
  score = (score * 0.7) + (satisfactionScore * 0.3);
  
  // Project completion ratio
  const totalProjects = this.projectHealth.activeProjects + this.projectHealth.completedProjects;
  if (totalProjects > 0) {
    const completionRatio = this.projectHealth.completedProjects / totalProjects;
    if (completionRatio > 0.8) score += 10;
    else if (completionRatio < 0.5) score -= 15;
  }
  
  return Math.max(0, Math.min(100, score));
};

// Method to calculate satisfaction score
clientHealthSchema.methods.calculateSatisfactionScore = function() {
  let score = 100;
  
  // Overall satisfaction
  const overallScore = (this.satisfaction.overallScore / 5) * 100;
  score = (score * 0.5) + (overallScore * 0.5);
  
  // NPS score
  const npsScore = (this.satisfaction.npsScore / 10) * 100;
  score = (score * 0.5) + (npsScore * 0.5);
  
  // Recent surveys
  const recentSurveys = this.satisfaction.surveys.filter(s => 
    (new Date() - s.date) < (30 * 24 * 60 * 60 * 1000)
  );
  
  if (recentSurveys.length > 0) {
    const avgSurveyScore = recentSurveys.reduce((sum, s) => sum + s.score, 0) / recentSurveys.length;
    const surveyScore = (avgSurveyScore / 5) * 100;
    score = (score * 0.7) + (surveyScore * 0.3);
  }
  
  // Complaints (reduce score)
  const recentComplaints = this.satisfaction.complaints.filter(c => 
    (new Date() - c.date) < (30 * 24 * 60 * 60 * 1000) && c.status !== 'resolved'
  );
  score -= recentComplaints.length * 10;
  
  return Math.max(0, Math.min(100, score));
};

// Method to assess churn risk
clientHealthSchema.methods.assessChurnRisk = function() {
  const riskFactors = [];
  let riskScore = 0;
  
  // Health score factors
  if (this.healthScore < 40) {
    riskFactors.push({
      factor: 'Low Health Score',
      impact: 8,
      description: `Health score is ${this.healthScore}, indicating poor client health`
    });
    riskScore += 8;
  }
  
  // Engagement factors
  if (this.engagement.lastLogin && (new Date() - this.engagement.lastLogin) > (30 * 24 * 60 * 60 * 1000)) {
    riskFactors.push({
      factor: 'Low Engagement',
      impact: 6,
      description: 'Client has not logged in for over 30 days'
    });
    riskScore += 6;
  }
  
  // Financial factors
  if (this.financial.paymentReliability < 70) {
    riskFactors.push({
      factor: 'Payment Issues',
      impact: 7,
      description: 'Client has poor payment reliability'
    });
    riskScore += 7;
  }
  
  if (this.financial.outstandingAmount > this.financial.totalSpent * 0.2) {
    riskFactors.push({
      factor: 'High Outstanding Amount',
      impact: 5,
      description: 'Client has significant outstanding payments'
    });
    riskScore += 5;
  }
  
  // Project factors
  if (this.projectHealth.satisfactionScore < 3) {
    riskFactors.push({
      factor: 'Low Satisfaction',
      impact: 6,
      description: 'Client satisfaction score is below 3/5'
    });
    riskScore += 6;
  }
  
  // Renewal factors
  if (this.renewal.contractEndDate && this.daysUntilRenewal < 30) {
    riskFactors.push({
      factor: 'Contract Ending Soon',
      impact: 4,
      description: 'Contract expires in less than 30 days'
    });
    riskScore += 4;
  }
  
  if (this.renewal.renewalProbability < 50) {
    riskFactors.push({
      factor: 'Low Renewal Probability',
      impact: 8,
      description: 'Renewal probability is below 50%'
    });
    riskScore += 8;
  }
  
  // Determine risk level
  let riskLevel = 'low';
  if (riskScore >= 20) riskLevel = 'critical';
  else if (riskScore >= 15) riskLevel = 'high';
  else if (riskScore >= 10) riskLevel = 'medium';
  
  this.churnRisk = {
    riskLevel,
    riskScore: Math.min(100, riskScore),
    riskFactors,
    lastAssessment: new Date()
  };
  
  return this.churnRisk;
};

// Method to add alert
clientHealthSchema.methods.addAlert = function(type, severity, message) {
  this.alerts.push({
    type,
    severity,
    message,
    triggeredAt: new Date()
  });
  
  // Keep only last 50 alerts
  if (this.alerts.length > 50) {
    this.alerts = this.alerts.slice(-50);
  }
};

// Method to acknowledge alert
clientHealthSchema.methods.acknowledgeAlert = function(alertId, userId) {
  const alert = this.alerts.id(alertId);
  if (alert) {
    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();
  }
};

// Static method to find high-risk clients
clientHealthSchema.statics.findHighRiskClients = function(orgId) {
  return this.find({
    orgId,
    'churnRisk.riskLevel': { $in: ['high', 'critical'] }
  }).populate('clientId', 'name email').sort({ 'churnRisk.riskScore': -1 });
};

// Static method to find clients needing attention
clientHealthSchema.statics.findClientsNeedingAttention = function(orgId) {
  return this.find({
    orgId,
    $or: [
      { healthScore: { $lt: 50 } },
      { 'churnRisk.riskLevel': { $in: ['medium', 'high', 'critical'] } },
      { 'renewal.contractEndDate': { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } },
      { 'alerts.acknowledged': false }
    ]
  }).populate('clientId', 'name email').sort({ healthScore: 1 });
};

module.exports = mongoose.model('ClientHealth', clientHealthSchema);
