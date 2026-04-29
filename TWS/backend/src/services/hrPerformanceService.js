const Employee = require('../models/hr-payroll/Employee');
const Attendance = require('../models/hr-payroll/Attendance');
const projectApi = require('./module-api/project-api.service');

class HRPerformanceService {
  /**
   * Link HR metrics to business outcomes
   * @param {string} orgId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} HR performance data
   */
  async getHRPerformanceMetrics(orgId, filters = {}) {
    try {
      const employees = await Employee.find({ userId: { $exists: true } })
        .populate('userId', 'fullName email')
        .populate('reportingManager', 'fullName email');

      const performanceData = {
        summary: {
          totalEmployees: employees.length,
          averageProductivity: 0,
          averageUtilization: 0,
          totalRevenue: 0,
          totalCost: 0,
          costPerEmployee: 0
        },
        employees: [],
        departments: {},
        trends: {}
      };

      let totalProductivity = 0;
      let totalUtilization = 0;
      let totalRevenue = 0;
      let totalCost = 0;

      for (const employee of employees) {
        const employeeMetrics = await this.calculateEmployeeMetrics(employee, orgId);
        
        performanceData.employees.push(employeeMetrics);
        
        totalProductivity += employeeMetrics.productivityScore;
        totalUtilization += employeeMetrics.billableUtilization;
        totalRevenue += employeeMetrics.revenueGenerated;
        totalCost += employeeMetrics.totalCost;

        // Group by department
        const dept = employee.department || 'Unassigned';
        if (!performanceData.departments[dept]) {
          performanceData.departments[dept] = {
            name: dept,
            employeeCount: 0,
            averageProductivity: 0,
            averageUtilization: 0,
            totalRevenue: 0,
            totalCost: 0
          };
        }
        
        performanceData.departments[dept].employeeCount++;
        performanceData.departments[dept].averageProductivity += employeeMetrics.productivityScore;
        performanceData.departments[dept].averageUtilization += employeeMetrics.billableUtilization;
        performanceData.departments[dept].totalRevenue += employeeMetrics.revenueGenerated;
        performanceData.departments[dept].totalCost += employeeMetrics.totalCost;
      }

      // Calculate averages
      if (employees.length > 0) {
        performanceData.summary.averageProductivity = totalProductivity / employees.length;
        performanceData.summary.averageUtilization = totalUtilization / employees.length;
        performanceData.summary.totalRevenue = totalRevenue;
        performanceData.summary.totalCost = totalCost;
        performanceData.summary.costPerEmployee = totalCost / employees.length;
      }

      // Calculate department averages
      Object.keys(performanceData.departments).forEach(dept => {
        const deptData = performanceData.departments[dept];
        deptData.averageProductivity = deptData.averageProductivity / deptData.employeeCount;
        deptData.averageUtilization = deptData.averageUtilization / deptData.employeeCount;
      });

      // Get trends
      performanceData.trends = await this.getPerformanceTrends(orgId);

      return performanceData;

    } catch (error) {
      console.error('Error getting HR performance metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive metrics for a single employee
   * @param {Object} employee - Employee record
   * @param {string} orgId - Organization ID
   * @returns {Object} Employee metrics
   */
  async calculateEmployeeMetrics(employee, orgId) {
    try {
      // Get attendance data for last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const attendanceRecords = await Attendance.find({
        userId: employee.userId._id,
        date: { $gte: thirtyDaysAgo },
        status: 'present'
      });

      // Calculate attendance metrics
      const totalHours = attendanceRecords.reduce((sum, record) => 
        sum + (record.durationMinutes / 60), 0);
      const billableHours = attendanceRecords
        .filter(record => record.costAllocation.isBillable)
        .reduce((sum, record) => sum + (record.durationMinutes / 60), 0);
      
      const billableUtilization = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

      // Get project assignments via Module API (Projects module boundary)
      const projectAssignments = await projectApi.getProjectMembersForUser(employee.userId._id);

      // Calculate project performance
      const activeProjects = projectAssignments.filter(assignment => 
        assignment.projectId.status === 'active'
      ).length;

      const completedProjects = projectAssignments.filter(assignment => 
        assignment.projectId.status === 'completed'
      ).length;

      // Calculate revenue generated (simplified)
      const hourlyRate = employee.salary.base / 160; // Assuming 160 hours/month
      const revenueGenerated = billableHours * hourlyRate;

      // Calculate total cost
      const totalCost = employee.salary.totalCompensation / 12; // Monthly cost

      // Calculate productivity score
      const productivityScore = this.calculateProductivityScore(
        billableUtilization,
        employee.performanceMetrics.overallRating,
        attendanceRecords.length,
        activeProjects
      );

      return {
        employeeId: employee.employeeId,
        name: employee.userId.fullName,
        email: employee.userId.email,
        department: employee.department,
        jobTitle: employee.jobTitle,
        hireDate: employee.hireDate,
        status: employee.status,
        productivityScore,
        billableUtilization,
        totalHours,
        billableHours,
        revenueGenerated,
        totalCost,
        costPerHour: totalCost / Math.max(totalHours, 1),
        activeProjects,
        completedProjects,
        attendanceQuality: this.calculateAttendanceQuality(attendanceRecords),
        performanceRating: employee.performanceMetrics.overallRating,
        lastReviewDate: employee.performanceMetrics.lastReviewDate,
        skills: employee.skills.length,
        certifications: employee.compliance.certifications.filter(c => c.status === 'active').length
      };

    } catch (error) {
      console.error(`Error calculating metrics for employee ${employee.employeeId}:`, error);
      return {
        employeeId: employee.employeeId,
        name: employee.userId?.fullName || 'Unknown',
        error: error.message
      };
    }
  }

  /**
   * Calculate productivity score based on multiple factors
   * @param {number} billableUtilization - Billable utilization percentage
   * @param {number} performanceRating - Performance rating (1-5)
   * @param {number} attendanceDays - Number of attendance days
   * @param {number} activeProjects - Number of active projects
   * @returns {number} Productivity score (0-100)
   */
  calculateProductivityScore(billableUtilization, performanceRating, attendanceDays, activeProjects) {
    // Weighted scoring
    const utilizationScore = billableUtilization * 0.4; // 40% weight
    const performanceScore = (performanceRating / 5) * 100 * 0.3; // 30% weight
    const attendanceScore = Math.min(attendanceDays / 20, 1) * 100 * 0.2; // 20% weight (20 days = 100%)
    const projectScore = Math.min(activeProjects / 3, 1) * 100 * 0.1; // 10% weight (3 projects = 100%)

    return Math.min(100, utilizationScore + performanceScore + attendanceScore + projectScore);
  }

  /**
   * Calculate attendance quality score
   * @param {Array} attendanceRecords - Attendance records
   * @returns {Object} Quality metrics
   */
  calculateAttendanceQuality(attendanceRecords) {
    if (attendanceRecords.length === 0) {
      return { score: 0, factors: [] };
    }

    let totalScore = 0;
    const factors = [];

    for (const record of attendanceRecords) {
      totalScore += record.qualityScore || 100;
      
      if (record.qualityScore < 80) {
        factors.push({
          date: record.date,
          score: record.qualityScore,
          issues: record.qualityFactors?.map(f => f.factor) || []
        });
      }
    }

    const averageScore = totalScore / attendanceRecords.length;
    
    return {
      score: averageScore,
      totalRecords: attendanceRecords.length,
      lowQualityRecords: factors.length,
      factors
    };
  }

  /**
   * Get performance trends over time
   * @param {string} orgId - Organization ID
   * @returns {Object} Trend data
   */
  async getPerformanceTrends(orgId) {
    try {
      const trends = {
        productivity: [],
        utilization: [],
        revenue: [],
        cost: []
      };

      // Get data for last 6 months
      for (let i = 5; i >= 0; i--) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - i);
        startDate.setDate(1);
        
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);

        const monthData = await this.getMonthlyMetrics(orgId, startDate, endDate);
        
        trends.productivity.push({
          month: startDate.toISOString().substring(0, 7),
          value: monthData.averageProductivity
        });
        
        trends.utilization.push({
          month: startDate.toISOString().substring(0, 7),
          value: monthData.averageUtilization
        });
        
        trends.revenue.push({
          month: startDate.toISOString().substring(0, 7),
          value: monthData.totalRevenue
        });
        
        trends.cost.push({
          month: startDate.toISOString().substring(0, 7),
          value: monthData.totalCost
        });
      }

