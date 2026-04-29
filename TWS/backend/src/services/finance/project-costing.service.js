const { ProjectCosting, TimeEntry, Invoice, Transaction, Client } = require('../../models/finance/Finance');
const Expense = require('../../models/finance/Expense');
const projectApi = require('../module-api/project-api.service');
const financeApi = require('../module-api/finance-api.service');

class ProjectCostingService {
  /**
   * Calculate project costs
   * Uses Module API layer - no direct cross-module model access
   * @param {string} orgId - Organization ID
   * @param {string} projectId - Project ID
   * @returns {Object} Cost breakdown
   */
  async calculateProjectCosts(orgId, projectId) {
    try {
      // Get project via Module API (Projects module boundary)
      const project = await projectApi.getProjectWithClient(orgId, projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Get time entries via Module API (Finance module boundary)
      const timeEntries = await financeApi.getTimeEntriesForProject(orgId, projectId);

      // Calculate labor costs (hours × hourly rate)
      let laborCost = 0;
      let totalHours = 0;
      const laborBreakdown = [];

      timeEntries.forEach(entry => {
        const hours = entry.hours || 0;
        const rate = entry.hourlyRate || 0;
        const cost = hours * rate;
        
        laborCost += cost;
        totalHours += hours;

        laborBreakdown.push({
          employeeId: entry.employeeId?._id,
          employeeName: entry.employeeId?.fullName || 'Unknown',
          hours: hours,
          rate: rate,
          cost: cost,
          date: entry.date
        });
      });

      // Get expenses via Module API
      const expenses = await financeApi.getExpensesForProject(orgId, projectId);

      let expenseCost = 0;
      const expenseBreakdown = [];

      expenses.forEach(expense => {
        const amount = expense.amount || 0;
        expenseCost += amount;

        expenseBreakdown.push({
          expenseId: expense._id,
          description: expense.description || expense.category || 'Expense',
          category: expense.category,
          amount: amount,
          date: expense.date
        });
      });

      // Calculate total costs
      const totalCost = laborCost + expenseCost;

      // Get project budget
      const budget = project.budget?.total || project.budget || 0;

      // Compare with budget
      const variance = totalCost - budget;
      const variancePercentage = budget > 0 ? (variance / budget) * 100 : 0;

      return {
        projectId: projectId,
        projectName: project.name,
        budget: budget,
        costs: {
          labor: laborCost,
          expenses: expenseCost,
          total: totalCost
        },
        hours: {
          total: totalHours,
          billable: timeEntries.filter(e => e.billable).reduce((sum, e) => sum + (e.hours || 0), 0),
          nonBillable: timeEntries.filter(e => !e.billable).reduce((sum, e) => sum + (e.hours || 0), 0)
        },
        breakdown: {
          labor: laborBreakdown,
          expenses: expenseBreakdown
        },
        variance: {
          amount: variance,
          percentage: variancePercentage,
          status: variance > 0 ? 'over_budget' : variance < 0 ? 'under_budget' : 'on_budget'
        },
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error calculating project costs:', error);
      throw error;
    }
  }

  /**
   * Get project profitability
   * @param {string} orgId - Organization ID
   * @param {string} projectId - Project ID
   * @returns {Object} Profitability metrics
   */
  async getProjectProfitability(orgId, projectId) {
    try {
      // Get project costs
      const costData = await this.calculateProjectCosts(orgId, projectId);

      // Get project revenue (invoices paid)
      const invoices = await Invoice.find({
        orgId: orgId,
        projectId: projectId,
        status: { $in: ['paid', 'partial'] }
      });

      let totalRevenue = 0;
      const revenueBreakdown = [];

      invoices.forEach(invoice => {
        const paidAmount = invoice.paidAmount || invoice.total || 0;
        totalRevenue += paidAmount;

        revenueBreakdown.push({
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          amount: paidAmount,
          date: invoice.paidAt || invoice.issueDate
        });
      });

      // Calculate profitability metrics
      const totalCost = costData.costs.total;
      const grossProfit = totalRevenue - totalCost;
      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const netMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const roi = totalCost > 0 ? ((grossProfit / totalCost) * 100) : 0;

      return {
        projectId: projectId,
        projectName: costData.projectName,
        revenue: {
          total: totalRevenue,
          breakdown: revenueBreakdown
        },
        costs: costData.costs,
        profitability: {
          grossProfit: grossProfit,
          grossMargin: grossMargin,
          netMargin: netMargin,
          roi: roi
        },
        hours: costData.hours,
        status: grossProfit > 0 ? 'profitable' : grossProfit < 0 ? 'loss' : 'break_even',
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error calculating project profitability:', error);
      throw error;
    }
  }

  /**
   * Budget vs actual analysis
   * @param {string} orgId - Organization ID
   * @param {string} projectId - Project ID
   * @returns {Object} Budget vs actual analysis
   */
  async getBudgetVsActual(orgId, projectId) {
    try {
      const project = await Project.findOne({ _id: projectId, orgId: orgId });
      if (!project) {
        throw new Error('Project not found');
      }

      const costData = await this.calculateProjectCosts(orgId, projectId);

      const budget = {
        total: project.budget?.total || project.budget || 0,
        labor: project.budget?.labor || 0,
        materials: project.budget?.materials || 0,
        overhead: project.budget?.overhead || 0
      };

      const actual = {
        total: costData.costs.total,
        labor: costData.costs.labor,
        expenses: costData.costs.expenses
      };

      const variance = {
        total: actual.total - budget.total,
        labor: actual.labor - budget.labor,
        expenses: actual.expenses - (budget.materials + budget.overhead)
      };

      const variancePercentage = {
        total: budget.total > 0 ? (variance.total / budget.total) * 100 : 0,
        labor: budget.labor > 0 ? (variance.labor / budget.labor) * 100 : 0,
        expenses: (budget.materials + budget.overhead) > 0 
          ? (variance.expenses / (budget.materials + budget.overhead)) * 100 
          : 0
      };

      return {
        projectId: projectId,
        projectName: project.name,
        budget: budget,
        actual: actual,
        variance: variance,
        variancePercentage: variancePercentage,
        status: {
          total: variance.total > 0 ? 'over_budget' : variance.total < 0 ? 'under_budget' : 'on_budget',
          labor: variance.labor > 0 ? 'over_budget' : variance.labor < 0 ? 'under_budget' : 'on_budget',
          expenses: variance.expenses > 0 ? 'over_budget' : variance.expenses < 0 ? 'under_budget' : 'on_budget'
        },
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting budget vs actual:', error);
      throw error;
    }
  }

  /**
   * Forecast project costs
   * @param {string} orgId - Organization ID
   * @param {string} projectId - Project ID
   * @returns {Object} Cost forecast
   */
  async forecastProjectCosts(orgId, projectId) {
    try {
      const project = await Project.findOne({ _id: projectId, orgId: orgId });
      if (!project) {
        throw new Error('Project not found');
      }

      // Get current cost data
      const costData = await this.calculateProjectCosts(orgId, projectId);

      // Analyze current burn rate
      const projectStartDate = project.startDate || project.createdAt;
      const daysElapsed = Math.max(1, Math.floor((new Date() - new Date(projectStartDate)) / (1000 * 60 * 60 * 24)));
      const dailyBurnRate = costData.costs.total / daysElapsed;

      // Calculate remaining work (if project has end date)
      let daysRemaining = 0;
      if (project.endDate) {
        const totalDays = Math.max(1, Math.floor((new Date(project.endDate) - new Date(projectStartDate)) / (1000 * 60 * 60 * 24)));
        daysRemaining = totalDays - daysElapsed;
      } else {
        // Estimate based on budget
        const budget = project.budget?.total || project.budget || 0;
        if (budget > 0 && dailyBurnRate > 0) {
          daysRemaining = Math.ceil((budget - costData.costs.total) / dailyBurnRate);
        }
      }

      // Forecast completion costs
      const forecastCost = dailyBurnRate * daysRemaining;
      const totalForecastCost = costData.costs.total + forecastCost;

      // Get project budget
      const budget = project.budget?.total || project.budget || 0;
      const forecastVariance = totalForecastCost - budget;

      return {
        projectId: projectId,
        projectName: project.name,
        current: {
          costs: costData.costs.total,
          daysElapsed: daysElapsed,
          dailyBurnRate: dailyBurnRate
        },
        forecast: {
          daysRemaining: daysRemaining,
          forecastCost: forecastCost,
          totalForecastCost: totalForecastCost
        },
        budget: budget,
        variance: {
          current: costData.costs.total - budget,
          forecast: forecastVariance
        },
        status: forecastVariance > 0 ? 'over_budget_forecast' : forecastVariance < 0 ? 'under_budget_forecast' : 'on_budget_forecast',
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error forecasting project costs:', error);
      throw error;
    }
  }

  /**
   * Resource cost allocation
   * @param {string} orgId - Organization ID
   * @param {string} projectId - Project ID
   * @returns {Object} Resource allocation breakdown
   */
  async getResourceCostAllocation(orgId, projectId) {
    try {
      // Get time entries for project
      const timeEntries = await TimeEntry.find({
        orgId: orgId,
        projectId: projectId
      }).populate('employeeId', 'fullName email');

      // Calculate cost per resource
      const resourceAllocation = {};
      
      timeEntries.forEach(entry => {
        const employeeId = entry.employeeId?._id?.toString() || 'unknown';
        const employeeName = entry.employeeId?.fullName || 'Unknown';
        
        if (!resourceAllocation[employeeId]) {
          resourceAllocation[employeeId] = {
            employeeId: employeeId,
            employeeName: employeeName,
            hours: 0,
            billableHours: 0,
            nonBillableHours: 0,
            cost: 0,
            rate: entry.hourlyRate || 0
          };
        }

        const hours = entry.hours || 0;
        const rate = entry.hourlyRate || resourceAllocation[employeeId].rate || 0;
        const cost = hours * rate;

        resourceAllocation[employeeId].hours += hours;
        resourceAllocation[employeeId].cost += cost;
        
        if (entry.billable) {
          resourceAllocation[employeeId].billableHours += hours;
        } else {
          resourceAllocation[employeeId].nonBillableHours += hours;
        }

        // Update rate if different (use average)
        if (entry.hourlyRate && entry.hourlyRate !== resourceAllocation[employeeId].rate) {
          resourceAllocation[employeeId].rate = (resourceAllocation[employeeId].rate + entry.hourlyRate) / 2;
        }
      });

      // Convert to array and calculate totals
      const allocationArray = Object.values(resourceAllocation);
      const totals = {
        hours: allocationArray.reduce((sum, r) => sum + r.hours, 0),
        billableHours: allocationArray.reduce((sum, r) => sum + r.billableHours, 0),
        nonBillableHours: allocationArray.reduce((sum, r) => sum + r.nonBillableHours, 0),
        cost: allocationArray.reduce((sum, r) => sum + r.cost, 0)
      };

      return {
        projectId: projectId,
        resources: allocationArray,
        totals: totals,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting resource cost allocation:', error);
      throw error;
    }
  }
}

module.exports = new ProjectCostingService();
