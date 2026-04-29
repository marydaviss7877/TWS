const { Transaction, ChartOfAccounts } = require('../../../models/finance/Finance');
const User = require('../../../models/users-auth/User');

/**
 * Create sample finance transactions
 * @param {Object} tenant - Tenant record
 * @param {Object} organization - Organization record
 * @param {Object} session - MongoDB session
 */
async function createSampleFinanceTransactions(tenant, organization, session) {
  try {
    // Get admin user for transaction creation
    const adminUser = await User.findOne({ 
      orgId: organization._id, 
      role: 'owner' 
    }).session(session);

    if (!adminUser) {
      console.warn('Admin user not found, skipping finance transaction creation');
      return;
    }

    // Get chart of accounts
    // ChartOfAccounts might have an accounts array or be individual account documents
    // Try to find the chart of accounts document first
    let chartOfAccounts = await ChartOfAccounts.findOne({
      orgId: organization._id,
      name: 'Default Chart of Accounts'
    }).session(session);

    // If chartOfAccounts has accounts array, use it; otherwise, query for individual accounts
    let revenueAccountId = null;
    let expenseAccountId = null;

    if (chartOfAccounts && chartOfAccounts.accounts && chartOfAccounts.accounts.length > 0) {
      // ChartOfAccounts has accounts array
      const revenueAccount = chartOfAccounts.accounts.find(acc => acc.code === '4000' || acc.code === '4100');
      const expenseAccount = chartOfAccounts.accounts.find(acc => acc.code === '5000' || acc.code === '5100');
      // Note: account IDs in the array might not be ObjectIds, so we'll use null and let the transaction save without accountId
    } else {
      // Try to find individual account documents
      const revenueAccountDoc = await ChartOfAccounts.findOne({
        orgId: organization._id,
        code: '4000'
      }).session(session);
      const expenseAccountDoc = await ChartOfAccounts.findOne({
        orgId: organization._id,
        code: '5000'
      }).session(session);
      
      if (revenueAccountDoc) revenueAccountId = revenueAccountDoc._id;
      if (expenseAccountDoc) expenseAccountId = expenseAccountDoc._id;
    }

    const transactions = [
      {
        orgId: organization._id,
        type: 'revenue',
        amount: 5000,
        currency: tenant.settings.currency || 'USD',
        description: 'Sample revenue transaction - Project payment',
        date: new Date(),
        accountId: revenueAccountId,
        category: 'services',
        status: 'paid'
      },
      {
        orgId: organization._id,
        type: 'expense',
        amount: 1500,
        currency: tenant.settings.currency || 'USD',
        description: 'Sample expense transaction - Office supplies',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        accountId: expenseAccountId,
        category: 'office_supplies',
        status: 'paid'
      },
      {
        orgId: organization._id,
        type: 'revenue',
        amount: 3000,
        currency: tenant.settings.currency || 'USD',
        description: 'Sample revenue transaction - Consulting services',
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
        accountId: revenueAccountId,
        category: 'services',
        status: 'paid'
      },
      {
        orgId: organization._id,
        type: 'expense',
        amount: 800,
        currency: tenant.settings.currency || 'USD',
        description: 'Sample expense transaction - Software subscription',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        accountId: expenseAccountId,
        category: 'software',
        status: 'paid'
      }
    ];

    for (const transactionData of transactions) {
      const transaction = new Transaction(transactionData);
      await transaction.save({ session });
    }

    console.log(`Created ${transactions.length} sample finance transactions`);
    
  } catch (error) {
    console.error('Error creating sample finance transactions:', error);
    // Don't throw error - transactions are optional
  }
}

module.exports = {
  createSampleFinanceTransactions
};

