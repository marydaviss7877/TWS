const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const SubscriptionPlan = require('../src/models/SubscriptionPlan');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://subhan:U3SNm3nRjvtHMiN7@cluster0.rlfss7x.mongodb.net/wolfstack');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    if (error.message && error.message.includes('ECONNREFUSED')) {
      console.error('\nTip: MongoDB is not reachable at localhost:27017. Either start MongoDB locally or set MONGODB_URI in .env (e.g. your Atlas or app database URL) and run again.');
    }
    process.exit(1);
  }
};

const BYTES_2GB = 2 * 1024 * 1024 * 1024;
const BYTES_5GB = 5 * 1024 * 1024 * 1024;
const BYTES_10GB = 10 * 1024 * 1024 * 1024;

const seedSubscriptionPlans = async () => {
  try {
    await SubscriptionPlan.deleteMany({});
    console.log('Cleared existing subscription plans');

    const plans = [
      {
        name: 'Trial',
        slug: 'trial',
        displayName: 'Trial',
        description: '7-day trial with Starter limits (Software House ERP)',
        type: 'basic',
        requiresCustomQuote: false,
        pricing: { monthly: 0, yearly: 0, currency: 'USD', billingCycle: 'monthly', setupFee: 0, discount: { yearlyDiscount: 0, promotionalDiscount: 0 } },
        limits: {
          users: { max: 10, unlimited: false },
          projects: { max: 20, unlimited: false },
          storage: { max: BYTES_2GB, unlimited: false },
          workspaces: { max: 3, unlimited: false },
          clientAccounts: { max: 10, unlimited: false },
          apiCalls: { max: 1000, unlimited: false },
          integrations: { max: 3, unlimited: false },
          customFields: { max: 5, unlimited: false },
          automation: { max: 10, unlimited: false }
        },
        features: {
          basicProjectManagement: true,
          taskManagement: true,
          teamCollaboration: true,
          fileSharing: true,
          advancedAnalytics: false,
          customFields: false,
          automation: false,
          integrations: false,
          apiAccess: false,
          webhooks: false,
          whiteLabeling: false,
          sso: false,
          ldap: false,
          auditLogs: false,
          dataExport: false,
          prioritySupport: false,
          dedicatedSupport: false,
          sla: false,
          payroll: false,
          customRoles: false,
          reportsAdvanced: false,
          hrAdvanced: false
        },
        support: { level: 'email', responseTime: 48, channels: ['email'], businessHours: true, sla: { uptime: 99.5, responseTime: 48 } },
        status: 'active'
      },
      {
        name: 'Starter',
        slug: 'starter',
        displayName: 'Starter',
        description: 'For small software houses getting started',
        type: 'starter',
        requiresCustomQuote: false,
        pricing: { monthly: 25, yearly: 250, currency: 'USD', billingCycle: 'monthly', setupFee: 0, discount: { yearlyDiscount: 0, promotionalDiscount: 0 } },
        limits: {
          users: { max: 10, unlimited: false },
          projects: { max: 20, unlimited: false },
          storage: { max: BYTES_2GB, unlimited: false },
          workspaces: { max: 3, unlimited: false },
          clientAccounts: { max: 10, unlimited: false },
          apiCalls: { max: 1000, unlimited: false },
          integrations: { max: 3, unlimited: false },
          customFields: { max: 5, unlimited: false },
          automation: { max: 10, unlimited: false }
        },
        features: {
          basicProjectManagement: true,
          taskManagement: true,
          teamCollaboration: true,
          fileSharing: true,
          advancedAnalytics: false,
          customFields: false,
          automation: false,
          integrations: false,
          apiAccess: false,
          webhooks: false,
          whiteLabeling: false,
          sso: false,
          ldap: false,
          auditLogs: false,
          dataExport: false,
          prioritySupport: false,
          dedicatedSupport: false,
          sla: false,
          payroll: false,
          customRoles: false,
          reportsAdvanced: false,
          hrAdvanced: false
        },
        support: { level: 'email', responseTime: 48, channels: ['email'], businessHours: true, sla: { uptime: 99.5, responseTime: 48 } },
        status: 'active'
      },
      {
        name: 'Growth',
        slug: 'growth',
        displayName: 'Growth',
        description: 'For growing software houses with more projects and clients',
        type: 'growth',
        requiresCustomQuote: false,
        pricing: { monthly: 75, yearly: 750, currency: 'USD', billingCycle: 'monthly', setupFee: 0, discount: { yearlyDiscount: 0, promotionalDiscount: 0 } },
        limits: {
          users: { max: 30, unlimited: false },
          projects: { max: -1, unlimited: true },
          storage: { max: BYTES_5GB, unlimited: false },
          workspaces: { max: 10, unlimited: false },
          clientAccounts: { max: 30, unlimited: false },
          apiCalls: { max: 5000, unlimited: false },
          integrations: { max: 5, unlimited: false },
          customFields: { max: 10, unlimited: false },
          automation: { max: 25, unlimited: false }
        },
        features: {
          basicProjectManagement: true,
          taskManagement: true,
          teamCollaboration: true,
          fileSharing: true,
          advancedAnalytics: true,
          customFields: true,
          automation: true,
          integrations: true,
          apiAccess: false,
          webhooks: false,
          whiteLabeling: false,
          sso: false,
          ldap: false,
          auditLogs: false,
          dataExport: true,
          prioritySupport: false,
          dedicatedSupport: false,
          sla: false,
          payroll: true,
          customRoles: true,
          reportsAdvanced: true,
          hrAdvanced: true
        },
        support: { level: 'email', responseTime: 24, channels: ['email', 'chat'], businessHours: true, sla: { uptime: 99.5, responseTime: 24 } },
        status: 'active'
      },
      {
        name: 'Professional',
        slug: 'professional',
        displayName: 'Professional',
        description: 'For established software houses with advanced needs',
        type: 'professional',
        requiresCustomQuote: false,
        pricing: { monthly: 175, yearly: 1750, currency: 'USD', billingCycle: 'monthly', setupFee: 0, discount: { yearlyDiscount: 0, promotionalDiscount: 0 } },
        limits: {
          users: { max: 75, unlimited: false },
          projects: { max: -1, unlimited: true },
          storage: { max: BYTES_10GB, unlimited: false },
          workspaces: { max: -1, unlimited: true },
          clientAccounts: { max: -1, unlimited: true },
          apiCalls: { max: 50000, unlimited: false },
          integrations: { max: 10, unlimited: false },
          customFields: { max: 20, unlimited: false },
          automation: { max: 50, unlimited: false }
        },
        features: {
          basicProjectManagement: true,
          taskManagement: true,
          teamCollaboration: true,
          fileSharing: true,
          advancedAnalytics: true,
          customFields: true,
          automation: true,
          integrations: true,
          apiAccess: true,
          webhooks: true,
          whiteLabeling: false,
          sso: false,
          ldap: false,
          auditLogs: true,
          dataExport: true,
          prioritySupport: true,
          dedicatedSupport: false,
          sla: false,
          payroll: true,
          customRoles: true,
          reportsAdvanced: true,
          hrAdvanced: true
        },
        support: { level: 'priority', responseTime: 4, channels: ['email', 'chat'], businessHours: true, sla: { uptime: 99.5, responseTime: 4 } },
        status: 'active'
      },
      {
        name: 'Enterprise',
        slug: 'enterprise',
        displayName: 'Enterprise',
        description: 'Custom solutions for large software houses',
        type: 'enterprise',
        requiresCustomQuote: true,
        pricing: { monthly: null, yearly: null, currency: 'USD', billingCycle: 'monthly', setupFee: 0, discount: { yearlyDiscount: 0, promotionalDiscount: 0 } },
        limits: {
          users: { max: -1, unlimited: true },
          projects: { max: -1, unlimited: true },
          storage: { max: -1, unlimited: true },
          workspaces: { max: -1, unlimited: true },
          clientAccounts: { max: -1, unlimited: true },
          apiCalls: { max: -1, unlimited: true },
          integrations: { max: -1, unlimited: true },
          customFields: { max: -1, unlimited: true },
          automation: { max: -1, unlimited: true }
        },
        features: {
          basicProjectManagement: true,
          taskManagement: true,
          teamCollaboration: true,
          fileSharing: true,
          advancedAnalytics: true,
          customFields: true,
          automation: true,
          integrations: true,
          apiAccess: true,
          webhooks: true,
          whiteLabeling: true,
          sso: true,
          ldap: true,
          auditLogs: true,
          dataExport: true,
          prioritySupport: true,
          dedicatedSupport: true,
          sla: true,
          payroll: true,
          customRoles: true,
          reportsAdvanced: true,
          hrAdvanced: true
        },
        support: { level: 'dedicated', responseTime: 0, channels: ['email', 'chat', 'phone'], businessHours: false, sla: { uptime: 99.9, responseTime: 0 } },
        status: 'active'
      }
    ];

    const created = await SubscriptionPlan.insertMany(plans);
    console.log(`Created ${created.length} subscription plans: trial, starter, growth, professional, enterprise`);
    created.forEach(p => console.log(`  - ${p.slug}: ${p.displayName}, storage ${p.limits.storage?.unlimited ? 'unlimited' : (p.limits.storage?.max / (1024**3)) + ' GB'}`));
  } catch (error) {
    console.error('Error seeding subscription plans:', error);
    throw error;
  }
};

const main = async () => {
  await connectDB();
  await seedSubscriptionPlans();
  await mongoose.connection.close();
  console.log('Done.');
  process.exit(0);
};

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { seedSubscriptionPlans };
