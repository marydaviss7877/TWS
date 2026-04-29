const express = require('express');
const { body, query } = require('express-validator');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const ValidationMiddleware = require('../../../middleware/validation/validation');

// UPR Phase 1.4 + 4.2: finance uses requireErpAccess with checkRevocation on sensitive routes
const financeRead = requireErpAccess({ module: 'finance', action: 'read', checkRevocation: true, sensitive: true, auditResourceType: 'finance' });
const financeWrite = requireErpAccess({ module: 'finance', action: 'write', checkRevocation: true, sensitive: true, auditResourceType: 'finance' });
const { 
  Transaction, 
  ChartOfAccounts, 
  JournalEntry,
  Account, 
  Invoice,
  Client,
  Vendor,
  Bill,
  ProjectCosting,
  TimeEntry,
  CashFlowForecast,
  FinancialKPI
} = require('../../../models/finance/Finance');
const { PayrollRecord } = require('../../../models/hr-payroll/Payroll');
const Project = require('../../../models/project-delivery/Project');
const FinanceDashboardService = require('../../../services/financeDashboardService');
const FinanceExportService = require('../../../services/financeExportService');

const router = express.Router();

const getOrgId = (req) => req.user?.orgId;

// Get transactions
router.get('/', [
  financeRead,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['expense', 'revenue', 'investment', 'transfer', 'loan']),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = { orgId: getOrgId(req) };
  if (req.query.type) filter.type = req.query.type;
  
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }

  const transactions = await Transaction.find(filter)
    .populate('accountId', 'name code')
    .skip(skip)
    .limit(limit)
    .sort({ date: -1 });

  const total = await Transaction.countDocuments(filter);

  res.json({
    success: true,
    data: {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// Create transaction
router.post('/', [
  financeWrite,
  body('type').isIn(['expense', 'revenue', 'investment', 'transfer', 'loan']),
  body('category').notEmpty().trim(),
  body('amount').isNumeric(),
  body('description').notEmpty().trim(),
  body('date').optional().isISO8601(),
  body('accountId').optional().isMongoId()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const transaction = new Transaction({ ...req.body, orgId: getOrgId(req) });
  await transaction.save();

  res.status(201).json({
    success: true,
    message: 'Transaction created successfully',
    data: { transaction }
  });
}));

// Get accounts
router.get('/accounts', financeRead, ErrorHandler.asyncHandler(async (req, res) => {
  const accounts = await Account.find({ active: true, orgId: getOrgId(req) }).sort({ code: 1 });

  res.json({
    success: true,
    data: { accounts }
  });
}));

// Create account
router.post('/accounts', [
  financeWrite,
  body('name').notEmpty().trim(),
  body('type').isIn(['asset', 'liability', 'equity', 'revenue', 'expense']),
  body('code').notEmpty().trim()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const account = new Account({ ...req.body, orgId: getOrgId(req) });
  await account.save();

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: { account }
  });
}));

