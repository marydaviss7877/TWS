const Tenant = require('../../models/tenant/Tenant');
const mongoose = require('mongoose');
const { generateConnectionString } = require('./utils');
const billingConfig = require('../../config/billingConfig');

/**
 * Create tenant record
 * @param {Object} tenantData - Tenant data
 * @param {Object} session - MongoDB session
 * @param {String} createdBy - Optional SupraAdmin ID who created the tenant
 * @returns {Object} Created tenant
 */
async function createTenantRecord(tenantData, session, createdBy = null) {
  try {
    // Get industry type from tenantData (Software House only)
    const industryType = tenantData.erpCategory || tenantData.industry || 'software_house';
    
    const industryModules = {
      software_house: ['development_methodology', 'tech_stack', 'project_types', 'time_tracking', 'code_quality', 'client_portal', 'projects', 'tasks', 'clients', 'hr', 'finance'],
      business: ['hr', 'finance', 'projects', 'operations', 'clients', 'reports', 'messaging', 'meetings', 'attendance', 'roles'],
      warehouse: ['warehouse', 'logistics', 'suppliers', 'purchasing', 'shipping', 'quality', 'maintenance', 'safety']
    };
    
    // Get industry-specific modules for the selected category
    const categoryModules = industryModules[industryType] || [];
    
    // Only assign industry-specific modules - NO common modules
    let finalModules = tenantData.erpModules || [];
    
    if (finalModules.length === 0) {
      // Auto-assign only industry-specific modules
      finalModules = [...categoryModules];
    } else {
      // Validate provided modules match the category
      const allowedModules = [...categoryModules];
      finalModules = finalModules.filter(module => allowedModules.includes(module));
      
      // If validation removed all modules, use industry defaults
      if (finalModules.length === 0) {
        finalModules = [...categoryModules];
      }
    }
    
    // Remove duplicates
    finalModules = [...new Set(finalModules)];
    
    console.log(`✅ Auto-assigning industry-specific ERP modules for ${industryType}: ${finalModules.join(', ')}`);
    
    // Prepare software house config if category is software_house
    let softwareHouseConfig = null;
    if (industryType === 'software_house') {
      softwareHouseConfig = {
        defaultMethodology: 'agile',
        supportedMethodologies: ['agile', 'scrum'],
        techStack: {
          frontend: [],
          backend: [],
          database: [],
          cloud: [],
          tools: []
        },
        supportedProjectTypes: ['web_application', 'mobile_app'],
        developmentSettings: {
          defaultSprintDuration: 14,
          storyPointScale: 'fibonacci',
          codeQualityTracking: true
        },
        billingConfig: {
          defaultHourlyRate: 0,
          currency: 'USD',
          billingCycle: 'monthly',
          invoiceTemplate: 'standard',
          autoInvoiceGeneration: false
        },
        teamConfig: {
          maxTeamSize: 50,
          allowRemoteWork: true,
          requireTimeTracking: true,
          allowOvertime: true,
          maxOvertimeHours: 20
        },
        qualityConfig: {
          codeReviewRequired: true,
          testingRequired: true,
          documentationRequired: true,
          minCodeCoverage: 80,
          maxTechnicalDebt: 20
        }
      };
    }
    
    // Build tenant payload - NEVER include softwareHouseConfig for non-software-house industries
    const tenantPayload = {
      tenantId: tenantData.tenantId,
      name: tenantData.companyName,
      slug: tenantData.slug,
      domain: tenantData.domain,
      status: 'active',
      erpCategory: industryType,
      erpModules: finalModules,
      subscription: {
        plan: tenantData.planId || 'trial',
        status: 'trialing',
        billingCycle: 'monthly',
        price: billingConfig.PRICE_PER_ORG,
        currency: billingConfig.CURRENCY,
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + billingConfig.TRIAL_DURATION_MS) // 7 days free trial
      },
      settings: {
        timezone: tenantData.timezone || 'UTC',
        currency: tenantData.currency || 'USD',
        language: tenantData.language || 'en',
        dateFormat: tenantData.dateFormat || 'MM/DD/YYYY'
      },
      branding: {
        logo: tenantData.logo,
        primaryColor: tenantData.primaryColor || '#1976d2',
        secondaryColor: tenantData.secondaryColor || '#dc004e',
        companyName: tenantData.companyName
      },
      onboarding: {
        completed: false,
        steps: [
          { step: 'tenant_created', completed: true, completedAt: new Date() },
          { step: 'database_created', completed: false },
          { step: 'admin_user_created', completed: false },
          { step: 'organization_created', completed: false },
          { step: 'default_data_seeded', completed: false },
          { step: 'welcome_email_sent', completed: false }
        ]
      },
      database: {
        connectionString: generateConnectionString(tenantData.tenantId),
        backupFrequency: 'daily'
      },
      ownerCredentials: {
        username: (tenantData.adminEmail || tenantData.contactInfo?.email || 'admin').split('@')[0], // Use email prefix as username
        password: tenantData.adminPassword || 'temp-password-placeholder', // Will be hashed by pre-save middleware (won't be used if existingUserId is set)
        email: tenantData.adminEmail || tenantData.contactInfo?.email || tenantData.adminUser?.email,
        fullName: tenantData.adminName || 'Administrator',
        isActive: true
      },
      contactInfo: {
        email: tenantData.adminEmail || tenantData.contactInfo?.email || tenantData.adminUser?.email,
        phone: tenantData.phone || tenantData.contactInfo?.phone,
        website: tenantData.website || tenantData.contactInfo?.website,
        address: tenantData.address || tenantData.contactInfo?.address || {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'US'
        }
      },
      businessInfo: {
        industry: industryType,
        companySize: tenantData.companySize || '1-10'
      },
      createdBy: createdBy ? (typeof createdBy === 'string' ? new mongoose.Types.ObjectId(createdBy) : createdBy) : new mongoose.Types.ObjectId() // Use provided SupraAdmin ID or create mock
    };
    
    // CRITICAL: Only include softwareHouseConfig if industryType is 'software_house'
    // For all other industries, explicitly DO NOT include it (not even as null or undefined)
    if (industryType === 'software_house' && softwareHouseConfig !== null) {
      tenantPayload.softwareHouseConfig = softwareHouseConfig;
    }
    // Explicitly ensure it's not included for other industries
    if (industryType !== 'software_house') {
      delete tenantPayload.softwareHouseConfig;
    }
    
    const tenant = new Tenant(tenantPayload);
    
    console.log(`💾 Creating tenant with erpCategory: ${tenant.erpCategory}`);

    await tenant.save({ session });
    
    const savedTenant = await Tenant.findById(tenant._id).session(session);
    console.log(`✅ Tenant saved with ID: ${savedTenant._id}`);
    
    return tenant;
    
  } catch (error) {
    console.error('Error creating tenant record:', error);
    throw error;
  }
}

