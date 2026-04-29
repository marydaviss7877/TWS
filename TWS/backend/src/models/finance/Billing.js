const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  // Tenant Information
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },

  // Subscription Information
  subscriptionPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },
  
  // Billing Details
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  
  // Pricing
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  additionalUsers: {
    type: Number,
    default: 0
  },
  additionalUserPrice: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Payment Information
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'bank_transfer', 'paypal', 'stripe'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  
  // Dates
  billingPeriodStart: {
    type: Date,
    required: true
  },
  billingPeriodEnd: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidAt: Date,
  
  // Invoice Information
  invoiceNumber: {
    type: String,
    unique: true,
    required: true
  },
  invoiceUrl: String,
  
  // Usage Tracking
  usageMetrics: {
    activeUsers: {
      type: Number,
      default: 0
    },
    storageUsed: {
      type: Number,
      default: 0 // in bytes
    },
    apiCalls: {
      type: Number,
      default: 0
    },
    dataTransfer: {
      type: Number,
      default: 0 // in bytes
    }
  },
  
  // Overages
  overages: {
    users: {
      type: Number,
      default: 0
    },
    storage: {
      type: Number,
      default: 0
    },
    apiCalls: {
      type: Number,
      default: 0
    },
    dataTransfer: {
      type: Number,
      default: 0
    }
  },
  
  // Overage Charges
  overageCharges: {
    users: {
      type: Number,
      default: 0
    },
    storage: {
      type: Number,
      default: 0
    },
    apiCalls: {
      type: Number,
      default: 0
    },
    dataTransfer: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  
  // Tax Information
  taxRate: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  
  // Discounts
  discounts: [{
    type: {
      type: String,
      enum: ['percentage', 'fixed_amount']
    },
    value: Number,
    description: String,
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Payment Processing
  paymentProcessor: {
    provider: String,
    transactionId: String,
    processorResponse: mongoose.Schema.Types.Mixed
  },
  
  // Notes and Metadata
  notes: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'cancelled', 'suspended', 'expired'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Indexes for performance
billingSchema.index({ tenantId: 1, billingPeriodStart: -1 });
billingSchema.index({ orgId: 1, status: 1 });
billingSchema.index({ invoiceNumber: 1 });
billingSchema.index({ paymentStatus: 1 });
billingSchema.index({ dueDate: 1 });

// Virtual for total with overages
billingSchema.virtual('totalWithOverages').get(function() {
  return this.totalAmount + (this.overageCharges.total || 0);
});

// Virtual for days until due
billingSchema.virtual('daysUntilDue').get(function() {
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to calculate overages
billingSchema.methods.calculateOverages = function(planLimits) {
  const overages = {
    users: Math.max(0, this.usageMetrics.activeUsers - planLimits.maxUsers),
    storage: Math.max(0, this.usageMetrics.storageUsed - planLimits.maxStorage),
    apiCalls: Math.max(0, this.usageMetrics.apiCalls - planLimits.maxApiCalls),
    dataTransfer: Math.max(0, this.usageMetrics.dataTransfer - planLimits.maxDataTransfer)
  };
  
  this.overages = overages;
  return overages;
};

// Method to calculate overage charges
billingSchema.methods.calculateOverageCharges = function(planPricing) {
  const charges = {
    users: this.overages.users * planPricing.userOveragePrice,
    storage: this.overages.storage * planPricing.storageOveragePrice,
    apiCalls: this.overages.apiCalls * planPricing.apiCallOveragePrice,
    dataTransfer: this.overages.dataTransfer * planPricing.dataTransferOveragePrice
  };
  
  charges.total = Object.values(charges).reduce((sum, charge) => sum + charge, 0);
  
  this.overageCharges = charges;
  return charges;
};

// Static method to find bills by tenant
billingSchema.statics.findByTenant = function(tenantId, includeInactive = false) {
  const query = { tenantId };
  if (!includeInactive) {
    query.status = 'active';
  }
  
  return this.find(query)
    .populate('subscriptionPlan', 'name price')
    .sort({ billingPeriodStart: -1 });
};

// Static method to get billing summary
billingSchema.statics.getBillingSummary = function(tenantId, period = 'current') {
  const now = new Date();
  let startDate, endDate;
  
  switch (period) {
    case 'current':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'last':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }
  
  return this.aggregate([
    {
      $match: {
        tenantId: mongoose.Types.ObjectId(tenantId),
        billingPeriodStart: { $gte: startDate, $lte: endDate },
        status: 'active'
      }
    },
    {
      $group: {
        _id: null,
        totalBills: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        totalOverages: { $sum: '$overageCharges.total' },
        averageAmount: { $avg: '$totalAmount' },
        paidBills: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
        },
        pendingBills: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Billing', billingSchema);
