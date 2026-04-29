const express = require('express');
const router = express.Router();
const auth = require('../../../middleware/auth/auth');
const { body, validationResult } = require('express-validator');

// Import services
const tenantSwitchingService = require('../../../services/tenant/tenant-switching.service');
const TenantUser = require('../../../models/tenant/TenantUser');
const Tenant = require('../../../models/tenant/Tenant');

// Middleware to check if user is authenticated
const requireAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getAuthUserId = (req) => req.user?.id || req.user?._id;

// Apply auth middleware to all routes
router.use(auth.authenticateToken);
router.use(requireAuth);

// ==================== TENANT SWITCHING ====================

// Get all tenants user has access to
router.get('/tenants', async (req, res) => {
  try {
    const tenants = await tenantSwitchingService.getUserTenants(getAuthUserId(req));
    res.json(tenants);
  } catch (error) {
    console.error('Get user tenants error:', error);
    res.status(500).json({ message: 'Failed to fetch user tenants' });
  }
});

// Switch to specific tenant
router.post('/switch/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const result = await tenantSwitchingService.switchToTenant(getAuthUserId(req), tenantId);
    res.json(result);
  } catch (error) {
    console.error('Switch tenant error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get current tenant context
router.get('/context/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const context = await tenantSwitchingService.getTenantContext(getAuthUserId(req), tenantId);
    res.json(context);
  } catch (error) {
    console.error('Get tenant context error:', error);
    res.status(400).json({ message: error.message });
  }
});

// ==================== TENANT USER MANAGEMENT ====================

// Get tenant users (for tenant admins)
router.get('/tenants/:tenantId/users', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Check if user has admin access to this tenant
    const userAccess = await TenantUser.findOne({
      userId: getAuthUserId(req),
      tenantId,
      status: 'active',
      roles: { $elemMatch: { role: { $in: ['owner', 'admin'] } } }
    });
    
    if (!userAccess) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    const users = await TenantUser.getTenantUsers(tenantId);
    res.json(users);
  } catch (error) {
    console.error('Get tenant users error:', error);
    res.status(500).json({ message: 'Failed to fetch tenant users' });
  }
});

const { checkUsageLimitSoftwareHouseOnly, checkReadOnlySoftwareHouseOnly } = require('../../../middleware/common/featureGate');

