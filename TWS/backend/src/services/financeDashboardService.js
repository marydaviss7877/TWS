const { 
  Transaction,
  Invoice,
  Bill,
  ProjectCosting,
  TimeEntry,
  CashFlowForecast,
  FinancialKPI,
  ChartOfAccounts,
  JournalEntry,
  Vendor,
  Client
} = require('../models/Finance');
const Project = require('../models/Project');

/**
 * Finance Dashboard Service
 * Aggregates financial data for the Master Finance Dashboard
 */
class FinanceDashboardService {
  /**
   * Get date range based on period
   */
  static getDateRange(period) {
    const now = new Date();
    let start, end;

    switch (period) {
      case 'week':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        end = now;
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    return { start, end };
  }

  /**
   * Calculate comprehensive KPIs with role-based filtering
   */
  static async calculateKPIs(orgId, period = 'month', userRole = 'employee') {
    const { start, end } = this.getDateRange(period);
    const yearAgo = new Date(start.getFullYear() - 1, start.getMonth(), start.getDate());
    const yearAgoEnd = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());

    // Revenue calculations
    const revenueData = await Transaction.aggregate([
      {
        $match: {
          type: 'revenue',
          date: { $gte: start, $lte: end },
          orgId: orgId
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const revenueYTD = await Transaction.aggregate([
      {
        $match: {
          type: 'revenue',
          date: { $gte: new Date(start.getFullYear(), 0, 1), $lte: end },
          orgId: orgId
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const revenueYoY = await Transaction.aggregate([
      {
        $match: {
          type: 'revenue',
          date: { $gte: yearAgo, $lte: yearAgoEnd },
          orgId: orgId
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Expense calculations
    const expenseData = await Transaction.aggregate([
      {
        $match: {
          type: 'expense',
          date: { $gte: start, $lte: end },
          orgId: orgId
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const expenseYTD = await Transaction.aggregate([
      {
        $match: {
          type: 'expense',
          date: { $gte: new Date(start.getFullYear(), 0, 1), $lte: end },
          orgId: orgId
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const expenseYoY = await Transaction.aggregate([
      {
        $match: {
          type: 'expense',
          date: { $gte: yearAgo, $lte: yearAgoEnd },
          orgId: orgId
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const totalRevenue = revenueData[0]?.total || 0;
    const totalRevenueYTD = revenueYTD[0]?.total || 0;
    const totalRevenueYoY = revenueYoY[0]?.total || 0;
    const totalExpenses = expenseData[0]?.total || 0;
    const totalExpensesYTD = expenseYTD[0]?.total || 0;
    const totalExpensesYoY = expenseYoY[0]?.total || 0;

    const netProfit = totalRevenue - totalExpenses;
    const netProfitYTD = totalRevenueYTD - totalExpensesYTD;
    const netProfitYoY = totalRevenueYoY - totalExpensesYoY;

    // Calculate margins
    const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
    const operatingMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const ebitda = netProfit; // Simplified - can be enhanced

    // Accounts Receivable
    const arData = await Invoice.aggregate([
      {
        $match: {
          status: { $in: ['sent', 'overdue'] },
          orgId: orgId
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      }
    ]);

    const overdueInvoices = await Invoice.countDocuments({
      status: 'overdue',
      orgId: orgId
    });

    // Accounts Payable
    const apData = await Bill.aggregate([
      {
        $match: {
          status: { $in: ['pending_approval', 'approved', 'overdue'] },
          orgId: orgId
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      }
    ]);

    const pendingBills = await Bill.countDocuments({
      status: { $in: ['pending_approval', 'approved'] },
      orgId: orgId
    });

    // Cash on Hand (derived from net transactions — no bank accounts)
    const cashOnHand = 0;

    // Working Capital
    const workingCapital = (arData[0]?.total || 0) - (apData[0]?.total || 0);
    const currentRatio = (apData[0]?.total || 0) > 0 ? (arData[0]?.total || 0) / (apData[0]?.total || 0) : 0;
    const quickRatio = currentRatio; // Simplified

    // Active Projects
    let activeProjects = 0;
    if (Project) {
      activeProjects = await Project.countDocuments({
        orgId: orgId,
        status: { $in: ['active', 'in_progress'] }
      });
    }

    // Budget Variance (simplified - would need budget data)
    const budgetVariance = 0; // Placeholder
    const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;

    // Revenue per Employee (simplified)
    let employeeCount = 1;
    if (User) {
      employeeCount = await User.countDocuments({
        orgId: orgId,
        status: 'active'
      }) || 1;
    }
    const revenuePerEmployee = totalRevenue / employeeCount;

    // Cost per Project
    let projectCount = 1;
    if (Project) {
      projectCount = await Project.countDocuments({ orgId: orgId }) || 1;
    }
    const costPerProject = totalExpenses / projectCount;

    // Calculate YoY growth percentages
    const revenueYoYGrowth = totalRevenueYoY > 0 
      ? ((totalRevenue - totalRevenueYoY) / totalRevenueYoY) * 100 
      : 0;
    const profitYoYGrowth = netProfitYoY !== 0 
      ? ((netProfit - netProfitYoY) / Math.abs(netProfitYoY)) * 100 
      : 0;

    // Role-based data filtering
    const isFinanceAdmin = ['owner', 'admin', 'finance_manager'].includes(userRole);
    const isFinanceManager = ['finance_manager', 'admin', 'owner'].includes(userRole);
    const isExecutive = ['owner', 'admin'].includes(userRole);

    // Base KPIs available to all
    const baseKPIs = {
      totalRevenue,
      totalRevenueMTD: totalRevenue,
      totalRevenueYTD,
      totalRevenueYoY: revenueYoYGrowth,
      netProfit,
      netProfitMTD: netProfit,
      netProfitYTD,
      netProfitYoY: profitYoYGrowth,
      grossMargin: Math.round(grossMargin * 10) / 10,
      cashOnHand,
      accountsReceivable: arData[0]?.total || 0,
      accountsPayable: apData[0]?.total || 0,
      activeProjects,
      outstandingInvoices: arData[0]?.count || 0,
      overdueInvoices,
      pendingBills
    };

    // Extended KPIs for managers and admins
    if (isFinanceManager || isFinanceAdmin) {
      return {
        ...baseKPIs,
        operatingMargin: Math.round(operatingMargin * 10) / 10,
        ebitda,
        workingCapital,
        currentRatio: Math.round(currentRatio * 10) / 10,
        quickRatio: Math.round(quickRatio * 10) / 10,
        debtToEquity: 0, // Placeholder
        pendingPayments: pendingBills,
        budgetVariance,
        expenseRatio: Math.round(expenseRatio * 10) / 10,
        revenuePerEmployee: Math.round(revenuePerEmployee),
        costPerProject: Math.round(costPerProject)
      };
    }

    // Executive view - high-level metrics only
    if (isExecutive) {
      return {
        ...baseKPIs,
        operatingMargin: Math.round(operatingMargin * 10) / 10,
        ebitda,
        workingCapital
      };
    }

    // Standard employee view
    return baseKPIs;
  }

  /**
   * Get revenue trends
   */
  static async getRevenueTrends(orgId, period = 'month') {
    const { start, end } = this.getDateRange(period);
    const months = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

      const revenue = await Transaction.aggregate([
        {
          $match: {
            type: 'revenue',
            date: { $gte: monthStart, $lte: monthEnd },
            orgId: orgId
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      months.push({
        month: currentDate.toLocaleString('default', { month: 'short' }),
        amount: revenue[0]?.total || 0,
        target: revenue[0]?.total * 1.1 || 0 // 10% above actual as target
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return months;
  }

  /**
   * Get expense trends
   */
  static async getExpenseTrends(orgId, period = 'month') {
    const { start, end } = this.getDateRange(period);
    const months = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

      const expenses = await Transaction.aggregate([
        {
          $match: {
            type: 'expense',
            date: { $gte: monthStart, $lte: monthEnd },
            orgId: orgId
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      months.push({
        month: currentDate.toLocaleString('default', { month: 'short' }),
        amount: expenses[0]?.total || 0,
        category: 'Operations'
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return months;
  }

  /**
   * Get cash flow data
   */
  static async getCashFlow(orgId, period = 'month') {
    const { start, end } = this.getDateRange(period);
    const months = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

      const inflow = await Transaction.aggregate([
        {
          $match: {
            type: 'revenue',
            date: { $gte: monthStart, $lte: monthEnd },
            orgId: orgId
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const outflow = await Transaction.aggregate([
        {
          $match: {
            type: 'expense',
            date: { $gte: monthStart, $lte: monthEnd },
            orgId: orgId
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const inflowAmount = inflow[0]?.total || 0;
      const outflowAmount = outflow[0]?.total || 0;

      months.push({
        month: currentDate.toLocaleString('default', { month: 'short' }),
        inflow: inflowAmount,
        outflow: outflowAmount,
        net: inflowAmount - outflowAmount
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return months;
  }

  /**
   * Get accounts aging
   */
  static async getAccountsAging(orgId) {
    const now = new Date();
    const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const days60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const days90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Receivables aging
    const receivablesCurrent = await Invoice.aggregate([
      {
        $match: {
          orgId: orgId,
          status: { $in: ['sent', 'overdue'] },
          dueDate: { $gte: now }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    const receivables30 = await Invoice.aggregate([
      {
        $match: {
          orgId: orgId,
          status: { $in: ['sent', 'overdue'] },
          dueDate: { $gte: days30, $lt: now }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    const receivables60 = await Invoice.aggregate([
      {
        $match: {
          orgId: orgId,
          status: { $in: ['sent', 'overdue'] },
          dueDate: { $gte: days60, $lt: days30 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    const receivables90 = await Invoice.aggregate([
      {
        $match: {
          orgId: orgId,
          status: { $in: ['sent', 'overdue'] },
          dueDate: { $gte: days90, $lt: days60 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    const receivablesOver90 = await Invoice.aggregate([
      {
        $match: {
          orgId: orgId,
          status: { $in: ['sent', 'overdue'] },
          dueDate: { $lt: days90 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    // Payables aging
    const payablesCurrent = await Bill.aggregate([
      {
        $match: {
          orgId: orgId,
          status: { $in: ['pending_approval', 'approved', 'overdue'] },
          dueDate: { $gte: now }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    const payables30 = await Bill.aggregate([
      {
        $match: {
          orgId: orgId,
          status: { $in: ['pending_approval', 'approved', 'overdue'] },
          dueDate: { $gte: days30, $lt: now }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    const payables60 = await Bill.aggregate([
      {
        $match: {
          orgId: orgId,
          status: { $in: ['pending_approval', 'approved', 'overdue'] },
          dueDate: { $gte: days60, $lt: days30 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    const payables90 = await Bill.aggregate([
      {
        $match: {
          orgId: orgId,
          status: { $in: ['pending_approval', 'approved', 'overdue'] },
          dueDate: { $gte: days90, $lt: days60 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    const payablesOver90 = await Bill.aggregate([
      {
        $match: {
          orgId: orgId,
          status: { $in: ['pending_approval', 'approved', 'overdue'] },
          dueDate: { $lt: days90 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    return {
      receivables: {
        current: receivablesCurrent[0]?.total || 0,
        days30: receivables30[0]?.total || 0,
        days60: receivables60[0]?.total || 0,
        days90: receivables90[0]?.total || 0,
        over90: receivablesOver90[0]?.total || 0
      },
      payables: {
        current: payablesCurrent[0]?.total || 0,
        days30: payables30[0]?.total || 0,
        days60: payables60[0]?.total || 0,
        days90: payables90[0]?.total || 0,
        over90: payablesOver90[0]?.total || 0
      }
    };
  }

  /**
   * Get project profitability
   */
  static async getProjectProfitability(orgId) {
    if (!Project) {
      return [];
    }

    const projects = await Project.find({
      orgId: orgId,
      status: { $in: ['active', 'in_progress', 'completed'] }
    }).limit(10);

    const profitability = await Promise.all(projects.map(async (project) => {
      const costing = await ProjectCosting.findOne({
        projectId: project._id,
        orgId: orgId
      });

      const revenue = costing?.budget?.totalRevenue || 0;
      const cost = costing?.actualCosts?.total || 0;
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        id: project._id,
        name: project.name,
        revenue,
        cost,
        profit,
        margin: Math.round(margin * 10) / 10
      };
    }));

    return profitability;
  }

  /**
   * Get budget vs actual
   */
  static async getBudgetVsActual(orgId, period = 'month') {
    const { start, end } = this.getDateRange(period);

    const revenue = await Transaction.aggregate([
      {
        $match: {
          type: 'revenue',
          date: { $gte: start, $lte: end },
          orgId: orgId
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const expenses = await Transaction.aggregate([
      {
        $match: {
          type: 'expense',
          date: { $gte: start, $lte: end },
          orgId: orgId
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const actualRevenue = revenue[0]?.total || 0;
    const actualExpenses = expenses[0]?.total || 0;
    const actualProfit = actualRevenue - actualExpenses;

    // Budget values (placeholder - would come from budget system)
    const budgetRevenue = actualRevenue * 1.1; // 10% above actual
    const budgetExpenses = actualExpenses * 0.95; // 5% below actual
    const budgetProfit = budgetRevenue - budgetExpenses;

    return [
      {
        category: 'Revenue',
        budget: budgetRevenue,
        actual: actualRevenue,
        variance: actualRevenue - budgetRevenue
      },
      {
        category: 'Expenses',
        budget: budgetExpenses,
        actual: actualExpenses,
        variance: actualExpenses - budgetExpenses
      },
      {
        category: 'Profit',
        budget: budgetProfit,
        actual: actualProfit,
        variance: actualProfit - budgetProfit
      }
    ];
  }

  /**
   * Get financial alerts
   */
  static async getFinancialAlerts(orgId) {
    const alerts = [];

    // Check for overdue invoices
    const overdueCount = await Invoice.countDocuments({
      orgId: orgId,
      status: 'overdue'
    });

    if (overdueCount > 0) {
      alerts.push({
        id: 1,
        type: 'warning',
        message: `${overdueCount} invoice${overdueCount > 1 ? 's' : ''} overdue`,
        severity: overdueCount > 5 ? 'high' : 'medium'
      });
    }

    // Check cash flow
    const totalCash = 0;
    const monthlyExpenses = await Transaction.aggregate([
      {
        $match: {
          type: 'expense',
          date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          orgId: orgId
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const monthlyExpenseTotal = monthlyExpenses[0]?.total || 0;
    if (totalCash < monthlyExpenseTotal * 2) {
      alerts.push({
        id: 2,
        type: 'error',
        message: 'Cash flow below threshold',
        severity: 'high'
      });
    }

    // Check budget variance
    const budgetVariance = 0; // Placeholder
    if (Math.abs(budgetVariance) > 5) {
      alerts.push({
        id: 3,
        type: 'info',
        message: `Budget variance: ${budgetVariance > 0 ? '+' : ''}${budgetVariance.toFixed(1)}%`,
        severity: 'low'
      });
    }

    return alerts;
  }
}

module.exports = FinanceDashboardService;

