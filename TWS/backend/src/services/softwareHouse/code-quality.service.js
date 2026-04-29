const CodeQuality = require('../../models/analytics/CodeQuality');

class CodeQualityService {
  /**
   * Get start date based on time range
   */
  getStartDate(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
    }
  }

  /**
   * Submit code quality metrics
   */
  async submitMetrics(orgId, projectId, metricsData) {
    const codeQuality = new CodeQuality({
      orgId,
      projectId,
      ...metricsData,
      timestamp: new Date()
    });

    await codeQuality.save();
    return codeQuality;
  }

  /**
   * Get code quality dashboard data
   */
  async getDashboard(orgId, projectId, timeRange = '30d') {
    const startDate = this.getStartDate(timeRange);
    
    const query = {
      orgId,
      timestamp: { $gte: startDate }
    };

    if (projectId) {
      query.projectId = projectId;
    }

    const metrics = await CodeQuality.find(query)
      .populate('projectId', 'name')
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    // Calculate trends
    const trends = this.calculateTrends(metrics);

    // Get latest metrics
    const latest = metrics[0] || null;

    // Calculate averages
    const averages = this.calculateAverages(metrics);

    return {
      latest,
      trends,
      averages,
      history: metrics
    };
  }

  /**
   * Calculate trends from metrics history
   */
  calculateTrends(metrics) {
    if (metrics.length === 0) {
      return {
        coverage: [],
        technicalDebt: [],
        bugs: []
      };
    }

    // Group by date
    const trends = {
      coverage: [],
      technicalDebt: [],
      bugs: []
    };

    metrics.forEach(metric => {
      const date = new Date(metric.timestamp);
      trends.coverage.push({
        date: date.toISOString(),
        value: metric.testCoverage?.lines || 0
      });
      trends.technicalDebt.push({
        date: date.toISOString(),
        value: metric.qualityMetrics?.technicalDebt || 0
      });
      trends.bugs.push({
        date: date.toISOString(),
        value: metric.qualityMetrics?.bugs || 0
      });
    });

    // Sort by date
    trends.coverage.sort((a, b) => new Date(a.date) - new Date(b.date));
    trends.technicalDebt.sort((a, b) => new Date(a.date) - new Date(b.date));
    trends.bugs.sort((a, b) => new Date(a.date) - new Date(b.date));

    return trends;
  }

  /**
   * Calculate average metrics
   */
  calculateAverages(metrics) {
    if (metrics.length === 0) {
      return {
        coverage: 0,
        technicalDebt: 0,
        bugs: 0,
        codeSmells: 0
      };
    }

    let totalCoverage = 0;
    let totalDebt = 0;
    let totalBugs = 0;
    let totalCodeSmells = 0;
    let count = 0;

    metrics.forEach(metric => {
      if (metric.testCoverage?.lines !== undefined) {
        totalCoverage += metric.testCoverage.lines;
      }
      if (metric.qualityMetrics?.technicalDebt !== undefined) {
        totalDebt += metric.qualityMetrics.technicalDebt;
      }
      if (metric.qualityMetrics?.bugs !== undefined) {
        totalBugs += metric.qualityMetrics.bugs;
      }
      if (metric.qualityMetrics?.codeSmells !== undefined) {
        totalCodeSmells += metric.qualityMetrics.codeSmells;
      }
      count++;
    });

    return {
      coverage: count > 0 ? totalCoverage / count : 0,
      technicalDebt: count > 0 ? totalDebt / count : 0,
      bugs: count > 0 ? totalBugs / count : 0,
      codeSmells: count > 0 ? totalCodeSmells / count : 0
    };
  }

  /**
   * Get quality report
   */
  async getQualityReport(orgId, projectId, startDate, endDate) {
    const query = {
      orgId,
      projectId,
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    const metrics = await CodeQuality.find(query)
      .populate('projectId', 'name')
      .sort({ timestamp: -1 })
      .lean();

    const averages = this.calculateAverages(metrics);
    const trends = this.calculateTrends(metrics);

    return {
      period: {
        start: startDate,
        end: endDate
      },
      metrics,
      averages,
      trends,
      summary: {
        totalMetrics: metrics.length,
        averageCoverage: averages.coverage,
        averageTechnicalDebt: averages.technicalDebt,
        totalBugs: metrics.reduce((sum, m) => sum + (m.qualityMetrics?.bugs || 0), 0)
      }
    };
  }
}

module.exports = new CodeQualityService();