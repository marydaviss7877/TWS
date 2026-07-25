const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const Tenant = require('../../../models/tenant/Tenant');
const { generateTokens } = require('../../../middleware/auth/auth');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const envConfig = require('../../../config/environment');
const { authLimiter, passwordResetLimiter, tokenRefreshLimiter, strictLimiter } = require('../../../middleware/rateLimiting/rateLimiter');
const { setSecureCookie, setRefreshTokenCookie, clearSecureCookie } = require('../../../middleware/security/cookieSecurity');

const router = express.Router();

/**
 * @swagger
 * /api/tenant-auth/test:
 *   get:
 *     summary: Health check for the tenant auth router
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Router is reachable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tenant auth router is working
 */
router.get('/test', (req, res) => {
  res.json({ message: 'Tenant auth router is working' });
});

// Never expose owner/tenant resolution by username in production.
/**
 * @swagger
 * /api/tenant-auth/debug-tenant:
 *   post:
 *     summary: "Debug: resolve a tenant by owner username"
 *     description: >
 *       Only registered when NODE_ENV=development (not mounted in production).
 *       Returns tenant owner metadata including whether a password hash is
 *       set and its length — no plaintext password or hash value is returned.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tenant found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 tenant:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     slug:
 *                       type: string
 *                     status:
 *                       type: string
 *                     ownerCredentials:
 *                       type: object
 *                       properties:
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         fullName:
 *                           type: string
 *                         isActive:
 *                           type: boolean
 *                         hasPassword:
 *                           type: boolean
 *                         passwordLength:
 *                           type: number
 *                         lastLogin:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Username is required
 *       404:
 *         description: Tenant not found
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/debug-tenant', async (req, res) => {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: 'Username is required'
        });
      }

      const tenant = await Tenant.findOne({ 'ownerCredentials.username': username.toLowerCase() });

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found'
        });
      }

      res.json({
        success: true,
        tenant: {
          id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          ownerCredentials: {
            username: tenant.ownerCredentials.username,
            email: tenant.ownerCredentials.email,
            fullName: tenant.ownerCredentials.fullName,
            isActive: tenant.ownerCredentials.isActive,
            hasPassword: !!tenant.ownerCredentials.password,
            passwordLength: tenant.ownerCredentials.password?.length,
            lastLogin: tenant.ownerCredentials.lastLogin
          }
        }
      });
    } catch (error) {
      console.error('Debug tenant error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });
}

/**
 * @swagger
 * /api/tenant-auth/login:
 *   post:
 *     summary: Log in as a tenant owner
 *     description: >
 *       Rate limited to 5 requests/15min/IP. Accepts either the owner
 *       username or owner email in the `username` field. On success,
 *       `accessToken` and `refreshToken` (JWT type "tenant_owner") are set as
 *       httpOnly cookies; no tokens are returned in the response body.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 description: Owner username or owner email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful; auth cookies set
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     tenant:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         slug:
 *                           type: string
 *                         status:
 *                           type: string
 *                         plan:
 *                           type: string
 *                         erpModules:
 *                           type: array
 *                           items:
 *                             type: string
 *                         erpCategory:
 *                           type: string
 *                         orgId:
 *                           type: string
 *                           nullable: true
 *                         owner:
 *                           type: object
 *                           properties:
 *                             username:
 *                               type: string
 *                             email:
 *                               type: string
 *                             fullName:
 *                               type: string
 *                             lastLogin:
 *                               type: string
 *                               format: date-time
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Tenant account is not active, or owner account is disabled
 *       429:
 *         description: Too many login attempts from this IP
 *       500:
 *         description: Internal server error
 */
