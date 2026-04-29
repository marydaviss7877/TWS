const Project = require('../models/project-delivery/Project');
const Attendance = require('../models/hr-payroll/Attendance');
const Employee = require('../models/hr-payroll/Employee');
// const ProjectInvoice = require('../models/ProjectInvoice'); // Model not yet implemented

class ProjectProfitabilityService {
  /**
   * Calculate real-time project profitability
   * @param {string} projectId - Project ID
   * @returns {Object} Profitability data
   */
  async calculateProjectProfitability(projectId) {
    try {
      const project = await Project.findById(projectId)
        .populate('clientId', 'name email')
        .populate('orgId', 'name');

      if (!project) {
        throw new Error('Project not found');
      }

      // Get all attendance records for this project
      const attendanceRecords = await Attendance.find({
        'costAllocation.projectId': projectId,
        status: 'present'
      }).populate('userId', 'fullName email');

      // Calculate actual costs from attendance
      const costData = await this.calculateActualCosts(attendanceRecords);
      
      // Get actual revenue from invoices
      const revenueData = await this.calculateActualRevenue(projectId);
      
      // Calculate profitability metrics
      const profitability = {
        budgetedRevenue: project.budget.total || 0,
        actualRevenue: revenueData.total,
        budgetedCost: project.budget.spent || 0,
        actualCost: costData.total,
        margin: revenueData.total - costData.total,
        marginPercentage: revenueData.total > 0 ? 
          ((revenueData.total - costData.total) / revenueData.total) * 100 : 0,
        hourlyRate: revenueData.total / Math.max(costData.billableHours, 1),
        billableHours: costData.billableHours,
        nonBillableHours: costData.nonBillableHours,
        lastCalculated: new Date()
      };

      // Update project with calculated profitability
      await Project.findByIdAndUpdate(projectId, {
        profitability,
        'metrics.profitMargin': profitability.marginPercentage
      });

      return {
        project: {
          id: project._id,
          name: project.name,
          client: project.clientId?.name,
          status: project.status
        },
        profitability,
        costBreakdown: costData.breakdown,
        revenueBreakdown: revenueData.breakdown,
        alerts: this.generateProfitabilityAlerts(profitability, project)
      };

    } catch (error) {
      console.error('Error calculating project profitability:', error);
      throw error;
    }
  }

  /**
   * Calculate actual costs from attendance records
   * @param {Array} attendanceRecords - Attendance records
   * @returns {Object} Cost data
   */
  async calculateActualCosts(attendanceRecords) {
    let totalCost = 0;
    let billableHours = 0;
    let nonBillableHours = 0;
    const breakdown = {
      byEmployee: {},
      byTaskType: {},
      byDate: {}
    };

    for (const record of attendanceRecords) {
      const hours = record.durationMinutes / 60;
      const hourlyRate = record.costAllocation.hourlyRate || 0;
      const overheadRate = record.costAllocation.overheadRate || 0.3;
      const cost = hours * hourlyRate * (1 + overheadRate);

      totalCost += cost;

      if (record.costAllocation.isBillable) {
        billableHours += hours;
      } else {
        nonBillableHours += hours;
      }

      // Breakdown by employee
      const employeeId = record.userId._id.toString();
      if (!breakdown.byEmployee[employeeId]) {
        breakdown.byEmployee[employeeId] = {
          name: record.userId.fullName,
          hours: 0,
          cost: 0
        };
      }
      breakdown.byEmployee[employeeId].hours += hours;
      breakdown.byEmployee[employeeId].cost += cost;

      // Breakdown by task type
      const taskType = record.costAllocation.taskType || 'development';
      if (!breakdown.byTaskType[taskType]) {
        breakdown.byTaskType[taskType] = { hours: 0, cost: 0 };
      }
      breakdown.byTaskType[taskType].hours += hours;
      breakdown.byTaskType[taskType].cost += cost;

      // Breakdown by date
      const date = record.date.toISOString().split('T')[0];
      if (!breakdown.byDate[date]) {
        breakdown.byDate[date] = { hours: 0, cost: 0 };
      }
      breakdown.byDate[date].hours += hours;
      breakdown.byDate[date].cost += cost;
    }

    return {
      total: totalCost,
      billableHours,
      nonBillableHours,
      breakdown
    };
  }

