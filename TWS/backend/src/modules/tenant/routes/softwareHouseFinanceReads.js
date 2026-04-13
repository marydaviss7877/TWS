/**
 * Software-house finance GET APIs used by tenant-ui (tenant-api.service.js).
 * Returns real data from Finance models when present; otherwise empty shapes (no 404).
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
      for (const b of bills) {
        if (b.status === 'paid') paid += 1;
        else if (b.dueDate && new Date(b.dueDate) < now && b.status !== 'cancelled') overdue += 1;
        else if (b.status !== 'cancelled') pending += 1;
      }
      res.json({
        success: true,
        data: {
          bills,
          total: bills.length,
          paid,
          pending,
          overdue
        }
      });
    })
  );

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
      for (const inv of invoices) {
        if (inv.status === 'paid') paid += 1;
        else if (inv.dueDate && new Date(inv.dueDate) < now && inv.status !== 'cancelled') overdue += 1;
        else if (inv.status !== 'cancelled') pending += 1;
      }
      res.json({
        success: true,
        data: {
          invoices,
          total: invoices.length,
          paid,
          pending,
          overdue
        }
      });
    })
  );

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
