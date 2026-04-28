/**
 * Supra Admin - User Management routes (Admins, Portal Users, TWS Admin Users)
 */

const { express, body, validationResult } = require('./shared');
const router = express.Router();
const {
  requirePlatformPermission,
  PLATFORM_PERMISSIONS,
  PlatformRBAC,
  TWSAdmin,
  User,
  ErrorHandler,
  ValidationMiddleware,
  auditService
} = require('./shared');

router.get('/admins', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.READ), async (req, res) => {
  try {
    const admins = await TWSAdmin.find({ status: 'active' }).select('-password -refreshTokens -twoFASecret').sort({ createdAt: -1 });
    res.json({ success: true, data: admins });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admins', error: error.message });
  }
});

router.post('/admins', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.CREATE), [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('role').optional().isIn(['platform_super_admin', 'platform_admin', 'platform_support', 'platform_billing', 'platform_analyst', 'platform_developer']).withMessage('Valid role is required'),
  body('phone').optional().isString(),
  body('department').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const { email, password, fullName, role, phone, department, status } = req.body;
    let assignerRole = req.user?.role;
    if (req.authContext?.type === 'tws_admin' && req.user?._id) {
      const actualAdmin = await TWSAdmin.findById(req.user._id).select('role');
      if (actualAdmin) assignerRole = actualAdmin.role;
    }
    let normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail.includes('@gmail.com')) {
      const [localPart, domain] = normalizedEmail.split('@');
      normalizedEmail = localPart.replace(/\./g, '') + '@' + domain;
    }
    let existingAdmin = await TWSAdmin.findOne({ email: normalizedEmail });
    if (!existingAdmin && email.includes('@gmail.com')) existingAdmin = await TWSAdmin.findOne({ email: email.toLowerCase().trim() });
    if (existingAdmin) return res.status(400).json({ success: false, message: 'Admin with this email already exists' });
    const targetRole = role || 'platform_admin';
    if (!PlatformRBAC.canAssignRole(assignerRole, targetRole)) return res.status(403).json({ success: false, error: 'Forbidden', message: `You cannot assign role '${targetRole}'.`, assignerRole, targetRole });
    if (!PlatformRBAC.isValidRole(targetRole)) return res.status(400).json({ success: false, message: `Invalid role: ${targetRole}`, validRoles: PlatformRBAC.getAllRoles() });
    const admin = new TWSAdmin({ email: normalizedEmail, password, fullName, role: targetRole, phone: phone || '', department: department || 'Platform Administration', status: status || 'active' });
    await admin.save();
    await auditService.logEvent({ action: 'PLATFORM_USER_CREATED', performedBy: req.user._id, details: { createdUserId: admin._id, createdUserEmail: admin.email, createdUserRole: admin.role, assignerRole, ipAddress: req.ip || req.connection.remoteAddress, userAgent: req.get('User-Agent') }, severity: 'high', status: 'success' });
    res.status(201).json({ success: true, message: 'Supra Admin portal user created successfully', data: { admin: { _id: admin._id, email: admin.email, fullName: admin.fullName, role: admin.role, department: admin.department, status: admin.status } } });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ success: false, message: 'Failed to create admin', error: error.message });
  }
});

router.get('/portal-users', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.READ), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, role, status, portalResponsibility } = req.query;
    const filter = {};
    if (search) filter.$or = [{ fullName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (portalResponsibility) filter.department = { $regex: portalResponsibility, $options: 'i' };
    const admins = await TWSAdmin.find(filter).select('-password -refreshTokens -twoFASecret').sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit).lean();
    const total = await TWSAdmin.countDocuments(filter);
    res.json({ success: true, data: { users: admins, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } } });
  } catch (error) {
    console.error('Get portal users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch portal users', error: error.message });
  }
});

router.get('/users', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.READ), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, role, status } = req.query;
    const filter = {};
    if (search) filter.$or = [{ fullName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }, { department: { $regex: search, $options: 'i' } }];
    if (role) filter.role = role;
    if (status) filter.status = status;
    const users = await TWSAdmin.find(filter).select('-password -refreshTokens -twoFASecret').sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit).lean();
    const total = await TWSAdmin.countDocuments(filter);
    res.json({ success: true, data: { users, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } } });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
  }
});

router.get('/users/:id', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.READ), async (req, res) => {
  try {
    const user = await TWSAdmin.findById(req.params.id).select('-password -refreshTokens -twoFASecret').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user', error: error.message });
  }
});

