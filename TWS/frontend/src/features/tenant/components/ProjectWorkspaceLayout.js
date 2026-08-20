/**
 * Project Workspace Layout – single dashboard for a project.
 * Renders project name top-left, view tabs, top-right actions, and Outlet for the active view.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useParams, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useTenantSlug } from '../../../shared/hooks/useTenantSlug';
import { Popover } from '@headlessui/react';
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
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import tenantProjectApiService from '../pages/tenant/org/projects/services/tenantProjectApiService';
import ProjectSettingsModal from '../pages/tenant/org/projects/components/ProjectSettingsModal';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/Avatar/Avatar';
import '../styles/tenant-theme.css';
import '../styles/tenant-tokens.css';
import './TenantOrgLayout.css';

const PROJECT_WORKSPACE_EVENTS = {
  FOCUS_SEARCH: 'projectWorkspaceFocusSearch',
  TOGGLE_FILTER: 'projectWorkspaceToggleFilter',
  TOGGLE_SORT: 'projectWorkspaceToggleSort',
};
export { PROJECT_WORKSPACE_EVENTS };

const MEMBER_ROLE_RANK = { owner: 0, manager: 1, contributor: 2, client: 3, viewer: 4 };

function memberProfilePicSrc(url, tenantSlug) {
  if (!url || !tenantSlug) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/profile-pictures/')) {
    return `/api/tenant/${tenantSlug}/organization${url}`;
  }
  return url;
}

function projectLogoSrc(url, tenantSlug) {
  if (!url || !tenantSlug) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/project-logos/')) {
    return `/api/tenant/${tenantSlug}/organization${url}`;
  }
  return url;
}

function memberDisplayName(user) {
  if (!user) return 'Member';
  const s = (user.fullName || user.name || user.email || '').trim();
  return s || 'Member';
}

function memberInitials(user) {
  const name = memberDisplayName(user);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || '?';
}

function roleLabel(role) {
  return (role || 'contributor').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function sortProjectMembers(members) {
  return [...members]
    .filter((m) => m?.userId && typeof m.userId === 'object')
    .sort((a, b) => {
      const ra = MEMBER_ROLE_RANK[a.role] ?? 99;
      const rb = MEMBER_ROLE_RANK[b.role] ?? 99;
      if (ra !== rb) return ra - rb;
      return memberDisplayName(a.userId).toLowerCase().localeCompare(memberDisplayName(b.userId).toLowerCase());
    });
}

function ProjectMemberAvatarPopover({ member, tenantSlug }) {
  const navigate = useNavigate();
  const user = member.userId;
  const uid = user?._id;
  const picRaw = user?.profilePicUrl || user?.avatarUrl || user?.avatar;
  const src = memberProfilePicSrc(picRaw, tenantSlug);
  const name = memberDisplayName(user);
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    setImgErr(false);
  }, [src]);

  return (
    <Popover className="relative inline-block">
      <Popover.Button
        type="button"
        className="relative rounded-full ring-2 ring-white dark:ring-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
      >
        <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
          {src && !imgErr ? (
            <AvatarImage src={src} alt="" onError={() => setImgErr(true)} />
          ) : null}
          <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary-500 to-accent-500 text-white">
            {memberInitials(user)}
          </AvatarFallback>
        </Avatar>
      </Popover.Button>
      <Popover.Panel className="absolute left-1/2 z-30 mt-2 w-60 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-lg dark:border-gray-600 dark:bg-gray-800">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            {src && !imgErr ? (
              <AvatarImage src={src} alt="" onError={() => setImgErr(true)} />
            ) : null}
            <AvatarFallback className="text-xs bg-gradient-to-br from-primary-500 to-accent-500 text-white">
              {memberInitials(user)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{name}</p>
            {user?.email && (
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            )}
            <p className="mt-1 text-xs font-medium text-primary-600 dark:text-primary-400">
              {roleLabel(member.role)}
            </p>
            {uid && (
              <button
                type="button"
                onClick={() => navigate(`/${tenantSlug}/org/users/${uid}`)}
                className="mt-2 text-xs font-medium text-gray-600 underline hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                View profile
              </button>
            )}
          </div>
        </div>
      </Popover.Panel>
    </Popover>
  );
}

function ProjectMemberOverflowPopover({ overflowMembers, extraCount, tenantSlug }) {
  const navigate = useNavigate();

  return (
    <Popover className="relative inline-block">
      <Popover.Button
        type="button"
        className="relative flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-800 ring-2 ring-white dark:bg-gray-600 dark:text-gray-100 dark:ring-gray-800 sm:text-xs"
      >
        +{extraCount}
      </Popover.Button>
      <Popover.Panel className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-2 shadow-lg dark:border-gray-600 dark:bg-gray-800">
        <p className="border-b border-gray-100 px-3 pb-2 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Also on this project
        </p>
        <ul className="max-h-52 overflow-y-auto py-1">
          {overflowMembers.map((m) => (
            <li key={m._id} className="px-3 py-1.5">
              <button
                type="button"
                onClick={() => {
                  const id = m.userId?._id;
                  if (id) navigate(`/${tenantSlug}/org/users/${id}`);
                }}
                className="w-full truncate text-left text-sm text-gray-800 hover:text-primary-600 dark:text-gray-200 dark:hover:text-primary-400"
              >
                {memberDisplayName(m.userId)}
              </button>
            </li>
          ))}
        </ul>
      </Popover.Panel>
    </Popover>
  );
}

function ProjectWorkspaceMemberAvatars({ members, tenantSlug }) {
  const sorted = useMemo(() => sortProjectMembers(members), [members]);

  if (!sorted.length) return null;

  const useOverflow = sorted.length > 5;
  const faceMembers = useOverflow ? sorted.slice(0, 4) : sorted.slice(0, 5);
  const overflowMembers = useOverflow ? sorted.slice(4) : [];
  const extraCount = overflowMembers.length;

  return (
    <div className="flex items-center -space-x-2 shrink-0" aria-label="Project members">
      {faceMembers.map((member) => (
        <ProjectMemberAvatarPopover key={member._id} member={member} tenantSlug={tenantSlug} />
      ))}
      {useOverflow && extraCount > 0 && (
        <ProjectMemberOverflowPopover
          overflowMembers={overflowMembers}
          extraCount={extraCount}
          tenantSlug={tenantSlug}
        />
      )}
    </div>
  );
}

const VIEW_TABS = [
  { key: 'overview', label: 'Overview', path: 'overview', icon: ChartBarIcon, iconColor: 'text-primary-500' },
  { key: 'board', label: 'Board', path: 'board', icon: Squares2X2Icon, iconColor: 'text-blue-500' },
  { key: 'team', label: 'Team', path: 'team', icon: UserGroupIcon, iconColor: 'text-emerald-500' },
  { key: 'calendar', label: 'Calendar', path: 'calendar', icon: CalendarIcon, iconColor: 'text-amber-500' },
  { key: 'gantt', label: 'Gantt', path: 'gantt', icon: ChartBarIcon, iconColor: 'text-accent-500' },
  { key: 'timeline', label: 'Timeline', path: 'timeline', icon: ClockIcon, iconColor: 'text-cyan-500' },
  { key: 'activity', label: 'Activity', path: 'activity', icon: BoltIcon, iconColor: 'text-yellow-500' },
  { key: 'workload', label: 'Workload', path: 'workload', icon: SignalIcon, iconColor: 'text-rose-500' },
  { key: 'table', label: 'Table', path: 'table', icon: TableCellsIcon, iconColor: 'text-teal-500' },
];

const ProjectWorkspaceLayout = () => {
  const { projectId } = useParams();
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectLogoFailed, setProjectLogoFailed] = useState(false);

  const basePath = `/${tenantSlug}/org/projects/${projectId}`;

  useEffect(() => {
    setProjectLogoFailed(false);
  }, [project?.logoUrl, tenantSlug]);

  useEffect(() => {
    setMoreActionsOpen(false);
  }, [location.pathname]);

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

  useEffect(() => {
    if (!tenantSlug || !projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await tenantProjectApiService.getProjectMembers(tenantSlug, projectId);
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        if (!cancelled) setProjectMembers(list);
      } catch {
        if (!cancelled) setProjectMembers([]);
      }
    })();
    return () => { cancelled = true; };
  }, [tenantSlug, projectId]);

  const projectName = project?.name || 'Project';
  const projectInitial = (projectName || 'P').charAt(0).toUpperCase();
  const projectLogoUrl = projectLogoSrc(project?.logoUrl, tenantSlug);

  const handleAddTask = () => {
    navigate(`${basePath}/board?create=task`);
    window.dispatchEvent(new CustomEvent('openCreateTaskModal'));
  };

  const handleSortToolbarClick = () => {
    const boardSegment = `/projects/${projectId}/board`;
    if (!location.pathname.includes(boardSegment)) {
      toast('Open the Board tab to sort tasks.', { icon: 'ℹ️' });
      return;
    }
    window.dispatchEvent(new CustomEvent(PROJECT_WORKSPACE_EVENTS.TOGGLE_SORT));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="tws-loading-pulse rounded-full h-12 w-12 border-2 border-t-transparent border-primary-500 mx-auto" />
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
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm min-w-0">
        {/* Row 1: Project name (left) + actions (right) */}
        <div className="flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between sm:gap-4 px-2 sm:px-4 pt-2 sm:pt-3 pb-2 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {projectLogoUrl && !projectLogoFailed ? (
              <img
                src={projectLogoUrl}
                alt=""
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-gray-600 flex-shrink-0"
                onError={() => setProjectLogoFailed(true)}
              />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-sm sm:text-base text-white font-bold flex-shrink-0">
                {projectInitial}
              </div>
            )}
            <div className="relative min-w-0">
              <button
                type="button"
                onClick={() => setProjectDropdownOpen((o) => !o)}
                className="flex items-center gap-1 text-left text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate max-w-[10rem] sm:max-w-[14rem] md:max-w-[280px] hover:opacity-90"
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
              className="hidden sm:flex p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 shrink-0"
              title="Favorite"
              aria-label="Favorite"
            >
              <StarIcon className="w-5 h-5" />
            </button>
          </div>

          {projectMembers.length > 0 && (
            <div className="flex justify-start pl-1 min-[480px]:flex-1 min-[480px]:min-w-0 min-[480px]:justify-end min-[480px]:pl-2 min-[480px]:overflow-visible">
              <ProjectWorkspaceMemberAvatars members={projectMembers} tenantSlug={tenantSlug} />
            </div>
          )}

          <div className="flex items-center justify-end gap-0.5 sm:gap-1 flex-shrink-0 self-end min-[480px]:self-auto w-full min-[480px]:w-auto min-[480px]:max-w-none">
            <button
              type="button"
              onClick={() => {
                const url = window.location.href;
                navigator.clipboard.writeText(url).then(() => toast.success('Link copied to clipboard')).catch(() => toast.error('Could not copy link'));
              }}
              className="glass-button p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
              title="Share (copy link)"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleAddTask}
              className="flex items-center justify-center gap-1.5 min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 px-2 sm:px-3 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium hover:opacity-90"
            >
              <PlusIcon className="w-5 h-5 shrink-0" />
              <span className="hidden sm:inline">Task</span>
            </button>
            <div className="hidden md:flex items-center gap-1">
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
                onClick={handleSortToolbarClick}
                className="glass-button p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                title="Sort"
              >
                <BarsArrowDownIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="relative md:hidden">
              <button
                type="button"
                onClick={() => setMoreActionsOpen((o) => !o)}
                className="glass-button p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="More actions"
                aria-label="More actions"
                aria-expanded={moreActionsOpen}
                aria-haspopup="menu"
              >
                <EllipsisVerticalIcon className="w-5 h-5" />
              </button>
              {moreActionsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden
                    onClick={() => setMoreActionsOpen(false)}
                  />
                  <div
                    className="absolute right-0 top-full mt-1 py-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20"
                    role="menu"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMoreActionsOpen(false);
                        setSettingsModalOpen(true);
                      }}
                      className="w-full px-3 py-2.5 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Cog6ToothIcon className="w-4 h-4 shrink-0" />
                      Project settings
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMoreActionsOpen(false);
                        window.dispatchEvent(new CustomEvent(PROJECT_WORKSPACE_EVENTS.FOCUS_SEARCH));
                      }}
                      className="w-full px-3 py-2.5 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <MagnifyingGlassIcon className="w-4 h-4 shrink-0" />
                      Search tasks
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMoreActionsOpen(false);
                        window.dispatchEvent(new CustomEvent(PROJECT_WORKSPACE_EVENTS.TOGGLE_FILTER));
                      }}
                      className="w-full px-3 py-2.5 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <FunnelIcon className="w-4 h-4 shrink-0" />
                      Filter
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMoreActionsOpen(false);
                        handleSortToolbarClick();
                      }}
                      className="w-full px-3 py-2.5 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <BarsArrowDownIcon className="w-4 h-4 shrink-0" />
                      Sort
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Nav tabs — single row, horizontal scroll + glass scrollbar (matches PM sub-nav pattern) */}
        <div className="min-w-0 overflow-x-auto overflow-y-hidden glass-scrollbar scroll-smooth pb-2 sm:pb-3 px-2 sm:px-4 pt-0.5">
          <nav className="flex w-max min-w-full flex-nowrap items-center gap-0.5 py-0.5">
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
                  `flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
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
