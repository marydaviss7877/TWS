/**
 * Software-house finance GET APIs used by tenant-ui (tenant-api.service.js).
 * Returns real data from Finance models when present; otherwise empty shapes (no 404).
 *
 * Mounted (see modules/tenant/routes/softwareHouse.js -> server.js) at:
 *   /api/tenant/{tenantSlug}/software-house
 * so every route below resolves to /api/tenant/{tenantSlug}/software-house/finance/...
 *
 * All queries below scope to `orgId` derived from `req.user.orgId`, which is set by
 * `unifiedSoftwareHouseAuth` (verifyERPToken) after verifying the JWT and cross-checking
 * tenant/workspace membership — never taken from req.params or req.body.
 */

const ErrorHandler = require('../../../middleware/common/errorHandler');

function toOrgObjectId(raw) {
  if (raw == null || raw === '') return null;
  const mongoose = require('mongoose');
  const s = String(raw);
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : raw;
}

function orgIdFromReq(req) {
  return toOrgObjectId(req.user?.orgId);
}

/**
 * @param {import('express').Router} router
 * @param {object} deps
 */
module.exports = function registerSoftwareHouseFinanceReads(router, deps) {
  const {
    unifiedSoftwareHouseAuth,
    requireErpAccess,
    Transaction,
    Invoice,
    Bill,
    ChartOfAccounts,
    CashFlowForecast,
    Vendor,
    ProjectCosting
  } = deps;

  const shFinanceRead = requireErpAccess({ module: 'finance', action: 'read' });

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance:
   *   get:
   *     summary: Get software-house finance overview (revenue, expenses, AR/AP totals)
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Aggregated totals (Number, summed from Transaction.amount / Invoice.total / Bill.total — no currency conversion; currency defaults to USD on the underlying models)
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
   *                     totalRevenue:
   *                       type: number
   *                     totalExpenses:
   *                       type: number
   *                     netIncome:
   *                       type: number
   *                     accountsReceivable:
   *                       type: number
   *                     accountsPayable:
   *                       type: number
   *                     cashBalance:
   *                       type: number
   *                     grossMargin:
   *                       type: number
   *                       description: Percentage, rounded to 1 decimal
   *                     monthlyRecurringRevenue:
   *                       type: number
   *                     utilizationRate:
   *                       type: number
   *       400:
   *         description: Organization required (no orgId resolvable from the authenticated user)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
  router.get(
    '/finance',
    unifiedSoftwareHouseAuth,
    shFinanceRead,
    ErrorHandler.asyncHandler(async (req, res) => {
      const orgId = orgIdFromReq(req);
      if (!orgId) {
        return res.status(400).json({ success: false, message: 'Organization required' });
      }
      const [rev, exp, arRows, apRows] = await Promise.all([
        Transaction.aggregate([
          { $match: { orgId, type: 'revenue' } },
          { $group: { _id: null, t: { $sum: '$amount' } } }
        ]).catch(() => []),
        Transaction.aggregate([
          { $match: { orgId, type: 'expense' } },
          { $group: { _id: null, t: { $sum: '$amount' } } }
        ]).catch(() => []),
        Invoice.aggregate([
          { $match: { orgId, status: { $in: ['sent', 'overdue', 'partially_paid', 'draft'] } } },
          {
            $group: {
              _id: null,
              t: {
                $sum: {
                  $ifNull: [
                    '$remainingAmount',
                    { $max: [0, { $subtract: [{ $ifNull: ['$total', 0] }, { $ifNull: ['$paidAmount', 0] }] }] }
                  ]
                }
              }
            }
          }
        ]).catch(() => []),
        Bill.aggregate([
          { $match: { orgId, status: { $nin: ['paid', 'cancelled'] } } },
          { $group: { _id: null, t: { $sum: { $ifNull: ['$total', 0] } } } }
        ]).catch(() => [])
      ]);
      const totalRevenue = rev[0]?.t || 0;
      const totalExpenses = exp[0]?.t || 0;
      const netIncome = totalRevenue - totalExpenses;
      res.json({
        success: true,
        data: {
          totalRevenue,
          totalExpenses,
          netIncome,
          accountsReceivable: arRows[0]?.t || 0,
          accountsPayable: apRows[0]?.t || 0,
          cashBalance: netIncome,
          grossMargin: totalRevenue > 0 ? Math.round((netIncome / totalRevenue) * 1000) / 10 : 0,
          monthlyRecurringRevenue: 0,
          utilizationRate: 0,
          financialMetrics: {}
        }
      });
    })
  );

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/accounts-payable:
   *   get:
   *     summary: List vendor bills (accounts payable) with paid/pending/overdue totals
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Up to 200 most-recently-due bills (Bill.total/paidAmount are Number) plus paid/pending/overdue Number totals
   *       400:
   *         description: Organization required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
  router.get(
    '/finance/accounts-payable',
    unifiedSoftwareHouseAuth,
    shFinanceRead,
    ErrorHandler.asyncHandler(async (req, res) => {
      const orgId = orgIdFromReq(req);
      if (!orgId) return res.status(400).json({ success: false, message: 'Organization required' });
      const bills = await Bill.find({ orgId }).sort({ dueDate: -1 }).limit(200).lean().catch(() => []);
      const now = new Date();
      let paid = 0;
      let pending = 0;
      let overdue = 0;
      const normalized = bills.map((b) => {
        const paidAmount = Number(b.paidAmount || 0);
        const total = Number(b.total || 0);
        const remainingAmount = Math.max(total - paidAmount, 0);
        const isOverdue = b.dueDate && new Date(b.dueDate) < now && b.status !== 'cancelled' && b.status !== 'paid';
        if (b.status === 'paid') paid += paidAmount || total;
        else if (isOverdue) overdue += remainingAmount;
        else if (b.status !== 'cancelled') pending += remainingAmount;
        return {
          ...b,
          issueDate: b.issueDate || b.billDate,
          remainingAmount,
          vendorName: b.vendorName || 'N/A',
          projectName: b.projectName || ''
        };
      });
      const total = normalized.reduce((s, b) => s + Number(b.remainingAmount || 0), 0);
      res.json({
        success: true,
        data: {
          bills: normalized,
          total,
          paid,
          pending,
          overdue
        }
      });
    })
  );

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/accounts-receivable:
   *   get:
   *     summary: List invoices (accounts receivable) with paid/pending/overdue totals
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Up to 200 most-recently-due invoices (Invoice.total/paidAmount/remainingAmount are Number) plus paid/pending/overdue Number totals
   *       400:
   *         description: Organization required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
  router.get(
    '/finance/accounts-receivable',
    unifiedSoftwareHouseAuth,
    shFinanceRead,
    ErrorHandler.asyncHandler(async (req, res) => {
      const orgId = orgIdFromReq(req);
      if (!orgId) return res.status(400).json({ success: false, message: 'Organization required' });
      const invoices = await Invoice.find({ orgId }).sort({ dueDate: -1 }).limit(200).lean().catch(() => []);
      const now = new Date();
      let paid = 0;
      let pending = 0;
      let overdue = 0;
      const normalized = invoices.map((inv) => {
        const total = Number(inv.total || 0);
        const paidAmount = Number(inv.paidAmount || 0);
        const remainingAmount = Number(inv.remainingAmount ?? Math.max(total - paidAmount, 0));
        const isOverdue = inv.dueDate && new Date(inv.dueDate) < now && inv.status !== 'cancelled' && inv.status !== 'paid';
        if (inv.status === 'paid') paid += paidAmount || total;
        else if (isOverdue) overdue += remainingAmount;
        else if (inv.status !== 'cancelled') pending += remainingAmount;
        return {
          ...inv,
          remainingAmount,
          clientName: inv.clientName || 'N/A',
          projectName: inv.projectName || ''
        };
      });
      const total = normalized.reduce((s, i) => s + Number(i.remainingAmount || 0), 0);
      res.json({
        success: true,
        data: {
          invoices: normalized,
          total,
          paid,
          pending,
          overdue
        }
      });
    })
  );

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/transactions/recent:
   *   get:
   *     summary: List the most recent transactions
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Not validated server-side beyond parseInt + capped at 50
   *     responses:
   *       200:
   *         description: Recent transactions (amount is Number; type mapped revenue->income, else expense)
   *       400:
   *         description: Organization required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
  router.get(
    '/finance/transactions/recent',
    unifiedSoftwareHouseAuth,
    shFinanceRead,
    ErrorHandler.asyncHandler(async (req, res) => {
      const orgId = orgIdFromReq(req);
      if (!orgId) return res.status(400).json({ success: false, message: 'Organization required' });
      const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
      const rows = await Transaction.find({ orgId })
        .sort({ date: -1 })
        .limit(limit)
        .lean()
        .catch(() => []);
      const mapped = rows.map((t) => ({
        _id: t._id,
        type: t.type === 'revenue' ? 'income' : 'expense',
        description: t.description,
        date: t.date,
        amount: t.amount || 0,
        status: t.status || 'pending'
      }));
      res.json({ success: true, data: mapped });
    })
  );

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/invoices/overdue:
   *   get:
   *     summary: List up to 100 overdue invoices, sorted by due date ascending
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Overdue invoices with computed daysOverdue and amount (Number)
   *       400:
   *         description: Organization required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
  router.get(
    '/finance/invoices/overdue',
    unifiedSoftwareHouseAuth,
    shFinanceRead,
    ErrorHandler.asyncHandler(async (req, res) => {
      const orgId = orgIdFromReq(req);
      if (!orgId) return res.status(400).json({ success: false, message: 'Organization required' });
      const now = new Date();
      const invoices = await Invoice.find({
        orgId,
        dueDate: { $lt: now },
        status: { $nin: ['paid', 'cancelled'] }
      })
        .sort({ dueDate: 1 })
        .limit(100)
        .lean()
        .catch(() => []);
      const data = invoices.map((inv) => {
        const daysOverdue = Math.max(
          0,
          Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (24 * 60 * 60 * 1000))
        );
        const amount = inv.remainingAmount ?? Math.max(0, (inv.total || 0) - (inv.paidAmount || 0));
        return {
          _id: inv._id,
          invoiceNumber: inv.invoiceNumber,
          clientName: inv.clientName || '—',
          amount,
          daysOverdue
        };
      });
      res.json({ success: true, data });
    })
  );

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/bills/upcoming:
   *   get:
   *     summary: List up to 100 bills due within the next 60 days, sorted by due date ascending
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Upcoming bills with computed daysUntilDue and amount (Number, from Bill.total)
   *       400:
   *         description: Organization required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
  router.get(
    '/finance/bills/upcoming',
    unifiedSoftwareHouseAuth,
    shFinanceRead,
    ErrorHandler.asyncHandler(async (req, res) => {
      const orgId = orgIdFromReq(req);
      if (!orgId) return res.status(400).json({ success: false, message: 'Organization required' });
      const now = new Date();
      const horizon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const bills = await Bill.find({
        orgId,
        dueDate: { $gte: now, $lte: horizon },
        status: { $nin: ['paid', 'cancelled'] }
      })
        .sort({ dueDate: 1 })
        .limit(100)
        .lean()
        .catch(() => []);
      const data = bills.map((b) => {
        const daysUntilDue = Math.max(
          0,
          Math.ceil((new Date(b.dueDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        );
        return {
          _id: b._id,
          billNumber: b.billNumber,
          vendorName: b.vendorName || '—',
          amount: b.total || 0,
          daysUntilDue
        };
      });
      res.json({ success: true, data });
    })
  );

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/projects/profitability:
   *   get:
   *     summary: List up to 100 project costing records with computed profit/margin
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: ProjectCosting records with budget/actualCost/revenue/profit (Number) and margin (percentage, rounded to 1 decimal)
   *       400:
   *         description: Organization required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
  router.get(
    '/finance/projects/profitability',
    unifiedSoftwareHouseAuth,
    shFinanceRead,
    ErrorHandler.asyncHandler(async (req, res) => {
      const orgId = orgIdFromReq(req);
      if (!orgId) return res.status(400).json({ success: false, message: 'Organization required' });
      const rows = await ProjectCosting.find({ orgId })
        .populate('projectId', 'name')
        .populate('clientId', 'name')
        .limit(100)
        .lean()
        .catch(() => []);
      const data = rows.map((c) => {
        const budget = c.budget?.total || 0;
        const actualCost = c.actualCosts?.total || 0;
        const revenue = budget;
        const profit = revenue - actualCost;
        const margin = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;
        return {
          _id: c._id,
          name: c.projectId?.name || 'Project',
          clientName: c.clientId?.name || '—',
          budget,
          actualCost,
          revenue,
          profit,
          margin
        };
      });
      res.json({ success: true, data });
    })
  );

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/cash-flow:
   *   get:
   *     summary: List up to 200 recent transactions shaped as cash-flow inflow/outflow entries
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Transactions mapped to { type inflow/outflow, amount (Number), description, category, date }
   *       400:
   *         description: Organization required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
  router.get(
    '/finance/cash-flow',
    unifiedSoftwareHouseAuth,
    shFinanceRead,
    ErrorHandler.asyncHandler(async (req, res) => {
      const orgId = orgIdFromReq(req);
      if (!orgId) return res.status(400).json({ success: false, message: 'Organization required' });
      const rows = await Transaction.find({ orgId })
        .sort({ date: -1 })
        .limit(200)
        .lean()
        .catch(() => []);
      const transactions = rows.map((t) => ({
        _id: t._id,
        type: t.type === 'revenue' ? 'inflow' : 'outflow',
        amount: t.amount || 0,
        description: t.description,
        category: t.category,
        date: t.date
      }));
      res.json({ success: true, data: { transactions } });
    })
  );

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/cash-flow/forecasts:
   *   get:
   *     summary: List up to 25 cash flow forecasts, flattened into individual inflow/outflow entries (max 100 entries returned)
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Flattened forecast entries with amount (Number) and a hardcoded confidence of "medium"
   *       400:
   *         description: Organization required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
  router.get(
    '/finance/cash-flow/forecasts',
    unifiedSoftwareHouseAuth,
    shFinanceRead,
    ErrorHandler.asyncHandler(async (req, res) => {
      const orgId = orgIdFromReq(req);
      if (!orgId) return res.status(400).json({ success: false, message: 'Organization required' });
      const rows = await CashFlowForecast.find({ orgId }).sort({ updatedAt: -1 }).limit(25).lean().catch(() => []);
      const mapped = [];
      for (const f of rows) {
        for (const sc of f.scenarios || []) {
          for (const inf of sc.inflows || []) {
            if (inf?.date) {
              mapped.push({
                _id: `${f._id}-in-${mapped.length}`,
                type: 'inflow',
                amount: inf.amount || 0,
                description: inf.description || f.name,
                category: inf.category,
                date: inf.date,
                confidence: 'medium'
              });
            }
          }
          for (const out of sc.outflows || []) {
            if (out?.date) {
              mapped.push({
                _id: `${f._id}-out-${mapped.length}`,
                type: 'outflow',
                amount: out.amount || 0,
                description: out.description || f.name,
                category: out.category,
                date: out.date,
                confidence: 'medium'
              });
            }
          }
        }
      }
      mapped.sort((a, b) => new Date(a.date) - new Date(b.date));
      res.json({ success: true, data: mapped.slice(0, 100) });
    })
  );

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/vendors:
   *   get:
   *     summary: List up to 500 vendors
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Vendor list scoped to the tenant's organization
   *       400:
   *         description: Organization required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
  router.get(
    '/finance/vendors',
    unifiedSoftwareHouseAuth,
    shFinanceRead,
    ErrorHandler.asyncHandler(async (req, res) => {
      const orgId = orgIdFromReq(req);
      if (!orgId) return res.status(400).json({ success: false, message: 'Organization required' });
      const vendors = await Vendor.find({ orgId }).sort({ name: 1 }).limit(500).lean().catch(() => []);
      res.json({ success: true, data: vendors });
    })
  );

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/chart-of-accounts:
   *   get:
   *     summary: List up to 500 active chart-of-accounts entries
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Active ChartOfAccounts entries scoped to the tenant's organization, sorted by code
   *       400:
   *         description: Organization required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
  router.get(
    '/finance/chart-of-accounts',
    unifiedSoftwareHouseAuth,
    shFinanceRead,
    ErrorHandler.asyncHandler(async (req, res) => {
      const orgId = orgIdFromReq(req);
      if (!orgId) return res.status(400).json({ success: false, message: 'Organization required' });
      const accounts = await ChartOfAccounts.find({ orgId, isActive: true })
        .sort({ code: 1 })
        .limit(500)
        .lean()
        .catch(() => []);
      res.json({ success: true, data: accounts });
    })
  );
};
