/**
 * Reset SupraAdmin (TWSAdmin) password for admin@tws.com
 */

const mongoose = require('mongoose');
const TWSAdmin = require('../src/models/TWSAdmin');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://subhan:U3SNm3nRjvtHMiN7@cluster0.rlfss7x.mongodb.net/wolfstack';
const ADMIN_EMAIL = 'admin@tws.com';
const NEW_PASSWORD = 'admin123456';

async function resetSupraAdmin() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    let admin = await TWSAdmin.findOne({ email: ADMIN_EMAIL }).select('+password');

    if (!admin) {
      console.log('⚠️  TWSAdmin not found — creating one...');
      admin = new TWSAdmin({
        email: ADMIN_EMAIL,
        password: NEW_PASSWORD,
        fullName: 'TWS Platform Admin',
        role: 'platform_super_admin',
        status: 'active'
      });
      await admin.save();
      console.log('✅ TWSAdmin created successfully\n');
    } else {
      console.log(`✅ Found TWSAdmin: ${admin.email} (role: ${admin.role})`);
      console.log('🔄 Resetting password...');
      admin.password = NEW_PASSWORD;
      await admin.save();
      console.log('✅ Password reset successfully\n');
    }

    // Verify
    const verifyAdmin = await TWSAdmin.findOne({ email: ADMIN_EMAIL }).select('+password');
    const valid = await verifyAdmin.comparePassword(NEW_PASSWORD);

    console.log('═══════════════════════════════════════════════');
    console.log('📋 SUPRA ADMIN CREDENTIALS:');
    console.log('═══════════════════════════════════════════════');
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${NEW_PASSWORD}`);
    console.log(`   Role:     ${verifyAdmin.role}`);
    console.log(`   Status:   ${verifyAdmin.status}`);
    console.log(`   Verified: ${valid ? '✅ Password works!' : '❌ Verification failed'}`);
    console.log('═══════════════════════════════════════════════\n');

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

resetSupraAdmin().then(() => process.exit(0));
