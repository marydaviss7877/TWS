/**
 * Project overview dashboard — fetch + derived metrics (see ProjectDashboard.js for UI).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { ExclamationTriangleIcon, FireIcon } from '@heroicons/react/24/outline';
import tenantProjectApiService from './services/tenantProjectApiService';
import { handleApiError } from './utils/errorHandler';

export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtNum(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString();
}

function daysRemaining(endDate) {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate) - new Date()) / 86400000);
  return diff;
}

function timeElapsedPct(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const total = new Date(endDate) - new Date(startDate);
  const elapsed = new Date() - new Date(startDate);
  return Math.max(0, Math.min(100, (elapsed / total) * 100));
}

function projectHealth(completionRate, startDate, endDate) {
  const elapsed = timeElapsedPct(startDate, endDate);
  if (elapsed === null) return null;
  const gap = completionRate - elapsed;
  if (gap >= -10) return { label: 'On Track', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', bar: 'bg-emerald-500', icon: CheckCircleSolid };
  if (gap >= -25) return { label: 'At Risk', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', bar: 'bg-amber-500', icon: ExclamationTriangleIcon };
  return { label: 'Delayed', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', bar: 'bg-red-500', icon: FireIcon };
}

export function useProjectDashboard() {
  const { projectId } = useParams();
  const tenantSlug = useTenantSlug();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);
      const response = await tenantProjectApiService.getProjectDashboard(tenantSlug, projectId);
      const data = response?.data ?? response;
      if (data && (data.project || data.metrics)) setDashboard(data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Failed to load dashboard');
      handleApiError(err, 'Failed to load project dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantSlug, projectId]);

  useEffect(() => {
    if (projectId && tenantSlug) fetchDashboard();
  }, [fetchDashboard, projectId, tenantSlug]);

  const derived = useMemo(() => {
    if (!dashboard) {
      return {
        project: null,
        settings: null,
        metrics: {
          totalTasks: 0,
          completedTasks: 0,
          completionRate: 0,
          activeSprints: 0,
          totalSprints: 0,
          totalMilestones: 0,
          completedMilestones: 0,
          totalEstimatedHours: 0,
          totalActualHours: 0,
          hoursVariance: 0,
        },
        tasks: [],
        sprints: [],
        milestones: [],
        startDate: null,
        endDate: null,
        days: null,
        elapsed: null,
        health: null,
        HealthIcon: InformationCircleIcon,
        workload: { todo: 0, in_progress: 0, under_review: 0, completed: 0, blocked: 0 },
        statusBarDenominator: 1,
        activeSprintsList: [],
        upcomingMilestones: [],
        hoursUsedPct: 0,
        statusBars: [],
      };
    }

    const { project, settings, metrics: rawMetrics, tasks = [], sprints = [], milestones = [] } = dashboard;

    const totalSprintsCount = Array.isArray(sprints) ? sprints.length : 0;
    const metrics = {
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0,
      activeSprints: 0,
      totalSprints: 0,
      totalMilestones: 0,
      completedMilestones: 0,
      totalEstimatedHours: 0,
      totalActualHours: 0,
      hoursVariance: 0,
      ...rawMetrics,
      totalSprints: totalSprintsCount,
    };

    const startDate = project?.timeline?.startDate || project?.startDate;
    const endDate = project?.timeline?.endDate || project?.endDate;
    const days = daysRemaining(endDate);
    const elapsed = timeElapsedPct(startDate, endDate);
    const health = projectHealth(metrics.completionRate, startDate, endDate);
    const HealthIcon = health?.icon || InformationCircleIcon;

    const workload = {
      todo: tasks.filter((t) => ['todo', 'to-do'].includes(t.status)).length,
      in_progress: tasks.filter((t) => ['in_progress', 'in-progress'].includes(t.status)).length,
      under_review: tasks.filter((t) => ['under_review', 'under-review'].includes(t.status)).length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      blocked: tasks.filter((t) => t.status === 'blocked').length,
    };
    const statusBarDenominator = Object.values(workload).reduce((a, b) => a + b, 0) || 1;

    const activeSprintsList = Array.isArray(sprints) ? sprints.filter((s) => s.status === 'active') : [];
    const upcomingMilestones = Array.isArray(milestones)
      ? milestones.filter((m) => m.status !== 'completed').slice(0, 4)
      : [];

    const hoursUsedPct = metrics.totalEstimatedHours
      ? Math.min(100, (metrics.totalActualHours / metrics.totalEstimatedHours) * 100)
      : 0;

    const statusBars = [
      { key: 'todo', label: 'To Do', count: workload.todo, color: 'bg-slate-400' },
      { key: 'in_progress', label: 'In Progress', count: workload.in_progress, color: 'bg-blue-500' },
      { key: 'under_review', label: 'Under Review', count: workload.under_review, color: 'bg-amber-500' },
      { key: 'blocked', label: 'Blocked', count: workload.blocked, color: 'bg-red-500' },
      { key: 'completed', label: 'Completed', count: workload.completed, color: 'bg-emerald-500' },
    ];

    return {
      project,
      settings,
      metrics,
      tasks,
      sprints,
      milestones,
      startDate,
      endDate,
      days,
      elapsed,
      health,
      HealthIcon,
      workload,
      statusBarDenominator,
      activeSprintsList,
      upcomingMilestones,
      hoursUsedPct,
      statusBars,
    };
  }, [dashboard]);

  return {
    dashboard,
    loading,
    error,
    refreshing,
    fetchDashboard,
    ...derived,
  };
}
