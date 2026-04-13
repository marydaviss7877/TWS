/**
 * AppGrid — Odoo-style full-screen app launcher overlay.
 *
 * Features:
 * - Full-screen backdrop with blur (like iOS App Library / Odoo home)
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
import {
  loadRecentApps,
  saveRecentApps,
  pushRecentApp,
  rankLauncherItem,
  LAUNCHER_UI,
} from './launcher/launcherUtils';

// ── AppCard ───────────────────────────────────────────────────────────────────
const AppCard = React.memo(function AppCard({
  item,
  isActive,
  isFav,
  onNavigate,
  onToggleFav,
}) {
  const meta = APP_METADATA[item.key] ?? { gradient: 'from-gray-500 to-gray-600', description: '' };
  const Icon = item.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      data-launcher-card="true"
      onClick={() => onNavigate(item.path, item.key)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate(item.path, item.key);
        }
      }}
      className={cn(
        `group relative flex flex-col items-center ${LAUNCHER_UI.cardGap} ${LAUNCHER_UI.cardRadius} ${LAUNCHER_UI.cardPadding} transition-all duration-150 outline-none`,
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
      >
        {isFav
          ? <StarSolidIcon  className="h-3.5 w-3.5 text-amber-400" />
          : <StarOutlineIcon className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 hover:text-amber-400" />
        }
      </button>

      {/* Icon bubble */}
      <div className={cn(
        `flex items-center justify-center ${LAUNCHER_UI.iconWrap} bg-gradient-to-br shadow-md`,
        meta.gradient
      )}>
        {Icon && <Icon className={`${LAUNCHER_UI.iconSize} text-white drop-shadow-sm`} />}
      </div>

      {/* Label */}
      <span className={cn(
        `${LAUNCHER_UI.titleWidth} text-center ${LAUNCHER_UI.titleSize} font-medium leading-snug`,
        isActive
          ? 'text-primary-700 dark:text-primary-300'
          : 'text-gray-800 dark:text-gray-100'
      )}>
        {item.label}
      </span>
      {meta.description && (
        <span className={`${LAUNCHER_UI.descWidth} text-center ${LAUNCHER_UI.descSize} leading-tight text-gray-500 dark:text-gray-400 truncate`}>
          {meta.description}
        </span>
      )}

      {/* Active indicator dot */}
      {isActive && (
        <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary-500" />
      )}
    </div>
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
  favoriteKeys = [],
  isFavorite,
  toggleFavorite,
}) => {
  const navigate    = useNavigate();
  const searchRef   = useRef(null);
  const [search, setSearch] = useState('');
  const [recentKeys, setRecentKeys] = useState([]);

  // Focus search when opened
  useEffect(() => {
    if (!isOpen) { setSearch(''); return; }
    const id = setTimeout(() => searchRef.current?.focus(), 80);
    return () => clearTimeout(id);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setRecentKeys(loadRecentApps(tenantSlug));
  }, [isOpen, tenantSlug]);

  // Keyboard: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Keyboard: arrow navigation between cards
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
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
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleNavigate = useCallback((path, appKey) => {
    if (appKey) {
      setRecentKeys((prev) => {
        const next = pushRecentApp(prev, appKey);
        saveRecentApps(tenantSlug, next);
        return next;
      });
    }
    navigate(path);
    onClose();
  }, [navigate, onClose, tenantSlug]);

  if (!isOpen) return null;

  // ── Filtered app list ───────────────────────────────────────────────────────
  const q = search.trim().toLowerCase();
  const visible = q
    ? filteredMenuItems
      .filter((m) => rankLauncherItem(m, q, APP_METADATA) < 99)
      .sort((a, b) => rankLauncherItem(a, q, APP_METADATA) - rankLauncherItem(b, q, APP_METADATA) || a.label.localeCompare(b.label))
    : filteredMenuItems;

  const favSet = new Set(favoriteKeys);

  const favItems   = visible.filter(m => favSet.has(m.key));
  const otherItems = visible.filter(m => !favSet.has(m.key));
  const recentItems = visible.filter((m) => recentKeys.includes(m.key));
  recentItems.sort((a, b) => recentKeys.indexOf(a.key) - recentKeys.indexOf(b.key));
  const clearRecent = () => {
    setRecentKeys([]);
    saveRecentApps(tenantSlug, []);
  };

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
                title="Recent Apps"
                emoji="🕘"
                items={recentItems}
                activeAppKey={activeAppKey}
                favoriteKeys={favoriteKeys}
                onNavigate={handleNavigate}
                onToggleFav={toggleFavorite}
              />
              {recentItems.length > 0 && (
                <div className="flex justify-end -mt-4 mb-3">
                  <button
                    type="button"
                    onClick={clearRecent}
                    className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Clear Recent
                  </button>
                </div>
              )}
              <GridSection
                title="Pinned Apps"
                emoji="⭐"
                items={favItems}
                activeAppKey={activeAppKey}
                favoriteKeys={favoriteKeys}
                onNavigate={handleNavigate}
                onToggleFav={toggleFavorite}
              />
              <GridSection
                title={favItems.length ? 'All Apps' : null}
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
            Hover an app and click ⭐ to pin it
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
