/**
 * Supra Admin - Billing routes
 */

const { express } = require('./shared');
const router = express.Router();
const {
  requirePlatformPermission,
  PLATFORM_PERMISSIONS,
  Billing,
  billingService,
  Tenant
} = require('./shared');

// Get billing overview
/**
 * @swagger
 * /api/supra-admin/billing/overview:
 *   get:
 *     summary: Get platform-wide billing overview
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: >
 *           Billing overview from billingService.getBillingOverview(). On error, still
 *           returns 200 with a zeroed-out fallback shape (see 500 response below for the
 *           same shape returned with a message field).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalRevenue:
 *                       type: number
 *                     monthlyRevenue:
 *                       type: number
 *                     pendingRevenue:
 *                       type: number
 *                     overdueRevenue:
 *                       type: number
 *                     totalInvoices:
 *                       type: integer
 *                     paidInvoices:
 *                       type: integer
 *                     pendingInvoices:
 *                       type: integer
 *                 monthlyTrend:
 *                   type: array
 *                   items:
 *                     type: object
 *                 planDistribution:
 *                   type: object
 *                 topCustomers:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/billing/overview', requirePlatformPermission(PLATFORM_PERMISSIONS.BILLING.READ), async (req, res) => {
  try {
    const overview = await billingService.getBillingOverview();
    res.json(overview);
  } catch (error) {
    console.error('Billing overview error:', error);
    res.status(500).json({
      message: 'Failed to fetch billing overview',
      summary: { totalRevenue: 0, monthlyRevenue: 0, pendingRevenue: 0, overdueRevenue: 0, totalInvoices: 0, paidInvoices: 0, pendingInvoices: 0 },
      monthlyTrend: [],
      planDistribution: {},
      topCustomers: []
    });
  }
});

// Create invoice
/**
 * @swagger
 * /api/supra-admin/billing/invoices:
 *   post:
 *     summary: Create an invoice for a tenant
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenantId]
 *             properties:
 *               tenantId:
 *                 type: string
 *               total:
 *                 type: number
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               invoiceNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invoice created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 invoice:
 *                   type: object
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoice:
 *                       type: object
 *       400:
 *         description: Tenant is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/billing/invoices', requirePlatformPermission(PLATFORM_PERMISSIONS.BILLING.INVOICES), async (req, res) => {
  try {
    const { tenantId, total, description, dueDate, invoiceNumber } = req.body;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Tenant is required' });
    }
    const invoice = await billingService.createInvoiceFromForm(
      { tenantId, total, description, dueDate, invoiceNumber },
      req.user._id
    );
    const formatted = {
      ...invoice.toObject(),
      total: invoice.totalAmount,
      status: invoice.paymentStatus,
      tenant: invoice.tenantId
    };
    res.status(201).json({ success: true, invoice: formatted, data: { invoice: formatted } });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create invoice' });
  }
});

// Update invoice (mark paid, etc.)
/**
 * @swagger
 * /api/supra-admin/billing/invoices/{id}:
 *   put:
 *     summary: Update an invoice's payment status
 *     description: >
 *       Marking an invoice `paid` clears `subscription.paymentFailedAt` and
 *       `subscription.readOnlyMode` on the associated tenant; marking it `failed` sets
 *       `subscription.paymentFailedAt` on the tenant.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, paid, failed, refunded, cancelled]
 *               paymentDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Invoice updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 invoice:
 *                   type: object
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/billing/invoices/:id', requirePlatformPermission(PLATFORM_PERMISSIONS.BILLING.INVOICES), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, paymentDate } = req.body;
    const invoice = await Billing.findById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    const newStatus = paymentStatus || status;
    if (newStatus) {
      const validStatuses = ['pending', 'paid', 'failed', 'refunded', 'cancelled'];
      invoice.paymentStatus = validStatuses.includes(newStatus) ? newStatus : (newStatus === 'sent' ? 'pending' : newStatus);
      if (invoice.paymentStatus === 'paid') {
        invoice.paidAt = paymentDate ? new Date(paymentDate) : new Date();
        if (invoice.tenantId) {
          await Tenant.updateOne(
            { _id: invoice.tenantId },
            { $unset: { 'subscription.paymentFailedAt': 1 }, $set: { 'subscription.readOnlyMode': false } }
          );
        }
      }
      if (invoice.paymentStatus === 'failed' && invoice.tenantId) {
        await Tenant.updateOne(
          { _id: invoice.tenantId },
          { $set: { 'subscription.paymentFailedAt': new Date() } }
        );
      }
    }
    await invoice.save();
    const populated = await Billing.findById(id).populate('tenantId', 'name slug email').lean();
    const formatted = {
      ...populated,
      total: populated.totalAmount,
      status: populated.paymentStatus,
      tenant: populated.tenantId
    };
    res.json({ success: true, invoice: formatted });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update invoice' });
  }
});

// Get all invoices
/**
 * @swagger
 * /api/supra-admin/billing/invoices:
 *   get:
 *     summary: List invoices across tenants, with pagination
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filters on paymentStatus
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated invoices (top-level `invoices`/`pagination` are duplicated inside `data` for legacy clients)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoices:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                 invoices:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/billing/invoices', requirePlatformPermission(PLATFORM_PERMISSIONS.BILLING.INVOICES), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, tenantId } = req.query;
    const filter = {};

    if (status) filter.paymentStatus = status;
    if (tenantId) filter.tenantId = tenantId;

    const invoices = await Billing.find(filter)
      .populate('tenantId', 'name slug email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Billing.countDocuments(filter);

    const invoicesFormatted = invoices.map(inv => ({
      ...inv,
      total: inv.totalAmount,
      status: inv.paymentStatus,
      tenant: inv.tenantId
    }));

    res.json({
      data: {
        invoices: invoicesFormatted,
        pagination: { current: page, pages: Math.ceil(total / limit), total }
      },
      invoices: invoicesFormatted,
      pagination: { current: page, pages: Math.ceil(total / limit), total }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Failed to fetch invoices' });
  }
});

module.exports = router;
