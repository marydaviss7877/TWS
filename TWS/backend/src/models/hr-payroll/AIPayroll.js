const mongoose = require('mongoose');

/**
 * AI Payroll Configuration Schema
 */
const AIPayrollConfigSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  enabled: {
    type: Boolean,
    default: false
  },
  autoProcessing: {
    type: Boolean,
    default: false
  },
  aiModel: {
    type: String,
    enum: ['gpt-4', 'claude', 'custom'],
    default: 'gpt-4'
  },
  confidenceThreshold: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.8
  },
  rules: [{
    type: {
      type: String,
      enum: ['overtime', 'bonus', 'deduction', 'tax', 'benefits'],
      required: true
    },
    condition: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true
    },
    enabled: {
      type: Boolean,
      default: true
    }
  }],
  settings: {
    autoApprove: {
      type: Boolean,
      default: false
    },
    requireReview: {
      type: Boolean,
      default: true
    },
    notificationEnabled: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

/**
 * AI Payroll Analytics Schema
 */
const AIPayrollAnalyticsSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  period: {
    start: Date,
    end: Date
  },
  metrics: {
    totalProcessed: {
      type: Number,
      default: 0
    },
    autoApproved: {
      type: Number,
      default: 0
    },
    manualReview: {
      type: Number,
      default: 0
    },
    accuracy: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    processingTime: {
      average: Number,
      total: Number
    }
  },
  insights: [{
    type: {
      type: String,
      enum: ['anomaly', 'trend', 'recommendation', 'warning'],
      required: true
    },
    description: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    data: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

/**
 * Smart Payroll Processing Schema
 */
const SmartPayrollProcessingSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  payrollCycleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PayrollCycle',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'review_required'],
    default: 'pending'
  },
  aiAnalysis: {
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    anomalies: [{
      type: String,
      description: String,
      severity: String
    }],
    recommendations: [{
      type: String,
      description: String,
      impact: String
    }]
  },
  processingLog: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    action: String,
    details: String,
    status: String
  }],
  result: {
    grossPay: Number,
    deductions: Number,
    netPay: Number,
    breakdown: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

/**
 * Employee AI Insights Schema
 */
const EmployeeAIInsightsSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  insights: [{
    category: {
      type: String,
      enum: ['performance', 'attendance', 'compensation', 'behavior', 'productivity'],
      required: true
    },
    insight: String,
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    impact: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: 'neutral'
    },
    recommendations: [String],
    data: mongoose.Schema.Types.Mixed
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create models
const AIPayrollConfig = mongoose.model('AIPayrollConfig', AIPayrollConfigSchema);
const AIPayrollAnalytics = mongoose.model('AIPayrollAnalytics', AIPayrollAnalyticsSchema);
const SmartPayrollProcessing = mongoose.model('SmartPayrollProcessing', SmartPayrollProcessingSchema);
const EmployeeAIInsights = mongoose.model('EmployeeAIInsights', EmployeeAIInsightsSchema);

module.exports = {
  AIPayrollConfig,
  AIPayrollAnalytics,
  SmartPayrollProcessing,
  EmployeeAIInsights
};
