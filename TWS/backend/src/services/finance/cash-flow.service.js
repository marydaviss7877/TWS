const { CashFlowForecast, Invoice, Bill, Transaction } = require('../../models/finance/Finance');

class CashFlowService {
  /**
   * Generate cash flow forecast
   * @param {string} orgId - Organization ID
   * @param {number} months - Number of months to forecast (default 12)
   * @returns {Object} Cash flow forecast
   */
  async generateForecast(orgId, months = 12) {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);

      // Get expected revenue (invoices due)
      const invoices = await Invoice.find({
        orgId: orgId,
        status: { $in: ['sent', 'partial'] },
        dueDate: { $gte: startDate, $lte: endDate }
      }).sort({ dueDate: 1 });

      // Get expected expenses (bills due, payroll)
      const bills = await Bill.find({
        orgId: orgId,
        status: { $in: ['pending', 'approved', 'partial'] },
        dueDate: { $gte: startDate, $lte: endDate }
      }).sort({ dueDate: 1 });

      // Group by month
      const monthlyData = {};
      
      for (let i = 0; i < months; i++) {
        const monthDate = new Date(startDate);
        monthDate.setMonth(monthDate.getMonth() + i);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        
        monthlyData[monthKey] = {
          month: monthKey,
          date: monthDate,
          revenue: 0,
          expenses: 0,
          netCashFlow: 0,
          openingBalance: i === 0 ? await this.getCurrentCashBalance(orgId) : 0,
          closingBalance: 0,
          details: {
            invoices: [],
            bills: []
          }
        };
      }

      // Add invoice revenue
      invoices.forEach(invoice => {
        const monthKey = this.getMonthKey(invoice.dueDate);
        if (monthlyData[monthKey]) {
          const outstandingAmount = invoice.total - (invoice.paidAmount || 0);
          monthlyData[monthKey].revenue += outstandingAmount;
          monthlyData[monthKey].details.invoices.push({
            invoiceId: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            amount: outstandingAmount,
            dueDate: invoice.dueDate
          });
        }
      });

      // Add bill expenses
      bills.forEach(bill => {
        const monthKey = this.getMonthKey(bill.dueDate);
        if (monthlyData[monthKey]) {
          const outstandingAmount = bill.total - (bill.paidAmount || 0);
          monthlyData[monthKey].expenses += outstandingAmount;
          monthlyData[monthKey].details.bills.push({
            billId: bill._id,
            billNumber: bill.billNumber,
            amount: outstandingAmount,
            dueDate: bill.dueDate
          });
        }
      });

      // Calculate net cash flow and balances
      let runningBalance = monthlyData[Object.keys(monthlyData)[0]].openingBalance;
      
      Object.keys(monthlyData).sort().forEach(monthKey => {
        const month = monthlyData[monthKey];
        month.netCashFlow = month.revenue - month.expenses;
        month.openingBalance = runningBalance;
        month.closingBalance = runningBalance + month.netCashFlow;
        runningBalance = month.closingBalance;
      });

