import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';
import {
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowLeftIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import tenantApiService from '../../../../../../shared/services/tenant/tenant-api.service';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import EmptyState from '../../../../../../shared/components/feedback/EmptyState';

const DepartmentDashboard = () => {
  const { departmentId } = useParams();
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState(null);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    completionRate: 0
  });
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskStats, setTaskStats] = useState({
    todo: 0,
    in_progress: 0,
    under_review: 0,
    completed: 0,
    cancelled: 0
  });
  const [workload, setWorkload] = useState([]);

  useEffect(() => {
    if (tenantSlug && departmentId) {
      fetchDashboardData();
    }
  }, [tenantSlug, departmentId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [departmentRes, statsRes, projectsRes, tasksRes, taskStatsRes, workloadRes] = await Promise.all([
        tenantApiService.getDepartment(tenantSlug, departmentId).catch(() => ({ data: null })),
        // SECURITY FIX: Use credentials: 'include' instead of Authorization header
        fetch(`/api/tenant/${tenantSlug}/departments/${departmentId}/dashboard/stats`, {
          method: 'GET',
          credentials: 'include', // SECURITY FIX: Include cookies
          headers: { 'Content-Type': 'application/json' }
        }).then(res => res.json()).catch(() => ({ data: { stats: {} } })),
        fetch(`/api/tenant/${tenantSlug}/departments/${departmentId}/dashboard/projects?limit=10`, {
          method: 'GET',
          credentials: 'include', // SECURITY FIX: Include cookies
          headers: { 'Content-Type': 'application/json' }
        }).then(res => res.json()).catch(() => ({ data: [] })),
        fetch(`/api/tenant/${tenantSlug}/departments/${departmentId}/dashboard/tasks?limit=10`, {
          method: 'GET',
          credentials: 'include', // SECURITY FIX: Include cookies
          headers: { 'Content-Type': 'application/json' }
        }).then(res => res.json()).catch(() => ({ data: [] })),
        fetch(`/api/tenant/${tenantSlug}/departments/${departmentId}/dashboard/task-stats`, {
          method: 'GET',
          credentials: 'include', // SECURITY FIX: Include cookies
          headers: { 'Content-Type': 'application/json' }
        }).then(res => res.json()).catch(() => ({ data: {} })),
        fetch(`/api/tenant/${tenantSlug}/departments/${departmentId}/dashboard/workload`, {
          method: 'GET',
          credentials: 'include', // SECURITY FIX: Include cookies
          headers: { 'Content-Type': 'application/json' }
        }).then(res => res.json()).catch(() => ({ data: [] }))
      ]);

      if (departmentRes.data) {
        setDepartment(departmentRes.data);
      }

      if (statsRes.data?.stats) {
        setStats(statsRes.data.stats);
      }

      if (projectsRes.data) {
        setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
      }

      if (tasksRes.data) {
        setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
      }

      if (taskStatsRes.data) {
        setTaskStats(taskStatsRes.data);
      }

      if (workloadRes.data) {
        setWorkload(Array.isArray(workloadRes.data) ? workloadRes.data : []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load department dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'active': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      'on_track': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      'at_risk': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      'delayed': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      'completed': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      'planning': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
    };
    return colors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  };

  if (loading) {
    return <LoadingSpinner message="Loading department dashboard..." className="min-h-[40vh] bg-transparent" />;
  }

  if (!department) {
    return (
      <div className="glass-card-premium p-12 text-center">
        <EmptyState title="Department not found" message="The requested department could not be loaded." className="max-w-xl mx-auto" />
        <button
          onClick={() => navigate(`/${tenantSlug}/org/departments`)}
          className="glass-button px-4 py-2 rounded-xl hover-scale mt-4"
        >
          Back to Departments
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/${tenantSlug}/org/departments`)}
            className="glass-button p-2 rounded-xl hover-scale"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">
              {department.name} Dashboard
            </h1>
            <p className="text-sm xl:text-base text-gray-600 dark:text-gray-300 mt-1">
              {department.code} • {department.description || 'Department overview and statistics'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="glass-card-premium p-5 hover-glow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <BuildingOfficeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {stats.totalProjects}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Projects</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{stats.activeProjects} active</p>
        </div>

        <div className="glass-card-premium p-5 hover-glow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-900/20">
              <ClipboardDocumentListIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {stats.totalTasks}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Tasks</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{stats.completedTasks} completed</p>
        </div>

        <div className="glass-card-premium p-5 hover-glow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <ChartBarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {stats.completionRate.toFixed(1)}%
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Completion Rate</p>
          <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-600 h-2 rounded-full transition-all"
              style={{ width: `${stats.completionRate}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Task Status Breakdown */}
      <div className="glass-card-premium p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Task Status Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{taskStats.todo}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">To Do</p>
          </div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{taskStats.in_progress}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{taskStats.under_review}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Under Review</p>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{taskStats.completed}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
          </div>
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{taskStats.cancelled}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Cancelled</p>
          </div>
        </div>
      </div>

      {/* Recent Projects and Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="glass-card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Projects</h3>
            <button
              onClick={() => navigate(`/${tenantSlug}/org/projects?departmentId=${departmentId}`)}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {projects.length > 0 ? (
              projects.map((project) => (
                <div
                  key={project.slug || project._id || project.id}
                  className="glass-card p-4 hover-glow cursor-pointer"
                  onClick={() => navigate(`/${tenantSlug}/org/projects/${project.slug || project._id || project.id}/board`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                        {project.name || project.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {project.clientId?.name || project.client || 'No client'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusColor(project.status || project.healthStatus)}`}>
                      {project.status || 'active'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <EmptyState title="No projects found" message="No department projects are available yet." className="max-w-lg mx-auto" />
              </div>
            )}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="glass-card-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Tasks</h3>
            <button
              onClick={() => navigate(`/${tenantSlug}/org/projects/tasks?departmentId=${departmentId}`)}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <div
                  key={task._id || task.id}
                  className="glass-card p-4 hover-glow cursor-pointer"
                  onClick={() => navigate(`/${tenantSlug}/org/projects/tasks?taskId=${task._id || task.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                        {task.title || task.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {task.projectId?.name || 'No project'}
                      </p>
                      {task.assignee && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Assigned to: {task.assignee.fullName || task.assignee.email}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <EmptyState title="No tasks found" message="No department tasks are available yet." className="max-w-lg mx-auto" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workload Distribution */}
      {workload.length > 0 && (
        <div className="glass-card-premium p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Team Workload</h3>
          <div className="space-y-3">
            {workload.map((member, index) => (
              <div key={index} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {member.assigneeName || member.assigneeEmail || 'Unassigned'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {member.totalTasks} total tasks
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">{member.completedTasks} completed</p>
                    <p className="text-sm text-blue-600">{member.inProgressTasks} in progress</p>
                  </div>
                </div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${member.totalTasks > 0 ? (member.completedTasks / member.totalTasks) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentDashboard;

