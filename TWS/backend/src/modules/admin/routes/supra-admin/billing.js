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
