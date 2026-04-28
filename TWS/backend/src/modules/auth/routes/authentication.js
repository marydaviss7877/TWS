const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
const { body, validationResult } = require('express-validator');
const { generateTokens, setAuthCookies, clearAuthCookies } = require('../../../middleware/auth/auth');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const { authLimiter, registrationLimiter, passwordResetLimiter, tokenRefreshLimiter, strictLimiter } = require('../../../middleware/rateLimiting/rateLimiter');
const { setSecureCookie, setRefreshTokenCookie, clearSecureCookie } = require('../../../middleware/security/cookieSecurity');

// Validation handler - standalone implementation
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

const validator = require('validator');
const User = require('../../../models/User');
const Organization = require('../../../models/Organization');
const TWSAdmin = require('../../../models/TWSAdmin');

const router = express.Router();

const getExistingProfilePicPathOrNull = async (relativePath) => {
  if (!relativePath || typeof relativePath !== 'string' || !relativePath.startsWith('/uploads/profile-pictures/')) {
    return relativePath || null;
  }
  try {
    const absolutePath = path.join(process.cwd(), relativePath.replace(/^\//, ''));
    await fs.access(absolutePath);
    return relativePath;
  } catch {
    return null;
  }
};

// express-validator's normalizeEmail() uses validator defaults (removes Gmail dots).
// User creation (HR / org) uses { gmail_remove_dots: false } — mismatch caused valid logins to 401.
const AUTH_EMAIL_NORMALIZE = { gmail_remove_dots: false };

// Middleware to check if database is connected
const checkDatabaseConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database connection not ready. Please try again in a moment.'
    });
  }
  next();
};

/**
 * GET /api/auth/db-status?email=...
 * Diagnostic: DB connection + whether email exists in User or TWSAdmin (no secrets).
 * Use to verify backend is connected and sees the user when login returns 401.
 */
router.get('/db-status', checkDatabaseConnection, ErrorHandler.asyncHandler(async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbName = mongoose.connection.db?.databaseName || null;
  const payload = {
    database: {
      connected: dbState === 1,
      readyState: dbState,
      name: dbName
    }
  };
  const email = (req.query.email || '').toLowerCase().trim();
  if (email) {
    const normalized = validator.normalizeEmail(String(email).trim(), AUTH_EMAIL_NORMALIZE)
      || String(email).trim().toLowerCase();
    const [userDoc, twsDoc] = await Promise.all([
      User.findOne({ email: normalized }).select('_id email role status').lean(),
      TWSAdmin.findOne({ email: normalized }).select('_id email role status').lean()
    ]);
    payload.emailCheck = {
      email: normalized,
      inUser: !!userDoc,
      inTWSAdmin: !!twsDoc,
      userId: userDoc?._id?.toString() || null,
      twsAdminId: twsDoc?._id?.toString() || null,
      role: userDoc?.role || twsDoc?.role || null,
      status: userDoc?.status || twsDoc?.status || null
    };
  }
  res.json({ success: true, data: payload });
}));

// Register
router.post('/register', 
  registrationLimiter, // SECURITY: Rate limiting (3 registrations per hour per IP)
  checkDatabaseConnection,
  body('email').isEmail().normalizeEmail(AUTH_EMAIL_NORMALIZE),
  body('password').isLength({ min: 6 }),
  body('fullName').notEmpty().trim(),
  body('role').optional().isIn(['super_admin', 'org_manager', 'pmo', 'project_manager', 'department_lead', 'contributor', 'client', 'reseller', 'owner', 'admin', 'hr', 'finance', 'manager', 'employee', 'contractor', 'auditor']),
  handleValidationErrors,
  ErrorHandler.asyncHandler(async (req, res) => {
  const { email, password, fullName, role = 'contributor' } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User already exists'
    });
  }

  // Get default organization (for now, assign all users to the default org)
  const organization = await Organization.findOne({ slug: 'wolfstack' });
  if (!organization) {
    return res.status(500).json({
      success: false,
      message: 'Default organization not found. Please contact administrator.'
    });
  }

  // Create user
  const user = new User({
    email,
    password,
    fullName,
    role,
    orgId: organization._id
  });

  await user.save();

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id);

  // Store refresh token
  user.refreshTokens.push({ token: refreshToken });
  await user.save();

  // SECURITY FIX: Set HttpOnly cookies instead of returning tokens in response
  setSecureCookie(res, 'accessToken', accessToken, { maxAge: 15 * 60 * 1000 }); // 15 minutes
  setRefreshTokenCookie(res, 'refreshToken', refreshToken, { maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: user.toJSON()
      // Tokens are now in HttpOnly cookies, not in response body
    }
  });
}));

