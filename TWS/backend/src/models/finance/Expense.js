const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: [
      'food', 'transportation', 'shopping', 'entertainment',
      'utilities', 'housing',
      'business', 'gifts', 'travel', 'other'
    ]
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  description: {
    type: String,
    trim: true
  },
  receipt: {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit', 'debit', 'bank_transfer', 'digital_wallet'],
    default: 'cash'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  // For personal expenses, these fields are optional
  isPersonal: {
    type: Boolean,
    default: true
  },
  // For business expenses
  isBusiness: {
    type: Boolean,
    default: false
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  // Approval workflow
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String,
  // Reimbursement
  reimbursed: {
    type: Boolean,
    default: false
  },
  reimbursedAt: Date,
  reimbursedAmount: Number,
  // Location information
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
    city: String,
    country: String
  },
  // Additional metadata
  notes: String,
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String
  }],
  // Currency support
  currency: {
    type: String,
    default: 'USD'
  },
  exchangeRate: {
    type: Number,
    default: 1
  },
  originalAmount: Number,
  originalCurrency: String,
  // Tax information
  taxAmount: {
    type: Number,
    default: 0
  },
  taxRate: Number,
  // Recurring expenses
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
  },
  recurringEndDate: Date,
  parentExpenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense'
  },
  // Budget tracking
  budgetCategory: String,
  budgetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Budget'
  },
  // Analytics and insights
  merchant: String,
  merchantCategory: String,
  // Privacy settings for personal expenses
  isPrivate: {
    type: Boolean,
    default: true
  },
  // Sharing settings
  sharedWith: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['view', 'edit'],
      default: 'view'
    }
  }],
  // Audit trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Soft delete
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for performance
expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ organizationId: 1, date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ status: 1 });
expenseSchema.index({ isPersonal: 1 });
expenseSchema.index({ isBusiness: 1 });
expenseSchema.index({ projectId: 1 });
expenseSchema.index({ clientId: 1 });
expenseSchema.index({ paymentMethod: 1 });
expenseSchema.index({ amount: 1 });
expenseSchema.index({ createdAt: -1 });

// Compound indexes
expenseSchema.index({ userId: 1, category: 1, date: -1 });
expenseSchema.index({ organizationId: 1, status: 1, date: -1 });
expenseSchema.index({ userId: 1, isPersonal: 1, date: -1 });

// Virtual for formatted amount
expenseSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency || 'USD'
  }).format(this.amount);
});

// Virtual for expense summary
expenseSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    title: this.title,
    amount: this.formattedAmount,
    category: this.category,
    date: this.date,
    status: this.status,
    paymentMethod: this.paymentMethod
  };
});

// Pre-save middleware
expenseSchema.pre('save', function(next) {
  // Set original amount if not set
  if (!this.originalAmount) {
    this.originalAmount = this.amount;
    this.originalCurrency = this.currency;
  }

  // Calculate tax amount if tax rate is provided
  if (this.taxRate && !this.taxAmount) {
    this.taxAmount = this.amount * (this.taxRate / 100);
  }

  // Set organization ID from user if not provided
  if (!this.organizationId && this.userId) {
    // This would need to be populated from the user's organization
    // For now, we'll handle this in the route
  }

  next();
});

// Method to approve expense
expenseSchema.methods.approve = function(approvedBy, notes) {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  if (notes) {
    this.notes = notes;
  }
  return this.save();
};

// Method to reject expense
expenseSchema.methods.reject = function(rejectedBy, reason) {
  this.status = 'rejected';
  this.approvedBy = rejectedBy;
  this.approvedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

// Method to mark as reimbursed
expenseSchema.methods.markReimbursed = function(amount) {
  this.reimbursed = true;
  this.reimbursedAt = new Date();
  this.reimbursedAmount = amount || this.amount;
  return this.save();
};

// Method to duplicate expense (for recurring)
expenseSchema.methods.duplicate = function(newDate) {
  const duplicateData = this.toObject();
  delete duplicateData._id;
  delete duplicateData.createdAt;
  delete duplicateData.updatedAt;
  delete duplicateData.status;
  delete duplicateData.approvedBy;
  delete duplicateData.approvedAt;
  delete duplicateData.reimbursed;
  delete duplicateData.reimbursedAt;
  
  duplicateData.date = newDate;
  duplicateData.parentExpenseId = this._id;
  
  return new Expense(duplicateData);
};

// Static method to get expense statistics
expenseSchema.statics.getStatistics = function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: '$amount' },
        totalCount: { $sum: 1 },
        averageAmount: { $avg: '$amount' },
        categoryBreakdown: {
          $push: {
            category: '$category',
            amount: '$amount'
          }
        },
        statusBreakdown: {
          $push: '$status'
        },
        paymentMethodBreakdown: {
          $push: '$paymentMethod'
        }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to get monthly trends
expenseSchema.statics.getMonthlyTrends = function(userId, months = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  const pipeline = [
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' }
        },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        categories: { $addToSet: '$category' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to get category insights
expenseSchema.statics.getCategoryInsights = function(userId, period = 'month') {
  let startDate;
  const now = new Date();
  
  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  const pipeline = [
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: now }
      }
    },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        averageAmount: { $avg: '$amount' },
        maxAmount: { $max: '$amount' },
        minAmount: { $min: '$amount' }
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to find duplicate expenses
expenseSchema.statics.findDuplicates = function(userId, timeWindow = 24) {
  const timeWindowMs = timeWindow * 60 * 60 * 1000; // Convert hours to milliseconds
  
  return this.find({
    userId,
    createdAt: { $gte: new Date(Date.now() - timeWindowMs) }
  }).sort({ createdAt: -1 });
};

// Static method to get budget vs actual
expenseSchema.statics.getBudgetComparison = function(userId, budgetId) {
  const pipeline = [
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        budgetId: mongoose.Types.ObjectId(budgetId)
      }
    },
    {
      $group: {
        _id: '$budgetCategory',
        actualAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

module.exports = mongoose.model('Expense', expenseSchema);
