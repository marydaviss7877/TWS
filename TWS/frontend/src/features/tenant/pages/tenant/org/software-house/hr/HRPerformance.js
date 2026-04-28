import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ChartBarIcon, 
  StarIcon,
  TrophyIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { tenantApiService } from '../../../../../../../shared/services/tenant/tenant-api.service';

const HRPerformance = () => {
  const { tenantSlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState([]);
  const [stats, setStats] = useState({
    averageRating: 0,
    reviewsDue: 0,
    topPerformers: 0,
    improvementPlans: 0
  });

  useEffect(() => {
    fetchPerformanceData();
  }, [tenantSlug]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const data = await tenantApiService.getPerformanceData(tenantSlug);
      const employees = data?.employees || data?.data?.employees || [];
      const overview = data?.stats || data?.data?.stats || {};
      setPerformanceData(employees);
      setStats({
        averageRating: Number(overview.averageRating || 0),
        reviewsDue: Number(overview.reviewsDue || 0),
        topPerformers: Number(overview.topPerformers || 0),
        improvementPlans: Number(overview.improvementPlans || 0)
      });
    } catch (err) {
      console.error('Error fetching performance data:', err);
      setPerformanceData([]);
      setStats({ averageRating: 0, reviewsDue: 0, topPerformers: 0, improvementPlans: 0 });
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    { label: 'Average Rating', value: stats.averageRating.toFixed(1), icon: StarIcon, iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600' },
    { label: 'Reviews Due', value: stats.reviewsDue.toString(), icon: ChartBarIcon, iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
    { label: 'Top Performers', value: stats.topPerformers.toString(), icon: TrophyIcon, iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600' },
    { label: 'Improvement Plans', value: stats.improvementPlans.toString(), icon: ArrowTrendingUpIcon, iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
            Performance Management
          </h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
            Track and manage employee performance reviews
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        {statsData.map((stat, index) => (
          <div key={index} className="glass-card-premium p-5 xl:p-6 hover-lift">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 xl:w-14 xl:h-14 rounded-2xl ${stat.iconBg} flex items-center justify-center shadow-glow-lg`}>
                <stat.icon className="w-6 h-6 xl:w-7 xl:h-7 text-white" />
              </div>
              <div>
                <p className="text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {stat.label}
                </p>
                <p className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Overview */}
      <div className="glass-card-premium p-6 xl:p-8 hover-glow">
        <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6">
          Recent Performance Reviews
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Employee</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Department</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Rating</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Last Review</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Next Review</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {performanceData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center">
                    <ChartBarIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No performance data available</p>
                  </td>
                </tr>
              ) : (
                performanceData.map((employee, index) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
                          <span className="text-white font-bold text-sm">{employee.name.charAt(0)}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{employee.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{employee.department}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <StarIcon className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{employee.rating}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{employee.lastReview}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{employee.nextReview}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {employee.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium">
                        View Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6">
            Performance Distribution
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Excellent (4.5+)', value: 45, color: 'bg-green-500' },
              { label: 'Very Good (4.0-4.4)', value: 30, color: 'bg-blue-500' },
              { label: 'Good (3.5-3.9)', value: 20, color: 'bg-amber-500' },
              { label: 'Needs Improvement (<3.5)', value: 5, color: 'bg-red-500' }
            ].map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{item.value}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${item.color} transition-all duration-300`}
                    style={{ width: `${item.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-6">
            Upcoming Reviews
          </h3>
          <div className="space-y-3">
            {[
              { name: 'Alice Cooper', date: '2024-02-01', type: 'Quarterly' },
              { name: 'Bob Martinez', date: '2024-02-05', type: 'Annual' },
              { name: 'Carol White', date: '2024-02-10', type: 'Quarterly' }
            ].map((review, index) => (
              <div key={index} className="glass-card p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{review.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{review.type} Review</p>
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400">{review.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRPerformance;

