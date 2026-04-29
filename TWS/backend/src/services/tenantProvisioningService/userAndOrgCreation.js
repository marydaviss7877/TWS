const mongoose = require('mongoose');
const User = require('../../models/users-auth/User');
const Organization = require('../../models/org/Organization');
const Tenant = require('../../models/tenant/Tenant');

/**
 * Create default admin user
 * @param {Object} tenant - Tenant record
 * @param {Object} tenantData - Tenant data
 * @param {Object} organization - Organization record (must be created first)
 * @param {Object} session - MongoDB session
 * @returns {Object} Created admin user
 */
async function createDefaultAdminUser(tenant, tenantData, organization, session) {
  try {
    if (!organization || !organization._id) {
      throw new Error('Organization must be created before admin user');
    }
    
    let adminUser;
    
    // Check if we should use an existing user (from self-serve signup)
    if (tenantData.existingUserId) {
      try {
        console.log(`📝 Updating existing user with ID: ${tenantData.existingUserId}`);
        console.log(`📝 MongoDB state before finding user:`, mongoose.connection.readyState);
        // Update existing user instead of creating a new one
        adminUser = await User.findById(tenantData.existingUserId).session(session);
        
        if (!adminUser) {
          throw new Error(`User not found with ID: ${tenantData.existingUserId}`);
        }
        
        console.log(`📝 Found user: ${adminUser.email}`);
        
        if (!adminUser) {
          throw new Error(`Existing user not found with ID: ${tenantData.existingUserId}`);
        }
        
        console.log(`📝 Found existing user: ${adminUser.email}, current orgId: ${adminUser.orgId}`);
        
        // Update existing user with tenant and org info
        // Ensure we're using ObjectId for orgId
        adminUser.tenantId = tenant.tenantId;
        adminUser.orgId = organization._id instanceof mongoose.Types.ObjectId 
          ? organization._id 
          : new mongoose.Types.ObjectId(organization._id);
        adminUser.role = 'owner'; // Set to owner for tenant admin
        adminUser.status = 'active';
        
        // Mark fields as modified to ensure they're saved
        adminUser.markModified('orgId');
        adminUser.markModified('tenantId');
        // Preserve emailVerified status if already verified (from signup)
        // Don't override if user already verified their email
        
        // Update preferences if not set
        if (!adminUser.preferences) {
          adminUser.preferences = {
            theme: 'light',
            language: tenant.settings?.language || 'en',
            timezone: tenant.settings?.timezone || 'UTC',
            notifications: {
              email: true,
              push: true,
              sms: false
            }
          };
        }
        
        // Update onboarding if not set
        if (!adminUser.onboarding) {
          adminUser.onboarding = {
            completed: false,
            currentStep: 'welcome',
            steps: [
              { name: 'welcome', completed: false },
              { name: 'profile_setup', completed: false },
              { name: 'team_invitation', completed: false },
              { name: 'first_project', completed: false }
            ]
          };
        }
        
        console.log(`📝 Saving user with tenantId: ${adminUser.tenantId}, orgId: ${adminUser.orgId}`);
        console.log(`📝 User current state:`, {
          email: adminUser.email,
          role: adminUser.role,
          status: adminUser.status,
          tenantId: adminUser.tenantId,
          orgId: adminUser.orgId?.toString(),
          orgIdType: typeof adminUser.orgId,
          orgIdIsObjectId: adminUser.orgId instanceof mongoose.Types.ObjectId
        });
        
        // Validate required fields before saving
        if (!adminUser.orgId) {
          throw new Error('Organization ID is required for user');
        }
        if (!adminUser.tenantId) {
          throw new Error('Tenant ID is required for user');
        }
        
        // Ensure orgId is a valid ObjectId
        if (!(adminUser.orgId instanceof mongoose.Types.ObjectId)) {
          try {
            adminUser.orgId = new mongoose.Types.ObjectId(adminUser.orgId);
          } catch (objectIdError) {
            throw new Error(`Invalid organization ID format: ${adminUser.orgId}`);
          }
        }
        
        // Use findByIdAndUpdate which is atomic and returns the updated document
        // This is more reliable in transactions than updateOne + findById
        const updateData = {
          tenantId: adminUser.tenantId,
          orgId: adminUser.orgId,
          role: adminUser.role,
          status: adminUser.status
        };
        
        // Only update preferences/onboarding if they don't exist
        if (!adminUser.preferences) {
          updateData.preferences = {
            theme: 'light',
            language: 'en',
            timezone: 'UTC',
            notifications: { email: true, push: true, sms: false }
          };
        }
        if (!adminUser.onboarding) {
          updateData.onboarding = {
            completed: false,
            currentStep: 'welcome',
            steps: [
              { name: 'welcome', completed: false },
              { name: 'profile_setup', completed: false },
              { name: 'team_invitation', completed: false },
              { name: 'first_project', completed: false }
            ]
          };
        }
        
        // Use findByIdAndUpdate which returns the updated document directly
        const userId = adminUser._id; // Store ID before update
        adminUser = await User.findByIdAndUpdate(
          userId,
          { $set: updateData },
          { 
            new: true, // Return updated document
            session, 
            runValidators: false // Disable validators to avoid connection issues
          }
        );
        
        if (!adminUser) {
          throw new Error(`User not found with ID: ${userId}`);
        }
        
        console.log(`✅ Updated existing user ${adminUser.email} to be tenant admin`);
      } catch (userUpdateError) {
        console.error('❌ Error updating existing user:', userUpdateError);
        console.error('❌ User update error name:', userUpdateError.name);
        console.error('❌ User update error message:', userUpdateError.message);
        if (userUpdateError.errors) {
          console.error('❌ User validation errors:', JSON.stringify(userUpdateError.errors, null, 2));
        }
        throw new Error(`Failed to update existing user: ${userUpdateError.message}`);
      }
    } else {
      // Create new admin user (for admin-created tenants)
      const adminPassword = tenantData.adminPassword;
      
      if (!adminPassword) {
        throw new Error('Admin password is required when creating new admin user');
      }
      
      // Check if user with this email already exists
      const existingUser = await User.findOne({ email: tenantData.adminEmail }).session(session);
      if (existingUser) {
        throw new Error(`User with email ${tenantData.adminEmail} already exists`);
      }
      
      adminUser = new User({
        email: tenantData.adminEmail,
        fullName: tenantData.adminName || 'Administrator',
        role: 'owner', // Set to owner for tenant admin
        status: 'active',
        tenantId: tenant.tenantId,
        orgId: organization._id, // Set orgId from organization
        password: adminPassword, // Will be hashed by pre-save middleware
        emailVerified: false,
        lastLogin: null,
        preferences: {
          theme: 'light',
          language: tenant.settings?.language || 'en',
          timezone: tenant.settings?.timezone || 'UTC',
          notifications: {
            email: true,
            push: true,
            sms: false
          }
        },
        onboarding: {
          completed: false,
          currentStep: 'welcome',
          steps: [
            { name: 'welcome', completed: false },
            { name: 'profile_setup', completed: false },
            { name: 'team_invitation', completed: false },
            { name: 'first_project', completed: false }
          ]
        }
      });

      await adminUser.save({ session });
      console.log(`✅ Created new admin user ${adminUser.email}`);
    }
    
    // Update organization to include admin user in adminUsers array
    await Organization.findByIdAndUpdate(
      organization._id,
      { $push: { adminUsers: adminUser._id } },
      { session }
    );
    
    // Update tenant onboarding status
    await Tenant.findByIdAndUpdate(
      tenant._id,
      {
        'onboarding.steps.2.completed': true,
        'onboarding.steps.2.completedAt': new Date()
      },
      { session }
    );

    return adminUser;
    
  } catch (error) {
    console.error('Error creating default admin user:', error);
    throw error;
  }
}

