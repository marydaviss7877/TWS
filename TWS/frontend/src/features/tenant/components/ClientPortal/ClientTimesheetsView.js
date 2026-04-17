import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { clientPortalApi } from './clientPortalApi';

const ClientTimesheetsView = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [range, setRange] = useState('30d');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      setError('');
      try {
        const projectList = await clientPortalApi.getProjects();
        const safeProjects = Array.isArray(projectList) ? projectList : [];
        setProjects(safeProjects);
        if (safeProjects.length) {
          setSelectedProjectId(safeProjects[0]._id);
        }
      } catch (err) {
        setError(err?.message || 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    const loadSummary = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await clientPortalApi.getTimesheetSummary(selectedProjectId, range);
        setSummary(data || null);
      } catch (err) {
        setError(err?.message || 'Failed to load timesheet summary');
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
  }, [selectedProjectId, range]);

  const selectedProject = useMemo(
    () => projects.find((project) => String(project._id) === String(selectedProjectId)),
    [projects, selectedProjectId]
  );

  if (loading && !summary && !projects.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Timesheets</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Read-only hours visibility for your assigned projects.
          </p>
        </div>
        <Link to="../" className="text-sm text-blue-600 hover:text-blue-800">Back to Apps</Link>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800"
        >
          {projects.map((project) => (
            <option key={project._id} value={project._id}>{project.name}</option>
          ))}
        </select>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {summary ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <MetricCard label="Project" value={selectedProject?.name || '-'} />
            <MetricCard label="Total Hours" value={summary.totals?.totalHours?.toFixed?.(2) || '0.00'} />
            <MetricCard label="Billable Hours" value={summary.totals?.billableHours?.toFixed?.(2) || '0.00'} />
            <MetricCard label="Non-Billable Hours" value={summary.totals?.nonBillableHours?.toFixed?.(2) || '0.00'} />
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Hours By Team Member</h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {(summary.byMember || []).map((row) => (
                <div key={row.memberId} className="px-4 py-3 flex items-center justify-between text-sm">
                  <span className="text-gray-800 dark:text-gray-200">{row.memberName}</span>
                  <span className="text-gray-600 dark:text-gray-300">{row.totalHours.toFixed(2)} h</span>
                </div>
              ))}
              {!summary.byMember?.length ? (
                <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">No timesheet entries for selected range.</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const MetricCard = ({ label, value }) => (
  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
  </div>
);

export default ClientTimesheetsView;
