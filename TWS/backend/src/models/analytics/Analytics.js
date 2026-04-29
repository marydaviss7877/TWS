const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  // Workspace/Organization Information
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: false
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: false
  },
  
  // Analytics Type and Category
  type: {
    type: String,
    required: true,
    enum: [
      'workspace', 'board', 'card', 'user', 'project', 'task', 
      'time_tracking', 'performance', 'engagement', 'productivity',
      'system', 'api', 'error', 'security', 'billing'
    ]
  },
  category: {
    type: String,
    required: true,
    enum: [
      'usage', 'performance', 'engagement', 'productivity', 'quality',
      'growth', 'retention', 'conversion', 'efficiency', 'satisfaction'
    ]
  },
  
  // Metric Information
  metricName: {
    type: String,
    required: true
  },
  metricValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  metricUnit: {
    type: String,
    default: 'count'
  },
  
  // Time Period
  period: {
    type: String,
    required: true,
    enum: ['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']
  },
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  
  // Dimensions and Filters
  dimensions: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board'
    },
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Card'
    },
    sprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sprint'
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    location: String,
    device: String,
    browser: String,
    os: String
  },
  
  // Aggregated Data
  aggregatedData: {
    count: {
      type: Number,
      default: 0
    },
    sum: {
      type: Number,
      default: 0
    },
    average: {
      type: Number,
      default: 0
    },
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 0
    },
    median: {
      type: Number,
      default: 0
    },
    percentile95: {
      type: Number,
      default: 0
    },
    standardDeviation: {
      type: Number,
      default: 0
    }
  },
  
  // Trend Analysis
  trend: {
    direction: {
      type: String,
      enum: ['up', 'down', 'stable', 'volatile']
    },
    changePercentage: {
      type: Number,
      default: 0
    },
    changeValue: {
      type: Number,
      default: 0
    },
    previousPeriodValue: {
      type: Number,
      default: 0
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  
  // Benchmarking
  benchmark: {
    industryAverage: {
      type: Number,
      default: 0
    },
    topQuartile: {
      type: Number,
      default: 0
    },
    median: {
      type: Number,
      default: 0
    },
    bottomQuartile: {
      type: Number,
      default: 0
    },
    percentile: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    }
  },
  
  // Goals and Targets
  goals: {
    target: {
      type: Number,
      default: 0
    },
    actual: {
      type: Number,
      default: 0
    },
    achievement: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    status: {
      type: String,
      enum: ['exceeded', 'met', 'below', 'not_set'],
      default: 'not_set'
    }
  },
  
  // Data Quality
  dataQuality: {
    completeness: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    accuracy: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    consistency: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    timeliness: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    }
  },
  
  // Additional Metrics
  additionalMetrics: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Tags and Labels
  tags: [{
    type: String,
    trim: true
  }],
  
  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'deprecated'],
    default: 'active'
  },
  
  // Metadata
  metadata: {
    source: {
      type: String,
      default: 'system'
    },
    version: {
      type: String,
      default: '1.0'
    },
    lastCalculated: {
      type: Date,
      default: Date.now
    },
    calculationMethod: {
      type: String,
      default: 'aggregation'
    },
    rawData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  
  // Notes
  notes: String
}, {
  timestamps: true
});

// Indexes for performance
analyticsSchema.index({ orgId: 1, type: 1, periodStart: -1 });
analyticsSchema.index({ workspaceId: 1, category: 1, periodStart: -1 });
analyticsSchema.index({ tenantId: 1, metricName: 1, periodStart: -1 });
analyticsSchema.index({ period: 1, periodStart: -1 });
analyticsSchema.index({ 'dimensions.userId': 1, periodStart: -1 });
analyticsSchema.index({ status: 1 });

// Compound indexes for common queries
analyticsSchema.index({ orgId: 1, type: 1, category: 1, periodStart: -1 });
analyticsSchema.index({ workspaceId: 1, type: 1, periodStart: -1 });

