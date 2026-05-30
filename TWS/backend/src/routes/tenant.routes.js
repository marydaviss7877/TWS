/**
 * Tenant Routes (centralized)
 * Lightweight tenant info/resolution endpoints.
 * Full tenant management routes are handled by the tenant module (server.js loadRoutes).
 */
const express = require('express');
const router = express.Router();

// Tenant slug info — used by frontend to resolve tenant context
router.get('/api/tenant/:tenantSlug/info', async (req, res) => {
  try {
    const { tenantSlug } = req.params;
    const Organization = require('../models/organization/Organization');
    const org = await Organization.findOne({ slug: tenantSlug })
      .select('name slug industry status createdAt')
      .lean();

    if (!org) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    res.json({ success: true, data: org });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
