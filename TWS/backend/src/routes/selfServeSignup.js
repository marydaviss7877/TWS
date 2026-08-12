const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const selfServeSignupService = require('../services/tenant/self-serve-signup.service');
const onboardingChecklistService = require('../services/onboardingChecklistService');
const emailVerificationService = require('../services/integrations/email-verification.service');
const emailValidationService = require('../services/integrations/email-validation.service');
const ErrorHandler = require('../utils/errorHandler');
const rateLimit = require('express-rate-limit');

// Rate limiting - request-otp (stricter, allows validation retries)
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // 15 signup attempts per hour per IP (allows validation retries)
  message: 'Too many signup attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many signup attempts. Please try again in an hour.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 3600
    });
  }
});

// Rate limiter for the final verify+provision step (allows retries on wrong OTP)
const completeSignupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per 15 minutes per IP (allows retries)
  message: 'Too many attempts. Please wait a few minutes and try again.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many attempts. Please wait a few minutes and try again.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 900
    });
  }
});

// Backstop limiter for OTP resend, keyed by IP + email (primary throttle lives
// in emailVerificationService.resendVerification: 3 resends / 30 min)
const resendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const email = String(req.body?.email || 'unknown').trim().toLowerCase();
    return `resend_otp_${ip}_${email}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many resend requests. Please wait a moment and try again.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 900
    });
  }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests. Please slow down.'
});

// Lenient limiter for slug check (fires on each keystroke - debounced on frontend)
const slugCheckLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 slug checks per minute per IP (allows typing + debounce)
  message: 'Too many slug checks. Please wait a moment.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Please wait a moment before checking again.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => `${err.param}: ${err.msg}`).join(', ');
    console.error('❌ Validation errors:', errorMessages);
    return res.status(400).json({
      success: false,
      message: `Validation failed: ${errorMessages}`,
      errors: errors.array()
    });
  }
  next();
};

// Infra subdomains that are NOT tenant slugs — must match
// frontend/src/shared/utils/subdomain.js's getSubdomainSlug() list.
const INFRA_SUBDOMAINS = new Set(['www', 'api', 'admin', 'mail', 'smtp', 'app', 'swh', 'edu']);

// New-org signup (request-otp / resend-otp / check-slug-availability / complete)
// only makes sense from the root domain — never from inside an existing
// tenant's subdomain. The frontend route table already hides these forms
// there, but the server must be the real authority (client checks are UX only).
const rejectTenantSubdomainOrigin = (req, res, next) => {
  // In production, traffic reaches this server via frontend/server.js's
  // proxy, which rewrites `Host` to the backend's own upstream address and
  // forwards the browser's real host as `x-forwarded-host` instead — so
  // that must take priority, or every request looks like it came from the
  // backend's own address and this guard never fires.
  const host = String(req.get('x-forwarded-host') || req.get('host') || '')
    .split(',')[0].trim().split(':')[0].toLowerCase();
  const baseDomain = (process.env.BASE_DOMAIN || 'housesbase.com')
    .trim().replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
  // Only flag hosts that are actually a subdomain of BASE_DOMAIN — not the
  // raw *.up.railway.app host the app can also be reached on (see the same
  // distinction in cookieSecurity.js's usesDomainCookie check).
  const isTenantSubdomain = host.endsWith(`.${baseDomain}`) && !INFRA_SUBDOMAINS.has(host.split('.')[0]);
  if (isTenantSubdomain) {
    return res.status(400).json({
      success: false,
      message: 'Please sign up from housesbase.com.'
    });
  }
  next();
};

/**
 * POST /api/signup/software-house/request-otp
 * Step 1: Send an email verification code. No account is created yet.
 */
router.post('/software-house/request-otp',
  rejectTenantSubdomainOrigin,
  signupLimiter,
  [
    body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
    body('fullName').notEmpty().trim().isLength({ min: 2, max: 255 }),
    handleValidationErrors
  ],
  ErrorHandler.asyncHandler(async (req, res) => {
    const { email, fullName } = req.body;

    // Validate email using email validation service (non-blocking)
    // If validation fails, we still allow signup to proceed
    let emailValidation;
    try {
      const validationPromise = emailValidationService.validateEmail(email);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Email validation timeout')), 3000)
      );

      emailValidation = await Promise.race([validationPromise, timeoutPromise]);

      // Only block if it's clearly a disposable email
      if (!emailValidation.valid && emailValidation.reason === 'disposable_email') {
        return res.status(400).json({
          success: false,
          message: emailValidation.message || 'Disposable email addresses are not allowed',
          reason: emailValidation.reason
        });
      }
    } catch (emailValidationError) {
      console.warn('⚠️ Email validation error (allowing signup):', emailValidationError.message);
    }

    const metadata = {
      signupSource: req.query.source || req.headers['x-signup-source'] || 'self-serve',
      landingPage: req.query.landingPage || req.headers['x-landing-page'],
      industry: req.query.industry || req.headers['x-industry'] || 'software_house',
      fullName,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    try {
      const result = await selfServeSignupService.requestSignupVerification(email, metadata);
      res.status(200).json({
        success: true,
        message: result.message,
        data: { email: result.email }
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message,
          code: 'DUPLICATE_EMAIL'
        });
      }
      if (error.message.includes('Too many resend attempts')) {
        return res.status(429).json({
          success: false,
          message: error.message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 1800
        });
      }
      throw error;
    }
  })
);

/**
 * POST /api/signup/resend-otp
 * Resend verification OTP
 */
router.post('/resend-otp',
  rejectTenantSubdomainOrigin,
  resendOtpLimiter,
  [
    body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
    handleValidationErrors
  ],
  ErrorHandler.asyncHandler(async (req, res) => {
    const { email } = req.body;
    const metadata = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    try {
      await selfServeSignupService.resendOTP(email, metadata);

      res.json({
        success: true,
        message: 'Verification code resent. Please check your email.'
      });
    } catch (error) {
      if (error.message.includes('Too many resend attempts')) {
        return res.status(429).json({
          success: false,
          message: error.message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 1800
        });
      }
      throw error;
    }
  })
);

/**
 * GET /api/signup/check-slug-availability
 * Step 3: Check if tenant slug is available
 */
router.get('/check-slug-availability',
  rejectTenantSubdomainOrigin,
  slugCheckLimiter,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { slug } = req.query;
    
    if (!slug || slug.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Slug is required and must be at least 3 characters',
        data: {
          available: false,
          reason: 'invalid',
          message: 'Slug must be at least 3 characters'
        }
      });
    }

    try {
      const result = await selfServeSignupService.checkSlugAvailability(slug.trim());
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('❌ Slug check error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to check slug availability',
        data: {
          available: false,
          reason: 'error',
          message: error.message
        }
      });
    }
  })
);

/**
 * GET /api/signup/onboarding/:tenantId
 * Get onboarding checklist for tenant
 */
router.get('/onboarding/:tenantId',
  ErrorHandler.asyncHandler(async (req, res) => {
    const { tenantId } = req.params;

    const checklist = await onboardingChecklistService.getChecklist(tenantId);

    res.json({
      success: true,
      data: checklist
    });
  })
);

/**
 * POST /api/signup/onboarding/:tenantId/complete/:itemId
 * Mark checklist item as complete
 */
router.post('/onboarding/:tenantId/complete/:itemId',
  [
    body('userId').notEmpty(),
    handleValidationErrors
  ],
  ErrorHandler.asyncHandler(async (req, res) => {
    const { tenantId, itemId } = req.params;
    const { userId } = req.body;

    const checklist = await onboardingChecklistService.markComplete(
      tenantId,
      parseInt(itemId),
      userId
    );

    res.json({
      success: true,
      message: 'Checklist item marked as complete',
      data: checklist
    });
  })
);

/**
 * POST /api/signup/onboarding/:tenantId/skip/:itemId
 * Skip checklist item (only if not required)
 */
router.post('/onboarding/:tenantId/skip/:itemId',
  ErrorHandler.asyncHandler(async (req, res) => {
    const { tenantId, itemId } = req.params;

    const checklist = await onboardingChecklistService.skipItem(
      tenantId,
      parseInt(itemId)
    );

    res.json({
      success: true,
      message: 'Checklist item skipped',
      data: checklist
    });
  })
);

/**
 * GET /api/signup/onboarding/:tenantId/progress
 * Get onboarding progress summary
 */
router.get('/onboarding/:tenantId/progress',
  ErrorHandler.asyncHandler(async (req, res) => {
    const { tenantId } = req.params;

    const progress = await onboardingChecklistService.getProgress(tenantId);

    res.json({
      success: true,
      data: progress
    });
  })
);

/**
 * POST /api/signup/software-house/complete
 * Complete signup: User + Tenant + Organization in single transaction
 * Addresses Issue #4.1 and #4.2 - ensures atomic operations with rollback
 */
router.post('/software-house/complete',
  rejectTenantSubdomainOrigin,
  completeSignupLimiter,
  [
    body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
    body('password').isLength({ min: 6 }),
    body('fullName').notEmpty().trim().isLength({ min: 2, max: 255 }),
    body('organizationName').notEmpty().trim().isLength({ min: 2, max: 255 }),
    body('organizationSlug').notEmpty().trim().isLength({ min: 3, max: 50 }),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('A 6-digit verification code is required'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
    handleValidationErrors
  ],
  ErrorHandler.asyncHandler(async (req, res) => {
    try {
      const {
        email,
        fullName,
        password,
        confirmPassword,
        organizationName,
        organizationSlug,
        otp
      } = req.body;

      console.log('📝 Complete signup request:', {
        email,
        organizationName,
        organizationSlug
      });
      
      // Validate password match
      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match',
          code: 'PASSWORD_MISMATCH'
        });
      }
      
      // Validate slug format
      if (!/^[a-z0-9-]{3,}$/.test(organizationSlug)) {
        return res.status(400).json({
          success: false,
          message: 'Slug must be at least 3 characters and contain only lowercase letters, numbers, and hyphens',
          code: 'INVALID_SLUG'
        });
      }
      
      // Check reserved words (FR2: URL-safe, clear API error)
      const reservedWords = ['api', 'admin', 'www', 'mail', 'ftp', 'localhost', 'test', 'staging', 'dev', 'app', 'dashboard', 'login', 'signup', 'register', 'nexaerp'];
      if (reservedWords.includes(organizationSlug.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'This slug is reserved and cannot be used',
          code: 'RESERVED_SLUG'
        });
      }
      
      const metadata = {
        signupSource: req.query.source || req.headers['x-signup-source'] || 'self-serve',
        landingPage: req.query.landingPage || req.headers['x-landing-page'],
        industry: 'software_house',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        // Optional metadata from request body
        teamSize: req.body.teamSize,
        primaryTechStack: req.body.primaryTechStack,
        methodology: req.body.methodology
      };
      
      // Verify OTP, then complete signup in a single transaction
      const result = await selfServeSignupService.completeSignup(
        email,
        password,
        fullName,
        organizationName,
        organizationSlug,
        otp,
        metadata
      );
      
      console.log('✅ Complete signup successful:', {
        userId: result.user._id,
        tenantId: result.tenant._id,
        organizationId: result.organization._id
      });
      
      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          userId: result.user._id,
          tenantId: result.tenant._id,
          organizationId: result.organization._id,
          slug: result.tenant.slug,
          email: result.user.email
        }
      });
      
    } catch (error) {
      console.error('❌ Complete signup error:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      // Handle specific errors
      if (
        error.message.includes('verification code') ||
        error.message.includes('incorrect attempts')
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: 'INVALID_OTP'
        });
      }

      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message,
          code: 'DUPLICATE_EMAIL'
        });
      }

      if (error.message.includes('slug is already taken')) {
        return res.status(409).json({
          success: false,
          message: error.message,
          code: 'DUPLICATE_SLUG'
        });
      }
      
      if (error.message.includes('Password must be')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: 'INVALID_PASSWORD'
        });
      }
      
      if (error.message.includes('Slug must be')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: 'INVALID_SLUG'
        });
      }
      
      // Handle MongoDB duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        return res.status(409).json({
          success: false,
          message: `${field} already exists. Please choose a different value.`,
          code: 'DUPLICATE_KEY'
        });
      }
      
      res.status(500).json({
        success: false,
        message: error.message || 'Signup failed. Please try again.',
        code: 'SIGNUP_ERROR',
        ...(process.env.NODE_ENV === 'development' && {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack?.substring(0, 500)
          }
        })
      });
    }
  })
);

module.exports = router;
