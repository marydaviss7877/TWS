import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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

const ProjectsOverview = () => {
  const { tenantSlug } = useParams();
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
    totalTeamMembers: 0,
    onTrackProjects: 0,
    atRiskProjects: 0,
    delayedProjects: 0,
    totalBudget: 0,
    spentBudget: 0,
    totalHours: 0,
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
      const data = await tenantProjectApiService.getDepartments(tenantSlug);
      if (data) {
        const departmentsList = Array.isArray(data) ? data : data.departments || [];
        setDepartments(departmentsList);
        
        // Fetch stats for each department using tenantApiService
        const statsPromises = departmentsList.map(async (dept) => {
          try {
            // SECURITY FIX: Use credentials: 'include' instead of Authorization header
            const response = await fetch(`/api/tenant/${tenantSlug}/departments/${dept._id}/dashboard/stats`, {
              method: 'GET',
              credentials: 'include', // SECURITY FIX: Include cookies (HttpOnly tokens)
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const statsData = await response.json();
              return { ...dept, stats: statsData?.data?.stats || statsData?.stats || {} };
            }
            return { ...dept, stats: {} };
          } catch (err) {
            return { ...dept, stats: {} };
          }
        });
        
        const deptStats = await Promise.all(statsPromises);
        setDepartmentStats(deptStats);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }, [tenantSlug]);

  const fetchOverviewData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [metricsResponse, projectsResponse, allProjectsResponse, milestonesResponse] = await Promise.all([
        tenantProjectApiService.getProjectMetrics(tenantSlug).catch(() => ({})),
        tenantProjectApiService.getProjects(tenantSlug, { limit: 6, sort: 'updatedAt' }).catch(() => ({ projects: [] })),
        // Fetch all projects (no limit) so trend/velocity/health charts use full dataset
        tenantProjectApiService.getProjects(tenantSlug, { limit: 200, sort: 'createdAt' }).catch(() => ({ projects: [] })),
        tenantApiService.getProjectMilestones(tenantSlug, { upcoming: true, limit: 5 }).catch(() => ({ milestones: [] }))
      ]);

      // Set metrics
      if (metricsResponse && Object.keys(metricsResponse).length > 0) {
        setMetrics({
          totalProjects: metricsResponse.totalProjects || 0,
          activeProjects: metricsResponse.activeProjects || 0,
          completedProjects: metricsResponse.completedProjects || 0,
          totalTeamMembers: metricsResponse.totalTeamMembers || 0,
          onTrackProjects: metricsResponse.onTrackProjects || 0,
          atRiskProjects: metricsResponse.atRiskProjects || 0,
          delayedProjects: metricsResponse.delayedProjects || 0,
          totalBudget: metricsResponse.totalBudget || 0,
          spentBudget: metricsResponse.spentBudget || 0,
          totalHours: metricsResponse.totalHours || 0,
          utilization: metricsResponse.utilization || 0
        });
      } else {
        // Use projects overview data as fallback
        const overviewData = await tenantApiService.getProjectsOverview(tenantSlug).catch(() => ({}));
        setMetrics({
          totalProjects: overviewData.totalProjects || 0,
          activeProjects: overviewData.activeProjects || 0,
          completedProjects: overviewData.completedProjects || 0,
          totalTeamMembers: 0,
          onTrackProjects: 0,
          atRiskProjects: 0,
          delayedProjects: 0,
          totalBudget: 0,
          spentBudget: 0,
          totalHours: 0,
          utilization: 0
        });
        setRecentProjects(overviewData.projects || []);
      }

      // Set recent projects (6 items for cards)
      if (projectsResponse?.projects) {
        setRecentProjects(projectsResponse.projects);
      } else if (projectsResponse && Array.isArray(projectsResponse)) {
        setRecentProjects(projectsResponse);
      }

      // Set all projects (full dataset for charts)
      const allP = allProjectsResponse?.projects || (Array.isArray(allProjectsResponse) ? allProjectsResponse : []);
      setAllProjects(allP);

      // Set milestones
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
  }, [tenantSlug]);

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
      // Clean up URL
      const newUrl = location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [location.search, location.pathname]);

  // Generate comprehensive chart data
  const generateChartData = useCallback((projects, milestones) => {
    // Generate last 6 months labels
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
    }

    // Project Status Distribution (Pie Chart)
    const projectStatusData = {
      labels: ['On Track', 'At Risk', 'Delayed', 'Completed'],
      datasets: [{
        data: [
          metrics.onTrackProjects,
          metrics.atRiskProjects,
          metrics.delayedProjects,
          metrics.completedProjects
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)'
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(59, 130, 246, 1)'
        ],
        borderWidth: 2
      }]
    };

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

    // Team Allocation (Bar Chart)
    const teamAllocationData = {
      labels: projectSlice.length > 0
        ? projectSlice.map(p => (p.name || p.title || 'Project').substring(0, 12))
        : ['No Projects'],
      datasets: [{
        label: 'Team Members',
        data: projectSlice.length > 0
          ? projectSlice.map(p => p.team?.members?.length || p.team?.length || p.teamMembers?.length || 0)
          : [0],
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: 'rgba(168, 85, 247, 1)',
        borderWidth: 2
      }]
    };

    // Milestone Status (Doughnut Chart)
    const milestoneStatusCounts = {
      completed: milestones.filter(m => m.status === 'completed').length,
      in_progress: milestones.filter(m => m.status === 'in_progress').length,
      pending: milestones.filter(m => !m.status || m.status === 'pending').length
    };
    const milestoneStatusData = {
      labels: ['Completed', 'In Progress', 'Pending'],
      datasets: [{
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
      }]
    };

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
    // Team Satisfaction: utilization score (healthy range = high score); penalise >100% overload
    const util = metrics.utilization || 0;
    const teamScore = util > 0 ? Math.round(Math.min(util, 100) * (util <= 80 ? 1 : util <= 100 ? 0.9 : 0.7)) : 0;
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

    setChartData({
      projectStatus: projectStatusData,
      projectTypeDistribution: projectTypeData,
      budgetComparison: budgetData,
      projectTimeline: completionTrendData,
      teamAllocation: teamAllocationData,
      completionTrend: completionTrendData,
      milestoneStatus: milestoneStatusData,
      projectHealth: projectHealthData,
      budgetUtilization: budgetUtilizationData,
      projectVelocity: projectVelocityData
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
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      trend: 'up',
      onClick: () => navigate(`/${tenantSlug}/org/projects`)
    },
    { 
      label: 'Active Projects', 
      value: metrics.activeProjects, 
      change: `${metrics.completedProjects} completed`,
      icon: ClipboardDocumentListIcon, 
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
      trend: 'up'
    },
    { 
      label: 'Team Members', 
      value: metrics.totalTeamMembers || 0, 
      change: metrics.utilization ? `${metrics.utilization}% utilized` : 'No data',
      icon: UsersIcon, 
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600',
      trend: 'up'
    },
    { 
      label: 'Total Budget', 
      value: metrics.totalBudget > 0 ? `$${(metrics.totalBudget / 1000).toFixed(0)}K` : '$0K', 
      change: metrics.spentBudget > 0 ? `$${(metrics.spentBudget / 1000).toFixed(0)}K spent` : 'No spending',
      icon: CurrencyDollarIcon, 
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
      trend: 'up'
    },
    { 
      label: 'On Track', 
      value: metrics.onTrackProjects, 
      change: `${metrics.activeProjects > 0 ? ((metrics.onTrackProjects / metrics.activeProjects) * 100).toFixed(0) : 0}% of active`,
      icon: CheckCircleIcon, 
      iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
      trend: 'up'
    },
    { 
      label: 'At Risk', 
      value: metrics.atRiskProjects, 
      change: `${metrics.activeProjects > 0 ? ((metrics.atRiskProjects / metrics.activeProjects) * 100).toFixed(0) : 0}% of active`,
      icon: ExclamationTriangleIcon, 
      iconBg: 'bg-gradient-to-br from-yellow-500 to-amber-600',
      trend: metrics.atRiskProjects > 0 ? 'down' : 'up'
    },
    { 
      label: 'Total Hours', 
      value: metrics.totalHours > 0 ? `${(metrics.totalHours / 1000).toFixed(1)}K` : '0', 
      change: metrics.utilization ? `${metrics.utilization}% utilization` : 'No tracking',
      icon: ClockIcon, 
      iconBg: 'bg-gradient-to-br from-indigo-500 to-blue-600',
      trend: 'up'
    },
    { 
      label: 'Budget Remaining', 
      value: metrics.totalBudget > 0 ? `$${((metrics.totalBudget - metrics.spentBudget) / 1000).toFixed(0)}K` : '$0K', 
      change: `${metrics.totalBudget > 0 ? (((metrics.totalBudget - metrics.spentBudget) / metrics.totalBudget) * 100).toFixed(0) : 0}% remaining`,
      icon: CurrencyDollarIcon, 
      iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-600',
      trend: (metrics.totalBudget - metrics.spentBudget) > (metrics.totalBudget * 0.3) ? 'up' : 'down'
    }
  ];

  const getStatusColor = (status) => {
    const statusColors = {
      'on_track': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      'at_risk': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      'delayed': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      'active': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      'completed': 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    };
    return statusColors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  };

  const getStatusLabel = (status) => {
    switch (status) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading projects overview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card-premium p-6 border border-red-200 dark:border-red-800">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-400">Error</h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={fetchOverviewData}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div data-tutorial="proj-header" className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
            Projects Overview
          </h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
            Comprehensive view of your organization's projects
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/${tenantSlug}/org/projects/tasks`)}
            className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2"
          >
            <ClipboardDocumentListIcon className="w-5 h-5" />
            <span className="font-medium">View Tasks</span>
          </button>
          {recentProjects.length > 0 && (
            <button
              onClick={() => navigate(`/${tenantSlug}/org/projects/${recentProjects[0]._id || recentProjects[0].id}/gantt`)}
              className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white"
            >
              <ChartBarIcon className="w-5 h-5" />
              <span className="font-medium">Gantt Chart</span>
            </button>
          )}
          <button
            data-tutorial="proj-new-btn"
            onClick={() => setIsCreateModalOpen(true)}
            className="glass-button px-4 py-2 rounded-xl hover-scale flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="font-medium">New Project</span>
          </button>
        </div>
      </div>

      {/* Stats Grid - Expanded */}
      <div data-tutorial="proj-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div 
            key={index} 
            className={`glass-card-premium p-5 hover-glow transition-all duration-300 ${stat.onClick ? 'cursor-pointer' : ''}`}
            onClick={stat.onClick}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${stat.iconBg} shadow-lg`}>
                <stat.icon className="w-5 h-5 text-white" />
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
      <div data-tutorial="proj-health" className="glass-card-premium p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Project Health Overview</h3>
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
        {/* Project Status Distribution */}
        <div className="glass-card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Project Status Distribution</h3>
            <FolderIcon className="w-5 h-5 text-gray-400" />
          </div>
          {chartData.projectStatus && (
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
                          return '$' + (value * 1000) + 'K';
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
          {chartData.completionTrend && (
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
          )}
        </div>

        {/* Project Velocity */}
        <div className="glass-card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Project Velocity</h3>
            <BoltIcon className="w-5 h-5 text-gray-400" />
          </div>
          {chartData.projectVelocity && (
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
          {chartData.teamAllocation && (
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
          )}
        </div>

        {/* Milestone Status */}
        <div className="glass-card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Milestone Status</h3>
            <ClipboardDocumentListIcon className="w-5 h-5 text-gray-400" />
          </div>
          {chartData.milestoneStatus && (
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
          <h3 className="text-lg xl:text-xl font-bold font-heading text-gray-900 dark:text-white mb-4">
            Active Projects
          </h3>
          <div className="space-y-4">
            {recentProjects.length > 0 ? (
              recentProjects.slice(0, 6).map((project) => (
                <div key={project._id || project.id} className="glass-card p-4 hover-glow">
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
                          className={`h-2 rounded-full ${
                            (project.status || project.healthStatus) === 'on_track' ? 'bg-green-500' :
                            (project.status || project.healthStatus) === 'at_risk' ? 'bg-yellow-500' :
                            'bg-blue-500'
                          }`}
                          style={{ width: `${project.metrics?.completionRate || project.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => navigate(`/${tenantSlug}/org/projects/${project._id || project.id}/gantt`)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                    >
                      <CalendarDaysIcon className="w-4 h-4" />
                      Gantt Chart
                    </button>
                    <button
                      onClick={() => navigate(`/${tenantSlug}/org/projects/${project._id || project.id}/board`)}
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
                <FolderIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">No active projects found</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">Create your first project to get started</p>
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
                    <p className="font-bold text-primary-600">{dept.stats?.completionRate?.toFixed(1) || 0}%</p>
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

export default ProjectsOverview;