// Login - tenant / software-house users ONLY
// Supra admins must use POST /api/auth/supra-admin/login
router.post('/login',
  authLimiter,
  checkDatabaseConnection,
  body('email').isEmail().normalizeEmail(AUTH_EMAIL_NORMALIZE),
  body('password').notEmpty(),
  handleValidationErrors,
  ErrorHandler.asyncHandler(async (req, res) => {
    const password = String(req.body.password ?? '').trim();
    const rawEmail = String(req.body.email || '').trim();
    const normalizedEmail = validator.normalizeEmail(rawEmail, AUTH_EMAIL_NORMALIZE)
      || rawEmail.toLowerCase();

    // Single lookup in User model — supra admins are not here
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is not active' });
    }

    const isPasswordValid = await user.comparePassword(password).catch(() => false);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Update last login without triggering password re-hash
    await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } }).catch(() => {});

    // Build token payload with tenant context
    const Organization = require('../../../models/Organization');
    const Tenant = require('../../../models/Tenant');

    let additionalPayload = {};
    let orgData = null;

    const orgId = (typeof user.orgId === 'object' && user.orgId._id) ? user.orgId._id : user.orgId;
    if (orgId) {
      const org = await Organization.findById(orgId).select('slug name').lean();
      if (org) {
        orgData = org;
        const tenant = await Tenant.findOne({
          $or: [{ organizationId: org._id }, { slug: org.slug }]
        }).select('_id slug').lean();

        if (tenant) {
          additionalPayload = {
            tenantId: tenant._id.toString(),
            tenantSlug: tenant.slug,
            orgId: org._id.toString()
          };
        }
      }
    }

    const { accessToken, refreshToken } = generateTokens(user._id, additionalPayload);
    await User.updateOne({ _id: user._id }, { $push: { refreshTokens: { token: refreshToken } } }).catch(() => {});

    setSecureCookie(res, 'accessToken', accessToken, { maxAge: 15 * 60 * 1000 });
    setRefreshTokenCookie(res, 'refreshToken', refreshToken, { maxAge: 30 * 24 * 60 * 60 * 1000 });

    const userData = user.toJSON ? user.toJSON() : { ...user._doc };
    if (userData._id && !userData.id) userData.id = userData._id.toString();

    if (orgData) {
      userData.orgId = { _id: orgData._id, slug: orgData.slug, name: orgData.name };
      const tenantRoles = ['owner', 'admin', 'org_manager', 'project_manager', 'manager', 'employee',
        'staff', 'developer', 'engineer', 'programmer'];
      if (tenantRoles.includes(user.role)) {
        userData.tenantId = orgData.slug;
      }
    } else if (user.tenantId) {
      const org = await Organization.findOne({ slug: user.tenantId }).select('slug name').lean();
      if (org) {
        userData.orgId = { _id: org._id, slug: org.slug, name: org.name };
        userData.tenantId = org.slug;
      }
    }

    res.json({ success: true, message: 'Login successful', data: { user: userData } });
  })
);

// Supra Admin Login - TWSAdmin model ONLY
// Regular tenant users must use POST /api/auth/login
router.post('/supra-admin/login',
  authLimiter,
  checkDatabaseConnection,
  body('email').isEmail().normalizeEmail(AUTH_EMAIL_NORMALIZE),
  body('password').notEmpty(),
  handleValidationErrors,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();

    const admin = await TWSAdmin.findOne({ email: normalizedEmail });

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (admin.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is not active' });
    }

    const isPasswordValid = await admin.comparePassword(password).catch(() => false);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Pass admin identity as the userId object so token type stays 'access'.
    // auth.js middleware handles this at: decoded.userId?.type === 'tws_admin'
    const { accessToken, refreshToken } = generateTokens({ _id: admin._id, type: 'tws_admin' });

    setSecureCookie(res, 'accessToken', accessToken, { maxAge: 15 * 60 * 1000 });
    setRefreshTokenCookie(res, 'refreshToken', refreshToken, { maxAge: 30 * 24 * 60 * 60 * 1000 });

    const userData = admin.toJSON ? admin.toJSON() : { ...admin._doc };
    if (userData._id && !userData.id) userData.id = userData._id.toString();
    userData.role = 'super_admin';
    userData.userType = 'twsAdmin';
    userData.orgId = null;
    userData.tenantId = null;

    res.json({ success: true, message: 'Login successful', data: { user: userData } });
  })
);

