const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema({
  // Basic Information
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: String,
  
  // Contact Information
  contactInfo: {
    primaryContact: {
      name: String,
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
      },
      phone: String,
      title: String
    },
    billingContact: {
      name: String,
      email: String,
      phone: String
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: 'US'
      }
    },
    website: String,
    taxId: String
  },
  
  // Business Information
  businessInfo: {
    industry: String,
    companySize: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
      default: '1-10'
    },
    foundedYear: Number,
    businessType: {
      type: String,
      enum: ['agency', 'consultant', 'reseller', 'system_integrator', 'other'],
      default: 'agency'
    },
    specialties: [String],
    certifications: [String]
  },
  
  // Partnership Details
  partnership: {
    type: {
      type: String,
      enum: ['reseller', 'referral', 'strategic', 'technology'],
      default: 'reseller'
    },
    status: {
      type: String,
      enum: ['prospect', 'active', 'suspended', 'terminated', 'inactive'],
      default: 'prospect'
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze'
    },
    startDate: Date,
    endDate: Date,
    contractTerms: {
      contractLength: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly', 'multi_year'],
        default: 'yearly'
      },
      autoRenew: {
        type: Boolean,
        default: true
      },
      terminationNotice: {
        type: Number,
        default: 30 // days
      }
    }
  },
  
  // Commission & Revenue Sharing
  commission: {
    rate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 20 // 20% commission rate
    },
    structure: {
      type: String,
      enum: ['percentage', 'fixed', 'tiered', 'hybrid'],
      default: 'percentage'
    },
    tiers: [{
      minRevenue: Number,
      maxRevenue: Number,
      rate: Number,
      description: String
    }],
    paymentTerms: {
      frequency: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly'],
        default: 'monthly'
      },
      paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'check', 'paypal'],
        default: 'bank_transfer'
      },
      minimumPayout: {
        type: Number,
        default: 100
      }
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    totalCommission: {
      type: Number,
      default: 0
    },
    pendingCommission: {
      type: Number,
      default: 0
    },
    lastPayoutDate: Date,
    nextPayoutDate: Date
  },
  
  // White-label Configuration
  whiteLabel: {
    enabled: {
      type: Boolean,
      default: false
    },
    branding: {
      logo: String,
      primaryColor: {
        type: String,
        default: '#1976d2'
      },
      secondaryColor: {
        type: String,
        default: '#dc004e'
      },
      customDomain: String,
      favicon: String,
      companyName: String,
      tagline: String
    },
    features: {
      removePoweredBy: {
        type: Boolean,
        default: false
      },
      customLoginPage: {
        type: Boolean,
        default: false
      },
      customEmailTemplates: {
        type: Boolean,
        default: false
      },
      customSupportContact: {
        type: Boolean,
        default: false
      }
    },
    support: {
      contactEmail: String,
      contactPhone: String,
      supportHours: String,
      supportLanguage: {
        type: String,
        default: 'en'
      }
    }
  },
  
  // Performance Metrics
  performance: {
    totalTenants: {
      type: Number,
      default: 0
    },
    activeTenants: {
      type: Number,
      default: 0
    },
    monthlyRecurringRevenue: {
      type: Number,
      default: 0
    },
    averageTenantValue: {
      type: Number,
      default: 0
    },
    churnRate: {
      type: Number,
      default: 0
    },
    satisfactionScore: {
      type: Number,
      min: 1,
      max: 5,
      default: 5
    },
    lastActivity: Date,
    conversionRate: {
      type: Number,
      default: 0
    }
  },
  
  // Sales & Marketing
  sales: {
    targetMonthlyRevenue: {
      type: Number,
      default: 0
    },
    actualMonthlyRevenue: {
      type: Number,
      default: 0
    },
    pipeline: [{
      prospectName: String,
      estimatedValue: Number,
      probability: Number,
      expectedCloseDate: Date,
      status: {
        type: String,
        enum: ['prospect', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
        default: 'prospect'
      },
      notes: String
    }],
    marketingMaterials: [{
      name: String,
      type: String,
      url: String,
      lastUpdated: Date
    }]
  },
  
  // Support & Training
  support: {
    supportLevel: {
      type: String,
      enum: ['basic', 'standard', 'premium', 'dedicated'],
      default: 'standard'
    },
    trainingCompleted: [{
      courseName: String,
      completedDate: Date,
      score: Number,
      certificate: String
    }],
    certifications: [{
      name: String,
      issuedDate: Date,
      expiryDate: Date,
      status: {
        type: String,
        enum: ['active', 'expired', 'pending'],
        default: 'active'
      }
    }],
    supportTickets: [{
      ticketId: String,
      subject: String,
      status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        default: 'open'
      },
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      resolvedAt: Date
    }]
  },
  
  // Compliance & Legal
  compliance: {
    agreements: [{
      type: {
        type: String,
        enum: ['partnership', 'nda', 'data_processing', 'service_level'],
        required: true
      },
      version: String,
      signedDate: Date,
      expiryDate: Date,
      status: {
        type: String,
        enum: ['active', 'expired', 'pending'],
        default: 'active'
      },
      documentUrl: String
    }],
    dataProcessing: {
      gdprCompliant: {
        type: Boolean,
        default: false
      },
      dataProcessingAgreement: {
        type: Boolean,
        default: false
      },
      dataRetentionPolicy: String,
      securityMeasures: [String]
    },
    insurance: {
      professionalLiability: {
        type: Boolean,
        default: false
      },
      generalLiability: {
        type: Boolean,
        default: false
      },
      cyberLiability: {
        type: Boolean,
        default: false
      },
      coverageAmount: Number,
      expiryDate: Date
    }
  },
  
  // Notes & Communication
  notes: [{
    note: String,
    type: {
      type: String,
      enum: ['general', 'sales', 'support', 'technical', 'compliance'],
      default: 'general'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupraAdmin'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isPrivate: {
      type: Boolean,
      default: false
    }
  }],
  
  // Communication History
  communications: [{
    type: {
      type: String,
      enum: ['email', 'call', 'meeting', 'support_ticket', 'training'],
      required: true
    },
    subject: String,
    description: String,
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true
    },
    participants: [String],
    date: {
      type: Date,
      default: Date.now
    },
    duration: Number, // in minutes
    outcome: String,
    followUpRequired: {
      type: Boolean,
      default: false
    },
    followUpDate: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupraAdmin'
    }
  }],
  
  // Status & Metadata
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'terminated'],
    default: 'active'
  },
  
  // Created by SupraAdmin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupraAdmin',
    required: true
  },
  
  // Last updated by
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupraAdmin'
  }
}, {
  timestamps: true
});

