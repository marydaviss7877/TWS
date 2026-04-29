const { ChartOfAccounts, JournalEntry } = require('../../models/finance/Finance');

class ChartOfAccountsService {
  /**
   * Create chart of accounts structure
   * @param {string} orgId - Organization ID
   * @param {Object} accountData - Account data
   * @returns {Object} Created account
   */
  async createAccount(orgId, accountData) {
    try {
      // Validate parent account exists (if provided)
      if (accountData.parentAccount) {
        const parent = await ChartOfAccounts.findOne({
          _id: accountData.parentAccount,
          orgId: orgId
        });
        if (!parent) {
          throw new Error('Parent account not found');
        }
        // Set account level based on parent
        accountData.level = (parent.level || 1) + 1;
      } else {
        accountData.level = 1;
      }

      // Auto-generate account code if not provided
      if (!accountData.code) {
        accountData.code = await this.generateAccountCode(orgId, accountData.type, accountData.parentAccount);
      } else {
        // Validate code uniqueness
        const existing = await ChartOfAccounts.findOne({
          code: accountData.code,
          orgId: orgId
        });
        if (existing) {
          throw new Error('Account code already exists');
        }
      }

      // Validate account type
      const validTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
      if (!validTypes.includes(accountData.type)) {
        throw new Error('Invalid account type');
      }

      const account = new ChartOfAccounts({
        ...accountData,
        orgId: orgId,
        isActive: accountData.isActive !== undefined ? accountData.isActive : true
      });

      await account.save();
      return account;
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  /**
   * Get hierarchical chart of accounts
   * @param {string} orgId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} Hierarchical accounts structure
   */
  async getChartOfAccounts(orgId, filters = {}) {
    try {
      const queryFilter = { orgId: orgId };
      
      if (filters.type) queryFilter.type = filters.type;
      if (filters.isActive !== undefined) queryFilter.isActive = filters.isActive;
      if (filters.level) queryFilter.level = filters.level;
      if (filters.search) {
        queryFilter.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { code: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const accounts = await ChartOfAccounts.find(queryFilter)
        .populate('parentAccount', 'name code type')
        .sort({ code: 1 });

      // Build hierarchical tree structure
      const accountMap = new Map();
      const rootAccounts = [];

      // First pass: create map of all accounts
      accounts.forEach(account => {
        accountMap.set(account._id.toString(), {
          ...account.toObject(),
          children: [],
          balance: 0
        });
      });

      // Second pass: build tree and calculate balances
      accounts.forEach(account => {
        const accountObj = accountMap.get(account._id.toString());
        
        if (account.parentAccount) {
          const parentId = account.parentAccount._id ? account.parentAccount._id.toString() : account.parentAccount.toString();
          const parent = accountMap.get(parentId);
          if (parent) {
            parent.children.push(accountObj);
          }
        } else {
          rootAccounts.push(accountObj);
        }
      });

      // Calculate account balances
      for (const account of accounts) {
        const balance = await this.getAccountBalance(orgId, account._id);
        const accountObj = accountMap.get(account._id.toString());
        if (accountObj) {
          accountObj.balance = balance;
        }
      }

      return {
        accounts: rootAccounts,
        flat: accounts
      };
    } catch (error) {
      console.error('Error getting chart of accounts:', error);
      throw error;
    }
  }

  /**
   * Load account template (startup, enterprise, SaaS, consulting)
   * @param {string} orgId - Organization ID
   * @param {string} templateName - Template name
   * @returns {Array} Created accounts
   */
  async loadTemplate(orgId, templateName) {
    try {
      const templates = this.getAccountTemplates();
      const template = templates[templateName];
      
      if (!template) {
        throw new Error(`Template "${templateName}" not found`);
      }

      // Check if accounts already exist
      const existing = await ChartOfAccounts.findOne({ orgId: orgId });
      if (existing) {
        throw new Error('Chart of accounts already exists. Please delete existing accounts first.');
      }

      const createdAccounts = [];
      const accountMap = new Map();

      // First pass: create all accounts
      for (const accountData of template.accounts) {
        const account = await this.createAccount(orgId, {
          code: accountData.code,
          name: accountData.name,
          type: accountData.type,
          description: accountData.description || '',
          parentAccount: accountData.parentCode ? accountMap.get(accountData.parentCode)?._id : null
        });
        
        accountMap.set(accountData.code, account);
        createdAccounts.push(account);
      }

      return createdAccounts;
    } catch (error) {
      console.error('Error loading template:', error);
      throw error;
    }
  }

  /**
   * Update account
   * @param {string} orgId - Organization ID
   * @param {string} accountId - Account ID
   * @param {Object} updates - Update data
   * @returns {Object} Updated account
   */
  async updateAccount(orgId, accountId, updates) {
    try {
      // Validate account belongs to org
      const account = await ChartOfAccounts.findOne({
        _id: accountId,
        orgId: orgId
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // If parent is being changed, validate and update level
      if (updates.parentAccount && updates.parentAccount !== account.parentAccount?.toString()) {
        const parent = await ChartOfAccounts.findOne({
          _id: updates.parentAccount,
          orgId: orgId
        });
        if (!parent) {
          throw new Error('Parent account not found');
        }
        updates.level = (parent.level || 1) + 1;
      }

      // Validate code uniqueness if code is being changed
      if (updates.code && updates.code !== account.code) {
        const existing = await ChartOfAccounts.findOne({
          code: updates.code,
          orgId: orgId,
          _id: { $ne: accountId }
        });
        if (existing) {
          throw new Error('Account code already exists');
        }
      }

      const updatedAccount = await ChartOfAccounts.findOneAndUpdate(
        { _id: accountId, orgId: orgId },
        { $set: updates },
        { new: true, runValidators: true }
      ).populate('parentAccount', 'name code');

      return updatedAccount;
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  }

  /**
   * Delete account (soft delete)
   * @param {string} orgId - Organization ID
   * @param {string} accountId - Account ID
   * @returns {Object} Deleted account
   */
  async deleteAccount(orgId, accountId) {
    try {
      const account = await ChartOfAccounts.findOne({
        _id: accountId,
        orgId: orgId
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // Check if account has transactions
      const hasTransactions = await JournalEntry.exists({
          'entries.accountId': accountId,
          orgId: orgId
      });

      if (hasTransactions) {
        throw new Error('Cannot delete account with existing transactions. Please deactivate instead.');
      }

      // Check for child accounts
      const childAccounts = await ChartOfAccounts.find({
        parentAccount: accountId,
        orgId: orgId
      });

      if (childAccounts.length > 0) {
        throw new Error('Cannot delete account with child accounts. Please delete or reassign child accounts first.');
      }

      // Soft delete account
      account.isActive = false;
      await account.save();

      return account;
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   * @param {string} orgId - Organization ID
   * @param {string} accountId - Account ID
   * @param {Date} startDate - Start date (optional)
   * @param {Date} endDate - End date (optional)
   * @returns {number} Account balance
   */
  async getAccountBalance(orgId, accountId, startDate = null, endDate = null) {
    try {
      const query = {
        orgId: orgId,
        'entries.accountId': accountId,
        status: 'posted'
      };

      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      const journalEntries = await JournalEntry.find(query);

      let totalDebit = 0;
      let totalCredit = 0;

      journalEntries.forEach(entry => {
        entry.entries.forEach(lineItem => {
          if (lineItem.accountId.toString() === accountId.toString()) {
            totalDebit += lineItem.debit || 0;
            totalCredit += lineItem.credit || 0;
          }
        });
      });

      // Get account type to determine normal balance
      const account = await ChartOfAccounts.findById(accountId);
      if (!account) return 0;

      // Assets and Expenses: Debit - Credit
      // Liabilities, Equity, Revenue: Credit - Debit
      const isDebitNormal = ['asset', 'expense'].includes(account.type);
      const balance = isDebitNormal ? (totalDebit - totalCredit) : (totalCredit - totalDebit);

      return balance;
    } catch (error) {
      console.error('Error calculating account balance:', error);
      return 0;
    }
  }

  /**
   * Generate account code
   * @param {string} orgId - Organization ID
   * @param {string} type - Account type
   * @param {string} parentAccountId - Parent account ID (optional)
   * @returns {string} Generated account code
   */
  async generateAccountCode(orgId, type, parentAccountId = null) {
    try {
      const typePrefixes = {
        asset: '1',
        liability: '2',
        equity: '3',
        revenue: '4',
        expense: '5'
      };

      const prefix = typePrefixes[type] || '9';

      if (parentAccountId) {
        const parent = await ChartOfAccounts.findById(parentAccountId);
        if (parent && parent.code) {
          // Generate child code based on parent
          const parentCode = parent.code;
          const lastChild = await ChartOfAccounts.findOne({
            orgId: orgId,
            parentAccount: parentAccountId
          }).sort({ code: -1 });

          if (lastChild && lastChild.code) {
            const lastCode = parseInt(lastChild.code.slice(-2)) || 0;
            return `${parentCode}${String(lastCode + 1).padStart(2, '0')}`;
          }
          return `${parentCode}01`;
        }
      }

      // Generate root level code
      const lastRoot = await ChartOfAccounts.findOne({
        orgId: orgId,
        type: type,
        parentAccount: null
      }).sort({ code: -1 });

      if (lastRoot && lastRoot.code) {
        const lastCode = parseInt(lastRoot.code.slice(0, 4)) || 0;
        return `${String(lastCode + 1000).padStart(4, '0')}00`;
      }

      return `${prefix}000`;
    } catch (error) {
      console.error('Error generating account code:', error);
      return `${typePrefixes[type] || '9'}000`;
    }
  }

  /**
   * Get account templates
   * @returns {Object} Account templates
   */
  getAccountTemplates() {
    return {
      startup: {
        name: 'Startup Chart of Accounts',
        accounts: [
          // Assets
          { code: '1000', name: 'Current Assets', type: 'asset', parentCode: null },
          { code: '1100', name: 'Cash and Cash Equivalents', type: 'asset', parentCode: '1000' },
          { code: '1200', name: 'Accounts Receivable', type: 'asset', parentCode: '1000' },
          { code: '1300', name: 'Prepaid Expenses', type: 'asset', parentCode: '1000' },
          
          // Liabilities
          { code: '2000', name: 'Current Liabilities', type: 'liability', parentCode: null },
          { code: '2100', name: 'Accounts Payable', type: 'liability', parentCode: '2000' },
          { code: '2200', name: 'Accrued Expenses', type: 'liability', parentCode: '2000' },
          
          // Equity
          { code: '3000', name: 'Equity', type: 'equity', parentCode: null },
          { code: '3100', name: 'Owner\'s Capital', type: 'equity', parentCode: '3000' },
          { code: '3200', name: 'Retained Earnings', type: 'equity', parentCode: '3000' },
          
          // Revenue
          { code: '4000', name: 'Revenue', type: 'revenue', parentCode: null },
          { code: '4100', name: 'Service Revenue', type: 'revenue', parentCode: '4000' },
          
          // Expenses
          { code: '5000', name: 'Operating Expenses', type: 'expense', parentCode: null },
          { code: '5100', name: 'Salaries and Wages', type: 'expense', parentCode: '5000' },
          { code: '5200', name: 'Rent and Utilities', type: 'expense', parentCode: '5000' },
          { code: '5300', name: 'Marketing', type: 'expense', parentCode: '5000' }
        ]
      },
      enterprise: {
        name: 'Enterprise Chart of Accounts',
        accounts: [
          // Assets
          { code: '1000', name: 'Assets', type: 'asset', parentCode: null },
          { code: '1100', name: 'Current Assets', type: 'asset', parentCode: '1000' },
          { code: '1110', name: 'Cash', type: 'asset', parentCode: '1100' },
          { code: '1120', name: 'Accounts Receivable', type: 'asset', parentCode: '1100' },
          { code: '1130', name: 'Inventory', type: 'asset', parentCode: '1100' },
          { code: '1200', name: 'Fixed Assets', type: 'asset', parentCode: '1000' },
          { code: '1210', name: 'Property, Plant & Equipment', type: 'asset', parentCode: '1200' },
          { code: '1220', name: 'Accumulated Depreciation', type: 'asset', parentCode: '1200' },
          
          // Liabilities
          { code: '2000', name: 'Liabilities', type: 'liability', parentCode: null },
          { code: '2100', name: 'Current Liabilities', type: 'liability', parentCode: '2000' },
          { code: '2110', name: 'Accounts Payable', type: 'liability', parentCode: '2100' },
          { code: '2120', name: 'Accrued Expenses', type: 'liability', parentCode: '2100' },
          { code: '2130', name: 'Short-term Debt', type: 'liability', parentCode: '2100' },
          { code: '2200', name: 'Long-term Liabilities', type: 'liability', parentCode: '2000' },
          { code: '2210', name: 'Long-term Debt', type: 'liability', parentCode: '2200' },
          
          // Equity
          { code: '3000', name: 'Equity', type: 'equity', parentCode: null },
          { code: '3100', name: 'Share Capital', type: 'equity', parentCode: '3000' },
          { code: '3200', name: 'Retained Earnings', type: 'equity', parentCode: '3000' },
          
          // Revenue
          { code: '4000', name: 'Revenue', type: 'revenue', parentCode: null },
          { code: '4100', name: 'Sales Revenue', type: 'revenue', parentCode: '4000' },
          { code: '4200', name: 'Service Revenue', type: 'revenue', parentCode: '4000' },
          { code: '4300', name: 'Other Income', type: 'revenue', parentCode: '4000' },
          
          // Expenses
          { code: '5000', name: 'Cost of Goods Sold', type: 'expense', parentCode: null },
          { code: '5100', name: 'Direct Materials', type: 'expense', parentCode: '5000' },
          { code: '5200', name: 'Direct Labor', type: 'expense', parentCode: '5000' },
          { code: '6000', name: 'Operating Expenses', type: 'expense', parentCode: null },
          { code: '6100', name: 'Salaries and Wages', type: 'expense', parentCode: '6000' },
          { code: '6200', name: 'Rent and Utilities', type: 'expense', parentCode: '6000' },
          { code: '6300', name: 'Marketing and Advertising', type: 'expense', parentCode: '6000' },
          { code: '6400', name: 'Professional Services', type: 'expense', parentCode: '6000' },
          { code: '6500', name: 'Depreciation', type: 'expense', parentCode: '6000' }
        ]
      },
      saas: {
        name: 'SaaS Chart of Accounts',
        accounts: [
          // Assets
          { code: '1000', name: 'Assets', type: 'asset', parentCode: null },
          { code: '1100', name: 'Current Assets', type: 'asset', parentCode: '1000' },
          { code: '1110', name: 'Cash', type: 'asset', parentCode: '1100' },
          { code: '1120', name: 'Accounts Receivable', type: 'asset', parentCode: '1100' },
          { code: '1130', name: 'Prepaid Subscriptions', type: 'asset', parentCode: '1100' },
          { code: '1200', name: 'Fixed Assets', type: 'asset', parentCode: '1000' },
          { code: '1210', name: 'Software Licenses', type: 'asset', parentCode: '1200' },
          { code: '1220', name: 'Computer Equipment', type: 'asset', parentCode: '1200' },
          
          // Liabilities
          { code: '2000', name: 'Liabilities', type: 'liability', parentCode: null },
          { code: '2100', name: 'Current Liabilities', type: 'liability', parentCode: '2000' },
          { code: '2110', name: 'Accounts Payable', type: 'liability', parentCode: '2100' },
          { code: '2120', name: 'Deferred Revenue', type: 'liability', parentCode: '2100' },
          { code: '2130', name: 'Accrued Expenses', type: 'liability', parentCode: '2100' },
          
          // Equity
          { code: '3000', name: 'Equity', type: 'equity', parentCode: null },
          { code: '3100', name: 'Share Capital', type: 'equity', parentCode: '3000' },
          { code: '3200', name: 'Retained Earnings', type: 'equity', parentCode: '3000' },
          
          // Revenue
          { code: '4000', name: 'Revenue', type: 'revenue', parentCode: null },
          { code: '4100', name: 'Subscription Revenue', type: 'revenue', parentCode: '4000' },
          { code: '4200', name: 'Professional Services Revenue', type: 'revenue', parentCode: '4000' },
          { code: '4300', name: 'Other Revenue', type: 'revenue', parentCode: '4000' },
          
          // Expenses
          { code: '5000', name: 'Cost of Revenue', type: 'expense', parentCode: null },
          { code: '5100', name: 'Hosting and Infrastructure', type: 'expense', parentCode: '5000' },
          { code: '5200', name: 'Customer Support', type: 'expense', parentCode: '5000' },
          { code: '6000', name: 'Operating Expenses', type: 'expense', parentCode: null },
          { code: '6100', name: 'Engineering', type: 'expense', parentCode: '6000' },
          { code: '6200', name: 'Sales and Marketing', type: 'expense', parentCode: '6000' },
          { code: '6300', name: 'General and Administrative', type: 'expense', parentCode: '6000' }
        ]
      },
      consulting: {
        name: 'Consulting Chart of Accounts',
        accounts: [
          // Assets
          { code: '1000', name: 'Assets', type: 'asset', parentCode: null },
          { code: '1100', name: 'Current Assets', type: 'asset', parentCode: '1000' },
          { code: '1110', name: 'Cash', type: 'asset', parentCode: '1100' },
          { code: '1120', name: 'Accounts Receivable', type: 'asset', parentCode: '1100' },
          { code: '1130', name: 'Unbilled Work in Progress', type: 'asset', parentCode: '1100' },
          
          // Liabilities
          { code: '2000', name: 'Liabilities', type: 'liability', parentCode: null },
          { code: '2100', name: 'Current Liabilities', type: 'liability', parentCode: '2000' },
          { code: '2110', name: 'Accounts Payable', type: 'liability', parentCode: '2100' },
          { code: '2120', name: 'Accrued Expenses', type: 'liability', parentCode: '2100' },
          
          // Equity
          { code: '3000', name: 'Equity', type: 'equity', parentCode: null },
          { code: '3100', name: 'Partner Capital', type: 'equity', parentCode: '3000' },
          { code: '3200', name: 'Retained Earnings', type: 'equity', parentCode: '3000' },
          
          // Revenue
          { code: '4000', name: 'Revenue', type: 'revenue', parentCode: null },
          { code: '4100', name: 'Consulting Revenue', type: 'revenue', parentCode: '4000' },
          { code: '4200', name: 'Project Revenue', type: 'revenue', parentCode: '4000' },
          { code: '4300', name: 'Retainer Revenue', type: 'revenue', parentCode: '4000' },
          
          // Expenses
          { code: '5000', name: 'Direct Costs', type: 'expense', parentCode: null },
          { code: '5100', name: 'Consultant Salaries', type: 'expense', parentCode: '5000' },
          { code: '5200', name: 'Subcontractor Costs', type: 'expense', parentCode: '5000' },
          { code: '6000', name: 'Operating Expenses', type: 'expense', parentCode: null },
          { code: '6100', name: 'Salaries and Wages', type: 'expense', parentCode: '6000' },
          { code: '6200', name: 'Rent and Utilities', type: 'expense', parentCode: '6000' },
          { code: '6300', name: 'Marketing and Business Development', type: 'expense', parentCode: '6000' },
          { code: '6400', name: 'Professional Services', type: 'expense', parentCode: '6000' },
          { code: '6500', name: 'Travel and Entertainment', type: 'expense', parentCode: '6000' }
        ]
      }
    };
  }
}

module.exports = new ChartOfAccountsService();
