/**
 * OdooTopBar — Odoo-style top navigation bar.
 *
 * Layout (left → right):
 *   [⊞ Apps] │ [Org logo/name] │ [Active app name] [Sub-nav tabs…] [More▼] │ [Search] [+Add] [🌙] [⛶] [🔔] [👤]
 *
 * Sub-nav tabs display the current app's child routes (Projects → Tasks, Gantt, etc.)
 * Overflow items beyond MAX_VISIBLE_TABS go into a "More ▼" dropdown.
 * On mobile (<md), the sub-nav tabs are hidden; a hamburger opens the AppGrid instead.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  UserIcon,
  CogIcon,
  BuildingOfficeIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  Bars3Icon,
  HomeIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../../../components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { QUICK_ADD_ACTIONS, APP_METADATA } from '../../../constants/navigationConstants';
import { cn } from '../../../lib/utils';
import { useTutorial } from '../../tutorial/TutorialContext';

const MAX_VISIBLE_TABS = 6;

// ── SubNavTab ─────────────────────────────────────────────────────────────────
const SubNavTab = ({ item, isActive }) => (
  <Link
    to={item.path}
    className={cn(
      'whitespace-nowrap rounded-lg px-3 py-1 text-sm font-medium transition-colors duration-150 outline-none',
      'focus-visible:ring-2 focus-visible:ring-primary-500',
      isActive
        ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 hover:text-gray-900 dark:hover:text-gray-100'
    )}
  >
    {item.label}
  </Link>
);

// ── OdooTopBar ────────────────────────────────────────────────────────────────
const OdooTopBar = ({
  // App / org info
  orgLogoUrl,
  orgName = 'Organization',
  activeApp,          // current top-level menu item (has .label, .children, .path, .key)

  // User
  user,
  onProfile,
  onLogout,

  // Utility
  onSearch,
  onAddAction,
  isFullscreen  = false,
  onFullscreenToggle,
  isDarkMode    = false,
  onToggleTheme,

  // Mobile
  onMobileMenu,  // opens the mobile sheet sidebar
}) => {
  const navigate        = useNavigate();
  const location        = useLocation();
  const { tenantSlug }  = useParams();

  const initial      = (orgName  || 'O').charAt(0).toUpperCase();
  const userInitial  = (user?.fullName?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase();
  const displayName  = user?.fullName || user?.email || 'User';
  const [logoError, setLogoError] = useState(false);
  // Reset error state whenever the logo URL changes (e.g. after a fresh upload)
  useEffect(() => { setLogoError(false); }, [orgLogoUrl]);

  // Tutorial replay hook (TutorialProvider is a parent in TenantOrgLayout)
  const tutorial = useTutorial();

  // ── Sub-nav: split children into visible + overflow ────────────────────────
  const children = activeApp?.children ?? [];
  const visibleTabs  = children.slice(0, MAX_VISIBLE_TABS);
  const overflowTabs = children.slice(MAX_VISIBLE_TABS);

  // Detect active child (exact match first, then startsWith)
  const activeChildPath = useMemo(() => {
    const match = children.find(c => {
      if (location.pathname === c.path) return true;
      // Only match sub-paths for items that go deeper than the parent
      if (c.path !== activeApp?.path && location.pathname.startsWith(c.path + '/')) return true;
      return false;
    });
    return match?.path ?? null;
  }, [children, location.pathname, activeApp?.path]);

  // Active app accent colour (from metadata)
  const appMeta = activeApp ? (APP_METADATA[activeApp.key] ?? null) : null;

  return (
    <header data-tutorial="top-bar" className="flex h-11 shrink-0 items-center gap-2 border-b border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-2 sm:px-3 shadow-sm z-30 relative">

      {/* ── 1. Home / org logo ──────────────────────────────────────────── */}
      <button
        type="button"
        data-tutorial="home-btn"
        onClick={() => navigate(`/${tenantSlug}/org/home`)}
        className="flex shrink-0 items-center gap-2 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Go to home"
        title="Home"
      >
        {orgLogoUrl && !logoError ? (
          <img
            src={orgLogoUrl}
            alt={orgName}
            className="h-6 w-auto max-w-[80px] object-contain"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 text-white font-bold text-xs shadow-sm">
            {initial}
          </div>
        )}
        <HomeIcon className="hidden sm:block h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
      </button>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div className="hidden md:block h-5 w-px bg-gray-200 dark:bg-gray-700 shrink-0" />

      {/* ── 3. Active app name + sub-nav tabs (flex-1) ──────────────────── */}
      <div className="hidden md:flex flex-1 items-center gap-1 min-w-0 overflow-hidden">

        {activeApp ? (
          <>
            {/* Active app name — clickable, goes to app root */}
            <Link
              to={activeApp.path}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold shrink-0 transition-colors',
                'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              {/* App colour dot */}
              {appMeta && (
                <span
                  className={cn('h-2 w-2 rounded-full bg-gradient-to-br shrink-0', appMeta.gradient)}
                  aria-hidden="true"
                />
              )}
              {activeApp.label}
            </Link>

            {/* Sub-nav separator */}
            {children.length > 0 && (
              <span className="text-gray-300 dark:text-gray-600 text-xs select-none shrink-0">/</span>
            )}

            {/* Sub-nav tabs */}
            <nav className="flex items-center gap-0.5 overflow-x-auto no-scrollbar" aria-label={`${activeApp.label} sub-navigation`}>
              {visibleTabs.map(item => (
                <SubNavTab
                  key={item.key}
                  item={item}
                  isActive={item.path === activeChildPath}
                />
              ))}
            </nav>

            {/* Overflow "More ▼" dropdown */}
            {overflowTabs.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 shrink-0"
                  >
                    More
                    <ChevronDownIcon className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  {overflowTabs.map(item => (
                    <DropdownMenuItem
                      key={item.key}
                      onClick={() => navigate(item.path)}
                      className={item.path === activeChildPath ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : ''}
                    >
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        ) : (
          /* Fallback when no active app matched — org name links to org profile */
          <button
            type="button"
            onClick={() => navigate(`/${tenantSlug}/org/settings/organization`)}
            className="text-sm font-semibold text-gray-800 dark:text-gray-200 px-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            title="Organization Profile"
          >
            {orgName}
          </button>
        )}
      </div>

      {/* ── Mobile: spacer so right actions don't bunch left ────────────── */}
      <div className="flex-1 md:hidden" />

      {/* ── Mobile: hamburger (opens app grid) ──────────────────────────── */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-8 w-8 text-gray-500 dark:text-gray-400"
        onClick={onMobileMenu}
        aria-label="Open app menu"
      >
        <Bars3Icon className="h-5 w-5" />
      </Button>

      {/* ── 4. Right actions ────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 shrink-0">

        {/* Search */}
        <Button
          data-tutorial="search-btn"
          variant="ghost"
          size="sm"
          onClick={onSearch}
          className="hidden sm:flex h-7 items-center gap-1.5 rounded-xl px-2.5 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <MagnifyingGlassIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden lg:inline">Search…</span>
          <kbd className="hidden xl:inline text-[10px] opacity-50 font-mono">⌘K</kbd>
        </Button>

        {/* Mobile search icon */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden h-8 w-8"
          onClick={onSearch}
          aria-label="Search"
        >
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </Button>

        {/* Quick Add */}
        {onAddAction && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button data-tutorial="quick-add" size="sm" className="h-7 px-2 gap-1 text-xs">
                <PlusIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {QUICK_ADD_ACTIONS.map(({ id, label, icon: Icon }) => (
                <DropdownMenuItem key={id} onClick={() => onAddAction(id)}>
                  <Icon className="h-4 w-4 text-primary-500 dark:text-primary-400" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Theme toggle */}
        {typeof onToggleTheme === 'function' && (
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={onToggleTheme}
            title={isDarkMode ? 'Light mode' : 'Dark mode'}
          >
            {isDarkMode
              ? <SunIcon  className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              : <MoonIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            }
          </Button>
        )}

        {/* Fullscreen */}
        {typeof onFullscreenToggle === 'function' && (
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={onFullscreenToggle}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen
              ? <ArrowsPointingInIcon  className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              : <ArrowsPointingOutIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            }
          </Button>
        )}

        {/* Replay tour */}
        {tutorial?.startTutorial && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 dark:text-gray-500 hover:text-primary-500 dark:hover:text-primary-400"
            onClick={tutorial.startTutorial}
            title="Replay product tour"
            aria-label="Replay product tour"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </Button>
        )}

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-7 w-7 relative" title="Notifications">
          <BellIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
        </Button>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button data-tutorial="user-menu" variant="ghost" size="icon" className="h-7 w-7 rounded-full" aria-label="User menu">
              <Avatar className="h-6 w-6">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={displayName} />}
                <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary-500 to-accent-500 text-white">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onProfile}>
              <UserIcon className="h-4 w-4" /> My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/${tenantSlug}/org/settings/organization`)}>
              <BuildingOfficeIcon className="h-4 w-4" /> Org Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/${tenantSlug}/org/settings`)}>
              <CogIcon className="h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onLogout}
              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
};

export default OdooTopBar;