router.post('/users', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.CREATE), [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('fullName').notEmpty().trim().withMessage('Full name is required'),
  body('role').optional().isIn(['platform_super_admin', 'platform_admin', 'platform_support', 'platform_billing', 'platform_analyst', 'platform_developer']).withMessage('Valid role is required'),
  body('phone').optional().isString().trim(),
  body('department').optional().isString().trim(),
  body('status').optional().isIn(['active', 'suspended', 'inactive']).withMessage('Status must be active, suspended, or inactive')
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const { email, password, fullName, role, phone, department, status } = req.body;
    const assignerRole = req.user?.role;
    if (!email || !password || !fullName) return res.status(400).json({ success: false, message: 'Missing required fields', errors: [!email && { field: 'email', message: 'Email is required' }, !password && { field: 'password', message: 'Password is required' }, !fullName && { field: 'fullName', message: 'Full name is required' }].filter(Boolean) });
    if (password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    let normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail.includes('@gmail.com')) { const [localPart, domain] = normalizedEmail.split('@'); normalizedEmail = localPart.replace(/\./g, '') + '@' + domain; }
    let existingAdmin = await TWSAdmin.findOne({ email: normalizedEmail });
    if (!existingAdmin && email.includes('@gmail.com')) existingAdmin = await TWSAdmin.findOne({ email: email.toLowerCase().trim() });
    if (existingAdmin) return res.status(400).json({ success: false, message: 'User with this email already exists' });
    const targetRole = role || 'platform_admin';
    if (!PlatformRBAC.canAssignRole(assignerRole, targetRole)) return res.status(403).json({ success: false, error: 'Forbidden', message: `You cannot assign role '${targetRole}'.`, assignerRole, targetRole });
    if (!PlatformRBAC.isValidRole(targetRole)) return res.status(400).json({ success: false, message: `Invalid role: ${targetRole}`, validRoles: PlatformRBAC.getAllRoles() });
    const admin = new TWSAdmin({ email: normalizedEmail, password, fullName, role: targetRole, phone: phone || '', department: department || 'Platform Administration', status: status || 'active' });
    await admin.save();
    try { await auditService.logEvent({ action: 'PLATFORM_USER_CREATED', performedBy: req.user._id, details: { createdUserId: admin._id, createdUserEmail: admin.email, createdUserRole: admin.role, assignerRole, ipAddress: req.ip || req.connection.remoteAddress, userAgent: req.get('User-Agent') }, severity: 'high', status: 'success' }); } catch (e) { /* non-critical */ }
    res.status(201).json({ success: true, message: 'TWS Admin user created successfully', data: { user: { _id: admin._id, email: admin.email, fullName: admin.fullName, role: admin.role, department: admin.department, status: admin.status } } });
  } catch (error) {
    if (error.code === 11000 || error.message?.includes('duplicate key')) return res.status(400).json({ success: false, message: 'User with this email already exists', error: 'DUPLICATE_EMAIL' });
    if (error.name === 'ValidationError') return res.status(400).json({ success: false, message: 'Validation failed', errors: Object.values(error.errors).map(err => ({ field: err.path, message: err.message })) });
    res.status(500).json({ success: false, message: 'Failed to create user', error: error.message });
  }
}));

router.patch('/users/:id', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.UPDATE), [
  body('fullName').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('role').optional().isIn(['platform_super_admin', 'platform_admin', 'platform_support', 'platform_billing', 'platform_analyst', 'platform_developer']).withMessage('Valid role is required'),
  body('status').optional().isIn(['active', 'suspended', 'inactive']).withMessage('Valid status is required'),
  body('phone').optional().isString(),
  body('department').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const userId = req.params.id;
    const updateData = req.body;
    let assignerRole = req.user?.role;
    if (req.authContext?.type === 'tws_admin' && req.user?._id) {
      const actualAdmin = await TWSAdmin.findById(req.user._id).select('role');
      if (actualAdmin) assignerRole = actualAdmin.role;
    }
    const existingUser = await TWSAdmin.findById(userId);
    if (!existingUser) return res.status(404).json({ success: false, message: 'User not found' });
    if (updateData.role && updateData.role !== existingUser.role) {
      if (!PlatformRBAC.canAssignRole(assignerRole, updateData.role)) return res.status(403).json({ success: false, error: 'Forbidden', message: `You cannot assign role '${updateData.role}'.`, assignerRole, targetRole: updateData.role, currentRole: existingUser.role });
      if (!PlatformRBAC.isValidRole(updateData.role)) return res.status(400).json({ success: false, message: `Invalid role: ${updateData.role}`, validRoles: PlatformRBAC.getAllRoles() });
    }
    delete updateData.password;
    delete updateData.email;
    delete updateData._id;
    const user = await TWSAdmin.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true }).select('-password -refreshTokens -twoFASecret');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await auditService.logEvent({ action: 'PLATFORM_USER_UPDATED', performedBy: req.user._id, details: { updatedUserId: userId, updatedUserEmail: user.email, changes: updateData, assignerRole, ipAddress: req.ip || req.connection.remoteAddress, userAgent: req.get('User-Agent') }, severity: 'medium', status: 'success' });
    res.json({ success: true, message: 'User updated successfully', data: user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user', error: error.message });
  }
});

