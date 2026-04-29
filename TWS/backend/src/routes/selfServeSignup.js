const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const selfServeSignupService = require('../services/tenant/self-serve-signup.service');
const onboardingChecklistService = require('../services/onboardingChecklistService');
const emailVerificationService = require('../services/integrations/email-verification.service');
const emailValidationService = require('../services/integrations/email-validation.service');
const ErrorHandler = require('../utils/errorHandler');
const rateLimit = require('express-rate-limit');

// Rate limiting - signup complete/register (stricter, allows retries)
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

// More lenient rate limiter for create-tenant (allows retries)
const createTenantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 10 requests per 15 minutes per IP (allows retries)
  message: 'Too many tenant creation attempts. Please wait a few minutes and try again.',
  standardHeaders: true,
  legacyHeaders: false,
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

/**
 * POST /api/signup/register
 * Step 1: Register user with email and password
 */
router.post('/register',
  signupLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('fullName').notEmpty().trim(),
    handleValidationErrors
  ],
  ErrorHandler.asyncHandler(async (req, res) => {
    try {
      const { email, password, fullName } = req.body;
      
      console.log('📝 Signup request received:', { email, hasPassword: !!password, hasFullName: !!fullName });
      
      // Validate email using email validation service (non-blocking)
      // If validation fails, we still allow signup to proceed
      let emailValidation;
      try {
        console.log('📝 Starting email validation for:', email);
        // Set a timeout for email validation (3 seconds max - reduced from 5)
        const validationPromise = emailValidationService.validateEmail(email);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email validation timeout')), 3000)
        );
        
        emailValidation = await Promise.race([validationPromise, timeoutPromise]);
        console.log('✅ Email validation completed:', emailValidation);
        
        // Only block if it's clearly a disposable email or invalid format
        // Allow signup to proceed even if MX records check fails
        if (!emailValidation.valid && emailValidation.reason === 'disposable_email') {
          console.warn('⚠️ Disposable email detected, blocking signup');
          return res.status(400).json({
            success: false,
            message: emailValidation.message || 'Disposable email addresses are not allowed',
            reason: emailValidation.reason
          });
        }
        
        // For other validation failures (MX records, etc.), allow signup to proceed
        if (!emailValidation.valid) {
          console.warn('⚠️ Email validation failed but allowing signup:', emailValidation.reason);
          emailValidation = { valid: true, domain: email.split('@')[1], checks: {} };
        }
      } catch (emailValidationError) {
        console.warn('⚠️ Email validation error (allowing signup):', emailValidationError.message);
        console.warn('⚠️ Email validation error stack:', emailValidationError.stack);
        // Continue with signup even if email validation service fails
        emailValidation = { valid: true, domain: email.split('@')[1] || 'unknown', checks: {} };
      }

      const metadata = {
        signupSource: req.query.source || req.headers['x-signup-source'] || 'self-serve',
        landingPage: req.query.landingPage || req.headers['x-landing-page'],
        industry: req.query.industry || req.headers['x-industry'],
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      };

      console.log('📝 Calling registerUser with metadata:', metadata);
      console.log('📝 User details:', { email, hasPassword: !!password, fullName });

      let result;
      try {
        result = await selfServeSignupService.registerUser(
          email,
          password,
          fullName,
          metadata
        );
        console.log('✅ User registered successfully:', result.user._id);
      } catch (registerError) {
        console.error('❌ Registration error in route handler:', registerError);
        console.error('❌ Registration error name:', registerError.name);
        console.error('❌ Registration error message:', registerError.message);
        console.error('❌ Registration error stack:', registerError.stack);
        throw registerError; // Re-throw to let ErrorHandler handle it
      }

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          userId: result.user._id,
          email: result.user.email,
          emailValidation: {
            valid: true,
            domain: emailValidation.domain,
            checks: emailValidation.checks
          }
        }
      });
    } catch (error) {
      console.error('❌ Signup error:', error);
      console.error('❌ Error stack:', error.stack);
      throw error; // Let ErrorHandler handle it
    }
  })
);

/**
 * POST /api/signup/verify-email
 * Step 2: Verify email with OTP
 */
router.post('/verify-email',
  apiLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }),
    handleValidationErrors
  ],
  ErrorHandler.asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const result = await selfServeSignupService.verifyEmail(email, otp);

    res.json({
      success: true,
      message: result.message,
      data: {
        userId: result.userId
      }
    });
  })
);

/**
 * POST /api/signup/resend-otp
 * Resend verification OTP
 */
router.post('/resend-otp',
  apiLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    handleValidationErrors
  ],
  ErrorHandler.asyncHandler(async (req, res) => {
    const { email } = req.body;
    const metadata = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    await selfServeSignupService.resendOTP(email, metadata);

    res.json({
      success: true,
      message: 'Verification code resent. Please check your email.'
    });
  })
);

/**
 * GET /api/signup/check-slug-availability
 * Step 3: Check if tenant slug is available
 */
