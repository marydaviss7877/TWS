/**
 * Billing Service
 * Handles billing operations, invoices, and billing overview
 * Pricing: $10/org flat rate, 7 days free trial
 */

const Billing = require('../models/Billing');
const Tenant = require('../models/Tenant');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Organization = require('../models/Organization');
const billingConfig = require('../config/billingConfig');

class BillingService {
  /**
   * Get billing overview statistics
   */
  async getBillingOverview() {
    const emptyOverview = {
      summary: {
        totalRevenue: 0,
        monthlyRevenue: 0,
        pendingRevenue: 0,
        overdueRevenue: 0,
        totalInvoices: 0,
        paidInvoices: 0,
        pendingInvoices: 0
      },
      monthlyTrend: [],
      planDistribution: {},
      topCustomers: []
    };

    try {
      // Get total revenue
      const totalRevenue = await Billing.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);

      // Get pending revenue
      const pendingRevenue = await Billing.aggregate([
        { $match: { paymentStatus: 'pending' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);

      // Get invoice counts by status
      const invoiceCounts = await Billing.aggregate([
        { $group: { _id: '$paymentStatus', count: { $sum: 1 } } }
      ]);

      // Get monthly revenue (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyRevenue = await Billing.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: sixMonthsAgo } } },
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      // Get tenants by plan (subscription.plan) — Software House only (billing applies to software_house only)
      let tenantsByPlan = [];
      let billingEligibleCount = 0;
      let totalTenantCount = 0;
      try {
        totalTenantCount = await Tenant.countDocuments({});
        billingEligibleCount = await Tenant.countDocuments({ erpCategory: 'software_house' });
        tenantsByPlan = await Tenant.aggregate([
          { $match: { erpCategory: 'software_house' } },
          { $group: { _id: '$subscription.plan', count: { $sum: 1 } } }
        ]);
      } catch (tenantErr) {
        console.warn('Tenant plan aggregation failed (non-critical):', tenantErr.message);
      }

      // Get top customers by revenue — only Software House tenants
      let topCustomers = [];
      try {
        const topCustomersRaw = await Billing.aggregate([
          { $match: { paymentStatus: 'paid' } },
          { $group: { _id: '$tenantId', revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
          { $sort: { revenue: -1 } },
          { $limit: 10 }
        ]);
        for (const c of topCustomersRaw) {
          const tenant = await Tenant.findById(c._id).select('name erpCategory').lean();
          if (tenant?.erpCategory === 'software_house') {
            topCustomers.push({
              name: tenant?.name || 'Unknown',
              revenue: c.revenue,
              totalRevenue: c.revenue
            });
          }
        }
      } catch (topErr) {
        console.warn('Top customers aggregation failed (non-critical):', topErr.message);
      }

      const paidInvoices = (invoiceCounts.find(i => i._id === 'paid') || {}).count || 0;
      const pendingInvoices = (invoiceCounts.find(i => i._id === 'pending') || {}).count || 0;

      return {
        summary: {
          totalRevenue: (totalRevenue[0] && totalRevenue[0].total) || 0,
          monthlyRevenue: (monthlyRevenue.length > 0 && monthlyRevenue[monthlyRevenue.length - 1].revenue) || 0,
          pendingRevenue: (pendingRevenue[0] && pendingRevenue[0].total) || 0,
          overdueRevenue: 0,
          totalInvoices: invoiceCounts.reduce((sum, item) => sum + (item.count || 0), 0),
          paidInvoices,
          pendingInvoices
        },
        monthlyTrend: monthlyRevenue.map(item => ({
          month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          revenue: item.revenue,
          count: item.count
        })),
        planDistribution: tenantsByPlan.reduce((acc, item) => {
          acc[item._id || 'trial'] = item.count;
          return acc;
        }, {}),
        billingEligibleCount,
        totalTenantCount,
        topCustomers
      };
    } catch (error) {
      console.error('Error getting billing overview:', error);
      // Return empty structure instead of throwing - prevents 500 on frontend
      return emptyOverview;
    }
  }

  /**
   * Ensure default org and subscription plan exist for platform billing
   */
  async ensureBillingDefaults() {
    let defaultOrg = await Organization.findOne({ slug: 'tws-platform' });
    if (!defaultOrg) {
      defaultOrg = await Organization.create({
        name: 'TWS Platform',
        slug: 'tws-platform',
        description: 'Platform billing organization',
        status: 'active'
      });
    }

    let defaultPlan = await SubscriptionPlan.findOne({ name: 'Standard' });
    if (!defaultPlan) {
      defaultPlan = await SubscriptionPlan.create({
        name: 'Standard',
        displayName: 'Standard Plan',
        description: 'Standard $10/org monthly plan',
        type: 'basic',
        category: 'organization',
        pricing: {
          monthly: 10,
          yearly: 100,
          currency: 'USD',
          billingCycle: 'monthly'
        },
        limits: {
          users: { max: 50, unlimited: false },
          projects: { max: 25, unlimited: false },
          storage: { max: 10737418240, unlimited: false },
          apiCalls: { max: 10000, unlimited: false }
        },
        features: {},
        status: 'active'
      });
    }

    return { defaultOrg, defaultPlan };
  }

  /**
   * Create manual invoice
   */
  async createManualInvoice(data, adminId) {
    try {
      const {
        tenantId,
        orgId,
        subscriptionPlan,
        billingCycle = 'monthly',
        basePrice = billingConfig.PRICE_PER_ORG,
        additionalUsers = 0,
        additionalUserPrice = 0,
        lineItems = [],
        notes,
        billingPeriodStart,
        billingPeriodEnd,
        dueDate,
        paymentMethod = 'bank_transfer',
        taxRate = 0
      } = data;

      // Validate tenant exists
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Calculate totals from line items if provided
      let subtotal = basePrice || 0;
      if (lineItems && lineItems.length > 0) {
        subtotal = lineItems.reduce((sum, item) => {
          return sum + (item.quantity * item.unitPrice);
        }, 0);
      }

      // Add additional user charges
      const additionalUserCharges = additionalUsers * additionalUserPrice;
      subtotal += additionalUserCharges;

      // Calculate tax
      const taxAmount = subtotal * (taxRate / 100);

      // Calculate total
      const totalAmount = subtotal + taxAmount;

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Set billing period dates if not provided
      const periodStart = billingPeriodStart || new Date();
      const periodEnd = billingPeriodEnd || new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      
      const invoiceDueDate = dueDate || new Date(periodEnd);
      invoiceDueDate.setDate(invoiceDueDate.getDate() + 7); // 7 days after period end

      // Get orgId from tenant if not provided - use platform default
      let finalOrgId = orgId || tenant.orgId;
      if (!finalOrgId) {
        const { defaultOrg } = await this.ensureBillingDefaults();
        finalOrgId = defaultOrg._id;
      }

      // Get subscription plan - use platform default if not provided
      let finalSubscriptionPlan = subscriptionPlan || tenant.subscriptionPlan;
      if (!finalSubscriptionPlan) {
        const { defaultPlan } = await this.ensureBillingDefaults();
        finalSubscriptionPlan = defaultPlan._id;
      }

      // Create invoice
      const invoice = new Billing({
        tenantId,
        orgId: finalOrgId,
        subscriptionPlan: finalSubscriptionPlan,
        billingCycle,
        basePrice: basePrice || subtotal - additionalUserCharges,
        additionalUsers,
        additionalUserPrice,
        totalAmount,
        paymentMethod,
        paymentStatus: 'pending',
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        dueDate: invoiceDueDate,
        invoiceNumber,
        taxRate,
        taxAmount,
        notes,
        metadata: {
          createdBy: adminId,
          createdManually: true,
          lineItems: lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice
          }))
        },
        status: 'active'
      });

      await invoice.save();

      // Populate related data
      await invoice.populate('tenantId', 'name slug email');
      await invoice.populate('subscriptionPlan', 'name price');
      if (invoice.orgId) {
        await invoice.populate('orgId', 'name slug');
      }

      return invoice;
    } catch (error) {
      console.error('Error creating manual invoice:', error);
      throw error;
    }
  }

  /**
   * Create invoice from Supra Admin form (simplified)
   * @param {Object} data - { tenantId, total, description, dueDate?, invoiceNumber? }
   * @param {string} adminId - Admin user ID
   */
  async createInvoiceFromForm(data, adminId) {
    const { tenantId, total, description, dueDate, invoiceNumber } = data;
    const amount = parseFloat(total) || 10;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const { defaultOrg, defaultPlan } = await this.ensureBillingDefaults();

    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const invoiceDueDate = dueDate ? new Date(dueDate) : new Date(periodEnd);
    invoiceDueDate.setDate(invoiceDueDate.getDate() + 7);

    const invNumber = invoiceNumber || await this.generateInvoiceNumber();

    const invoice = new Billing({
      tenantId,
      orgId: defaultOrg._id,
      subscriptionPlan: defaultPlan._id,
      billingCycle: 'monthly',
      basePrice: amount,
      totalAmount: amount,
      paymentMethod: 'bank_transfer',
      paymentStatus: 'pending',
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
      dueDate: invoiceDueDate,
      invoiceNumber: invNumber,
      notes: description,
      metadata: {
        createdBy: adminId,
        createdManually: true,
        lineItems: [{ description: description || 'Subscription Fee ($10/org)', quantity: 1, unitPrice: amount, total: amount }]
      },
      status: 'active'
    });

    await invoice.save();
    await invoice.populate('tenantId', 'name slug email');
    return invoice;
  }

  /**
   * Generate unique invoice number
   */
  async generateInvoiceNumber() {
    const prefix = 'INV';
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Find the last invoice for this month
    const lastInvoice = await Billing.findOne({
      invoiceNumber: new RegExp(`^${prefix}-${year}${month}`)
    })
      .sort({ invoiceNumber: -1 })
      .select('invoiceNumber')
      .lean();

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[2] || '0');
      sequence = lastSequence + 1;
    }

    const invoiceNumber = `${prefix}-${year}${month}-${String(sequence).padStart(4, '0')}`;
    
    // Verify it's unique (in case of race condition)
    const exists = await Billing.findOne({ invoiceNumber });
    if (exists) {
      // If exists, try next number
      return this.generateInvoiceNumber();
    }

    return invoiceNumber;
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(invoiceId) {
    try {
      const invoice = await Billing.findById(invoiceId)
        .populate('tenantId', 'name slug email')
        .populate('subscriptionPlan', 'name price')
        .populate('orgId', 'name slug');

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      return invoice;
    } catch (error) {
      console.error('Error getting invoice:', error);
      throw error;
    }
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(invoiceId, status, paymentData = {}) {
    try {
      const invoice = await Billing.findById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      invoice.paymentStatus = status;
      
      if (status === 'paid') {
        invoice.paidAt = new Date();
        if (paymentData.paymentMethod) {
          invoice.paymentMethod = paymentData.paymentMethod;
        }
        if (paymentData.transactionId) {
          invoice.paymentProcessor = {
            provider: paymentData.provider || 'manual',
            transactionId: paymentData.transactionId
          };
        }
      }

      await invoice.save();

      return invoice;
    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new BillingService();

