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

// Populate req.user from the JWT before any requireErpAccess check runs — matches
// the sibling billing.js router. Without this, requireErpAccess still fails closed
// (403, since req.user is undefined) but every route is unusable for legitimate callers too.
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
router.use(verifyERPToken);

const getOrgId = (req) => req.user?.orgId;

/**
 * @swagger
 * /api/finance:
 *   get:
 *     summary: List financial transactions (paginated)
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [expense, revenue, investment, transfer, loan]
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Paginated list of transactions scoped to the caller's organization
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance:
 *   post:
 *     summary: Create a financial transaction
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, category, amount, description]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [expense, revenue, investment, transfer, loan]
 *               category:
 *                 type: string
 *               amount:
 *                 type: number
 *                 description: Transaction amount (Transaction.amount is a plain Number field)
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               accountId:
 *                 type: string
 *                 description: Mongo ObjectId of a ChartOfAccounts entry
 *     responses:
 *       201:
 *         description: Transaction created
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/accounts:
 *   get:
 *     summary: List active legacy financial accounts
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active accounts scoped to the caller's organization
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
// Get accounts
router.get('/accounts', financeRead, ErrorHandler.asyncHandler(async (req, res) => {
  const accounts = await Account.find({ active: true, orgId: getOrgId(req) }).sort({ code: 1 });

  res.json({
    success: true,
    data: { accounts }
  });
}));

/**
 * @swagger
 * /api/finance/accounts:
 *   post:
 *     summary: Create a legacy financial account
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, code]
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [asset, liability, equity, revenue, expense]
 *               code:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account created
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/invoices:
 *   get:
 *     summary: List invoices (paginated)
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, sent, paid, overdue, cancelled]
 *     responses:
 *       200:
 *         description: Paginated list of invoices scoped to the caller's organization
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/invoices:
 *   post:
 *     summary: Create an invoice (invoice number auto-generated as INV-####)
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clientName, clientEmail, issueDate, dueDate, items, subtotal, taxAmount, total]
 *             properties:
 *               clientName:
 *                 type: string
 *               clientEmail:
 *                 type: string
 *                 format: email
 *               issueDate:
 *                 type: string
 *                 format: date-time
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     description:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     unitPrice:
 *                       type: number
 *                     total:
 *                       type: number
 *               subtotal:
 *                 type: number
 *               taxAmount:
 *                 type: number
 *               total:
 *                 type: number
 *                 description: Invoice.currency defaults to USD; not settable on this route
 *     responses:
 *       201:
 *         description: Invoice created
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/reports/pnl:
 *   get:
 *     summary: Get profit & loss summary for a date range
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: end
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Revenue, expenses, and net income for the period (sums of Transaction.amount, Number type)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                         end:
 *                           type: string
 *                     revenue:
 *                       type: number
 *                     expenses:
 *                       type: number
 *                     netIncome:
 *                       type: number
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/chart-of-accounts:
 *   get:
 *     summary: List chart of accounts entries
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [asset, liability, equity, revenue, expense]
 *       - in: query
 *         name: level
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *     responses:
 *       200:
 *         description: Chart of accounts entries scoped to the caller's organization
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/chart-of-accounts:
 *   post:
 *     summary: Create a chart of accounts entry
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, name, type]
 *             properties:
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [asset, liability, equity, revenue, expense]
 *               parentAccount:
 *                 type: string
 *                 description: Mongo ObjectId of parent ChartOfAccounts entry
 *               level:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       201:
 *         description: Chart of accounts entry created
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/journal-entries:
 *   get:
 *     summary: List journal entries (paginated)
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, posted, reversed]
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Paginated list of journal entries scoped to the caller's organization
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/journal-entries:
 *   post:
 *     summary: Create a journal entry (double-entry; total debits must equal total credits)
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description, entries]
 *             properties:
 *               description:
 *                 type: string
 *               entries:
 *                 type: array
 *                 minItems: 2
 *                 items:
 *                   type: object
 *                   required: [accountId]
 *                   properties:
 *                     accountId:
 *                       type: string
 *                       description: Mongo ObjectId of a ChartOfAccounts entry
 *                     debit:
 *                       type: number
 *                     credit:
 *                       type: number
 *               date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Journal entry created (entryNumber auto-generated as JE-####)
 *       400:
 *         description: Validation error, or total debits do not equal total credits
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/project-costing/{projectId}:
 *   get:
 *     summary: Get project costing / profitability record for a project
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: ProjectCosting record (budget/actualCosts amounts are plain Number fields)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
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

/**
 * @swagger
 * /api/finance/project-costing/{projectId}:
 *   put:
 *     summary: Upsert project costing budget/actual-costs for a project
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               budget:
 *                 type: object
 *                 description: "{ total, hourly, fixed, contingency } — all Number"
 *               actualCosts:
 *                 type: object
 *                 description: "{ labor, materials, overhead, total } — all Number"
 *     responses:
 *       200:
 *         description: Project costing created or updated (upsert)
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/time-entries:
 *   get:
 *     summary: List billable time entries
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, submitted, approved, billed]
 *     responses:
 *       200:
 *         description: Time entries scoped to the caller's organization
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/time-entries:
 *   post:
 *     summary: Create a billable time entry
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, projectId, clientId, date, hours, description]
 *             properties:
 *               employeeId:
 *                 type: string
 *               projectId:
 *                 type: string
 *               clientId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               hours:
 *                 type: number
 *                 minimum: 0
 *               description:
 *                 type: string
 *               hourlyRate:
 *                 type: number
 *     responses:
 *       201:
 *         description: Time entry created
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/vendors:
 *   get:
 *     summary: List vendors
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *     responses:
 *       200:
 *         description: Vendors scoped to the caller's organization
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/vendors:
 *   post:
 *     summary: Create a vendor
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               paymentTerms:
 *                 type: string
 *                 enum: [net_15, net_30, net_45, net_60, due_on_receipt]
 *                 default: net_30
 *     responses:
 *       201:
 *         description: Vendor created
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/bills:
 *   get:
 *     summary: List vendor bills (accounts payable)
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending_approval, approved, paid, overdue, cancelled]
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Bills scoped to the caller's organization (Bill.total/subtotal/taxAmount/paidAmount are Number, Bill.currency defaults to USD)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/bills:
 *   post:
 *     summary: Create a vendor bill (bill number auto-generated as BILL-####)
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vendorId, billDate, dueDate, items, subtotal, taxAmount, total]
 *             properties:
 *               vendorId:
 *                 type: string
 *               billDate:
 *                 type: string
 *                 format: date-time
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   properties:
 *                     description:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     unitPrice:
 *                       type: number
 *                     total:
 *                       type: number
 *               subtotal:
 *                 type: number
 *               taxAmount:
 *                 type: number
 *               total:
 *                 type: number
 *     responses:
 *       201:
 *         description: Bill created
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/cash-flow-forecasts:
 *   get:
 *     summary: List cash flow forecasts
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, archived]
 *     responses:
 *       200:
 *         description: Cash flow forecasts scoped to the caller's organization
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/cash-flow-forecasts:
 *   post:
 *     summary: Create a cash flow forecast
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, period, forecastType, scenarios]
 *             properties:
 *               name:
 *                 type: string
 *               period:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date-time
 *                   end:
 *                     type: string
 *                     format: date-time
 *               forecastType:
 *                 type: string
 *                 enum: [monthly, quarterly, yearly]
 *               scenarios:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   description: "{ name, probability, inflows: [{date, amount, description, category}], outflows: [...] } — amount is Number"
 *     responses:
 *       201:
 *         description: Cash flow forecast created
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/kpis:
 *   get:
 *     summary: Get the most recent financial KPI snapshot for a period
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Any date within the target month; resolves to that calendar month's KPI window
 *     responses:
 *       200:
 *         description: Latest matching FinancialKPI document, or null
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/kpis/calculate:
 *   post:
 *     summary: Recalculate and upsert the financial KPI snapshot for a period
 *     description: Aggregates Transaction (revenue/expense), TimeEntry (utilization), Invoice (recurring revenue), PayrollRecord (payroll cost), and Project (active count) for the given period, all scoped to the caller's organization.
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [period]
 *             properties:
 *               period:
 *                 type: object
 *                 required: [start, end]
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date-time
 *                   end:
 *                     type: string
 *                     format: date-time
 *     responses:
 *       200:
 *         description: Recalculated FinancialKPI document
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/kpis/dashboard:
 *   get:
 *     summary: Get comprehensive finance dashboard KPIs
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *     responses:
 *       200:
 *         description: KPI payload computed by FinanceDashboardService for the caller's organization and role
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/revenue/trends:
 *   get:
 *     summary: Get revenue trend series
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Revenue trend data computed by FinanceDashboardService for the caller's organization
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/expenses/trends:
 *   get:
 *     summary: Get expense trend series
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Expense trend data computed by FinanceDashboardService for the caller's organization
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/cash-flow:
 *   get:
 *     summary: Get cash flow summary for the dashboard
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Cash flow data computed by FinanceDashboardService for the caller's organization
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/accounts/aging:
 *   get:
 *     summary: Get accounts receivable/payable aging buckets
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aging data computed by FinanceDashboardService for the caller's organization
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/projects/profitability:
 *   get:
 *     summary: Get per-project profitability summary
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profitability data computed by FinanceDashboardService for the caller's organization
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/budget/vs-actual:
 *   get:
 *     summary: Get budget vs actual spend comparison
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Budget vs actual data computed by FinanceDashboardService for the caller's organization
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/alerts:
 *   get:
 *     summary: Get financial alerts (e.g. overdue invoices, low cash) for the dashboard
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alerts computed by FinanceDashboardService for the caller's organization
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/invoices/overdue:
 *   get:
 *     summary: List up to 10 overdue invoices
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overdue invoices scoped to the caller's organization
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/bills/upcoming:
 *   get:
 *     summary: List up to 10 upcoming vendor bills due within N days
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 90
 *           default: 30
 *     responses:
 *       200:
 *         description: Upcoming bills scoped to the caller's organization
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/transactions:
 *   get:
 *     summary: List most recent transactions
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *     responses:
 *       200:
 *         description: Recent transactions scoped to the caller's organization
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/export/kpis/excel:
 *   get:
 *     summary: Export KPIs to Excel (falls back to CSV if Excel export is unsupported)
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Binary file stream (xlsx or csv) for the caller's organization
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/export/kpis/pdf:
 *   get:
 *     summary: Export KPIs to PDF (falls back to CSV if PDF export is unsupported)
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Binary file stream (pdf or csv) for the caller's organization
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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

/**
 * @swagger
 * /api/finance/export/kpis/csv:
 *   get:
 *     summary: Export KPIs to CSV
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *     responses:
 *       200:
 *         description: CSV file stream for the caller's organization
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
// Export KPIs to CSV
router.get('/export/kpis/csv', [
  financeRead,
  query('period').optional().isIn(['week', 'month', 'quarter', 'year'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';
  await FinanceExportService.exportKPIsToCSV(req.user.orgId, period, res);
}));

/**
 * @swagger
 * /api/finance/export/dashboard/excel:
 *   get:
 *     summary: Export the full finance dashboard to Excel (falls back to CSV if Excel export is unsupported)
 *     tags: [Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Binary file stream (xlsx or csv) for the caller's organization
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
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
