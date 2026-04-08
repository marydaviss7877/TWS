const MasterERP = require('../models/MasterERP');
const Education = require('../models/industry/Education');
const Healthcare = require('../models/industry/Healthcare');
const Tenant = require('../models/Tenant');
const Organization = require('../models/Organization');
const User = require('../models/User');
const mongoose = require('mongoose');

class MasterERPService {
  
  /**
   * Create a new Master ERP template
   * @param {Object} masterERPData - Master ERP data
   * @param {String} createdBy - Supra Admin ID
   * @returns {Object} Created Master ERP
   */
  async createMasterERP(masterERPData, createdBy) {
    try {
      // Check if Master ERP for this industry already exists
      const existingMasterERP = await MasterERP.findOne({ 
        industry: masterERPData.industry,
        isActive: true 
      });
      
      if (existingMasterERP) {
        throw new Error(`Master ERP for ${masterERPData.industry} already exists`);
      }
      
      const masterERP = new MasterERP({
        ...masterERPData,
        createdBy,
        isDefault: masterERPData.industry === 'software_house' // TWS is default
      });
      
      await masterERP.save();
      
      return {
        success: true,
        data: masterERP,
        message: 'Master ERP created successfully'
      };
      
    } catch (error) {
      throw new Error(`Failed to create Master ERP: ${error.message}`);
    }
  }
  
  /**
   * Get all Master ERP templates
   * @returns {Array} List of Master ERPs
   */
  async getAllMasterERPs() {
    try {
      const masterERPs = await MasterERP.find({ isActive: true })
        .populate('createdBy', 'fullName email')
        .sort({ usageCount: -1, createdAt: -1 });
      
      return {
        success: true,
        data: masterERPs
      };
      
    } catch (error) {
      throw new Error(`Failed to fetch Master ERPs: ${error.message}`);
    }
  }
  
  /**
   * Get Master ERP by industry
   * @param {String} industry - Industry type
   * @returns {Object} Master ERP
   */
  async getMasterERPByIndustry(industry) {
    try {
      const masterERP = await MasterERP.findOne({ 
        industry, 
        isActive: true 
      }).populate('createdBy', 'fullName email');
      
      if (!masterERP) {
        throw new Error(`Master ERP for ${industry} not found`);
      }
      
      return {
        success: true,
        data: masterERP
      };
      
    } catch (error) {
      throw new Error(`Failed to fetch Master ERP: ${error.message}`);
    }
  }
  
  /**
   * Update Master ERP template
   * @param {String} masterERPId - Master ERP ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated Master ERP
   */
  async updateMasterERP(masterERPId, updateData) {
    try {
      const masterERP = await MasterERP.findByIdAndUpdate(
        masterERPId,
        { 
          ...updateData,
          version: this.incrementVersion(updateData.version)
        },
        { new: true, runValidators: true }
      );
      
      if (!masterERP) {
        throw new Error('Master ERP not found');
      }
      
      return {
        success: true,
        data: masterERP,
        message: 'Master ERP updated successfully'
      };
      
    } catch (error) {
      throw new Error(`Failed to update Master ERP: ${error.message}`);
    }
  }
  
  /**
   * Delete Master ERP template
   * @param {String} masterERPId - Master ERP ID
   * @returns {Object} Deletion result
   */
  async deleteMasterERP(masterERPId) {
    try {
      const masterERP = await MasterERP.findById(masterERPId);
      
      if (!masterERP) {
        throw new Error('Master ERP not found');
      }
      
      // Check if any tenants are using this Master ERP
      const tenantsUsing = await Tenant.countDocuments({ 
        erpCategory: masterERP.industry 
      });
      
      if (tenantsUsing > 0) {
        throw new Error(`Cannot delete Master ERP. ${tenantsUsing} tenants are using it.`);
      }
      
      // Soft delete
      masterERP.isActive = false;
      await masterERP.save();
      
      return {
        success: true,
        message: 'Master ERP deleted successfully'
      };
      
    } catch (error) {
      throw new Error(`Failed to delete Master ERP: ${error.message}`);
    }
  }
  