/**
 * Create default organization
 * @param {Object} tenant - Tenant record
 * @param {Object} tenantData - Tenant data (for address, industry, etc.)
 * @param {Object} session - MongoDB session
 * @returns {Object} Created organization
 */
async function createDefaultOrganization(tenant, tenantData, session) {
  try {
    // Parse address if it's a string
    let addressObj = {};
    if (tenantData.address) {
      if (typeof tenantData.address === 'string') {
        // Simple parsing - split by comma or newline
        const parts = tenantData.address.split(/[,\n]/).map(p => p.trim()).filter(p => p);
        addressObj = {
          street: parts[0] || '',
          city: parts[1] || '',
          state: parts[2] || '',
          zipCode: parts[3] || '',
          country: parts[4] || 'US'
        };
      } else {
        addressObj = tenantData.address;
      }
    }
    
    // Create organization first (without adminUsers - will be updated after user creation)
    const organization = new Organization({
      name: tenant.name,
      tenantId: tenant.tenantId,
      type: 'company',
      industry: tenantData.industry || 'Technology',
      size: tenantData.companySize || 'small',
      address: {
        street: addressObj.street || '',
        city: addressObj.city || '',
        state: addressObj.state || '',
        zipCode: addressObj.zipCode || '',
        country: addressObj.country || 'US'
      },
      contact: {
        email: tenantData.adminEmail || tenantData.contactInfo?.email || '',
        phone: tenantData.phone || tenantData.contactInfo?.phone || '',
        website: tenantData.website || tenantData.contactInfo?.website || ''
      },
      settings: {
        timezone: tenant.settings?.timezone || 'UTC',
        currency: tenant.settings?.currency || 'USD',
        dateFormat: tenant.settings?.dateFormat || 'MM/DD/YYYY',
        workingHours: {
          start: '09:00',
          end: '17:00',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        }
      },
      adminUsers: [], // Will be updated after user creation
      status: 'active'
    });

    await organization.save({ session });
    
    // Update tenant onboarding status
    await Tenant.findByIdAndUpdate(
      tenant._id,
      {
        'onboarding.steps.3.completed': true,
        'onboarding.steps.3.completedAt': new Date()
      },
      { session }
    );

    return organization;
    
  } catch (error) {
    console.error('Error creating default organization:', error);
    throw error;
  }
}

module.exports = {
  createDefaultAdminUser,
  createDefaultOrganization
};