  /**
   * Calculate actual revenue from invoices
   * @param {string} projectId - Project ID
   * @returns {Object} Revenue data
   */
  async calculateActualRevenue(projectId) {
    try {
      const invoices = await ProjectInvoice.find({
        projectId,
        status: { $in: ['paid', 'sent'] }
      });

      let totalRevenue = 0;
      const breakdown = {
        byInvoice: {},
        byMonth: {}
      };

      for (const invoice of invoices) {
        totalRevenue += invoice.total || 0;
        
        breakdown.byInvoice[invoice._id] = {
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.total,
          status: invoice.status,
          date: invoice.createdAt
        };

        const month = invoice.createdAt.toISOString().substring(0, 7);
        if (!breakdown.byMonth[month]) {
          breakdown.byMonth[month] = 0;
        }
        breakdown.byMonth[month] += invoice.total || 0;
      }

      return {
        total: totalRevenue,
        breakdown
      };

    } catch (error) {
      console.error('Error calculating revenue:', error);
      return { total: 0, breakdown: {} };
    }
  }

  /**
   * Generate profitability alerts
   * @param {Object} profitability - Profitability data
   * @param {Object} project - Project data
   * @returns {Array} Array of alerts
   */
  generateProfitabilityAlerts(profitability, project) {
    const alerts = [];

    // Budget overrun alert
    if (profitability.actualCost > project.budget.total) {
      alerts.push({
        type: 'budget_overrun',
        severity: 'high',
        message: `Project has exceeded budget by $${(profitability.actualCost - project.budget.total).toFixed(2)}`,
        value: profitability.actualCost - project.budget.total
      });
    }

    // Low margin alert
    if (profitability.marginPercentage < 10) {
      alerts.push({
        type: 'low_margin',
        severity: profitability.marginPercentage < 0 ? 'critical' : 'medium',
        message: `Project margin is ${profitability.marginPercentage.toFixed(1)}%`,
        value: profitability.marginPercentage
      });
    }

    // High non-billable hours alert
    const totalHours = profitability.billableHours + profitability.nonBillableHours;
    if (totalHours > 0 && (profitability.nonBillableHours / totalHours) > 0.3) {
      alerts.push({
        type: 'high_nonbillable',
        severity: 'medium',
        message: `${((profitability.nonBillableHours / totalHours) * 100).toFixed(1)}% of hours are non-billable`,
        value: (profitability.nonBillableHours / totalHours) * 100
      });
    }

    // Timeline risk alert
    if (project.timeline.endDate && new Date() > project.timeline.endDate) {
      alerts.push({
        type: 'timeline_overrun',
        severity: 'high',
        message: 'Project has exceeded timeline',
        value: Math.ceil((new Date() - project.timeline.endDate) / (1000 * 60 * 60 * 24))
      });
    }

    return alerts;
  }

  /**
   * Get profitability summary for multiple projects
   * @param {string} orgId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} Summary data
   */
  async getProfitabilitySummary(orgId, filters = {}) {
    try {
      const query = { orgId, ...filters };
      const projects = await Project.find(query);

      let totalBudgetedRevenue = 0;
      let totalActualRevenue = 0;
      let totalBudgetedCost = 0;
      let totalActualCost = 0;
      let totalMargin = 0;
      const projectBreakdown = [];

      for (const project of projects) {
        const profitability = await this.calculateProjectProfitability(project._id);
        
        totalBudgetedRevenue += profitability.profitability.budgetedRevenue;
        totalActualRevenue += profitability.profitability.actualRevenue;
        totalBudgetedCost += profitability.profitability.budgetedCost;
        totalActualCost += profitability.profitability.actualCost;
        totalMargin += profitability.profitability.margin;

        projectBreakdown.push({
          id: project._id,
          name: project.name,
          status: project.status,
          margin: profitability.profitability.margin,
          marginPercentage: profitability.profitability.marginPercentage,
          alerts: profitability.alerts.length
        });
      }

      const overallMarginPercentage = totalActualRevenue > 0 ? 
        (totalMargin / totalActualRevenue) * 100 : 0;

      return {
        summary: {
          totalBudgetedRevenue,
          totalActualRevenue,
          totalBudgetedCost,
          totalActualCost,
          totalMargin,
          overallMarginPercentage,
          projectCount: projects.length
        },
        projectBreakdown,
        topPerformers: projectBreakdown
          .sort((a, b) => b.marginPercentage - a.marginPercentage)
          .slice(0, 5),
        underPerformers: projectBreakdown
          .filter(p => p.marginPercentage < 10)
          .sort((a, b) => a.marginPercentage - b.marginPercentage)
      };

    } catch (error) {
      console.error('Error getting profitability summary:', error);
      throw error;
    }
  }

