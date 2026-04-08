/**
 * TenantNavContext — shares filtered menu items + app navigation state
 * between TenantOrgLayout (provider) and any child page (consumer).
 *
 * This lets AppHome consume the same filteredMenuItems, favorites, recents, etc.
 * that the layout already computed, without duplicating API calls or hook state.
 */

import React from 'react';

const TenantNavContext = React.createContext({
  filteredMenuItems: [],
  activeAppKey:  null,
  activeApp:     null,
  favoriteApps:  [],
  recentApps:    [],
  favoriteKeys:  [],
  isFavorite:    () => false,
  toggleFavorite: () => {},
});

export const TenantNavProvider = TenantNavContext.Provider;

export const useTenantNav = () => React.useContext(TenantNavContext);