// Index for performance
partnerSchema.index({ slug: 1 });
partnerSchema.index({ 'partnership.status': 1 });
partnerSchema.index({ 'partnership.type': 1 });
partnerSchema.index({ 'partnership.tier': 1 });
partnerSchema.index({ 'contactInfo.primaryContact.email': 1 });
partnerSchema.index({ createdBy: 1 });
partnerSchema.index({ status: 1 });

// Virtual for commission calculation
partnerSchema.virtual('commissionEarned').get(function() {
  return this.commission.totalCommission + this.commission.pendingCommission;
});

// Virtual for performance score
partnerSchema.virtual('performanceScore').get(function() {
  let score = 0;
  
  // Revenue performance (40% weight)
  if (this.performance.monthlyRecurringRevenue > 0) {
    const revenueScore = Math.min(100, (this.performance.monthlyRecurringRevenue / 10000) * 100);
    score += revenueScore * 0.4;
  }
  
  // Tenant growth (30% weight)
  if (this.performance.totalTenants > 0) {
    const tenantScore = Math.min(100, (this.performance.totalTenants / 10) * 100);
    score += tenantScore * 0.3;
  }
  
  // Satisfaction (20% weight)
  score += this.performance.satisfactionScore * 20;
  
  // Activity (10% weight)
  if (this.performance.lastActivity) {
    const daysSinceActivity = (new Date() - this.performance.lastActivity) / (1000 * 60 * 60 * 24);
    const activityScore = Math.max(0, 100 - daysSinceActivity);
    score += activityScore * 0.1;
  }
  
  return Math.min(100, score);
});