// Refresh token
router.post('/refresh',
  tokenRefreshLimiter, // SECURITY: Rate limiting (10 refresh attempts per 15 minutes per IP)
  ErrorHandler.asyncHandler(async (req, res) => {
  // SECURITY FIX: Get refresh token from cookie instead of request body
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token is required'
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Check if refresh token exists in user's tokens
    const tokenExists = user.refreshTokens.some(token => token.token === refreshToken);
    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    // Remove old refresh token and add new one
    user.refreshTokens = user.refreshTokens.filter(token => token.token !== refreshToken);
    user.refreshTokens.push({ token: newRefreshToken });
    await user.save();

    // SECURITY FIX: Set new tokens in HttpOnly cookies
    setSecureCookie(res, 'accessToken', accessToken, { maxAge: 15 * 60 * 1000 }); // 15 minutes
    setRefreshTokenCookie(res, 'refreshToken', newRefreshToken, { maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days

    res.json({
      success: true,
      message: 'Token refreshed successfully'
      // Tokens are now in HttpOnly cookies, not in response body
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
}));

// Logout - Allow unauthenticated requests (frontend may call this even if login fails)
router.post('/logout', ErrorHandler.asyncHandler(async (req, res) => {
  try {
    // SECURITY FIX: Get refresh token from cookie instead of request body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    
    // Try to get user from token if available
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (user && refreshToken) {
          // Remove refresh token from user
          await User.findByIdAndUpdate(user._id, {
            $pull: { refreshTokens: { token: refreshToken } }
          });
        }
      } catch (tokenError) {
        // Token is invalid, just continue with logout
        console.log('Logout: Invalid or expired token, continuing with logout');
      }
    } else if (refreshToken) {
      // Try to find user by refresh token
      const user = await User.findOne({ 'refreshTokens.token': refreshToken });
      if (user) {
        await User.findByIdAndUpdate(user._id, {
          $pull: { refreshTokens: { token: refreshToken } }
        });
      }
    }

    // SECURITY FIX: Clear HttpOnly cookies
    clearSecureCookie(res, 'accessToken');
    clearSecureCookie(res, 'refreshToken');

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    // Even if logout fails, return success to frontend and clear cookies
    console.error('Logout error:', error);
    clearSecureCookie(res, 'accessToken');
    clearSecureCookie(res, 'refreshToken');
    res.json({
      success: true,
      message: 'Logout successful'
    });
  }
}));

// Get token info (for frontend to check if authenticated)
// SECURITY FIX: Returns token info from HttpOnly cookie
router.get('/token-info', ErrorHandler.asyncHandler(async (req, res) => {
  const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.json({
      success: false,
      data: { token: null, authenticated: false }
    });
  }
  
  // Verify token is valid
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({
      success: true,
      data: {
        token: token.substring(0, 20) + '...', // Only return preview, not full token
        authenticated: true,
        userId: decoded.userId,
        expiresAt: decoded.exp
      }
    });
  } catch (error) {
    return res.json({
      success: false,
      data: { token: null, authenticated: false }
    });
  }
}));

// Get current user
router.get('/me', verifyERPToken, ErrorHandler.asyncHandler(async (req, res) => {
  // Check if user is TWSAdmin or regular User
  const isTWSAdmin = req.authContext?.type === 'tws_admin' || 
                     (req.user && !req.user.orgId && req.user.role?.startsWith('platform_'));
  
  let userData;
  
  if (isTWSAdmin) {
    // TWSAdmin user - already fetched by verifyERPToken middleware
    userData = req.user.toJSON ? req.user.toJSON() : req.user;
    // Ensure id field is set from _id for frontend compatibility
    if (userData._id && !userData.id) {
      userData.id = userData._id.toString();
    }
    // Ensure role is set to super_admin for Supra Admin portal access
    userData.role = 'super_admin';
    userData.userType = 'twsAdmin';
    userData.orgId = null;
    userData.tenantId = null;
  } else {
    // Reuse user loaded by verifyERPToken (avoids a second User.findById + populate — saves ~hundreds of ms per call)
    const u = req.user && typeof req.user.toObject === 'function' ? req.user.toObject() : { ...req.user };
    if (!u || !u._id) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    userData = { ...u };
    
    // Ensure id field is set from _id for frontend compatibility
    if (userData._id && !userData.id) {
      userData.id = userData._id.toString();
    }
    
    if (u.orgId) {
      // If orgId is already populated, use it directly
      if (typeof u.orgId === 'object' && u.orgId.slug) {
        userData.orgId = {
          _id: u.orgId._id,
          slug: u.orgId.slug,
          name: u.orgId.name
        };
        // Set tenantId for routing
        const tenantRoles = ['owner', 'admin', 'org_manager', 'project_manager', 'manager', 'employee', 'staff', 'developer', 'engineer', 'programmer'];
        if (tenantRoles.includes(u.role)) {
          userData.tenantId = u.orgId.slug;
        }
      } else {
        const Organization = require('../../../models/Organization');
        const org = await Organization.findById(u.orgId).select('slug name').lean();
        if (org) {
          userData.orgId = {
            _id: org._id,
            slug: org.slug,
            name: org.name
          };
          const tenantRoles = ['owner', 'admin', 'org_manager', 'project_manager', 'manager', 'employee', 'staff', 'developer', 'engineer', 'programmer'];
          if (tenantRoles.includes(u.role)) {
            userData.tenantId = org.slug;
          }
        }
      }
    }
  }
  
  if (!isTWSAdmin && userData?.profilePicUrl) {
    userData.profilePicUrl = await getExistingProfilePicPathOrNull(userData.profilePicUrl);
  }

  res.json({
    success: true,
    data: {
      user: userData
    }
  });
}));