router.delete('/users/:id', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.DELETE), async (req, res) => {
  try {
    const user = await TWSAdmin.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user._id.toString() === req.user._id.toString()) return res.status(403).json({ success: false, error: 'Forbidden', message: 'You cannot delete your own account' });
    if (user.role === 'platform_super_admin' && req.user.role !== 'platform_super_admin') return res.status(403).json({ success: false, error: 'Forbidden', message: 'Only platform_super_admin can delete platform_super_admin users' });
    await auditService.logEvent({ action: 'PLATFORM_USER_DELETED', performedBy: req.user._id, details: { deletedUserId: user._id, deletedUserEmail: user.email, deletedUserRole: user.role, assignerRole: req.user.role, ipAddress: req.ip || req.connection.remoteAddress, userAgent: req.get('User-Agent') }, severity: 'high', status: 'success' });
    await TWSAdmin.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
  }
});

router.patch('/users/:id/assign-portal-responsibility', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.UPDATE), async (req, res) => {
  try {
    const { portalResponsibility } = req.body || {};
    const allowed = ['finance', 'hr', 'admin', 'support', 'erp_management', 'billing'];
    if (!allowed.includes(String(portalResponsibility || '').toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `portalResponsibility must be one of: ${allowed.join(', ')}`
      });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.supraAdminPortalResponsibility = String(portalResponsibility).toLowerCase();
    user.supraAdminPortalAssignedAt = new Date();
    user.supraAdminPortalAssignedBy = req.user._id;
    await user.save();
    res.json({
      success: true,
      message: 'User assigned to Supra Admin portal responsibility',
      data: {
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          supraAdminPortalResponsibility: user.supraAdminPortalResponsibility
        }
      }
    });
  } catch (error) {
    console.error('Assign portal responsibility error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign portal responsibility', error: error.message });
  }
});

router.patch('/users/:id/remove-portal-responsibility', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.UPDATE), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.supraAdminPortalResponsibility = null;
    user.supraAdminPortalAssignedAt = null;
    user.supraAdminPortalRemovedAt = new Date();
    user.supraAdminPortalRemovedBy = req.user._id;
    await user.save();
    res.json({ success: true, message: 'User removed from Supra Admin portal responsibility', data: { user: { _id: user._id, fullName: user.fullName, email: user.email } } });
  } catch (error) {
    console.error('Remove portal responsibility error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove portal responsibility', error: error.message });
  }
});

if (process.env.NODE_ENV === 'development') {
  router.post('/users/debug-verify', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
      const normalizedEmail = email.toLowerCase().trim();
      const twsAdmin = await TWSAdmin.findOne({ email: normalizedEmail });
      if (twsAdmin) {
        let passwordMatch = false;
        if (password) passwordMatch = await twsAdmin.comparePassword(password);
        return res.json({ success: true, found: true, model: 'TWSAdmin', user: { _id: twsAdmin._id, email: twsAdmin.email, fullName: twsAdmin.fullName, role: twsAdmin.role, status: twsAdmin.status, department: twsAdmin.department, hasPassword: !!twsAdmin.password, passwordMatch: password ? passwordMatch : 'not tested' } });
      }
      const user = await User.findOne({ email: normalizedEmail });
      if (user) {
        let passwordMatch = false;
        if (password) passwordMatch = await user.comparePassword(password);
        return res.json({ success: true, found: true, model: 'User', user: { _id: user._id, email: user.email, fullName: user.fullName, role: user.role, status: user.status, hasPassword: !!user.password, passwordMatch: password ? passwordMatch : 'not tested' } });
      }
      return res.json({ success: true, found: false, message: 'User not found in TWSAdmin or User models', searchedEmail: normalizedEmail });
    } catch (error) {
      console.error('Debug verify error:', error);
      res.status(500).json({ success: false, message: 'Error verifying user', error: error.message });
    }
  });
}

module.exports = router;
