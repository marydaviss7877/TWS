/**
 * useAppNavigation — Odoo-style app navigation state.
 *
 * Derives the active top-level app from the URL and lets users star favourites.
 */

import { useMemo, useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';

const FAVORITES_PREFIX = 'tws-app-favorites';

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
  const after = orgIdx >= 0 ? segments.slice(orgIdx + 1) : segments;
  if (!after.length) return null;
  if (after[0] === 'home') return 'dashboard';

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

  // ── Derived lists (re-computed when favVersion bumps) ────────────────────────
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
    favoriteKeys,
    isFavorite,
    toggleFavorite,
  };
}
