const mongoose = require('mongoose');

// Chart of Accounts Schema
const chartOfAccountsSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
    required: true
  },
  parentAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccounts'
  },
  level: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: String,
  tags: [String],
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});

// Add indexes for Chart of Accounts
chartOfAccountsSchema.index({ orgId: 1, code: 1 }, { unique: true });
chartOfAccountsSchema.index({ orgId: 1, type: 1, isActive: 1 });
chartOfAccountsSchema.index({ orgId: 1, parentAccount: 1 });

// General Ledger Entry Schema
const journalEntrySchema = new mongoose.Schema({
  entryNumber: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  description: {
    type: String,
    required: true
  },
  reference: String,
  entries: [{
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccounts',
      required: true
    },
    debit: {
      type: Number,
      default: 0
    },
    credit: {
      type: Number,
      default: 0
    },
    description: String
  }],
  totalDebit: {
    type: Number,
    required: true
  },
  totalCredit: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'posted', 'reversed'],
    default: 'draft'
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  postedAt: Date,
  relatedProjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  relatedInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});

// Enhanced Transaction Schema for Finance Ecosystem
const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['expense', 'revenue', 'investment', 'transfer', 'loan', 'payroll', 'billing'],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  subcategory: String,
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  description: {
    type: String,
    required: true
  },
  reference: String,
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccounts'
  },
  tags: [String],
  relatedInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  relatedProjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  relatedTimeEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeEntry'
  },
  vendor: {
    name: String,
    contact: String,
    email: String,
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor'
    }
  },
  client: {
    name: String,
    contact: String,
    email: String,
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client'
    }
  },
  attachments: [{
    fileId: String,
    fileName: String,
    fileUrl: String
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid', 'reconciled'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  recurring: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
    },
    endDate: Date
  },
  taxDeductible: {
    type: Boolean,
    default: false
  },
  exchangeRate: Number,
  bankReconciliation: {
    reconciled: {
      type: Boolean,
      default: false
    },
    reconciledAt: Date,
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    bankTransactionId: String
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});

// Legacy Account Schema (keeping for backward compatibility)
const accountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  parentAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  },
  balance: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  active: {
    type: Boolean,
    default: true
  },
  description: String
}, {
  timestamps: true
});

// Vendor Schema for Accounts Payable
const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: String,
  phone: String,
  company: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  contactPerson: String,
  taxId: String,
  paymentTerms: {
    type: String,
    enum: ['net_15', 'net_30', 'net_45', 'net_60', 'due_on_receipt'],
    default: 'net_30'
  },
  defaultAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccounts'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  notes: String,
  tags: [String],
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});

// Bill Schema for Accounts Payable
const billSchema = new mongoose.Schema({
  billNumber: {
    type: String,
    required: true,
    unique: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  vendorName: String,
  vendorEmail: String,
  billDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    total: Number,
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccounts'
    }
  }],
  subtotal: Number,
  taxAmount: Number,
  total: Number,
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  paymentTerms: String,
  notes: String,
  attachments: [{
    fileId: String,
    fileName: String,
    fileUrl: String
  }],
  paidAt: Date,
  paymentMethod: String,
  paidAmount: Number,
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});

// Project Costing Schema
const projectCostingSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  budget: {
    total: Number,
    hourly: Number,
    fixed: Number,
    contingency: Number
  },
  actualCosts: {
    labor: Number,
    materials: Number,
    overhead: Number,
    total: Number
  },
  timeEntries: [{
    timeEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimeEntry'
    },
    hours: Number,
    rate: Number,
    cost: Number
  }],
  expenses: [{
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    amount: Number,
    category: String
  }],
  profitability: {
    grossMargin: Number,
    netMargin: Number,
    marginPercentage: Number
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'completed', 'cancelled'],
    default: 'planning'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});

// Cash Flow Forecast Schema
const cashFlowForecastSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  period: {
    start: Date,
    end: Date
  },
  forecastType: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  scenarios: [{
    name: String,
    probability: Number,
    inflows: [{
      date: Date,
      amount: Number,
      description: String,
      category: String
    }],
    outflows: [{
      date: Date,
      amount: Number,
      description: String,
      category: String
    }],
    netCashFlow: Number,
    cumulativeCashFlow: Number
  }],
  assumptions: [{
    category: String,
    description: String,
    value: Number,
    unit: String
  }],
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});


// Enhanced Invoice Schema for Accounts Receivable
const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  clientName: String,
  clientEmail: String,
  clientAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  issueDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    total: Number,
    taxRate: Number,
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    timeEntryIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimeEntry'
    }]
  }],
  subtotal: Number,
  taxAmount: Number,
  total: Number,
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'partially_paid'],
    default: 'draft'
  },
  paymentTerms: {
    type: String,
    enum: ['net_15', 'net_30', 'net_45', 'net_60', 'due_on_receipt'],
    default: 'net_30'
  },
  notes: String,
  attachments: [{
    fileId: String,
    fileName: String,
    fileUrl: String
  }],
  paidAt: Date,
  paymentMethod: String,
  paidAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: Number,
  billingType: {
    type: String,
    enum: ['time_materials', 'fixed_price', 'milestone', 'retainer', 'subscription'],
    default: 'time_materials'
  },
  recurring: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly']
    },
    nextBillingDate: Date
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});

// Enhanced Client Schema
const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: String,
  phone: String,
  company: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  contactPerson: String,
  taxId: String,
  paymentTerms: {
    type: String,
    enum: ['net_15', 'net_30', 'net_45', 'net_60', 'due_on_receipt'],
    default: 'net_30'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'prospect'],
    default: 'active'
  },
  notes: String,
  tags: [String],
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  defaultHourlyRate: Number,
  currency: {
    type: String,
    default: 'USD'
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});

