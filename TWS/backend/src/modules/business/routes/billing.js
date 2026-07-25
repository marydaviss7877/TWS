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
 * @swagger
 * /api/billing/usage:
 *   get:
 *     summary: Get current tenant subscription usage and plan (Software House tenants only; others get an N/A-style response)
 *     description: Resolves the tenant from the authenticated user's organization (req.user.orgId, set by verifyERPToken), then reads usage/limits/overage from the tenant's subscription plan. Not settable by the client — tenantId is never taken from req.body/req.params.
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage metrics per resource (users, projects, workspaces, clientAccounts, storage, apiCalls), plan slug, at-risk flag, and overage cost estimate (Number, in the plan's overage-cost unit)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     usage:
 *                       type: object
 *                       description: Per-metric { current, limit, percentage, overage, overageCost }
 *                     plan:
 *                       type: string
 *                       nullable: true
 *                     atRisk:
 *                       type: boolean
 *                     atRiskMetrics:
 *                       type: array
 *                       items:
 *                         type: string
 *                     readOnlyMode:
 *                       type: boolean
 *                     totalOverageCost:
 *                       type: number
 *                     billingEligible:
 *                       type: boolean
 *       400:
 *         description: Organization context required (no orgId on the authenticated user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
// GET /usage - Current tenant subscription + usage (for Software House; others get N/A-style response).
// Returns usage, limits, atRisk (80% warning), readOnlyMode, plan.
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
