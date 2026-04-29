const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  // Plan Information
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  
  // Plan Type and Category
  type: {
    type: String,
    required: true,
    enum: ['free', 'basic', 'starter', 'growth', 'professional', 'enterprise', 'custom'],
    default: 'basic'
  },
  requiresCustomQuote: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    required: true,
    enum: ['individual', 'team', 'organization', 'enterprise'],
    default: 'individual'
  },
  
  // Pricing Structure
  pricing: {
    monthly: {
      type: Number,
      required: false,
      default: null,
      min: 0
    },
    yearly: {
      type: Number,
      required: false,
      default: null,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly', 'lifetime'],
      default: 'monthly'
    },
    setupFee: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      yearlyDiscount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      promotionalDiscount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      promotionalExpiry: Date
    }
  },
  
  // Feature Limits
  limits: {
    users: {
      max: {
        type: Number,
        default: 5
      },
      unlimited: {
        type: Boolean,
        default: false
      }
    },
    projects: {
      max: {
        type: Number,
        default: 10
      },
      unlimited: {
        type: Boolean,
        default: false
      }
    },
    storage: {
      max: {
        type: Number,
        default: 1024 * 1024 * 1024 // 1GB in bytes
      },
      unlimited: {
        type: Boolean,
        default: false
      }
    },
    apiCalls: {
      max: {
        type: Number,
        default: 1000
      },
      unlimited: {
        type: Boolean,
        default: false
      }
    },
    integrations: {
      max: {
        type: Number,
        default: 3
      },
      unlimited: {
        type: Boolean,
        default: false
      }
    },
    customFields: {
      max: {
        type: Number,
        default: 5
      },
      unlimited: {
        type: Boolean,
        default: false
      }
    },
    automation: {
      max: {
        type: Number,
        default: 10
      },
      unlimited: {
        type: Boolean,
        default: false
      }
    },
    workspaces: {
      max: {
        type: Number,
        default: 3
      },
      unlimited: {
        type: Boolean,
        default: false
      }
    },
    clientAccounts: {
      max: {
        type: Number,
        default: 10
      },
      unlimited: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // Feature Flags
  features: {
    // Core Features
    basicProjectManagement: {
      type: Boolean,
      default: true
    },
    taskManagement: {
      type: Boolean,
      default: true
    },
    teamCollaboration: {
      type: Boolean,
      default: true
    },
    fileSharing: {
      type: Boolean,
      default: true
    },
    
    // Advanced Features
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
    integrations: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: false
    },
    webhooks: {
      type: Boolean,
      default: false
    },
    
    // Enterprise Features
    whiteLabeling: {
      type: Boolean,
      default: false
    },
    sso: {
      type: Boolean,
      default: false
    },
    ldap: {
      type: Boolean,
      default: false
    },
    auditLogs: {
      type: Boolean,
      default: false
    },
    dataExport: {
      type: Boolean,
      default: false
    },
    prioritySupport: {
      type: Boolean,
      default: false
    },
    dedicatedSupport: {
      type: Boolean,
      default: false
    },
    sla: {
      type: Boolean,
      default: false
    },
    payroll: {
      type: Boolean,
      default: false
    },
    customRoles: {
      type: Boolean,
      default: false
    },
    reportsAdvanced: {
      type: Boolean,
      default: false
    },
    hrAdvanced: {
      type: Boolean,
      default: false
    }
  },
  
  // Support and SLA
  support: {
    level: {
      type: String,
      enum: ['community', 'email', 'priority', 'dedicated'],
      default: 'email'
    },
    responseTime: {
      type: Number,
      default: 24 // hours
    },
    channels: [{
      type: String,
      enum: ['email', 'chat', 'phone', 'ticket', 'video']
    }],
    businessHours: {
      type: Boolean,
      default: true
    },
    sla: {
      uptime: {
        type: Number,
        default: 99.5 // percentage
      },
      responseTime: {
        type: Number,
        default: 24 // hours
      }
    }
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
    iso27001: {
      type: Boolean,
      default: false
    },
    dataEncryption: {
      type: Boolean,
      default: true
    },
    backupRetention: {
      type: Number,
      default: 30 // days
    }
  },
  
  // Trial and Onboarding
  trial: {
    enabled: {
      type: Boolean,
      default: true
    },
    duration: {
      type: Number,
      default: 7 // days - 7 days free trial for all categories
    },
    features: {
      type: String,
      enum: ['full', 'limited', 'none'],
      default: 'full'
    }
  },
  
  // Plan Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'deprecated', 'archived'],
    default: 'active'
  },
  
  // Plan Hierarchy
  hierarchy: {
    level: {
      type: Number,
      default: 1
    },
    parentPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan'
    },
    childPlans: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan'
    }],
    upgradePath: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan'
    }],
    downgradePath: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan'
    }]
  },
  
  // Metadata
  metadata: {
    tags: [{
      type: String,
      trim: true
    }],
    category: String,
    industry: [{
      type: String,
      enum: ['software_house', 'finance', 'general']
    }],
    targetAudience: [{
      type: String,
      enum: ['startup', 'small_business', 'medium_business', 'enterprise', 'nonprofit']
    }],
    customFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  
  // Analytics and Tracking
  analytics: {
    popularity: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    },
    churnRate: {
      type: Number,
      default: 0
    },
    averageRevenue: {
      type: Number,
      default: 0
    }
  },
  
  // Notes
  notes: String
}, {
  timestamps: true
});

