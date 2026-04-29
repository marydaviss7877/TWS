const Partner = require('../models/org/Partner');
const Tenant = require('../models/tenant/Tenant');
const SubscriptionPlan = require('../models/finance/SubscriptionPlan');
const tenantProvisioningService = require('./tenantProvisioningService');
const emailService = require('./integrations/email.service');
const auditLogService = require('./compliance/audit-log.service');
const logger = require('../utils/logger');

/**
 * Partner Service
 * 
 * Handles partner management, white-label distribution, and commission tracking
 */
class PartnerService {
  constructor() {
    this.whiteLabelConfigs = new Map();
    this.commissionRules = new Map();
    this.partnerPortals = new Map();
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      // Load partner configurations
      await this.loadPartnerConfigurations();
      
      // Initialize commission rules
      this.initializeCommissionRules();
      
      // Initialize white-label configurations
      this.initializeWhiteLabelConfigs();
      
      logger.info('PartnerService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PartnerService:', error);
      throw error;
    }
  }

  /**
   * Load partner configurations
   */
  async loadPartnerConfigurations() {
    try {
      const partners = await Partner.find({ status: 'active' });
      
      for (const partner of partners) {
        // Store white-label configuration
        if (partner.whiteLabel.enabled) {
          this.whiteLabelConfigs.set(partner.slug, {
            partner: partner,
            branding: partner.whiteLabel.branding,
            features: partner.whiteLabel.features,
            support: partner.whiteLabel.support
          });
        }
        
        // Store commission rules
        this.commissionRules.set(partner.slug, {
          partner: partner,
          rate: partner.commission.rate,
          structure: partner.commission.structure,
          tiers: partner.commission.tiers,
          paymentTerms: partner.commission.paymentTerms
        });
      }
      
      logger.info(`Loaded ${partners.length} partner configurations`);
    } catch (error) {
      logger.error('Failed to load partner configurations:', error);
      throw error;
    }
  }

  /**
   * Initialize commission rules
   */
  initializeCommissionRules() {
    // Default commission structure
    this.commissionRules.set('default', {
      rate: 20, // 20% default commission
      structure: 'percentage',
      tiers: [
        { minRevenue: 0, maxRevenue: 10000, rate: 15 },
        { minRevenue: 10000, maxRevenue: 50000, rate: 20 },
        { minRevenue: 50000, maxRevenue: 100000, rate: 25 },
        { minRevenue: 100000, maxRevenue: null, rate: 30 }
      ],
      paymentTerms: {
        frequency: 'monthly',
        paymentMethod: 'bank_transfer',
        minimumPayout: 100
      }
    });
  }

  /**
   * Initialize white-label configurations
   */
  initializeWhiteLabelConfigs() {
    // Default white-label configuration
    this.whiteLabelConfigs.set('default', {
      branding: {
        logo: null,
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        customDomain: null,
        favicon: null,
        companyName: 'TWS',
        tagline: 'Project Management Platform'
      },
      features: {
        removePoweredBy: false,
        customLoginPage: false,
        customEmailTemplates: false,
        customSupportContact: false
      },
      support: {
        contactEmail: 'support@tws.com',
        contactPhone: '+1-555-0123',
        supportHours: '9 AM - 5 PM EST',
        supportLanguage: 'en'
      }
    });
  }

  /**
   * Create a new partner
   */
  async createPartner(partnerData, createdBy) {
    try {
      const partner = new Partner({
        ...partnerData,
        createdBy: createdBy
      });

      await partner.save();

      // Log audit event
      await auditLogService.logDataCreation(
        createdBy,
        'admin@tws.com',
        'admin',
        'system',
        'system',
        'PARTNER',
        partner._id,
        partner.toObject(),
        '127.0.0.1',
        'PartnerService'
      );

      logger.info(`Partner created: ${partner.companyName} (${partner.slug})`);
      return partner;
    } catch (error) {
      logger.error('Failed to create partner:', error);
      throw error;
    }
  }

  /**
   * Update partner information
   */
  async updatePartner(partnerId, updateData, updatedBy) {
    try {
      const partner = await Partner.findById(partnerId);
      if (!partner) {
        throw new Error(`Partner not found: ${partnerId}`);
      }

      const oldData = partner.toObject();
      
      // Update partner
      Object.assign(partner, updateData);
      partner.lastUpdatedBy = updatedBy;
      
      await partner.save();

      // Update configurations if needed
      if (partner.whiteLabel.enabled) {
        this.whiteLabelConfigs.set(partner.slug, {
          partner: partner,
          branding: partner.whiteLabel.branding,
          features: partner.whiteLabel.features,
          support: partner.whiteLabel.support
        });
      }

      // Log audit event
      await auditLogService.logDataUpdate(
        updatedBy,
        'admin@tws.com',
        'admin',
        'system',
        'system',
        'PARTNER',
        partner._id,
        oldData,
        partner.toObject(),
        '127.0.0.1',
        'PartnerService'
      );

      logger.info(`Partner updated: ${partner.companyName} (${partner.slug})`);
      return partner;
    } catch (error) {
      logger.error(`Failed to update partner ${partnerId}:`, error);
      throw error;
    }
  }

  /**
   * Create tenant for a partner
   */
  async createPartnerTenant(partnerId, tenantData) {
    try {
      const partner = await Partner.findById(partnerId);
      if (!partner) {
        throw new Error(`Partner not found: ${partnerId}`);
      }

      // Create tenant with partner-specific configuration
      const tenant = await tenantProvisioningService.provisionTenant({
        ...tenantData,
        partnerId: partnerId,
        partnerSlug: partner.slug
      });

      // Update partner performance metrics
      partner.performance.totalTenants += 1;
      partner.performance.activeTenants += 1;
      partner.performance.lastActivity = new Date();
      await partner.save();

      // Log audit event
      await auditLogService.logDataCreation(
        'system',
        'system@tws.com',
        'system',
        tenant.tenantId,
        tenant.orgId,
        'TENANT',
        tenant._id,
        tenant.toObject(),
        '127.0.0.1',
        'PartnerService'
      );

      logger.info(`Partner tenant created: ${tenant.name} for partner ${partner.companyName}`);
      return tenant;
    } catch (error) {
      logger.error(`Failed to create partner tenant for partner ${partnerId}:`, error);
      throw error;
    }
  }

  /**
   * Record a sale for a partner
   */
  async recordPartnerSale(partnerId, saleData) {
    try {
      const partner = await Partner.findById(partnerId);
      if (!partner) {
        throw new Error(`Partner not found: ${partnerId}`);
      }

      const { amount, tenantId, planSlug, billingCycle } = saleData;
      
      // Calculate commission
      const commission = partner.calculateCommission(amount);
      
      // Update partner metrics
      partner.commission.totalRevenue += amount;
      partner.commission.pendingCommission += commission;
      partner.performance.monthlyRecurringRevenue += amount;
      partner.performance.lastActivity = new Date();
      
      // Update average tenant value
      if (partner.performance.totalTenants > 0) {
        partner.performance.averageTenantValue = 
          partner.commission.totalRevenue / partner.performance.totalTenants;
      }
      
      await partner.save();

      // Log audit event
      await auditLogService.logDataUpdate(
        'system',
        'system@tws.com',
        'system',
        'system',
        'system',
        'PARTNER',
        partner._id,
        { 
          'commission.totalRevenue': partner.commission.totalRevenue - amount,
          'commission.pendingCommission': partner.commission.pendingCommission - commission
        },
        { 
          'commission.totalRevenue': partner.commission.totalRevenue,
          'commission.pendingCommission': partner.commission.pendingCommission
        },
        '127.0.0.1',
        'PartnerService'
      );

      logger.info(`Partner sale recorded: $${amount} commission for partner ${partner.companyName}`);
      return {
        partner: partner,
        commission: commission,
        saleData: saleData
      };
    } catch (error) {
      logger.error(`Failed to record partner sale for partner ${partnerId}:`, error);
      throw error;
    }
  }

  /**
   * Process partner commission payout
   */
  async processCommissionPayout(partnerId, amount, processedBy) {
    try {
      const partner = await Partner.findById(partnerId);
      if (!partner) {
        throw new Error(`Partner not found: ${partnerId}`);
      }

      if (amount > partner.commission.pendingCommission) {
        throw new Error('Payout amount exceeds pending commission');
      }

      // Process payout
      partner.processPayout(amount);
      await partner.save();

      // Log audit event
      await auditLogService.logDataUpdate(
        processedBy,
        'admin@tws.com',
        'admin',
        'system',
        'system',
        'PARTNER',
        partner._id,
        { 
          'commission.pendingCommission': partner.commission.pendingCommission + amount,
          'commission.totalCommission': partner.commission.totalCommission - amount
        },
        { 
          'commission.pendingCommission': partner.commission.pendingCommission,
          'commission.totalCommission': partner.commission.totalCommission
        },
        '127.0.0.1',
        'PartnerService'
      );

      logger.info(`Commission payout processed: $${amount} for partner ${partner.companyName}`);
      return partner;
    } catch (error) {
      logger.error(`Failed to process commission payout for partner ${partnerId}:`, error);
      throw error;
    }
  }

  /**
   * Get white-label configuration for a partner
   */
  async getWhiteLabelConfig(partnerSlug) {
    try {
      const config = this.whiteLabelConfigs.get(partnerSlug);
      if (!config) {
        // Return default configuration
        return this.whiteLabelConfigs.get('default');
      }
      
      return config;
    } catch (error) {
      logger.error(`Failed to get white-label config for partner ${partnerSlug}:`, error);
      return this.whiteLabelConfigs.get('default');
    }
  }

  /**
   * Update white-label configuration
   */
  async updateWhiteLabelConfig(partnerId, configData, updatedBy) {
    try {
      const partner = await Partner.findById(partnerId);
      if (!partner) {
        throw new Error(`Partner not found: ${partnerId}`);
      }

      const oldConfig = partner.whiteLabel.toObject();
      
      // Update white-label configuration
      Object.assign(partner.whiteLabel, configData);
      partner.whiteLabel.enabled = true;
      
      await partner.save();

      // Update in-memory configuration
      this.whiteLabelConfigs.set(partner.slug, {
        partner: partner,
        branding: partner.whiteLabel.branding,
        features: partner.whiteLabel.features,
        support: partner.whiteLabel.support
      });

      // Log audit event
      await auditLogService.logDataUpdate(
        updatedBy,
        'admin@tws.com',
        'admin',
        'system',
        'system',
        'PARTNER',
        partner._id,
        { whiteLabel: oldConfig },
        { whiteLabel: partner.whiteLabel.toObject() },
        '127.0.0.1',
        'PartnerService'
      );

      logger.info(`White-label configuration updated for partner ${partner.companyName}`);
      return partner;
    } catch (error) {
      logger.error(`Failed to update white-label config for partner ${partnerId}:`, error);
      throw error;
    }
  }

  /**
   * Get partner performance metrics
   */
  async getPartnerPerformance(partnerId) {
    try {
      const partner = await Partner.findById(partnerId);
      if (!partner) {
        throw new Error(`Partner not found: ${partnerId}`);
      }

      const performance = {
        partner: {
          id: partner._id,
          companyName: partner.companyName,
          slug: partner.slug,
          tier: partner.partnership.tier,
          status: partner.partnership.status
        },
        metrics: {
          totalTenants: partner.performance.totalTenants,
          activeTenants: partner.performance.activeTenants,
          monthlyRecurringRevenue: partner.performance.monthlyRecurringRevenue,
          averageTenantValue: partner.performance.averageTenantValue,
          churnRate: partner.performance.churnRate,
          satisfactionScore: partner.performance.satisfactionScore,
          conversionRate: partner.performance.conversionRate
        },
        commission: {
          rate: partner.commission.rate,
          totalRevenue: partner.commission.totalRevenue,
          totalCommission: partner.commission.totalCommission,
          pendingCommission: partner.commission.pendingCommission,
          lastPayoutDate: partner.commission.lastPayoutDate,
          nextPayoutDate: partner.commission.nextPayoutDate
        },
        sales: {
          targetMonthlyRevenue: partner.sales.targetMonthlyRevenue,
          actualMonthlyRevenue: partner.sales.actualMonthlyRevenue,
          pipeline: partner.sales.pipeline
        }
      };

      return performance;
    } catch (error) {
      logger.error(`Failed to get partner performance for partner ${partnerId}:`, error);
      throw error;
    }
  }

  /**
   * Get partner dashboard data
   */
  async getPartnerDashboard(partnerId) {
    try {
      const partner = await Partner.findById(partnerId);
      if (!partner) {
        throw new Error(`Partner not found: ${partnerId}`);
      }

      // Get recent tenants
      const recentTenants = await Tenant.find({ 
        'metadata.partnerId': partnerId 
      }).sort({ createdAt: -1 }).limit(10);

      // Get performance trends
      const performanceTrends = await this.getPerformanceTrends(partnerId);

      // Get commission summary
      const commissionSummary = {
        totalEarned: partner.commission.totalCommission,
        pending: partner.commission.pendingCommission,
        nextPayout: partner.commission.nextPayoutDate,
        paymentMethod: partner.commission.paymentTerms.paymentMethod
      };

      // Get sales pipeline
      const salesPipeline = partner.sales.pipeline || [];

      return {
        partner: {
          id: partner._id,
          companyName: partner.companyName,
          slug: partner.slug,
          tier: partner.partnership.tier,
          status: partner.partnership.status
        },
        recentTenants: recentTenants,
        performanceTrends: performanceTrends,
        commissionSummary: commissionSummary,
        salesPipeline: salesPipeline,
        whiteLabel: {
          enabled: partner.whiteLabel.enabled,
          branding: partner.whiteLabel.branding
        }
      };
    } catch (error) {
      logger.error(`Failed to get partner dashboard for partner ${partnerId}:`, error);
      throw error;
    }
  }

  /**
   * Get performance trends for a partner
   */
  async getPerformanceTrends(partnerId) {
    try {
      // This would typically query historical data
      // For now, return mock data
      const trends = {
        revenue: [
          { month: 'Jan', value: 5000 },
          { month: 'Feb', value: 7500 },
          { month: 'Mar', value: 6200 },
          { month: 'Apr', value: 8800 },
          { month: 'May', value: 9200 },
          { month: 'Jun', value: 10500 }
        ],
        tenants: [
          { month: 'Jan', value: 5 },
          { month: 'Feb', value: 8 },
          { month: 'Mar', value: 12 },
          { month: 'Apr', value: 15 },
          { month: 'May', value: 18 },
          { month: 'Jun', value: 22 }
        ],
        commission: [
          { month: 'Jan', value: 1000 },
          { month: 'Feb', value: 1500 },
          { month: 'Mar', value: 1240 },
          { month: 'Apr', value: 1760 },
          { month: 'May', value: 1840 },
          { month: 'Jun', value: 2100 }
        ]
      };

      return trends;
    } catch (error) {
      logger.error(`Failed to get performance trends for partner ${partnerId}:`, error);
      return null;
    }
  }

  /**
   * Get all partners with filtering
   */
  async getPartners(filters = {}) {
    try {
      const query = {};
      
      if (filters.status) {
        query['partnership.status'] = filters.status;
      }
      
      if (filters.tier) {
        query['partnership.tier'] = filters.tier;
      }
      
      if (filters.type) {
        query['partnership.type'] = filters.type;
      }
      
      if (filters.search) {
        query.$or = [
          { companyName: { $regex: filters.search, $options: 'i' } },
          { 'contactInfo.primaryContact.name': { $regex: filters.search, $options: 'i' } },
          { 'contactInfo.primaryContact.email': { $regex: filters.search, $options: 'i' } }
        ];
      }

      const partners = await Partner.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50)
        .skip(filters.offset || 0);

      return partners;
    } catch (error) {
      logger.error('Failed to get partners:', error);
      throw error;
    }
  }

  /**
   * Get partner statistics
   */
  async getPartnerStatistics() {
    try {
      const stats = await Partner.aggregate([
        {
          $group: {
            _id: null,
            totalPartners: { $sum: 1 },
            activePartners: { $sum: { $cond: [{ $eq: ['$partnership.status', 'active'] }, 1, 0] } },
            totalRevenue: { $sum: '$commission.totalRevenue' },
            totalCommission: { $sum: '$commission.totalCommission' },
            pendingCommission: { $sum: '$commission.pendingCommission' },
            totalTenants: { $sum: '$performance.totalTenants' },
            averageSatisfaction: { $avg: '$performance.satisfactionScore' }
          }
        }
      ]);

      return stats[0] || {
        totalPartners: 0,
        activePartners: 0,
        totalRevenue: 0,
        totalCommission: 0,
        pendingCommission: 0,
        totalTenants: 0,
        averageSatisfaction: 0
      };
    } catch (error) {
      logger.error('Failed to get partner statistics:', error);
      throw error;
    }
  }

  /**
   * Health check for the service
   */
  async healthCheck() {
    try {
      // Check if partner configurations are loaded
      if (this.whiteLabelConfigs.size === 0) {
        return false;
      }
      
      // Check if commission rules are loaded
      if (this.commissionRules.size === 0) {
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('PartnerService health check failed:', error);
      return false;
    }
  }

  /**
   * Get service metrics
   */
  async getMetrics() {
    return {
      whiteLabelConfigs: this.whiteLabelConfigs.size,
      commissionRules: this.commissionRules.size,
      partnerPortals: this.partnerPortals.size,
      status: 'healthy'
    };
  }

  /**
   * Shutdown the service
   */
  async shutdown() {
    this.whiteLabelConfigs.clear();
    this.commissionRules.clear();
    this.partnerPortals.clear();
    logger.info('PartnerService shut down');
  }
}

// Create singleton instance
const partnerService = new PartnerService();

module.exports = partnerService;