router.get('/check-slug-availability',
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
 * POST /api/signup/create-tenant
 * Step 4: Create tenant (after email verification)
 */
router.post('/create-tenant',
  createTenantLimiter,
  [
    body('userId').notEmpty(),
    body('organizationName').notEmpty().trim().isLength({ min: 2, max: 255 }),
    body('slug').notEmpty().trim(),
    body('industry').optional().isIn([
      'business', 'warehouse', 
      'software_house'
    ]),
    handleValidationErrors
  ],
  ErrorHandler.asyncHandler(async (req, res) => {
    // Ensure response is sent even if connection closes
    let responseSent = false;
    const sendResponse = (statusCode, data) => {
      if (!responseSent) {
        responseSent = true;
        try {
          res.status(statusCode).json(data);
        } catch (sendError) {
          console.error('❌ Error sending response:', sendError);
        }
      }
    };

    try {
      const { userId, organizationName, slug, industry, metadata: requestMetadata } = req.body;
      
      console.log('📝 Create tenant request:', { userId, organizationName, slug, industry });
      
      // Validate required fields
      if (!userId) {
        return sendResponse(400, {
          success: false,
          message: 'User ID is required',
          code: 'MISSING_USER_ID'
        });
      }
      
      if (!organizationName || !slug) {
        return sendResponse(400, {
          success: false,
          message: 'Organization name and slug are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }
      
      const metadata = {
        ...requestMetadata, // Industry-specific fields from frontend
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
      };

      console.log('📝 Calling createTenant with metadata:', metadata);

      // Set a timeout for the tenant creation (45 seconds max - reduced from 60)
      const createTenantPromise = selfServeSignupService.createTenant(
        userId,
        organizationName,
        slug,
        industry,
        metadata
      );
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Tenant creation timeout - this may take a few minutes. Please check your tenant status.')), 45000)
      );

      const result = await Promise.race([createTenantPromise, timeoutPromise]);

      console.log('✅ Tenant created successfully:', result.tenant?._id);

      // Initialize onboarding checklist (non-blocking)
      onboardingChecklistService.initializeChecklist(result.tenant._id).catch(error => {
        console.error('⚠️ Error initializing onboarding checklist (non-critical):', error);
      });

      sendResponse(201, {
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      console.error('❌ ========== CREATE TENANT ERROR ==========');
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ MongoDB readyState:', mongoose?.connection?.readyState);
      
      // Log error properties safely
      try {
        const errorDetails = {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: error.stack?.substring(0, 500), // Limit stack length
          cause: error.cause,
          errno: error.errno,
          syscall: error.syscall,
          hostname: error.hostname,
          port: error.port
        };
        console.error('❌ Error details:', JSON.stringify(errorDetails, null, 2));
      } catch (stringifyError) {
        console.error('❌ Could not stringify error:', stringifyError);
      }
      
      // Check if response was already sent
      if (responseSent) {
        console.error('⚠️ Response already sent, cannot send error response');
        return;
      }
      
      // Log the original error if it exists
      if (error.originalError) {
        console.error('❌ Original error:', error.originalError);
        console.error('❌ Original error name:', error.originalError.name);
        console.error('❌ Original error message:', error.originalError.message);
        console.error('❌ Original error code:', error.originalError.code);
      }
      
      // Handle connection errors - be specific, don't catch all MongoServerError
      const isConnectionError = error.message && (
        error.message.includes('Connection is closed') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('socket hang up') ||
        error.message.includes('write EPIPE') ||
        error.message.includes('topology was destroyed') ||
        error.message.includes('MongoNetworkError') ||
        (error.name === 'MongoNetworkError') ||
        (error.name === 'MongoServerSelectionError')
      );
      
      if (isConnectionError) {
        console.error('❌ CONNECTION ERROR DETECTED:');
        console.error('❌ Error message:', error.message);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error code:', error.code);
        console.error('❌ MongoDB readyState:', mongoose?.connection?.readyState);
        if (error.originalError) {
          console.error('❌ Original error:', error.originalError);
        }
        
        return sendResponse(500, {
          success: false,
          message: 'Database connection error. Please try again.',
          code: 'CONNECTION_ERROR',
          details: process.env.NODE_ENV === 'development' ? {
            errorMessage: error.message,
            errorName: error.name,
            mongoState: mongoose?.connection?.readyState
          } : undefined
        });
      }
      
      // If it's a timeout, return a more helpful message
      if (error.message && error.message.includes('timeout')) {
        return sendResponse(202, {
          success: true,
          message: 'Tenant creation is in progress. This may take a few minutes. Please check your tenant status.',
          data: {
            status: 'processing',
            message: 'Please wait while your tenant is being set up...'
          }
        });
      }
      
      // For development, include more error details
      const isDevelopment = process.env.NODE_ENV === 'development';
      const errorResponse = {
        success: false,
        message: error.message || 'Failed to create tenant',
        code: error.code || 'TENANT_CREATION_ERROR'
      };
      
      if (isDevelopment) {
        errorResponse.error = {
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 500), // Limit stack trace length
          originalError: error.originalError ? {
            name: error.originalError.name,
            message: error.originalError.message
          } : undefined
        };
      }
      
      // Determine status code based on error type
      let statusCode = 500;
      if (error.name === 'ValidationError' || error.code === 11000) {
        statusCode = 400;
      } else if (error.message && error.message.includes('not found')) {
        statusCode = 404;
      }
      
      sendResponse(statusCode, errorResponse);
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
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('fullName').notEmpty().trim().isLength({ min: 2, max: 255 }),
    body('organizationName').notEmpty().trim().isLength({ min: 2, max: 255 }),
    body('organizationSlug').notEmpty().trim().isLength({ min: 3, max: 50 }),
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
        organizationSlug 
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
      
      // Complete signup in single transaction
      const result = await selfServeSignupService.completeSignup(
        email,
        password,
        fullName,
        organizationName,
        organizationSlug,
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
