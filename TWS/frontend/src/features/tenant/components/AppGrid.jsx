/**
 * AppGrid — Odoo-style full-screen app launcher overlay.
 *
 * Features:
 * - Full-screen backdrop with blur (like iOS App Library / Odoo home)
 * - Auto-tracked "Recent" section (top 5 visited apps)
 * - "Favourites" section (starred apps, persisted per tenant)
 * - Star/unstar any app with a single click
 * - Live search across all available apps
 * - Active app highlighted with primary ring
 * - Smooth enter/exit animations
 * - Keyboard: Escape to close, Tab to cycle, Enter to navigate
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  StarIcon as StarOutlineIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { APP_METADATA } from '../../../constants/navigationConstants';
import { cn } from '../../../lib/utils';

// ── AppCard ───────────────────────────────────────────────────────────────────
const AppCard = React.memo(function AppCard({
  item,
  isActive,
  isFav,
  onNavigate,
  onToggleFav,
}) {
  const meta   = APP_METADATA[item.key] ?? { gradient: 'from-gray-500 to-gray-600', description: '' };
  const Icon   = item.icon;

  return (
    <button
      type="button"
      onClick={() => onNavigate(item.path)}
      className={cn(
        'group relative flex flex-col items-center gap-2 rounded-2xl p-3 transition-all duration-150 outline-none',
        'hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary-500',
        isActive
          ? 'bg-primary-50 dark:bg-primary-900/30 ring-2 ring-primary-400 ring-offset-1'
          : 'hover:bg-gray-100/70 dark:hover:bg-white/5'
      )}
    >
      {/* Star toggle */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleFav(item.key); }}
        className={cn(
          'absolute top-1.5 right-1.5 rounded-md p-0.5 transition-all duration-150',
          'opacity-0 group-hover:opacity-100 focus:opacity-100',
          isFav && 'opacity-100'
        )}
        aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
        tabIndex={-1}
      >
        {isFav
          ? <StarSolidIcon  className="h-3.5 w-3.5 text-amber-400" />
          : <StarOutlineIcon className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 hover:text-amber-400" />
        }
      </button>

      {/* Icon bubble */}
      <div className={cn(
        'flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-md',
        meta.gradient
      )}>
        {Icon && <Icon className="h-7 w-7 text-white drop-shadow-sm" />}
      </div>

      {/* Label */}
      <span className={cn(
        'w-20 text-center text-xs font-medium leading-snug',
        isActive
          ? 'text-primary-700 dark:text-primary-300'
          : 'text-gray-700 dark:text-gray-200'
      )}>
        {item.label}
      </span>

      {/* Active indicator dot */}
      {isActive && (
        <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary-500" />
      )}
    </button>
  );
});

// ── Section ───────────────────────────────────────────────────────────────────
const GridSection = ({ title, emoji, items, activeAppKey, favoriteKeys, onNavigate, onToggleFav }) => {
  if (!items.length) return null;
  return (
    <div className="mb-5">
      {title && (
        <h3 className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {emoji && <span className="mr-1.5">{emoji}</span>}{title}
        </h3>
      )}
      <div className="flex flex-wrap gap-1">
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
    </div>
  );
};

