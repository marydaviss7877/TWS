import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  UsersIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  DocumentChartBarIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import ErrorState from '../../../../../../shared/components/feedback/ErrorState';
import EmptyState from '../../../../../../shared/components/feedback/EmptyState';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const AnalyticsOverview = () => {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await tenantApiService.getAnalyticsOverview(tenantSlug);
        if (!cancelled) setData(res?.data ?? res);
      } catch (err) {
        if (!cancelled) {
          console.error('Analytics overview fetch error:', err);
          setError(err.message || 'Failed to load analytics');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (tenantSlug) fetchAnalytics();
    return () => { cancelled = true; };
  }, [tenantSlug]);

  const countItems = (arr) => (Array.isArray(arr) ? arr.reduce((sum, i) => sum + (Number(i.count) || 0), 0) : 0);
  const totalUsers = data?.users ? (countItems(data.users.byRole) || countItems(data.users.byDepartment)) : 0;
  const totalProjects = data?.projects?.byStatus ? countItems(data.projects.byStatus) : 0;
  const totalTasks = data?.tasks?.byStatus ? countItems(data.tasks.byStatus) : 0;
  const financialTotal = data?.financial?.byType?.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0) ?? 0;

  // Chart data: normalize _id for display
  const usersByRole = (data?.users?.byRole || []).map((i) => ({ name: String(i._id || 'Unknown'), value: Number(i.count) || 0 }));
  const usersByDept = (data?.users?.byDepartment || []).map((i) => ({ name: String(i._id || 'Unassigned'), count: Number(i.count) || 0 }));
  const projectsByStatus = (data?.projects?.byStatus || []).map((i) => ({ name: String(i._id || 'Unknown'), count: Number(i.count) || 0 }));
  const projectsMonthly = (data?.projects?.monthlyTrend || []).map((i) => ({
    month: i._id ? `${i._id.year}-${String(i._id.month).padStart(2, '0')}` : '',
    count: Number(i.count) || 0,
  }));
  const tasksByStatus = (data?.tasks?.byStatus || []).map((i) => ({ name: String(i._id || 'Unknown'), value: Number(i.count) || 0 }));
  const tasksByPriority = (data?.tasks?.byPriority || []).map((i) => ({ name: String(i._id || 'Unknown'), count: Number(i.count) || 0 }));
  const financialByType = (data?.financial?.byType || []).map((i) => ({ name: String(i._id || 'Unknown'), amount: Number(i.totalAmount) || 0 }));

  const hasAnyData = totalUsers > 0 || totalProjects > 0 || totalTasks > 0 || (financialTotal !== 0 && !Number.isNaN(financialTotal));

  if (loading) {
    return <LoadingSpinner message="Loading analytics..." className="min-h-[40vh] bg-transparent" />;
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics Overview</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive analytics and insights for your organization
          </p>
        </div>
        <button
         
          type="button"
          onClick={() => navigate(`/${tenantSlug}/org/analytics/reports`)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
        >
          <DocumentChartBarIcon className="w-4 h-4" />
          View reports
          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
        </button>
      </div>

      {error && <ErrorState title="Analytics unavailable" message={error} className="max-w-xl" />}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
              <UsersIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Users</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{totalUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <ClipboardDocumentListIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Projects</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{totalProjects}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
              <CheckCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tasks</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{totalTasks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/40">
              <CurrencyDollarIcon className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Financial (total)</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {typeof financialTotal === 'number' ? financialTotal.toLocaleString() : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 1: Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Users by Role</h2>
          {usersByRole.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={usersByRole}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {usersByRole.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 py-8 text-center">No user data</p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Users by Department</h2>
          {usersByDept.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={usersByDept} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-600" />
                <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} />
                <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--tw-bg-opacity)', borderRadius: 8 }} />
                <Bar dataKey="count" fill="#6366f1" name="Users" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 py-8 text-center">No department data</p>
          )}
        </div>
      </div>

      {/* Charts row 2: Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Projects by Status</h2>
          {projectsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={projectsByStatus} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-600" />
                <XAxis type="number" tick={{ fill: 'currentColor', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fill: 'currentColor', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#22c55e" name="Projects" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 py-8 text-center">No project data</p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Projects Over Time</h2>
          {projectsMonthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={projectsMonthly} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-600" />
                <XAxis dataKey="month" tick={{ fill: 'currentColor', fontSize: 11 }} />
                <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} name="Projects" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 py-8 text-center">No trend data</p>
          )}
        </div>
      </div>

      {/* Charts row 3: Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Tasks by Status</h2>
          {tasksByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={tasksByStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {tasksByStatus.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 py-8 text-center">No task data</p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Tasks by Priority</h2>
          {tasksByPriority.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={tasksByPriority} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-600" />
                <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} />
                <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" name="Tasks" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 py-8 text-center">No priority data</p>
          )}
        </div>
      </div>

      {/* Financial */}
      <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Financial by Type</h2>
        {financialByType.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={financialByType} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-600" />
              <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} />
              <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'Amount']} />
              <Bar dataKey="amount" fill="#06b6d4" name="Amount" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 py-8 text-center">No financial data</p>
        )}
      </div>

      {!hasAnyData && !error && (
        <EmptyState
          title="No analytics data yet"
          message="Data will appear as you add users, projects, tasks, and financial records."
          className="max-w-2xl mx-auto"
        />
      )}
    </div>
  );
};

export default AnalyticsOverview;
