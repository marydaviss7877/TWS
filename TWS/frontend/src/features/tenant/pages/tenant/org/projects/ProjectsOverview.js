import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ChartBarIcon, 
  UsersIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlusIcon,
  CodeBracketIcon,
  BugAntIcon,
  StarIcon,
  RocketLaunchIcon,
  CpuChipIcon,
  DocumentChartBarIcon,
  FireIcon,
  BoltIcon,
  CalendarDaysIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { 
  Line, 
  Bar, 
  Doughnut, 
  Pie, 
  Radar
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import tenantProjectApiService from './services/tenantProjectApiService';
import { tenantApiService } from '../../../../../../shared/services/tenant/tenant-api.service';
import { PROJECT_STATUS, PROJECT_TYPE } from './constants/projectConstants';
import CreateProjectModal from './components/CreateProjectModal';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import ErrorState from '../../../../../../shared/components/feedback/ErrorState';
import EmptyState from '../../../../../../shared/components/feedback/EmptyState';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';
import './ProjectsOverviewSky.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

function sumLifeCycleCounts(projects) {
  let planning = 0;
  let active = 0;
  let onHold = 0;
  let completed = 0;
  let other = 0;
  (projects || []).forEach((p) => {
    const s = (p.status || '').toLowerCase().replace(/-/g, '_');
    if (s === 'planning') planning += 1;
    else if (s === 'active') active += 1;
    else if (s === 'on_hold') onHold += 1;
    else if (s === 'completed') completed += 1;
    else other += 1;
  });
  return { planning, active, onHold, completed, other };
}

function buildMetricsFromProjectsList(projects) {
  const lc = sumLifeCycleCounts(projects);
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;

  const totalBudget = projects.reduce((sum, p) => sum + (p.budget?.total || p.budget || 0), 0);
  const spentBudget = projects.reduce((sum, p) => sum + (p.budget?.spent || p.spent || 0), 0);
  const totalHours = projects.reduce((sum, p) => sum + (p.timeline?.estimatedHours || 0), 0);
  const totalActualHours = projects.reduce((sum, p) => sum + (p.timeline?.actualHours || 0), 0);

  const portfolioActivePct =
    totalProjects > 0 ? Math.round((activeProjects / totalProjects) * 100) : 0;
  const hoursUtilizationPct =
    totalHours > 0 ? Math.round((totalActualHours / totalHours) * 100) : null;

  const onTrackProjects = projects.filter(
    (p) => p.status === 'active' && (p.metrics?.completionRate ?? 0) >= 70
  ).length;
  const atRiskProjects = projects.filter((p) => {
    if (p.status !== 'active') return false;
    const cr = p.metrics?.completionRate;
    return cr != null && cr < 70 && cr >= 50;
  }).length;
  const delayedProjects = projects.filter((p) => {
    if (p.timeline?.endDate) {
      return new Date(p.timeline.endDate) < new Date() && p.status !== 'completed';
    }
    return false;
  }).length;

  return {
    totalProjects,
    activeProjects,
    completedProjects,
    planningProjects: lc.planning,
    onHoldProjects: lc.onHold,
    totalTeamMembers: 0,
    onTrackProjects,
    atRiskProjects,
    delayedProjects,
    totalBudget,
    spentBudget,
    totalHours,
    portfolioActivePct,
    hoursUtilizationPct,
    utilization: hoursUtilizationPct != null ? hoursUtilizationPct : portfolioActivePct
  };
}

function formatHoursSummary(totalHours) {
  if (totalHours == null || totalHours <= 0) return '0';
  if (totalHours < 1000) return `${Math.round(totalHours)} hrs`;
  return `${(totalHours / 1000).toFixed(1)}k hrs`;
}

const ProjectsOverviewContent = () => {
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Project type display mapping
  const getProjectTypeDisplay = (type) => {
    const types = {
      'web_application': 'Web Application',
      'mobile_app': 'Mobile App',
      'api_development': 'API Development',
      'system_integration': 'System Integration',
      'maintenance_support': 'Maintenance & Support',
      'consulting': 'Consulting',
      'general': 'General'
    };
    return types[type] || 'General';
  };

  const getProjectTypeIcon = (type) => {
    const icons = {
      'web_application': '🌐',
      'mobile_app': '📱',
      'api_development': '🔌',
      'system_integration': '🔗',
      'maintenance_support': '🔧',
      'consulting': '💼',
      'general': '📋'
    };
    return icons[type] || '📋';
  };

  const [metrics, setMetrics] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    planningProjects: 0,
    onHoldProjects: 0,
    totalTeamMembers: 0,
    onTrackProjects: 0,
    atRiskProjects: 0,
    delayedProjects: 0,
    totalBudget: 0,
    spentBudget: 0,
    totalHours: 0,
    portfolioActivePct: 0,
    hoursUtilizationPct: null,
    utilization: 0
  });

  const [recentProjects, setRecentProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [upcomingMilestones, setUpcomingMilestones] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [chartData, setChartData] = useState({
    projectStatus: null,
    projectTypeDistribution: null,
    budgetComparison: null,
    projectTimeline: null,
    teamAllocation: null,
    completionTrend: null,
    milestoneStatus: null,
    projectHealth: null,
    budgetUtilization: null,
    projectVelocity: null
  });

  const fetchDepartments = useCallback(async () => {
    try {
      const urlParams = new URLSearchParams(location.search);
      const scopedDeptId = urlParams.get('departmentId') || '';

      const data = await tenantProjectApiService.getDepartments(tenantSlug);
      if (data) {
        let departmentsList = Array.isArray(data) ? data : data.departments || [];
        if (scopedDeptId) {
          departmentsList = departmentsList.filter(
            (d) => String(d._id) === String(scopedDeptId)
          );
        }
        setDepartments(departmentsList);

        const fetchDeptStats = async (dept) => {
          try {
            const response = await fetch(`/api/tenant/${tenantSlug}/departments/${dept._id}/dashboard/stats`, {
              method: 'GET',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' }
            });
            if (response.ok) {
              const statsData = await response.json();
              return { ...dept, stats: statsData?.data?.stats || statsData?.stats || {} };
            }
            return { ...dept, stats: {} };
          } catch {
            return { ...dept, stats: {} };
          }
        };

        const CONCURRENCY = 5;
        const results = new Array(departmentsList.length);
        let cursor = 0;
        const worker = async () => {
          while (true) {
            const i = cursor;
            cursor += 1;
            if (i >= departmentsList.length) break;
            results[i] = await fetchDeptStats(departmentsList[i]);
          }
        };
        await Promise.all(
          Array.from({ length: Math.min(CONCURRENCY, departmentsList.length) }, () => worker())
        );
        setDepartmentStats(results.filter(Boolean));
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }, [tenantSlug, location.search]);

  const fetchOverviewData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const urlParams = new URLSearchParams(location.search);
      const departmentId = urlParams.get('departmentId') || undefined;
      const primaryDepartmentId = urlParams.get('primaryDepartmentId') || undefined;

      const projectQuery = {
        limit: 200,
        sort: 'updatedAt',
        ...(departmentId ? { departmentId } : {}),
        ...(primaryDepartmentId ? { primaryDepartmentId } : {})
      };
      const metricsQuery = {
        ...(departmentId ? { departmentId } : {}),
        ...(primaryDepartmentId ? { primaryDepartmentId } : {})
      };

      const [metricsResponse, projectsPayload, milestonesResponse] = await Promise.all([
        tenantProjectApiService.getProjectMetrics(tenantSlug, metricsQuery).catch(() => null),
        tenantProjectApiService.getProjects(tenantSlug, projectQuery).catch(() => ({ projects: [] })),
        tenantApiService.getProjectMilestones(tenantSlug, { upcoming: true, limit: 5 }).catch(() => ({ milestones: [] }))
      ]);

      const allP =
        projectsPayload?.projects || (Array.isArray(projectsPayload) ? projectsPayload : []);
      setAllProjects(allP);
      setRecentProjects(allP.slice(0, 6));

      const baseFromList = buildMetricsFromProjectsList(allP);

      if (metricsResponse && typeof metricsResponse === 'object') {
        setMetrics({
          totalProjects: metricsResponse.totalProjects ?? baseFromList.totalProjects,
          activeProjects: metricsResponse.activeProjects ?? 0,
          completedProjects: metricsResponse.completedProjects ?? 0,
          planningProjects: metricsResponse.planningProjects ?? baseFromList.planningProjects,
          onHoldProjects: metricsResponse.onHoldProjects ?? baseFromList.onHoldProjects,
          totalTeamMembers: metricsResponse.totalTeamMembers ?? 0,
          onTrackProjects: metricsResponse.onTrackProjects ?? 0,
          atRiskProjects: metricsResponse.atRiskProjects ?? 0,
          delayedProjects: metricsResponse.delayedProjects ?? 0,
          totalBudget: metricsResponse.totalBudget ?? baseFromList.totalBudget,
          spentBudget: metricsResponse.spentBudget ?? baseFromList.spentBudget,
          totalHours: metricsResponse.totalHours ?? baseFromList.totalHours,
          portfolioActivePct:
            metricsResponse.portfolioActivePct ?? baseFromList.portfolioActivePct,
          hoursUtilizationPct:
            metricsResponse.hoursUtilizationPct != null
              ? metricsResponse.hoursUtilizationPct
              : baseFromList.hoursUtilizationPct,
          utilization:
            metricsResponse.utilization != null
              ? metricsResponse.utilization
              : baseFromList.utilization
        });
      } else if (allP.length > 0) {
        setMetrics(baseFromList);
      } else {
        const overviewData = await tenantApiService.getProjectsOverview(tenantSlug).catch(() => ({}));
        const fallbackProjects = Array.isArray(overviewData.projects) ? overviewData.projects : [];
        setRecentProjects(fallbackProjects.slice(0, 6));
        setAllProjects(fallbackProjects);
        setMetrics({
          totalProjects: overviewData.totalProjects || 0,
          activeProjects: overviewData.activeProjects || 0,
          completedProjects: overviewData.completedProjects || 0,
          planningProjects: 0,
          onHoldProjects: 0,
          totalTeamMembers: 0,
          onTrackProjects: 0,
          atRiskProjects: 0,
          delayedProjects: 0,
          totalBudget: 0,
          spentBudget: 0,
          totalHours: 0,
          portfolioActivePct: 0,
          hoursUtilizationPct: null,
          utilization: 0
        });
      }

      let milestones = [];
      if (milestonesResponse?.milestones) {
        milestones = milestonesResponse.milestones;
        setUpcomingMilestones(milestones);
      } else if (milestonesResponse && Array.isArray(milestonesResponse)) {
        milestones = milestonesResponse;
        setUpcomingMilestones(milestones);
      }
    } catch (err) {
      console.error('Error fetching overview data:', err);
      setError('Failed to load projects overview data');
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, location.search]);

  useEffect(() => {
    if (tenantSlug) {
      fetchOverviewData();
      fetchDepartments();
    }
  }, [tenantSlug, fetchOverviewData, fetchDepartments]);

  // Listen for global "Create project" event from header
  useEffect(() => {
    const handleOpenCreateProject = () => {
      setIsCreateModalOpen(true);
    };
    
    window.addEventListener('openCreateProjectModal', handleOpenCreateProject);
    return () => {
      window.removeEventListener('openCreateProjectModal', handleOpenCreateProject);
    };
  }, []);

  // Check URL params for create action
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('create') === 'project') {
      setIsCreateModalOpen(true);
      urlParams.delete('create');
      const next = urlParams.toString();
      navigate({ pathname: location.pathname, search: next ? `?${next}` : '' }, { replace: true });
    }
  }, [location.search, location.pathname, navigate]);

  // Generate comprehensive chart data
  const generateChartData = useCallback((projects, milestones) => {
    // Generate last 6 months labels
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
    }

    // Project lifecycle status (Pie) — from project list so Planning portfolios are visible
    const lc = sumLifeCycleCounts(projects);
    const lifecycleTotal = lc.planning + lc.active + lc.onHold + lc.completed + lc.other;
    const projectStatusData =
      lifecycleTotal > 0
        ? {
            labels: ['Planning', 'Active', 'On hold', 'Completed', 'Other'],
            datasets: [
              {
                data: [lc.planning, lc.active, lc.onHold, lc.completed, lc.other],
                backgroundColor: [
                  'rgba(148, 163, 184, 0.85)',
                  'rgba(59, 130, 246, 0.85)',
                  'rgba(234, 179, 8, 0.85)',
                  'rgba(34, 197, 94, 0.85)',
                  'rgba(107, 114, 128, 0.85)'
                ],
                borderColor: [
                  'rgba(148, 163, 184, 1)',
                  'rgba(59, 130, 246, 1)',
                  'rgba(234, 179, 8, 1)',
                  'rgba(34, 197, 94, 1)',
                  'rgba(107, 114, 128, 1)'
                ],
                borderWidth: 2
              }
            ]
          }
        : null;

    // Project Type Distribution (Doughnut Chart)
    const typeCounts = {};
    projects.forEach(p => {
      const type = p.projectType || p.type || 'general';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    const projectTypeData = {
      labels: Object.keys(typeCounts).map(type => getProjectTypeDisplay(type)),
      datasets: [{
        data: Object.values(typeCounts),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(156, 163, 175, 0.8)'
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(236, 72, 153, 1)',
          'rgba(156, 163, 175, 1)'
        ],
        borderWidth: 2
      }]
    };

    // Budget vs Spent Comparison (Bar Chart)
    const projectSlice = projects.slice(0, 5);
    const budgetData = {
      labels: projectSlice.length > 0 
        ? projectSlice.map(p => (p.name || p.title || 'Project').substring(0, 15))
        : ['No Projects'],
      datasets: [
        {
          label: 'Budget',
          data: projectSlice.length > 0
            ? projectSlice.map(p => ((p.budget?.total || p.budget || 0) / 1000))
            : [0],
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1
        },
        {
          label: 'Spent',
          data: projectSlice.length > 0
            ? projectSlice.map(p => ((p.budget?.spent || p.spent || 0) / 1000))
            : [0],
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1
        }
      ]
    };

    // Project Timeline/Completion Trend (Line Chart)
    // Count projects completed in each of the last 6 months using real data
    const completionByMonth = months.map((_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return projects.filter(p => {
        if ((p.status || '').toLowerCase() !== 'completed') return false;
        const d = new Date(p.endDate || p.completedAt || p.updatedAt);
        return !isNaN(d) && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
      }).length;
    });
    const completionTrendData = {
      labels: months,
      datasets: [{
        label: 'Projects Completed',
        data: completionByMonth,
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5
      }]
    };
    const completionTrendHasData = completionByMonth.some((n) => n > 0);

    // Team Allocation (Bar Chart) — omit when no roster counts on sampled projects
    const teamCounts =
      projectSlice.length > 0
        ? projectSlice.map(
            (p) =>
              p.teamMemberCount ??
              p.team?.members?.length ??
              p.team?.length ??
              p.teamMembers?.length ??
              0
          )
        : [];
    const teamAllocationData =
      projectSlice.length > 0 && teamCounts.some((c) => c > 0)
        ? {
            labels: projectSlice.map((p) => (p.name || p.title || 'Project').substring(0, 12)),
            datasets: [
              {
                label: 'Team Members',
                data: teamCounts,
                backgroundColor: 'rgba(168, 85, 247, 0.8)',
                borderColor: 'rgba(168, 85, 247, 1)',
                borderWidth: 2
              }
            ]
          }
        : null;

    // Milestone Status (Doughnut Chart)
    const normMilestoneStatus = (s) => (s || '').toLowerCase().replace(/-/g, '_');
    const milestoneStatusCounts = {
      completed: milestones.filter((m) => normMilestoneStatus(m.status) === 'completed').length,
      in_progress: milestones.filter((m) =>
        ['in_progress', 'inprogress'].includes(normMilestoneStatus(m.status))
      ).length,
      pending: milestones.filter((m) => {
        const n = normMilestoneStatus(m.status);
        return !m.status || n === 'pending' || n === 'planned';
      }).length
    };
    const milestoneSum =
      milestoneStatusCounts.completed +
      milestoneStatusCounts.in_progress +
      milestoneStatusCounts.pending;
    const milestoneStatusData =
      milestoneSum > 0
        ? {
            labels: ['Completed', 'In Progress', 'Pending'],
            datasets: [
              {
                data: [
                  milestoneStatusCounts.completed,
                  milestoneStatusCounts.in_progress,
                  milestoneStatusCounts.pending
                ],
                backgroundColor: [
                  'rgba(34, 197, 94, 0.8)',
                  'rgba(59, 130, 246, 0.8)',
                  'rgba(234, 179, 8, 0.8)'
                ],
                borderColor: [
                  'rgba(34, 197, 94, 1)',
                  'rgba(59, 130, 246, 1)',
                  'rgba(234, 179, 8, 1)'
                ],
                borderWidth: 2
              }
            ]
          }
        : null;

    // Project Health Radar — all values derived from real data
    const totalActive = Math.max(metrics.activeProjects, 1);
    const totalAll = Math.max(metrics.totalProjects, 1);
    // On Time: % of active projects that are on track
    const onTimeScore = Math.round((metrics.onTrackProjects / totalActive) * 100);
    // Budget: % of budget remaining
    const budgetScore = metrics.totalBudget > 0
      ? Math.round(((metrics.totalBudget - metrics.spentBudget) / metrics.totalBudget) * 100)
      : 0;
    // Quality: task/deliverable completion rate derived from project completion percentages
    const qualityScore = projects.length > 0
      ? Math.round(projects.reduce((sum, p) => sum + (p.completionPercentage || p.progress || 0), 0) / projects.length)
      : 0;
    // Team Satisfaction: prefer logged hours vs estimates; else portfolio active %
    const util =
      metrics.hoursUtilizationPct != null && metrics.hoursUtilizationPct > 0
        ? metrics.hoursUtilizationPct
        : metrics.portfolioActivePct || 0;
    const teamScore =
      util > 0
        ? Math.round(Math.min(util, 100) * (util <= 80 ? 1 : util <= 100 ? 0.9 : 0.7))
        : 0;
    // Client Satisfaction: inverse of at-risk ratio across all projects
    const clientScore = Math.round((1 - metrics.atRiskProjects / totalAll) * 100);
    // Scope: inverse of delayed ratio
    const scopeScore = Math.round((1 - metrics.delayedProjects / totalAll) * 100);

    const projectHealthData = {
      labels: ['On Time', 'Budget', 'Quality', 'Team Satisfaction', 'Client Satisfaction', 'Scope'],
      datasets: [
        {
          label: 'Current Performance',
          data: [onTimeScore, budgetScore, qualityScore, teamScore, clientScore, scopeScore],
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
        }
      ]
    };

    // Budget Utilization (Bar Chart)
    const budgetUtilizationData = {
      labels: projectSlice.length > 0
        ? projectSlice.map(p => (p.name || p.title || 'Project').substring(0, 12))
        : ['No Projects'],
      datasets: [{
        label: 'Budget Utilization %',
        data: projectSlice.length > 0
          ? projectSlice.map(p => {
              const total = p.budget?.total || p.budget || 0;
              const spent = p.budget?.spent || p.spent || 0;
              return total > 0 ? (spent / total) * 100 : 0;
            })
          : [0],
        backgroundColor: projectSlice.map(p => {
          const total = p.budget?.total || p.budget || 0;
          const spent = p.budget?.spent || p.spent || 0;
          const utilization = total > 0 ? (spent / total) * 100 : 0;
          if (utilization > 90) return 'rgba(239, 68, 68, 0.8)';
          if (utilization > 70) return 'rgba(234, 179, 8, 0.8)';
          return 'rgba(34, 197, 94, 0.8)';
        }),
        borderColor: projectSlice.map(p => {
          const total = p.budget?.total || p.budget || 0;
          const spent = p.budget?.spent || p.spent || 0;
          const utilization = total > 0 ? (spent / total) * 100 : 0;
          if (utilization > 90) return 'rgba(239, 68, 68, 1)';
          if (utilization > 70) return 'rgba(234, 179, 8, 1)';
          return 'rgba(34, 197, 94, 1)';
        }),
        borderWidth: 2
      }]
    };

    // Project Velocity (Line Chart)
    // Average completion % of all projects that existed by each month
    const velocityByMonth = months.map((_, i) => {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - (5 - i));
      cutoff.setDate(cutoff.getDate() + 1); // include up to end of that month
      const activeByMonth = projects.filter(p => {
        const start = new Date(p.startDate || p.createdAt);
        return !isNaN(start) && start <= cutoff;
      });
      if (!activeByMonth.length) return 0;
      return Math.round(
        activeByMonth.reduce((sum, p) => sum + (p.completionPercentage || p.progress || 0), 0) / activeByMonth.length
      );
    });
    const projectVelocityData = {
      labels: months,
      datasets: [{
        label: 'Avg Completion %',
        data: velocityByMonth,
        borderColor: 'rgba(168, 85, 247, 1)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5
      }]
    };
    const velocityHasData = velocityByMonth.some((n) => n > 0);

    setChartData({
      projectStatus: projectStatusData,
      projectTypeDistribution: projectTypeData,
      budgetComparison: budgetData,
      projectTimeline: completionTrendHasData ? completionTrendData : null,
      teamAllocation: teamAllocationData,
      completionTrend: completionTrendHasData ? completionTrendData : null,
      milestoneStatus: milestoneStatusData,
      projectHealth: projectHealthData,
      budgetUtilization: budgetUtilizationData,
      projectVelocity: velocityHasData ? projectVelocityData : null
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics]);

  // Generate chart data when metrics or projects change — use full dataset for charts
  useEffect(() => {
    if (!loading) {
      const projectsForCharts = allProjects.length > 0 ? allProjects : recentProjects;
      generateChartData(projectsForCharts, upcomingMilestones);
    }
  }, [metrics, allProjects, recentProjects, upcomingMilestones, loading, generateChartData]);

  const stats = [
    { 
      label: 'Total Projects', 
      value: metrics.totalProjects, 
      change: `${metrics.activeProjects} active`,
      icon: FolderIcon,
      iconBg: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      trend: 'up',
      onClick: () => navigate(`/${tenantSlug}/org/projects`)
    },
    { 
      label: 'Active Projects', 
      value: metrics.activeProjects, 
      change: `${metrics.completedProjects} completed · ${metrics.planningProjects} planning`,
      icon: ClipboardDocumentListIcon,
      iconBg: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      trend: 'up'
    },
    {
      label: 'Team Members',
      value: metrics.totalTeamMembers || 0, 
      change:
        metrics.totalTeamMembers > 0
          ? `${metrics.portfolioActivePct}% of projects are active`
          : 'Distinct people on projects',
      icon: UsersIcon,
      iconBg: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      trend: 'up'
    },
    {
      label: 'Total Budget',
      value: metrics.totalBudget > 0 ? `$${(metrics.totalBudget / 1000).toFixed(0)}K` : '$0K', 
      change: metrics.spentBudget > 0 ? `$${(metrics.spentBudget / 1000).toFixed(0)}K spent` : 'No spending',
      icon: CurrencyDollarIcon,
      iconBg: 'bg-amber-50 dark:bg-amber-900/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      trend: 'up'
    },
    {
      label: 'On Track',
      value: metrics.onTrackProjects, 
      change: `${metrics.activeProjects > 0 ? ((metrics.onTrackProjects / metrics.activeProjects) * 100).toFixed(0) : 0}% of active`,
      icon: CheckCircleIcon,
      iconBg: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      trend: 'up'
    },
    {
      label: 'At Risk',
      value: metrics.atRiskProjects, 
      change: `${metrics.activeProjects > 0 ? ((metrics.atRiskProjects / metrics.activeProjects) * 100).toFixed(0) : 0}% of active`,
      icon: ExclamationTriangleIcon,
      iconBg: 'bg-yellow-50 dark:bg-yellow-900/20',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      trend: metrics.atRiskProjects > 0 ? 'down' : 'up'
    },
    {
      label: 'Total Hours',
      value: formatHoursSummary(metrics.totalHours), 
      change:
        metrics.hoursUtilizationPct != null
          ? `${metrics.hoursUtilizationPct}% of estimated hours logged`
          : metrics.totalHours > 0
            ? 'Log time to measure utilization'
            : 'Set timeline estimates on projects',
      icon: ClockIcon,
      iconBg: 'bg-indigo-50 dark:bg-indigo-900/20',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      trend: 'up'
    },
    {
      label: 'Budget Remaining',
      value: metrics.totalBudget > 0 ? `$${((metrics.totalBudget - metrics.spentBudget) / 1000).toFixed(0)}K` : '$0K', 
      change: `${metrics.totalBudget > 0 ? (((metrics.totalBudget - metrics.spentBudget) / metrics.totalBudget) * 100).toFixed(0) : 0}% remaining`,
      icon: CurrencyDollarIcon,
      iconBg: 'bg-teal-50 dark:bg-teal-900/20',
      iconColor: 'text-teal-600 dark:text-teal-400',
      trend: (metrics.totalBudget - metrics.spentBudget) > (metrics.totalBudget * 0.3) ? 'up' : 'down'
    }
  ];

  const getStatusColor = (status) => {
    const statusColors = {
      planning: 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200',
      on_hold: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
      on_track: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      at_risk: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      delayed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      active: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      completed: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    };
    const key = (status || '').toLowerCase().replace(/-/g, '_');
    return statusColors[key] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  };

  const getStatusLabel = (status) => {
    const key = (status || '').toLowerCase().replace(/-/g, '_');
    switch (key) {
      case 'planning':
        return 'Planning';
      case 'on_hold':
        return 'On hold';
      case 'on_track':
        return 'On Track';
      case 'at_risk':
        return 'At Risk';
      case 'delayed':
        return 'Delayed';
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      default:
        return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
    }
  };

  const scopedDepartmentId = new URLSearchParams(location.search).get('departmentId');

  const progressBarClassFor = (raw) => {
    const s = (raw || '').toLowerCase().replace(/-/g, '_');
    if (s === 'planning') return 'bg-sky-500';
    if (s === 'on_hold') return 'bg-amber-500';
    if (s === 'on_track') return 'bg-green-500';
    if (s === 'at_risk') return 'bg-yellow-500';
    if (s === 'delayed') return 'bg-red-500';
    if (s === 'completed') return 'bg-emerald-600';
    return 'bg-blue-500';
  };

  if (loading) {
    return <LoadingSpinner message="Loading projects overview..." className="min-h-[40vh] bg-transparent" />;
  }

  if (error) {
    return <ErrorState title="Projects overview unavailable" message={error} onRetry={fetchOverviewData} className="max-w-xl mx-auto" />;
  }

  return (
    <div className="projects-sky-page space-y-6 animate-fade-in">
      {/* Header */}
      <div className="projects-sky-hero flex items-center justify-between">
        <div>
          <div className="projects-sky-eyebrow"><span /> Delivery command center</div>
          <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
            Projects, in motion.
          </h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
            One live view of delivery, capacity, risk and project economics.
          </p>
        </div>
        <div className="projects-sky-actions flex items-center gap-3">
          <button
            onClick={() => navigate(`/${tenantSlug}/org/projects/tasks`)}
            className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2"
          >
            <ClipboardDocumentListIcon className="w-5 h-5" />
            <span className="font-medium">View Tasks</span>
          </button>
          {recentProjects.length > 0 && (
            <button
              onClick={() => navigate(`/${tenantSlug}/org/projects/${recentProjects[0].slug || recentProjects[0]._id || recentProjects[0].id}/gantt`)}
              className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white"
            >
              <ChartBarIcon className="w-5 h-5" />
              <span className="font-medium">Gantt Chart</span>
            </button>
          )}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="font-medium">New Project</span>
          </button>
        </div>
      </div>

      {scopedDepartmentId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50/80 dark:bg-primary-900/20 px-4 py-3 text-sm text-primary-900 dark:text-primary-100">
          <span>Showing projects scoped to one department.</span>
          <button
            type="button"
            onClick={() => {
              const sp = new URLSearchParams(location.search);
              sp.delete('departmentId');
              const next = sp.toString();
              navigate(
                { pathname: location.pathname, search: next ? `?${next}` : '' },
                { replace: true }
              );
            }}
            className="font-medium text-primary-700 dark:text-primary-300 hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Stats Grid - Expanded */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label} 
            className={`projects-sky-stat glass-card-premium p-5 hover-glow transition-all duration-300 ${stat.onClick ? 'cursor-pointer' : ''}`}
            onClick={stat.onClick}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${stat.iconBg}`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              <div className="flex items-center gap-1">
                {stat.trend === 'up' ? (
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
                ) : (
                  <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />
                )}
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{stat.change}</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {stat.value}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Project Health Overview */}
      <div className="glass-card-premium p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Project Health Overview</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
          On Track and At Risk include only projects in <span className="font-medium">active</span> status (completion-based). Delayed uses past due dates.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{metrics.onTrackProjects}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">On Track</p>
            <div className="mt-2 bg-green-200 dark:bg-green-800 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${metrics.activeProjects > 0 ? (metrics.onTrackProjects / metrics.activeProjects) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{metrics.atRiskProjects}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">At Risk</p>
            <div className="mt-2 bg-yellow-200 dark:bg-yellow-800 rounded-full h-2">
              <div 
                className="bg-yellow-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${metrics.activeProjects > 0 ? (metrics.atRiskProjects / metrics.activeProjects) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{metrics.delayedProjects}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Delayed</p>
            <div className="mt-2 bg-red-200 dark:bg-red-800 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${metrics.activeProjects > 0 ? (metrics.delayedProjects / metrics.activeProjects) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1: Project Status & Project Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project lifecycle (list-derived) */}
        <div className="glass-card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Lifecycle by status</h3>
            <FolderIcon className="w-5 h-5 text-gray-400" />
          </div>
          {chartData.projectStatus ? (
            <div className="h-64">
              <Pie 
                data={chartData.projectStatus}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        padding: 15,
                        usePointStyle: true,
                        color: 'rgb(107, 114, 128)'
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
              <FolderIcon className="mb-2 h-10 w-10 opacity-40" />
              No projects in this view yet.
            </div>
          )}
        </div>

        {/* Project Type Distribution */}
        <div className="glass-card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Project Type Distribution</h3>
            <CpuChipIcon className="w-5 h-5 text-gray-400" />
          </div>
          {chartData.projectTypeDistribution && chartData.projectTypeDistribution.labels.length > 0 && (
            <div className="h-64">
              <Doughnut 
                data={chartData.projectTypeDistribution}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        padding: 15,
                        usePointStyle: true,
                        color: 'rgb(107, 114, 128)'
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12
                    }
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2: Budget Comparison & Budget Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget vs Spent Comparison */}
        <div className="glass-card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Budget vs Spent</h3>
            <CurrencyDollarIcon className="w-5 h-5 text-gray-400" />
          </div>
          {chartData.budgetComparison && (
            <div className="h-64">
              <Bar 
                data={chartData.budgetComparison}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: {
                        padding: 15,
                        usePointStyle: true,
                        color: 'rgb(107, 114, 128)'
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12,
                      callbacks: {
                        label: function(context) {
                          return `${context.dataset.label}: $${(context.parsed.y * 1000).toLocaleString()}`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          const v = Number(value);
                          if (!Number.isFinite(v)) return '';
                          return `$${v.toLocaleString()}k`;
                        },
                        color: 'rgb(107, 114, 128)'
                      },
                      grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                      }
                    },
                    x: {
                      ticks: {
                        color: 'rgb(107, 114, 128)'
                      },
                      grid: {
                        display: false
                      }
                    }
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Budget Utilization */}
        <div className="glass-card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Budget Utilization</h3>
            <ChartBarIcon className="w-5 h-5 text-gray-400" />
          </div>
          {chartData.budgetUtilization && (
            <div className="h-64">
              <Bar 
                data={chartData.budgetUtilization}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12,
                      callbacks: {
                        label: function(context) {
                          return `Utilization: ${context.parsed.y.toFixed(1)}%`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        callback: function(value) {
                          return value + '%';
                        },
                        color: 'rgb(107, 114, 128)'
                      },
                      grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                      }
                    },
                    x: {
                      ticks: {
                        color: 'rgb(107, 114, 128)'
                      },
                      grid: {
                        display: false
                      }
                    }
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 3: Completion Trend & Project Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Completion Trend */}
        <div className="glass-card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Project Completion Trend</h3>
            <RocketLaunchIcon className="w-5 h-5 text-gray-400" />
          </div>
          {chartData.completionTrend ? (
            <div className="h-64">
              <Line 
                data={chartData.completionTrend}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        color: 'rgb(107, 114, 128)'
                      },
                      grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                      }
                    },
                    x: {
                      ticks: {
                        color: 'rgb(107, 114, 128)'
                      },
                      grid: {
                        display: false
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
              No completed projects in the last six months.
            </div>
          )}
        </div>

        {/* Project Velocity */}
        <div className="glass-card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Project Velocity</h3>
            <BoltIcon className="w-5 h-5 text-gray-400" />
          </div>
          {chartData.projectVelocity ? (
            <div className="h-64">
              <Line 
                data={chartData.projectVelocity}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        color: 'rgb(107, 114, 128)'
                      },
                      grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                      }
                    },
                    x: {
                      ticks: {
                        color: 'rgb(107, 114, 128)'
                      },
                      grid: {
                        display: false
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
              No average completion trend yet (projects need progress data).
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 4: Team Allocation & Milestone Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Allocation */}
        <div className="glass-card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Team Allocation by Project</h3>
            <UsersIcon className="w-5 h-5 text-gray-400" />
          </div>
          {chartData.teamAllocation ? (
            <div className="h-64">
              <Bar 
                data={chartData.teamAllocation}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12,
                      callbacks: {
                        label: function(context) {
                          return `Team Members: ${context.parsed.y}`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                        color: 'rgb(107, 114, 128)'
                      },
                      grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                      }
                    },
                    x: {
                      ticks: {
                        color: 'rgb(107, 114, 128)'
                      },
                      grid: {
                        display: false
                      }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
              No team roster counts on these projects yet.
            </div>
          )}
        </div>

        {/* Milestone Status */}
        <div className="glass-card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Milestone Status</h3>
            <ClipboardDocumentListIcon className="w-5 h-5 text-gray-400" />
          </div>
          {chartData.milestoneStatus ? (
            <div className="h-64">
              <Doughnut 
                data={chartData.milestoneStatus}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        padding: 15,
                        usePointStyle: true,
                        color: 'rgb(107, 114, 128)'
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
              No milestone samples returned for this view.
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 5: Project Health Radar */}
      <div className="grid grid-cols-1 gap-6">
        {/* Project Health Radar */}
        <div className="glass-card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Project Health Radar</h3>
            <StarIcon className="w-5 h-5 text-gray-400" />
          </div>
          {chartData.projectHealth && (
            <div className="h-80">
              <Radar 
                data={chartData.projectHealth}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: {
                        padding: 15,
                        usePointStyle: true,
                        color: 'rgb(107, 114, 128)'
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12,
                      callbacks: {
                        label: function(context) {
                          return `${context.dataset.label}: ${context.parsed.r.toFixed(0)}%`;
                        }
                      }
                    }
                  },
                  scales: {
                    r: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        stepSize: 20,
                        color: 'rgb(107, 114, 128)',
                        backdropColor: 'transparent'
                      },
                      grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                      },
                      pointLabels: {
                        color: 'rgb(107, 114, 128)'
                      }
                    }
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white">
            Recent projects
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
            Last updated first — includes planning, active, and other statuses (not the same as the &quot;Active Projects&quot; KPI above).
          </p>
          <div className="space-y-4">
            {recentProjects.length > 0 ? (
              recentProjects.slice(0, 6).map((project) => (
                <div key={project.slug || project._id || project.id} className="glass-card p-4 hover-glow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getProjectTypeIcon(project.projectType || project.type)}</span>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          {project.name || project.title || 'Unnamed Project'}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {project.clientId?.name || project.client || 'No client'} • {getProjectTypeDisplay(project.projectType || project.type)}
                      </p>
                      {project.methodology && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 capitalize">
                          {project.methodology} methodology
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Client Portal Badge - REMOVED COMPLETELY */}
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusColor(project.status || project.healthStatus)}`}>
                        {getStatusLabel(project.status || project.healthStatus)}
                      </span>
                    </div>
                  </div>
                  
                  {(project.metrics?.completionRate !== undefined || project.progress !== undefined) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Progress</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {Math.round(project.metrics?.completionRate || project.progress || 0)}%
                        </span>
                      </div>
                      <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${progressBarClassFor(project.status || project.healthStatus)}`}
                          style={{ width: `${project.metrics?.completionRate || project.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => navigate(`/${tenantSlug}/org/projects/${project.slug || project._id || project.id}/gantt`)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                    >
                      <CalendarDaysIcon className="w-4 h-4" />
                      Gantt Chart
                    </button>
                    <button
                      onClick={() => navigate(`/${tenantSlug}/org/projects/${project.slug || project._id || project.id}/board`)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-1"
                    >
                      <ClipboardDocumentListIcon className="w-4 h-4" />
                      Board
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <EmptyState title="No projects found" message="Create your first project to get started." className="max-w-lg mx-auto" />
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Milestones */}
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-4">
            Upcoming Milestones
          </h3>
          <div className="space-y-4">
            {upcomingMilestones.length > 0 ? (
              upcomingMilestones.map((milestone) => (
                <div key={milestone._id || milestone.id} className="glass-card p-4 hover-glow border-l-4 border-primary-500">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex-1">
                      {milestone.title || milestone.name}
                    </h4>
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                      milestone.status === 'in_progress' 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}>
                      {(milestone.status || 'pending').replace('_', ' ')}
                    </span>
                  </div>
                  {milestone.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {milestone.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Project: {milestone.projectId?.name || milestone.project || 'N/A'}
                  </p>
                  {milestone.dueDate && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <ClockIcon className="w-3 h-3" />
                      <span>Due: {new Date(milestone.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <ClipboardDocumentListIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">No upcoming milestones</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">Create milestones to track project progress</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Department Statistics Widget */}
      {departmentStats.length > 0 && (
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-4">
            Department Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departmentStats.map((dept) => (
              <div
                key={dept._id}
                className="glass-card p-4 hover-glow cursor-pointer"
                onClick={() => navigate(`/${tenantSlug}/org/departments/${dept._id}/dashboard`)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-gray-900 dark:text-white">{dept.name}</h4>
                  <span className="text-xs text-gray-500 dark:text-gray-500">{dept.code}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Projects</p>
                    <p className="font-bold text-gray-900 dark:text-white">{dept.stats?.totalProjects || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Tasks</p>
                    <p className="font-bold text-gray-900 dark:text-white">{dept.stats?.totalTasks || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Completed</p>
                    <p className="font-bold text-green-600">{dept.stats?.completedTasks || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Rate</p>
                    <p className="font-bold text-primary-600">
                      {typeof dept.stats?.completionRate === 'number' && !Number.isNaN(dept.stats.completionRate)
                        ? `${dept.stats.completionRate.toFixed(1)}%`
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget Overview */}
      {metrics.totalBudget > 0 && (
        <div className="glass-card-premium p-6 xl:p-8 hover-glow">
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-4">
            Budget Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Allocated</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${(metrics.totalBudget / 1000).toFixed(0)}K
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Spent</p>
              <p className="text-2xl font-bold text-amber-600">
                ${(metrics.spentBudget / 1000).toFixed(0)}K
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Remaining</p>
              <p className="text-2xl font-bold text-green-600">
                ${((metrics.totalBudget - metrics.spentBudget) / 1000).toFixed(0)}K
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-amber-500 to-orange-600 h-3 rounded-full" 
                style={{ width: `${metrics.totalBudget > 0 ? (metrics.spentBudget / metrics.totalBudget) * 100 : 0}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              {metrics.totalBudget > 0 ? ((metrics.spentBudget / metrics.totalBudget) * 100).toFixed(1) : 0}% of budget utilized
            </p>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={fetchOverviewData}
      />
    </div>
  );
};

export default function ProjectsOverview() {
  return (
    <ErrorBoundary message="The projects overview could not render. Try refreshing the page.">
      <ProjectsOverviewContent />
    </ErrorBoundary>
  );
}