  /**
   * Predict project overrun risk
   * @param {string} projectId - Project ID
   * @returns {Object} Risk assessment
   */
  async predictProjectOverrun(projectId) {
    try {
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const profitability = await this.calculateProjectProfitability(projectId);
      
      // Calculate burn rate
      const daysElapsed = Math.ceil((new Date() - project.timeline.startDate) / (1000 * 60 * 60 * 24));
      const dailyBurnRate = profitability.profitability.actualCost / Math.max(daysElapsed, 1);
      
      // Calculate remaining budget
      const remainingBudget = project.budget.total - profitability.profitability.actualCost;
      const daysRemaining = Math.ceil((project.timeline.endDate - new Date()) / (1000 * 60 * 60 * 24));
      
      // Predict overrun
      const predictedCost = profitability.profitability.actualCost + (dailyBurnRate * daysRemaining);
      const overrunRisk = predictedCost > project.budget.total;
      const overrunAmount = Math.max(0, predictedCost - project.budget.total);

      return {
        projectId,
        currentBurnRate: dailyBurnRate,
        predictedTotalCost: predictedCost,
        overrunRisk,
        overrunAmount,
        daysRemaining,
        confidence: this.calculatePredictionConfidence(project, profitability)
      };

    } catch (error) {
      console.error('Error predicting project overrun:', error);
      throw error;
    }
  }

  /**
   * Calculate prediction confidence based on project data quality
   * @param {Object} project - Project data
   * @param {Object} profitability - Profitability data
   * @returns {number} Confidence score (0-100)
   */
  calculatePredictionConfidence(project, profitability) {
    let confidence = 100;

    // Reduce confidence if project is new
    const daysElapsed = Math.ceil((new Date() - project.timeline.startDate) / (1000 * 60 * 60 * 24));
    if (daysElapsed < 7) confidence -= 30;
    else if (daysElapsed < 30) confidence -= 15;

    // Reduce confidence if limited cost data
    if (profitability.profitability.billableHours < 10) confidence -= 20;

    // Reduce confidence if no revenue data
    if (profitability.profitability.actualRevenue === 0) confidence -= 25;

    return Math.max(0, confidence);
  }

  /**
   * Update employee productivity scores based on project performance
   * @param {string} orgId - Organization ID
   * @returns {Object} Update results
   */
  async updateEmployeeProductivity(orgId) {
    try {
      const employees = await Employee.find({ userId: { $exists: true } })
        .populate('userId', 'fullName email');

      const results = {
        updated: 0,
        errors: 0,
        details: []
      };

      for (const employee of employees) {
        try {
          // Get attendance records for this employee
          const attendanceRecords = await Attendance.find({
            userId: employee.userId._id,
            status: 'present',
            date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
          });

          // Calculate productivity metrics
          const totalHours = attendanceRecords.reduce((sum, record) => 
            sum + (record.durationMinutes / 60), 0);
          const billableHours = attendanceRecords
            .filter(record => record.costAllocation.isBillable)
            .reduce((sum, record) => sum + (record.durationMinutes / 60), 0);
          
          const billableUtilization = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;
          
          // Calculate revenue generated (simplified)
          const revenueGenerated = billableHours * (employee.salary.base / 160); // Assuming 160 hours/month
          
          // Calculate cost per hour
          const costPerHour = employee.salary.totalCompensation / 160;

          // Calculate productivity score (0-100)
          const productivityScore = Math.min(100, 
            (billableUtilization * 0.4) + 
            (Math.min(revenueGenerated / costPerHour, 2) * 30) + 
            (employee.performanceMetrics.overallRating * 10)
          );

          // Update employee record
          await Employee.findByIdAndUpdate(employee._id, {
            'performanceMetrics.productivityScore': productivityScore,
            'performanceMetrics.billableUtilization': billableUtilization,
            'performanceMetrics.revenueGenerated': revenueGenerated,
            'performanceMetrics.costPerHour': costPerHour,
            'performanceMetrics.lastCalculated': new Date()
          });

          results.updated++;
          results.details.push({
            employeeId: employee.employeeId,
            name: employee.userId.fullName,
            productivityScore,
            billableUtilization
          });

        } catch (error) {
          results.errors++;
          console.error(`Error updating productivity for employee ${employee.employeeId}:`, error);
        }
      }

      return results;

    } catch (error) {
      console.error('Error updating employee productivity:', error);
      throw error;
    }
  }
}

module.exports = new ProjectProfitabilityService();
