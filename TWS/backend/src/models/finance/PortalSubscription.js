const mongoose = require('mongoose');

const portalSubscriptionSchema = new mongoose.Schema({
  // Workspace Information
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  
  // Subscription Plan Details
  planName: {
    type: String,
    required: true,
    enum: ['free', 'basic', 'professional', 'enterprise', 'custom']
  },
  
  // Plan Features
  features: {
    maxBoards: {
      type: Number,
      default: 5
    },
    maxCards: {
      type: Number,
      default: 100
    },
    maxMembers: {
      type: Number,
      default: 10
    },
    maxStorage: {
      type: Number,
      default: 1024 * 1024 * 1024 // 1GB in bytes
    },
    maxIntegrations: {
      type: Number,
      default: 3
    },
    advancedAnalytics: {
      type: Boolean,
      default: false
    },
    customFields: {
      type: Boolean,
      default: false
    },
    automation: {
      type: Boolean,
      default: false
    },
    prioritySupport: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: false
    },
    whiteLabeling: {
      type: Boolean,
      default: false
    }
  },
  
  // Pricing
  pricing: {
    monthlyPrice: {
      type: Number,
      default: 0
    },
    yearlyPrice: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    }
  },
  
  // Subscription Status
  status: {
    type: String,
    enum: ['active', 'trial', 'expired', 'cancelled', 'suspended'],
    default: 'trial'
  },
  
  // Trial Information
  trial: {
    isTrial: {
      type: Boolean,
      default: true
    },
    trialStartDate: {
      type: Date,
      default: Date.now
    },
    trialEndDate: {
      type: Date,
      default: function() {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7); // 7-day free trial
        return endDate;
      }
    },
    trialDaysRemaining: {
      type: Number,
      default: 7
    }
  },
  
  // Subscription Dates
  subscriptionStartDate: Date,
  subscriptionEndDate: Date,
  nextBillingDate: Date,
  cancellationDate: Date,
  
  // Usage Tracking
  usage: {
    boardsCreated: {
      type: Number,
      default: 0
    },
    cardsCreated: {
      type: Number,
      default: 0
    },
    membersAdded: {
      type: Number,
      default: 0
    },
    storageUsed: {
      type: Number,
      default: 0 // in bytes
    },
    integrationsUsed: {
      type: Number,
      default: 0
    },
    apiCalls: {
      type: Number,
      default: 0
    }
  },
  
  // Limits and Overages
  limits: {
    boardsLimit: {
      type: Number,
      default: 5
    },
    cardsLimit: {
      type: Number,
      default: 100
    },
    membersLimit: {
      type: Number,
      default: 10
    },
    storageLimit: {
      type: Number,
      default: 1024 * 1024 * 1024 // 1GB in bytes
    },
    integrationsLimit: {
      type: Number,
      default: 3
    },
    apiCallsLimit: {
      type: Number,
      default: 1000
    }
  },
  
  // Payment Information
  payment: {
    method: {
      type: String,
      enum: ['credit_card', 'paypal', 'bank_transfer', 'stripe']
    },
    status: {
      type: String,
      enum: ['active', 'failed', 'cancelled', 'pending']
    },
    lastPaymentDate: Date,
    nextPaymentDate: Date,
    paymentHistory: [{
      date: Date,
      amount: Number,
      status: String,
      transactionId: String
    }]
  },
  
  // Customization
  customization: {
    branding: {
      logo: String,
      primaryColor: String,
      secondaryColor: String
    },
    settings: {
      timezone: {
        type: String,
        default: 'UTC'
      },
      language: {
        type: String,
        default: 'en'
      },
      notifications: {
        email: {
          type: Boolean,
          default: true
        },
        push: {
          type: Boolean,
          default: true
        },
        sms: {
          type: Boolean,
          default: false
        }
      }
    }
  },
  
  // Support and SLA
  support: {
    level: {
      type: String,
      enum: ['basic', 'priority', 'dedicated'],
      default: 'basic'
    },
    responseTime: {
      type: Number,
      default: 24 // hours
    },
    contactMethods: [{
      type: String,
      enum: ['email', 'chat', 'phone', 'ticket']
    }]
  },
  
  // Analytics and Reporting
  analytics: {
    enabled: {
      type: Boolean,
      default: false
    },
    retention: {
      type: Number,
      default: 30 // days
    },
    exportFormats: [{
      type: String,
      enum: ['csv', 'xlsx', 'pdf', 'json']
    }]
  },
  
  // Compliance and Security
  compliance: {
    gdprCompliant: {
      type: Boolean,
      default: true
    },
    soc2Compliant: {
      type: Boolean,
      default: false
    },
    dataEncryption: {
      type: Boolean,
      default: true
    },
    auditLogging: {
      type: Boolean,
      default: true
    }
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Notes
  notes: String
}, {
  timestamps: true
});

