/**
 * AppHome — Odoo-style home screen shown on first login / dashboard route.
 *
 * Layout:
 *   • Full-page centred hero (greeting + date + role badge)
 *   • Prominent centred search bar
 *   • Quick-action strip
 *   • 🔖 Bookmarks    (bookmark ribbon on card, persisted per tenant)
 *   • All Apps        (everything the user can access)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  BookmarkIcon as BookmarkOutlineIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { useTenantAuth } from '../../../../../../app/providers/TenantAuthContext';
import { useTenantPermissions } from '../../../../contexts/TenantPermissionsContext';
import { useTenantNav } from '../../../../contexts/TenantNavContext';
import { APP_METADATA } from '../../../../../../constants/navigationConstants';
import { cn } from '../../../../../../lib/utils';
import {
  loadRecentApps,
  saveRecentApps,
  pushRecentApp,
  rankLauncherItem,
  LAUNCHER_UI,
} from '../../../../components/launcher/launcherUtils';
import './AppHome.css';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';
// ── Helpers ────────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDateString() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
    year:    'numeric',
  });
}

// ── AppCard ────────────────────────────────────────────────────────────────────
const AppCard = React.memo(function AppCard({ item, isActive, isFav, onNavigate, onToggleFav }) {
  const meta = APP_METADATA[item.key] ?? { gradient: 'from-gray-400 to-gray-500', description: '' };
  const Icon = item.icon;
  const [pressed, setPressed] = useState(false);

  return (
    <div
      data-launcher-card="true"
      data-reveal-card="true"
      className={cn(
        `apphome-card group relative ${LAUNCHER_UI.cardRadius} transition-all duration-200 select-none overflow-visible`,
        isActive
          ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-400/60 shadow-md'
          : 'bg-[#f7f9ff] dark:bg-gray-800/60 border border-[#d8def5] dark:border-gray-700/70 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:bg-[#f2f5ff] dark:hover:bg-gray-800',
        'backdrop-blur-sm',
        isFav && 'border-t-2 border-indigo-500 dark:border-indigo-400'
      )}
    >
      {/* Bookmark ribbon — hangs from the top edge of the card */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleFav(item.key); }}
        className={cn(
          'absolute -top-0.5 right-4 z-10 transition-all duration-200',
          'opacity-0 group-hover:opacity-100 focus:opacity-100',
          isFav && 'opacity-100',
        )}
        aria-label={isFav ? 'Remove bookmark' : 'Bookmark this app'}
      >
        {isFav ? (
          <BookmarkSolidIcon className="h-6 w-[18px] text-indigo-500 dark:text-indigo-400 drop-shadow-sm" />
        ) : (
          <BookmarkOutlineIcon className="h-6 w-[18px] text-gray-300 dark:text-gray-600 hover:text-indigo-400 transition-colors duration-150" />
        )}
      </button>

      <button
        type="button"
        onClick={() => { setPressed(true); setTimeout(() => setPressed(false), 200); onNavigate(item.path); }}
        className={cn(
          `w-full flex flex-col items-center ${LAUNCHER_UI.cardGap} ${LAUNCHER_UI.cardPadding} transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`,
          pressed && 'scale-95'
        )}
        aria-label={`Open ${item.label}`}
      >

      {/* Gradient icon bubble */}
      <div className={cn(
        `apphome-icon-wrap flex items-center justify-center ${LAUNCHER_UI.iconWrap} bg-gradient-to-br shadow-md`,
        'group-hover:shadow-lg group-hover:scale-110 transition-all duration-300',
        meta.gradient
      )}>
        <span className="apphome-icon-shimmer" />
        {Icon && <Icon className={`${LAUNCHER_UI.iconSize} text-white drop-shadow-sm`} />}
      </div>

      {/* Label + description */}
      <div className="text-center w-full">
        <p className={cn(
          `${LAUNCHER_UI.titleSize} font-semibold leading-tight truncate`,
          isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-100'
        )}>
          {item.label}
        </p>
        {meta.description && (
          <p className={`mt-0.5 ${LAUNCHER_UI.descSize} leading-tight text-gray-500 dark:text-gray-400 truncate`}>
            {meta.description}
          </p>
        )}
      </div>

      {/* Active dot */}
      {isActive && (
        <span className="absolute bottom-2.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-400" />
      )}
      </button>
    </div>
  );
});

