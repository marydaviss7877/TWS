/**
 * NucleusAnalyticsPage
 * Nucleus Project OS - Workspace/project analytics: at-risk deliverables, status summary, project count
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChartBarIcon,
  FlagIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import tenantProjectApiService from './services/tenantProjectApiService';
import DeliverableCardSkeleton from './components/deliverables/DeliverableCardSkeleton';
import ProjectSelector from './components/ProjectSelector';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
);

const STATUS_LABELS = {
  created: 'Created',
  in_dev: 'In Development',
  ready_approval: 'Ready for Approval',
  approved: 'Approved',
  shipped: 'Shipped',
  in_rework: 'In Rework'
};

const NucleusAnalyticsPage = () => {
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectIdFilter = searchParams.get('projectId') || '';
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [chartsLoading, setChartsLoading] = useState(false);

  useEffect(() => {
    if (!tenantSlug) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [projRes, delivRes] = await Promise.all([
          tenantProjectApiService.getProjects(tenantSlug, { limit: 1000 }),
          tenantProjectApiService.getDeliverables(tenantSlug, {})
        ]);

        if (cancelled) return;

        const projList = projRes?.data ?? projRes ?? [];
        const projArray = Array.isArray(projList) ? projList : [];
        setProjects(projArray);

        const delivList = delivRes?.data ?? delivRes ?? [];
        const delivArray = Array.isArray(delivList) ? delivList : [];
        setDeliverables(delivArray);
      } catch (err) {
        console.error('Nucleus analytics load error:', err);
        if (!cancelled) {
          setProjects([]);
          setDeliverables([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [tenantSlug]);

  // Load sprint velocity data when a project is selected
  useEffect(() => {
    if (!projectIdFilter || !tenantSlug) return;
    let cancelled = false;
    const loadCharts = async () => {
      setChartsLoading(true);
      try {
        const sprintRes = await tenantProjectApiService.getProjectSprints(tenantSlug, projectIdFilter);
        if (!cancelled) {
          const sprintList = sprintRes?.data ?? sprintRes ?? [];
          setSprints(Array.isArray(sprintList) ? sprintList : []);
        }
      } catch (err) {
        console.error('Chart data load error:', err);
        if (!cancelled) setSprints([]);
      } finally {
        if (!cancelled) setChartsLoading(false);
      }
    };
    loadCharts();
    return () => { cancelled = true; };
  }, [projectIdFilter, tenantSlug]);

  const filteredDeliverables = useMemo(() => {
    if (!projectIdFilter) return deliverables;
    return deliverables.filter(
      (d) => (d.project_id?._id || d.project_id?.id || d.project_id) === projectIdFilter
    );
  }, [deliverables, projectIdFilter]);

  const atRisk = useMemo(() => {
    const now = new Date();
    return filteredDeliverables.filter((d) => {
      if (!d.target_date || ['approved', 'shipped'].includes(d.status)) return false;
      const target = new Date(d.target_date);
      const daysLeft = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
      const progress = d.progress_percentage ?? 0;
      return daysLeft <= 7 && daysLeft >= -14 && progress < 80;
    });
  }, [filteredDeliverables]);

  const byStatus = useMemo(() => {
    const counts = {};
    filteredDeliverables.forEach((d) => {
      const s = d.status || 'created';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [filteredDeliverables]);

  const velocityChartData = useMemo(() => {
    const completedSprints = sprints.filter(s => s.status === 'completed' && s.velocity != null);
    return {
      labels: completedSprints.map(s => s.name || `Sprint ${s._id?.slice(-4)}`),
      datasets: [{
        label: 'Velocity (story points)',
        data: completedSprints.map(s => s.velocity || 0),
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1
      }]
    };
  }, [sprints]);

  const burndownChartData = useMemo(() => {
    // Build a simple deliverable-based burndown (shipped deliverables over time)
    const shipped = filteredDeliverables
      .filter(d => d.status === 'shipped' && d.shipped_at)
      .sort((a, b) => new Date(a.shipped_at) - new Date(b.shipped_at));

    let remaining = filteredDeliverables.length;
    const labels = [];
    const data = [remaining];

    shipped.forEach(d => {
      labels.push(new Date(d.shipped_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      remaining -= 1;
      data.push(remaining);
    });

    return {
      labels: ['Start', ...labels],
      datasets: [{
        label: 'Remaining Deliverables',
        data,
        borderColor: 'rgba(239, 68, 68, 1)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.3
      }]
    };
  }, [filteredDeliverables]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
        <DeliverableCardSkeleton count={2} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
            Nucleus Analytics
          </h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
            Project and deliverable overview
          </p>
        </div>
        <ProjectSelector />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FolderIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Projects</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{projects.length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <FlagIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Deliverables</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredDeliverables.length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">At risk</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{atRisk.length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {byStatus.approved || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5" />
            By status
          </h2>
          <ul className="space-y-2">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <li key={key} className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">{label}</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {byStatus[key] ?? 0}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            At-risk deliverables
          </h2>
          {atRisk.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-500">None</p>
          ) : (
            <ul className="space-y-3">
              {atRisk.slice(0, 10).map((d) => (
                <li key={d._id || d.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`../deliverables/${d._id || d.id}`)}
                    className="flex items-center justify-between w-full text-left p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {d.name || 'Unnamed'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 flex-shrink-0 ml-2">
                      {d.progress_percentage ?? 0}% · {d.target_date ? new Date(d.target_date).toLocaleDateString() : '-'}
                    </span>
                    <ArrowRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0 ml-1" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {atRisk.length > 10 && (
            <button
              type="button"
              onClick={() => navigate('../deliverables')}
              className="mt-3 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              View all deliverables →
            </button>
          )}
        </div>
      </div>

      {/* Charts — visible when a project is selected */}
      {projectIdFilter && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5" />
              Deliverable Burndown
            </h2>
            {chartsLoading ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
            ) : burndownChartData.labels.length > 1 ? (
              <Line
                data={burndownChartData}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
                }}
              />
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-500 py-8 text-center">No shipped deliverables yet</p>
            )}
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5" />
              Sprint Velocity
            </h2>
            {chartsLoading ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
            ) : velocityChartData.labels.length > 0 ? (
              <Bar
                data={velocityChartData}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
                }}
              />
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-500 py-8 text-center">No completed sprints with velocity data</p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate('../deliverables')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
        >
          <FlagIcon className="w-5 h-5" />
          Deliverables
        </button>
        <button
          type="button"
          onClick={() => navigate('../approvals')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <ClockIcon className="w-5 h-5" />
          Approval Queue
        </button>
        <button
          type="button"
          onClick={() => navigate('../change-requests')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Change Requests
        </button>
      </div>
    </div>
  );
};

export default NucleusAnalyticsPage;
