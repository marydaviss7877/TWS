/**
 * useAppNavigation — Odoo-style app navigation state.
 *
 * Derives the active top-level app from the URL, tracks recently-visited
 * apps automatically, and lets users star favourites. No manual shortcuts
 * setup required — it all happens implicitly.
 */

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const RECENTS_PREFIX   = 'tws-app-recents';
const FAVORITES_PREFIX = 'tws-app-favorites';
const MAX_RECENTS      = 5;

// ── Storage helpers ───────────────────────────────────────────────────────────
function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return fallback;
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}

// ── URL → active app key ──────────────────────────────────────────────────────
/**
 * Extracts the top-level app key from the current pathname.
 * Handles both /org/<key> and /org/software-house/<key> patterns.
 */
export function getActiveAppKeyFromPath(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  const orgIdx = segments.indexOf('org');
  if (orgIdx === -1) return null;

  const after = segments.slice(orgIdx + 1);
  if (!after.length) return null;

  // /org/software-house/hr → 'hr'
  if (after[0] === 'software-house' && after[1]) return after[1];

  // /org/projects/tasks → 'projects'
  return after[0];
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAppNavigation(tenantSlug, filteredMenuItems = []) {
  const location = useLocation();

  // Re-render when favorites change (toggling star in grid)
  const [favVersion, setFavVersion] = useState(0);

  const activeAppKey = useMemo(
    () => getActiveAppKeyFromPath(location.pathname),
    [location.pathname]
  );

  const activeApp = useMemo(
    () => filteredMenuItems.find(m => m.key === activeAppKey) ?? null,
    [filteredMenuItems, activeAppKey]
  );

  // Auto-track recent apps on navigation (skip dashboard — everyone goes there)
  useEffect(() => {
    if (!tenantSlug || !activeAppKey || activeAppKey === 'home') return;
    const storageKey = `${RECENTS_PREFIX}-${tenantSlug}`;
    const current = read(storageKey, []);
    const updated  = [activeAppKey, ...current.filter(k => k !== activeAppKey)].slice(0, MAX_RECENTS);
    write(storageKey, updated);
  }, [activeAppKey, tenantSlug]);

  // ── Derived lists (re-computed when favVersion bumps) ────────────────────────
  const recentApps = useMemo(() => {
    if (!tenantSlug) return [];
    const keys = read(`${RECENTS_PREFIX}-${tenantSlug}`, []);
    return keys.map(k => filteredMenuItems.find(m => m.key === k)).filter(Boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, filteredMenuItems, favVersion]);

  const favoriteKeys = useMemo(() => {
    if (!tenantSlug) return [];
    return read(`${FAVORITES_PREFIX}-${tenantSlug}`, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, favVersion]);

  const favoriteApps = useMemo(
    () => favoriteKeys.map(k => filteredMenuItems.find(m => m.key === k)).filter(Boolean),
    [favoriteKeys, filteredMenuItems]
  );

  const isFavorite = useCallback(
    (key) => favoriteKeys.includes(key),
    [favoriteKeys]
  );

  const toggleFavorite = useCallback((key) => {
    if (!tenantSlug) return;
    const storageKey = `${FAVORITES_PREFIX}-${tenantSlug}`;
    const current = read(storageKey, []);
    const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
    write(storageKey, next);
    setFavVersion(v => v + 1); // Trigger re-render
  }, [tenantSlug]);

  return {
    activeAppKey,
    activeApp,
    favoriteApps,
    recentApps,
    favoriteKeys,
    isFavorite,
    toggleFavorite,
  };
}
