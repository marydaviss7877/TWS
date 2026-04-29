const Tenant = require('../../models/tenant/Tenant');
const User = require('../../models/users-auth/User');
const Organization = require('../../models/org/Organization');
const Project = require('../../models/project-delivery/Project');
// Message and Chat models removed - messaging features have been removed

/**
 * Analytics Service for Supra Admin Dashboard
 * Provides comprehensive analytics across all tenants
 */
class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics(timeRange = '30d') {
    try {
      const cacheKey = `dashboard_${timeRange}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const [tenantStats, userStats, projectStats, revenueStats, systemStats] = await Promise.all([
        this.getTenantAnalytics(timeRange),
        this.getUserAnalytics(timeRange),
        this.getProjectAnalytics(timeRange),
        this.getRevenueAnalytics(timeRange),
        this.getSystemAnalytics(timeRange)
      ]);

      const analytics = {
        timeRange,
        overview: {
          totalTenants: tenantStats.total,
          activeTenants: tenantStats.active,
          totalUsers: userStats.total,
          activeUsers: userStats.active,
          totalProjects: projectStats.total,
          activeProjects: projectStats.active,
          totalRevenue: revenueStats.total,
          monthlyRecurringRevenue: revenueStats.mrr
        },
        trends: {
          tenantGrowth: tenantStats.growth,
          userGrowth: userStats.growth,
          projectGrowth: projectStats.growth,
          revenueGrowth: revenueStats.growth
        },
        tenantStats,
        userStats,
        projectStats,
        revenueStats,
        systemStats,
        timestamp: new Date()
      };

      this.setCachedData(cacheKey, analytics);
      return analytics;
    } catch (error) {
      console.error('Error getting dashboard analytics:', error);
      throw error;
    }
  }

  /**
   * Get tenant analytics
   */
  async getTenantAnalytics(timeRange) {
    try {
      const total = await Tenant.countDocuments();
      const active = await Tenant.countDocuments({ status: 'active' });
      const suspended = await Tenant.countDocuments({ status: 'suspended' });
      
      // Get growth data
      const startDate = this.getStartDate(timeRange);
      const newTenants = await Tenant.countDocuments({
        createdAt: { $gte: startDate }
      });

      // Get tenant distribution by plan
      const planDistribution = await Tenant.aggregate([
        { $group: { _id: '$subscription.plan', count: { $sum: 1 } } }
      ]);

      // Get tenant distribution by industry
      const industryDistribution = await Tenant.aggregate([
        { $group: { _id: '$businessInfo.industry', count: { $sum: 1 } } }
      ]);

      return {
        total,
        active,
        suspended,
        growth: newTenants,
        planDistribution: planDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        industryDistribution: industryDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        trends: await this.getTenantTrends(timeRange)
      };
    } catch (error) {
      console.error('Error getting tenant analytics:', error);
      return { total: 0, active: 0, suspended: 0, growth: 0, planDistribution: {}, industryDistribution: {}, trends: [] };
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(timeRange) {
    try {
      const total = await User.countDocuments();
      const active = await User.countDocuments({ status: 'active' });
      const inactive = await User.countDocuments({ status: 'inactive' });
      
      // Get growth data
      const startDate = this.getStartDate(timeRange);
      const newUsers = await User.countDocuments({
        createdAt: { $gte: startDate }
      });

      // Get user distribution by role
      const roleDistribution = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);

      return {
        total,
        active,
        inactive,
        growth: newUsers,
        roleDistribution: roleDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        trends: await this.getUserTrends(timeRange)
      };
    } catch (error) {
      console.error('Error getting user analytics:', error);
      return { total: 0, active: 0, inactive: 0, growth: 0, roleDistribution: {}, trends: [] };
    }
  }

  /**
   * Get project analytics
   */
  async getProjectAnalytics(timeRange) {
    try {
      const total = await Project.countDocuments();
      const active = await Project.countDocuments({ status: 'active' });
      const completed = await Project.countDocuments({ status: 'completed' });
      
      // Get growth data
      const startDate = this.getStartDate(timeRange);
      const newProjects = await Project.countDocuments({
        createdAt: { $gte: startDate }
      });

      // Get project distribution by status
      const statusDistribution = await Project.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      return {
        total,
        active,
        completed,
        growth: newProjects,
        statusDistribution: statusDistribution.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        trends: await this.getProjectTrends(timeRange)
      };
    } catch (error) {
      console.error('Error getting project analytics:', error);
      return { total: 0, active: 0, completed: 0, growth: 0, statusDistribution: {}, trends: [] };
    }
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(timeRange) {
    try {
      // Mock revenue data - in real implementation, this would query actual billing data
      const total = 1250000; // $1.25M
      const mrr = 105000; // $105K MRR
      const growth = 15.5; // 15.5% growth
      
      const startDate = this.getStartDate(timeRange);
      const revenueTrends = await this.getRevenueTrends(timeRange);

      return {
        total,
        mrr,
        growth,
        trends: revenueTrends,
        currency: 'USD'
      };
    } catch (error) {
      console.error('Error getting revenue analytics:', error);
      return { total: 0, mrr: 0, growth: 0, trends: [], currency: 'USD' };
    }
  }

  /**
   * Get system analytics
   */
  async getSystemAnalytics(timeRange) {
    try {
      // Mock system data - in real implementation, this would query actual system metrics
      return {
        uptime: 99.9,
        responseTime: 245, // ms
        errorRate: 0.1, // %
        throughput: 1250, // requests per minute
        trends: await this.getSystemTrends(timeRange)
      };
    } catch (error) {
      console.error('Error getting system analytics:', error);
      return { uptime: 0, responseTime: 0, errorRate: 0, throughput: 0, trends: [] };
    }
  }

  /**
   * Get tenant trends over time
   */
  async getTenantTrends(timeRange) {
    try {
      const days = this.getDaysForRange(timeRange);
      const trends = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const count = await Tenant.countDocuments({
          createdAt: { $gte: date, $lt: nextDate }
        });

        trends.push({
          date: date.toISOString().split('T')[0],
          count
        });
      }

      return trends;
    } catch (error) {
      console.error('Error getting tenant trends:', error);
      return [];
    }
  }

  /**
   * Get user trends over time
   */
  async getUserTrends(timeRange) {
    try {
      const days = this.getDaysForRange(timeRange);
      const trends = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const count = await User.countDocuments({
          createdAt: { $gte: date, $lt: nextDate }
        });

        trends.push({
          date: date.toISOString().split('T')[0],
          count
        });
      }

      return trends;
    } catch (error) {
      console.error('Error getting user trends:', error);
      return [];
    }
  }

  /**
   * Get project trends over time
   */
  async getProjectTrends(timeRange) {
    try {
      const days = this.getDaysForRange(timeRange);
      const trends = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const count = await Project.countDocuments({
          createdAt: { $gte: date, $lt: nextDate }
        });

        trends.push({
          date: date.toISOString().split('T')[0],
          count
        });
      }

      return trends;
    } catch (error) {
      console.error('Error getting project trends:', error);
      return [];
    }
  }

  /**
   * Get revenue trends over time
   */
  async getRevenueTrends(timeRange) {
    try {
      const days = this.getDaysForRange(timeRange);
      const trends = [];

      // Mock revenue data - in real implementation, this would query actual billing data
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        // Generate mock revenue data
        const baseRevenue = 35000;
        const variation = Math.random() * 10000 - 5000;
        const revenue = Math.max(0, baseRevenue + variation);

        trends.push({
          date: date.toISOString().split('T')[0],
          revenue: Math.round(revenue)
        });
      }

      return trends;
    } catch (error) {
      console.error('Error getting revenue trends:', error);
      return [];
    }
  }

  /**
   * Get system trends over time
   */
  async getSystemTrends(timeRange) {
    try {
      const days = this.getDaysForRange(timeRange);
      const trends = [];

      // Mock system data - in real implementation, this would query actual system metrics
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        trends.push({
          date: date.toISOString().split('T')[0],
          uptime: 99.5 + Math.random() * 0.5,
          responseTime: 200 + Math.random() * 100,
          errorRate: Math.random() * 0.5,
          throughput: 1000 + Math.random() * 500
        });
      }

      return trends;
    } catch (error) {
      console.error('Error getting system trends:', error);
      return [];
    }
  }

  /**
   * Get start date for time range
   */
  getStartDate(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Get number of days for time range
   */
  getDaysForRange(timeRange) {
    switch (timeRange) {
      case '24h':
        return 1;
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
      default:
        return 30;
    }
  }

  /**
   * Get cached data
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set cached data
   */
  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new AnalyticsService();
