import React, { useState, useEffect } from 'react';
import { 
  FireIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  HomeIcon,
  DevicePhoneMobileIcon,
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const AttendanceHeatmap = ({ timeRange, filters }) => {
  const [heatmapData, setHeatmapData] = useState({
    hourly: [],
    daily: [],
    weekly: [],
    monthly: [],
    byLocation: [],
    byDepartment: []
  });

  const [selectedView, setSelectedView] = useState('hourly');
  const [selectedMetric, setSelectedMetric] = useState('attendance');

  useEffect(() => {
    fetchHeatmapData();
  }, [timeRange, filters, selectedView]);

  const fetchHeatmapData = async () => {
    try {
      // Simulate API call - replace with actual endpoint
      const mockData = {
        hourly: [
          { hour: '6 AM', attendance: 15, productivity: 20, engagement: 18 },
          { hour: '7 AM', attendance: 25, productivity: 30, engagement: 25 },
          { hour: '8 AM', attendance: 45, productivity: 50, engagement: 40 },
          { hour: '9 AM', attendance: 85, productivity: 80, engagement: 75 },
          { hour: '10 AM', attendance: 95, productivity: 90, engagement: 85 },
          { hour: '11 AM', attendance: 90, productivity: 85, engagement: 80 },
          { hour: '12 PM', attendance: 70, productivity: 60, engagement: 65 },
          { hour: '1 PM', attendance: 60, productivity: 55, engagement: 50 },
          { hour: '2 PM', attendance: 85, productivity: 80, engagement: 75 },
          { hour: '3 PM', attendance: 90, productivity: 85, engagement: 80 },
          { hour: '4 PM', attendance: 85, productivity: 80, engagement: 75 },
          { hour: '5 PM', attendance: 75, productivity: 70, engagement: 65 },
          { hour: '6 PM', attendance: 45, productivity: 40, engagement: 35 },
          { hour: '7 PM', attendance: 25, productivity: 20, engagement: 15 },
          { hour: '8 PM', attendance: 15, productivity: 10, engagement: 8 }
        ],
        daily: [
          { day: 'Monday', attendance: 85, productivity: 80, engagement: 75 },
          { day: 'Tuesday', attendance: 92, productivity: 88, engagement: 85 },
          { day: 'Wednesday', attendance: 88, productivity: 85, engagement: 80 },
          { day: 'Thursday', attendance: 90, productivity: 87, engagement: 82 },
          { day: 'Friday', attendance: 82, productivity: 78, engagement: 75 },
          { day: 'Saturday', attendance: 25, productivity: 20, engagement: 15 },
          { day: 'Sunday', attendance: 15, productivity: 10, engagement: 8 }
        ],
        weekly: [
          { week: 'Week 1', attendance: 87, productivity: 82, engagement: 78 },
          { week: 'Week 2', attendance: 89, productivity: 85, engagement: 81 },
          { week: 'Week 3', attendance: 85, productivity: 80, engagement: 76 },
          { week: 'Week 4', attendance: 91, productivity: 87, engagement: 83 }
        ],
        monthly: [
          { month: 'Jan', attendance: 88, productivity: 83, engagement: 79 },
          { month: 'Feb', attendance: 85, productivity: 80, engagement: 76 },
          { month: 'Mar', attendance: 90, productivity: 86, engagement: 82 },
          { month: 'Apr', attendance: 87, productivity: 84, engagement: 80 },
          { month: 'May', attendance: 89, productivity: 85, engagement: 81 },
          { month: 'Jun', attendance: 86, productivity: 82, engagement: 78 }
        ],
        byLocation: [
          { location: 'Headquarters', attendance: 89, productivity: 85, engagement: 82 },
          { location: 'Branch Office 1', attendance: 82, productivity: 78, engagement: 75 },
          { location: 'Branch Office 2', attendance: 85, productivity: 81, engagement: 78 },
          { location: 'Remote', attendance: 87, productivity: 83, engagement: 80 }
        ],
        byDepartment: [
          { department: 'Engineering', attendance: 92, productivity: 89, engagement: 86 },
          { department: 'Marketing', attendance: 85, productivity: 82, engagement: 79 },
          { department: 'Sales', attendance: 88, productivity: 85, engagement: 82 },
          { department: 'HR', attendance: 90, productivity: 87, engagement: 84 },
          { department: 'Finance', attendance: 87, productivity: 84, engagement: 81 }
        ]
      };

      setHeatmapData(mockData);
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
    }
  };

  const getIntensityColor = (value, maxValue = 100) => {
    const intensity = value / maxValue;
    if (intensity >= 0.9) return 'bg-gray-900 text-white';
    if (intensity >= 0.8) return 'bg-gray-800 text-white';
    if (intensity >= 0.7) return 'bg-gray-700 text-white';
    if (intensity >= 0.6) return 'bg-gray-600 text-white';
    if (intensity >= 0.5) return 'bg-gray-500 text-white';
    if (intensity >= 0.4) return 'bg-gray-400 text-white';
    if (intensity >= 0.3) return 'bg-gray-300 text-gray-900';
    if (intensity >= 0.2) return 'bg-gray-200 text-gray-900';
    if (intensity >= 0.1) return 'bg-gray-100 text-gray-900';
    return 'bg-gray-50 text-gray-900';
  };

  const getMetricIcon = (metric) => {
    switch (metric) {
      case 'attendance': return <UserGroupIcon className="h-4 w-4" />;
      case 'productivity': return <ChartBarIcon className="h-4 w-4" />;
      case 'engagement': return <FireIcon className="h-4 w-4" />;
      default: return <ClockIcon className="h-4 w-4" />;
    }
  };

  const getViewIcon = (view) => {
    switch (view) {
      case 'hourly': return <ClockIcon className="h-4 w-4" />;
      case 'daily': return <CalendarIcon className="h-4 w-4" />;
      case 'weekly': return <CalendarIcon className="h-4 w-4" />;
      case 'monthly': return <CalendarIcon className="h-4 w-4" />;
      case 'byLocation': return <MapPinIcon className="h-4 w-4" />;
      case 'byDepartment': return <BuildingOfficeIcon className="h-4 w-4" />;
      default: return <ChartBarIcon className="h-4 w-4" />;
    }
  };

  const renderHeatmapGrid = (data, maxValue = 100) => {
    return (
      <div className="grid gap-1">
        {data.map((item, index) => (
          <div
            key={index}
            className={`p-2 rounded text-center text-xs font-medium ${getIntensityColor(item[selectedMetric], maxValue)}`}
            title={`${item[selectedMetric]}% ${selectedMetric}`}
          >
            {item[selectedMetric]}%
          </div>
        ))}
      </div>
    );
  };

  const renderHeatmapWithLabels = (data, maxValue = 100) => {
    return (
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="w-20 text-xs text-gray-600 text-right">
              {item.hour || item.day || item.week || item.month || item.location || item.department}
            </div>
            <div className="flex-1">
              <div className="flex space-x-1">
                <div
                  className={`h-6 flex-1 rounded text-center text-xs font-medium flex items-center justify-center ${getIntensityColor(item[selectedMetric], maxValue)}`}
                >
                  {item[selectedMetric]}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Attendance Heatmap</h2>
          <p className="text-sm text-gray-600">Visual representation of attendance patterns and trends</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchHeatmapData}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-4">
        {/* View Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">View:</span>
          <select
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-700"
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="byLocation">By Location</option>
            <option value="byDepartment">By Department</option>
          </select>
        </div>

        {/* Metric Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Metric:</span>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-700"
          >
            <option value="attendance">Attendance</option>
            <option value="productivity">Productivity</option>
            <option value="engagement">Engagement</option>
          </select>
        </div>
      </div>

      {/* Heatmap Visualization */}
      <div className="border border-gray-200 rounded p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">
            {selectedView.charAt(0).toUpperCase() + selectedView.slice(1)} {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Heatmap
          </h3>
          <div className="flex items-center space-x-2">
            {getMetricIcon(selectedMetric)}
            <span className="text-xs text-gray-600">{selectedMetric}</span>
          </div>
        </div>

        <div className="mb-4">
          {selectedView === 'hourly' && renderHeatmapWithLabels(heatmapData.hourly)}
          {selectedView === 'daily' && renderHeatmapWithLabels(heatmapData.daily)}
          {selectedView === 'weekly' && renderHeatmapWithLabels(heatmapData.weekly)}
          {selectedView === 'monthly' && renderHeatmapWithLabels(heatmapData.monthly)}
          {selectedView === 'byLocation' && renderHeatmapWithLabels(heatmapData.byLocation)}
          {selectedView === 'byDepartment' && renderHeatmapWithLabels(heatmapData.byDepartment)}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Low</span>
          <div className="flex space-x-1">
            <div className="w-4 h-4 bg-gray-100 rounded"></div>
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
            <div className="w-4 h-4 bg-gray-300 rounded"></div>
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <div className="w-4 h-4 bg-gray-500 rounded"></div>
            <div className="w-4 h-4 bg-gray-600 rounded"></div>
            <div className="w-4 h-4 bg-gray-700 rounded"></div>
            <div className="w-4 h-4 bg-gray-800 rounded"></div>
            <div className="w-4 h-4 bg-gray-900 rounded"></div>
          </div>
          <span>High</span>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Peak Hours */}
        <div className="border border-gray-200 rounded p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Peak Hours Analysis</h3>
          <div className="space-y-2">
            {[...heatmapData.hourly]
              .sort((a, b) => b[selectedMetric] - a[selectedMetric])
              .slice(0, 5)
              .map((hour, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 text-gray-600 mr-2" />
                    <span className="text-sm font-medium text-gray-900">{hour.hour}</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{hour[selectedMetric]}%</div>
                </div>
              ))}
          </div>
        </div>

        {/* Performance Summary */}
        <div className="border border-gray-200 rounded p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Performance Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average {selectedMetric}</span>
              <span className="text-sm font-semibold text-gray-900">
                {Math.round(
                  heatmapData[selectedView].reduce((sum, item) => sum + item[selectedMetric], 0) /
                  heatmapData[selectedView].length
                )}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Peak {selectedMetric}</span>
              <span className="text-sm font-semibold text-gray-900">
                {Math.max(...heatmapData[selectedView].map(item => item[selectedMetric]))}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Lowest {selectedMetric}</span>
              <span className="text-sm font-semibold text-gray-900">
                {Math.min(...heatmapData[selectedView].map(item => item[selectedMetric]))}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="border border-gray-200 rounded p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-4">AI Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded">
            <div className="flex items-center mb-2">
              <FireIcon className="h-4 w-4 text-gray-600 mr-2" />
              <span className="text-sm font-medium text-gray-900">Optimize Peak Hours</span>
            </div>
            <p className="text-xs text-gray-700">
              Schedule important meetings during peak productivity hours (10 AM - 2 PM) for maximum engagement.
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <div className="flex items-center mb-2">
              <ChartBarIcon className="h-4 w-4 text-gray-600 mr-2" />
              <span className="text-sm font-medium text-gray-900">Address Low Periods</span>
            </div>
            <p className="text-xs text-gray-700">
              Implement flexible scheduling during low-attendance periods to maintain productivity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceHeatmap;
