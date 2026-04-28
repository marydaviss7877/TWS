const express = require('express');
const { body, query, validationResult } = require('express-validator');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const User = require('../../../models/User');
const Employee = require('../../../models/Employee');

// Validation handler - standalone implementation (same as authentication.js)
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

const router = express.Router();
router.use(verifyERPToken);
const usersRead = requireErpAccess({ module: 'users', action: ['read', 'read_own'], checkRevocation: true });
const usersWrite = requireErpAccess({ module: 'users', action: ['write', 'admin'], checkRevocation: true });
const resolveOrgId = (req) => {
  return (
    req.user?.orgId?._id ||
    req.user?.orgId ||
    req.authContext?.orgId ||
    null
  );
};

// Get all users
router.get('/', [
  usersRead,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('role').optional().isIn(['owner', 'admin', 'hr', 'finance', 'manager', 'employee', 'contractor', 'auditor']),
  query('status').optional().isIn(['active', 'suspended', 'inactive']),
  handleValidationErrors,
  ErrorHandler.asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const orgId = resolveOrgId(req);
  if (!orgId) {
    return res.status(403).json({ success: false, message: 'Organization context not found' });
  }
  const filter = { orgId };
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status) filter.status = req.query.status;

  const users = await User.find(filter)
    .select('-password -refreshTokens')
    .populate('managerId', 'fullName email')
    .populate('teamIds', 'name')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(filter);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
})
]);

// Get current user's own profile (must be before /:id)
router.get('/profile', ErrorHandler.asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const user = await User.findById(userId)
    .select('-password -refreshTokens')
    .populate('orgId', 'slug name');
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        department: user.department,
        jobTitle: user.jobTitle,
        role: user.role,
        profilePicUrl: user.profilePicUrl,
        status: user.status,
        orgId: user.orgId
      }
    }
  });
}));

// Update current user's own profile (must be before /:id)
router.patch('/profile', [
  body('fullName').optional().trim().notEmpty(),
  body('phone').optional().trim(),
  body('department').optional().trim(),
  body('jobTitle').optional().trim(),
  handleValidationErrors,
  ErrorHandler.asyncHandler(async (req, res) => {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const { fullName, phone, department, jobTitle } = req.body;
    if (fullName !== undefined) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    if (department !== undefined) user.department = department;
    if (jobTitle !== undefined) user.jobTitle = jobTitle;
    await user.save();
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          department: user.department,
          jobTitle: user.jobTitle,
          role: user.role,
          profilePicUrl: user.profilePicUrl,
          status: user.status
        }
      }
    });
  })
]);

// Get user by ID
router.get('/:id', usersRead, ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = resolveOrgId(req);
  if (!orgId) {
    return res.status(403).json({ success: false, message: 'Organization context not found' });
  }
  const user = await User.findOne({ _id: req.params.id, orgId })
    .select('-password -refreshTokens')
    .populate('managerId', 'fullName email')
    .populate('teamIds', 'name');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: { user }
  });
}));

// Create user (invite)
router.post('/', [
  usersWrite,
  body('email').isEmail().normalizeEmail(),
  body('fullName').notEmpty().trim(),
  body('role').isIn(['owner', 'admin', 'hr', 'finance', 'manager', 'employee', 'contractor', 'auditor']),
  body('department').optional().notEmpty(),
  body('jobTitle').optional().notEmpty(),
  body('managerId').optional().isMongoId(),
  handleValidationErrors,
  ErrorHandler.asyncHandler(async (req, res) => {
  const { email, fullName, role, department, jobTitle, managerId } = req.body;
  const orgId = resolveOrgId(req);
  if (!orgId) {
    return res.status(403).json({ success: false, message: 'Organization context not found' });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email, orgId });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User already exists'
    });
  }

  // Generate temporary password
  const tempPassword = Math.random().toString(36).slice(-8);

  const user = new User({
    email,
    password: tempPassword,
    fullName,
    role,
    orgId,
    department,
    jobTitle,
    managerId
  });

  await user.save();

  // TODO: Send invitation email with temporary password

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      user: user.toJSON(),
      tempPassword // Remove this in production
    }
  });
})
]);

// Update user
router.patch('/:id', [
  usersWrite,
  body('fullName').optional().notEmpty().trim(),
  body('role').optional().isIn(['owner', 'admin', 'hr', 'finance', 'manager', 'employee', 'contractor', 'auditor']),
  body('status').optional().isIn(['active', 'suspended', 'inactive']),
  body('department').optional().notEmpty(),
  body('jobTitle').optional().notEmpty(),
  body('managerId').optional().isMongoId(),
  body('teamIds').optional().isArray(),
  handleValidationErrors,
  ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = resolveOrgId(req);
  if (!orgId) {
    return res.status(403).json({ success: false, message: 'Organization context not found' });
  }
  const updates = req.body;
  delete updates.password; // Prevent password updates through this route
  delete updates.email; // Prevent email updates

  const user = await User.findOneAndUpdate(
    { _id: req.params.id, orgId },
    updates,
    { new: true, runValidators: true }
  ).select('-password -refreshTokens');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user }
  });
})
]);

// Delete user
router.delete('/:id', usersWrite, ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = resolveOrgId(req);
  if (!orgId) {
    return res.status(403).json({ success: false, message: 'Organization context not found' });
  }
  const user = await User.findOne({ _id: req.params.id, orgId });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check if user has any associated data
  const employee = await Employee.findOne({ userId: user._id });
  if (employee) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete user with employee record. Please delete employee record first.'
    });
  }

  await User.findOneAndDelete({ _id: req.params.id, orgId });

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

// Get user's teams
router.get('/:id/teams', usersRead, ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = resolveOrgId(req);
  if (!orgId) {
    return res.status(403).json({ success: false, message: 'Organization context not found' });
  }
  const user = await User.findOne({ _id: req.params.id, orgId })
    .populate('teamIds', 'name description members')
    .select('teamIds');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: { teams: user.teamIds }
  });
}));

// Update user's teams
router.patch('/:id/teams', [
  usersWrite,
  body('teamIds').isArray(),
  handleValidationErrors,
  ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = resolveOrgId(req);
  if (!orgId) {
    return res.status(403).json({ success: false, message: 'Organization context not found' });
  }
  const { teamIds } = req.body;

  const user = await User.findOneAndUpdate(
    { _id: req.params.id, orgId },
    { teamIds },
    { new: true }
  ).select('-password -refreshTokens');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    message: 'User teams updated successfully',
    data: { user }
  });
})
]);

module.exports = router;
