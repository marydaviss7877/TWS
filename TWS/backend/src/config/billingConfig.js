/**
 * Billing Configuration
 * Centralized billing constants for the platform
 * 
 * Pricing: $10 per organization/tenant (flat rate for all categories)
 * Trial: 7 days free trial for all new tenants
 */

module.exports = {
  // Per-org/tenant pricing (flat rate for all categories: software_house, business, warehouse)
  PRICE_PER_ORG: 10,
  CURRENCY: 'USD',
  
  // Free trial duration in days
  TRIAL_DAYS: 7,
  TRIAL_DURATION_MS: 7 * 24 * 60 * 60 * 1000,
};