      return {
        orgId: orgId,
        forecastPeriod: {
          startDate: startDate,
          endDate: endDate,
          months: months
        },
        monthlyData: Object.values(monthlyData),
        summary: {
          totalRevenue: Object.values(monthlyData).reduce((sum, m) => sum + m.revenue, 0),
          totalExpenses: Object.values(monthlyData).reduce((sum, m) => sum + m.expenses, 0),
          netCashFlow: Object.values(monthlyData).reduce((sum, m) => sum + m.netCashFlow, 0),
          averageMonthlyCashFlow: Object.values(monthlyData).reduce((sum, m) => sum + m.netCashFlow, 0) / months,
          lowestBalance: Math.min(...Object.values(monthlyData).map(m => m.closingBalance)),
          highestBalance: Math.max(...Object.values(monthlyData).map(m => m.closingBalance))
        },
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating cash flow forecast:', error);
      throw error;
    }
  }

  /**
   * Get cash flow statement
   * @param {string} orgId - Organization ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Cash flow statement
   */
  async getCashFlowStatement(orgId, startDate, endDate) {
    try {
      // Operating activities (revenue - expenses)
      const operatingActivities = await this.getOperatingActivities(orgId, startDate, endDate);

      // Investing activities
      const investingActivities = await this.getInvestingActivities(orgId, startDate, endDate);

      // Financing activities
      const financingActivities = await this.getFinancingActivities(orgId, startDate, endDate);

      const netCashFlow = 
        operatingActivities.netCashFlow +
        investingActivities.netCashFlow +
        financingActivities.netCashFlow;

      return {
        orgId: orgId,
        period: {
          startDate: startDate,
          endDate: endDate
        },
        operatingActivities: operatingActivities,
        investingActivities: investingActivities,
        financingActivities: financingActivities,
        netCashFlow: netCashFlow,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error getting cash flow statement:', error);
      throw error;
    }
  }

  /**
   * Get operating activities
   * @param {string} orgId - Organization ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Operating activities
   */
  async getOperatingActivities(orgId, startDate, endDate) {
    // Revenue from invoices paid
    const paidInvoices = await Invoice.find({
      orgId: orgId,
      status: 'paid',
      paidAt: { $gte: startDate, $lte: endDate }
    });

    const revenue = paidInvoices.reduce((sum, inv) => sum + (inv.paidAmount || inv.total), 0);

    // Expenses from bills paid
    const paidBills = await Bill.find({
      orgId: orgId,
      status: 'paid',
      paidAt: { $gte: startDate, $lte: endDate }
    });

    const expenses = paidBills.reduce((sum, bill) => sum + (bill.paidAmount || bill.total), 0);

    // Other operating transactions
    const operatingTransactions = await Transaction.find({
      orgId: orgId,
      type: { $in: ['expense', 'revenue'] },
      date: { $gte: startDate, $lte: endDate }
    });

    const otherRevenue = operatingTransactions
      .filter(tx => tx.type === 'revenue')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const otherExpenses = operatingTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      revenue: revenue + otherRevenue,
      expenses: expenses + otherExpenses,
      netCashFlow: (revenue + otherRevenue) - (expenses + otherExpenses),
      details: {
        invoicePayments: revenue,
        billPayments: expenses,
        otherRevenue: otherRevenue,
        otherExpenses: otherExpenses
      }
    };
  }

  /**
   * Get investing activities
   * @param {string} orgId - Organization ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Investing activities
   */
  async getInvestingActivities(orgId, startDate, endDate) {
    const investingTransactions = await Transaction.find({
      orgId: orgId,
      type: 'investment',
      date: { $gte: startDate, $lte: endDate }
    });

    const purchases = investingTransactions
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const sales = investingTransactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      purchases: purchases,
      sales: sales,
      netCashFlow: sales - purchases,
      details: {
        transactions: investingTransactions
      }
    };
  }

  /**
   * Get financing activities
   * @param {string} orgId - Organization ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Financing activities
   */
  async getFinancingActivities(orgId, startDate, endDate) {
    const financingTransactions = await Transaction.find({
      orgId: orgId,
      type: { $in: ['loan', 'transfer'] },
      date: { $gte: startDate, $lte: endDate }
    });

    const borrowings = financingTransactions
      .filter(tx => tx.type === 'loan' && tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const repayments = financingTransactions
      .filter(tx => tx.type === 'loan' && tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return {
      borrowings: borrowings,
      repayments: repayments,
      netCashFlow: borrowings - repayments,
      details: {
        transactions: financingTransactions
      }
    };
  }

  /**
   * Get current cash balance
   * @param {string} orgId - Organization ID
   * @returns {number} Current cash balance
   */
  async getCurrentCashBalance(orgId) {
    try {
      // Get cash account balance from chart of accounts
      const { ChartOfAccounts, JournalEntry } = require('../../models/finance/Finance');
      
      const cashAccount = await ChartOfAccounts.findOne({
        orgId: orgId,
        type: 'asset',
        code: { $regex: /^1/ },
        name: { $regex: /cash/i }
      });

      if (!cashAccount) return 0;

      // Calculate balance from journal entries
      const journalEntries = await JournalEntry.find({
        orgId: orgId,
        'entries.accountId': cashAccount._id,
        status: 'posted'
      });

      let balance = 0;
      journalEntries.forEach(entry => {
        entry.entries.forEach(lineItem => {
          if (lineItem.accountId.toString() === cashAccount._id.toString()) {
            balance += (lineItem.debit || 0) - (lineItem.credit || 0);
          }
        });
      });

      return balance;
    } catch (error) {
      console.error('Error getting current cash balance:', error);
      return 0;
    }
  }

  /**
   * Get month key from date
   * @param {Date} date - Date
   * @returns {string} Month key (YYYY-MM)
   */
  getMonthKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}

module.exports = new CashFlowService();
