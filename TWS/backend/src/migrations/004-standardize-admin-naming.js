const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Migration script to standardize admin naming conventions
 * Renames SupraAdmin/GTSAdmin to TWSAdmin and updates all references
 */

async function runAdminMigration(db) {
  try {
    console.log('🔄 Starting admin model migration...');

    // Step 1: Check if SupraAdmin collection exists and has data
    const supraAdminExists = await db.listCollections({ name: 'supraadmins' }).hasNext();
    const gtsAdminExists = await db.listCollections({ name: 'gtsadmins' }).hasNext();
    
    if (supraAdminExists) {
      console.log('📋 Found SupraAdmin collection');
      const supraAdminCount = await db.collection('supraadmins').countDocuments();
      console.log(`   - ${supraAdminCount} SupraAdmin records found`);
    }
    
    if (gtsAdminExists) {
      console.log('📋 Found GTSAdmin collection');
      const gtsAdminCount = await db.collection('gtsadmins').countDocuments();
      console.log(`   - ${gtsAdminCount} GTSAdmin records found`);
    }

    // Step 2: Create TWSAdmin collection if it doesn't exist
    const twsAdminExists = await db.listCollections({ name: 'twsadmins' }).hasNext();
    if (!twsAdminExists) {
      console.log('📋 Creating TWSAdmin collection...');
      await db.createCollection('twsadmins');
    }

    // Step 3: Migrate SupraAdmin data to TWSAdmin
    if (supraAdminExists) {
      console.log('🔄 Migrating SupraAdmin data to TWSAdmin...');
      
      const supraAdmins = await db.collection('supraadmins').find({}).toArray();
      
      for (const admin of supraAdmins) {
        // Update role names to platform-level roles
        const roleMapping = {
          'super_admin': 'platform_super_admin',
          'admin': 'platform_admin',
          'support': 'platform_support',
          'billing': 'platform_billing'
        };
        
        const updatedAdmin = {
          ...admin,
          role: roleMapping[admin.role] || 'platform_admin',
          department: admin.department || 'Platform Administration',
          platformSettings: {
            maxTenants: 1000,
            defaultTrialDays: 30,
            systemMaintenanceMode: false
          }
        };
        
        // Insert into TWSAdmin collection
        await db.collection('twsadmins').insertOne(updatedAdmin);
        console.log(`   ✅ Migrated SupraAdmin: ${admin.email}`);
      }
    }

    // Step 4: Migrate GTSAdmin data to TWSAdmin (if different from SupraAdmin)
    if (gtsAdminExists) {
      console.log('🔄 Migrating GTSAdmin data to TWSAdmin...');
      
      const gtsAdmins = await db.collection('gtsadmins').find({}).toArray();
      
      for (const admin of gtsAdmins) {
        // Check if admin already exists in TWSAdmin (by email)
        const existingAdmin = await db.collection('twsadmins').findOne({ email: admin.email });
        
        if (!existingAdmin) {
          // Update role names to platform-level roles
          const roleMapping = {
            'super_admin': 'platform_super_admin',
            'admin': 'platform_admin',
            'support': 'platform_support',
            'billing': 'platform_billing'
          };
          
          const updatedAdmin = {
            ...admin,
            role: roleMapping[admin.role] || 'platform_admin',
            department: admin.department || 'Platform Administration',
            platformSettings: {
              maxTenants: 1000,
              defaultTrialDays: 30,
              systemMaintenanceMode: false
            }
          };
          
          // Insert into TWSAdmin collection
          await db.collection('twsadmins').insertOne(updatedAdmin);
          console.log(`   ✅ Migrated GTSAdmin: ${admin.email}`);
        } else {
          console.log(`   ⚠️  GTSAdmin ${admin.email} already exists in TWSAdmin, skipping`);
        }
      }
    }

    // Step 5: Update references in other collections
    console.log('🔄 Updating references in other collections...');
    
    // Update Tenant collection references
    const tenantUpdateResult = await db.collection('tenants').updateMany(
      { createdBy: { $exists: true } },
      { $set: { createdByType: 'TWSAdmin' } }
    );
    console.log(`   ✅ Updated ${tenantUpdateResult.modifiedCount} tenant references`);

    // Update MasterERP collection references
    const masterERPUpdateResult = await db.collection('mastererps').updateMany(
      { createdBy: { $exists: true } },
      { $set: { createdByType: 'TWSAdmin' } }
    );
    console.log(`   ✅ Updated ${masterERPUpdateResult.modifiedCount} MasterERP references`);

    // Step 6: Create indexes for TWSAdmin collection
    console.log('🔄 Creating indexes for TWSAdmin collection...');
    await db.collection('twsadmins').createIndex({ email: 1 }, { unique: true });
    await db.collection('twsadmins').createIndex({ role: 1 });
    await db.collection('twsadmins').createIndex({ status: 1 });
    console.log('   ✅ TWSAdmin indexes created');

    // Step 7: Backup old collections (optional)
    console.log('🔄 Creating backup of old admin collections...');
    
    if (supraAdminExists) {
      await db.collection('supraadmins').aggregate([
        { $out: 'supraadmins_backup_' + new Date().toISOString().split('T')[0] }
      ]);
      console.log('   ✅ SupraAdmin backup created');
    }
    
    if (gtsAdminExists) {
      await db.collection('gtsadmins').aggregate([
        { $out: 'gtsadmins_backup_' + new Date().toISOString().split('T')[0] }
      ]);
      console.log('   ✅ GTSAdmin backup created');
    }

    console.log('✅ Admin model migration completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('   - SupraAdmin/GTSAdmin models renamed to TWSAdmin');
    console.log('   - Role hierarchy standardized');
    console.log('   - Platform-level vs tenant-level roles clarified');
    console.log('   - Old collections backed up');
    console.log('');
    console.log('⚠️  Next steps:');
    console.log('   1. Update all route files to use TWSAdmin instead of SupraAdmin/GTSAdmin');
    console.log('   2. Update frontend references');
    console.log('   3. Test authentication flow');
    console.log('   4. Remove old SupraAdmin/GTSAdmin collections after testing');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

const migration = {
  version: '004',
  name: 'standardize-admin-naming',
  description: 'Rename SupraAdmin/GTSAdmin to TWSAdmin and update references',
  async up(db) {
    await runAdminMigration(db);
  },
  async down() {
    console.log('Rollback not supported for 004-standardize-admin-naming.');
  }
};

// Run migration if called directly (connects itself)
async function migrateAdminModels() {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    await runAdminMigration(mongoose.connection.db);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  migrateAdminModels()
    .then(() => { console.log('🎉 Migration completed successfully!'); process.exit(0); })
    .catch((error) => { console.error('💥 Migration failed:', error); process.exit(1); });
}

module.exports = migration;