// Indexes for performance
subscriptionPlanSchema.index({ name: 1 });
subscriptionPlanSchema.index({ slug: 1 }, { sparse: true });
subscriptionPlanSchema.index({ type: 1, status: 1 });
subscriptionPlanSchema.index({ category: 1 });
subscriptionPlanSchema.index({ 'pricing.monthly': 1 });
subscriptionPlanSchema.index({ 'pricing.yearly': 1 });
subscriptionPlanSchema.index({ status: 1 });

// Virtual for effective yearly price with discount (null-safe for custom/enterprise)
subscriptionPlanSchema.virtual('effectiveYearlyPrice').get(function() {
  const yearlyPrice = this.pricing?.yearly;
  if (yearlyPrice == null) return null;
  const discount = (this.pricing?.discount?.yearlyDiscount) || 0;
  return yearlyPrice * (1 - discount / 100);
});

// Virtual for monthly equivalent of yearly price (null for custom)
subscriptionPlanSchema.virtual('monthlyEquivalent').get(function() {
  const y = this.effectiveYearlyPrice;
  return y != null ? y / 12 : null;
});

// Virtual for savings percentage (null-safe)
subscriptionPlanSchema.virtual('savingsPercentage').get(function() {
  const monthlyTotal = (this.pricing?.monthly ?? 0) * 12;
  const yearlyPrice = this.effectiveYearlyPrice;
  if (yearlyPrice == null || monthlyTotal <= 0) return 0;
  return monthlyTotal > yearlyPrice ? Math.round(((monthlyTotal - yearlyPrice) / monthlyTotal) * 100) : 0;
});

// Method to check if feature is available
subscriptionPlanSchema.methods.hasFeature = function(featureName) {
  return this.features[featureName] === true;
};

// Method to check if limit is exceeded
subscriptionPlanSchema.methods.isLimitExceeded = function(resourceType, currentUsage) {
  const limit = this.limits[resourceType];
  if (!limit || limit.unlimited) return false;
  
  return currentUsage >= limit.max;
};

// Method to get remaining limit
subscriptionPlanSchema.methods.getRemainingLimit = function(resourceType, currentUsage) {
  const limit = this.limits[resourceType];
  if (!limit || limit.unlimited) return Infinity;
  
  return Math.max(0, limit.max - currentUsage);
};

// Get usage limit for a metric (users, projects, storage, workspaces, clientAccounts, etc.). Returns -1 for unlimited.
subscriptionPlanSchema.methods.getUsageLimit = function(metric) {
  const limit = this.limits[metric];
  if (!limit || limit.unlimited) return -1;
  const max = limit.max;
  return typeof max === 'number' && max >= 0 ? max : -1;
};

// Calculate overage cost for billing/display. Returns 0 until overage pricing is configured.
subscriptionPlanSchema.methods.calculateOverageCost = function(usage, metric) {
  const limit = this.getUsageLimit(metric);
  if (limit === -1) return 0;
  const overage = Math.max(0, usage - limit);
  // No overage rates in schema yet; return 0 to avoid breaking callers
  return 0;
};

// Method to check if plan can be upgraded to target plan
subscriptionPlanSchema.methods.canUpgradeTo = function(targetPlan) {
  return this.hierarchy.upgradePath.includes(targetPlan._id) || 
         targetPlan.hierarchy.level > this.hierarchy.level;
};

// Method to check if plan can be downgraded to target plan
subscriptionPlanSchema.methods.canDowngradeTo = function(targetPlan) {
  return this.hierarchy.downgradePath.includes(targetPlan._id) || 
         targetPlan.hierarchy.level < this.hierarchy.level;
};

// Static method to find plans by type
subscriptionPlanSchema.statics.findByType = function(type, includeInactive = false) {
  const query = { type };
  if (!includeInactive) {
    query.status = 'active';
  }
  
  return this.find(query).sort({ 'pricing.monthly': 1 });
};

// Static method to find plans by category
subscriptionPlanSchema.statics.findByCategory = function(category, includeInactive = false) {
  const query = { category };
  if (!includeInactive) {
    query.status = 'active';
  }
  
  return this.find(query).sort({ 'pricing.monthly': 1 });
};

// Static method to get plan recommendations
subscriptionPlanSchema.statics.getRecommendations = function(userNeeds) {
  const { users, projects, storage, budget } = userNeeds;
  
  return this.find({ status: 'active' })
    .sort({ 'pricing.monthly': 1 })
    .then(plans => {
      return plans.filter(plan => {
        // Filter by budget
        if (budget && plan.pricing.monthly > budget) return false;
        
        // Filter by user needs
        if (users && !plan.limits.users.unlimited && plan.limits.users.max < users) return false;
        if (projects && !plan.limits.projects.unlimited && plan.limits.projects.max < projects) return false;
        if (storage && !plan.limits.storage.unlimited && plan.limits.storage.max < storage) return false;
        
        return true;
      });
    });
};

// Static method to get pricing comparison
subscriptionPlanSchema.statics.getPricingComparison = function() {
  return this.find({ status: 'active' })
    .select('name displayName pricing features limits')
    .sort({ 'pricing.monthly': 1 });
};

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
