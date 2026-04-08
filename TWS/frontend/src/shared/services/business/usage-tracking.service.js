import { billingService } from './billingService';

class UsageTrackingService {
  constructor() {
    this.usageData = null;
    this.lastUpdated = null;
    this.updateInterval = 5 * 60 * 1000; // 5 minutes
    this.listeners = new Set();
  }

  // Subscribe to usage updates
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners of usage updates
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.usageData);
      } catch (error) {
        console.error('Error in usage tracking listener:', error);
      }
    });
  }

  // Get current usage data
  async getUsage() {
    try {
      const response = await billingService.getUsage();
      this.usageData = response.data;
      this.lastUpdated = new Date();
      this.notifyListeners();
      return this.usageData;
    } catch (error) {
      console.error('Error fetching usage data:', error);
      throw error;
    }
  }

  // Get cached usage data or fetch if needed
  async getCachedUsage() {
    const now = new Date();
    const shouldUpdate = !this.usageData || 
                        !this.lastUpdated || 
                        (now.getTime() - this.lastUpdated.getTime()) > this.updateInterval;

    if (shouldUpdate) {
      return await this.getUsage();
    }

    return this.usageData;
  }

  // Check if usage is approaching limits
  checkUsageAlerts() {
    if (!this.usageData?.usage) return [];

    const alerts = [];
    const usage = this.usageData.usage;

    Object.entries(usage).forEach(([metric, data]) => {
      if (data.limit === -1) return; // Unlimited

      const percentage = data.percentage;
      
      if (percentage >= 100) {
        alerts.push({
          type: 'error',
          metric,
          message: `${metric} limit exceeded`,
          current: data.current,
          limit: data.limit,
          overage: data.overage,
          overageCost: data.overageCost
        });
      } else if (percentage >= 90) {
        alerts.push({
          type: 'warning',
          metric,
          message: `${metric} usage is at ${percentage.toFixed(1)}%`,
          current: data.current,
          limit: data.limit,
          remaining: data.limit - data.current
        });
      } else if (percentage >= 75) {
        alerts.push({
          type: 'info',
          metric,
          message: `${metric} usage is at ${percentage.toFixed(1)}%`,
          current: data.current,
          limit: data.limit,
          remaining: data.limit - data.current
        });
      }
    });

    return alerts;
  }

  // Get usage summary for dashboard
  getUsageSummary() {
    if (!this.usageData?.usage) return null;

    const usage = this.usageData.usage;
    const summary = {
      totalOverageCost: this.usageData.totalOverageCost || 0,
      metrics: {},
      alerts: this.checkUsageAlerts(),
      plan: this.usageData.plan,
      atRisk: !!this.usageData.atRisk,
      atRiskMetrics: this.usageData.atRiskMetrics || []
    };

    Object.entries(usage).forEach(([metric, data]) => {
      summary.metrics[metric] = {
        current: data.current,
        limit: data.limit,
        percentage: data.percentage,
        remaining: data.limit === -1 ? -1 : data.limit - data.current,
        isUnlimited: data.limit === -1,
        isOverLimit: data.percentage >= 100,
        isNearLimit: data.percentage >= 90
      };
    });

    return summary;
  }

  // Track feature usage (for analytics)
  trackFeatureUsage(feature, action = 'access') {
    try {
      // Send to analytics service
      if (window.gtag) {
        window.gtag('event', 'feature_usage', {
          feature_name: feature,
          action: action,
          timestamp: new Date().toISOString()
        });
      }

      // Store in localStorage for offline tracking
      const usage = JSON.parse(localStorage.getItem('featureUsage') || '{}');
      const today = new Date().toISOString().split('T')[0];
      
      if (!usage[today]) {
        usage[today] = {};
      }
      
      if (!usage[today][feature]) {
        usage[today][feature] = 0;
      }
      
      usage[today][feature]++;
      localStorage.setItem('featureUsage', JSON.stringify(usage));
    } catch (error) {
      console.error('Error tracking feature usage:', error);
    }
  }

  // Get feature usage statistics
  getFeatureUsageStats(days = 7) {
    try {
      const usage = JSON.parse(localStorage.getItem('featureUsage') || '{}');
      const stats = {};
      const today = new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        if (usage[dateStr]) {
          Object.entries(usage[dateStr]).forEach(([feature, count]) => {
            if (!stats[feature]) {
              stats[feature] = 0;
            }
            stats[feature] += count;
          });
        }
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting feature usage stats:', error);
      return {};
    }
  }

  // Check if user can perform an action based on usage limits
  canPerformAction(metric, amount = 1) {
    if (!this.usageData?.usage?.[metric]) return true;

    const data = this.usageData.usage[metric];
    
    // If unlimited, always allow
    if (data.limit === -1) return true;
    
    // Check if adding the amount would exceed the limit
    return (data.current + amount) <= data.limit;
  }

  // Get remaining capacity for a metric
  getRemainingCapacity(metric) {
    if (!this.usageData?.usage?.[metric]) return -1;

    const data = this.usageData.usage[metric];
    
    // If unlimited, return -1
    if (data.limit === -1) return -1;
    
    return Math.max(0, data.limit - data.current);
  }

  // Format usage data for display
  formatUsageForDisplay(metric) {
    if (!this.usageData?.usage?.[metric]) return null;

    const data = this.usageData.usage[metric];
    
    return {
      current: data.current,
      limit: data.limit === -1 ? 'Unlimited' : data.limit,
      percentage: data.percentage,
      remaining: data.limit === -1 ? 'Unlimited' : Math.max(0, data.limit - data.current),
      overage: data.overage || 0,
      overageCost: data.overageCost || 0,
      isOverLimit: data.percentage >= 100,
      isNearLimit: data.percentage >= 90
    };
  }

  // Start automatic usage updates
  startAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.updateTimer = setInterval(() => {
      this.getUsage().catch(error => {
        console.error('Error in automatic usage update:', error);
      });
    }, this.updateInterval);
  }

  // Stop automatic usage updates
  stopAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  // Clear cached data
  clearCache() {
    this.usageData = null;
    this.lastUpdated = null;
  }
}

// Create singleton instance
const usageTrackingService = new UsageTrackingService();

export default usageTrackingService;
