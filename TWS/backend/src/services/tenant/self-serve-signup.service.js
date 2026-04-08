const User = require('../../models/User');
const Tenant = require('../../models/Tenant');
const TenantRole = require('../../models/TenantRole');
const TenantUser = require('../../models/TenantUser');
const Organization = require('../../models/Organization');
const emailVerificationService = require('../integrations/email-verification.service');
const tenantProvisioningService = require('../tenantProvisioningService');
const emailService = require('../integrations/email.service');
const masterERPService = require('../masterERPService');
const envConfig = require('../../config/environment');

// Tenant provisioning runs synchronously (no queue needed)

class SelfServeSignupService {
  /**
   * Step 1: Register user with email and password
   */
  async registerUser(email, password, fullName, metadata = {}) {
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate password strength
    this.validatePassword(password);

    // For self-serve signup, we need to create a temporary organization
    // or use a placeholder orgId. The orgId will be updated when tenant is created.
    // Get or create a temporary signup organization
    let tempOrg;
    try {
      console.log('📝 Looking for temporary organization with slug: signup-temp');
      tempOrg = await Organization.findOne({ slug: 'signup-temp' });

      if (!tempOrg) {
        console.log('📝 Temporary organization not found, creating new one...');
        // Create temporary organization for signup users
        tempOrg = new Organization({
          name: 'Temporary Signup Organization',
          slug: 'signup-temp',
          status: 'active'
        });

        console.log('📝 Saving temporary organization...');
        await tempOrg.save();
        console.log('✅ Created temporary organization for signup:', tempOrg._id);
      } else {
        console.log('✅ Found existing temporary organization:', tempOrg._id);
      }
    } catch (orgError) {
      console.error('❌ Error creating/finding temporary organization:', orgError);
      console.error('❌ Organization error name:', orgError.name);
      console.error('❌ Organization error message:', orgError.message);
      console.error('❌ Organization error code:', orgError.code);
      if (orgError.errors) {
        console.error('❌ Organization validation errors:', JSON.stringify(orgError.errors, null, 2));
      }
      if (orgError.keyPattern) {
        console.error('❌ Organization duplicate key pattern:', orgError.keyPattern);
      }
      if (orgError.keyValue) {
        console.error('❌ Organization duplicate key value:', orgError.keyValue);
      }

      // If it's a duplicate key error, try to find the existing org
      if (orgError.code === 11000) {
        console.log('📝 Duplicate key error, trying to find existing organization...');
        tempOrg = await Organization.findOne({ slug: 'signup-temp' });
        if (tempOrg) {
          console.log('✅ Found existing organization after duplicate error:', tempOrg._id);
        } else {
          throw new Error(`Failed to setup signup organization: Duplicate key but organization not found. ${orgError.message}`);
        }
      } else {
        throw new Error(`Failed to setup signup organization: ${orgError.message}`);
      }
    }

    // Create user account with temporary orgId (will be updated during tenant creation)
    // Email verification is skipped - mark as verified automatically
    try {
      console.log('📝 Creating user with email:', email.toLowerCase());
      console.log('📝 User orgId:', tempOrg._id);
      console.log('📝 User fullName:', fullName);

      const user = new User({
        email: email.toLowerCase(),
        password,
        fullName,
        emailVerified: true, // Skip email verification - mark as verified
        emailVerifiedAt: new Date(),
        status: 'active', // Active immediately since no email verification needed
        orgId: tempOrg._id, // Temporary orgId - will be updated when tenant is created
        signupMetadata: {
          source: metadata.signupSource || 'self-serve',
          landingPage: metadata.landingPage,
          industry: metadata.industry,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent
        }
      });

      console.log('📝 Saving user...');
      await user.save();
      console.log('✅ User created successfully:', user._id);

      return {
        user: user.toJSON(),
        message: 'Registration successful. You can now proceed to create your company.'
      };
    } catch (userError) {
      console.error('❌ Error creating user:', userError);
      console.error('❌ User error name:', userError.name);
      console.error('❌ User error message:', userError.message);
      console.error('❌ User error code:', userError.code);
      console.error('❌ User error stack:', userError.stack);

      if (userError.errors) {
        console.error('❌ User validation errors:', JSON.stringify(userError.errors, null, 2));
        const validationErrors = Object.keys(userError.errors).map(key => ({
          field: key,
          message: userError.errors[key].message
        }));
        throw new Error(`User validation failed: ${validationErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`);
      }
      if (userError.code === 11000) {
        console.error('❌ Duplicate key error - user already exists');
        throw new Error('User with this email already exists');
      }
      throw new Error(`Failed to create user: ${userError.message}`);
    }
  }

