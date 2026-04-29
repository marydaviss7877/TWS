const mongoose = require('mongoose');
const Tenant = require('../../models/tenant/Tenant');
const User = require('../../models/users-auth/User');
const Organization = require('../../models/org/Organization');

// Import modules
const { createTenantRecord, createTenantDatabase } = require('./tenantCreation');
const { createDefaultAdminUser, createDefaultOrganization } = require('./userAndOrgCreation');
const { seedIndustrySpecificData } = require('./seeders');
const defaultSeeder = require('./seeders/defaultSeeder');
const { updateOnboardingStatus, getOnboardingStatus, completeOnboardingStep } = require('./onboarding');
const { deactivateTenant, reactivateTenant } = require('./tenantManagement');
const { sendWelcomeEmail } = require('./emailService');

class TenantProvisioningService {
  /**
   * Automated tenant onboarding workflow
   * @param {Object} tenantData - Tenant registration data
   * @param {String} masterERPId - Optional Master ERP ID for industry-specific provisioning
   * @param {String} createdBy - Optional SupraAdmin ID who created the tenant
   * @returns {Object} Provisioning result
   */
  async provisionTenant(tenantData, masterERPId = null, createdBy = null) {
    // Check MongoDB connection before starting
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection is not ready. Please check your database connection.');
    }
    
    const session = await mongoose.startSession();
    let tenant, adminUser, organization;
    
