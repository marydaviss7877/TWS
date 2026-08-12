import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  CodeBracketIcon,
  BugAntIcon,
  StarIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

const DevelopmentAnalytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [selectedProject, setSelectedProject] = useState('all');
  const [metrics, setMetrics] = useState(null);

  // Mock data - in production, fetch from API
  useEffect(() => {
    const mockMetrics = {
      velocity: {
        current: 32,
        previous: 28,
        trend: 14.3,
        average: 30,
        data: [
          { week: 'Week 1', velocity: 25 },
          { week: 'Week 2', velocity: 28 },
          { week: 'Week 3', velocity: 32 },
          { week: 'Week 4', velocity: 30 },
          { week: 'Week 5', velocity: 35 },
          { week: 'Week 6', velocity: 32 }
        ]
      },
      burndown: {
        totalStoryPoints: 100,
        remainingStoryPoints: 25,
        idealBurndown: 75,
        actualBurndown: 75,
        efficiency: 100,
        data: [
          { day: 'Day 1', ideal: 100, actual: 100 },
          { day: 'Day 3', ideal: 90, actual: 95 },
          { day: 'Day 5', ideal: 80, actual: 85 },
          { day: 'Day 7', ideal: 70, actual: 75 },
          { day: 'Day 9', ideal: 60, actual: 65 },
          { day: 'Day 11', ideal: 50, actual: 55 },
          { day: 'Day 13', ideal: 40, actual: 45 },
          { day: 'Day 15', ideal: 30, actual: 25 }
        ]
      },
      codeQuality: {
        linesOfCode: 15420,
        codeCoverage: 85,
        technicalDebt: 12,
        codeReviewTime: 8.5,
        bugDensity: 2.3,
        testCoverage: 78,
        trend: {
          codeCoverage: 5.2,
          technicalDebt: -15.8,
          testCoverage: 8.1
        }
      },
      teamPerformance: {
        totalHours: 320,
        billableHours: 280,
        nonBillableHours: 40,
        utilizationRate: 87.5,
        overtimeHours: 12,
        averageTaskCompletionTime: 4.2,
        taskAccuracy: 94.2
      },
      clientSatisfaction: {
        overallRating: 4.6,
        communicationRating: 4.8,
        qualityRating: 4.5,
        timelinessRating: 4.4,
        feedbackCount: 24,
        complaintsCount: 1,
        trend: {
          overallRating: 0.2,
          communicationRating: 0.1,
          qualityRating: 0.3
        }
      },
      projectHealth: {
        onTimeDelivery: 92,
        budgetVariance: -5.2,
        scopeCreep: 8.5,
        riskLevel: 'low',
        milestoneCompletion: 88
      },
      efficiency: {
        cycleTime: 3.2,
        leadTime: 5.8,
        throughput: 12.5,
        workInProgress: 8,
        blockedTasks: 2
      },
      bugs: {
        totalBugs: 15,
        criticalBugs: 1,
        highBugs: 3,
        mediumBugs: 6,
        lowBugs: 5,
        bugsFixed: 12,
        bugResolutionTime: 2.4,
        bugReopenRate: 5.2
      },
      features: {
        featuresDelivered: 18,
        featuresInProgress: 4,
        featuresPlanned: 6,
        featureCompletionRate: 75,
        averageFeatureTime: 3.8
      }
    };

    setMetrics(mockMetrics);
  }, [selectedPeriod, selectedProject]);

  const getTrendIcon = (trend) => {
    if (trend > 0) return <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />;
    if (trend < 0) return <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />;
    return <div className="w-4 h-4 bg-gray-400 rounded-full"></div>;
  };

  const getTrendColor = (trend) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="tws-loading-pulse rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Development Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your team's performance and project health</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Projects</option>
            <option value="ecommerce">E-Commerce Platform</option>
            <option value="mobile">Mobile Banking App</option>
            <option value="crm">CRM System</option>
          </select>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(metrics.velocity.trend)}
              <span className={`text-sm font-semibold ${getTrendColor(metrics.velocity.trend)}`}>
                {metrics.velocity.trend > 0 ? '+' : ''}{metrics.velocity.trend}%
              </span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {metrics.velocity.current}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Team Velocity</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Avg: {metrics.velocity.average} story points
          </p>
        </div>

        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(metrics.codeQuality.trend.codeCoverage)}
              <span className={`text-sm font-semibold ${getTrendColor(metrics.codeQuality.trend.codeCoverage)}`}>
                {metrics.codeQuality.trend.codeCoverage > 0 ? '+' : ''}{metrics.codeQuality.trend.codeCoverage}%
              </span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {metrics.codeQuality.codeCoverage}%
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Code Coverage</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {metrics.codeQuality.linesOfCode.toLocaleString()} lines of code
          </p>
        </div>

        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <StarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(metrics.clientSatisfaction.trend.overallRating * 10)}
              <span className={`text-sm font-semibold ${getTrendColor(metrics.clientSatisfaction.trend.overallRating * 10)}`}>
                {metrics.clientSatisfaction.trend.overallRating > 0 ? '+' : ''}{metrics.clientSatisfaction.trend.overallRating}
              </span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {metrics.clientSatisfaction.overallRating}/5
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Client Satisfaction</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {metrics.clientSatisfaction.feedbackCount} feedback responses
          </p>
        </div>

        <div className="glass-card-premium p-6 hover-glow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <ClockIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-gray-600">
                {metrics.teamPerformance.utilizationRate}%
              </span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {metrics.teamPerformance.billableHours}h
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Billable Hours</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {metrics.teamPerformance.totalHours}h total this week
          </p>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Velocity Chart */}
        <div className="glass-card-premium p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Velocity Trend</h3>
          <div className="space-y-3">
            {metrics.velocity.data.map((item) => (
              <div key={item.week} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{item.week}</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                      style={{ width: `${(item.velocity / 40) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white w-8">
                    {item.velocity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Code Quality Metrics */}
        <div className="glass-card-premium p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Code Quality</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Test Coverage</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${metrics.codeQuality.testCoverage}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {metrics.codeQuality.testCoverage}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Technical Debt</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {metrics.codeQuality.technicalDebt}h
                </span>
                <span className={`text-xs ${getTrendColor(metrics.codeQuality.trend.technicalDebt)}`}>
                  {metrics.codeQuality.trend.technicalDebt > 0 ? '+' : ''}{metrics.codeQuality.trend.technicalDebt}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Bug Density</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {metrics.bugs.bugDensity} bugs/1k LOC
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Code Review Time</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {metrics.codeQuality.codeReviewTime}h avg
              </span>
            </div>
          </div>
        </div>

        {/* Team Performance */}
        <div className="glass-card-premium p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Team Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Utilization Rate</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${metrics.teamPerformance.utilizationRate}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {metrics.teamPerformance.utilizationRate}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Task Accuracy</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {metrics.teamPerformance.taskAccuracy}%
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Avg Completion Time</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {metrics.teamPerformance.averageTaskCompletionTime}h
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Overtime Hours</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {metrics.teamPerformance.overtimeHours}h
              </span>
            </div>
          </div>
        </div>

        {/* Project Health */}
        <div className="glass-card-premium p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Project Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">On-Time Delivery</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${metrics.projectHealth.onTimeDelivery}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {metrics.projectHealth.onTimeDelivery}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Budget Variance</span>
              <span className={`text-sm font-semibold ${metrics.projectHealth.budgetVariance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.projectHealth.budgetVariance > 0 ? '+' : ''}{metrics.projectHealth.budgetVariance}%
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Scope Creep</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {metrics.projectHealth.scopeCreep}%
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Risk Level</span>
              <span className={`px-2 py-1 rounded text-xs font-semibold border ${getRiskColor(metrics.projectHealth.riskLevel)}`}>
                {metrics.projectHealth.riskLevel.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bug and Feature Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card-premium p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Bug Analytics</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.bugs.totalBugs}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Bugs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.bugs.bugsFixed}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Fixed</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Critical</span>
                <span className="text-red-600 font-semibold">{metrics.bugs.criticalBugs}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">High</span>
                <span className="text-orange-600 font-semibold">{metrics.bugs.highBugs}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Medium</span>
                <span className="text-yellow-600 font-semibold">{metrics.bugs.mediumBugs}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Low</span>
                <span className="text-green-600 font-semibold">{metrics.bugs.lowBugs}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Avg Resolution Time</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {metrics.bugs.bugResolutionTime}h
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card-premium p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Feature Delivery</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.features.featuresDelivered}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Delivered</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.features.featuresInProgress}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">In Progress</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.features.featuresPlanned}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Planned</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Completion Rate</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${metrics.features.featureCompletionRate}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {metrics.features.featureCompletionRate}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Avg Feature Time</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {metrics.features.averageFeatureTime} days
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevelopmentAnalytics;