  /**
   * Step 2: Verify email with OTP
   */
  async verifyEmail(email, otp) {
    const verification = await emailVerificationService.verifyOTP(email, otp);

    // Update user status
    const user = await User.findById(verification.userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.status = 'active';
    await user.save();

    return {
      success: true,
      userId: user._id,
      message: 'Email verified successfully'
    };
  }

  /**
   * Step 3: Check slug availability
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
   * Step 4: Create tenant (after email verification)
   * Supports industry-specific fields via metadata
   */
  async createTenant(userId, organizationName, slug, industry, metadata = {}) {
    // Verify user exists (email verification is no longer required)
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    // Email verification check removed - users can create tenant immediately

    // Check slug availability
    const slugCheck = await this.checkSlugAvailability(slug);
    if (!slugCheck.available) {
      throw new Error(slugCheck.message);
    }

    // Rate limiting: max 5 tenants per email per 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentTenants = await Tenant.countDocuments({
      'contactInfo.email': user.email,
      createdAt: { $gte: oneDayAgo }
    });

    if (recentTenants >= 5) {
      throw new Error('Rate limit exceeded. Maximum 5 tenants per email per 24 hours.');
    }

    // Prepare tenant data
    // IMPORTANT: Store the userId so we can update the existing user instead of creating a new admin user
    const tenantData = {
      name: organizationName,
      companyName: organizationName, // Also set companyName for tenantCreation.js compatibility
      slug: slug.toLowerCase(),
      erpCategory: industry || 'business',
      contactInfo: {
        email: user.email,
        phone: metadata.contactPhone || metadata.schoolPhone || null
      },
      businessInfo: {
        industry: industry || 'business',
        companySize: metadata.employeeCount || metadata.teamSize || '1-10'
      },
      ownerCredentials: {
        username: user.email.split('@')[0],
        password: user.password, // Will be hashed by Tenant model pre-save
        email: user.email,
        fullName: user.fullName
      },
      // Add admin fields for provisioning service (using existing user's data)
      // Note: adminPassword will be handled by using the existing user's password
      adminEmail: user.email,
      adminName: user.fullName,
      adminPassword: null, // Will be set to use existing user - see provisioning service
      existingUserId: user._id.toString(), // Pass existing user ID to avoid creating duplicate
      status: 'pending_setup',
      subscription: {
        plan: 'trial',
        status: 'trialing',
        price: 10,
        currency: 'USD',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days free trial
      }
    };

    // Add industry-specific configurations
    if (industry === 'education' && metadata.schoolType) {
      tenantData.educationConfig = {
        institutionType: metadata.schoolType === 'school' ? 'school' :
          metadata.schoolType === 'college' ? 'college' : 'university'
      };
      if (metadata.schoolEmail) {
        tenantData.contactInfo.email = metadata.schoolEmail;
      }
    }

    // Always set softwareHouseConfig for software_house industry
    if (industry === 'software_house') {
      tenantData.softwareHouseConfig = {
        defaultMethodology: metadata.methodology || 'agile',
        supportedMethodologies: metadata.methodology ? [metadata.methodology] : ['agile', 'scrum'],
        techStack: {
          frontend: [],
          backend: metadata.primaryTechStack ? [metadata.primaryTechStack] : [],
          database: [],
          cloud: [],
          tools: []
        }
      };
    }

    // Store all metadata for reference
    tenantData.metadata = {
      signupSource: metadata.signupSource || 'self-serve',
      landingPage: metadata.landingPage,
      industrySpecificData: metadata
    };

    // Generate tenantId
    const tenantId = this.generateTenantId(organizationName);
    tenantData.tenantId = tenantId;

    // Find master ERP ID for the industry (if applicable)
    let masterERPId = null;
    if (industry && industry !== 'business') {
      try {
        const masterERPResult = await masterERPService.getMasterERPByIndustry(industry);
        if (masterERPResult && masterERPResult.success && masterERPResult.data) {
          masterERPId = masterERPResult.data._id;
          console.log(`✅ Found Master ERP template for ${industry}: ${masterERPId}`);
        }
      } catch (error) {
        console.warn(`⚠️  Could not find Master ERP for ${industry}, proceeding without template: ${error.message}`);
        // Continue without master ERP template - will use default provisioning
      }
    }

