import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../app/providers/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  DocumentArrowDownIcon,
  CalendarIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

const AttendanceReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('summary');
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState({
    department: '',
    status: '',
    riskLevel: ''
  });
  const [generatedReport, setGeneratedReport] = useState(null);

  useEffect(() => {
    fetchReports();
  }, [reportType, dateRange, filters]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('from', new Date(dateRange.from).toISOString());
      params.append('to', new Date(dateRange.to).toISOString());
      
      if (filters.department) params.append('department', filters.department);
      if (filters.status) params.append('status', filters.status);
      if (filters.riskLevel) params.append('riskLevel', filters.riskLevel);

      const response = await axios.get(`/api/attendance/analytics?${params}`);
      
      if (response.data.success) {
        setGeneratedReport(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format = 'csv') => {
    try {
      const params = new URLSearchParams();
      params.append('from', new Date(dateRange.from).toISOString());
      params.append('to', new Date(dateRange.to).toISOString());
      params.append('format', format);

      const response = await axios.get(`/api/attendance/export/enhanced?${params}`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-report-${dateRange.from}-to-${dateRange.to}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Failed to export report:', error);
      toast.error('Failed to export report');
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-100';
      case 'late': return 'text-yellow-600 bg-yellow-100';
      case 'absent': return 'text-red-600 bg-red-100';
      case 'half-day': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const reportTypes = [
    { id: 'summary', name: 'Summary Report', icon: ChartBarIcon },
    { id: 'detailed', name: 'Detailed Report', icon: DocumentArrowDownIcon },
    { id: 'security', name: 'Security Report', icon: ExclamationTriangleIcon },
    { id: 'analytics', name: 'Analytics Report', icon: ChartBarIcon }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="tws-loading-pulse rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Generate Report</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => exportReport('csv')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={() => exportReport('json')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export JSON
            </button>
          </div>
        </div>

        {/* Report Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {reportTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setReportType(type.id)}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  reportType === type.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <type.icon className="h-5 w-5 mb-1" />
                <div className="text-sm font-medium">{type.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">From Date</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">To Date</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <select
              value={filters.department}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Departments</option>
              <option value="engineering">Engineering</option>
              <option value="marketing">Marketing</option>
              <option value="sales">Sales</option>
              <option value="hr">Human Resources</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="half-day">Half Day</option>
              <option value="work-from-home">Work from Home</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Risk Level</label>
            <select
              value={filters.riskLevel}
              onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Risk Levels</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
              <option value="critical">Critical Risk</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {generatedReport && (
        <div className="space-y-6">
          {/* Summary Statistics */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Summary Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {generatedReport.statistics?.totalRecords || 0}
                </div>
                <div className="text-sm text-gray-500">Total Records</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {generatedReport.statistics?.avgDuration ? 
                    Math.round(generatedReport.statistics.avgDuration / 60 * 10) / 10 : 0}h
                </div>
                <div className="text-sm text-gray-500">Avg Hours/Day</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {generatedReport.statistics?.avgOvertime ? 
                    Math.round(generatedReport.statistics.avgOvertime / 60 * 10) / 10 : 0}h
                </div>
                <div className="text-sm text-gray-500">Avg Overtime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {generatedReport.statistics?.avgQualityScore ? 
                    Math.round(generatedReport.statistics.avgQualityScore) : 100}%
                </div>
                <div className="text-sm text-gray-500">Avg Quality Score</div>
              </div>
            </div>
          </div>

          {/* Risk Distribution */}
          {generatedReport.riskDistribution && (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(generatedReport.riskDistribution).map(([risk, count]) => (
                  <div key={risk} className="text-center p-4 border border-gray-200 rounded-lg">
                    <div className={`text-2xl font-bold ${getRiskColor(risk).split(' ')[0]}`}>
                      {count}
                    </div>
                    <div className="text-sm text-gray-500 capitalize">{risk} Risk</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Distribution */}
          {generatedReport.statusDistribution && (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Status Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(generatedReport.statusDistribution).map(([status, count]) => (
                  <div key={status} className="text-center p-4 border border-gray-200 rounded-lg">
                    <div className={`text-2xl font-bold ${getStatusColor(status).split(' ')[0]}`}>
                      {count}
                    </div>
                    <div className="text-sm text-gray-500 capitalize">
                      {status.replace('-', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suspicious Activities */}
          {generatedReport.suspiciousActivities && generatedReport.suspiciousActivities.length > 0 && (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Security Alerts</h3>
              <div className="space-y-3">
                {generatedReport.suspiciousActivities.slice(0, 10).map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-3 px-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(activity.date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {activity.securityFlags?.join(', ') || 'Security concern detected'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium px-2 py-1 rounded-full ${getRiskColor(activity.riskLevel)}`}>
                        {activity.riskLevel.toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {activity.qualityScore}% quality
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Report Table */}
          {reportType === 'detailed' && (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Detailed Records</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check In
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check Out
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Risk Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quality Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Mock data for demonstration */}
                    {Array.from({ length: 10 }, (_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          09:00 AM
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          17:30 PM
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          8h 30m
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor('present')}`}>
                            Present
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor('low')}`}>
                            Low
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          95%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Report Actions */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Report Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => exportReport('csv')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Download CSV
          </button>
          <button
            onClick={() => exportReport('json')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Download JSON
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Print Report
          </button>
          <button
            onClick={fetchReports}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Refresh Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceReports;
