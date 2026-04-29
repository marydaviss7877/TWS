/**
 * Verify Education ERP Setup
 * Run: node scripts/verify-setup.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function verifySetup() {
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  console.log('🔍 Verifying Education ERP Setup...\n');

  // Check Environment Variables
  console.log('1. Checking Environment Variables...');
  
  if (process.env.ENCRYPTION_KEY) {
    results.passed.push('ENCRYPTION_KEY is set');
    console.log('   ✅ ENCRYPTION_KEY: Set');
  } else {
    results.warnings.push('ENCRYPTION_KEY is not set');
    console.log('   ⚠️  ENCRYPTION_KEY: Not set');
  }

  if (process.env.REDIS_HOST || process.env.REDIS_URL) {
    results.passed.push('Redis configuration found');
    console.log('   ✅ Redis: Configured');
  } else if (process.env.REDIS_DISABLED === 'true') {
    results.passed.push('Redis disabled (using in-memory fallback)');
    console.log('   ✅ Redis: Disabled (will use in-memory cache)');
  } else {
    results.warnings.push('Redis not configured (will use in-memory fallback)');
    console.log('   ⚠️  Redis: Not configured (will use in-memory cache)');
  }

  // Check Service Imports
  console.log('\n2. Checking Service Imports...');
  
  try {
    const cacheService = require('../src/services/cacheService');
    results.passed.push('Cache Service can be imported');
    console.log('   ✅ Cache Service: Importable');
  } catch (error) {
    results.failed.push(`Cache Service import failed: ${error.message}`);
    console.log('   ❌ Cache Service: Import failed');
  }

  try {
    const tokenBlacklistService = require('../src/services/tokenBlacklistService');
    results.passed.push('Token Blacklist Service can be imported');
    console.log('   ✅ Token Blacklist Service: Importable');
  } catch (error) {
    results.failed.push(`Token Blacklist Service import failed: ${error.message}`);
    console.log('   ❌ Token Blacklist Service: Import failed');
  }

  try {
    const gdprExportService = require('../src/services/gdprDataExportService');
    results.passed.push('GDPR Export Service can be imported');
    console.log('   ✅ GDPR Export Service: Importable');
  } catch (error) {
    results.failed.push(`GDPR Export Service import failed: ${error.message}`);
    console.log('   ❌ GDPR Export Service: Import failed');
  }

  try {
    const tenantLifecycleService = require('../src/services/tenantLifecycleService');
    results.passed.push('Tenant Lifecycle Service can be imported');
    console.log('   ✅ Tenant Lifecycle Service: Importable');
  } catch (error) {
    results.failed.push(`Tenant Lifecycle Service import failed: ${error.message}`);
    console.log('   ❌ Tenant Lifecycle Service: Import failed');
  }

  try {
    const gradeCalculationService = require('../src/services/gradeCalculationService');
    results.passed.push('Grade Calculation Service can be imported');
    console.log('   ✅ Grade Calculation Service: Importable');
  } catch (error) {
    results.failed.push(`Grade Calculation Service import failed: ${error.message}`);
    console.log('   ❌ Grade Calculation Service: Import failed');
  }

  // Check Model Imports
  console.log('\n3. Checking Model Imports...');
  
  try {
    const { Student, Teacher, Class, Grade, Course, AcademicYear, Exam } = require('../src/models/industry/Education');
    results.passed.push('Education models can be imported');
    console.log('   ✅ Education Models: Importable');
  } catch (error) {
    results.failed.push(`Education models import failed: ${error.message}`);
    console.log('   ❌ Education Models: Import failed');
  }

  // Check Middleware Imports
  console.log('\n4. Checking Middleware Imports...');
  
  try {
    const { validateTenantAccess } = require('../src/middleware/tenantValidation');
    results.passed.push('Tenant Validation middleware can be imported');
    console.log('   ✅ Tenant Validation Middleware: Importable');
  } catch (error) {
    results.failed.push(`Tenant Validation middleware import failed: ${error.message}`);
    console.log('   ❌ Tenant Validation Middleware: Import failed');
  }

  try {
    const { requirePermission } = require('../src/middleware/permissions');
    results.passed.push('Permissions middleware can be imported');
    console.log('   ✅ Permissions Middleware: Importable');
  } catch (error) {
    results.failed.push(`Permissions middleware import failed: ${error.message}`);
    console.log('   ❌ Permissions Middleware: Import failed');
  }

  try {
    const { cache } = require('../src/middleware/cache');
    results.passed.push('Cache middleware can be imported');
    console.log('   ✅ Cache Middleware: Importable');
  } catch (error) {
    results.failed.push(`Cache middleware import failed: ${error.message}`);
    console.log('   ❌ Cache Middleware: Import failed');
  }

  // Test Database Connection (optional)
  console.log('\n5. Testing Database Connection...');
  if (process.env.MONGO_URI) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 3000
      });
      results.passed.push('Database connection successful');
      console.log('   ✅ Database: Connected');
      await mongoose.disconnect();
    } catch (error) {
      results.warnings.push(`Database connection failed: ${error.message}`);
      console.log('   ⚠️  Database: Connection failed (may not be running)');
    }
  } else {
    results.warnings.push('MONGO_URI not set');
    console.log('   ⚠️  Database: MONGO_URI not configured');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Verification Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed Checks:');
    results.failed.forEach(item => {
      console.log(`   - ${item}`);
    });
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    results.warnings.forEach(item => {
      console.log(`   - ${item}`);
    });
  }

  if (results.failed.length === 0) {
    console.log('\n🎉 Setup verification complete! All critical checks passed.');
    console.log('💡 Review warnings above for optional improvements.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some checks failed. Please fix the issues above before proceeding.');
    process.exit(1);
  }
}

verifySetup().catch(error => {
  console.error('❌ Verification error:', error);
  process.exit(1);
});