// Get invoices
router.get('/invoices', [
  financeRead,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = { orgId: getOrgId(req) };
  if (req.query.status) filter.status = req.query.status;

  const invoices = await Invoice.find(filter)
    .populate('clientId', 'name email')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await Invoice.countDocuments(filter);

  res.json({
    success: true,
    data: {
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// Create invoice
router.post('/invoices', [
  financeWrite,
  body('clientName').notEmpty().trim(),
  body('clientEmail').isEmail(),
  body('issueDate').isISO8601(),
  body('dueDate').isISO8601(),
  body('items').isArray(),
  body('subtotal').isNumeric(),
  body('taxAmount').isNumeric(),
  body('total').isNumeric()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { items, subtotal, taxAmount, total, ...invoiceData } = req.body;

  // Generate invoice number
  const lastInvoice = await Invoice.findOne({ orgId: getOrgId(req) }).sort({ invoiceNumber: -1 });
  const lastNumber = lastInvoice ? parseInt(lastInvoice.invoiceNumber.split('-')[1]) : 0;
  const invoiceNumber = `INV-${String(lastNumber + 1).padStart(4, '0')}`;

  const invoice = new Invoice({
    ...invoiceData,
    invoiceNumber,
    items,
    subtotal,
    taxAmount,
    total,
    orgId: getOrgId(req)
  });

  await invoice.save();

  res.status(201).json({
    success: true,
    message: 'Invoice created successfully',
    data: { invoice }
  });
}));

// Get financial reports
router.get('/reports/pnl', [
  financeRead,
  query('start').isISO8601(),
  query('end').isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { start, end } = req.query;

  const revenue = await Transaction.aggregate([
    {
      $match: {
        type: 'revenue',
        date: { $gte: new Date(start), $lte: new Date(end) },
        orgId: getOrgId(req)
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);

  const expenses = await Transaction.aggregate([
    {
      $match: {
        type: 'expense',
        date: { $gte: new Date(start), $lte: new Date(end) },
        orgId: getOrgId(req)
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);

  const totalRevenue = revenue[0]?.total || 0;
  const totalExpenses = expenses[0]?.total || 0;
  const netIncome = totalRevenue - totalExpenses;

  res.json({
    success: true,
    data: {
      period: { start, end },
      revenue: totalRevenue,
      expenses: totalExpenses,
      netIncome
    }
  });
}));

// ==================== CHART OF ACCOUNTS ROUTES ====================

// Get chart of accounts
router.get('/chart-of-accounts', [
  financeRead,
  query('type').optional().isIn(['asset', 'liability', 'equity', 'revenue', 'expense']),
  query('level').optional().isInt({ min: 1, max: 5 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const filter = { orgId: req.user.orgId };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.level) filter.level = req.query.level;

  const accounts = await ChartOfAccounts.find(filter)
    .populate('parentAccount', 'name code')
    .sort({ code: 1 });

  res.json({
    success: true,
    data: { accounts }
  });
}));

// Create chart of accounts entry
router.post('/chart-of-accounts', [
  financeWrite,
  body('code').notEmpty().trim(),
  body('name').notEmpty().trim(),
  body('type').isIn(['asset', 'liability', 'equity', 'revenue', 'expense']),
  body('parentAccount').optional().isMongoId(),
  body('level').optional().isInt({ min: 1, max: 5 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const account = new ChartOfAccounts({
    ...req.body,
    orgId: req.user.orgId
  });
  await account.save();

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: { account }
  });
}));

// ==================== JOURNAL ENTRIES ROUTES ====================

// Get journal entries
router.get('/journal-entries', [
  financeRead,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['draft', 'posted', 'reversed']),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = { orgId: req.user.orgId };
  if (req.query.status) filter.status = req.query.status;
  
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }

  const entries = await JournalEntry.find(filter)
    .populate('entries.accountId', 'name code type')
    .populate('postedBy', 'fullName email')
    .skip(skip)
    .limit(limit)
    .sort({ date: -1 });

  const total = await JournalEntry.countDocuments(filter);

  res.json({
    success: true,
    data: {
      entries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// Create journal entry
router.post('/journal-entries', [
  financeWrite,
  body('description').notEmpty().trim(),
  body('entries').isArray({ min: 2 }),
  body('entries.*.accountId').isMongoId(),
  body('entries.*.debit').optional().isNumeric(),
  body('entries.*.credit').optional().isNumeric(),
  body('date').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { entries, ...entryData } = req.body;
  
  // Validate debits equal credits
  const totalDebit = entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
  const totalCredit = entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return res.status(400).json({
      success: false,
      message: 'Total debits must equal total credits'
    });
  }

  // Generate entry number
  const lastEntry = await JournalEntry.findOne({ orgId: req.user.orgId }).sort({ entryNumber: -1 });
  const lastNumber = lastEntry ? parseInt(lastEntry.entryNumber.split('-')[1]) : 0;
  const entryNumber = `JE-${String(lastNumber + 1).padStart(4, '0')}`;

  const journalEntry = new JournalEntry({
    ...entryData,
    entryNumber,
    entries,
    totalDebit,
    totalCredit,
    orgId: req.user.orgId
  });

  await journalEntry.save();

  res.status(201).json({
    success: true,
    message: 'Journal entry created successfully',
    data: { journalEntry }
  });
}));

// ==================== PROJECT COSTING ROUTES ====================

// Get project profitability
router.get('/project-costing/:projectId', [
  financeRead
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const projectCosting = await ProjectCosting.findOne({
    projectId: req.params.projectId,
    orgId: req.user.orgId
  })
    .populate('projectId', 'name status')
    .populate('clientId', 'name email')
    .populate('timeEntries.timeEntryId')
    .populate('expenses.expenseId');

  if (!projectCosting) {
    return res.status(404).json({
      success: false,
      message: 'Project costing not found'
    });
  }

  res.json({
    success: true,
    data: { projectCosting }
  });
}));

// Update project costing
router.put('/project-costing/:projectId', [
  financeWrite,
  body('budget').optional().isObject(),
  body('actualCosts').optional().isObject()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const projectCosting = await ProjectCosting.findOneAndUpdate(
    { projectId: req.params.projectId, orgId: req.user.orgId },
    { 
      ...req.body,
      lastUpdated: new Date()
    },
    { new: true, upsert: true }
  );

  res.json({
    success: true,
    message: 'Project costing updated successfully',
    data: { projectCosting }
  });
}));

// ==================== TIME ENTRIES ROUTES ====================

// Get time entries
router.get('/time-entries', [
  financeRead,
  query('projectId').optional().isMongoId(),
  query('clientId').optional().isMongoId(),
  query('employeeId').optional().isMongoId(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('status').optional().isIn(['draft', 'submitted', 'approved', 'billed'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const filter = { orgId: req.user.orgId };
  
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.query.clientId) filter.clientId = req.query.clientId;
  if (req.query.employeeId) filter.employeeId = req.query.employeeId;
  if (req.query.status) filter.status = req.query.status;
  
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }

  const timeEntries = await TimeEntry.find(filter)
    .populate('employeeId', 'fullName email')
    .populate('projectId', 'name status')
    .populate('clientId', 'name email')
    .populate('approvedBy', 'fullName email')
    .sort({ date: -1 });

  res.json({
    success: true,
    data: { timeEntries }
  });
}));

// Create time entry
router.post('/time-entries', [
  financeWrite,
  body('employeeId').isMongoId(),
  body('projectId').isMongoId(),
  body('clientId').isMongoId(),
  body('date').isISO8601(),
  body('hours').isNumeric({ min: 0 }),
  body('description').notEmpty().trim(),
  body('hourlyRate').optional().isNumeric()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const timeEntry = new TimeEntry({
    ...req.body,
    orgId: req.user.orgId
  });

  await timeEntry.save();

  res.status(201).json({
    success: true,
    message: 'Time entry created successfully',
    data: { timeEntry }
  });
}));

// ==================== VENDORS & BILLS ROUTES ====================

// Get vendors
router.get('/vendors', [
  financeRead,
  query('status').optional().isIn(['active', 'inactive', 'suspended'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const filter = { orgId: req.user.orgId };
  if (req.query.status) filter.status = req.query.status;

  const vendors = await Vendor.find(filter)
    .populate('defaultAccountId', 'name code')
    .sort({ name: 1 });

  res.json({
    success: true,
    data: { vendors }
  });
}));

// Create vendor
router.post('/vendors', [
  financeWrite,
  body('name').notEmpty().trim(),
  body('email').optional().isEmail(),
  body('paymentTerms').optional().isIn(['net_15', 'net_30', 'net_45', 'net_60', 'due_on_receipt'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const vendor = new Vendor({
    ...req.body,
    orgId: req.user.orgId
  });

  await vendor.save();

  res.status(201).json({
    success: true,
    message: 'Vendor created successfully',
    data: { vendor }
  });
}));

// Get bills
router.get('/bills', [
  financeRead,
  query('vendorId').optional().isMongoId(),
  query('status').optional().isIn(['draft', 'pending_approval', 'approved', 'paid', 'overdue', 'cancelled']),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const filter = { orgId: req.user.orgId };
  
  if (req.query.vendorId) filter.vendorId = req.query.vendorId;
  if (req.query.status) filter.status = req.query.status;
  
  if (req.query.from || req.query.to) {
    filter.dueDate = {};
    if (req.query.from) filter.dueDate.$gte = new Date(req.query.from);
    if (req.query.to) filter.dueDate.$lte = new Date(req.query.to);
  }

  const bills = await Bill.find(filter)
    .populate('vendorId', 'name email')
    .sort({ dueDate: 1 });

  res.json({
    success: true,
    data: { bills }
  });
}));

// Create bill
router.post('/bills', [
  financeWrite,
  body('vendorId').isMongoId(),
  body('billDate').isISO8601(),
  body('dueDate').isISO8601(),
  body('items').isArray({ min: 1 }),
  body('subtotal').isNumeric(),
  body('taxAmount').isNumeric(),
  body('total').isNumeric()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { items, ...billData } = req.body;

  // Generate bill number
  const lastBill = await Bill.findOne({ orgId: req.user.orgId }).sort({ billNumber: -1 });
  const lastNumber = lastBill ? parseInt(lastBill.billNumber.split('-')[1]) : 0;
  const billNumber = `BILL-${String(lastNumber + 1).padStart(4, '0')}`;

  const bill = new Bill({
    ...billData,
    billNumber,
    items,
    orgId: req.user.orgId
  });

  await bill.save();

  res.status(201).json({
    success: true,
    message: 'Bill created successfully',
    data: { bill }
  });
}));

// ==================== CASH FLOW FORECASTING ROUTES ====================

// Get cash flow forecasts
router.get('/cash-flow-forecasts', [
  financeRead,
  query('status').optional().isIn(['draft', 'active', 'archived'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const filter = { orgId: req.user.orgId };
  if (req.query.status) filter.status = req.query.status;

  const forecasts = await CashFlowForecast.find(filter)
    .populate('createdBy', 'fullName email')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: { forecasts }
  });
}));

// Create cash flow forecast
router.post('/cash-flow-forecasts', [
  financeWrite,
  body('name').notEmpty().trim(),
  body('period.start').isISO8601(),
  body('period.end').isISO8601(),
  body('forecastType').isIn(['monthly', 'quarterly', 'yearly']),
  body('scenarios').isArray({ min: 1 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const forecast = new CashFlowForecast({
    ...req.body,
    createdBy: req.user._id,
    orgId: req.user.orgId
  });

  await forecast.save();

  res.status(201).json({
    success: true,
    message: 'Cash flow forecast created successfully',
    data: { forecast }
  });
}));

// ==================== FINANCIAL KPIs ROUTES ====================

// Get financial KPIs
router.get('/kpis', [
  financeRead,
  query('period').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const filter = { orgId: req.user.orgId };
  
  if (req.query.period) {
    const period = new Date(req.query.period);
    const startOfMonth = new Date(period.getFullYear(), period.getMonth(), 1);
    const endOfMonth = new Date(period.getFullYear(), period.getMonth() + 1, 0);
    
    filter['period.start'] = startOfMonth;
    filter['period.end'] = endOfMonth;
  }

  const kpis = await FinancialKPI.find(filter)
    .sort({ 'period.start': -1 })
    .limit(1);

  res.json({
    success: true,
    data: { kpis: kpis[0] || null }
  });
}));

// Calculate and update financial KPIs
router.post('/kpis/calculate', [
  financeWrite,
  body('period.start').isISO8601(),
  body('period.end').isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { period } = req.body;
  
  // Calculate revenue metrics
  const revenueData = await Transaction.aggregate([
    {
      $match: {
        type: 'revenue',
        date: { $gte: new Date(period.start), $lte: new Date(period.end) },
        orgId: req.user.orgId
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);

  // Calculate expense metrics
  const expenseData = await Transaction.aggregate([
    {
      $match: {
        type: 'expense',
        date: { $gte: new Date(period.start), $lte: new Date(period.end) },
        orgId: req.user.orgId
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);

  // Calculate utilization metrics
  const timeData = await TimeEntry.aggregate([
    {
      $match: {
        date: { $gte: new Date(period.start), $lte: new Date(period.end) },
        orgId: req.user.orgId
      }
    },
    {
      $group: {
        _id: null,
        totalHours: { $sum: '$hours' },
        billableHours: { 
          $sum: { 
            $cond: ['$billable', '$hours', 0] 
          } 
        }
      }
    }
  ]);

  const totalRevenue = revenueData[0]?.total || 0;
  const totalExpenses = expenseData[0]?.total || 0;
  const totalHours = timeData[0]?.totalHours || 0;
  const billableHours = timeData[0]?.billableHours || 0;

  const previousStart = new Date(period.start);
  const previousEnd = new Date(period.end);
  const durationMs = previousEnd.getTime() - previousStart.getTime();
  previousEnd.setTime(previousStart.getTime() - 1);
  previousStart.setTime(previousEnd.getTime() - durationMs);

  const [previousRevenueAgg, previousExpenseAgg, recurringRevenueAgg, payrollAgg, activeProjects] = await Promise.all([
    Transaction.aggregate([
      { $match: { type: 'revenue', date: { $gte: previousStart, $lte: previousEnd }, orgId: req.user.orgId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Transaction.aggregate([
      { $match: { type: 'expense', date: { $gte: previousStart, $lte: previousEnd }, orgId: req.user.orgId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    Invoice.aggregate([
      { $match: { orgId: req.user.orgId, recurring: true, issueDate: { $gte: new Date(period.start), $lte: new Date(period.end) } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    PayrollRecord.aggregate([
      { $match: { orgId: req.user.orgId, periodStart: { $gte: new Date(period.start) }, periodEnd: { $lte: new Date(period.end) }, status: { $in: ['approved', 'paid'] } } },
      { $group: { _id: null, total: { $sum: '$grossPay' } } }
    ]),
    Project.countDocuments({ orgId: req.user.orgId, status: { $in: ['active', 'in_progress'] } })
  ]);

  const previousRevenue = previousRevenueAgg[0]?.total || 0;
  const previousExpenses = previousExpenseAgg[0]?.total || 0;
  const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  const expenseGrowth = previousExpenses > 0 ? ((totalExpenses - previousExpenses) / previousExpenses) * 100 : 0;
  const recurringRevenue = recurringRevenueAgg[0]?.total || 0;
  const payrollTotal = payrollAgg[0]?.total || 0;

  const kpiData = {
    period,
    metrics: {
      revenue: {
        total: totalRevenue,
        recurring: recurringRevenue,
        oneTime: Math.max(totalRevenue - recurringRevenue, 0),
        growth: revenueGrowth
      },
      expenses: {
        total: totalExpenses,
        payroll: payrollTotal,
        overhead: Math.max(totalExpenses - payrollTotal, 0),
        growth: expenseGrowth
      },
      profitability: {
        grossMargin: totalRevenue - totalExpenses,
        netMargin: totalRevenue - totalExpenses,
        ebitda: totalRevenue - totalExpenses
      },
      cashFlow: {
        operating: totalRevenue - totalExpenses,
        investing: 0,
        financing: 0,
        net: totalRevenue - totalExpenses
      },
      utilization: {
        billable: totalHours > 0 ? (billableHours / totalHours) * 100 : 0,
        overall: totalHours > 0 ? (billableHours / totalHours) * 100 : 0,
        target: 80
      },
      projectMetrics: {
        activeProjects,
        completedProjects: 0,
        averageMargin: 0,
        onTimeDelivery: 0
      }
    },
    lastCalculated: new Date(),
    orgId: req.user.orgId
  };

  const kpi = await FinancialKPI.findOneAndUpdate(
    { 'period.start': new Date(period.start), 'period.end': new Date(period.end), orgId: req.user.orgId },
    kpiData,
    { new: true, upsert: true }
  );

  res.json({
    success: true,
    message: 'Financial KPIs calculated successfully',
    data: { kpi }
  });
}));

// ==================== MASTER FINANCE DASHBOARD ROUTES ====================

// Get comprehensive KPIs for dashboard
router.get('/kpis/dashboard', [
  financeRead,
  query('period').optional().isIn(['week', 'month', 'quarter', 'year'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';
  const userRole = req.user.role || 'employee';
  const kpis = await FinanceDashboardService.calculateKPIs(req.user.orgId, period, userRole);

  res.json({
    success: true,
    data: kpis
  });
}));

// Get revenue trends
router.get('/revenue/trends', [
  financeRead,
  query('period').optional().isIn(['week', 'month', 'quarter', 'year'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';
  const trends = await FinanceDashboardService.getRevenueTrends(req.user.orgId, period);

  res.json({
    success: true,
    data: trends
  });
}));

// Get expense trends
router.get('/expenses/trends', [
  financeRead,
  query('period').optional().isIn(['week', 'month', 'quarter', 'year'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';
  const trends = await FinanceDashboardService.getExpenseTrends(req.user.orgId, period);

  res.json({
    success: true,
    data: trends
  });
}));

// Get cash flow data
router.get('/cash-flow', [
  financeRead,
  query('period').optional().isIn(['week', 'month', 'quarter', 'year'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';
  const cashFlow = await FinanceDashboardService.getCashFlow(req.user.orgId, period);

  res.json({
    success: true,
    data: cashFlow
  });
}));

// Get accounts aging
router.get('/accounts/aging', [
  financeRead
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const aging = await FinanceDashboardService.getAccountsAging(req.user.orgId);

  res.json({
    success: true,
    data: aging
  });
}));

// Get project profitability
router.get('/projects/profitability', [
  financeRead
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const profitability = await FinanceDashboardService.getProjectProfitability(req.user.orgId);

  res.json({
    success: true,
    data: profitability
  });
}));

// Get budget vs actual
router.get('/budget/vs-actual', [
  financeRead,
  query('period').optional().isIn(['week', 'month', 'quarter', 'year'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';
  const budgetVsActual = await FinanceDashboardService.getBudgetVsActual(req.user.orgId, period);

  res.json({
    success: true,
    data: budgetVsActual
  });
}));

// Get financial alerts
router.get('/alerts', [
  financeRead
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const alerts = await FinanceDashboardService.getFinancialAlerts(req.user.orgId);

  res.json({
    success: true,
    data: alerts
  });
}));

// Get overdue invoices
router.get('/invoices/overdue', [
  financeRead
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({
    orgId: req.user.orgId,
    status: 'overdue'
  })
    .populate('clientId', 'name email')
    .sort({ dueDate: 1 })
    .limit(10);

  res.json({
    success: true,
    data: invoices
  });
}));

// Get upcoming bills
router.get('/bills/upcoming', [
  financeRead,
  query('days').optional().isInt({ min: 1, max: 90 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const bills = await Bill.find({
    orgId: req.user.orgId,
    status: { $in: ['pending_approval', 'approved'] },
    dueDate: { $lte: futureDate }
  })
    .populate('vendorId', 'name email')
    .sort({ dueDate: 1 })
    .limit(10);

  res.json({
    success: true,
    data: bills
  });
}));

// Get recent transactions
router.get('/transactions', [
  financeRead,
  query('limit').optional().isInt({ min: 1, max: 100 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const transactions = await Transaction.find({
    orgId: req.user.orgId
  })
    .populate('accountId', 'name code')
    .sort({ date: -1 })
    .limit(limit);

  res.json({
    success: true,
    data: transactions
  });
}));

// ==================== EXPORT ROUTES ====================

// Export KPIs to Excel
router.get('/export/kpis/excel', [
  financeRead,
  query('period').optional().isIn(['week', 'month', 'quarter', 'year'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';
  if (!FinanceExportService.supportsExcel()) {
    return FinanceExportService.exportKPIsToCSV(req.user.orgId, period, res);
  }
  await FinanceExportService.exportKPIsToExcel(req.user.orgId, period, res);
}));

// Export KPIs to PDF
router.get('/export/kpis/pdf', [
  financeRead,
  query('period').optional().isIn(['week', 'month', 'quarter', 'year'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';
  if (!FinanceExportService.supportsPdf()) {
    return FinanceExportService.exportKPIsToCSV(req.user.orgId, period, res);
  }
  await FinanceExportService.exportKPIsToPDF(req.user.orgId, period, res);
}));

// Export KPIs to CSV
router.get('/export/kpis/csv', [
  financeRead,
  query('period').optional().isIn(['week', 'month', 'quarter', 'year'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';
  await FinanceExportService.exportKPIsToCSV(req.user.orgId, period, res);
}));

// Export full dashboard to Excel
router.get('/export/dashboard/excel', [
  financeRead,
  query('period').optional().isIn(['week', 'month', 'quarter', 'year'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';
  if (!FinanceExportService.supportsExcel()) {
    return FinanceExportService.exportKPIsToCSV(req.user.orgId, period, res);
  }
  await FinanceExportService.exportDashboardToExcel(req.user.orgId, period, res);
}));

module.exports = router;
