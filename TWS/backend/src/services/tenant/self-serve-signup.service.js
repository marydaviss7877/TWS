const User = require('../../models/users-auth/User');
const Tenant = require('../../models/tenant/Tenant');
const TenantRole = require('../../models/tenant/TenantRole');
const TenantUser = require('../../models/tenant/TenantUser');
const Organization = require('../../models/org/Organization');
const emailVerificationService = require('../integrations/email-verification.service');
const emailService = require('../integrations/email.service');
const masterERPService = require('../masterERPService');
const validator = require('validator');

// Must match AUTH_EMAIL_NORMALIZE in authentication.js so stored email == login lookup email
const SIGNUP_EMAIL_NORMALIZE = { gmail_remove_dots: false };
const normalizeSignupEmail = (email) =>
  validator.normalizeEmail(String(email || '').trim(), SIGNUP_EMAIL_NORMALIZE) ||
  String(email || '').trim().toLowerCase();

// Tenant provisioning runs synchronously (no queue needed)

class SelfServeSignupService {
  /**
   * Step 1: Kick off signup by sending an email verification OTP.
   * Does NOT create any User/Organization/Tenant records — those are only
   * created after the OTP is verified, inside completeSignup().
   */
  async requestSignupVerification(email, metadata = {}) {
    const normalizedEmail = normalizeSignupEmail(email);

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new Error('An account with this email already exists. Please log in instead.');
    }

    // Route through the same cooldown-aware path as an explicit resend, so
    // repeatedly hitting this endpoint for someone else's inbox is capped at
    // 3 emails / 30 min per address instead of issuing a fresh code every time.
    await emailVerificationService.resendVerification(normalizedEmail, metadata);