// Method to calculate commission for a sale
partnerSchema.methods.calculateCommission = function(saleAmount) {
  let commissionRate = this.commission.rate;
  
  // Check tiered commission structure
  if (this.commission.structure === 'tiered' && this.commission.tiers.length > 0) {
    const currentRevenue = this.commission.totalRevenue;
    const applicableTier = this.commission.tiers.find(tier => 
      currentRevenue >= tier.minRevenue && 
      (tier.maxRevenue === null || currentRevenue <= tier.maxRevenue)
    );
    
    if (applicableTier) {
      commissionRate = applicableTier.rate;
    }
  }
  
  return (saleAmount * commissionRate) / 100;
};

// Method to add a tenant
partnerSchema.methods.addTenant = function(tenantId) {
  if (!this.tenants) {
    this.tenants = [];
  }
  
  if (!this.tenants.includes(tenantId)) {
    this.tenants.push(tenantId);
    this.performance.totalTenants += 1;
    this.performance.activeTenants += 1;
    this.performance.lastActivity = new Date();
  }
};

// Method to remove a tenant
partnerSchema.methods.removeTenant = function(tenantId) {
  if (this.tenants) {
    const index = this.tenants.indexOf(tenantId);
    if (index > -1) {
      this.tenants.splice(index, 1);
      this.performance.activeTenants = Math.max(0, this.performance.activeTenants - 1);
      this.performance.lastActivity = new Date();
    }
  }
};

// Method to record a sale
partnerSchema.methods.recordSale = function(amount, tenantId) {
  const commission = this.calculateCommission(amount);
  
  this.commission.totalRevenue += amount;
  this.commission.pendingCommission += commission;
  this.performance.monthlyRecurringRevenue += amount;
  this.performance.lastActivity = new Date();
  
  // Update average tenant value
  if (this.performance.totalTenants > 0) {
    this.performance.averageTenantValue = this.commission.totalRevenue / this.performance.totalTenants;
  }
  
  return commission;
};

// Method to process payout
partnerSchema.methods.processPayout = function(amount) {
  this.commission.totalCommission += amount;
  this.commission.pendingCommission = Math.max(0, this.commission.pendingCommission - amount);
  this.commission.lastPayoutDate = new Date();
  
  // Calculate next payout date
  const nextPayout = new Date();
  switch (this.commission.paymentTerms.frequency) {
    case 'monthly':
      nextPayout.setMonth(nextPayout.getMonth() + 1);
      break;
    case 'quarterly':
      nextPayout.setMonth(nextPayout.getMonth() + 3);
      break;
    case 'yearly':
      nextPayout.setFullYear(nextPayout.getFullYear() + 1);
      break;
  }
  this.commission.nextPayoutDate = nextPayout;
};

// Static method to get partners by status
partnerSchema.statics.getByStatus = function(status) {
  return this.find({ 'partnership.status': status }).sort({ createdAt: -1 });
};

// Static method to get top performing partners
partnerSchema.statics.getTopPerformers = function(limit = 10) {
  return this.find({ status: 'active' })
    .sort({ 'performance.monthlyRecurringRevenue': -1 })
    .limit(limit);
};

// Static method to get partners needing attention
partnerSchema.statics.getNeedingAttention = function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  return this.find({
    status: 'active',
    $or: [
      { 'performance.lastActivity': { $lt: thirtyDaysAgo } },
      { 'performance.satisfactionScore': { $lt: 3 } },
      { 'performance.churnRate': { $gt: 10 } }
    ]
  });
};

module.exports = mongoose.model('Partner', partnerSchema);