// ── SectionLabel ───────────────────────────────────────────────────────────────
const SectionLabel = ({ emoji, title, count, bookmarkSection }) => (
  <div className="flex items-center gap-2.5 mb-5">
    {bookmarkSection
      ? <BookmarkSolidIcon className="h-4 w-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
      : emoji && <span className="text-base leading-none">{emoji}</span>
    }
    <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
      {title}
    </h2>
    {count > 0 && (
      <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-[10px] font-semibold text-gray-600 dark:text-gray-300">
        {count}
      </span>
    )}
    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
  </div>
);

// ── AppGrid ────────────────────────────────────────────────────────────────────
const AppGrid = ({ items, activeAppKey, favoriteKeys, onNavigate, onToggleFav }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2.5 sm:gap-3 lg:gap-4">
    {items.map(item => (
      <AppCard
        key={item.key}
        item={item}
        isActive={item.key === activeAppKey}
        isFav={favoriteKeys.includes(item.key)}
        onNavigate={onNavigate}
        onToggleFav={onToggleFav}
      />
    ))}
  </div>
);

// ── AppHome ────────────────────────────────────────────────────────────────────
const AppHome = () => {
  const navigate       = useNavigate();
  const tenantSlug = useTenantSlug();
  const { user, tenant } = useTenantAuth();
  const { hasModulePermission } = useTenantPermissions();
  const {
    filteredMenuItems,
    activeAppKey,
    favoriteKeys,
    toggleFavorite,
  } = useTenantNav();

  const [search,    setSearch]    = useState('');
  const [mounted,   setMounted]   = useState(false);
  const [recentKeys, setRecentKeys] = useState([]);
  const searchRef = useRef(null);
  const rootRef = useRef(null);
  const rafRef = useRef(null);
  const revealScopeRef = useRef(null);
  const isClientUser = ['client', 'customer'].includes(String(user?.role || '').toLowerCase());
  const normalizedRole = String(user?.role || '').toLowerCase();
  const hasElevatedRole = ['owner', 'admin', 'super_admin', 'org_manager', 'org_admin', 'tenant_owner'].includes(normalizedRole);
  const isAdminUser =
    hasModulePermission?.('settings', 'admin') ||
    hasModulePermission?.('users', 'admin') ||
    hasModulePermission?.('projects', 'admin') ||
    hasModulePermission?.('finance', 'admin') ||
    hasModulePermission?.('payroll', 'admin') ||
    hasElevatedRole;
  const showEmployeeApps = !isClientUser && !isAdminUser;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setRecentKeys(loadRecentApps(tenantSlug));
  }, [tenantSlug]);

  // Keyboard shortcut: "/" focuses search
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const firstName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'there';
  const greeting  = getGreeting();
  const dateStr   = getDateString();
  const orgInitial = (tenant?.name || 'TWS').charAt(0).toUpperCase();
  const coverHue = Array.from(tenant?.name || 'TWS').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 45;

  // Filter by search
  const q       = search.trim().toLowerCase();
  const visible = q
    ? filteredMenuItems
      .filter((m) => rankLauncherItem(m, q, APP_METADATA) < 99)
      .sort((a, b) => rankLauncherItem(a, q, APP_METADATA) - rankLauncherItem(b, q, APP_METADATA) || a.label.localeCompare(b.label))
    : filteredMenuItems;

  const persistRecentApp = (appKey) => {
    if (!appKey) return;
    setRecentKeys((prev) => {
      const next = pushRecentApp(prev, appKey);
      saveRecentApps(tenantSlug, next);
      return next;
    });
  };

  const handleNavigate = (path) => {
    const hit = filteredMenuItems.find((m) => m.path === path);
    persistRecentApp(hit?.key);
    navigate(path);
  };

  const recentItems = filteredMenuItems.filter((m) => recentKeys.includes(m.key));
  recentItems.sort((a, b) => recentKeys.indexOf(a.key) - recentKeys.indexOf(b.key));
  const employeeApps = [
    { key: 'employee-profile', label: 'My Profile', path: `/${tenantSlug}/org/employee/profile`, icon: UserIcon },
    { key: 'employee-attendance', label: 'Attendance', path: `/${tenantSlug}/org/employee/attendance`, icon: ClockIcon },
    { key: 'employee-leave', label: 'Leave Requests', path: `/${tenantSlug}/org/employee/leave`, icon: CalendarIcon },
    { key: 'employee-performance', label: 'Performance', path: `/${tenantSlug}/org/employee/performance`, icon: ChartBarIcon },
    { key: 'employee-payroll', label: 'Payroll', path: `/${tenantSlug}/org/employee/payroll`, icon: CurrencyDollarIcon },
  ];

  useEffect(() => {
    const handleArrowNav = (e) => {
      if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;
      if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      const cards = Array.from(document.querySelectorAll('[data-launcher-card="true"]'));
      if (!cards.length) return;
      const active = document.activeElement;
      let idx = cards.findIndex((el) => el === active);
      if (idx === -1) {
        cards[0].focus();
        return;
      }
      e.preventDefault();
      const computed = window.getComputedStyle(cards[0].parentElement);
      const columns = Math.max(1, computed.gridTemplateColumns.split(' ').length);
      if (e.key === 'ArrowRight') idx = Math.min(cards.length - 1, idx + 1);
      if (e.key === 'ArrowLeft') idx = Math.max(0, idx - 1);
      if (e.key === 'ArrowDown') idx = Math.min(cards.length - 1, idx + columns);
      if (e.key === 'ArrowUp') idx = Math.max(0, idx - columns);
      cards[idx].focus();
    };
    window.addEventListener('keydown', handleArrowNav);
    return () => window.removeEventListener('keydown', handleArrowNav);
  }, []);

  const clearRecent = () => {
    setRecentKeys([]);
    saveRecentApps(tenantSlug, []);
  };

  useEffect(() => {
    const scope = revealScopeRef.current;
    if (!scope) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      scope.querySelectorAll('[data-reveal], [data-reveal-card]').forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const nodes = Array.from(scope.querySelectorAll('[data-reveal], [data-reveal-card]'));
    if (!nodes.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [q, visible.length, recentItems.length, showEmployeeApps]);

  const handleMouseMove = (e) => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return;
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const x = ((e.clientX - cx) / rect.width) * 14;
    const y = ((e.clientY - cy) / rect.height) * 14;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.style.setProperty('--parallax-x', `${x.toFixed(2)}px`);
      el.style.setProperty('--parallax-y', `${y.toFixed(2)}px`);
    });
  };

  const handleMouseLeave = () => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty('--parallax-x', '0px');
    el.style.setProperty('--parallax-y', '0px');
  };

  return (
    <div
      ref={rootRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'apphome-root apphome-sky min-h-full relative overflow-hidden transition-all duration-500',
        'px-2 sm:px-3 md:px-4 lg:px-5',
        'bg-gradient-to-br from-[#f2f6ff] via-[#f7f9ff] to-[#f3f7ff]',
        'dark:bg-none',
        mounted ? 'opacity-100' : 'opacity-0'
      )}
    >
      {/* Day-mode ambient pattern to avoid flat background glare */}
      <div className="apphome-bg-layer pointer-events-none absolute inset-0 dark:hidden">
        <div className="apphome-parallax-veil absolute inset-0" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#eaf0ff]/20 via-[#f1f5ff]/12 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(55%_38%_at_14%_8%,rgba(59,130,246,0.06),transparent_74%),radial-gradient(48%_34%_at_88%_18%,rgba(14,165,233,0.05),transparent_76%),radial-gradient(52%_36%_at_72%_86%,rgba(99,102,241,0.05),transparent_78%)]" />
        <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(59,130,246,0.09) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(135deg, rgba(30,64,175,0.08) 0px, rgba(30,64,175,0.08) 1px, transparent 1px, transparent 16px)',
            backgroundSize: '16px 16px',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(70%_45%_at_50%_0%,rgba(2,132,199,0.05),transparent_72%)]" />
      </div>

      {/* ── Centred content wrapper ─────────────────────────────────────────── */}
      <div ref={revealScopeRef} className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* ── Hero / Greeting ──────────────────────────────────────────────── */}
        <div data-reveal className="apphome-fade-up apphome-fade-delay-2 apphome-hero-wrap">
          <div
            className="apphome-cover-banner"
            style={{ '--cover-hue': coverHue }}
            aria-label={`${tenant?.name || 'Organization'} workspace cover`}
          >
            <div className="apphome-cover-banner__mesh" aria-hidden="true" />
            <div className="apphome-cover-banner__line" aria-hidden="true" />
            <div className="apphome-cover-banner__label">
              <span>SOFTWARE HOUSE WORKSPACE</span>
              <b><i /> PRIVATE</b>
            </div>
          </div>
          <div className="apphome-command-copy">
            <div className="apphome-org-identity">
              <div className="apphome-org-mark">{orgInitial}</div>
              <div><strong>{tenant?.name || 'Your organization'}</strong><span>Software House OS</span></div>
            </div>
            <p className="apphome-command-kicker"><span /> Live workspace · {dateStr}</p>
            <h1 className="apphome-hero-title">
              {greeting}, <span className="apphome-hero-name">{firstName}.</span>
            </h1>
            <p className="apphome-command-lede">
              Everything your software house needs, arranged around the way you work.
            </p>
            <div className="apphome-command-meta">
              {tenant?.name && <span><i />{tenant.name}</span>}
              {user?.role && <span>{user.role.replace(/_/g, ' ')}</span>}
            </div>
          </div>
        </div>

        {/* ── Search ─────────────────────────────────────────────────────────── */}
        <div data-reveal className="apphome-fade-up apphome-fade-delay-3 apphome-search-wrap relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search apps and modules…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={cn(
              'w-full rounded-2xl border border-[#d2d6ee] dark:border-gray-700',
              'bg-[#ffffff] dark:bg-gray-800/70 backdrop-blur-sm',
              'py-3.5 pl-13 pr-14 text-sm text-[#0d0e24] dark:text-gray-100',
              'placeholder:text-[#94a3b8] dark:placeholder-gray-500',
              'shadow-sm outline-none transition-all duration-200',
              'focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:shadow-lg focus:border-indigo-300 dark:focus:border-indigo-600'
            )}
            style={{ paddingLeft: '3.25rem' }}
            autoComplete="off"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 text-sm font-bold transition-colors"
              aria-label="Clear search"
            >
              ×
            </button>
          ) : (
            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-400 dark:text-gray-500">
              /
            </kbd>
          )}
        </div>

        {/* ── App grid ───────────────────────────────────────────────────────── */}
        <div data-reveal className="apphome-fade-up apphome-fade-delay-3">
          {!q && showEmployeeApps && (
            <div className="mb-7 space-y-4">
              <SectionLabel emoji="👤" title="Employee Apps" count={employeeApps.length} />
              <AppGrid
                items={employeeApps}
                activeAppKey={activeAppKey}
                favoriteKeys={favoriteKeys}
                onNavigate={handleNavigate}
                onToggleFav={toggleFavorite}
              />
            </div>
          )}
          {q ? (
            /* ── Search results ── */
            visible.length > 0 ? (
              <>
                <SectionLabel emoji="🔍" title="Results" count={visible.length} />
                <AppGrid
                  items={visible}
                  activeAppKey={activeAppKey}
                  favoriteKeys={favoriteKeys}
                  onNavigate={handleNavigate}
                  onToggleFav={toggleFavorite}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-5">
                  <MagnifyingGlassIcon className="h-9 w-9 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-base font-semibold text-gray-500 dark:text-gray-400">
                  No apps match{' '}
                  <span className="text-gray-700 dark:text-gray-300">"{search}"</span>
                </p>
                <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                  Try a different keyword
                </p>
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="mt-4 rounded-full px-4 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                >
                  Clear search
                </button>
              </div>
            )
          ) : (
            /* ── All apps (bookmarks live in the bar above) ── */
            visible.length > 0 && (
              <div>
                {recentItems.length > 0 && (
                  <div className="mb-7">
                    <div className="flex items-center justify-between">
                      <SectionLabel emoji="🕘" title="Recent Apps" count={recentItems.length} />
                      <button
                        type="button"
                        onClick={clearRecent}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline -mt-3"
                      >
                        Clear Recent
                      </button>
                    </div>
                    <AppGrid
                      items={recentItems}
                      activeAppKey={activeAppKey}
                      favoriteKeys={favoriteKeys}
                      onNavigate={handleNavigate}
                      onToggleFav={toggleFavorite}
                    />
                  </div>
                )}
                <SectionLabel emoji="📦" title="All Apps" count={visible.length} />
                <AppGrid
                  items={visible}
                  activeAppKey={activeAppKey}
                  favoriteKeys={favoriteKeys}
                  onNavigate={handleNavigate}
                  onToggleFav={toggleFavorite}
                />
              </div>
            )
          )}
        </div>

        {/* ── Footer hint ──────────────────────────────────────────────────────── */}
        {!q && filteredMenuItems.length > 0 && (
          <p className="text-center text-[11px] text-gray-500 dark:text-gray-400 pb-4">
            Hover any app and click the bookmark ribbon to pin it · Press{' '}
            <kbd className="inline-flex items-center rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-1 py-0.5 font-mono text-[10px]">
              /
            </kbd>{' '}
            to search
          </p>
        )}
      </div>
    </div>
  );
};

export default AppHome;