    return { email: normalizedEmail, message: 'Verification code sent. Please check your email.' };
  }

  /**
   * Step 2: Check slug availability
   */
  async checkSlugAvailability(slug) {
    // Validate slug format
    this.validateSlug(slug);

    // Check reserved words (include product/domain names; FR2)
    const reservedWords = ['api', 'admin', 'www', 'mail', 'ftp', 'localhost', 'test', 'staging', 'dev', 'app', 'dashboard', 'login', 'signup', 'register', 'nexaerp'];
    if (reservedWords.includes(slug.toLowerCase())) {
      return {
        available: false,
        reason: 'reserved',
        message: 'This slug is reserved and cannot be used'
      };
    }

    // Check if slug exists
    const existingTenant = await Tenant.findOne({ slug: slug.toLowerCase() });
    if (existingTenant) {
      // Suggest alternatives
      const suggestions = [
        `${slug}-${Math.floor(Math.random() * 1000)}`,
        `${slug}-${new Date().getFullYear()}`,
        `${slug}-org`
      ];
      return {
        available: false,
        reason: 'taken',
        message: 'This slug is already taken',
        suggestions
      };
    }

    return {
      available: true,
      message: 'Slug is available'
    };
  }

  /**
   * Generate tenant ID from organization name
   */
  generateTenantId(organizationName) {
    const timestamp = Date.now().toString(36);
    const namePart = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 8);
    return `${namePart}-${timestamp}`;
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
  }

  /**
   * Validate slug format
   */
  validateSlug(slug) {
    if (!slug || slug.length < 3 || slug.length > 50) {
      throw new Error('Slug must be between 3 and 50 characters');
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new Error('Slug can only contain lowercase letters, numbers, and hyphens');
    }

    if (slug.startsWith('-') || slug.endsWith('-')) {
      throw new Error('Slug cannot start or end with a hyphen');
    }

    if (slug.includes('--')) {
      throw new Error('Slug cannot contain consecutive hyphens');
    }
  }

  /**
   * Resend verification OTP
   */
  resendOTP(email, metadata = {}) {
    return emailVerificationService.resendVerification(email, metadata);
  }

  /**
   * Complete signup: verifies the email OTP, then creates
   * User + Tenant + Organization in a single transaction.
   * This method addresses Issue #4.1 and #4.2 by ensuring atomic operations
   * @param {String} email - User email
   * @param {String} password - User password
   * @param {String} fullName - User full name
   * @param {String} organizationName - Organization name
   * @param {String} organizationSlug - Organization slug
   * @param {String} otp - Email verification code sent via requestSignupVerification
   * @param {Object} metadata - Additional metadata (teamSize, primaryTechStack, methodology)
   * @returns {Object} Created user, tenant, and organization
   */
  async completeSignup(email, password, fullName, organizationName, organizationSlug, otp, metadata = {}) {
    const mongoose = require('mongoose');
    const normalizedEmail = normalizeSignupEmail(email);

    // Gate the whole signup on a verified email OTP before touching the DB.
    await emailVerificationService.verifyOTP(normalizedEmail, otp);

    const session = await mongoose.startSession();
    let user, tenant, organization, tenantRole;

    try {
      console.log('📝 Starting complete signup transaction...');
      console.log('📝 Email:', normalizedEmail);
      console.log('📝 Organization:', organizationName);
      console.log('📝 Slug:', organizationSlug);

      await session.withTransaction(async () => {
        // Step 1: Validate email doesn't exist
        const existingUser = await User.findOne({ email: normalizedEmail }).session(session);
        if (existingUser) {
          throw new Error('User with this email already exists');
        }

        // Step 2: Validate slug availability
        const existingTenant = await Tenant.findOne({ slug: organizationSlug.toLowerCase() }).session(session);
        if (existingTenant) {
          throw new Error('Organization slug is already taken');
        }

        // Step 3: Validate password strength
        this.validatePassword(password);

        // Step 4: Validate slug format
        this.validateSlug(organizationSlug);

        // Step 5: Generate tenantId
        const tenantId = this.generateTenantId(organizationName);

        // Step 6: Create organization first (needed for createdBy placeholder)
        console.log('📝 Step 6: Creating organization...');
        organization = await Organization.create([{
          name: organizationName,
          slug: organizationSlug.toLowerCase(),
          status: 'active',
          type: 'software_house'
        }], { session });
        organization = organization[0];
        console.log('✅ Organization created:', organization._id);

        // Step 7: Prepare tenant data with ownerCredentials and createdBy
        const username = normalizedEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'owner';
        const tenantData = {
          name: organizationName,
          companyName: organizationName,
          slug: organizationSlug.toLowerCase(),
          tenantId: tenantId,
          erpCategory: 'software_house',
          status: 'pending_setup',
          organizationId: organization._id,
          ownerCredentials: {
            username: username,
            email: normalizedEmail,
            password: password,
            fullName: fullName
          },
          contactInfo: {
            email: normalizedEmail,
            phone: metadata.contactPhone || null
          },
          businessInfo: {
            industry: 'software_house',
            companySize: metadata.teamSize || '1-10'
          },
          softwareHouseConfig: {
            defaultMethodology: metadata.methodology || 'agile',
            supportedMethodologies: metadata.methodology ? [metadata.methodology] : ['agile', 'scrum'],
            techStack: {
              frontend: [],
              backend: metadata.primaryTechStack ? [metadata.primaryTechStack] : [],
              database: [],
              cloud: [],
              tools: []
            }
          },
          subscription: {
            plan: 'trial',
            status: 'trialing',
            price: 10,
            currency: 'USD',
            trialStartDate: new Date(),
            trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days free trial
          },
          metadata: {
            signupSource: metadata.signupSource || 'self-serve',
            landingPage: metadata.landingPage,
            industrySpecificData: metadata
          },
          createdBy: organization._id,
          createdByModel: 'Organization'
        };

        // Step 8: Create tenant record
        console.log('📝 Step 8: Creating tenant record...');
        tenant = await Tenant.create([tenantData], { session });
        tenant = tenant[0];
        console.log('✅ Tenant created:', tenant._id);

        // Step 9: Update organization with tenantId
        organization.tenantId = tenant._id;
        await organization.save({ session });

        // Step 10: Create database connection
        console.log('📝 Step 10: Creating tenant database...');
        const { createTenantDatabase } = require('../tenantProvisioningService/tenantCreation');
        await createTenantDatabase(tenant, session);
        console.log('✅ Database created');

        // Step 11: Create user with correct orgId
        console.log('📝 Step 11: Creating user...');
        user = await User.create([{
          email: normalizedEmail,
          password,
          fullName,
          orgId: organization._id,
          tenantId: tenant.tenantId,
          role: 'owner',
          status: 'active',
          emailVerified: true,
          emailVerifiedAt: new Date(),
          signupMetadata: {
            source: metadata.signupSource || 'self-serve',
            landingPage: metadata.landingPage,
            industry: 'software_house',
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent
          }
        }], { session });
        user = user[0];
        console.log('✅ User created:', user._id);

        // Step 12: Update tenant createdBy to actual user (self-serve)
        tenant.createdBy = user._id;
        tenant.createdByModel = 'User';
        await tenant.save({ session });
        console.log('✅ Tenant createdBy updated');

        // Step 13: Create tenant role assignment
        console.log('📝 Step 13: Creating tenant role...');
        tenantRole = await TenantRole.create([{
          tenantId: tenant._id,
          userId: user._id,
          role: 'TENANT_ADMIN',
          assignedBy: 'SYSTEM'
        }], { session });
        tenantRole = tenantRole[0];
        console.log('✅ Tenant role created');

        // Step 13b: Create TenantUser for per-tenant role (FR1 isolated user management)
        console.log('📝 Step 13b: Creating TenantUser for owner...');
        await TenantUser.create([{
          userId: user._id,
          tenantId: tenant._id,
          roles: [{ role: 'owner', assignedAt: new Date() }],
          status: 'active',
          lastActivity: new Date()
        }], { session });
        console.log('✅ TenantUser created');

        // Step 14: Update tenant status to active
        console.log('📝 Step 14: Activating tenant...');
        tenant.status = 'active';
        tenant.activatedAt = new Date();
        await tenant.save({ session });
        console.log('✅ Tenant activated');

        return {
          user: user.toJSON(),
          tenant: tenant.toJSON(),
          organization: organization.toJSON(),
          tenantRole: tenantRole.toJSON()
        };
      });

      console.log('✅ Complete signup transaction committed successfully');

      // Step 13: Seed industry-specific data (background, non-blocking)
      setImmediate(async () => {
        try {
          console.log('📝 Step 13: Seeding industry-specific data (background)...');
          const masterERPResult = await masterERPService.getMasterERPByIndustry('software_house');
          if (masterERPResult && masterERPResult.success && masterERPResult.data) {
            const masterERPId = masterERPResult.data._id;
            const { seedIndustrySpecificData } = require('../tenantProvisioningService/seeders');
            await seedIndustrySpecificData(masterERPId, tenant, organization, null);
            console.log('✅ Industry-specific data seeded');
          } else {
            console.log('⚠️ No Master ERP template found, skipping seeding');
          }
        } catch (seedError) {
          console.error('⚠️ Error seeding data (non-critical):', seedError);
        }
      });

      // Step 14: Send welcome email (background, non-blocking)
      setImmediate(async () => {
        try {
          console.log('📝 Step 14: Sending welcome email (background)...');
          const baseDomain = (process.env.BASE_DOMAIN || 'twspms.work.gd').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
          const subdomain = `${organizationSlug}.${baseDomain}`;
          await emailService.sendTenantWelcomeEmail(user, tenant, subdomain);
          console.log('✅ Welcome email sent');
        } catch (emailError) {
          console.error('⚠️ Error sending welcome email (non-critical):', emailError);
        }
      });

      // Step 15: Initialize onboarding checklist (background, non-blocking)
      setImmediate(async () => {
        try {
          console.log('📝 Step 15: Initializing onboarding checklist (background)...');
          const onboardingChecklistService = require('../onboardingChecklistService');
          await onboardingChecklistService.initializeChecklist(tenant._id);
          console.log('✅ Onboarding checklist initialized');
        } catch (checklistError) {
          console.error('⚠️ Error initializing onboarding checklist (non-critical):', checklistError);
        }
      });

      return {
        user,
        tenant,
        organization,
        message: 'Account and workspace created successfully'
      };

    } catch (error) {
      console.error('❌ Complete signup error:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);

      // Transaction will automatically rollback on error
      throw error;
    } finally {
      await session.endSession();
      console.log('✅ Session ended');
    }
  }
}

module.exports = new SelfServeSignupService();
