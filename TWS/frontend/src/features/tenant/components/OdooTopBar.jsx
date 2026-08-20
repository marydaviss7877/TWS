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
import { useTenantSlug } from '../../../shared/hooks/useTenantSlug';
import {
  MagnifyingGlassIcon,
  BellIcon,
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
import { Button } from '../../../components/ui/Button/Button';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/Avatar/Avatar';
import ThemeToggle from '../../../shared/components/ui/ThemeToggle';
import { Sheet, SheetContent } from '../../../components/ui/Sheet/Sheet';
import { APP_METADATA } from '../../../constants/navigationConstants';
import { cn } from '../../../lib/utils';
import { tenantPath } from '../../../shared/utils/tenantRoutes';

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
  isFullscreen  = false,
  onFullscreenToggle,

  // Mobile
  onMobileMenu,  // opens the mobile sheet sidebar
  showAccount = true,
}) => {
  const navigate        = useNavigate();
  const location        = useLocation();
  const tenantSlug = useTenantSlug();
  const isHome = location.pathname === '/home' || location.pathname.endsWith('/org/home');

  const initial      = (orgName  || 'O').charAt(0).toUpperCase();
  const userInitial  = (user?.fullName?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase();
  const displayName  = user?.fullName || user?.email || 'User';
  const isClientUser = ['client', 'customer'].includes(String(user?.role || '').toLowerCase());
  const isAdminUser = ['owner', 'admin', 'super_admin', 'org_manager', 'org_admin', 'tenant_owner']
    .includes(String(user?.role || '').toLowerCase());
  const [avatarError, setAvatarError] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const avatarSrc = (() => {
    const raw = user?.avatarUrl || user?.profilePicUrl;
    if (!raw) return null;
    if (raw.startsWith('/api/tenant/')) {
      const match = raw.match(/\/uploads\/profile-pictures\/[^/?#]+/);
      if (match) return match[0];
      return raw;
    }
    if (raw.startsWith('/uploads/profile-pictures/')) {
      return `/api/tenant/${tenantSlug}/organization${raw}`;
    }
    return raw;
  })();
  const [logoError, setLogoError] = useState(false);
  // Reset error state whenever the logo URL changes (e.g. after a fresh upload)
  useEffect(() => { setLogoError(false); }, [orgLogoUrl]);
  useEffect(() => { setAvatarError(false); }, [user?.avatarUrl, user?.profilePicUrl, tenantSlug]);

  // ── Sub-nav: split children into visible + overflow ────────────────────────
  const children = activeApp?.children ?? [];
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
    <header className={`tws-command-nav ${isHome ? 'tws-command-nav--home' : ''} flex h-11 sm:h-12 shrink-0 items-center gap-1.5 sm:gap-2 border-b border-[#c9d6f4]/70 dark:border-gray-700/80 bg-[#dce7ff]/52 dark:bg-gray-900 px-2 sm:px-3 shadow-sm z-30 relative backdrop-blur-[2px]`}>

      {/* ── 1. Home / org logo ──────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => navigate(tenantPath(tenantSlug, 'org', 'home'))}
        className="md:hidden group flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-lg px-1 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 hover:bg-[#e8eeff] dark:hover:bg-gray-800 transition-all duration-200"
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
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 text-white font-bold text-xs shadow-sm transition-transform duration-200 group-hover:scale-105 group-hover:rotate-[-4deg]">
            {initial}
          </div>
        )}
        <HomeIcon className="hidden sm:block h-3.5 w-3.5 text-slate-400 dark:text-gray-500 transition-transform duration-200 group-hover:translate-x-0.5" />
      </button>

      {/* Current module context — navigation itself lives in the sidebar */}
      <div className="hidden md:flex flex-1 items-center gap-1 min-w-0 min-h-0">

        {activeApp ? (
          <>
            {/* Active app name — clickable, goes to app root */}
            <Link
              to={activeApp.path}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold shrink-0 transition-colors',
                'text-[#0d0e24] dark:text-white hover:bg-[#e8eeff] dark:hover:bg-gray-800'
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

            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {children.find(item => item.path === activeChildPath)?.label || 'Workspace'}
            </span>
          </>
        ) : (
          /* Fallback when no active app matched — org name links to org profile */
          <button
            type="button"
            onClick={() => navigate(tenantPath(tenantSlug, 'org', 'settings', 'organization'))}
            className="text-sm font-semibold text-[#0d0e24] dark:text-gray-200 px-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
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
        className="md:hidden h-8 w-8 sm:h-9 sm:w-9 text-slate-500 dark:text-gray-400 hover:bg-[#e8eeff] dark:hover:bg-gray-800"
        onClick={onMobileMenu}
        aria-label="Open app menu"
      >
        <Bars3Icon className="h-5 w-5" />
      </Button>

      {/* ── 4. Right actions ────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 shrink-0">

        {/* Search */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onSearch}
          className="tws-nav-search hidden sm:flex h-7 w-7 lg:w-auto lg:px-2.5 items-center justify-center lg:justify-start gap-1.5 rounded-xl text-xs text-slate-500 dark:text-gray-500 bg-[#eef2ff] dark:bg-gray-800 border border-[#d2d6ee] dark:border-gray-700 hover:bg-[#e8eeff] dark:hover:bg-gray-700"
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
          <MagnifyingGlassIcon className="h-4 w-4 text-slate-500 dark:text-gray-400" />
        </Button>

        {/* Secondary utilities are retained only for mobile; desktop keeps a focused header */}
        <ThemeToggle size="sm" className="sm:hidden" />

        {typeof onFullscreenToggle === 'function' && (
          <Button
            variant="ghost" size="icon" className="hidden h-7 w-7"
            onClick={onFullscreenToggle}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen
              ? <ArrowsPointingInIcon  className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              : <ArrowsPointingOutIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            }
          </Button>
        )}

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="hidden h-7 w-7 relative" title="Notifications">
          <BellIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
        </Button>

        {/* Profile — right-side account drawer */}
        {showAccount && <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="tws-profile-trigger h-8 rounded-xl"
              aria-label="Open account panel"
            >
              <Avatar className="h-6 w-6 shrink-0">
                {avatarSrc && !avatarError && <AvatarImage src={avatarSrc} alt={displayName} onError={() => setAvatarError(true)} />}
                <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary-500 to-accent-500 text-white">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <span className="tws-profile-trigger__copy">
                <strong>{displayName}</strong>
                <small>{String(user?.role || 'member').replace(/_/g, ' ')}</small>
              </span>
              <ChevronDownIcon className="tws-profile-trigger__chevron" aria-hidden="true" />
            </button>
          <SheetContent side="right" className="tws-account-drawer">
            <div className="tws-account-drawer__eyebrow">Account</div>
            <div className="tws-profile-menu__identity">
              <Avatar className="h-11 w-11 shrink-0">
                {avatarSrc && !avatarError && <AvatarImage src={avatarSrc} alt={displayName} onError={() => setAvatarError(true)} />}
                <AvatarFallback className="bg-gradient-to-br from-sky-500 to-primary-500 text-sm font-bold text-white">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <span className="tws-profile-menu__identity-copy">
                <strong>{displayName}</strong>
                <small>{user?.email}</small>
                <em><i /> Active · {String(user?.role || 'member').replace(/_/g, ' ')}</em>
              </span>
            </div>
            <div className="tws-account-drawer__rule" />
            <button onClick={() => { setProfileOpen(false); onProfile(); }} className="tws-profile-menu__item">
              <span className="tws-profile-menu__icon"><UserIcon /></span>
              <span><strong>My profile</strong><small>Identity and personal details</small></span>
            </button>
            <button onClick={() => { setProfileOpen(false); navigate(tenantPath(tenantSlug, 'org', 'settings', 'organization')); }} className="tws-profile-menu__item">
              <span className="tws-profile-menu__icon"><BuildingOfficeIcon /></span>
              <span><strong>Organization</strong><small>Workspace profile and brand</small></span>
            </button>
            {isAdminUser && (
              <button onClick={() => { setProfileOpen(false); navigate(tenantPath(tenantSlug, 'org', 'settings')); }} className="tws-profile-menu__item">
                <span className="tws-profile-menu__icon"><CogIcon /></span>
                <span><strong>Settings</strong><small>Preferences and administration</small></span>
              </button>
            )}
            <div className="tws-account-drawer__spacer" />
            <button
              onClick={onLogout}
              className="tws-profile-menu__item tws-profile-menu__item--danger"
            >
              <span className="tws-profile-menu__icon"><ArrowRightOnRectangleIcon /></span>
              <span><strong>Sign out</strong><small>End this workspace session</small></span>
            </button>
          </SheetContent>
        </Sheet>}

      </div>
    </header>
  );
};

export default OdooTopBar;