    // Create tenant using provisioning service (async via queue if available)
    if (tenantProvisioningQueue) {
      // Add to queue for async processing
      const job = await tenantProvisioningQueue.add('provision-tenant', {
        tenantData,
        userId: userId.toString(),
        masterERPId: masterERPId ? masterERPId.toString() : null,
        metadata
      }, {
        priority: 1
      });

      // Create tenant record immediately (status: pending_setup)
      const tenant = new Tenant({
        ...tenantData,
        createdBy: null // Self-serve, no SupraAdmin
      });
      await tenant.save();

      // Create tenant role assignment
      const tenantRole = new TenantRole({
        tenantId: tenant._id,
        userId: user._id,
        role: 'TENANT_ADMIN',
        assignedBy: 'SYSTEM'
      });
      await tenantRole.save();

      // Send welcome email (will be sent after provisioning completes)
      // The welcome email will be sent by the provisioning job worker

      return {
        tenant: tenant.toJSON(),
        jobId: job.id,
        status: 'provisioning',
        message: 'Tenant creation initiated. Provisioning in progress...',
        masterERPId: masterERPId
      };
    } else {
      // Synchronous provisioning (fallback)
      try {
        console.log('📝 Starting synchronous tenant provisioning...');
        console.log('📝 Tenant data:', JSON.stringify(tenantData, null, 2));

        const result = await tenantProvisioningService.provisionTenant(
          tenantData,
          masterERPId, // Use master ERP ID if found
          null  // createdBy (self-serve)
        );

        console.log('✅ Tenant provisioned successfully:', result.tenant?._id);

        // Create tenant role assignment
        const tenantRole = new TenantRole({
          tenantId: result.tenant._id,
          userId: user._id,
          role: 'TENANT_ADMIN',
          assignedBy: 'SYSTEM'
        });
        await tenantRole.save();
        console.log('✅ Tenant role assigned');

        // Update tenant status to active
        result.tenant.status = 'active';
        result.tenant.activatedAt = new Date();
        await result.tenant.save();
        console.log('✅ Tenant status updated to active');

        // Send welcome email
        try {
          const subdomain = `${slug}.${process.env.BASE_DOMAIN || 'tws.example.com'}`;
          await emailService.sendTenantWelcomeEmail(user, result.tenant, subdomain);
          console.log('✅ Welcome email sent');
        } catch (emailError) {
          console.error('⚠️ Error sending welcome email (non-critical):', emailError);
          // Continue even if email fails
        }

        return {
          tenant: result.tenant.toJSON(),
          adminUser: result.adminUser,
          organization: result.organization,
          status: 'active',
          message: 'Tenant created and provisioned successfully',
          masterERPId: masterERPId
        };
      } catch (provisionError) {
        console.error('❌ Tenant provisioning error:', provisionError);
        console.error('❌ Provisioning error stack:', provisionError.stack);
        throw new Error(`Failed to provision tenant: ${provisionError.message}`);
      }
    }
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
  async resendOTP(email, metadata = {}) {
    return await emailVerificationService.resendVerification(email, metadata);
  }

  /**
   * Complete signup: User + Tenant + Organization in single transaction
   * This method addresses Issue #4.1 and #4.2 by ensuring atomic operations
   * @param {String} email - User email
   * @param {String} password - User password
   * @param {String} fullName - User full name
   * @param {String} organizationName - Organization name
   * @param {String} organizationSlug - Organization slug
   * @param {Object} metadata - Additional metadata (teamSize, primaryTechStack, methodology)
   * @returns {Object} Created user, tenant, and organization
   */
  async completeSignup(email, password, fullName, organizationName, organizationSlug, metadata = {}) {
    const mongoose = require('mongoose');
    const session = await mongoose.startSession();

    let user, tenant, organization, tenantRole;

    try {
      console.log('📝 Starting complete signup transaction...');
      console.log('📝 Email:', email);
      console.log('📝 Organization:', organizationName);
      console.log('📝 Slug:', organizationSlug);

      const result = await session.withTransaction(async () => {
        // Step 1: Validate email doesn't exist
        const existingUser = await User.findOne({ email: email.toLowerCase() }).session(session);
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
        const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'owner';
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
            email: email.toLowerCase(),
            password: password,
            fullName: fullName
          },
          contactInfo: {
            email: email.toLowerCase(),
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
          email: email.toLowerCase(),
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
          const subdomain = `${organizationSlug}.${process.env.BASE_DOMAIN || 'tws.example.com'}`;
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
