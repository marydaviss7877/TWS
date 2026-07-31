import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../app/providers/AuthContext';
import axios from 'axios';
import {
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  StarIcon,
  CpuChipIcon,
  RocketLaunchIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Button } from '../../../components/ui/Button/Button';
import { cn } from '../../../lib/utils';

const WorkforceAnalyticsDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [workforceMetrics, setWorkforceMetrics] = useState(null);
  const [activeView, setActiveView] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('quarter');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  useEffect(() => {
    fetchWorkforceAnalytics();
  }, [selectedPeriod, selectedDepartment]);

  const fetchWorkforceAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/payroll/ai/optimize');
      setAnalyticsData(response.data.data);
      setWorkforceMetrics(response.data.data.currentCosts);
    } catch (err) {
      setError('Unable to load workforce data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const formatPercentage = (value) => `${(value * 100).toFixed(1)}%`;

  // Metric card icon background variants — static classes so Tailwind includes them
  const iconBgVariants = {
    blue: 'bg-primary-500',
    green: 'bg-success',
    purple: 'bg-accent',
    neutral: 'bg-muted',
  };

  // Change indicator colors
  const changeColors = {
    increase: 'text-green-700',
    decrease: 'text-destructive',
    neutral: 'text-muted-foreground',
  };

  const MetricCard = ({ title, value, change, changeType = 'neutral', icon: Icon, iconVariant = 'blue', subtitle, trend }) => (
    <div className="bg-white rounded-xl border border-border shadow-sm p-6">
      <div className="flex items-start gap-4">
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0', iconBgVariants[iconVariant] ?? 'bg-muted')}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground font-medium truncate">{title}</p>
          <p className="text-2xl font-semibold text-foreground mt-0.5">{value}</p>
          {change && (
            <p className={cn('text-xs font-medium mt-0.5 flex items-center gap-1', changeColors[changeType])}>
              {changeType === 'increase' && <ArrowTrendingUpIcon className="h-3.5 w-3.5" />}
              {changeType === 'decrease' && <ArrowTrendingDownIcon className="h-3.5 w-3.5" />}
              {change}
            </p>
          )}
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Trend</span>
            <span className={cn('text-xs font-medium', trend > 0 ? 'text-green-700' : 'text-destructive')}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', trend > 0 ? 'bg-green-500' : 'bg-destructive')}
              style={{ width: `${Math.min(Math.abs(trend), 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

  const TABS = [
    { id: 'overview',      label: 'Overview',      icon: ChartBarIcon },
    { id: 'productivity',  label: 'Productivity',  icon: ArrowTrendingUpIcon },
    { id: 'compensation',  label: 'Compensation',  icon: CurrencyDollarIcon },
    { id: 'retention',     label: 'Retention',     icon: ShieldCheckIcon },
    { id: 'predictions',   label: 'AI Predictions', icon: CpuChipIcon },
    { id: 'optimization',  label: 'Optimization',  icon: RocketLaunchIcon },
  ];

  // Activity type config — static so Tailwind keeps these classes
  const activityConfig = {
    hire:        { label: (name, dept) => `${name} joined ${dept}`,         iconClass: 'text-green-700 bg-green-50',  Icon: UsersIcon },
    promotion:   { label: (name, dept) => `${name} was promoted in ${dept}`, iconClass: 'text-primary-600 bg-primary-50', Icon: ArrowTrendingUpIcon },
    resignation: { label: (name, dept) => `${name} left ${dept}`,           iconClass: 'text-destructive bg-red-50',  Icon: ArrowTrendingDownIcon },
    performance: { label: (name, dept) => `${name} received a performance review`, iconClass: 'text-amber-700 bg-amber-50', Icon: StarIcon },
  };

  const recentActivities = [
    { type: 'hire',        name: 'Sarah Johnson',  department: 'Engineering', time: '2 hours ago' },
    { type: 'promotion',   name: 'Michael Chen',   department: 'Sales',       time: '1 day ago'   },
    { type: 'resignation', name: 'Alex Rodriguez', department: 'Marketing',   time: '3 days ago'  },
    { type: 'performance', name: 'Emma Davis',     department: 'Operations',  time: '1 week ago'  },
  ];

  // Chart color palette tied to brand tokens (hex equivalents of CSS vars for Chart.js)
  const chartColors = {
    primary:  'rgba(30, 64, 175, 0.8)',     // --primary
    success:  'rgba(22, 163, 74, 0.8)',     // --success
    accent:   'rgba(59, 130, 246, 0.8)',    // --accent
    warning:  'rgba(217, 119, 6, 0.8)',     // --warning
    neutral:  'rgba(107, 114, 128, 0.8)',   // gray-500
    destructive: 'rgba(220, 38, 38, 0.8)', // --destructive
  };

  // --- Loading ---
  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-border" />
            <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent tws-loading-pulse" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Analyzing workforce data</p>
            <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  // --- Error ---
  if (error) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="bg-white rounded-xl border border-border shadow-sm p-8 max-w-md text-center space-y-4">
          <ExclamationTriangleIcon className="h-10 w-10 text-destructive mx-auto" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Failed to load data</h2>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button onClick={fetchWorkforceAnalytics}>Try again</Button>
        </div>
      </div>
    );
  }

  // --- Empty ---
  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="bg-white rounded-xl border border-border shadow-sm p-8 max-w-md text-center space-y-4">
          <ChartBarIcon className="h-10 w-10 text-muted-foreground mx-auto" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">No workforce data</h2>
            <p className="text-sm text-muted-foreground mt-1">Data will appear here once your workforce is set up.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Workforce Intelligence</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Analytics for workforce optimization and strategic planning
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <UsersIcon className="h-4 w-4" />
                  {workforceMetrics?.headcount?.total ?? 0} employees
                </span>
                <span className="flex items-center gap-1.5">
                  <CurrencyDollarIcon className="h-4 w-4" />
                  {formatCurrency(workforceMetrics?.compensation?.totalPayroll)} total payroll
                </span>
                <span className="flex items-center gap-1.5">
                  <ArrowTrendingUpIcon className="h-4 w-4" />
                  {formatPercentage(workforceMetrics?.productivity?.utilizationRate ?? 0)} utilization
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="h-9 rounded-md border border-border bg-white px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <option value="month">This month</option>
                <option value="quarter">This quarter</option>
                <option value="year">This year</option>
                <option value="ytd">Year to date</option>
              </select>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="h-9 rounded-md border border-border bg-white px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <option value="all">All departments</option>
                <option value="engineering">Engineering</option>
                <option value="sales">Sales</option>
                <option value="marketing">Marketing</option>
                <option value="operations">Operations</option>
                <option value="support">Support</option>
              </select>
              <Button variant="outline" size="sm">
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-1.5 flex flex-wrap gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                activeView === id
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total employees"
                value={workforceMetrics?.headcount?.total ?? 0}
                change="+5 this quarter"
                changeType="increase"
                icon={UsersIcon}
                iconVariant="blue"
                subtitle="Active workforce"
                trend={8.2}
              />
              <MetricCard
                title="Average salary"
                value={formatCurrency(workforceMetrics?.compensation?.averageSalary)}
                change="+12% YoY"
                changeType="increase"
                icon={CurrencyDollarIcon}
                iconVariant="green"
                subtitle="Market competitive"
                trend={12.5}
              />
              <MetricCard
                title="Utilization rate"
                value={formatPercentage(workforceMetrics?.productivity?.utilizationRate ?? 0)}
                change="+3.2 pts"
                changeType="increase"
                icon={ChartBarIcon}
                iconVariant="purple"
                subtitle="Billable efficiency"
                trend={3.2}
              />
              <MetricCard
                title="Retention rate"
                value={`${workforceMetrics?.retention?.retentionRate?.toFixed(1) ?? 0}%`}
                change="-1.5 pts"
                changeType="decrease"
                icon={ShieldCheckIcon}
                iconVariant="neutral"
                subtitle="Employee satisfaction"
                trend={-1.5}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-border shadow-sm p-6">
                <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BuildingOfficeIcon className="h-5 w-5 text-muted-foreground" />
                  Headcount by department
                </h2>
                <div className="h-60">
                  <Bar
                    data={{
                      labels: ['Engineering', 'Sales', 'Marketing', 'Operations', 'Support'],
                      datasets: [{
                        label: 'Headcount',
                        data: [45, 25, 20, 15, 20],
                        backgroundColor: [
                          chartColors.primary,
                          chartColors.success,
                          chartColors.warning,
                          chartColors.accent,
                          chartColors.neutral,
                        ],
                        borderWidth: 0,
                        borderRadius: 4,
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 10 } },
                      },
                    }}
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-border shadow-sm p-6">
                <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <StarIcon className="h-5 w-5 text-muted-foreground" />
                  Performance distribution
                </h2>
                <div className="h-60">
                  <Doughnut
                    data={{
                      labels: ['Top', 'High', 'Average', 'Below average', 'Needs improvement'],
                      datasets: [{
                        data: [15, 35, 35, 12, 3],
                        backgroundColor: [
                          chartColors.success,
                          chartColors.primary,
                          chartColors.accent,
                          chartColors.warning,
                          chartColors.neutral,
                        ],
                        borderWidth: 2,
                        borderColor: '#ffffff',
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { padding: 16, usePointStyle: true, font: { size: 12 } },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-border shadow-sm p-6">
              <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-muted-foreground" />
                Recent workforce activity
              </h2>
              {recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
              ) : (
                <ul className="space-y-2">
                  {recentActivities.map((activity, index) => {
                    const cfg = activityConfig[activity.type];
                    if (!cfg) return null;
                    return (
                      <li key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0', cfg.iconClass)}>
                          <cfg.Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground">{cfg.label(activity.name, activity.department)}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                        <button
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          aria-label={`View details for ${activity.name}`}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Productivity */}
        {activeView === 'productivity' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Billable hours"
                value="8,500"
                change="+320 vs last month"
                changeType="increase"
                icon={ClockIcon}
                iconVariant="blue"
                subtitle="This month"
              />
              <MetricCard
                title="Revenue / employee"
                value={formatCurrency(185000)}
                change="+8% YoY"
                changeType="increase"
                icon={CurrencyDollarIcon}
                iconVariant="green"
                subtitle="Annual rate"
              />
              <MetricCard
                title="Efficiency score"
                value="85%"
                change="+5 pts"
                changeType="increase"
                icon={ArrowTrendingUpIcon}
                iconVariant="purple"
                subtitle="Above target"
              />
              <MetricCard
                title="On-time delivery"
                value="96%"
                change="+2 pts"
                changeType="increase"
                icon={CheckCircleIcon}
                iconVariant="neutral"
                subtitle="Project completion"
              />
            </div>

            <div className="bg-white rounded-xl border border-border shadow-sm p-6">
              <h2 className="text-base font-semibold text-foreground mb-4">Productivity trends</h2>
              <div className="h-72">
                <Line
                  data={{
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [
                      {
                        label: 'Billable hours',
                        data: [7800, 8100, 8300, 8200, 8400, 8500],
                        borderColor: 'rgb(30, 64, 175)',
                        backgroundColor: 'rgba(30, 64, 175, 0.08)',
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y',
                      },
                      {
                        label: 'Efficiency score',
                        data: [78, 82, 85, 83, 87, 85],
                        borderColor: 'rgb(22, 163, 74)',
                        backgroundColor: 'rgba(22, 163, 74, 0.08)',
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1',
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { legend: { position: 'top' } },
                    scales: {
                      y:  { type: 'linear', display: true, position: 'left' },
                      y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Placeholder for remaining tabs */}
        {['compensation', 'retention', 'predictions', 'optimization'].includes(activeView) && (
          <div className="bg-white rounded-xl border border-border shadow-sm p-12 text-center">
            <ChartBarIcon className="h-10 w-10 text-muted-foreground mx-auto" />
            <h2 className="text-base font-semibold text-foreground mt-4 capitalize">{activeView}</h2>
            <p className="text-sm text-muted-foreground mt-1">This section is coming soon.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default WorkforceAnalyticsDashboard;
