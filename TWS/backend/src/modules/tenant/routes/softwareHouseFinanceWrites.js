/**
 * Software-house finance write (and a few read) APIs used by tenant-ui.
 *
 * Mounted (see modules/tenant/routes/softwareHouse.js -> server.js) at:
 *   /api/tenant/{tenantSlug}/software-house
 * so every route below resolves to /api/tenant/{tenantSlug}/software-house/finance/...
 *
 * All queries below scope to `orgId` derived from `req.user.orgId`, which is set by
 * `unifiedSoftwareHouseAuth` (verifyERPToken) after verifying the JWT and cross-checking
 * tenant/workspace membership — never taken from req.params or req.body.
 *
 * NOTE: None of these routes use express-validator; request bodies are read directly
 * off req.body and coerced with Number()/Date() inline in each handler. The requestBody
 * schemas below document the fields the handler actually consumes, not a validated contract.
 */

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
    Expense,
    Transaction
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/invoices:
   *   post:
   *     summary: Create an invoice (invoice number auto-generated as INV-#### if not supplied)
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
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
   *               clientId:
   *                 type: string
   *               clientName:
   *                 type: string
   *               clientEmail:
   *                 type: string
   *               issueDate:
   *                 type: string
   *                 format: date-time
   *               dueDate:
   *                 type: string
   *                 format: date-time
   *               subtotal:
   *                 type: number
   *               taxAmount:
   *                 type: number
   *               total:
   *                 type: number
   *               paidAmount:
   *                 type: number
   *                 default: 0
   *               status:
   *                 type: string
   *                 default: draft
   *               paymentTerms:
   *                 type: string
   *                 enum: [net_15, net_30, net_45, net_60, due_on_receipt]
   *                 default: net_30
   *     responses:
   *       201:
   *         description: Invoice created (Invoice.currency defaults to USD; not settable here)
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/invoices/{invoiceId}:
   *   put:
   *     summary: Update an invoice
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: invoiceId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             description: Same shape as POST /finance/invoices; recomputes items/subtotal/taxAmount/total/paidAmount/remainingAmount server-side
   *     responses:
   *       200:
   *         description: Updated invoice (query scoped to { _id, orgId })
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/invoices/{invoiceId}:
   *   delete:
   *     summary: Delete an invoice
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: invoiceId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Deleted invoice (query scoped to { _id, orgId })
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  router.delete('/finance/invoices/:invoiceId', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const deleted = await Invoice.findOneAndDelete({ _id: req.params.invoiceId, orgId });
    if (!deleted) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: deleted });
  }));

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/invoices/{invoiceId}/payments:
   *   post:
   *     summary: Record a payment against an invoice
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: invoiceId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               amount:
   *                 type: number
   *                 description: Added to Invoice.paidAmount (Number); no cap enforced against total server-side
   *               paymentDate:
   *                 type: string
   *                 format: date-time
   *               paymentMethod:
   *                 type: string
   *     responses:
   *       200:
   *         description: Updated invoice; status set to paid if remainingAmount <= 0, else partially_paid
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/accounts-receivable/{invoiceId}/payment:
   *   post:
   *     summary: Record a payment against an invoice (accounts-receivable alias of POST /finance/invoices/{invoiceId}/payments)
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: invoiceId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               amount:
   *                 type: number
   *               paymentDate:
   *                 type: string
   *                 format: date-time
   *               paymentMethod:
   *                 type: string
   *     responses:
   *       200:
   *         description: Updated invoice; status set to paid if remainingAmount <= 0, else partially_paid
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/accounts-receivable/{invoiceId}/reminder:
   *   post:
   *     summary: Send a payment reminder for an invoice (stub — does not actually send an email/notification)
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: invoiceId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: "{ invoiceId, reminderSent: true, sentAt } — no actual delivery side effect in this handler"
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  router.post('/finance/accounts-receivable/:invoiceId/reminder', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const invoice = await Invoice.findOne({ _id: req.params.invoiceId, orgId });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: { invoiceId: invoice._id, reminderSent: true, sentAt: new Date() } });
  }));

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/accounts-receivable/aging:
   *   get:
   *     summary: Get accounts-receivable aging buckets (0-30, 31-60, 61-90, 90+ days)
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
   *         description: Aging bucket totals (Number) for open invoices scoped to the tenant's organization
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/accounts-receivable/clients/{clientId}/history:
   *   get:
   *     summary: List a client's invoice history
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: clientId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Invoices for the given client, scoped to the tenant's organization, sorted by issue date descending
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
  router.get('/finance/accounts-receivable/clients/:clientId/history', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const invoices = await Invoice.find({ orgId, clientId: req.params.clientId }).sort({ issueDate: -1 }).lean();
    res.json({ success: true, data: invoices });
  }));

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/bills:
   *   post:
   *     summary: Create a vendor bill (bill number auto-generated as BILL-#### if not supplied)
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
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
   *               vendorId:
   *                 type: string
   *               vendorName:
   *                 type: string
   *               vendorEmail:
   *                 type: string
   *               billDate:
   *                 type: string
   *                 format: date-time
   *               dueDate:
   *                 type: string
   *                 format: date-time
   *               subtotal:
   *                 type: number
   *               taxAmount:
   *                 type: number
   *               total:
   *                 type: number
   *               requiresApproval:
   *                 type: boolean
   *                 description: If true, status is forced to pending_approval regardless of the status field
   *               status:
   *                 type: string
   *                 default: draft
   *               paidAmount:
   *                 type: number
   *                 default: 0
   *     responses:
   *       201:
   *         description: Bill created (Bill.currency defaults to USD; not settable here)
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/bills/{billId}:
   *   put:
   *     summary: Update a vendor bill
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: billId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             description: Same shape as POST /finance/bills; recomputes items/subtotal/taxAmount/total server-side
   *     responses:
   *       200:
   *         description: Updated bill (query scoped to { _id, orgId })
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/bills/{billId}:
   *   delete:
   *     summary: Delete a vendor bill
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: billId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Deleted bill (query scoped to { _id, orgId })
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  router.delete('/finance/bills/:billId', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const deleted = await Bill.findOneAndDelete({ _id: req.params.billId, orgId });
    if (!deleted) return res.status(404).json({ success: false, message: 'Bill not found' });
    res.json({ success: true, data: deleted });
  }));

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/bills/{billId}/payments:
   *   post:
   *     summary: Record a payment against a vendor bill
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: billId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               amount:
   *                 type: number
   *                 description: Added to Bill.paidAmount (Number); no cap enforced against total server-side
   *               paymentDate:
   *                 type: string
   *                 format: date-time
   *               paymentMethod:
   *                 type: string
   *     responses:
   *       200:
   *         description: Updated bill; status set to paid if fully paid, else approved
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/accounts-payable/{billId}/payment:
   *   post:
   *     summary: Record a payment against a vendor bill (accounts-payable alias of POST /finance/bills/{billId}/payments)
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: billId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               amount:
   *                 type: number
   *               paymentDate:
   *                 type: string
   *                 format: date-time
   *               paymentMethod:
   *                 type: string
   *     responses:
   *       200:
   *         description: Updated bill; status set to paid if fully paid, else approved
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/accounts-payable/{billId}/schedule:
   *   post:
   *     summary: Schedule a future payment for a vendor bill (appends a note; does not create a real scheduled-payment record)
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: billId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             description: Arbitrary payload — JSON-stringified and appended to Bill.notes verbatim
   *     responses:
   *       200:
   *         description: "{ scheduled: true, billId }"
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  router.post('/finance/accounts-payable/:billId/schedule', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const bill = await Bill.findOne({ _id: req.params.billId, orgId });
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
    bill.notes = `${bill.notes || ''}\nScheduled payment: ${JSON.stringify(req.body)}`.trim();
    await bill.save();
    res.json({ success: true, data: { scheduled: true, billId: bill._id } });
  }));

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/accounts-payable/{billId}/approve:
   *   post:
   *     summary: Approve a vendor bill (sets status to approved)
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: billId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Updated bill with status=approved
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  router.post('/finance/accounts-payable/:billId/approve', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const bill = await Bill.findOne({ _id: req.params.billId, orgId });
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
    bill.status = 'approved';
    await bill.save();
    res.json({ success: true, data: bill });
  }));

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/accounts-payable/aging:
   *   get:
   *     summary: Get accounts-payable aging buckets (0-30, 31-60, 61-90, 90+ days)
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
   *         description: Aging bucket totals (Number) for open bills scoped to the tenant's organization
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/accounts-payable/vendors/{vendorId}/history:
   *   get:
   *     summary: List a vendor's bill history
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: vendorId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Bills for the given vendor, scoped to the tenant's organization, sorted by bill date descending
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
  router.get('/finance/accounts-payable/vendors/:vendorId/history', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const bills = await Bill.find({ orgId, vendorId: req.params.vendorId }).sort({ billDate: -1 }).lean();
    res.json({ success: true, data: bills });
  }));

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/vendors:
   *   post:
   *     summary: Create a vendor
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               email:
   *                 type: string
   *               paymentTerms:
   *                 type: string
   *                 enum: [net_15, net_30, net_45, net_60, due_on_receipt]
   *                 default: net_30
   *     responses:
   *       201:
   *         description: Vendor created
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/chart-of-accounts:
   *   post:
   *     summary: Create a chart-of-accounts entry
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               code:
   *                 type: string
   *               name:
   *                 type: string
   *               type:
   *                 type: string
   *                 enum: [asset, liability, equity, revenue, expense]
   *               level:
   *                 type: integer
   *     responses:
   *       201:
   *         description: Chart of accounts entry created
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
  router.post('/finance/chart-of-accounts', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const created = await ChartOfAccounts.create({ ...req.body, orgId });
    res.status(201).json({ success: true, data: created });
  }));

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/chart-of-accounts/{accountId}:
   *   put:
   *     summary: Update a chart-of-accounts entry
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: accountId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             description: Passed through to ChartOfAccounts.findOneAndUpdate as-is
   *     responses:
   *       200:
   *         description: Updated chart-of-accounts entry (query scoped to { _id, orgId })
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  router.put('/finance/chart-of-accounts/:accountId', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const updated = await ChartOfAccounts.findOneAndUpdate({ _id: req.params.accountId, orgId }, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({ success: true, data: updated });
  }));

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/chart-of-accounts/{accountId}:
   *   delete:
   *     summary: Delete a chart-of-accounts entry
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: accountId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Deleted chart-of-accounts entry (query scoped to { _id, orgId })
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  router.delete('/finance/chart-of-accounts/:accountId', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const deleted = await ChartOfAccounts.findOneAndDelete({ _id: req.params.accountId, orgId });
    if (!deleted) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({ success: true, data: deleted });
  }));

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/chart-of-accounts/templates/{templateName}:
   *   post:
   *     summary: Seed a starter chart-of-accounts template (upsert, no-op on existing codes)
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: templateName
   *         required: true
   *         schema:
   *           type: string
   *         description: "'enterprise' uses an 8-account template; any other value uses a 6-account starter template"
   *     responses:
   *       200:
   *         description: "{ template, inserted } — inserted is the number of template rows attempted (bulkWrite upserts on {orgId, code})"
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/expenses:
   *   get:
   *     summary: List (non-deleted) expenses
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
   *         description: Expense.amount is a Number; query is scoped to { organizationId, deleted != true }
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/expenses:
   *   post:
   *     summary: Create an expense (multipart/form-data; no file field is stored — upload.none() only parses text fields)
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               employeeId:
   *                 type: string
   *                 description: Defaults to the authenticated user's id if omitted
   *               description:
   *                 type: string
   *               title:
   *                 type: string
   *               amount:
   *                 type: number
   *               category:
   *                 type: string
   *                 enum: [food, transportation, shopping, entertainment, utilities, housing, business, gifts, travel, other]
   *               date:
   *                 type: string
   *                 format: date-time
   *               projectId:
   *                 type: string
   *               billable:
   *                 type: boolean
   *                 description: Maps to Expense.isBusiness / isPersonal (inverse)
   *     responses:
   *       201:
   *         description: Expense created
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/expenses/{expenseId}:
   *   put:
   *     summary: Update an expense (multipart/form-data)
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: expenseId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             description: Same fields as POST /finance/expenses
   *     responses:
   *       200:
   *         description: Updated expense (query scoped to { _id, organizationId, deleted != true })
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/expenses/{expenseId}:
   *   delete:
   *     summary: Soft-delete an expense
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: expenseId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Expense marked deleted (deleted=true, deletedAt, deletedBy); not physically removed
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/billing/generate-invoice:
   *   post:
   *     summary: Preview a draft invoice generated from a project's unbilled time entries (does not persist an Invoice document)
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [projectId]
   *             properties:
   *               projectId:
   *                 type: string
   *               options:
   *                 type: object
   *                 properties:
   *                   taxRate:
   *                     type: number
   *                     default: 10
   *                     description: Percentage
   *     responses:
   *       200:
   *         description: Generated (unsaved) invoice preview built from TimeEntry.hours * hourlyRate for approved/submitted/draft entries
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/billing/recurring:
   *   post:
   *     summary: Create a recurring invoice
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             description: Same fields as POST /finance/invoices, plus recurringFrequency
   *             properties:
   *               recurringFrequency:
   *                 type: string
   *                 enum: [monthly, quarterly, yearly]
   *                 default: monthly
   *     responses:
   *       201:
   *         description: Invoice created with recurring.enabled=true
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/billing/process-recurring:
   *   post:
   *     summary: Generate the next invoice copy for every recurring invoice (up to 200) in the tenant's organization
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
   *         description: "{ created } — number of new draft invoices generated from recurring templates"
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/billing/send-invoice/{invoiceId}:
   *   post:
   *     summary: Mark an invoice as sent (does not actually deliver an email)
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: invoiceId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: "{ sent: true, invoice } with status set to sent"
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  router.post('/finance/billing/send-invoice/:invoiceId', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const invoice = await Invoice.findOneAndUpdate({ _id: req.params.invoiceId, orgId }, { status: 'sent' }, { new: true });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: { sent: true, invoice } });
  }));

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/billing/payment-link/{invoiceId}:
   *   post:
   *     summary: Generate a payment link for an invoice (stub — returns a placeholder URL, no invoice lookup or tenant scoping performed)
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: invoiceId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: "{ url, expiresInHours: 72 } — invoiceId is echoed into the URL without verifying it exists or belongs to this org"
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/projects/{projectId}/costs:
   *   get:
   *     summary: Get labor + expense cost totals for a project
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: "{ totalHours, laborCost, expenseCost, totalCost } — all Number, computed from TimeEntry and Expense scoped to the tenant's organization"
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
  router.get('/finance/projects/:projectId/costs', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const data = await getProjectCostData(orgId, req.params.projectId);
    res.json({ success: true, data: { totalHours: data.timeRows.reduce((s, t) => s + Number(t.hours || 0), 0), laborCost: data.laborCost, expenseCost: data.expenseCost, totalCost: data.totalCost } });
  }));

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/projects/{projectId}/profitability:
   *   get:
   *     summary: Get revenue/cost/profit/ROI for a project
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: "{ totalRevenue, totalCost, grossProfit, profitMargin, roi } — all Number, computed from TimeEntry/Expense/Invoice scoped to the tenant's organization"
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
  router.get('/finance/projects/:projectId/profitability', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const data = await getProjectCostData(orgId, req.params.projectId);
    res.json({ success: true, data: { totalRevenue: data.totalRevenue, totalCost: data.totalCost, grossProfit: data.grossProfit, profitMargin: data.profitMargin, roi: data.totalCost > 0 ? data.grossProfit / data.totalCost : 0 } });
  }));

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/projects/{projectId}/budget-vs-actual:
   *   get:
   *     summary: Compare a project's budget against actual cost
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: "{ budgeted, actual, variance, variancePercentage } — all Number; budgeted read from Project.budget scoped to { _id, orgId }"
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
  router.get('/finance/projects/:projectId/budget-vs-actual', unifiedSoftwareHouseAuth, shFinanceRead, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const project = await Project.findOne({ _id: req.params.projectId, orgId }).lean();
    const data = await getProjectCostData(orgId, req.params.projectId);
    const budgeted = Number(project?.budget || 0);
    const variance = budgeted - data.totalCost;
    res.json({ success: true, data: { budgeted, actual: data.totalCost, variance, variancePercentage: budgeted > 0 ? (variance / budgeted) * 100 : 0 } });
  }));

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/projects/{projectId}/forecast:
   *   get:
   *     summary: Get a simple linear cost forecast for a project (based on current daily burn rate)
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: "{ forecastedCost, totalForecastedCost, monthlyForecast } — Number, derived from days elapsed/remaining against Project.startDate/endDate"
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/projects/{projectId}/resource-allocation:
   *   get:
   *     summary: Get per-resource (employee) hours and cost allocation for a project
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: "{ resources: [{ name, hours, rate, totalCost }], totalHours, totalCost } — computed from TimeEntry scoped to the tenant's organization"
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/cash-flow/forecasts:
   *   post:
   *     summary: Create a cash flow forecast entry (single inflow or outflow wrapped in a "base" scenario)
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               type:
   *                 type: string
   *                 enum: [inflow, outflow]
   *               amount:
   *                 type: number
   *               description:
   *                 type: string
   *               category:
   *                 type: string
   *               date:
   *                 type: string
   *                 format: date-time
   *               recurringFrequency:
   *                 type: string
   *                 enum: [monthly, quarterly, yearly]
   *     responses:
   *       201:
   *         description: CashFlowForecast created
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/cash-flow/forecasts/{forecastId}:
   *   put:
   *     summary: Update a cash flow forecast entry (replaces its single "base" scenario)
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: forecastId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             description: Same fields as POST /finance/cash-flow/forecasts
   *     responses:
   *       200:
   *         description: Updated forecast (query scoped to { _id, orgId })
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/cash-flow/forecasts/{forecastId}:
   *   delete:
   *     summary: Delete a cash flow forecast
   *     tags: [Software House Finance]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: tenantSlug
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: forecastId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Deleted forecast (query scoped to { _id, orgId })
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  router.delete('/finance/cash-flow/forecasts/:forecastId', unifiedSoftwareHouseAuth, shFinanceWrite, ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = toOrgObjectId(req.user.orgId, mongoose);
    const deleted = await CashFlowForecast.findOneAndDelete({ _id: req.params.forecastId, orgId });
    if (!deleted) return res.status(404).json({ success: false, message: 'Forecast not found' });
    res.json({ success: true, data: deleted });
  }));

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/cash-flow/forecast:
   *   get:
   *     summary: Get flattened forecast entries within a rolling window
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
   *         name: months
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 24
   *           default: 12
   *         description: Not validated server-side beyond parseInt + clamp
   *     responses:
   *       200:
   *         description: "{ forecast: [...] } — flattened inflow/outflow entries (amount is Number) whose forecast period starts within the window"
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
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

  /**
   * @swagger
   * /api/tenant/{tenantSlug}/software-house/finance/cash-flow/statement:
   *   get:
   *     summary: Get an inflow/outflow cash-flow statement for a date range
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
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Defaults to the first day of the current month
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Defaults to now
   *     responses:
   *       200:
   *         description: Intended response is { startDate, endDate, inflows, outflows, net, transactions } (Number amounts) — currently unreachable, see description
   *       500:
   *         $ref: '#/components/responses/ServerError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         $ref: '#/components/responses/ForbiddenError'
   */
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