      return trends;

    } catch (error) {
      console.error('Error getting performance trends:', error);
      return { productivity: [], utilization: [], revenue: [], cost: [] };
    }
  }

  /**
   * Get monthly metrics for a specific period
   * @param {string} orgId - Organization ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Monthly metrics
   */
  async getMonthlyMetrics(orgId, startDate, endDate) {
    try {
      const employees = await Employee.find({ userId: { $exists: true } })
        .populate('userId', 'fullName email');

      let totalProductivity = 0;
      let totalUtilization = 0;
      let totalRevenue = 0;
      let totalCost = 0;
      let employeeCount = 0;

      for (const employee of employees) {
        const attendanceRecords = await Attendance.find({
          userId: employee.userId._id,
          date: { $gte: startDate, $lte: endDate },
          status: 'present'
        });

        if (attendanceRecords.length > 0) {
          const totalHours = attendanceRecords.reduce((sum, record) => 
            sum + (record.durationMinutes / 60), 0);
          const billableHours = attendanceRecords
            .filter(record => record.costAllocation.isBillable)
            .reduce((sum, record) => sum + (record.durationMinutes / 60), 0);
          
          const utilization = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;
          const hourlyRate = employee.salary.base / 160;
          const revenue = billableHours * hourlyRate;
          const cost = employee.salary.totalCompensation / 12;

          totalProductivity += employee.performanceMetrics.productivityScore || 75;
          totalUtilization += utilization;
          totalRevenue += revenue;
          totalCost += cost;
          employeeCount++;
        }
      }

      return {
        averageProductivity: employeeCount > 0 ? totalProductivity / employeeCount : 0,
        averageUtilization: employeeCount > 0 ? totalUtilization / employeeCount : 0,
        totalRevenue,
        totalCost,
        employeeCount
      };

    } catch (error) {
      console.error('Error getting monthly metrics:', error);
      return {
        averageProductivity: 0,
        averageUtilization: 0,
        totalRevenue: 0,
        totalCost: 0,
        employeeCount: 0
      };
    }
  }

  /**
   * Get cost-per-employee analytics
   * @param {string} orgId - Organization ID
   * @returns {Object} Cost analytics
   */
  async getCostPerEmployeeAnalytics(orgId) {
    try {
      const employees = await Employee.find({ userId: { $exists: true } })
        .populate('userId', 'fullName email');

      const analytics = {
        summary: {
          totalEmployees: employees.length,
          totalMonthlyCost: 0,
          averageCostPerEmployee: 0,
          highestCostEmployee: null,
          lowestCostEmployee: null
        },
        breakdown: {
          byDepartment: {},
          byLevel: {},
          byContractType: {}
        },
        trends: []
      };

      let totalCost = 0;
      let highestCost = 0;
      let lowestCost = Infinity;
      let highestCostEmployee = null;
      let lowestCostEmployee = null;

      for (const employee of employees) {
        const monthlyCost = employee.salary.totalCompensation / 12;
        totalCost += monthlyCost;

        if (monthlyCost > highestCost) {
          highestCost = monthlyCost;
          highestCostEmployee = {
            name: employee.userId.fullName,
            department: employee.department,
            cost: monthlyCost
          };
        }

        if (monthlyCost < lowestCost) {
          lowestCost = monthlyCost;
          lowestCostEmployee = {
            name: employee.userId.fullName,
            department: employee.department,
            cost: monthlyCost
          };
        }

        // Breakdown by department
        const dept = employee.department || 'Unassigned';
        if (!analytics.breakdown.byDepartment[dept]) {
          analytics.breakdown.byDepartment[dept] = {
            employeeCount: 0,
            totalCost: 0,
            averageCost: 0
          };
        }
        analytics.breakdown.byDepartment[dept].employeeCount++;
        analytics.breakdown.byDepartment[dept].totalCost += monthlyCost;

        // Breakdown by career level
        const level = employee.careerDevelopment.careerLevel || 'entry';
        if (!analytics.breakdown.byLevel[level]) {
          analytics.breakdown.byLevel[level] = {
            employeeCount: 0,
            totalCost: 0,
            averageCost: 0
          };
        }
        analytics.breakdown.byLevel[level].employeeCount++;
        analytics.breakdown.byLevel[level].totalCost += monthlyCost;

        // Breakdown by contract type
        const contractType = employee.contractType || 'full-time';
        if (!analytics.breakdown.byContractType[contractType]) {
          analytics.breakdown.byContractType[contractType] = {
            employeeCount: 0,
            totalCost: 0,
            averageCost: 0
          };
        }
        analytics.breakdown.byContractType[contractType].employeeCount++;
        analytics.breakdown.byContractType[contractType].totalCost += monthlyCost;
      }

      // Calculate averages
      analytics.summary.totalMonthlyCost = totalCost;
      analytics.summary.averageCostPerEmployee = employees.length > 0 ? totalCost / employees.length : 0;
      analytics.summary.highestCostEmployee = highestCostEmployee;
      analytics.summary.lowestCostEmployee = lowestCostEmployee;

      // Calculate department averages
      Object.keys(analytics.breakdown.byDepartment).forEach(dept => {
        const deptData = analytics.breakdown.byDepartment[dept];
        deptData.averageCost = deptData.totalCost / deptData.employeeCount;
      });

      // Calculate level averages
      Object.keys(analytics.breakdown.byLevel).forEach(level => {
        const levelData = analytics.breakdown.byLevel[level];
        levelData.averageCost = levelData.totalCost / levelData.employeeCount;
      });

      // Calculate contract type averages
      Object.keys(analytics.breakdown.byContractType).forEach(contractType => {
        const contractData = analytics.breakdown.byContractType[contractType];
        contractData.averageCost = contractData.totalCost / contractData.employeeCount;
      });

      return analytics;

    } catch (error) {
      console.error('Error getting cost per employee analytics:', error);
      throw error;
    }
  }

  /**
   * Get revenue-per-employee analytics
   * @param {string} orgId - Organization ID
   * @returns {Object} Revenue analytics
   */
  async getRevenuePerEmployeeAnalytics(orgId) {
    try {
      const employees = await Employee.find({ userId: { $exists: true } })
        .populate('userId', 'fullName email');

      const analytics = {
        summary: {
          totalEmployees: employees.length,
          totalRevenue: 0,
          averageRevenuePerEmployee: 0,
          highestRevenueEmployee: null,
          lowestRevenueEmployee: null
        },
        breakdown: {
          byDepartment: {},
          byLevel: {}
        }
      };

      let totalRevenue = 0;
      let highestRevenue = 0;
      let lowestRevenue = Infinity;
      let highestRevenueEmployee = null;
      let lowestRevenueEmployee = null;

      for (const employee of employees) {
        // Get revenue generated by this employee (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const attendanceRecords = await Attendance.find({
          userId: employee.userId._id,
          date: { $gte: thirtyDaysAgo },
          status: 'present',
          'costAllocation.isBillable': true
        });

        const billableHours = attendanceRecords.reduce((sum, record) => 
          sum + (record.durationMinutes / 60), 0);
        const hourlyRate = employee.salary.base / 160;
        const monthlyRevenue = billableHours * hourlyRate;

        totalRevenue += monthlyRevenue;

        if (monthlyRevenue > highestRevenue) {
          highestRevenue = monthlyRevenue;
          highestRevenueEmployee = {
            name: employee.userId.fullName,
            department: employee.department,
            revenue: monthlyRevenue,
            billableHours
          };
        }

        if (monthlyRevenue < lowestRevenue) {
          lowestRevenue = monthlyRevenue;
          lowestRevenueEmployee = {
            name: employee.userId.fullName,
            department: employee.department,
            revenue: monthlyRevenue,
            billableHours
          };
        }

        // Breakdown by department
        const dept = employee.department || 'Unassigned';
        if (!analytics.breakdown.byDepartment[dept]) {
          analytics.breakdown.byDepartment[dept] = {
            employeeCount: 0,
            totalRevenue: 0,
            averageRevenue: 0
          };
        }
        analytics.breakdown.byDepartment[dept].employeeCount++;
        analytics.breakdown.byDepartment[dept].totalRevenue += monthlyRevenue;

        // Breakdown by career level
        const level = employee.careerDevelopment.careerLevel || 'entry';
        if (!analytics.breakdown.byLevel[level]) {
          analytics.breakdown.byLevel[level] = {
            employeeCount: 0,
            totalRevenue: 0,
            averageRevenue: 0
          };
        }
        analytics.breakdown.byLevel[level].employeeCount++;
        analytics.breakdown.byLevel[level].totalRevenue += monthlyRevenue;
      }

      // Calculate averages
      analytics.summary.totalRevenue = totalRevenue;
      analytics.summary.averageRevenuePerEmployee = employees.length > 0 ? totalRevenue / employees.length : 0;
      analytics.summary.highestRevenueEmployee = highestRevenueEmployee;
      analytics.summary.lowestRevenueEmployee = lowestRevenueEmployee;

      // Calculate department averages
      Object.keys(analytics.breakdown.byDepartment).forEach(dept => {
        const deptData = analytics.breakdown.byDepartment[dept];
        deptData.averageRevenue = deptData.totalRevenue / deptData.employeeCount;
      });

      // Calculate level averages
      Object.keys(analytics.breakdown.byLevel).forEach(level => {
        const levelData = analytics.breakdown.byLevel[level];
        levelData.averageRevenue = levelData.totalRevenue / levelData.employeeCount;
      });

      return analytics;

    } catch (error) {
      console.error('Error getting revenue per employee analytics:', error);
      throw error;
    }
  }
}

module.exports = new HRPerformanceService();