  /**
   * Create tenant from Master ERP template
   * @param {String} masterERPId - Master ERP ID
   * @param {Object} tenantData - Tenant data
   * @param {String} createdBy - Supra Admin ID
   * @returns {Object} Created tenant
   */
  async createTenantFromMasterERP(masterERPId, tenantData, createdBy) {
    // Transaction options with extended timeout and retry settings
    const transactionOptions = {
      readPreference: 'primary',
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
      maxTimeMS: 120000 // 2 minutes timeout (default is 60 seconds)
    };
    
    // Retry configuration
    const maxRetries = 3;
    let retryCount = 0;
    let lastError = null;
    let result = null;
    let session = null;
    
    while (retryCount < maxRetries) {
      try {
        // Start a new session for each attempt
        if (session) {
          await session.endSession();
        }
        session = await mongoose.startSession();
        
        result = await session.withTransaction(async () => {
        // Get Master ERP template
        const masterERP = await MasterERP.findById(masterERPId).session(session);
        if (!masterERP) {
          throw new Error('Master ERP not found');
        }
        
        // Generate unique tenantId and slug
        const baseSlug = (tenantData.slug || tenantData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')).toLowerCase();
        let slug = baseSlug;
        let counter = 1;
        
        while (await Tenant.findOne({ slug }).session(session)) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        
        const tenantId = tenantData.tenantId || `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Get default modules from Master ERP
        // Valid module enum values from Tenant model (must match exactly)
        const validModules = [
          // Common modules
          'hr', 'finance', 'projects', 'operations', 'clients', 'reports', 'messaging', 'meetings', 'attendance', 'roles',
          // Healthcare modules
          'patients', 'doctors', 'appointments', 'medical_records', 'prescriptions', 'departments', 'billing',
          // Education modules
          'students', 'teachers', 'classes', 'grades', 'courses', 'academic_year', 'exams', 'admissions',
          // Software house modules
          'development_methodology', 'tech_stack', 'project_types', 'time_tracking', 'code_quality', 'client_portal'
        ];
        let erpModules = [];
        
        // Helper function to validate and filter modules
        const filterValidModules = (modules) => {
          if (!Array.isArray(modules)) return [];
          return modules
            .filter(m => m != null) // Remove null/undefined
            .map(m => typeof m === 'string' ? m.trim().toLowerCase() : String(m).trim().toLowerCase()) // Normalize
            .filter(m => m.length > 0 && validModules.includes(m)) // Only keep valid ones
            .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
        };
        
        // Collect all modules from Master ERP
        const allModules = [
          ...(masterERP.configuration?.coreModules || []),
          ...(masterERP.configuration?.industryModules || []),
          ...(tenantData.erpModules || []) // Also check tenantData.erpModules if provided
        ];
        
        console.log(`Raw modules from Master ERP:`, JSON.stringify(allModules, null, 2));
        
        // Filter and validate all modules
        erpModules = filterValidModules(allModules);
        
        // Final validation - ensure no invalid values slipped through
        const invalidModules = erpModules.filter(m => !validModules.includes(m));
        if (invalidModules.length > 0) {
          console.error(`WARNING: Invalid modules found after filtering:`, invalidModules);
          erpModules = erpModules.filter(m => validModules.includes(m));
        }
        
        console.log(`Validated ERP modules for tenant ${tenantId}:`, erpModules);
        console.log(`Total modules before validation: ${allModules.length}`);
        console.log(`Valid modules after filtering: ${erpModules.length}`);
        
        // If no valid modules, use default set
        if (erpModules.length === 0) {
          console.warn('No valid modules found, using default modules: projects, finance, hr');
          erpModules = ['projects', 'finance', 'hr'];
        }
        
        // Get admin user details for ownerCredentials (required by Tenant model)
        // DEBUG: Log what we're receiving
        console.log('=== DEBUG: tenantData received ===');
        console.log('tenantData.adminUser:', JSON.stringify(tenantData.adminUser, null, 2));
        console.log('tenantData.contactInfo:', JSON.stringify(tenantData.contactInfo, null, 2));
        console.log('tenantData.email:', tenantData.email);
        
        const adminEmail = (tenantData.adminUser?.email || tenantData.contactInfo?.email || tenantData.email || '').trim().toLowerCase();
        const adminName = (tenantData.adminUser?.fullName || tenantData.adminUser?.name || 'Administrator').trim();
        const adminPassword = (tenantData.adminUser?.password || '').trim();
        let adminUsername = adminEmail && adminEmail.includes('@') ? adminEmail.split('@')[0] : (adminEmail || 'admin');
        
        // Validate admin credentials early - STRICT validation
        if (!adminEmail || adminEmail === '' || !adminEmail.includes('@')) {
          throw new Error(`Admin email is required and must be valid. Received: ${tenantData.adminUser?.email || tenantData.email || 'nothing'}`);
        }
        if (!adminPassword || adminPassword === '' || adminPassword.length < 6) {
          throw new Error(`Admin password is required and must be at least 6 characters long. Received: ${adminPassword ? '***' : 'nothing'}`);
        }
        if (!adminName || adminName === '' || adminName.trim() === '') {
          throw new Error(`Admin full name is required. Received: ${adminName || 'nothing'}`);
        }
        if (!adminUsername || adminUsername === '') {
          adminUsername = 'admin'; // Fallback
        }
        
        console.log('=== DEBUG: Extracted admin credentials ===');
        console.log('adminEmail:', adminEmail || 'MISSING');
        console.log('adminName:', adminName || 'MISSING');
        console.log('adminPassword:', adminPassword ? '***' : 'MISSING');
        console.log('adminUsername:', adminUsername || 'MISSING');
        
        // CRITICAL: Filter erpModules ONE MORE TIME before creating payload
        const finalErpModules = erpModules
          .filter(m => m != null && typeof m === 'string')
          .map(m => m.trim().toLowerCase())
          .filter(m => validModules.includes(m))
          .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
        
        if (finalErpModules.length === 0) {
          console.warn('No valid modules after final filtering, using defaults');
          finalErpModules.push('projects', 'finance', 'hr');
        }
        
        console.log('=== Final erpModules before payload creation ===');
        console.log('finalErpModules:', JSON.stringify(finalErpModules, null, 2));
        
        // Prepare tenant data - build ownerCredentials FIRST to ensure they're never overwritten
        const ownerCredentialsData = {
          email: adminEmail.trim(),
          fullName: adminName.trim(),
          password: adminPassword,
          username: adminUsername.trim().toLowerCase(),
          isActive: true
        };
        
        console.log('=== OwnerCredentials to be set ===');
        console.log('ownerCredentialsData:', {
          email: ownerCredentialsData.email,
          fullName: ownerCredentialsData.fullName,
          password: '***',
          username: ownerCredentialsData.username,
          isActive: ownerCredentialsData.isActive
        });
        
        // Build tenant payload
        const tenantPayload = {
          name: tenantData.name,
          slug: slug,
          tenantId: tenantId,
          erpCategory: masterERP.industry || tenantData.industry || 'business',
          erpModules: finalErpModules, // Use final filtered modules
          contactInfo: {
            email: adminEmail,
            phone: (tenantData.contactInfo?.phone || tenantData.phone || '').trim() || undefined,
            website: (tenantData.contactInfo?.website || tenantData.website || '').trim() || undefined,
            address: tenantData.contactInfo?.address || (typeof tenantData.address === 'string' 
              ? { street: tenantData.address, city: '', state: '', zipCode: '', country: 'US' }
              : (tenantData.address || { street: '', city: '', state: '', zipCode: '', country: 'US' }))
          },
          businessInfo: tenantData.businessInfo || {
            industry: masterERP.industry,
            companySize: tenantData.companySize || '1-10'
          },
          ownerCredentials: ownerCredentialsData, // Set it directly
          settings: {
            timezone: tenantData.settings?.timezone || masterERP.configuration?.defaultSettings?.timezone || 'UTC',
            currency: tenantData.settings?.currency || masterERP.configuration?.defaultSettings?.currency || 'USD',
            language: tenantData.settings?.language || masterERP.configuration?.defaultSettings?.language || 'en',
            dateFormat: tenantData.settings?.dateFormat || masterERP.configuration?.defaultSettings?.dateFormat || 'MM/DD/YYYY'
          },
          subscription: {
            plan: tenantData.plan || 'trial',
            status: 'active',
            billingCycle: 'monthly'
          },
          status: 'active',
          createdBy: createdBy
        };
        
        // CRITICAL: Force-set ownerCredentials again AFTER everything to prevent any overwrites
        Object.assign(tenantPayload.ownerCredentials, ownerCredentialsData);
        
        // CRITICAL: Force-set erpModules again to ensure they're valid
        tenantPayload.erpModules = [...finalErpModules];
        
        // Validate required fields before creating tenant
        const contactEmail = tenantPayload.contactInfo.email?.trim();
        if (!contactEmail || contactEmail === '') {
          throw new Error('Contact email is required for tenant creation. Please provide adminUser.email or contactInfo.email');
        }
        
        // Ensure email is valid format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contactEmail)) {
          throw new Error(`Invalid email format: ${contactEmail}`);
        }
        
        // Final validation and logging before creating tenant
        console.log('=== Tenant Payload Validation ===');
        console.log('Admin credentials received:', {
          email: adminEmail || 'MISSING',
          name: adminName || 'MISSING',
          password: adminPassword ? '***' : 'MISSING',
          username: adminUsername || 'MISSING'
        });
        console.log('OwnerCredentials in payload:', {
          email: tenantPayload.ownerCredentials?.email || 'MISSING',
          fullName: tenantPayload.ownerCredentials?.fullName || 'MISSING',
          password: tenantPayload.ownerCredentials?.password ? '***' : 'MISSING',
          username: tenantPayload.ownerCredentials?.username || 'MISSING'
        });
        console.log('ERP Modules:', JSON.stringify(tenantPayload.erpModules, null, 2));
        console.log('ERP Modules count:', tenantPayload.erpModules?.length || 0);
        
        // CRITICAL: Validate ownerCredentials with strict checks (not just truthy, but non-empty strings)
        const oc = tenantPayload.ownerCredentials;
        if (!oc || 
            !oc.email || typeof oc.email !== 'string' || oc.email.trim() === '' ||
            !oc.fullName || typeof oc.fullName !== 'string' || oc.fullName.trim() === '' ||
            !oc.password || typeof oc.password !== 'string' || oc.password.trim() === '' ||
            !oc.username || typeof oc.username !== 'string' || oc.username.trim() === '') {
          console.error('ERROR: ownerCredentials validation failed:', JSON.stringify(oc, null, 2));
          throw new Error(`Owner credentials validation failed: email=${oc?.email ? 'present' : 'MISSING'}, fullName=${oc?.fullName ? 'present' : 'MISSING'}, password=${oc?.password ? 'present' : 'MISSING'}, username=${oc?.username ? 'present' : 'MISSING'}`);
        }
        
        // Validate password length
        if (oc.password.length < 6) {
          throw new Error('Owner password must be at least 6 characters long');
        }
        
        // CRITICAL: Force-set ownerCredentials with all required fields
        tenantPayload.ownerCredentials = {
          email: String(adminEmail).trim().toLowerCase(),
          fullName: String(adminName).trim(),
          password: String(adminPassword),
          username: String(adminUsername).trim().toLowerCase(),
          isActive: true
        };
        
        // CRITICAL: Force-filter erpModules one final time - remove ALL invalid modules
        // Use the same validModules list to ensure consistency
        const validModulesFinal = validModules;
        if (!Array.isArray(tenantPayload.erpModules)) {
          console.error('ERROR: erpModules is not an array!', typeof tenantPayload.erpModules);
          tenantPayload.erpModules = ['projects', 'finance', 'hr'];
        } else {
          // Aggressively filter - normalize and validate each module
          const normalizedModules = tenantPayload.erpModules
            .filter(m => m != null) // Remove null/undefined
            .map(m => String(m).trim().toLowerCase()) // Convert to string and normalize
            .filter(m => m.length > 0) // Remove empty strings
            .filter(m => validModulesFinal.includes(m)) // Only keep valid ones
            .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
          
          console.log(`Filtered ${tenantPayload.erpModules.length} modules down to ${normalizedModules.length} valid modules`);
          
          if (normalizedModules.length === 0) {
            console.warn('No valid modules after filtering, using defaults');
            tenantPayload.erpModules = ['projects', 'finance', 'hr'];
          } else {
            tenantPayload.erpModules = normalizedModules;
          }
        }
        
        // FINAL VERIFICATION before creating Tenant object
        console.log('=== FINAL VERIFICATION BEFORE TENANT CREATION ===');
        console.log('ownerCredentials.email:', tenantPayload.ownerCredentials.email || 'MISSING');
        console.log('ownerCredentials.fullName:', tenantPayload.ownerCredentials.fullName || 'MISSING');
        console.log('ownerCredentials.password:', tenantPayload.ownerCredentials.password ? '***' : 'MISSING');
        console.log('ownerCredentials.username:', tenantPayload.ownerCredentials.username || 'MISSING');
        console.log('erpModules:', JSON.stringify(tenantPayload.erpModules, null, 2));
        console.log('erpModules count:', tenantPayload.erpModules.length);
        
        // Verify ownerCredentials one more time
        if (!tenantPayload.ownerCredentials.email || 
            !tenantPayload.ownerCredentials.fullName || 
            !tenantPayload.ownerCredentials.password || 
            !tenantPayload.ownerCredentials.username) {
          console.error('CRITICAL ERROR: ownerCredentials are still invalid!', tenantPayload.ownerCredentials);
          throw new Error(`Owner credentials are invalid: email=${!!tenantPayload.ownerCredentials.email}, fullName=${!!tenantPayload.ownerCredentials.fullName}, password=${!!tenantPayload.ownerCredentials.password}, username=${!!tenantPayload.ownerCredentials.username}`);
        }
        
        // Verify erpModules one more time
        const stillInvalid = tenantPayload.erpModules.filter(m => !validModulesFinal.includes(m));
        if (stillInvalid.length > 0) {
          console.error('CRITICAL ERROR: Invalid modules still present!', stillInvalid);
          // Remove them aggressively
          tenantPayload.erpModules = tenantPayload.erpModules.filter(m => validModulesFinal.includes(m));
          if (tenantPayload.erpModules.length === 0) {
            tenantPayload.erpModules = ['projects', 'finance', 'hr'];
          }
        }
        
        // Create tenant with validated payload
        console.log('Creating Tenant object with validated payload...');
        const tenant = new Tenant(tenantPayload);
        
        // Validate synchronously before save
        try {
          const validationError = tenant.validateSync();
          if (validationError) {
            console.error('=== MONGOOSE VALIDATION ERROR ===');
            console.error('Validation error:', validationError);
            const errors = Object.keys(validationError.errors || {}).map(key => ({
              field: key,
              message: validationError.errors[key].message,
              value: validationError.errors[key].value
            }));
            console.error('Validation errors:', JSON.stringify(errors, null, 2));
            const errorMsg = errors.map(e => `${e.field}: ${e.message}`).join(', ');
            throw new Error(`Tenant validation failed: ${errorMsg}`);
          }
          console.log('✓ Tenant validation passed');
        } catch (validationErr) {
          console.error('Validation failed:', validationErr);
          throw validationErr;
        }
        
        try {
          await tenant.save({ session });
          console.log('Tenant created successfully:', tenant._id);
        } catch (saveError) {
          console.error('Error saving tenant:', saveError);
          console.error('Save error name:', saveError.name);
          console.error('Save error message:', saveError.message);
          if (saveError.errors) {
            const validationErrors = Object.keys(saveError.errors).map(key => ({
              field: key,
              message: saveError.errors[key].message,
              value: saveError.errors[key].value
            }));
            console.error('Tenant validation errors:', JSON.stringify(validationErrors, null, 2));
            const errorMsg = validationErrors.map(e => `${e.field}: ${e.message}`).join(', ');
            throw new Error(`Tenant validation failed: ${errorMsg}`);
          }
          if (saveError.code === 11000) {
            // Duplicate key error (likely slug or tenantId)
            const duplicateField = saveError.keyPattern ? Object.keys(saveError.keyPattern)[0] : 'unknown';
            throw new Error(`Tenant with ${duplicateField} '${saveError.keyValue?.[duplicateField] || 'value'}' already exists`);
          }
          throw new Error(`Failed to save tenant: ${saveError.message}`);
        }
        
        // Check if organization with this slug already exists
        const existingOrg = await Organization.findOne({ slug }).session(session);
        if (existingOrg) {
          // Generate unique slug for organization
          let orgSlug = slug;
          let orgCounter = 1;
          while (await Organization.findOne({ slug: orgSlug }).session(session)) {
            orgSlug = `${slug}-${orgCounter}`;
            orgCounter++;
          }
          slug = orgSlug; // Update slug for organization
          console.log(`Organization slug already exists, using: ${slug}`);
        }
        
        // Create default organization
        // Note: Organization model uses slug for uniqueness, but we'll link it to tenant via admin user's orgId
        // For tenant database queries, we'll use the organization's _id or slug to link data
        const organizationData = {
          name: tenantData.name,
          slug: slug,
          industry: masterERP.industry || tenantData.industry || 'business',
          size: tenantData.companySize || '1-10',
          settings: {
            timezone: tenantData.settings?.timezone || 'UTC',
            currency: tenantData.settings?.currency || 'USD',
            dateFormat: tenantData.settings?.dateFormat || 'MM/DD/YYYY',
            ...(masterERP.configuration?.defaultSettings || {})
          },
          status: 'active'
        };
        
        // Store organization._id in tenant for reference (if tenant model supports it)
        // This allows us to link tenant to organization
        
        console.log('Creating organization with data:', JSON.stringify(organizationData, null, 2));
        
        const organization = new Organization(organizationData);
        try {
          await organization.save({ session });
          console.log('Organization created successfully:', organization._id);
          
          // Update tenant with organization reference for easier querying
          try {
            await Tenant.findByIdAndUpdate(
              tenant._id,
              { orgId: organization._id.toString() },
              { session }
            );
            console.log('Tenant updated with organization reference (orgId)');
          } catch (updateError) {
            console.warn('Warning: Could not update tenant with orgId:', updateError.message);
            // Non-critical if Tenant model doesn't support orgId field - we can still query via admin user
          }
        } catch (saveError) {
          console.error('Error saving organization:', saveError);
          console.error('Save error name:', saveError.name);
          console.error('Save error code:', saveError.code);
          if (saveError.errors) {
            const validationErrors = Object.keys(saveError.errors).map(key => ({
              field: key,
              message: saveError.errors[key].message,
              value: saveError.errors[key].value
            }));
            console.error('Organization validation errors:', JSON.stringify(validationErrors, null, 2));
            const errorMsg = validationErrors.map(e => `${e.field}: ${e.message}`).join(', ');
            throw new Error(`Organization validation failed: ${errorMsg}`);
          }
          if (saveError.code === 11000) {
            // Duplicate key error
            throw new Error(`Organization with slug '${slug}' already exists`);
          }
          throw new Error(`Failed to save organization: ${saveError.message}`);
        }
        
        // Create default admin user if adminUser data provided
        let adminUser = null;
        if (tenantData.adminUser && tenantData.adminUser.email) {
          // Check if user with this email already exists
          const existingUser = await User.findOne({ email: tenantData.adminUser.email }).session(session);
          if (existingUser) {
            console.warn(`Warning: User with email ${tenantData.adminUser.email} already exists. Skipping admin user creation.`);
          } else {
            // Validate password
            if (!tenantData.adminUser.password || tenantData.adminUser.password.length < 6) {
              throw new Error('Admin user password must be at least 6 characters long');
            }
            
            const userData = {
              email: tenantData.adminUser.email.toLowerCase().trim(),
              fullName: tenantData.adminUser.fullName || tenantData.adminUser.name || 'Administrator',
              password: tenantData.adminUser.password, // Will be hashed by User model's pre-save hook
              orgId: organization._id, // Required field - references Organization
              role: 'owner',
              status: 'active'
            };
            
            console.log('Creating admin user (password hidden):', JSON.stringify({
              ...userData,
              password: '***'
            }, null, 2));
            
            adminUser = new User(userData);
            try {
              await adminUser.save({ session });
              console.log('Admin user created successfully:', adminUser._id);
            } catch (saveError) {
              console.error('Error saving admin user:', saveError);
              console.error('Save error name:', saveError.name);
              console.error('Save error code:', saveError.code);
              if (saveError.errors) {
                const validationErrors = Object.keys(saveError.errors).map(key => ({
                  field: key,
                  message: saveError.errors[key].message,
                  value: saveError.errors[key].value
                }));
                console.error('User validation errors:', JSON.stringify(validationErrors, null, 2));
                const errorMsg = validationErrors.map(e => `${e.field}: ${e.message}`).join(', ');
                throw new Error(`User validation failed: ${errorMsg}`);
              }
              if (saveError.code === 11000) {
                // Duplicate key error (likely email)
                throw new Error(`User with email '${userData.email}' already exists`);
              }
              throw new Error(`Failed to save admin user: ${saveError.message}`);
            }
          }
        }
        
        // Increment Master ERP usage count (inside transaction for consistency)
        try {
          masterERP.usageCount = (masterERP.usageCount || 0) + 1;
          masterERP.lastUsed = new Date();
          await masterERP.save({ session });
        } catch (usageError) {
          console.error('Warning: Failed to increment Master ERP usage:', usageError.message);
          // Don't throw - tenant creation should still succeed
        }
        
        // Return tenant and organization documents (not toObject) so we can use them for seeding
        return {
          tenant: tenant,
          organization: organization,
          adminUser: adminUser ? adminUser.toObject() : null
        };
        }, transactionOptions);
        
        // Transaction succeeded, break out of retry loop
        // Now seed industry-specific data OUTSIDE the transaction to avoid aborting it
        if (result && result.tenant && result.organization) {
          try {
            console.log('Seeding industry-specific data outside transaction...');
            // Pass null for session since we're outside the transaction
            await this.seedIndustrySpecificData(masterERP, result.tenant, result.organization, null);
            console.log('Industry-specific data seeded successfully');
          } catch (seedError) {
            console.error('Warning: Failed to seed industry-specific data:', seedError.message);
            console.error('Seed error code:', seedError.code);
            console.error('Seed error name:', seedError.name);
            // Don't throw - tenant creation succeeded, seeding is optional
          }
        }
        
        // Convert to plain objects for response
        result = {
          tenant: result.tenant.toObject(),
          organization: result.organization.toObject(),
          adminUser: result.adminUser
        };
        
        break;
        
      } catch (error) {
        lastError = error;
        retryCount++;
        
        console.error(`Error creating tenant from Master ERP (attempt ${retryCount}/${maxRetries}):`, error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error stack:', error.stack);
        
        // Check if this is a retryable transaction error
        // DO NOT retry on duplicate key errors (E11000), validation errors, or transaction abort errors
        const isTransactionAborted = (error.message && (
          error.message.includes('has been aborted') || 
          error.message.includes('Transaction aborted')
        ));
        
        const isRetryable = 
          error.code !== 11000 && // Duplicate key error - NOT retryable
          error.name !== 'ValidationError' && // Validation errors - NOT retryable
          !isTransactionAborted && // Transaction abort - NOT retryable
          error.message && (
            error.message.includes('Please retry your operation') ||
            error.message.includes('multi-document transaction') ||
            error.message.includes('WriteConflict') ||
            error.message.includes('TransientTransactionError') ||
            error.code === 251 || // WriteConflict
            error.code === 50 ||  // MaxTimeMSExpired
            error.code === 91     // ShutdownInProgress
          );
        
        if (!isRetryable || retryCount >= maxRetries) {
          // Not retryable or max retries reached - end session and break
          if (session) {
            await session.endSession();
            session = null;
          }
          break;
        }
        
        // End the failed session before retrying
        if (session) {
          await session.endSession();
          session = null;
        }
        
        // Wait before retrying (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        console.log(`Retrying transaction in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // End session if still open (shouldn't happen, but safety check)
    if (session) {
      await session.endSession();
    }
    
    // If we have a result, return success
    if (result) {
      return {
        success: true,
        data: result,
        message: 'Organization created successfully from Master ERP'
      };
    }
    
    // If we get here, all retries failed
    console.error('All retry attempts failed. Last error:', lastError);
    
    // Preserve original error message for better debugging
    if (lastError && lastError.name === 'ValidationError' && lastError.errors) {
      // This is a Mongoose validation error - format it nicely
      const validationMsg = Object.keys(lastError.errors).map(key => 
        `${key}: ${lastError.errors[key].message}`
      ).join(', ');
      throw new Error(`Validation failed: ${validationMsg}`);
    }
    
    // Re-throw with more context
    const errorMessage = lastError ? lastError.message : 'Unknown error occurred';
    throw new Error(`Failed to create tenant from Master ERP: ${errorMessage}`);
  }
  
  /**
   * Seed industry-specific data based on Master ERP
   * @param {Object} masterERP - Master ERP template
   * @param {Object} tenant - Tenant
   * @param {Object} organization - Organization
   * @param {Object} session - MongoDB session
   */
  async seedIndustrySpecificData(masterERP, tenant, organization, session) {
    try {
      switch (masterERP.industry) {
        case 'education':
          await this.seedEducationData(tenant, organization, session);
          break;
        case 'healthcare':
          await this.seedHealthcareData(tenant, organization, session);
          break;
        case 'software_house':
          // For software_house, seed default ERP data (projects, clients, vendors, etc.)
          // Import tenantProvisioningService (already instantiated)
          const tenantProvisioningService = require('./tenantProvisioningService');
          await tenantProvisioningService.seedDefaultData(tenant, organization, session);
          console.log('Software house default data seeded successfully');
          break;
        default:
          console.log(`No specific seeding for industry: ${masterERP.industry}`);
      }
    } catch (error) {
      console.error('Error seeding industry-specific data:', error);
      throw error;
    }
  }
  
  /**
   * Seed education-specific data
   */
  async seedEducationData(tenant, organization, session) {
    // Create default academic year
    const academicYear = new Education.AcademicYear({
      orgId: organization._id,
      tenantId: tenant.tenantId,
      yearName: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      startDate: new Date(new Date().getFullYear(), 8, 1), // September 1
      endDate: new Date(new Date().getFullYear() + 1, 5, 30), // June 30
      terms: [
        {
          termName: 'Fall Semester',
          startDate: new Date(new Date().getFullYear(), 8, 1),
          endDate: new Date(new Date().getFullYear(), 11, 31),
          isActive: true
        },
        {
          termName: 'Spring Semester',
          startDate: new Date(new Date().getFullYear() + 1, 0, 1),
          endDate: new Date(new Date().getFullYear() + 1, 5, 30),
          isActive: false
        }
      ],
      isCurrent: true,
      status: 'active'
    });
    
      await academicYear.save(session ? { session } : {});
    
    // Create default courses
    const defaultCourses = [
      { name: 'Mathematics', code: 'MATH101', credits: 3 },
      { name: 'English', code: 'ENG101', credits: 3 },
      { name: 'Science', code: 'SCI101', credits: 4 },
      { name: 'History', code: 'HIST101', credits: 3 }
    ];
    
    for (const courseData of defaultCourses) {
      const course = new Education.Course({
        orgId: organization._id,
        tenantId: tenant.tenantId,
        ...courseData,
        description: `Default ${courseData.name} course`,
        duration: 'semester',
        status: 'active'
      });
      
      await course.save(session ? { session } : {});
    }
  }
  
  /**
   * Seed healthcare-specific data
   */
  async seedHealthcareData(tenant, organization, session) {
    // Create default departments
    const defaultDepartments = [
      { name: 'General Medicine', code: 'GM', description: 'General medical services' },
      { name: 'Cardiology', code: 'CARD', description: 'Heart and cardiovascular services' },
      { name: 'Pediatrics', code: 'PED', description: 'Children healthcare services' },
      { name: 'Emergency', code: 'ER', description: 'Emergency medical services' }
    ];
    
    for (const deptData of defaultDepartments) {
      const department = new Healthcare.Department({
        orgId: organization._id,
        tenantId: tenant.tenantId,
        ...deptData,
        status: 'active'
      });
      
      await department.save(session ? { session } : {});
    }
  }
  
  /**
   * Get Master ERP statistics
   * @returns {Object} Statistics
   */
  async getMasterERPStatistics() {
    try {
      const stats = await MasterERP.aggregate([
        {
          $group: {
            _id: '$industry',
            count: { $sum: 1 },
            totalUsage: { $sum: '$usageCount' },
            lastUsed: { $max: '$lastUsed' }
          }
        },
        {
          $lookup: {
            from: 'tenants',
            localField: '_id',
            foreignField: 'erpCategory',
            as: 'tenants'
          }
        },
        {
          $addFields: {
            activeTenants: { $size: '$tenants' }
          }
        }
      ]);
      
      return {
        success: true,
        data: stats
      };
      
    } catch (error) {
      throw new Error(`Failed to fetch Master ERP statistics: ${error.message}`);
    }
  }
  
  /**
   * Increment version number
   * @param {String} currentVersion - Current version
   * @returns {String} New version
   */
  incrementVersion(currentVersion) {
    if (!currentVersion) return '1.0.0';
    
    const parts = currentVersion.split('.');
    const major = parseInt(parts[0]) || 1;
    const minor = parseInt(parts[1]) || 0;
    const patch = parseInt(parts[2]) || 0;
    
    return `${major}.${minor}.${patch + 1}`;
  }
}

module.exports = new MasterERPService();
