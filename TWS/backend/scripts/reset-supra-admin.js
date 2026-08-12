/**
 * Reset SupraAdmin (TWSAdmin) password for admin@tws.com
 */

const mongoose = require('mongoose');
const TWSAdmin = require('../src/models/admin-platform/TWSAdmin');

const MONGO_URI = process.env.MONGO_URI;
const ADMIN_EMAIL = 'admin@tws.com';
const NEW_PASSWORD = process.env.NEW_PASSWORD;

async function resetSupraAdmin() {
  try {
    if (!MONGO_URI) throw new Error('MONGO_URI is required');
    if (!NEW_PASSWORD || NEW_PASSWORD.length < 12) {
      throw new Error('NEW_PASSWORD is required and must be at least 12 characters');
    }

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    let admin = await TWSAdmin.findOne({ email: ADMIN_EMAIL }).select('+password');

    if (!admin) {
      throw new Error(`TWSAdmin not found: ${ADMIN_EMAIL}`);
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
    console.log('📋 SUPRA ADMIN RESET RESULT:');
    console.log('═══════════════════════════════════════════════');
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log('   Password: [not logged]');
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