// Indexes for performance
portalSubscriptionSchema.index({ workspaceId: 1 });
portalSubscriptionSchema.index({ orgId: 1, status: 1 });
portalSubscriptionSchema.index({ planName: 1 });
portalSubscriptionSchema.index({ status: 1 });
portalSubscriptionSchema.index({ 'trial.trialEndDate': 1 });
portalSubscriptionSchema.index({ nextBillingDate: 1 });

// Virtual for trial status
portalSubscriptionSchema.virtual('isTrialActive').get(function() {
  if (!this.trial.isTrial) return false;
  return new Date() < this.trial.trialEndDate;
});

// Virtual for days remaining in trial
portalSubscriptionSchema.virtual('trialDaysRemaining').get(function() {
  if (!this.trial.isTrial) return 0;
  const now = new Date();
  const endDate = new Date(this.trial.trialEndDate);
  const diffTime = endDate - now;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

// Virtual for storage usage percentage
portalSubscriptionSchema.virtual('storageUsagePercentage').get(function() {
  return this.limits.storageLimit > 0 
    ? Math.round((this.usage.storageUsed / this.limits.storageLimit) * 100)
    : 0;
});

// Method to check if feature is available
portalSubscriptionSchema.methods.hasFeature = function(featureName) {
  return this.features[featureName] === true;
};

// Method to check if limit is exceeded
portalSubscriptionSchema.methods.isLimitExceeded = function(resourceType) {
  const limitKey = `${resourceType}Limit`;
  const usageKey = `${resourceType}Used` || `${resourceType}Created`;
  
  if (!this.limits[limitKey] || !this.usage[usageKey]) return false;
  
  return this.usage[usageKey] >= this.limits[limitKey];
};

// Method to upgrade subscription
portalSubscriptionSchema.methods.upgrade = function(newPlanName, newFeatures) {
  this.planName = newPlanName;
  Object.assign(this.features, newFeatures);
  this.status = 'active';
  this.trial.isTrial = false;
  return this.save();
};

// Method to downgrade subscription
portalSubscriptionSchema.methods.downgrade = function(newPlanName, newFeatures) {
  this.planName = newPlanName;
  Object.assign(this.features, newFeatures);
  return this.save();
};

// Static method to find active subscriptions
portalSubscriptionSchema.statics.findActive = function(orgId) {
  return this.find({
    orgId,
    status: { $in: ['active', 'trial'] }
  }).populate('workspaceId', 'name description');
};

// Static method to get subscription statistics
portalSubscriptionSchema.statics.getStatistics = function(orgId) {
  return this.aggregate([
    {
      $match: { orgId: mongoose.Types.ObjectId(orgId) }
    },
    {
      $group: {
        _id: '$planName',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$pricing.monthlyPrice' },
        averageUsage: {
          $avg: {
            $add: [
              '$usage.boardsCreated',
              '$usage.cardsCreated',
              '$usage.membersAdded'
            ]
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('PortalSubscription', portalSubscriptionSchema);
