/**
 * AppHome — Odoo-style home screen shown on first login / dashboard route.
 *
 * Layout:
 *   • Full-page centred hero (greeting + date + role badge)
 *   • Prominent centred search bar
 *   • Quick-action strip
 *   • 🔖 Bookmarks    (bookmark ribbon on card, persisted per tenant)
 *   • 🕐 Recent       (auto-tracked last 5 apps)
 *   • All Apps        (everything else the user can access)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  BookmarkIcon as BookmarkOutlineIcon,
  ClockIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { useTenantAuth } from '../../../../../../app/providers/TenantAuthContext';
import { useTenantNav } from '../../../../contexts/TenantNavContext';
import { APP_METADATA } from '../../../../../../constants/navigationConstants';
import { cn } from '../../../../../../lib/utils';
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
      role="button"
      tabIndex={0}
      onClick={() => { setPressed(true); setTimeout(() => setPressed(false), 200); onNavigate(item.path); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(item.path); } }}
      className={cn(
        'group relative flex flex-col items-center gap-3 rounded-2xl p-4 pt-5 transition-all duration-200 cursor-pointer select-none overflow-visible',
        'outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
        pressed && 'scale-95',
        isActive
          ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-400/60 shadow-md'
          : 'bg-white/80 dark:bg-gray-800/60 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:bg-white dark:hover:bg-gray-800',
        'backdrop-blur-sm',
        // bookmarked card gets a vivid top accent line
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
        tabIndex={-1}
        aria-label={isFav ? 'Remove bookmark' : 'Bookmark this app'}
      >
        {isFav ? (
          <BookmarkSolidIcon className="h-6 w-[18px] text-indigo-500 dark:text-indigo-400 drop-shadow-sm" />
        ) : (
          <BookmarkOutlineIcon className="h-6 w-[18px] text-gray-300 dark:text-gray-600 hover:text-indigo-400 transition-colors duration-150" />
        )}
      </button>

      {/* Gradient icon bubble */}
      <div className={cn(
        'flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-md',
        'group-hover:shadow-lg group-hover:scale-110 transition-all duration-300',
        meta.gradient
      )}>
        {Icon && <Icon className="h-7 w-7 text-white drop-shadow-sm" />}
      </div>

      {/* Label + description */}
      <div className="text-center w-full">
        <p className={cn(
          'text-[13px] font-semibold leading-tight truncate',
          isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'
        )}>
          {item.label}
        </p>
        {meta.description && (
          <p className="mt-0.5 text-[11px] leading-tight text-gray-400 dark:text-gray-500 truncate">
            {meta.description}
          </p>
        )}
      </div>

      {/* Active dot */}
      {isActive && (
        <span className="absolute bottom-2.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-400" />
      )}
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
    <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
      {title}
    </h2>
    {count > 0 && (
      <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
        {count}
      </span>
    )}
    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
  </div>
);