// ── AppGrid ───────────────────────────────────────────────────────────────────
const AppGrid = ({
  isOpen,
  onClose,
  filteredMenuItems = [],
  activeAppKey,
  tenantSlug,
  orgName,
  orgLogoUrl,
  favoriteApps = [],
  recentApps   = [],
  favoriteKeys = [],
  isFavorite,
  toggleFavorite,
}) => {
  const navigate    = useNavigate();
  const searchRef   = useRef(null);
  const [search, setSearch] = useState('');

  // Focus search when opened
  useEffect(() => {
    if (!isOpen) { setSearch(''); return; }
    const id = setTimeout(() => searchRef.current?.focus(), 80);
    return () => clearTimeout(id);
  }, [isOpen]);

  // Keyboard: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleNavigate = useCallback((path) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  if (!isOpen) return null;

  // ── Filtered app list ───────────────────────────────────────────────────────
  const q = search.trim().toLowerCase();
  const visible = q
    ? filteredMenuItems.filter(m =>
        m.label.toLowerCase().includes(q) ||
        (APP_METADATA[m.key]?.description ?? '').toLowerCase().includes(q)
      )
    : filteredMenuItems;

  const favSet    = new Set(favoriteKeys);
  const recentSet = new Set(recentApps.map(a => a.key));

  const favItems    = visible.filter(m => favSet.has(m.key));
  const recentItems = q ? [] : visible.filter(m => recentSet.has(m.key) && !favSet.has(m.key));
  const otherItems  = visible.filter(m => !favSet.has(m.key) && !recentSet.has(m.key));

  const orgInitial  = (orgName || tenantSlug || 'T').charAt(0).toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9990] bg-black/60 backdrop-blur-md"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* App launcher card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="App launcher"
        className={cn(
          'fixed left-1/2 top-[6vh] z-[9991] w-full max-w-3xl max-h-[88vh]',
          '-translate-x-1/2 flex flex-col',
          'rounded-3xl bg-white dark:bg-gray-900',
          'border border-gray-200/60 dark:border-gray-700/60',
          'shadow-2xl',
          'animate-scale-in'
        )}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 px-5 py-3.5">
          {/* Org logo / initial */}
          {orgLogoUrl ? (
            <img src={orgLogoUrl} alt={orgName} className="h-7 w-auto max-w-[80px] object-contain rounded-md" />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 text-white font-bold text-xs">
              {orgInitial}
            </div>
          )}
          <span className="text-sm font-semibold text-gray-900 dark:text-white shrink-0">
            Apps
          </span>

          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search apps…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={cn(
                'w-full rounded-xl border-0 bg-gray-100 dark:bg-gray-800',
                'py-1.5 pl-9 pr-4 text-sm text-gray-900 dark:text-gray-100',
                'placeholder-gray-400 dark:placeholder-gray-500',
                'outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
                'transition-shadow'
              )}
            />
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close app launcher"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* ── App grid content ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-5 glass-scrollbar">
          {/* Search results — flat list */}
          {q ? (
            visible.length > 0 ? (
              <GridSection
                items={visible}
                activeAppKey={activeAppKey}
                favoriteKeys={favoriteKeys}
                onNavigate={handleNavigate}
                onToggleFav={toggleFavorite}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MagnifyingGlassIcon className="h-10 w-10 text-gray-200 dark:text-gray-700 mb-3" />
                <p className="text-sm text-gray-400 dark:text-gray-500">No apps match <strong>"{search}"</strong></p>
              </div>
            )
          ) : (
            <>
              <GridSection
                title="Favourites"
                emoji="⭐"
                items={favItems}
                activeAppKey={activeAppKey}
                favoriteKeys={favoriteKeys}
                onNavigate={handleNavigate}
                onToggleFav={toggleFavorite}
              />
              <GridSection
                title="Recent"
                emoji="🕐"
                items={recentItems}
                activeAppKey={activeAppKey}
                favoriteKeys={favoriteKeys}
                onNavigate={handleNavigate}
                onToggleFav={toggleFavorite}
              />
              <GridSection
                title={favItems.length || recentItems.length ? 'All Apps' : null}
                items={otherItems}
                activeAppKey={activeAppKey}
                favoriteKeys={favoriteKeys}
                onNavigate={handleNavigate}
                onToggleFav={toggleFavorite}
              />
            </>
          )}
        </div>

        {/* ── Footer hint ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-5 py-2">
          <p className="text-[10px] text-gray-400 dark:text-gray-600">
            Hover an app and click ⭐ to pin it to Favourites
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-600">
            Press <kbd className="rounded bg-gray-100 dark:bg-gray-800 px-1 font-mono text-[10px]">Esc</kbd> to close
          </p>
        </div>
      </div>
    </>
  );
};

export default AppGrid;