// Change password
router.post('/change-password',
  verifyERPToken,
  strictLimiter, // SECURITY: Rate limiting (10 requests per 15 minutes per user)
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
  handleValidationErrors,
  ErrorHandler.asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = newPassword;
  // Clear mustChangePassword flag if it was set
  if (user.mustChangePassword) {
    user.mustChangePassword = false;
  }
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// Forgot password - Request password reset
router.post('/forgot-password',
  passwordResetLimiter, // SECURITY: Rate limiting (3 password reset requests per hour per IP)
  checkDatabaseConnection,
  body('email').isEmail().normalizeEmail(AUTH_EMAIL_NORMALIZE),
  handleValidationErrors,
  ErrorHandler.asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = validator.normalizeEmail(String(email || '').trim(), AUTH_EMAIL_NORMALIZE)
    || String(email || '').trim().toLowerCase();

  // Find user
  const user = await User.findOne({ email: normalizedEmail });
  
  // For security, don't reveal if user exists or not
  if (!user) {
    // Still return success to prevent email enumeration
    return res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  }

  // Check if user is active
  if (user.status !== 'active') {
    return res.status(403).json({
      success: false,
      message: 'Account is not active. Please contact administrator.'
    });
  }

  // Generate temporary password (8 characters)
  const crypto = require('crypto');
  const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 character password
  
  // Update user password
  user.password = tempPassword;
  user.mustChangePassword = true; // Force password change on next login
  await user.save();

  // Send password reset email
  try {
    const emailService = require('../../../services/integrations/email.service');
    await emailService.sendPasswordResetEmail(user, tempPassword);
    
    res.json({
      success: true,
      message: 'A temporary password has been sent to your email. Please check your inbox and change your password after logging in.'
    });
  } catch (emailError) {
    console.error('Error sending password reset email:', emailError);
    // Still return success but log the error
    res.json({
      success: true,
      message: 'Password reset initiated. Please contact administrator if you do not receive the email.',
      // In development, return the temp password for testing
      ...(process.env.NODE_ENV === 'development' && { tempPassword })
    });
  }
}));

// ---------------------------------------------------------------------------
// INVITE ACCEPT — public endpoints (no tenant slug needed; token identifies tenant)
// GET  /api/auth/invite/accept?token=  — validate token, return invitee info
// POST /api/auth/invite/accept         — set password + activate account
// ---------------------------------------------------------------------------

router.get('/invite/accept', checkDatabaseConnection, ErrorHandler.asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ success: false, message: 'token required' });

  const TenantUser = require('../../../models/TenantUser');
  const tenantUser = await TenantUser.findOne({
    'invitation.invitationToken': token,
    'invitation.invitationExpires': { $gt: new Date() },
    status: 'pending'
  }).populate('userId', 'email fullName');

  if (!tenantUser) {
    return res.status(400).json({ success: false, message: 'Invalid or expired invitation link' });
  }

  res.json({
    success: true,
    data: {
      email: tenantUser.userId?.email,
      fullName: tenantUser.userId?.fullName,
      role: tenantUser.roles?.[0]?.role || 'employee'
    }
  });
}));

router.post('/invite/accept',
  checkDatabaseConnection,
  body('token').notEmpty(),
  body('password').isLength({ min: 6 }),
  handleValidationErrors,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    const TenantUser = require('../../../models/TenantUser');
    const tenantUser = await TenantUser.findOne({
      'invitation.invitationToken': token,
      'invitation.invitationExpires': { $gt: new Date() },
      status: 'pending'
    });

    if (!tenantUser) {
      return res.status(400).json({ success: false, message: 'Invalid or expired invitation link' });
    }

    const user = await User.findById(tenantUser.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User account not found' });

    user.password = password;
    user.status = 'active';
    user.mustChangePassword = false;
    await user.save();

    tenantUser.status = 'active';
    tenantUser.invitation.acceptedAt = new Date();
    tenantUser.lastActivity = new Date();
    await tenantUser.save();

    try {
      const { invalidateResolvedPermissions } = require('../../../services/tenant/permissionResolver.service');
      await invalidateResolvedPermissions(tenantUser.tenantId, user._id);
    } catch (_) {}

    res.json({ success: true, message: 'Account activated. You can now log in.' });
  })
);

// GTS Admin Login removed - functionality consolidated into TWS Admin / Supra Admin

module.exports = router;
