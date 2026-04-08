/**
 * Project Workspace Layout – single dashboard for a project.
 * Renders project name top-left, view tabs, top-right actions, and Outlet for the active view.
 */

import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useNavigate, useLocation, NavLink } from 'react-router-dom';
import {
  FolderIcon,
  StarIcon,
  ChevronDownIcon,
  ShareIcon,
  PlusIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  BarsArrowDownIcon,
  ListBulletIcon,
  Squares2X2Icon,
  UserGroupIcon,
  CalendarIcon,
  ChartBarIcon,
  ClockIcon,
  BoltIcon,
  SignalIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import tenantProjectApiService from '../pages/tenant/org/projects/services/tenantProjectApiService';
import ProjectSettingsModal from '../pages/tenant/org/projects/components/ProjectSettingsModal';
import '../styles/tenant-theme.css';
import '../styles/tenant-tokens.css';
import './TenantOrgLayout.css';

const PROJECT_WORKSPACE_EVENTS = {
  FOCUS_SEARCH: 'projectWorkspaceFocusSearch',
  TOGGLE_FILTER: 'projectWorkspaceToggleFilter',
};
export { PROJECT_WORKSPACE_EVENTS };

const VIEW_TABS = [
  { key: 'overview', label: 'Overview', path: 'overview', icon: ChartBarIcon, iconColor: 'text-indigo-500' },
  { key: 'board', label: 'Board', path: 'board', icon: Squares2X2Icon, iconColor: 'text-blue-500' },
  { key: 'team', label: 'Team', path: 'team', icon: UserGroupIcon, iconColor: 'text-emerald-500' },
  { key: 'calendar', label: 'Calendar', path: 'calendar', icon: CalendarIcon, iconColor: 'text-amber-500' },
  { key: 'gantt', label: 'Gantt', path: 'gantt', icon: ChartBarIcon, iconColor: 'text-violet-500' },
  { key: 'timeline', label: 'Timeline', path: 'timeline', icon: ClockIcon, iconColor: 'text-cyan-500' },
  { key: 'activity', label: 'Activity', path: 'activity', icon: BoltIcon, iconColor: 'text-yellow-500' },
  { key: 'workload', label: 'Workload', path: 'workload', icon: SignalIcon, iconColor: 'text-rose-500' },
  { key: 'table', label: 'Table', path: 'table', icon: TableCellsIcon, iconColor: 'text-teal-500' },
];

const ProjectWorkspaceLayout = () => {
  const { tenantSlug, projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const basePath = `/${tenantSlug}/org/projects/${projectId}`;

  useEffect(() => {
    if (!tenantSlug || !projectId) {
      setLoading(false);
      setError('Missing tenant or project');
      return;
    }
    let cancelled = false;
    const fetchProject = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await tenantProjectApiService.getProject(tenantSlug, projectId);
        const data = response?.data ?? response;
        if (!cancelled && data) {
          setProject(typeof data === 'object' && !Array.isArray(data) ? data : { name: 'Project' });
        } else if (!cancelled) {
          setError('Project not found');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load project');
          toast.error('Project not found');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProject();
    return () => { cancelled = true; };
  }, [tenantSlug, projectId, navigate]);

  const projectName = project?.name || 'Project';
  const projectInitial = (projectName || 'P').charAt(0).toUpperCase();

  const handleAddTask = () => {
    navigate(`${basePath}/board?create=task`);
    window.dispatchEvent(new CustomEvent('openCreateTaskModal'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-t-transparent border-primary-500 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
        <button
          type="button"
          onClick={() => navigate(`/${tenantSlug}/org/projects/list`)}
          className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:opacity-90"
        >
          Back to projects
        </button>
      </div>
    );
  }

  return (
    <div className="project-workspace-layout flex flex-col h-full">
      {/* Project chrome: row 1 = name + actions, row 2 = nav tabs */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        {/* Row 1: Project name (left) + actions (right) */}
        <div className="flex items-center justify-between gap-4 px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold flex-shrink-0">
              {projectInitial}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setProjectDropdownOpen((o) => !o)}
                className="flex items-center gap-1 text-left font-semibold text-gray-900 dark:text-white truncate max-w-[220px] hover:opacity-90"
              >
                <span className="truncate">{projectName}</span>
                <ChevronDownIcon className="w-4 h-4 flex-shrink-0 text-gray-500" />
              </button>
              {projectDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden
                    onClick={() => setProjectDropdownOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-1 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 min-w-[180px]">
                    <button
                      type="button"
                      onClick={() => {
                        setProjectDropdownOpen(false);
                        navigate(`/${tenantSlug}/org/projects`);
                      }}
                      className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <FolderIcon className="w-4 h-4" />
                      All projects
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              title="Favorite"
              aria-label="Favorite"
            >
              <StarIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                const url = window.location.href;
                navigator.clipboard.writeText(url).then(() => toast.success('Link copied to clipboard')).catch(() => toast.error('Could not copy link'));
              }}
              className="glass-button p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              title="Share (copy link)"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleAddTask}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium hover:opacity-90"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Task</span>
            </button>
            <button
              type="button"
              onClick={() => setSettingsModalOpen(true)}
              className="glass-button p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              title="Project settings"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent(PROJECT_WORKSPACE_EVENTS.FOCUS_SEARCH))}
              className="glass-button p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              title="Search"
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent(PROJECT_WORKSPACE_EVENTS.TOGGLE_FILTER))}
              className="glass-button p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              title="Filter"
            >
              <FunnelIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="glass-button p-2 rounded-lg text-gray-600 dark:text-gray-400"
              title="Sort"
            >
              <BarsArrowDownIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Row 2: Nav tabs below project name */}
        <nav className="flex items-center gap-0.5 overflow-x-auto glass-scrollbar px-4 pb-3">
          {VIEW_TABS.map((tab) => {
            const TabIcon = tab.icon;
            const iconColor = tab.iconColor || 'text-gray-500';
            const to = `${basePath}/${tab.path}`;
            return (
              <NavLink
                key={tab.key}
                to={to}
                end={tab.path === 'overview'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <TabIcon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary-600 dark:text-primary-400' : iconColor}`} />
                    {tab.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto glass-scrollbar">
        <Outlet />
      </div>

      {/* Project settings modal – opened from gear button */}
      <ProjectSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        project={project}
        projectId={projectId}
        onSaved={async () => {
          try {
            const response = await tenantProjectApiService.getProject(tenantSlug, projectId);
            const data = response?.data ?? response;
            if (data && typeof data === 'object' && !Array.isArray(data)) {
              setProject(data);
            }
          } catch (err) {
            console.error('Failed to refresh project after save:', err);
          }
        }}
      />
    </div>
  );
};

export default ProjectWorkspaceLayout;
