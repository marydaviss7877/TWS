const SubscriptionPlan = require('../models/finance/SubscriptionPlan');
const Tenant = require('../models/tenant/Tenant');
const usageTrackerService = require('./usageTrackerService');
const logger = require('../utils/logger');

/**
 * Pricing Service
 * 
 * Handles tiered pricing, feature gates, and usage-based billing
 */
class PricingService {
  constructor() {
    this.featureGates = new Map();
    this.usageLimits = new Map();
    this.pricingRules = new Map();
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      // Load subscription plans and build feature gates
      await this.loadSubscriptionPlans();
      
      // Initialize pricing rules
      this.initializePricingRules();
      
      logger.info('PricingService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PricingService:', error);
      throw error;
    }
  }

  /**
   * Load subscription plans and build feature gates
   */
  async loadSubscriptionPlans() {
    try {
      const plans = await SubscriptionPlan.find({ status: 'active' });
      
      for (const plan of plans) {
        // Build feature gates for this plan
        this.featureGates.set(plan.slug, {
          plan: plan,
          features: plan.features,
          limits: {
            users: plan.features.maxUsers,
            projects: plan.features.maxProjects,
            storage: plan.features.maxStorage,
            apiCalls: plan.features.maxApiCalls
          }
        });
        
        // Build usage limits
        this.usageLimits.set(plan.slug, {
          plan: plan,
          limits: {
            users: plan.features.maxUsers,
            projects: plan.features.maxProjects,
            storage: plan.features.maxStorage,
            apiCalls: plan.features.maxApiCalls
          },
          overageRates: plan.usagePricing.overageRates
        });
      }
      
      logger.info(`Loaded ${plans.length} subscription plans`);
    } catch (error) {
      logger.error('Failed to load subscription plans:', error);
      throw error;
    }
  }

  /**
   * Initialize pricing rules
   * Flat $10/org per month for all tenants across all categories
   */
  initializePricingRules() {
    const billingConfig = require('../config/billingConfig');
    const PRICE_PER_ORG = billingConfig.PRICE_PER_ORG;

    // Base pricing rules - flat $10 per org/tenant
    this.pricingRules.set('base', {
      name: 'Base Pricing',
      rules: [
        {
          condition: () => true, // All tenants/orgs
          price: PRICE_PER_ORG,
          currency: billingConfig.CURRENCY,
          billingCycle: 'monthly'
        }
      ]
    });

    // Overage pricing rules
    this.pricingRules.set('overage', {
      name: 'Overage Pricing',
      rules: [
        {
          metric: 'users',
          rate: 5, // $5 per additional user
          currency: 'USD'
        },
        {
          metric: 'projects',
          rate: 2, // $2 per additional project
          currency: 'USD'
        },
        {
          metric: 'storage',
          rate: 1, // $1 per GB
          currency: 'USD'
        },
        {
          metric: 'apiCalls',
          rate: 0.01, // $0.01 per 1000 calls
          currency: 'USD'
        }
      ]
    });

    // Volume discount rules
    this.pricingRules.set('volume', {
      name: 'Volume Discounts',
      rules: [
        {
          condition: (tenant, usage) => usage.users >= 100,
          discount: 0.1, // 10% discount
          type: 'percentage'
        },
        {
          condition: (tenant, usage) => usage.users >= 500,
          discount: 0.2, // 20% discount
          type: 'percentage'
        }
      ]
    });
  }

  /**
   * Check if a tenant has access to a feature
   */
  async hasFeatureAccess(tenantId, featureName) {
    try {
      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      const planSlug = tenant.subscription.plan;
      const featureGate = this.featureGates.get(planSlug);
      
      if (!featureGate) {
        throw new Error(`Feature gate not found for plan: ${planSlug}`);
      }

      return featureGate.features[featureName] === true;
    } catch (error) {
      logger.error(`Failed to check feature access for tenant ${tenantId}:`, error);
      return false;
    }
  }

  /**
   * Check if a tenant is within usage limits
   */
  async isWithinUsageLimits(tenantId, metric, requestedAmount = 1) {
    try {
      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      const planSlug = tenant.subscription.plan;
      const usageLimit = this.usageLimits.get(planSlug);
      
      if (!usageLimit) {
        throw new Error(`Usage limit not found for plan: ${planSlug}`);
      }

      const currentUsage = await usageTrackerService.getCurrentUsage(tenantId, metric);
      const limit = usageLimit.limits[metric];
      
      // Check if limit is unlimited (-1)
      if (limit === -1) {
        return { withinLimit: true, currentUsage, limit: -1, remaining: -1 };
      }

      const withinLimit = currentUsage + requestedAmount <= limit;
      const remaining = Math.max(0, limit - currentUsage);

      return {
        withinLimit,
        currentUsage,
        limit,
        remaining,
        requestedAmount
      };
    } catch (error) {
      logger.error(`Failed to check usage limits for tenant ${tenantId}:`, error);
      return { withinLimit: false, error: error.message };
    }
  }

  /**
   * Calculate overage cost for a tenant
   */
  async calculateOverageCost(tenantId, metric, usage) {
    try {
      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      const planSlug = tenant.subscription.plan;
      const usageLimit = this.usageLimits.get(planSlug);
      
      if (!usageLimit) {
        throw new Error(`Usage limit not found for plan: ${planSlug}`);
      }

      const limit = usageLimit.limits[metric];
      const overageRates = usageLimit.overageRates;
      
      // Check if limit is unlimited (-1)
      if (limit === -1) {
        return 0;
      }

      const overage = Math.max(0, usage - limit);
      const rate = overageRates[metric] || 0;
      
      return overage * rate;
    } catch (error) {
      logger.error(`Failed to calculate overage cost for tenant ${tenantId}:`, error);
      return 0;
    }
  }

  /**
   * Calculate total cost for a tenant
   */
  async calculateTotalCost(tenantId, billingCycle = 'monthly') {
    try {
      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      const planSlug = tenant.subscription.plan;
      const featureGate = this.featureGates.get(planSlug);
      
      if (!featureGate) {
        throw new Error(`Feature gate not found for plan: ${planSlug}`);
      }

      const plan = featureGate.plan;
      const basePrice = plan.pricing[billingCycle] || plan.pricing.monthly;
      
      // Get current usage
      const usage = await usageTrackerService.getAllCurrentUsage(tenantId);
      
      // Calculate overage costs
      let totalOverageCost = 0;
      const overageBreakdown = {};
      
      for (const [metric, value] of Object.entries(usage)) {
        const overageCost = await this.calculateOverageCost(tenantId, metric, value);
        totalOverageCost += overageCost;
        overageBreakdown[metric] = overageCost;
      }
      
      // Apply volume discounts
      const volumeDiscount = await this.calculateVolumeDiscount(tenantId, usage);
      
      // Calculate final cost
      const subtotal = basePrice + totalOverageCost;
      const discountAmount = subtotal * volumeDiscount;
      const total = subtotal - discountAmount;
      
      return {
        basePrice,
        overageCost: totalOverageCost,
        overageBreakdown,
        volumeDiscount,
        discountAmount,
        subtotal,
        total,
        currency: plan.pricing.currency,
        billingCycle
      };
    } catch (error) {
      logger.error(`Failed to calculate total cost for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate volume discount
   */
  async calculateVolumeDiscount(tenantId, usage) {
    try {
      const volumeRules = this.pricingRules.get('volume');
      if (!volumeRules) {
        return 0;
      }

      let discount = 0;
      
      for (const rule of volumeRules.rules) {
        if (rule.condition({ tenantId }, usage)) {
          discount = Math.max(discount, rule.discount);
        }
      }
      
      return discount;
    } catch (error) {
      logger.error(`Failed to calculate volume discount for tenant ${tenantId}:`, error);
      return 0;
    }
  }

  /**
   * Get recommended plan for a tenant based on usage
   */
  async getRecommendedPlan(tenantId) {
    try {
      const usage = await usageTrackerService.getAllCurrentUsage(tenantId);
      const plans = await SubscriptionPlan.find({ status: 'active' }).sort({ sortOrder: 1 });
      
      let recommendedPlan = null;
      let bestFit = 0;
      
      for (const plan of plans) {
        let fit = 0;
        
        // Check if plan can accommodate current usage
        if (plan.features.maxUsers === -1 || usage.users <= plan.features.maxUsers) {
          fit += 1;
        }
        if (plan.features.maxProjects === -1 || usage.projects <= plan.features.maxProjects) {
          fit += 1;
        }
        if (plan.features.maxStorage === -1 || usage.storage <= plan.features.maxStorage) {
          fit += 1;
        }
        if (plan.features.maxApiCalls === -1 || usage.apiCalls <= plan.features.maxApiCalls) {
          fit += 1;
        }
        
        // Check if plan has required features
        if (plan.features.advancedAnalytics && usage.apiCalls > 1000) {
          fit += 1;
        }
        if (plan.features.apiAccess && usage.apiCalls > 100) {
          fit += 1;
        }
        
        if (fit > bestFit) {
          bestFit = fit;
          recommendedPlan = plan;
        }
      }
      
      return {
        recommendedPlan,
        fitScore: bestFit,
        currentUsage: usage,
        reasoning: this.getRecommendationReasoning(usage, recommendedPlan)
      };
    } catch (error) {
      logger.error(`Failed to get recommended plan for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get recommendation reasoning
   */
  getRecommendationReasoning(usage, plan) {
    const reasons = [];
    
    if (plan.features.maxUsers !== -1 && usage.users > plan.features.maxUsers * 0.8) {
      reasons.push(`High user count (${usage.users}) approaching limit (${plan.features.maxUsers})`);
    }
    
    if (plan.features.maxProjects !== -1 && usage.projects > plan.features.maxProjects * 0.8) {
      reasons.push(`High project count (${usage.projects}) approaching limit (${plan.features.maxProjects})`);
    }
    
    if (plan.features.maxStorage !== -1 && usage.storage > plan.features.maxStorage * 0.8) {
      reasons.push(`High storage usage (${usage.storage}GB) approaching limit (${plan.features.maxStorage}GB)`);
    }
    
    if (plan.features.maxApiCalls !== -1 && usage.apiCalls > plan.features.maxApiCalls * 0.8) {
      reasons.push(`High API usage (${usage.apiCalls}) approaching limit (${plan.features.maxApiCalls})`);
    }
    
    if (usage.apiCalls > 1000 && !plan.features.advancedAnalytics) {
      reasons.push('High API usage requires advanced analytics features');
    }
    
    return reasons;
  }

  /**
   * Check if tenant should be upgraded
   */
  async shouldUpgrade(tenantId) {
    try {
      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      const usage = await usageTrackerService.getAllCurrentUsage(tenantId);
      const planSlug = tenant.subscription.plan;
      const featureGate = this.featureGates.get(planSlug);
      
      if (!featureGate) {
        throw new Error(`Feature gate not found for plan: ${planSlug}`);
      }

      const limits = featureGate.limits;
      const upgradeReasons = [];
      
      // Check usage limits
      for (const [metric, value] of Object.entries(usage)) {
        const limit = limits[metric];
        if (limit !== -1 && value > limit * 0.9) {
          upgradeReasons.push({
            metric,
            currentUsage: value,
            limit,
            percentage: (value / limit) * 100
          });
        }
      }
      
      // Check feature needs
      if (usage.apiCalls > 1000 && !featureGate.features.advancedAnalytics) {
        upgradeReasons.push({
          type: 'feature',
          feature: 'advancedAnalytics',
          reason: 'High API usage requires advanced analytics'
        });
      }
      
      return {
        shouldUpgrade: upgradeReasons.length > 0,
        reasons: upgradeReasons,
        currentPlan: planSlug,
        usage
      };
    } catch (error) {
      logger.error(`Failed to check upgrade recommendation for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get pricing comparison for all plans
   */
  async getPricingComparison(tenantId, billingCycle = 'monthly') {
    try {
      const usage = await usageTrackerService.getAllCurrentUsage(tenantId);
      const plans = await SubscriptionPlan.find({ status: 'active' }).sort({ sortOrder: 1 });
      
      const comparison = plans.map(plan => {
        const basePrice = plan.pricing[billingCycle] || plan.pricing.monthly;
        const overageCost = this.calculateOverageCostForPlan(plan, usage);
        const totalCost = basePrice + overageCost;
        
        return {
          plan: {
            name: plan.name,
            slug: plan.slug,
            description: plan.description
          },
          pricing: {
            basePrice,
            overageCost,
            totalCost,
            currency: plan.pricing.currency
          },
          features: plan.features,
          limits: {
            users: plan.features.maxUsers,
            projects: plan.features.maxProjects,
            storage: plan.features.maxStorage,
            apiCalls: plan.features.maxApiCalls
          },
          fit: this.calculatePlanFit(plan, usage)
        };
      });
      
      return comparison;
    } catch (error) {
      logger.error(`Failed to get pricing comparison for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate overage cost for a specific plan
   */
  calculateOverageCostForPlan(plan, usage) {
    let totalOverageCost = 0;
    
    const limits = {
      users: plan.features.maxUsers,
      projects: plan.features.maxProjects,
      storage: plan.features.maxStorage,
      apiCalls: plan.features.maxApiCalls
    };
    
    const overageRates = plan.usagePricing.overageRates;
    
    for (const [metric, value] of Object.entries(usage)) {
      const limit = limits[metric];
      if (limit !== -1 && value > limit) {
        const overage = value - limit;
        const rate = overageRates[metric] || 0;
        totalOverageCost += overage * rate;
      }
    }
    
    return totalOverageCost;
  }

  /**
   * Calculate how well a plan fits the usage
   */
  calculatePlanFit(plan, usage) {
    let fit = 0;
    let total = 0;
    
    const limits = {
      users: plan.features.maxUsers,
      projects: plan.features.maxProjects,
      storage: plan.features.maxStorage,
      apiCalls: plan.features.maxApiCalls
    };
    
    for (const [metric, value] of Object.entries(usage)) {
      const limit = limits[metric];
      if (limit !== -1) {
        total += 1;
        if (value <= limit) {
          fit += 1;
        }
      }
    }
    
    return total > 0 ? (fit / total) * 100 : 100;
  }

  /**
   * Health check for the service
   */
  async healthCheck() {
    try {
      // Check if feature gates are loaded
      if (this.featureGates.size === 0) {
        return false;
      }
      
      // Check if usage limits are loaded
      if (this.usageLimits.size === 0) {
        return false;
      }
      
      // Check if pricing rules are loaded
      if (this.pricingRules.size === 0) {
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('PricingService health check failed:', error);
      return false;
    }
  }

  /**
   * Get service metrics
   */
  async getMetrics() {
    return {
      featureGates: this.featureGates.size,
      usageLimits: this.usageLimits.size,
      pricingRules: this.pricingRules.size,
      status: 'healthy'
    };
  }

  /**
   * Shutdown the service
   */
  async shutdown() {
    this.featureGates.clear();
    this.usageLimits.clear();
    this.pricingRules.clear();
    logger.info('PricingService shut down');
  }
}

// Create singleton instance
const pricingService = new PricingService();

module.exports = pricingService;
