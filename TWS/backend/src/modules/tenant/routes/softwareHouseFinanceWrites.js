const multer = require('multer');
const ErrorHandler = require('../../../middleware/common/errorHandler');

const upload = multer();

function toOrgObjectId(raw, mongoose) {
  if (raw == null || raw === '') return null;
  const s = String(raw);
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : raw;
}

function computeInvoiceTotals(invoice) {
  const total = Number(invoice.total || 0);
  const paid = Number(invoice.paidAmount || 0);
  const remaining = Math.max(total - paid, 0);
  return { total, paid, remaining };
}

module.exports = function registerSoftwareHouseFinanceWrites(router, deps) {
  const {
    mongoose,
    unifiedSoftwareHouseAuth,
    shFinanceRead,
    shFinanceWrite,
    Invoice,
    Bill,
    Vendor,
    ChartOfAccounts,
    TimeEntry,
    Project,
    ProjectCosting,
    CashFlowForecast,
    Expense
  } = deps;

  const parseInvoiceItems = (body) => {
    const source = Array.isArray(body.items) ? body.items : Array.isArray(body.billingItems) ? body.billingItems : [];
    return source.map((item) => ({
      description: item.description || '',
      quantity: Number(item.quantity || item.hours || 1),
      unitPrice: Number(item.unitPrice || item.rate || 0),
      total: Number(item.amount || (Number(item.quantity || item.hours || 1) * Number(item.unitPrice || item.rate || 0)))
    }));
  };

  const ensureInvoiceNumber = async (orgId, proposed) => {
    if (proposed) return proposed;
    const last = await Invoice.findOne({ orgId }).sort({ createdAt: -1 }).lean();
    const current = last?.invoiceNumber || 'INV-0000';
    const n = Number(String(current).split('-').pop()) || 0;
    return `INV-${String(n + 1).padStart(4, '0')}`;
  };

  const ensureBillNumber = async (orgId, proposed) => {
    if (proposed) return proposed;
    const last = await Bill.findOne({ orgId }).sort({ createdAt: -1 }).lean();
    const current = last?.billNumber || 'BILL-0000';
    const n = Number(String(current).split('-').pop()) || 0;
    return `BILL-${String(n + 1).padStart(4, '0')}`;
  };

  router.post('/finance/invoices', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const items = parseInvoiceItems(req.body);
    const subtotal = Number(req.body.subtotal || items.reduce((s, i) => s + Number(i.total || 0), 0));
    const taxAmount = Number(req.body.taxAmount || 0);
    const total = Number(req.body.total || subtotal + taxAmount);
    const paidAmount = Number(req.body.paidAmount || 0);
    const remainingAmount = Math.max(total - paidAmount, 0);
    const invoice = await Invoice.create({
      orgId,
      invoiceNumber: await ensureInvoiceNumber(orgId, req.body.invoiceNumber),
      clientId: req.body.clientId || undefined,
      clientName: req.body.clientName || '',
      clientEmail: req.body.clientEmail || '',
      issueDate: req.body.issueDate ? new Date(req.body.issueDate) : new Date(),
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : new Date(),
      items,
      subtotal,
      taxAmount,
      total,
      notes: req.body.notes || '',
      status: req.body.status || 'draft',
      paymentTerms: ['net_15', 'net_30', 'net_45', 'net_60', 'due_on_receipt'].includes(req.body.paymentTerms)
        ? req.body.paymentTerms
        : 'net_30',
      paidAmount,
      remainingAmount,
      recurring: {
        enabled: Boolean(req.body.recurring || req.body?.recurring?.enabled),
        frequency: req.body.recurringFrequency || req.body?.recurring?.frequency
      }
    });
    res.status(201).json({ success: true, data: invoice });
  }));

  router.put('/finance/invoices/:invoiceId', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const items = parseInvoiceItems(req.body);
    const subtotal = Number(req.body.subtotal || items.reduce((s, i) => s + Number(i.total || 0), 0));
    const taxAmount = Number(req.body.taxAmount || 0);
    const total = Number(req.body.total || subtotal + taxAmount);
    const paidAmount = Number(req.body.paidAmount || 0);
    const remainingAmount = Math.max(total - paidAmount, 0);

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.invoiceId, orgId },
      {
        ...req.body,
        items,
        subtotal,
        taxAmount,
        total,
        paidAmount,
        remainingAmount,
        recurring: {
          enabled: Boolean(req.body.recurring || req.body?.recurring?.enabled),
          frequency: req.body.recurringFrequency || req.body?.recurring?.frequency
        }
      },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  }));

  router.delete('/finance/invoices/:invoiceId', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const deleted = await Invoice.findOneAndDelete({ _id: req.params.invoiceId, orgId });
    if (!deleted) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: deleted });
  }));

  router.post('/finance/invoices/:invoiceId/payments', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const invoice = await Invoice.findOne({ _id: req.params.invoiceId, orgId });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const amount = Number(req.body.amount || 0);
    invoice.paidAmount = Number(invoice.paidAmount || 0) + amount;
    const totals = computeInvoiceTotals(invoice);
    invoice.remainingAmount = totals.remaining;
    invoice.status = totals.remaining <= 0 ? 'paid' : 'partially_paid';
    invoice.paidAt = req.body.paymentDate ? new Date(req.body.paymentDate) : new Date();
    invoice.paymentMethod = req.body.paymentMethod || invoice.paymentMethod;
    await invoice.save();
    res.json({ success: true, data: invoice });
  }));

  router.post('/finance/accounts-receivable/:invoiceId/payment', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const invoice = await Invoice.findOne({ _id: req.params.invoiceId, orgId });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const amount = Number(req.body.amount || 0);
    invoice.paidAmount = Number(invoice.paidAmount || 0) + amount;
    const totals = computeInvoiceTotals(invoice);
    invoice.remainingAmount = totals.remaining;
    invoice.status = totals.remaining <= 0 ? 'paid' : 'partially_paid';
    invoice.paidAt = req.body.paymentDate ? new Date(req.body.paymentDate) : new Date();
    invoice.paymentMethod = req.body.paymentMethod || invoice.paymentMethod;
    await invoice.save();
    res.json({ success: true, data: invoice });
  }));

  router.post('/finance/accounts-receivable/:invoiceId/reminder', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const invoice = await Invoice.findOne({ _id: req.params.invoiceId, orgId });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: { invoiceId: invoice._id, reminderSent: true, sentAt: new Date() } });
  }));

  router.get('/finance/accounts-receivable/aging', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const now = new Date();
    const rows = await Invoice.find({ orgId, status: { $nin: ['paid', 'cancelled'] } }).lean();
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    rows.forEach((inv) => {
      const amount = Number(inv.remainingAmount ?? Math.max(0, Number(inv.total || 0) - Number(inv.paidAmount || 0)));
      const days = Math.max(0, Math.floor((now.getTime() - new Date(inv.dueDate || now).getTime()) / 86400000));
      if (days <= 30) buckets['0-30'] += amount;
      else if (days <= 60) buckets['31-60'] += amount;
      else if (days <= 90) buckets['61-90'] += amount;
      else buckets['90+'] += amount;
    });
    res.json({ success: true, data: { agingBuckets: buckets, count: rows.length } });
  }));

  router.get('/finance/accounts-receivable/clients/:clientId/history', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const invoices = await Invoice.find({ orgId, clientId: req.params.clientId }).sort({ issueDate: -1 }).lean();
    res.json({ success: true, data: invoices });
  }));

  router.post('/finance/bills', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const source = Array.isArray(req.body.items) ? req.body.items : Array.isArray(req.body.expenseItems) ? req.body.expenseItems : [];
    const items = source.map((item) => ({
      description: item.description || '',
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || item.amount || 0),
      total: Number(item.total || item.amount || 0)
    }));
    const subtotal = Number(req.body.subtotal || items.reduce((s, i) => s + Number(i.total || 0), 0));
    const taxAmount = Number(req.body.taxAmount || 0);
    const total = Number(req.body.total || subtotal + taxAmount);
    const bill = await Bill.create({
      orgId,
      billNumber: await ensureBillNumber(orgId, req.body.billNumber),
      vendorId: req.body.vendorId,
      vendorName: req.body.vendorName || '',
      vendorEmail: req.body.vendorEmail || '',
      billDate: req.body.billDate ? new Date(req.body.billDate) : (req.body.issueDate ? new Date(req.body.issueDate) : new Date()),
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : new Date(),
      items,
      subtotal,
      taxAmount,
      total,
      notes: req.body.notes || '',
      paymentTerms: req.body.paymentTerms || '',
      status: req.body.requiresApproval ? 'pending_approval' : (req.body.status || 'draft'),
      paidAmount: Number(req.body.paidAmount || 0)
    });
    res.status(201).json({ success: true, data: bill });
  }));

  router.put('/finance/bills/:billId', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const source = Array.isArray(req.body.items) ? req.body.items : Array.isArray(req.body.expenseItems) ? req.body.expenseItems : [];
    const items = source.map((item) => ({
      description: item.description || '',
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || item.amount || 0),
      total: Number(item.total || item.amount || 0)
    }));
    const subtotal = Number(req.body.subtotal || items.reduce((s, i) => s + Number(i.total || 0), 0));
    const taxAmount = Number(req.body.taxAmount || 0);
    const total = Number(req.body.total || subtotal + taxAmount);
    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.billId, orgId },
      { ...req.body, items, subtotal, taxAmount, total, billDate: req.body.billDate || req.body.issueDate || undefined },
      { new: true }
    );
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
    res.json({ success: true, data: bill });
  }));

  router.delete('/finance/bills/:billId', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const deleted = await Bill.findOneAndDelete({ _id: req.params.billId, orgId });
    if (!deleted) return res.status(404).json({ success: false, message: 'Bill not found' });
    res.json({ success: true, data: deleted });
  }));

  router.post('/finance/bills/:billId/payments', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const bill = await Bill.findOne({ _id: req.params.billId, orgId });
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
    bill.paidAmount = Number(bill.paidAmount || 0) + Number(req.body.amount || 0);
    const remaining = Math.max(Number(bill.total || 0) - Number(bill.paidAmount || 0), 0);
    bill.status = remaining <= 0 ? 'paid' : 'approved';
    bill.paidAt = req.body.paymentDate ? new Date(req.body.paymentDate) : new Date();
    bill.paymentMethod = req.body.paymentMethod || bill.paymentMethod;
    await bill.save();
    res.json({ success: true, data: bill });
  }));

  router.post('/finance/accounts-payable/:billId/payment', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const bill = await Bill.findOne({ _id: req.params.billId, orgId });
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
    bill.paidAmount = Number(bill.paidAmount || 0) + Number(req.body.amount || 0);
    const remaining = Math.max(Number(bill.total || 0) - Number(bill.paidAmount || 0), 0);
    bill.status = remaining <= 0 ? 'paid' : 'approved';
    bill.paidAt = req.body.paymentDate ? new Date(req.body.paymentDate) : new Date();
    bill.paymentMethod = req.body.paymentMethod || bill.paymentMethod;
    await bill.save();
    res.json({ success: true, data: bill });
  }));

  router.post('/finance/accounts-payable/:billId/schedule', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const bill = await Bill.findOne({ _id: req.params.billId, orgId });
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
    bill.notes = `${bill.notes || ''}\nScheduled payment: ${JSON.stringify(req.body)}`.trim();
    await bill.save();
    res.json({ success: true, data: { scheduled: true, billId: bill._id } });
  }));

  router.post('/finance/accounts-payable/:billId/approve', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const bill = await Bill.findOne({ _id: req.params.billId, orgId });
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
    bill.status = 'approved';
    await bill.save();
    res.json({ success: true, data: bill });
  }));

  router.get('/finance/accounts-payable/aging', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const now = new Date();
    const rows = await Bill.find({ orgId, status: { $nin: ['paid', 'cancelled'] } }).lean();
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    rows.forEach((bill) => {
      const amount = Math.max(Number(bill.total || 0) - Number(bill.paidAmount || 0), 0);
      const days = Math.max(0, Math.floor((now.getTime() - new Date(bill.dueDate || now).getTime()) / 86400000));
      if (days <= 30) buckets['0-30'] += amount;
      else if (days <= 60) buckets['31-60'] += amount;
      else if (days <= 90) buckets['61-90'] += amount;
      else buckets['90+'] += amount;
    });
    res.json({ success: true, data: { agingBuckets: buckets, count: rows.length } });
  }));

  router.get('/finance/accounts-payable/vendors/:vendorId/history', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const bills = await Bill.find({ orgId, vendorId: req.params.vendorId }).sort({ billDate: -1 }).lean();
    res.json({ success: true, data: bills });
  }));

  router.post('/finance/vendors', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const vendor = await Vendor.create({
      ...req.body,
      orgId,
      paymentTerms: ['net_15', 'net_30', 'net_45', 'net_60', 'due_on_receipt'].includes(req.body.paymentTerms)
        ? req.body.paymentTerms
        : 'net_30'
    });
    res.status(201).json({ success: true, data: vendor });
  }));

  router.post('/finance/chart-of-accounts', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const created = await ChartOfAccounts.create({ ...req.body, orgId });
    res.status(201).json({ success: true, data: created });
  }));

  router.put('/finance/chart-of-accounts/:accountId', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const updated = await ChartOfAccounts.findOneAndUpdate({ _id: req.params.accountId, orgId }, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({ success: true, data: updated });
  }));

  router.delete('/finance/chart-of-accounts/:accountId', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const deleted = await ChartOfAccounts.findOneAndDelete({ _id: req.params.accountId, orgId });
    if (!deleted) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({ success: true, data: deleted });
  }));

  router.post('/finance/chart-of-accounts/templates/:templateName', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const template = req.params.templateName;
    const rows = template === 'enterprise'
      ? [
        { code: '1000', name: 'Assets', type: 'asset', level: 1 },
        { code: '1100', name: 'Cash and Cash Equivalents', type: 'asset', level: 2 },
        { code: '2000', name: 'Liabilities', type: 'liability', level: 1 },
        { code: '2100', name: 'Accounts Payable', type: 'liability', level: 2 },
        { code: '4000', name: 'Revenue', type: 'revenue', level: 1 },
        { code: '4100', name: 'Development Revenue', type: 'revenue', level: 2 },
        { code: '5000', name: 'Operating Expenses', type: 'expense', level: 1 },
        { code: '5100', name: 'Payroll Expense', type: 'expense', level: 2 }
      ]
      : [
        { code: '1000', name: 'Assets', type: 'asset', level: 1 },
        { code: '1100', name: 'Cash', type: 'asset', level: 2 },
        { code: '4000', name: 'Revenue', type: 'revenue', level: 1 },
        { code: '4100', name: 'Software Services Revenue', type: 'revenue', level: 2 },
        { code: '5000', name: 'Expenses', type: 'expense', level: 1 },
        { code: '5100', name: 'Software/Cloud Expense', type: 'expense', level: 2 }
      ];
    const ops = rows.map((r) => ({
      updateOne: {
        filter: { orgId, code: r.code },
        update: { $setOnInsert: { ...r, orgId, isActive: true } },
        upsert: true
      }
    }));
    await ChartOfAccounts.bulkWrite(ops);
    res.json({ success: true, data: { template, inserted: rows.length } });
  }));

  router.get('/finance/expenses', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const rows = await Expense.find({ organizationId: orgId, deleted: { $ne: true } }).sort({ date: -1 }).lean();
    const data = rows.map((e) => ({
      ...e,
      employeeId: e.userId,
      employeeName: e.title || 'Employee Expense',
      projectName: e.projectName || 'N/A',
      billable: Boolean(e.isBusiness)
    }));
    res.json({ success: true, data });
  }));

  router.post('/finance/expenses', unifiedSoftwareHouseAuth, shFinanceWrite, upload.none(), ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const created = await Expense.create({
      userId: req.body.employeeId || req.user._id,
      createdBy: req.user._id,
      organizationId: orgId,
      title: req.body.description || req.body.title || 'Expense',
      amount: Number(req.body.amount || 0),
      category: (req.body.category || 'other').toLowerCase(),
      date: req.body.date ? new Date(req.body.date) : new Date(),
      description: req.body.description || '',
      projectId: req.body.projectId || undefined,
      isBusiness: req.body.billable === 'true' || req.body.billable === true,
      isPersonal: !(req.body.billable === 'true' || req.body.billable === true)
    });
    res.status(201).json({ success: true, data: created });
  }));

  router.put('/finance/expenses/:expenseId', unifiedSoftwareHouseAuth, shFinanceWrite, upload.none(), ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const updated = await Expense.findOneAndUpdate(
      { _id: req.params.expenseId, organizationId: orgId, deleted: { $ne: true } },
      {
        title: req.body.description || req.body.title || 'Expense',
        amount: Number(req.body.amount || 0),
        category: (req.body.category || 'other').toLowerCase(),
        date: req.body.date ? new Date(req.body.date) : undefined,
        description: req.body.description || '',
        projectId: req.body.projectId || undefined,
        isBusiness: req.body.billable === 'true' || req.body.billable === true,
        isPersonal: !(req.body.billable === 'true' || req.body.billable === true),
        updatedBy: req.user._id
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: updated });
  }));

  router.delete('/finance/expenses/:expenseId', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const updated = await Expense.findOneAndUpdate(
      { _id: req.params.expenseId, organizationId: orgId, deleted: { $ne: true } },
      { deleted: true, deletedAt: new Date(), deletedBy: req.user._id },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: updated });
  }));

  router.post('/finance/billing/generate-invoice', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const projectId = req.body.projectId;
    const project = await Project.findOne({ _id: projectId, orgId }).lean();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const timeEntries = await TimeEntry.find({ orgId, projectId, status: { $in: ['approved', 'submitted', 'draft'] } }).lean();
    const items = timeEntries.map((t) => ({
      description: t.description || t.task || 'Project Work',
      quantity: Number(t.hours || 0),
      unitPrice: Number(t.hourlyRate || project.hourlyRate || 0),
      total: Number(t.hours || 0) * Number(t.hourlyRate || project.hourlyRate || 0)
    }));
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const taxRate = Number(req.body?.options?.taxRate || 10);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    const invoiceNumber = await ensureInvoiceNumber(orgId);
    res.json({
      success: true,
      data: {
        invoiceNumber,
        clientId: project.clientId,
        projectId,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        items,
        subtotal,
        taxRate,
        taxAmount,
        total,
        status: 'draft'
      }
    });
  }));

  router.post('/finance/billing/recurring', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const invoice = await Invoice.create({
      ...req.body,
      orgId,
      invoiceNumber: await ensureInvoiceNumber(orgId, req.body.invoiceNumber),
      recurring: { enabled: true, frequency: req.body.recurringFrequency || 'monthly' }
    });
    res.status(201).json({ success: true, data: invoice });
  }));

  router.post('/finance/billing/process-recurring', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const recurring = await Invoice.find({ orgId, 'recurring.enabled': true }).limit(200).lean();
    let created = 0;
    for (const base of recurring) {
      const copy = { ...base };
      delete copy._id;
      delete copy.createdAt;
      delete copy.updatedAt;
      copy.invoiceNumber = await ensureInvoiceNumber(orgId);
      copy.issueDate = new Date();
      copy.dueDate = new Date(Date.now() + 30 * 86400000);
      copy.status = 'draft';
      await Invoice.create(copy);
      created += 1;
    }
    res.json({ success: true, data: { created } });
  }));

  router.post('/finance/billing/send-invoice/:invoiceId', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const invoice = await Invoice.findOneAndUpdate({ _id: req.params.invoiceId, orgId }, { status: 'sent' }, { new: true });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: { sent: true, invoice } });
  }));

  router.post('/finance/billing/payment-link/:invoiceId', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    res.json({ success: true, data: { url: `/pay/${req.params.invoiceId}`, expiresInHours: 72 } });
  }));

  const getProjectCostData = async (orgId, projectId) => {
    const [timeRows, expenseRows, invoices] = await Promise.all([
      TimeEntry.find({ orgId, projectId }).lean(),
      Expense.find({ organizationId: orgId, projectId, deleted: { $ne: true } }).lean(),
      Invoice.find({ orgId, 'items.projectId': projectId }).lean()
    ]);
    const laborCost = timeRows.reduce((s, t) => s + (Number(t.hours || 0) * Number(t.hourlyRate || 0)), 0);
    const expenseCost = expenseRows.reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalCost = laborCost + expenseCost;
    const totalRevenue = invoices.reduce((s, i) => s + Number(i.total || 0), 0);
    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    return { timeRows, expenseRows, invoices, laborCost, expenseCost, totalCost, totalRevenue, grossProfit, profitMargin };
  };

  router.get('/finance/projects/:projectId/costs', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const data = await getProjectCostData(orgId, req.params.projectId);
    res.json({ success: true, data: { totalHours: data.timeRows.reduce((s, t) => s + Number(t.hours || 0), 0), laborCost: data.laborCost, expenseCost: data.expenseCost, totalCost: data.totalCost } });
  }));

  router.get('/finance/projects/:projectId/profitability', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const data = await getProjectCostData(orgId, req.params.projectId);
    res.json({ success: true, data: { totalRevenue: data.totalRevenue, totalCost: data.totalCost, grossProfit: data.grossProfit, profitMargin: data.profitMargin, roi: data.totalCost > 0 ? data.grossProfit / data.totalCost : 0 } });
  }));

  router.get('/finance/projects/:projectId/budget-vs-actual', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const project = await Project.findOne({ _id: req.params.projectId, orgId }).lean();
    const data = await getProjectCostData(orgId, req.params.projectId);
    const budgeted = Number(project?.budget || 0);
    const variance = budgeted - data.totalCost;
    res.json({ success: true, data: { budgeted, actual: data.totalCost, variance, variancePercentage: budgeted > 0 ? (variance / budgeted) * 100 : 0 } });
  }));

  router.get('/finance/projects/:projectId/forecast', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const project = await Project.findOne({ _id: req.params.projectId, orgId }).lean();
    const data = await getProjectCostData(orgId, req.params.projectId);
    const daysElapsed = Math.max(1, Math.floor((Date.now() - new Date(project?.startDate || Date.now()).getTime()) / 86400000));
    const dailyBurn = data.totalCost / daysElapsed;
    const daysRemaining = Math.max(0, Math.floor((new Date(project?.endDate || Date.now()).getTime() - Date.now()) / 86400000));
    const forecastedCost = data.totalCost + (dailyBurn * daysRemaining);
    res.json({ success: true, data: { forecastedCost, totalForecastedCost: forecastedCost, monthlyForecast: [{ month: 'Current', forecastedCost: data.totalCost }, { month: 'Projected', forecastedCost }] } });
  }));

  router.get('/finance/projects/:projectId/resource-allocation', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const entries = await TimeEntry.find({ orgId, projectId: req.params.projectId }).populate('employeeId', 'fullName').lean();
    const byResource = new Map();
    entries.forEach((e) => {
      const key = String(e.employeeId?._id || e.employeeId || 'unknown');
      const name = e.employeeId?.fullName || 'Unknown';
      const prev = byResource.get(key) || { name, hours: 0, rate: 0, totalCost: 0 };
      prev.hours += Number(e.hours || 0);
      prev.rate = Number(e.hourlyRate || prev.rate || 0);
      prev.totalCost += Number(e.hours || 0) * Number(e.hourlyRate || 0);
      byResource.set(key, prev);
    });
    const resources = [...byResource.values()];
    res.json({ success: true, data: { resources, totalHours: resources.reduce((s, r) => s + r.hours, 0), totalCost: resources.reduce((s, r) => s + r.totalCost, 0) } });
  }));

  router.post('/finance/cash-flow/forecasts', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const date = req.body.date ? new Date(req.body.date) : new Date();
    const isInflow = req.body.type === 'inflow';
    const forecast = await CashFlowForecast.create({
      name: req.body.description || req.body.name || 'Cash Flow Forecast',
      period: { start: date, end: date },
      forecastType: req.body.recurringFrequency === 'quarterly' ? 'quarterly' : req.body.recurringFrequency === 'yearly' ? 'yearly' : 'monthly',
      scenarios: [{
        name: 'base',
        probability: 100,
        inflows: isInflow ? [{ date, amount: Number(req.body.amount || 0), description: req.body.description || '', category: req.body.category || '' }] : [],
        outflows: isInflow ? [] : [{ date, amount: Number(req.body.amount || 0), description: req.body.description || '', category: req.body.category || '' }]
      }],
      createdBy: req.user._id,
      orgId
    });
    res.status(201).json({ success: true, data: forecast });
  }));

  router.put('/finance/cash-flow/forecasts/:forecastId', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const date = req.body.date ? new Date(req.body.date) : new Date();
    const isInflow = req.body.type === 'inflow';
    const updated = await CashFlowForecast.findOneAndUpdate(
      { _id: req.params.forecastId, orgId },
      {
        name: req.body.description || req.body.name || 'Cash Flow Forecast',
        period: { start: date, end: date },
        forecastType: req.body.recurringFrequency === 'quarterly' ? 'quarterly' : req.body.recurringFrequency === 'yearly' ? 'yearly' : 'monthly',
        scenarios: [{
          name: 'base',
          probability: 100,
          inflows: isInflow ? [{ date, amount: Number(req.body.amount || 0), description: req.body.description || '', category: req.body.category || '' }] : [],
          outflows: isInflow ? [] : [{ date, amount: Number(req.body.amount || 0), description: req.body.description || '', category: req.body.category || '' }]
        }]
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Forecast not found' });
    res.json({ success: true, data: updated });
  }));

  router.delete('/finance/cash-flow/forecasts/:forecastId', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const deleted = await CashFlowForecast.findOneAndDelete({ _id: req.params.forecastId, orgId });
    if (!deleted) return res.status(404).json({ success: false, message: 'Forecast not found' });
    res.json({ success: true, data: deleted });
  }));

  router.get('/finance/cash-flow/forecast', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const months = Math.max(1, Math.min(Number(req.query.months || 12), 24));
    const now = new Date();
    const horizon = new Date(now.getFullYear(), now.getMonth() + months, now.getDate());
    const forecasts = await CashFlowForecast.find({ orgId, 'period.start': { $lte: horizon } }).sort({ 'period.start': 1 }).lean();
    const flat = [];
    forecasts.forEach((f) => {
      (f.scenarios || []).forEach((s) => {
        (s.inflows || []).forEach((x, idx) => flat.push({
          ...x,
          _id: `${String(f._id)}-in-${idx}`,
          forecastId: f._id,
          type: 'inflow',
          confidence: 'medium'
        }));
        (s.outflows || []).forEach((x, idx) => flat.push({
          ...x,
          _id: `${String(f._id)}-out-${idx}`,
          forecastId: f._id,
          type: 'outflow',
          confidence: 'medium'
        }));
      });
    });
    flat.sort((a, b) => new Date(a.date) - new Date(b.date));
    res.json({ success: true, data: { forecast: flat } });
  }));

  router.get('/finance/cash-flow/statement', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    const tx = await Transaction.find({ orgId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }).lean();
    const inflows = tx.filter((t) => t.type === 'revenue').reduce((s, t) => s + Number(t.amount || 0), 0);
    const outflows = tx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
    res.json({ success: true, data: { startDate, endDate, inflows, outflows, net: inflows - outflows, transactions: tx } });
  }));
};
