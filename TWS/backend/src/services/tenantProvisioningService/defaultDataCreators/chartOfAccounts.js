const { ChartOfAccounts } = require('../../../models/finance/Finance');

/**
 * Create default chart of accounts
 * @param {Object} tenant - Tenant record
 * @param {Object} organization - Organization record
 * @param {Object} session - MongoDB session
 */
async function createDefaultChartOfAccounts(tenant, organization, session) {
  try {
    const chartOfAccounts = new ChartOfAccounts({
      orgId: organization._id,
      tenantId: tenant.tenantId,
      name: 'Default Chart of Accounts',
      accounts: [
        // Assets
        { code: '1000', name: 'Current Assets', type: 'asset', parent: null, level: 1 },
        { code: '1100', name: 'Cash and Cash Equivalents', type: 'asset', parent: '1000', level: 2 },
        { code: '1200', name: 'Accounts Receivable', type: 'asset', parent: '1000', level: 2 },
        { code: '1300', name: 'Inventory', type: 'asset', parent: '1000', level: 2 },
        { code: '1400', name: 'Prepaid Expenses', type: 'asset', parent: '1000', level: 2 },
        
        // Liabilities
        { code: '2000', name: 'Current Liabilities', type: 'liability', parent: null, level: 1 },
        { code: '2100', name: 'Accounts Payable', type: 'liability', parent: '2000', level: 2 },
        { code: '2200', name: 'Accrued Expenses', type: 'liability', parent: '2000', level: 2 },
        { code: '2300', name: 'Short-term Debt', type: 'liability', parent: '2000', level: 2 },
        
        // Equity
        { code: '3000', name: 'Owner\'s Equity', type: 'equity', parent: null, level: 1 },
        { code: '3100', name: 'Capital', type: 'equity', parent: '3000', level: 2 },
        { code: '3200', name: 'Retained Earnings', type: 'equity', parent: '3000', level: 2 },
        
        // Revenue
        { code: '4000', name: 'Revenue', type: 'revenue', parent: null, level: 1 },
        { code: '4100', name: 'Service Revenue', type: 'revenue', parent: '4000', level: 2 },
        { code: '4200', name: 'Product Revenue', type: 'revenue', parent: '4000', level: 2 },
        
        // Expenses
        { code: '5000', name: 'Operating Expenses', type: 'expense', parent: null, level: 1 },
        { code: '5100', name: 'Salaries and Wages', type: 'expense', parent: '5000', level: 2 },
        { code: '5200', name: 'Rent and Utilities', type: 'expense', parent: '5000', level: 2 },
        { code: '5300', name: 'Marketing and Advertising', type: 'expense', parent: '5000', level: 2 },
        { code: '5400', name: 'Professional Services', type: 'expense', parent: '5000', level: 2 }
      ],
      isDefault: true,
      status: 'active'
    });

    await chartOfAccounts.save({ session });
    
  } catch (error) {
    console.error('Error creating default chart of accounts:', error);
    throw error;
  }
}

module.exports = {
  createDefaultChartOfAccounts
};

