export const RECENT_APPS_LIMIT = 6;

// Shared visual rhythm tokens for launcher cards (home + modal)
export const LAUNCHER_UI = {
  cardRadius: 'rounded-2xl',
  cardPadding: 'p-3 sm:p-3.5 lg:p-4',
  cardGap: 'gap-2 sm:gap-2.5',
  iconWrap: 'h-12 w-12 sm:h-14 sm:w-14 rounded-2xl',
  iconSize: 'h-6 w-6 sm:h-7 sm:w-7',
  titleWidth: 'w-20 sm:w-24',
  titleSize: 'text-[11px] sm:text-xs',
  descWidth: 'w-24 sm:w-28',
  descSize: 'text-[10px] sm:text-[11px]',
};

export const getRecentAppsKey = (slug) => `tws-recent-apps-${slug || 'tenant'}`;

export const loadRecentApps = (slug) => {
  try {
    const raw = localStorage.getItem(getRecentAppsKey(slug));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveRecentApps = (slug, keys) => {
  try {
    localStorage.setItem(getRecentAppsKey(slug), JSON.stringify(keys.slice(0, RECENT_APPS_LIMIT)));
  } catch {
    // ignore localStorage failures
  }
};

export const pushRecentApp = (prevKeys, appKey) => {
  if (!appKey) return prevKeys;
  return [appKey, ...prevKeys.filter((k) => k !== appKey)].slice(0, RECENT_APPS_LIMIT);
};

export const rankLauncherItem = (item, query, metadata = {}) => {
  const q = (query || '').trim().toLowerCase();
  if (!q) return 0;
  const label = (item?.label || '').toLowerCase();
  const desc = (metadata[item?.key]?.description || '').toLowerCase();
  if (label.startsWith(q)) return 0;
  if (label.includes(q)) return 1;
  if (desc.includes(q)) return 2;
  return 99;
};

