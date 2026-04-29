const express = require('express');
const router = express.Router();
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
router.use(verifyERPToken);
const Partner = require('../../../models/org/Partner');
const Tenant = require('../../../models/tenant/Tenant');
const SubscriptionPlan = require('../../../models/finance/SubscriptionPlan');
const { checkFeatureAccess } = require('../../../middleware/common/featureGate');
const auditLogService = require('../../../services/compliance/audit-log.service');

/**
 * @route   GET /api/partners
 * @desc    Get all partners (admin only)
 * @access  Private (Admin)
 */
router.get('/', checkFeatureAccess('partnerManagement'), async (req, res) => {
  try {
    const { 
      status = 'all', 
      limit = 20, 
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    if (status !== 'all') {
      query.status = status;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const partners = await Partner.find(query)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('referredTenants', 'name subscription.plan subscription.status createdAt');

    const total = await Partner.countDocuments(query);

    res.json({
      success: true,
      data: {
        partners,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch partners',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/partners/:partnerId
 * @desc    Get specific partner details
 * @access  Private
 */
router.get('/:partnerId', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { orgId } = req.user;

    const partner = await Partner.findById(partnerId)
      .populate('referredTenants', 'name subscription.plan subscription.status createdAt');

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    // Check if user has access to this partner
    if (req.user.role !== 'admin' && partner.contactEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Calculate partner performance metrics
    const performance = {
      totalTenants: partner.referredTenants.length,
      activeTenants: partner.referredTenants.filter(t => t.subscription.status === 'active').length,
      totalCommission: partner.commissionHistory.reduce((sum, comm) => sum + comm.amount, 0),
      monthlyRecurringRevenue: partner.referredTenants
        .filter(t => t.subscription.status === 'active')
        .reduce((sum, t) => {
          const plan = SubscriptionPlan.findOne({ slug: t.subscription.plan });
          return sum + (plan ? plan.pricing.monthly : 0);
        }, 0)
    };

    res.json({
      success: true,
      data: {
        partner,
        performance
      }
    });
  } catch (error) {
    console.error('Error fetching partner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch partner',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/partners
 * @desc    Create new partner
 * @access  Private (Admin)
 */
router.post('/', checkFeatureAccess('partnerManagement'), async (req, res) => {
  try {
    const {
      name,
      contactPerson,
      contactEmail,
      phone,
      address,
      commissionRate,
      whiteLabelEnabled,
      customDomain,
      branding
    } = req.body;

    // Check if partner with email already exists
    const existingPartner = await Partner.findOne({ contactEmail });
    if (existingPartner) {
      return res.status(400).json({
        success: false,
        message: 'Partner with this email already exists'
      });
    }

    // Generate unique partner code
    const partnerCode = await generatePartnerCode();

    const partner = new Partner({
      name,
      contactPerson,
      contactEmail,
      phone,
      address,
      partnerCode,
      commissionRate: commissionRate || 0,
      whiteLabelEnabled: whiteLabelEnabled || false,
      customDomain,
      branding,
      status: 'pending'
    });

    await partner.save();

    // Log the action
    await auditLogService.recordLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      action: 'CREATE_PARTNER',
      entityType: 'Partner',
      entityId: partner._id,
      changes: { newValues: partner.toObject() }
    });

    res.status(201).json({
      success: true,
      message: 'Partner created successfully',
      data: partner
    });
  } catch (error) {
    console.error('Error creating partner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create partner',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/partners/:partnerId
 * @desc    Update partner
 * @access  Private
 */
router.put('/:partnerId', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { orgId } = req.user;

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    // Check if user has access to update this partner
    if (req.user.role !== 'admin' && partner.contactEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const oldValues = partner.toObject();
    const allowedUpdates = [
      'name', 'contactPerson', 'phone', 'address', 'commissionRate',
      'whiteLabelEnabled', 'customDomain', 'branding', 'status'
    ];

    // Only allow admins to update certain fields
    if (req.user.role !== 'admin') {
      allowedUpdates.splice(allowedUpdates.indexOf('commissionRate'), 1);
      allowedUpdates.splice(allowedUpdates.indexOf('status'), 1);
    }

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    Object.assign(partner, updates);
    await partner.save();

    // Log the action
    await auditLogService.recordLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      action: 'UPDATE_PARTNER',
      entityType: 'Partner',
      entityId: partner._id,
      changes: { oldValues, newValues: partner.toObject() }
    });

    res.json({
      success: true,
      message: 'Partner updated successfully',
      data: partner
    });
  } catch (error) {
    console.error('Error updating partner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update partner',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/partners/:partnerId
 * @desc    Delete partner
 * @access  Private (Admin)
 */
router.delete('/:partnerId', checkFeatureAccess('partnerManagement'), async (req, res) => {
  try {
    const { partnerId } = req.params;

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    // Check if partner has referred tenants
    if (partner.referredTenants.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete partner with referred tenants. Please reassign tenants first.'
      });
    }

    await Partner.findByIdAndDelete(partnerId);

    // Log the action
    await auditLogService.recordLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      action: 'DELETE_PARTNER',
      entityType: 'Partner',
      entityId: partnerId,
      changes: { oldValues: partner.toObject() }
    });

    res.json({
      success: true,
      message: 'Partner deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting partner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete partner',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/partners/:partnerId/tenants
 * @desc    Get tenants referred by partner
 * @access  Private
 */
router.get('/:partnerId/tenants', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { 
      status = 'all',
      limit = 20,
      offset = 0
    } = req.query;

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    // Check if user has access to this partner's data
    if (req.user.role !== 'admin' && partner.contactEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const query = { _id: { $in: partner.referredTenants } };
    if (status !== 'all') {
      query['subscription.status'] = status;
    }

    const tenants = await Tenant.find(query)
      .select('name subscription.plan subscription.status subscription.price createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Tenant.countDocuments(query);

    res.json({
      success: true,
      data: {
        tenants,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching partner tenants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch partner tenants',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/partners/:partnerId/commission
 * @desc    Get partner commission history
 * @access  Private
 */
router.get('/:partnerId/commission', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { 
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = req.query;

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    // Check if user has access to this partner's data
    if (req.user.role !== 'admin' && partner.contactEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    let commissionHistory = partner.commissionHistory;

    // Filter by date range if provided
    if (startDate || endDate) {
      commissionHistory = commissionHistory.filter(comm => {
        const commDate = new Date(comm.date);
        if (startDate && commDate < new Date(startDate)) return false;
        if (endDate && commDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Sort by date (newest first)
    commissionHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Apply pagination
    const paginatedHistory = commissionHistory.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    // Calculate summary
    const summary = {
      totalCommission: commissionHistory.reduce((sum, comm) => sum + comm.amount, 0),
      totalTransactions: commissionHistory.length,
      averageCommission: commissionHistory.length > 0 ? 
        commissionHistory.reduce((sum, comm) => sum + comm.amount, 0) / commissionHistory.length : 0,
      currentRate: partner.commissionRate
    };

    res.json({
      success: true,
      data: {
        commissionHistory: paginatedHistory,
        summary,
        pagination: {
          total: commissionHistory.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < commissionHistory.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching partner commission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch partner commission',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/partners/:partnerId/commission
 * @desc    Add commission record for partner
 * @access  Private (Admin)
 */
router.post('/:partnerId/commission', checkFeatureAccess('partnerManagement'), async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { tenantId, amount, currency = 'USD', invoiceId } = req.body;

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    // Verify tenant is referred by this partner
    if (!partner.referredTenants.includes(tenantId)) {
      return res.status(400).json({
        success: false,
        message: 'Tenant is not referred by this partner'
      });
    }

    const commissionRecord = {
      tenantId,
      amount,
      currency,
      invoiceId,
      date: new Date()
    };

    partner.commissionHistory.push(commissionRecord);
    await partner.save();

    // Log the action
    await auditLogService.recordLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      action: 'ADD_COMMISSION',
      entityType: 'Partner',
      entityId: partner._id,
      changes: { newValues: commissionRecord }
    });

    res.status(201).json({
      success: true,
      message: 'Commission record added successfully',
      data: commissionRecord
    });
  } catch (error) {
    console.error('Error adding commission record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add commission record',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/partners/:partnerId/performance
 * @desc    Get partner performance analytics
 * @access  Private
 */
router.get('/:partnerId/performance', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { period = 'monthly' } = req.query;

    const partner = await Partner.findById(partnerId)
      .populate('referredTenants', 'name subscription.plan subscription.status subscription.price createdAt');

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    // Check if user has access to this partner's data
    if (req.user.role !== 'admin' && partner.contactEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Calculate performance metrics
    const performance = {
      totalTenants: partner.referredTenants.length,
      activeTenants: partner.referredTenants.filter(t => t.subscription.status === 'active').length,
      churnedTenants: partner.referredTenants.filter(t => t.subscription.status === 'cancelled').length,
      totalCommission: partner.commissionHistory.reduce((sum, comm) => sum + comm.amount, 0),
      monthlyRecurringRevenue: partner.referredTenants
        .filter(t => t.subscription.status === 'active')
        .reduce((sum, t) => sum + (t.subscription.price || 0), 0),
      averageTenantValue: partner.referredTenants.length > 0 ? 
        partner.commissionHistory.reduce((sum, comm) => sum + comm.amount, 0) / partner.referredTenants.length : 0,
      conversionRate: partner.referredTenants.length > 0 ? 
        (partner.referredTenants.filter(t => t.subscription.status === 'active').length / partner.referredTenants.length) * 100 : 0
    };

    // Calculate trends based on period
    const trends = await calculatePartnerTrends(partner, period);

    res.json({
      success: true,
      data: {
        performance,
        trends,
        period
      }
    });
  } catch (error) {
    console.error('Error fetching partner performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch partner performance',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/partners/:partnerId/assign-tenant
 * @desc    Assign tenant to partner
 * @access  Private (Admin)
 */
router.post('/:partnerId/assign-tenant', checkFeatureAccess('partnerManagement'), async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { tenantId } = req.body;

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Check if tenant is already assigned to a partner
    if (tenant.partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant is already assigned to a partner'
      });
    }

    // Assign tenant to partner
    partner.referredTenants.push(tenantId);
    tenant.partnerId = partnerId;
    
    await Promise.all([partner.save(), tenant.save()]);

    // Log the action
    await auditLogService.recordLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      action: 'ASSIGN_TENANT_TO_PARTNER',
      entityType: 'Partner',
      entityId: partner._id,
      changes: { newValues: { tenantId } }
    });

    res.json({
      success: true,
      message: 'Tenant assigned to partner successfully',
      data: {
        partnerId: partner._id,
        tenantId: tenant._id
      }
    });
  } catch (error) {
    console.error('Error assigning tenant to partner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign tenant to partner',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/partners/:partnerId/tenants/:tenantId
 * @desc    Remove tenant from partner
 * @access  Private (Admin)
 */
router.delete('/:partnerId/tenants/:tenantId', checkFeatureAccess('partnerManagement'), async (req, res) => {
  try {
    const { partnerId, tenantId } = req.params;

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Remove tenant from partner
    partner.referredTenants = partner.referredTenants.filter(id => id.toString() !== tenantId);
    tenant.partnerId = null;
    
    await Promise.all([partner.save(), tenant.save()]);

    // Log the action
    await auditLogService.recordLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      action: 'REMOVE_TENANT_FROM_PARTNER',
      entityType: 'Partner',
      entityId: partner._id,
      changes: { oldValues: { tenantId } }
    });

    res.json({
      success: true,
      message: 'Tenant removed from partner successfully'
    });
  } catch (error) {
    console.error('Error removing tenant from partner:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove tenant from partner',
      error: error.message
    });
  }
});

// Helper function to generate unique partner code
async function generatePartnerCode() {
  let partnerCode;
  let isUnique = false;
  
  while (!isUnique) {
    partnerCode = 'PART' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const existing = await Partner.findOne({ partnerCode });
    isUnique = !existing;
  }
  
  return partnerCode;
}

// Helper function to calculate partner trends
async function calculatePartnerTrends(partner, period) {
  const now = new Date();
  const periods = {
    daily: 30,
    weekly: 12,
    monthly: 12
  };
  
  const periodCount = periods[period] || 12;
  const trends = {
    tenantGrowth: [],
    commissionGrowth: [],
    revenueGrowth: []
  };
  
  // This is a simplified implementation
  // In a real application, you would calculate actual trends based on historical data
  
  for (let i = periodCount - 1; i >= 0; i--) {
    const date = new Date(now);
    switch (period) {
      case 'daily':
        date.setDate(date.getDate() - i);
        break;
      case 'weekly':
        date.setDate(date.getDate() - (i * 7));
        break;
      case 'monthly':
        date.setMonth(date.getMonth() - i);
        break;
    }
    
    // Mock trend data - replace with actual calculations
    trends.tenantGrowth.push({
      date: date.toISOString().split('T')[0],
      value: Math.floor(Math.random() * 5) + 1
    });
    
    trends.commissionGrowth.push({
      date: date.toISOString().split('T')[0],
      value: Math.floor(Math.random() * 1000) + 100
    });
    
    trends.revenueGrowth.push({
      date: date.toISOString().split('T')[0],
      value: Math.floor(Math.random() * 5000) + 500
    });
  }
  
  return trends;
}

module.exports = router;