// Tenant Owner Login
router.post('/login',
  authLimiter, // SECURITY: Rate limiting (5 login attempts per 15 minutes per IP)
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username, password } = req.body;
    const normalizedUsername = username.toLowerCase().trim();

    // Find tenant by owner username OR email (for better UX)
    // Try username first
    let tenant = await Tenant.findOne({ 'ownerCredentials.username': normalizedUsername });

    // If not found by username, try email
    if (!tenant) {
      tenant = await Tenant.findOne({ 'ownerCredentials.email': normalizedUsername });
    }

    if (!tenant) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if tenant is active
    if (tenant.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Tenant account is not active'
      });
    }

    // Check if owner credentials are active
    if (!tenant.ownerCredentials.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Owner account is disabled'
      });
    }


    const isUsernameMatch = tenant.ownerCredentials.username === normalizedUsername;
    const isEmailMatch = tenant.ownerCredentials.email === normalizedUsername;

    if (!isUsernameMatch && !isEmailMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, tenant.ownerCredentials.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login on successful login
    tenant.ownerCredentials.lastLogin = new Date();
    await tenant.save();

    // Generate tokens for tenant owner
    // Use jwtService to generate tokens with tenant_owner type
    const jwtConfig = envConfig.getJWTConfig();
    
    // Generate access token with tenant_owner type
    const accessTokenPayload = {
      userId: tenant._id.toString(), // Use tenant._id as userId
      tenantId: tenant._id.toString(),
      tenantSlug: tenant.slug,
      ownerId: tenant.ownerCredentials.username,
      ownerEmail: tenant.ownerCredentials.email,
      type: 'tenant_owner', // Custom type for tenant owners
      iat: Math.floor(Date.now() / 1000)
    };
    
    const accessToken = jwt.sign(accessTokenPayload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn || '15m',
      issuer: 'tws-backend',
      audience: 'tws-frontend'
    });
    
    // Generate refresh token
    const refreshTokenJti = crypto.randomUUID();
    const refreshTokenPayload = {
      userId: tenant._id.toString(),
      tenantId: tenant._id.toString(),
      tenantSlug: tenant.slug,
      ownerId: tenant.ownerCredentials.username,
      type: 'tenant_owner',
      jti: refreshTokenJti,
      iat: Math.floor(Date.now() / 1000)
    };
    
    const refreshToken = jwt.sign(refreshTokenPayload, jwtConfig.refreshSecret || jwtConfig.secret, {
      expiresIn: jwtConfig.refreshExpiresIn || '7d',
      issuer: 'tws-backend',
      audience: 'tws-frontend'
    });
    
    // SECURITY FIX: Set HttpOnly cookies instead of returning tokens in response
    setSecureCookie(res, 'accessToken', accessToken, { maxAge: 15 * 60 * 1000 }); // 15 minutes
    setRefreshTokenCookie(res, 'refreshToken', refreshToken, { maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days

    // Return success response
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        tenant: {
          id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          plan: tenant.subscription?.plan || 'trial',
          erpModules: tenant.erpModules || [],
          erpCategory: tenant.erpCategory || 'business',
          orgId: tenant.orgId || null,
          owner: {
            username: tenant.ownerCredentials.username,
            email: tenant.ownerCredentials.email,
            fullName: tenant.ownerCredentials.fullName,
            lastLogin: tenant.ownerCredentials.lastLogin
          }
        }
        // Tokens are now in HttpOnly cookies, not in response body
      }
    });

  } catch (error) {
    console.error('Tenant login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/tenant-auth/refresh:
 *   post:
 *     summary: Refresh a tenant owner's access token
 *     description: >
 *       Rate limited to 10 requests/15min/IP. Reads the refresh token from
 *       the httpOnly `refreshToken` cookie (falls back to the request body).
 *       Rotates both tokens and sets them as new httpOnly cookies; no tokens
 *       are returned in the response body.
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Token refreshed successfully; new auth cookies set
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Refresh token is required
 *       401:
 *         description: Invalid or expired refresh token
 *       403:
 *         description: Invalid token type
 *       404:
 *         description: Tenant not found or inactive
 *       429:
 *         description: Too many refresh attempts from this IP
 *       500:
 *         description: Internal server error
 */
// Refresh tenant token
router.post('/refresh',
  tokenRefreshLimiter, // SECURITY: Rate limiting (10 refresh attempts per 15 minutes per IP)
  async (req, res) => {
  try {
    // SECURITY FIX: Get refresh token from cookie instead of request body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }
    
    // Verify refresh token
    const jwtConfig = envConfig.getJWTConfig();
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret || jwtConfig.secret, {
        issuer: 'tws-backend',
        audience: 'tws-frontend'
      });
    } catch (error) {
      console.error('Refresh token verification failed:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }
    
    // Verify it's a tenant_owner token
    if (decoded.type !== 'tenant_owner') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token type'
      });
    }
    
    // Find tenant
    const tenant = await Tenant.findById(decoded.tenantId || decoded.userId);
    if (!tenant || tenant.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found or inactive'
      });
    }
    
    // Generate new access token
    const accessTokenPayload = {
      userId: tenant._id.toString(),
      tenantId: tenant._id.toString(),
      tenantSlug: tenant.slug,
      ownerId: tenant.ownerCredentials.username,
      ownerEmail: tenant.ownerCredentials.email,
      type: 'tenant_owner',
      iat: Math.floor(Date.now() / 1000)
    };
    
    const accessToken = jwt.sign(accessTokenPayload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn || '15m',
      issuer: 'tws-backend',
      audience: 'tws-frontend'
    });
    
    // Optionally generate new refresh token (refresh token rotation)
    const refreshTokenJti = crypto.randomUUID();
    const newRefreshTokenPayload = {
      userId: tenant._id.toString(),
      tenantId: tenant._id.toString(),
      tenantSlug: tenant.slug,
      ownerId: tenant.ownerCredentials.username,
      type: 'tenant_owner',
      jti: refreshTokenJti,
      iat: Math.floor(Date.now() / 1000)
    };
    
    const newRefreshToken = jwt.sign(newRefreshTokenPayload, jwtConfig.refreshSecret || jwtConfig.secret, {
      expiresIn: jwtConfig.refreshExpiresIn || '7d',
      issuer: 'tws-backend',
      audience: 'tws-frontend'
    });
    
    // SECURITY FIX: Set new tokens in HttpOnly cookies
    setSecureCookie(res, 'accessToken', accessToken, { maxAge: 15 * 60 * 1000 }); // 15 minutes
    setRefreshTokenCookie(res, 'refreshToken', newRefreshToken, { maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days
    
    res.json({
      success: true,
      message: 'Token refreshed successfully'
      // Tokens are now in HttpOnly cookies, not in response body
    });
    
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/tenant-auth/logout:
 *   post:
 *     summary: Log out a tenant owner
 *     description: >
 *       Clears the `accessToken` and `refreshToken` httpOnly cookies. Always
 *       responds 200, even on internal error.
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout successful; auth cookies cleared
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
// Logout tenant owner
router.post('/logout', ErrorHandler.asyncHandler(async (req, res) => {
  try {
    // SECURITY FIX: Get refresh token from cookie instead of request body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    
    // Try to get user from token if available
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      try {
        const jwtConfig = envConfig.getJWTConfig();
        const decoded = jwt.verify(token, jwtConfig.secret, {
          issuer: 'tws-backend',
          audience: 'tws-frontend'
        });
        
        if (decoded.type === 'tenant_owner' && refreshToken) {
          // Find tenant and remove refresh token
          const tenant = await Tenant.findById(decoded.tenantId || decoded.userId);
          if (tenant) {
            // Remove refresh token from tenant (if stored)
            // Note: Tenant model may not have refreshTokens array
            // This is a placeholder - adjust based on your Tenant model structure
          }
        }
      } catch (tokenError) {
        // Token is invalid, just continue with logout
        console.log('Logout: Invalid or expired token, continuing with logout');
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

/**
 * @swagger
 * /api/tenant-auth/profile:
 *   get:
 *     summary: Get tenant owner profile (not yet implemented)
 *     description: >
 *       Placeholder endpoint — no authentication middleware is applied and no
 *       real profile data is returned yet.
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Placeholder response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile endpoint - implement token verification middleware
 */
// Get tenant owner profile
router.get('/profile', async (req, res) => {
  try {
    // This would typically use middleware to verify the tenant owner token
    // For now, we'll return a placeholder
    res.json({
      success: true,
      message: 'Profile endpoint - implement token verification middleware'
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/tenant-auth/change-password:
 *   post:
 *     summary: Change a tenant owner's password
 *     description: >
 *       Rate limited to 10 requests/15min/user. Identifies the tenant by
 *       `username` in the body rather than via an authenticated session — no
 *       auth middleware is applied to this route.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword, username]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Current password is incorrect
 *       404:
 *         description: Tenant not found
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Internal server error
 */
// Change tenant owner password
router.post('/change-password',
  strictLimiter, // SECURITY: Rate limiting (10 requests per 15 minutes per user)
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    body('username').notEmpty().withMessage('Username is required')
  ], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { currentPassword, newPassword, username } = req.body;

    // Find tenant by username
    const tenant = await Tenant.findOne({ 'ownerCredentials.username': username.toLowerCase() });
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, tenant.ownerCredentials.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    tenant.ownerCredentials.password = hashedNewPassword;
    await tenant.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


/**
 * @swagger
 * /api/tenant-auth/reset-password:
 *   post:
 *     summary: Reset a tenant owner's password by email
 *     description: >
 *       Rate limited to 3 requests/hour/IP. Generates a random temporary
 *       password and emails it to the tenant owner's registered address —
 *       the password is never returned in the API response. Always returns
 *       a generic success message, whether or not the email matches a
 *       tenant, to avoid leaking which emails are registered.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Generic acknowledgement — does not reveal whether the email matched a tenant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *       400:
 *         description: Email is required
 *       429:
 *         description: Too many password reset requests from this IP
 *       500:
 *         description: Failed to reset password
 */
router.post('/reset-password',
  passwordResetLimiter, // SECURITY: Rate limiting (3 password reset requests per hour per IP)
  async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const tenant = await Tenant.findOne({ 'ownerCredentials.email': email });

    // Don't reveal whether the email matches a tenant (prevents account enumeration)
    const genericResponse = {
      success: true,
      message: 'If an account with that email exists, a temporary password has been sent to it.'
    };

    if (!tenant) {
      return res.json(genericResponse);
    }

    // Generate a random temporary password — never a hardcoded value, never returned in the response
    const newPassword = crypto.randomBytes(4).toString('hex'); // 8 character password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    tenant.ownerCredentials.password = hashedPassword;
    await tenant.save();

    try {
      const emailService = require('../../../services/integrations/email.service');
      await emailService.sendPasswordResetEmail(
        { email: tenant.ownerCredentials.email, fullName: tenant.ownerCredentials.username || tenant.name },
        newPassword
      );
    } catch (emailError) {
      console.error('Error sending tenant password reset email:', emailError);
      // Do not fall back to returning the password in the response, even in development —
      // this endpoint resets a tenant owner account, not a throwaway dev user.
    }

    res.json(genericResponse);
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

module.exports = router;