// Virtual for period duration in days
analyticsSchema.virtual('periodDurationDays').get(function() {
  const diffTime = this.periodEnd - this.periodStart;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for trend status
analyticsSchema.virtual('trendStatus').get(function() {
  if (!this.trend.changePercentage) return 'stable';
  
  const change = Math.abs(this.trend.changePercentage);
  if (change < 5) return 'stable';
  if (change < 20) return 'moderate';
  return 'significant';
});

// Method to calculate trend
analyticsSchema.methods.calculateTrend = function(previousValue) {
  if (!previousValue || previousValue === 0) {
    this.trend = {
      direction: 'stable',
      changePercentage: 0,
      changeValue: 0,
      previousPeriodValue: previousValue || 0,
      confidence: 0
    };
    return this.trend;
  }
  
  const changeValue = this.metricValue - previousValue;
  const changePercentage = (changeValue / previousValue) * 100;
  
  let direction = 'stable';
  if (changePercentage > 5) direction = 'up';
  else if (changePercentage < -5) direction = 'down';
  else if (Math.abs(changePercentage) > 20) direction = 'volatile';
  
  this.trend = {
    direction,
    changePercentage: Math.round(changePercentage * 100) / 100,
    changeValue,
    previousPeriodValue: previousValue,
    confidence: Math.min(100, Math.max(0, 100 - Math.abs(changePercentage)))
  };
  
  return this.trend;
};

// Method to update aggregated data
analyticsSchema.methods.updateAggregatedData = function(values) {
  if (!Array.isArray(values) || values.length === 0) return;
  
  const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
  
  if (numericValues.length === 0) return;
  
  this.aggregatedData = {
    count: numericValues.length,
    sum: numericValues.reduce((sum, val) => sum + val, 0),
    average: numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length,
    min: Math.min(...numericValues),
    max: Math.max(...numericValues),
    median: this.calculateMedian(numericValues),
    percentile95: this.calculatePercentile(numericValues, 95),
    standardDeviation: this.calculateStandardDeviation(numericValues)
  };
};

// Helper method to calculate median
analyticsSchema.methods.calculateMedian = function(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];
};

// Helper method to calculate percentile
analyticsSchema.methods.calculatePercentile = function(values, percentile) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
};

// Helper method to calculate standard deviation
analyticsSchema.methods.calculateStandardDeviation = function(values) {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
};

// Static method to get analytics by type
analyticsSchema.statics.getByType = function(orgId, type, period = 'monthly', limit = 100) {
  const query = { orgId, type, period, status: 'active' };
  
  return this.find(query)
    .sort({ periodStart: -1 })
    .limit(limit)
    .populate('workspaceId', 'name')
    .populate('dimensions.userId', 'fullName email');
};

// Static method to get trend data
analyticsSchema.statics.getTrendData = function(orgId, metricName, periods = 12) {
  return this.find({
    orgId,
    metricName,
    status: 'active'
  })
  .sort({ periodStart: -1 })
  .limit(periods)
  .select('metricValue periodStart periodEnd trend');
};

// Static method to get analytics summary
analyticsSchema.statics.getSummary = function(orgId, periodStart, periodEnd) {
  return this.aggregate([
    {
      $match: {
        orgId: mongoose.Types.ObjectId(orgId),
        periodStart: { $gte: periodStart },
        periodEnd: { $lte: periodEnd },
        status: 'active'
      }
    },
    {
      $group: {
        _id: {
          type: '$type',
          category: '$category'
        },
        totalMetrics: { $sum: 1 },
        averageValue: { $avg: '$metricValue' },
        totalValue: { $sum: '$metricValue' },
        trends: {
          $push: {
            direction: '$trend.direction',
            changePercentage: '$trend.changePercentage'
          }
        }
      }
    },
    {
      $sort: { totalMetrics: -1 }
    }
  ]);
};

module.exports = mongoose.model('Analytics', analyticsSchema);