// Time Entry Schema for Project Costing
const timeEntrySchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    index: true
  },
  sprintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sprint',
    index: true
  },
  milestoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Milestone',
    index: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  category: {
    type: String,
    enum: ['development', 'testing', 'documentation', 'configuration', 'support', 'optimization', 'other'],
    default: 'development'
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  hours: {
    type: Number,
    required: true,
    min: 0,
    max: 24
  },
  description: String,
  task: String, // Task name for quick reference
  hourlyRate: {
    type: Number,
    default: 0,
    min: 0
  },
  billable: {
    type: Boolean,
    default: true
  },
  billableHours: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected', 'billed', 'invoiced'],
    default: 'draft',
    index: true
  },
  tags: [String], // For taskId storage: "task:taskId"
  // Timer tracking
  timer: {
    startedAt: Date,
    stoppedAt: Date,
    isRunning: { type: Boolean, default: false }
  },
  // Approval workflow
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,
  rejectionReason: String,
  // Billing integration
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  invoiceLineItemId: String,
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Virtual for calculated amount
timeEntrySchema.virtual('amount').get(function() {
  return this.hours * this.hourlyRate;
});

// Method to calculate billable hours
timeEntrySchema.methods.calculateBillableHours = function() {
  this.billableHours = this.billable ? this.hours : 0;
  return this.billableHours;
};

// Financial KPI Schema for Dashboard
const financialKpiSchema = new mongoose.Schema({
  period: {
    start: Date,
    end: Date
  },
  metrics: {
    revenue: {
      total: Number,
      recurring: Number,
      oneTime: Number,
      growth: Number
    },
    expenses: {
      total: Number,
      payroll: Number,
      overhead: Number,
      growth: Number
    },
    profitability: {
      grossMargin: Number,
      netMargin: Number,
      ebitda: Number
    },
    cashFlow: {
      operating: Number,
      investing: Number,
      financing: Number,
      net: Number
    },
    utilization: {
      billable: Number,
      overall: Number,
      target: Number
    },
    projectMetrics: {
      activeProjects: Number,
      completedProjects: Number,
      averageMargin: Number,
      onTimeDelivery: Number
    }
  },
  lastCalculated: {
    type: Date,
    default: Date.now
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for performance
transactionSchema.index({ type: 1, date: 1 });
transactionSchema.index({ category: 1 });
transactionSchema.index({ accountId: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ orgId: 1 });

chartOfAccountsSchema.index({ code: 1 });
chartOfAccountsSchema.index({ type: 1 });
chartOfAccountsSchema.index({ orgId: 1 });

journalEntrySchema.index({ entryNumber: 1 });
journalEntrySchema.index({ date: 1 });
journalEntrySchema.index({ status: 1 });
journalEntrySchema.index({ orgId: 1 });

accountSchema.index({ code: 1 });
accountSchema.index({ type: 1 });

invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ clientId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ orgId: 1 });

billSchema.index({ billNumber: 1 });
billSchema.index({ vendorId: 1 });
billSchema.index({ status: 1 });
billSchema.index({ dueDate: 1 });
billSchema.index({ orgId: 1 });

vendorSchema.index({ name: 1 });
vendorSchema.index({ email: 1 });
vendorSchema.index({ status: 1 });
vendorSchema.index({ orgId: 1 });

projectCostingSchema.index({ projectId: 1 });
projectCostingSchema.index({ clientId: 1 });
projectCostingSchema.index({ status: 1 });
projectCostingSchema.index({ orgId: 1 });

cashFlowForecastSchema.index({ name: 1 });
cashFlowForecastSchema.index({ period: 1 });
cashFlowForecastSchema.index({ status: 1 });
cashFlowForecastSchema.index({ orgId: 1 });

clientSchema.index({ name: 1 });
clientSchema.index({ email: 1 });
clientSchema.index({ status: 1 });
clientSchema.index({ orgId: 1 });

// Enhanced indexes for time entries
timeEntrySchema.index({ orgId: 1, date: -1 });
timeEntrySchema.index({ orgId: 1, projectId: 1, date: -1 });
timeEntrySchema.index({ orgId: 1, employeeId: 1, date: -1 });
timeEntrySchema.index({ orgId: 1, status: 1, date: -1 });
timeEntrySchema.index({ orgId: 1, billable: 1, status: { $ne: 'invoiced' } });
timeEntrySchema.index({ employeeId: 1, date: 1 }); // Legacy index for backward compatibility

financialKpiSchema.index({ period: 1 });
financialKpiSchema.index({ orgId: 1 });

module.exports = {
  // Core Finance Models
  Transaction: mongoose.model('Transaction', transactionSchema),
  ChartOfAccounts: mongoose.model('ChartOfAccounts', chartOfAccountsSchema),
  JournalEntry: mongoose.model('JournalEntry', journalEntrySchema),
  
  // Legacy Models (for backward compatibility)
  Account: mongoose.model('Account', accountSchema),
  
  // Accounts Receivable
  Invoice: mongoose.model('Invoice', invoiceSchema),
  Client: mongoose.model('Client', clientSchema),
  
  // Accounts Payable
  Vendor: mongoose.model('Vendor', vendorSchema),
  Bill: mongoose.model('Bill', billSchema),
  
  // Project Costing & Time Tracking
  ProjectCosting: mongoose.model('ProjectCosting', projectCostingSchema),
  TimeEntry: mongoose.model('TimeEntry', timeEntrySchema),
  
  // Forecasting
  CashFlowForecast: mongoose.model('CashFlowForecast', cashFlowForecastSchema),

  // Analytics & KPIs
  FinancialKPI: mongoose.model('FinancialKPI', financialKpiSchema)
};