/**
 * Create tenant database
 * @param {Object} tenant - Tenant record
 * @param {Object} session - MongoDB session
 */
async function createTenantDatabase(tenant, session) {
  try {
    console.log('📝 Creating tenant database for:', tenant.tenantId);
    
    // Generate unique database name
    const dbName = `tenant_${tenant.tenantId}`;
    
    // Create database connection string
    const connectionString = generateConnectionString(tenant.tenantId);
    
    console.log('📝 Updating tenant with database info...');
    // Update tenant with database info
    await Tenant.findByIdAndUpdate(
      tenant._id,
      {
        'database.connectionString': connectionString,
        'database.name': dbName,
        'database.status': 'active',
        'onboarding.steps.1.completed': true,
        'onboarding.steps.1.completedAt': new Date()
      },
      { session }
    );
    console.log('✅ Tenant database info updated');

    // Create database indexes and collections (non-blocking, can be done later)
    // Don't await - let it run in background to speed up response
    initializeTenantDatabase(tenant.tenantId).catch(err => {
      console.warn('⚠️ Database initialization error (non-critical):', err.message);
    });
    
    console.log('✅ Tenant database creation completed');
  } catch (error) {
    console.error('❌ Error creating tenant database:', error);
    console.error('❌ Database error stack:', error.stack);
    throw error;
  }
}

/**
 * Initialize tenant database with indexes and collections
 * @param {string} tenantId - Tenant ID
 */
async function initializeTenantDatabase(tenantId) {
  try {
    // This would create necessary indexes and collections for the tenant
    // Implementation depends on your database setup
    // For now, we'll skip this to speed up tenant creation
    // Indexes can be created lazily when needed
    console.log(`Initializing database for tenant: ${tenantId} - skipped (will be created lazily)`);
    
    // Return immediately - no blocking operations
    return Promise.resolve();
  } catch (error) {
    console.error('Error initializing tenant database:', error);
    // Don't throw - this is non-critical
    console.warn('Continuing without database initialization');
    return Promise.resolve();
  }
}

module.exports = {
  createTenantRecord,
  createTenantDatabase,
  initializeTenantDatabase
};