// Invite user to tenant
router.post('/tenants/:tenantId/invite', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['owner', 'admin', 'manager', 'employee', 'client', 'contractor']).withMessage('Valid role is required')
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
}, (req, res, next) => { if (req.params.tenantId) req.tenantId = req.params.tenantId; next(); }, checkReadOnlySoftwareHouseOnly, checkUsageLimitSoftwareHouseOnly('users', 1, 'tenantId'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { tenantId } = req.params;
    const { email, role } = req.body;
    
    // Check if user has admin access to this tenant
    const userAccess = await TenantUser.findOne({
      userId: getAuthUserId(req),
      tenantId,
      status: 'active',
      roles: { $elemMatch: { role: { $in: ['owner', 'admin'] } } }
    });
    
    if (!userAccess) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    const invitation = await tenantSwitchingService.inviteUserToTenant(
      tenantId, 
      email, 
      getAuthUserId(req), 
      role
    );
    
    res.status(201).json(invitation);
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Accept invitation
router.post('/invitations/accept/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const tenantUser = await tenantSwitchingService.acceptInvitation(token);
    res.json(tenantUser);
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update user role in tenant
router.put('/tenants/:tenantId/users/:userId/role', [
  body('role').isIn(['owner', 'admin', 'manager', 'employee', 'client', 'contractor']).withMessage('Valid role is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { tenantId, userId } = req.params;
    const { role } = req.body;
    
    // Check if user has admin access to this tenant
    const userAccess = await TenantUser.findOne({
      userId: getAuthUserId(req),
      tenantId,
      status: 'active',
      roles: { $elemMatch: { role: { $in: ['owner', 'admin'] } } }
    });
    
    if (!userAccess) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    const updatedUser = await tenantSwitchingService.updateUserRole(
      tenantId, 
      userId, 
      role, 
      getAuthUserId(req)
    );
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Remove user from tenant
router.delete('/tenants/:tenantId/users/:userId', async (req, res) => {
  try {
    const { tenantId, userId } = req.params;
    
    // Check if user has admin access to this tenant
    const userAccess = await TenantUser.findOne({
      userId: getAuthUserId(req),
      tenantId,
      status: 'active',
      roles: { $elemMatch: { role: { $in: ['owner', 'admin'] } } }
    });
    
    if (!userAccess) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    const result = await tenantSwitchingService.removeUserFromTenant(
      tenantId, 
      userId, 
      getAuthUserId(req)
    );
    
    res.json(result);
  } catch (error) {
    console.error('Remove user error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get tenant statistics
router.get('/tenants/:tenantId/stats', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Check if user has access to this tenant
    const userAccess = await TenantUser.findOne({
      userId: getAuthUserId(req),
      tenantId,
      status: 'active'
    });
    
    if (!userAccess) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    
    const stats = await tenantSwitchingService.getTenantStats(tenantId);
    res.json(stats);
  } catch (error) {
    console.error('Get tenant stats error:', error);
    res.status(500).json({ message: 'Failed to fetch tenant statistics' });
  }
});

// ==================== USER PREFERENCES ====================

// Update user settings for specific tenant
router.put('/tenants/:tenantId/settings', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { settings } = req.body;
    
    const tenantUser = await TenantUser.findOne({
      userId: getAuthUserId(req),
      tenantId,
      status: 'active'
    });
    
    if (!tenantUser) {
      return res.status(404).json({ message: 'User not found in this tenant' });
    }
    
    // Update settings
    tenantUser.settings = { ...tenantUser.settings, ...settings };
    await tenantUser.save();
    
    res.json(tenantUser.settings);
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json({ message: 'Failed to update user settings' });
  }
});

// Get user settings for specific tenant
router.get('/tenants/:tenantId/settings', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const tenantUser = await TenantUser.findOne({
      userId: getAuthUserId(req),
      tenantId,
      status: 'active'
    });
    
    if (!tenantUser) {
      return res.status(404).json({ message: 'User not found in this tenant' });
    }
    
    res.json(tenantUser.settings);
  } catch (error) {
    console.error('Get user settings error:', error);
    res.status(500).json({ message: 'Failed to fetch user settings' });
  }
});

// ==================== TENANT DISCOVERY ====================

// Search for tenants (for public discovery)
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }
    
    const tenants = await Tenant.find({
      status: 'active',
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { slug: { $regex: q, $options: 'i' } },
        { 'contactInfo.email': { $regex: q, $options: 'i' } }
      ]
    })
    .select('name slug description contactInfo.email businessInfo.industry')
    .limit(parseInt(limit));
    
    res.json(tenants);
  } catch (error) {
    console.error('Search tenants error:', error);
    res.status(500).json({ message: 'Failed to search tenants' });
  }
});

// Request access to tenant
router.post('/tenants/:tenantId/request-access', [
  body('message').optional().isString().withMessage('Message must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { tenantId } = req.params;
    const { message } = req.body;
    
    // Check if user is already a member
    const existingMembership = await TenantUser.findOne({
      userId: getAuthUserId(req),
      tenantId
    });
    
    if (existingMembership) {
      return res.status(400).json({ message: 'You are already a member of this tenant' });
    }
    
    // Create access request (this would typically go to a separate AccessRequest model)
    console.log(`Access request from ${req.user.email} to tenant ${tenantId}: ${message}`);
    
    res.json({ message: 'Access request submitted successfully' });
  } catch (error) {
    console.error('Request access error:', error);
    res.status(500).json({ message: 'Failed to submit access request' });
  }
});

module.exports = router;
