const mongoose = require('mongoose');
// const TenantAnalyticsSummary = require('../../models/TenantAnalyticsSummary'); // Model not yet implemented
const EmployeeMetrics = require('../../models/hr-payroll/EmployeeMetrics');
const Project = require('../../models/project-delivery/Project');
const Attendance = require('../../models/hr-payroll/Attendance');
const Employee = require('../../models/hr-payroll/Employee');
const Client = require('../../models/industry/Client');
const logger = require('../../utils/logger');

/**
 * Data Warehouse Service
 * 
 * Handles data aggregation, ETL processes, and analytics data management
 */
class DataWarehouseService {
  constructor() {
    this.analyticsDb = null;
    this.operationalDb = null;
    this.etlJobs = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      // Connect to analytics database (separate from operational)
      const analyticsUri = process.env.ANALYTICS_DB_URI || process.env.MONGODB_URI;
      this.analyticsDb = await mongoose.createConnection(analyticsUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });

      // Connect to operational database
      this.operationalDb = mongoose.connection;

      // Initialize ETL jobs
      this.initializeETLJobs();

      this.isInitialized = true;
      logger.info('DataWarehouseService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize DataWarehouseService:', error);
      throw error;
    }
  }

  /**
   * Initialize ETL jobs
   */
  initializeETLJobs() {
    // Daily aggregation job
    this.etlJobs.set('daily_aggregation', {
      name: 'Daily Data Aggregation',
      schedule: '0 2 * * *', // 2 AM daily
      lastRun: null,
      status: 'idle'
    });

    // Weekly aggregation job
    this.etlJobs.set('weekly_aggregation', {
      name: 'Weekly Data Aggregation',
      schedule: '0 3 * * 0', // 3 AM on Sunday
      lastRun: null,
      status: 'idle'
    });

    // Monthly aggregation job
    this.etlJobs.set('monthly_aggregation', {
      name: 'Monthly Data Aggregation',
      schedule: '0 4 1 * *', // 4 AM on 1st of month
      lastRun: null,
      status: 'idle'
    });

    // Real-time data sync job
    this.etlJobs.set('realtime_sync', {
      name: 'Real-time Data Sync',
      schedule: '*/15 * * * *', // Every 15 minutes
      lastRun: null,
      status: 'idle'
    });
  }

  /**
   * Run ETL process for a specific period
   */
  async runETLProcess(periodType, startDate, endDate, tenantId = null) {
    try {
      logger.info(`Starting ETL process for ${periodType} period: ${startDate} to ${endDate}`);

      const tenants = tenantId ? 
        [{ tenantId }] : 
        await this.operationalDb.collection('tenants').find({ status: 'active' }).toArray();

      for (const tenant of tenants) {
        await this.processTenantData(tenant.tenantId, periodType, startDate, endDate);
      }

      logger.info(`ETL process completed for ${periodType} period`);
    } catch (error) {
      logger.error(`ETL process failed for ${periodType} period:`, error);
      throw error;
    }
  }

  /**
   * Process data for a specific tenant
   */
  async processTenantData(tenantId, periodType, startDate, endDate) {
    try {
      logger.debug(`Processing data for tenant ${tenantId}`);

      // Get operational data
      const operationalData = await this.extractOperationalData(tenantId, startDate, endDate);

      // Transform data
      const transformedData = await this.transformData(operationalData, periodType);

      // Load data into analytics database
      await this.loadAnalyticsData(tenantId, transformedData, periodType, startDate, endDate);

      logger.debug(`Data processing completed for tenant ${tenantId}`);
    } catch (error) {
      logger.error(`Failed to process data for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Extract operational data
   */
  async extractOperationalData(tenantId, startDate, endDate) {
    try {
      const data = {};

      // Extract project data
      data.projects = await Project.find({
        orgId: tenantId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean();

      // Extract attendance data
      data.attendance = await Attendance.find({
        orgId: tenantId,
        date: { $gte: startDate, $lte: endDate }
      }).lean();

      // Extract employee data
      data.employees = await Employee.find({
        orgId: tenantId,
        status: 'active'
      }).lean();

      // Extract client data
      data.clients = await Client.find({
        orgId: tenantId
      }).lean();

      // Extract usage data from tenant
      const tenant = await this.operationalDb.collection('tenants').findOne({ tenantId });
      data.usage = tenant?.usage || {};

      return data;
    } catch (error) {
      logger.error(`Failed to extract operational data for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Transform operational data into analytics format
   */
  async transformData(operationalData, periodType) {
    try {
      const transformed = {
        users: this.transformUserData(operationalData),
        projects: this.transformProjectData(operationalData),
        financial: this.transformFinancialData(operationalData),
        clients: this.transformClientData(operationalData),
        employees: this.transformEmployeeData(operationalData),
        systemUsage: this.transformSystemUsageData(operationalData),
        performance: this.transformPerformanceData(operationalData),
        engagement: this.transformEngagementData(operationalData),
        compliance: this.transformComplianceData(operationalData),
        growth: this.transformGrowthData(operationalData),
        predictions: this.transformPredictionData(operationalData)
      };

      return transformed;
    } catch (error) {
      logger.error('Failed to transform data:', error);
      throw error;
    }
  }

  /**
   * Transform user data
   */
  transformUserData(data) {
    const employees = data.employees || [];
    const attendance = data.attendance || [];

    return {
      total: employees.length,
      active: employees.filter(emp => emp.status === 'active').length,
      new: employees.filter(emp => 
        new Date(emp.createdAt) >= new Date(startDate)
      ).length,
      churned: employees.filter(emp => 
        emp.status === 'inactive' && 
        new Date(emp.updatedAt) >= new Date(startDate)
      ).length,
      dailyActiveUsers: this.calculateDailyActiveUsers(attendance),
      weeklyActiveUsers: this.calculateWeeklyActiveUsers(attendance),
      monthlyActiveUsers: this.calculateMonthlyActiveUsers(attendance),
      averageSessionDuration: this.calculateAverageSessionDuration(attendance),
      loginFrequency: this.calculateLoginFrequency(attendance)
    };
  }

  /**
   * Transform project data
   */
  transformProjectData(data) {
    const projects = data.projects || [];

    return {
      total: projects.length,
      active: projects.filter(p => p.status === 'active').length,
      completed: projects.filter(p => p.status === 'completed').length,
      cancelled: projects.filter(p => p.status === 'cancelled').length,
      new: projects.filter(p => 
        new Date(p.createdAt) >= new Date(startDate)
      ).length,
      averageProjectDuration: this.calculateAverageProjectDuration(projects),
      averageProjectValue: this.calculateAverageProjectValue(projects),
      onTimeDeliveryRate: this.calculateOnTimeDeliveryRate(projects),
      budgetAdherenceRate: this.calculateBudgetAdherenceRate(projects)
    };
  }

  /**
   * Transform financial data
   */
  transformFinancialData(data) {
    const projects = data.projects || [];
    const attendance = data.attendance || [];

    const totalRevenue = projects.reduce((sum, p) => 
      sum + (p.profitability?.actualRevenue || 0), 0);
    const totalCosts = projects.reduce((sum, p) => 
      sum + (p.profitability?.actualCost || 0), 0);

    return {
      revenue: {
        total: totalRevenue,
        recurring: this.calculateRecurringRevenue(projects),
        oneTime: this.calculateOneTimeRevenue(projects),
        growth: this.calculateRevenueGrowth(projects)
      },
      costs: {
        total: totalCosts,
        operational: this.calculateOperationalCosts(attendance),
        infrastructure: this.calculateInfrastructureCosts(data.usage),
        support: this.calculateSupportCosts(projects)
      },
      profitability: {
        grossMargin: totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue) * 100 : 0,
        netMargin: this.calculateNetMargin(totalRevenue, totalCosts),
        totalMargin: totalRevenue - totalCosts
      },
      billing: {
        invoicesGenerated: this.calculateInvoicesGenerated(projects),
        invoicesPaid: this.calculateInvoicesPaid(projects),
        averagePaymentTime: this.calculateAveragePaymentTime(projects),
        outstandingAmount: this.calculateOutstandingAmount(projects)
      }
    };
  }

  /**
   * Transform client data
   */
  transformClientData(data) {
    const clients = data.clients || [];
    const projects = data.projects || [];

    return {
      total: clients.length,
      active: clients.filter(c => c.status === 'active').length,
      new: clients.filter(c => 
        new Date(c.createdAt) >= new Date(startDate)
      ).length,
      churned: clients.filter(c => 
        c.status === 'inactive' && 
        new Date(c.updatedAt) >= new Date(startDate)
      ).length,
      averageClientValue: this.calculateAverageClientValue(clients, projects),
      clientSatisfactionScore: this.calculateClientSatisfactionScore(clients),
      netPromoterScore: this.calculateNetPromoterScore(clients),
      churnRate: this.calculateChurnRate(clients),
      retentionRate: this.calculateRetentionRate(clients)
    };
  }

  /**
   * Transform employee data
   */
  transformEmployeeData(data) {
    const employees = data.employees || [];
    const attendance = data.attendance || [];

    return {
      total: employees.length,
      active: employees.filter(emp => emp.status === 'active').length,
      new: employees.filter(emp => 
        new Date(emp.createdAt) >= new Date(startDate)
      ).length,
      terminated: employees.filter(emp => 
        emp.status === 'inactive' && 
        new Date(emp.updatedAt) >= new Date(startDate)
      ).length,
      averageProductivityScore: this.calculateAverageProductivityScore(employees),
      averageUtilizationRate: this.calculateAverageUtilizationRate(attendance),
      averageAttendanceRate: this.calculateAverageAttendanceRate(attendance),
      totalHoursWorked: this.calculateTotalHoursWorked(attendance),
      billableHours: this.calculateBillableHours(attendance),
      nonBillableHours: this.calculateNonBillableHours(attendance)
    };
  }

  /**
   * Transform system usage data
   */
  transformSystemUsageData(data) {
    const usage = data.usage || {};

    return {
      apiCalls: {
        total: usage.apiCalls || 0,
        successful: Math.floor((usage.apiCalls || 0) * 0.95),
        failed: Math.floor((usage.apiCalls || 0) * 0.05),
        averageResponseTime: this.calculateAverageResponseTime(usage)
      },
      storage: {
        totalUsed: usage.totalStorage || 0,
        filesUploaded: this.calculateFilesUploaded(usage),
        averageFileSize: this.calculateAverageFileSize(usage)
      },
      features: {
        mostUsed: this.getMostUsedFeatures(usage),
        leastUsed: this.getLeastUsedFeatures(usage)
      }
    };
  }

  /**
   * Transform performance data
   */
  transformPerformanceData(data) {
    return {
      systemUptime: this.calculateSystemUptime(data),
      averageLoadTime: this.calculateAverageLoadTime(data),
      errorRate: this.calculateErrorRate(data),
      supportTickets: this.calculateSupportTickets(data)
    };
  }

  /**
   * Transform engagement data
   */
  transformEngagementData(data) {
    return {
      featureAdoption: this.calculateFeatureAdoption(data),
      userActivity: this.calculateUserActivity(data),
      contentEngagement: this.calculateContentEngagement(data)
    };
  }

  /**
   * Transform compliance data
   */
  transformComplianceData(data) {
    return {
      auditLogs: this.calculateAuditLogs(data),
      dataRetention: this.calculateDataRetention(data)
    };
  }

  /**
   * Transform growth data
   */
  transformGrowthData(data) {
    return {
      userGrowth: this.calculateUserGrowth(data),
      revenueGrowth: this.calculateRevenueGrowth(data),
      projectGrowth: this.calculateProjectGrowth(data),
      clientGrowth: this.calculateClientGrowth(data)
    };
  }

  /**
   * Transform prediction data
   */
  transformPredictionData(data) {
    return {
      churnRisk: this.calculateChurnRisk(data),
      revenueForecast: this.calculateRevenueForecast(data),
      capacityPlanning: this.calculateCapacityPlanning(data)
    };
  }

  /**
   * Load analytics data into warehouse
   */
  async loadAnalyticsData(tenantId, transformedData, periodType, startDate, endDate) {
    try {
      const now = new Date();
      
      const analyticsSummary = new TenantAnalyticsSummary({
        tenantId,
        period: {
          type: periodType,
          startDate,
          endDate,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          week: Math.ceil(now.getDate() / 7),
          day: now.getDate()
        },
        ...transformedData,
        calculatedAt: now,
        calculationVersion: '1.0',
        dataQuality: {
          score: this.calculateDataQualityScore(transformedData),
          issues: this.identifyDataQualityIssues(transformedData)
        }
      });

      await analyticsSummary.save();
      logger.debug(`Analytics data loaded for tenant ${tenantId}`);
    } catch (error) {
      logger.error(`Failed to load analytics data for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get analytics data for a tenant
   */
  async getAnalyticsData(tenantId, periodType, startDate, endDate) {
    try {
      return await TenantAnalyticsSummary.find({
        tenantId,
        'period.type': periodType,
        'period.startDate': { $gte: startDate },
        'period.endDate': { $lte: endDate }
      }).sort({ 'period.startDate': 1 });
    } catch (error) {
      logger.error(`Failed to get analytics data for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get aggregated analytics across all tenants
   */
  async getAggregatedAnalytics(periodType, startDate, endDate) {
    try {
      return await TenantAnalyticsSummary.aggregate([
        {
          $match: {
            'period.type': periodType,
            'period.startDate': { $gte: startDate },
            'period.endDate': { $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalTenants: { $sum: 1 },
            totalUsers: { $sum: '$users.total' },
            totalActiveUsers: { $sum: '$users.active' },
            totalRevenue: { $sum: '$financial.revenue.total' },
            totalProjects: { $sum: '$projects.total' },
            totalClients: { $sum: '$clients.total' },
            averageHealthScore: { $avg: '$healthScore' },
            averageSatisfactionScore: { $avg: '$clients.clientSatisfactionScore' }
          }
        }
      ]);
    } catch (error) {
      logger.error('Failed to get aggregated analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate data quality score
   */
  calculateDataQualityScore(data) {
    let score = 100;
    
    // Check for missing data
    if (!data.users || data.users.total === 0) score -= 20;
    if (!data.projects || data.projects.total === 0) score -= 20;
    if (!data.financial || data.financial.revenue.total === 0) score -= 20;
    
    // Check for data consistency
    if (data.users && data.users.total < data.users.active) score -= 10;
    if (data.projects && data.projects.total < data.projects.active) score -= 10;
    
    return Math.max(0, score);
  }

  /**
   * Identify data quality issues
   */
  identifyDataQualityIssues(data) {
    const issues = [];
    
    if (!data.users || data.users.total === 0) {
      issues.push({
        type: 'missing_data',
        description: 'No user data available',
        severity: 'high'
      });
    }
    
    if (!data.projects || data.projects.total === 0) {
      issues.push({
        type: 'missing_data',
        description: 'No project data available',
        severity: 'high'
      });
    }
    
    if (data.users && data.users.total < data.users.active) {
      issues.push({
        type: 'data_inconsistency',
        description: 'Total users less than active users',
        severity: 'medium'
      });
    }
    
    return issues;
  }

  // Helper methods for calculations (simplified implementations)
  calculateDailyActiveUsers(attendance) {
    const uniqueUsers = new Set(attendance.map(a => a.employeeId));
    return uniqueUsers.size;
  }

  calculateWeeklyActiveUsers(attendance) {
    return this.calculateDailyActiveUsers(attendance);
  }

  calculateMonthlyActiveUsers(attendance) {
    return this.calculateDailyActiveUsers(attendance);
  }

  calculateAverageSessionDuration(attendance) {
    const durations = attendance.map(a => a.duration || 0);
    return durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
  }

  calculateLoginFrequency(attendance) {
    return attendance.length;
  }

  calculateAverageProjectDuration(projects) {
    const durations = projects.map(p => {
      if (p.startDate && p.endDate) {
        return (new Date(p.endDate) - new Date(p.startDate)) / (1000 * 60 * 60 * 24);
      }
      return 0;
    });
    return durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
  }

  calculateAverageProjectValue(projects) {
    const values = projects.map(p => p.profitability?.actualRevenue || 0);
    return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
  }

  calculateOnTimeDeliveryRate(projects) {
    const completedProjects = projects.filter(p => p.status === 'completed');
    if (completedProjects.length === 0) return 0;
    
    const onTimeProjects = completedProjects.filter(p => {
      if (p.endDate && p.estimatedEndDate) {
        return new Date(p.endDate) <= new Date(p.estimatedEndDate);
      }
      return false;
    });
    
    return (onTimeProjects.length / completedProjects.length) * 100;
  }

  calculateBudgetAdherenceRate(projects) {
    const projectsWithBudget = projects.filter(p => p.budget && p.profitability?.actualCost);
    if (projectsWithBudget.length === 0) return 0;
    
    const withinBudgetProjects = projectsWithBudget.filter(p => 
      p.profitability.actualCost <= p.budget
    );
    
    return (withinBudgetProjects.length / projectsWithBudget.length) * 100;
  }

  // Additional helper methods would be implemented here...

  /**
   * Health check for the service
   */
  async healthCheck() {
    try {
      // Check if both databases are connected
      if (!this.analyticsDb || !this.operationalDb) {
        return false;
      }

      // Check if we can query both databases
      await this.analyticsDb.collection('tenantanalyticssummaries').findOne();
      await this.operationalDb.collection('tenants').findOne();
      
      return true;
    } catch (error) {
      logger.error('DataWarehouseService health check failed:', error);
      return false;
    }
  }

  /**
   * Get service metrics
   */
  async getMetrics() {
    return {
      etlJobs: Array.from(this.etlJobs.entries()).map(([key, job]) => ({
        name: job.name,
        status: job.status,
        lastRun: job.lastRun
      })),
      isInitialized: this.isInitialized,
      status: 'healthy'
    };
  }

  /**
   * Shutdown the service
   */
  async shutdown() {
    if (this.analyticsDb) {
      await this.analyticsDb.close();
    }
    this.etlJobs.clear();
    this.isInitialized = false;
    logger.info('DataWarehouseService shut down');
  }
}

// Create singleton instance
const dataWarehouseService = new DataWarehouseService();

module.exports = dataWarehouseService;
