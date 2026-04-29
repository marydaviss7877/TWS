/**
 * Tenant-facing billing routes: usage, plans (for subscription/upgrade UI).
 * Resolves tenant from user's organization.
 */
const express = require('express');
const router = express.Router();
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const { getTenantSubscriptionInfo } = require('../../../middleware/common/featureGate');
const Organization = require('../../../models/org/Organization');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const billingRead = requireErpAccess({ module: 'finance', action: ['read', 'read_own'], checkRevocation: true });

router.use(verifyERPToken);

/**
 * GET /usage - Current tenant subscription + usage (for Software House; others get N/A-style response).
 * Returns usage, limits, atRisk (80% warning), readOnlyMode, plan.
 */
router.get('/usage', billingRead, ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.user?.orgId || req.user?.organization;
  if (!orgId) {
    return res.status(400).json({
      success: false,
      message: 'Organization context required',
      data: { usage: {}, plan: null, atRisk: false }
    });
  }
  const org = await Organization.findById(orgId).select('tenantId').lean();
  const tenantId = org?.tenantId;
  if (!tenantId) {
    return res.json({
      success: true,
      data: {
        usage: {},
        plan: null,
        atRisk: false,
        readOnlyMode: false,
        billingEligible: false
      }
    });
  }

  const info = await getTenantSubscriptionInfo(tenantId.toString());
  const { usage, limits, atRisk, atRiskMetrics, readOnlyMode, features, subscriptionPlan } = info;

  const usageForFrontend = {};
  const metrics = ['users', 'projects', 'workspaces', 'clientAccounts', 'storage', 'apiCalls'];
  let totalOverageCost = 0;
  for (const m of metrics) {
    const current = usage[m] ?? 0;
    const limit = limits[m] ?? -1;
    const percentage = limit === -1 || limit === 0 ? 0 : Math.min(100, Math.round((current / limit) * 100));
    const overage = limit === -1 ? 0 : Math.max(0, current - limit);
    const overageCost = limit === -1 ? 0 : (subscriptionPlan ? subscriptionPlan.calculateOverageCost(current, m) : 0);
    totalOverageCost += overageCost;
    usageForFrontend[m] = {
      current,
      limit: limit === -1 ? -1 : limit,
      percentage,
      overage,
      overageCost
    };
  }

  const payload = {
    success: true,
    data: {
      usage: usageForFrontend,
      plan: subscriptionPlan?.slug || info.tenant?.subscription?.plan || null,
      atRisk,
      atRiskMetrics: atRiskMetrics || [],
      readOnlyMode: readOnlyMode || false,
      totalOverageCost,
      features,
      billingEligible: info.tenant?.erpCategory === 'software_house'
    }
  };
  // Also expose at top level so frontend usage-tracking can use response.data.usage / response.data.atRisk
  Object.assign(payload, payload.data);
  res.json(payload);
}));

module.exports = router;