// ── AppGrid ────────────────────────────────────────────────────────────────────
const AppGrid = ({ items, activeAppKey, favoriteKeys, onNavigate, onToggleFav }) => (
  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
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

// ── QuickStat ──────────────────────────────────────────────────────────────────
const QuickStat = ({ icon: Icon, label, value, gradient }) => (
  <div className={cn(
    'flex items-center gap-3 rounded-xl px-4 py-3',
    'bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm shadow-sm',
    'border border-gray-100 dark:border-gray-700/50',
    'hover:shadow-md transition-shadow duration-200'
  )}>
    <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br flex-shrink-0', gradient)}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">{value}</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{label}</p>
    </div>
  </div>
);

// ── AppHome ────────────────────────────────────────────────────────────────────
const AppHome = () => {
  const navigate       = useNavigate();
  const { tenantSlug } = useParams();
  const { user, tenant } = useTenantAuth();
  const {
    filteredMenuItems,
    activeAppKey,
    favoriteKeys,
    toggleFavorite,
    recentApps,
  } = useTenantNav();

  const [search,    setSearch]    = useState('');
  const [mounted,   setMounted]   = useState(false);
  const searchRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

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

  // Filter by search
  const q       = search.trim().toLowerCase();
  const visible = q
    ? filteredMenuItems.filter(m =>
        m.label.toLowerCase().includes(q) ||
        (APP_METADATA[m.key]?.description ?? '').toLowerCase().includes(q)
      )
    : filteredMenuItems;

  const favSet    = new Set(favoriteKeys);
  const recentSet = new Set((recentApps ?? []).map(a => a.key));

  // Bookmarks live in the BookmarkBar above — not a separate section here.
  const recentItems = q ? [] : visible.filter(m => recentSet.has(m.key));
  const otherItems  = q ? visible : visible.filter(m => !recentSet.has(m.key));

  const handleNavigate = (path) => navigate(path);

  // Quick stats derived from available data
  const totalApps   = filteredMenuItems.length;
  const totalFavs   = favoriteKeys.length;
  const totalRecent = (recentApps ?? []).length;

  return (
    <div
      className={cn(
        'min-h-full transition-opacity duration-500',
        mounted ? 'opacity-100' : 'opacity-0'
      )}
    >
      {/* ── Centred content wrapper ─────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">

        {/* ── Hero / Greeting ──────────────────────────────────────────────── */}
        <div className="text-center space-y-3">
          {/* Date */}
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            {dateStr}
          </p>

          {/* Greeting */}
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-white"
            style={{ lineHeight: 1.1 }}
          >
            {greeting},{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
              {firstName}
            </span>
            {' '}👋
          </h1>

          {/* Org + Role */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {tenant?.name && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {tenant.name}
              </span>
            )}
            {tenant?.name && user?.role && (
              <span className="text-gray-300 dark:text-gray-600">·</span>
            )}
            {user?.role && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-3 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-700/50">
                {user.role.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>

        {/* ── Search ─────────────────────────────────────────────────────────── */}
        <div className="relative max-w-2xl mx-auto">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search apps and modules…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={cn(
              'w-full rounded-2xl border border-gray-200 dark:border-gray-700',
              'bg-white/90 dark:bg-gray-800/70 backdrop-blur-sm',
              'py-3.5 pl-13 pr-14 text-sm text-gray-900 dark:text-gray-100',
              'placeholder-gray-400 dark:placeholder-gray-500',
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

        {/* ── Quick stats strip ──────────────────────────────────────────────── */}
        {!q && (
          <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
            <QuickStat
              icon={Squares2X2Icon}
              label="Available Apps"
              value={totalApps}
              gradient="from-indigo-500 to-purple-600"
            />
            <QuickStat
              icon={BookmarkSolidIcon}
              label="Pinned to Bar"
              value={totalFavs || '—'}
              gradient="from-indigo-500 to-violet-600"
            />
            <QuickStat
              icon={ClockIcon}
              label="Recently Used"
              value={totalRecent || '—'}
              gradient="from-emerald-500 to-teal-600"
            />
          </div>
        )}

        {/* ── App grid ───────────────────────────────────────────────────────── */}
        <div>
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
            /* ── Normal sections ── */
            <div className="space-y-8">
              {/* Recent */}
              {recentItems.length > 0 && (
                <div>
                  <SectionLabel emoji="🕐" title="Recent" count={recentItems.length} />
                  <AppGrid
                    items={recentItems}
                    activeAppKey={activeAppKey}
                    favoriteKeys={favoriteKeys}
                    onNavigate={handleNavigate}
                    onToggleFav={toggleFavorite}
                  />
                </div>
              )}

              {/* All Apps */}
              {otherItems.length > 0 && (
                <div>
                  <SectionLabel
                    emoji="📦"
                    title={recentItems.length ? 'All Apps' : null}
                    count={recentItems.length ? otherItems.length : 0}
                  />
                  <AppGrid
                    items={otherItems}
                    activeAppKey={activeAppKey}
                    favoriteKeys={favoriteKeys}
                    onNavigate={handleNavigate}
                    onToggleFav={toggleFavorite}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer hint ──────────────────────────────────────────────────────── */}
        {!q && filteredMenuItems.length > 0 && (
          <p className="text-center text-[11px] text-gray-400 dark:text-gray-600 pb-4">
            Hover any app and click the bookmark ribbon to pin it to the bar · Press{' '}
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
