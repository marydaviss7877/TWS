import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../app/providers/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ChartBarIcon,
  ClockIcon,
  CodeBracketIcon,
  LightBulbIcon,
  FireIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  UserGroupIcon,
  SparklesIcon,
  HeartIcon,
  EyeIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  WifiIcon,
  HomeIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const ProductivityAnalytics = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('7d');
  const [analytics, setAnalytics] = useState({
    productivity: {
      totalHours: 0,
      productiveHours: 0,
      focusTime: 0,
      breakTime: 0,
      efficiency: 0
    },
    development: {
      codeCommits: 0,
      linesOfCode: 0,
      bugsFixed: 0,
      featuresCompleted: 0,
      codeQuality: 0
    },
    collaboration: {
      meetingsAttended: 0,
      messagesSent: 0,
      reviewsCompleted: 0,
      mentoringHours: 0,
      teamContribution: 0
    },
    wellbeing: {
      workLifeBalance: 0,
      stressLevel: 0,
      satisfaction: 0,
      energyLevel: 0,
      motivation: 0
    }
  });
  const [trends, setTrends] = useState({
    productivity: 'up',
    development: 'up',
    collaboration: 'stable',
    wellbeing: 'up'
  });
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    fetchInsights();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/attendance/analytics/productivity?range=${timeRange}`);
      if (response.data.success) {
        setAnalytics(response.data.data);
        setTrends(response.data.trends);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      const response = await axios.get(`/api/attendance/analytics/insights?range=${timeRange}`);
      if (response.data.success) {
        setInsights(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
      case 'down': return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
      default: return <div className="h-4 w-4 bg-gray-400 rounded-full"></div>;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 80) return 'text-green-600';
    if (efficiency >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityColor = (quality) => {
    if (quality >= 90) return 'text-green-600';
    if (quality >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="tws-loading-pulse rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Productivity Analytics</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="1d">Today</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      {/* Productivity Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.productivity.totalHours}h
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Hours</div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center mt-2">
            {getTrendIcon(trends.productivity)}
            <span className={`text-sm ml-1 ${getTrendColor(trends.productivity)}`}>
              {trends.productivity === 'up' ? '+12%' : trends.productivity === 'down' ? '-5%' : '0%'}
            </span>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.productivity.efficiency}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Efficiency</div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <LightBulbIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center mt-2">
            {getTrendIcon(trends.productivity)}
            <span className={`text-sm ml-1 ${getTrendColor(trends.productivity)}`}>
              {trends.productivity === 'up' ? '+8%' : trends.productivity === 'down' ? '-3%' : '0%'}
            </span>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.development.codeCommits}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Code Commits</div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center">
              <CodeBracketIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center mt-2">
            {getTrendIcon(trends.development)}
            <span className={`text-sm ml-1 ${getTrendColor(trends.development)}`}>
              {trends.development === 'up' ? '+15%' : trends.development === 'down' ? '-2%' : '0%'}
            </span>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.collaboration.teamContribution}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Team Contribution</div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex items-center mt-2">
            {getTrendIcon(trends.collaboration)}
            <span className={`text-sm ml-1 ${getTrendColor(trends.collaboration)}`}>
              {trends.collaboration === 'up' ? '+5%' : trends.collaboration === 'down' ? '-1%' : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productivity Breakdown */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2 text-blue-600" />
            Productivity Breakdown
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Productive Hours</span>
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {analytics.productivity.productiveHours}h
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-accent-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Focus Time</span>
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {analytics.productivity.focusTime}h
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Break Time</span>
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                {analytics.productivity.breakTime}h
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <div 
                className="bg-gradient-to-r from-blue-500 to-accent-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${analytics.productivity.efficiency}%` }}
              ></div>
            </div>
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Overall Efficiency: <span className={`font-medium ${getEfficiencyColor(analytics.productivity.efficiency)}`}>
                {analytics.productivity.efficiency}%
              </span>
            </div>
          </div>
        </div>

        {/* Development Metrics */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <CodeBracketIcon className="h-5 w-5 mr-2 text-accent-600" />
            Development Metrics
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Lines of Code</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {analytics.development.linesOfCode.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Bugs Fixed</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {analytics.development.bugsFixed}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Features Completed</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {analytics.development.featuresCompleted}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Code Quality</span>
              <span className={`font-medium ${getQualityColor(analytics.development.codeQuality)}`}>
                {analytics.development.codeQuality}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Wellbeing Metrics */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <HeartIcon className="h-5 w-5 mr-2 text-pink-600" />
          Wellbeing Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.wellbeing.workLifeBalance}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Work-Life Balance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.wellbeing.stressLevel}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Stress Level</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.wellbeing.satisfaction}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Job Satisfaction</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.wellbeing.energyLevel}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Energy Level</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.wellbeing.motivation}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Motivation</div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <SparklesIcon className="h-5 w-5 mr-2 text-yellow-600" />
          AI-Powered Insights
        </h3>
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div key={index} className="p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <LightBulbIcon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white mb-1">
                    {insight.title}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {insight.description}
                  </div>
                  {insight.recommendation && (
                    <div className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                      💡 {insight.recommendation}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductivityAnalytics;