    try {
      console.log('📝 Starting tenant provisioning transaction...');
      console.log('📝 MongoDB connection state:', mongoose.connection.readyState === 1 ? 'connected' : 'disconnected');
      console.log('📝 Tenant data keys:', Object.keys(tenantData));
      console.log('📝 Industry:', tenantData.erpCategory || tenantData.industry);
      console.log('📝 Existing user ID:', tenantData.existingUserId);
      console.log('📝 Transaction timeout: 30 seconds');
      
      // Transaction options with timeout (reduced for faster response)
      const transactionOptions = {
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority', wtimeout: 20000 }, // 20 second write timeout
        maxTimeMS: 30000 // 30 second transaction timeout (reduced from 60)
      };

      const result = await session.withTransaction(async () => {
        try {
          // Check connection before each step
          if (mongoose.connection.readyState !== 1) {
            throw new Error(`MongoDB connection lost. State: ${mongoose.connection.readyState}`);
          }
          
          // Step 1: Create tenant record
          console.log('📝 Step 1: Creating tenant record...');
          console.log('📝 MongoDB state before Step 1:', mongoose.connection.readyState);
          tenant = await createTenantRecord(tenantData, session, createdBy);
          console.log('✅ Tenant record created:', tenant._id);
          
          // Step 2: Create database connection
          console.log('📝 Step 2: Creating database connection...');
          console.log('📝 MongoDB state before Step 2:', mongoose.connection.readyState);
          await createTenantDatabase(tenant, session);
          console.log('✅ Database connection created');
          
          // Step 3: Create default organization first (needed for user.orgId)
          console.log('📝 Step 3: Creating default organization...');
          console.log('📝 MongoDB state before Step 3:', mongoose.connection.readyState);
          organization = await createDefaultOrganization(tenant, tenantData, session);
          console.log('✅ Organization created:', organization._id);
          
          // Step 4: Create default admin user (with orgId from organization)
          console.log('📝 Step 4: Creating/updating admin user...');
          console.log('📝 MongoDB state before Step 4:', mongoose.connection.readyState);
          console.log('📝 User ID to update:', tenantData.existingUserId);
          console.log('📝 Organization ID:', organization._id);
          adminUser = await createDefaultAdminUser(tenant, tenantData, organization, session);
          console.log('✅ Admin user created/updated:', adminUser._id);
          
          // Step 5: Seed default data (industry-specific only - NO common modules)
          // Make this non-blocking - run in background after transaction commits
          // This speeds up the response time significantly
          const seedPromise = (async () => {
            try {
              console.log('📝 Step 5: Seeding default data (background)...');
              if (masterERPId) {
                // Use industry-specific seeder from Master ERP
                await seedIndustrySpecificData(masterERPId, tenant, organization, null); // No session for background
              } else {
                // Only seed default data for 'business' category
                // Other industries should use their own seeders
                const industryType = tenant.erpCategory || 'business';
                if (industryType === 'business') {
                  await defaultSeeder.seedDefaultData(tenant, organization, null); // No session for background
                } else {
                  console.log(`⚠️  No default seeder for ${industryType}. Use Master ERP or industry-specific seeder.`);
                }
              }
              console.log('✅ Default data seeded');
            } catch (seedError) {
              console.error('⚠️ Error seeding data (non-critical):', seedError);
              // Continue even if seeding fails
            }
          })();
          
          // Don't await seeding - let it run in background
          seedPromise.catch(err => console.error('⚠️ Background seeding error:', err));
          
          // Step 6: Send welcome email (non-blocking, run in background)
          const emailPromise = (async () => {
            try {
              console.log('📝 Step 6: Sending welcome email (background)...');
              await sendWelcomeEmail(tenant, adminUser);
              console.log('✅ Welcome email sent');
            } catch (emailError) {
              console.error('⚠️ Error sending welcome email (non-critical):', emailError);
              // Continue even if email fails
            }
          })();
          
          emailPromise.catch(err => console.error('⚠️ Background email error:', err));
          
          // Step 7: Update onboarding status
          console.log('📝 Step 7: Updating onboarding status...');
          await updateOnboardingStatus(tenant, 'completed', session);
          console.log('✅ Onboarding status updated');
          
          return {
            tenant,
            adminUser,
            organization,
            status: 'success'
          };
        } catch (stepError) {
          console.error('❌ ========== ERROR IN PROVISIONING STEP ==========');
          console.error('❌ Step error name:', stepError.name);
          console.error('❌ Step error message:', stepError.message);
          console.error('❌ Step error code:', stepError.code);
          console.error('❌ Step error stack:', stepError.stack);
          console.error('❌ MongoDB state during error:', mongoose.connection.readyState);
          console.error('❌ Session in transaction?', session?.inTransaction?.());
          console.error('❌ Session has ended?', session?.hasEnded?.());
          console.error('===================================================');
          throw stepError;
        }
      }, transactionOptions);
      
      console.log('✅ Tenant provisioning transaction completed successfully');
      
      return {
        tenant: result.tenant || tenant,
        adminUser: result.adminUser || adminUser,
        organization: result.organization || organization,
        success: true,
        message: 'Tenant provisioned successfully',
        tenantId: tenantData.tenantId
      };
      
    } catch (error) {
      console.error('❌ Error provisioning tenant:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ MongoDB connection state:', mongoose.connection.readyState === 1 ? 'connected' : 'disconnected');
      
      // Check for MongoDB connection errors (be specific - don't catch all MongoServerError)
      const isConnectionError = error.message && (
        error.message.includes('Connection is closed') ||
        error.message.includes('topology was destroyed') ||
        error.message.includes('MongoNetworkError') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('socket hang up') ||
        error.message.includes('write EPIPE') ||
        (error.name === 'MongoNetworkError') ||
        (error.name === 'MongoServerSelectionError') ||
        (mongoose.connection.readyState !== 1 && !error.code) // Only if connection is down AND it's not a specific error code
      );
      
      if (isConnectionError) {
        console.error('❌ MongoDB connection error detected!');
        console.error('❌ Connection readyState:', mongoose.connection.readyState);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error code:', error.code);
        throw new Error('Database connection error. The database connection was lost during tenant creation. Please try again.');
      }
      
      // Log additional error details if available
      if (error.errors) {
        console.error('❌ Validation errors:', JSON.stringify(error.errors, null, 2));
      }
      if (error.keyPattern) {
        console.error('❌ Duplicate key pattern:', error.keyPattern);
      }
      if (error.keyValue) {
        console.error('❌ Duplicate key value:', error.keyValue);
      }
      
      // Abort transaction if it's still active
      // Check if session is still valid before trying to abort
      if (session && typeof session.inTransaction === 'function') {
        try {
          const isInTransaction = session.inTransaction();
          if (isInTransaction) {
            console.log('📝 Aborting transaction due to error...');
            // Check if session is still valid (not ended)
            if (session.hasEnded && session.hasEnded()) {
              console.warn('⚠️ Session already ended, skipping abort');
            } else {
              await session.abortTransaction();
              console.log('✅ Transaction aborted');
            }
          }
        } catch (abortError) {
          console.error('❌ Error aborting transaction:', abortError);
          console.error('❌ Abort error message:', abortError.message);
          console.error('❌ Abort error name:', abortError.name);
          // Don't throw - this is cleanup
        }
      }
      
      // Create a more descriptive error message
      let errorMessage = error.message || 'Failed to provision tenant';
      
      // Handle specific error types
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        errorMessage = `${field} already exists. Please choose a different value.`;
      } else if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors || {}).map(e => e.message).join(', ');
        errorMessage = `Validation failed: ${validationErrors}`;
      } else if (error.message && error.message.includes('not found')) {
        errorMessage = error.message;
      } else if (error.message && error.message.includes('Connection is closed')) {
        errorMessage = 'Database connection was lost. Please try again.';
      }
      
      // Create a new error with the descriptive message
      const descriptiveError = new Error(errorMessage);
      descriptiveError.originalError = error;
      descriptiveError.code = error.code;
      descriptiveError.name = error.name;
      
      throw descriptiveError;
    } finally {
      // Always end the session, but handle errors gracefully
      if (session) {
        try {
          // Check if session has already been ended
          if (session.hasEnded && typeof session.hasEnded === 'function' && session.hasEnded()) {
            console.log('ℹ️ Session already ended, skipping endSession()');
            return;
          }
          
          // Check if MongoDB connection is still valid
          if (mongoose.connection.readyState === 1) {
            await session.endSession();
            console.log('✅ Session ended');
          } else {
            console.warn('⚠️ MongoDB connection not ready, skipping session.endSession()');
          }
        } catch (sessionError) {
          // Ignore "Connection is closed" errors during cleanup - session might already be closed
          if (sessionError.message && sessionError.message.includes('Connection is closed')) {
            console.log('ℹ️ Session already closed, ignoring cleanup error');
          } else {
            console.error('❌ Error ending session:', sessionError);
            console.error('❌ Session error message:', sessionError.message);
            console.error('❌ Session error name:', sessionError.name);
          }
          // Don't throw - session cleanup errors shouldn't prevent error propagation
        }
      }
    }
  }

  // Delegate methods to imported modules
  async getOnboardingStatus(tenantId) {
    return getOnboardingStatus(tenantId);
  }

  async completeOnboardingStep(tenantId, stepName) {
    return completeOnboardingStep(tenantId, stepName);
  }

  async deactivateTenant(tenantId) {
    return deactivateTenant(tenantId);
  }

  async reactivateTenant(tenantId) {
    return reactivateTenant(tenantId);
  }
}

module.exports = new TenantProvisioningService();

