import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tenantApiService } from '../../../../../../../shared/services/tenant/tenant-api.service';
import LoadingSpinner from '../../../../../../../shared/components/feedback/LoadingSpinner';
import ErrorState from '../../../../../../../shared/components/feedback/ErrorState';
import EmptyState from '../../../../../../../shared/components/feedback/EmptyState';

const ContractorDashboard = () => {
  const { tenantSlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await tenantApiService.getDashboardOverview(tenantSlug);
        setSummary(data || null);
      } catch (err) {
        setError(err?.message || 'Failed to load contractor dashboard');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [tenantSlug]);

  if (loading) return <LoadingSpinner message="Loading contractor dashboard..." className="min-h-[40vh] bg-transparent" />;
  if (error) return <ErrorState title="Contractor dashboard unavailable" message={error} />;
  if (!summary) return <EmptyState title="No dashboard data" message="No contractor data is available for this account yet." />;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contractor Dashboard</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        This view is wired to live tenant dashboard data and read-only worker apps.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500">Projects</p>
          <p className="text-xl font-semibold">{summary?.projects?.total ?? 0}</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500">Tasks</p>
          <p className="text-xl font-semibold">{summary?.tasks?.total ?? 0}</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500">Completion</p>
          <p className="text-xl font-semibold">{summary?.tasks?.completionRate ?? 0}%</p>
        </div>
      </div>
      <div className="flex gap-3">
        <Link to="../employee/attendance" className="text-blue-600 hover:text-blue-800 text-sm font-medium">Open Attendance</Link>
        <Link to="../employee/payroll" className="text-blue-600 hover:text-blue-800 text-sm font-medium">Open Payroll</Link>
      </div>
    </div>
  );
};

export default ContractorDashboard;
