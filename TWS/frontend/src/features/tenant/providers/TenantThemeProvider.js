import React, { createContext, useContext, useEffect } from 'react';
import { DEFAULT_THEME, generateColorShades } from '../utils/themeConfig';

const TenantThemeContext = createContext();

export const useTenantTheme = () => {
  const context = useContext(TenantThemeContext);
  if (!context) {
    console.warn('useTenantTheme must be used within a TenantThemeProvider, using defaults');
    return { theme: DEFAULT_THEME, loading: false };
  }
  return context;
};

// Apply the fixed TWS brand theme to the DOM as CSS custom properties.
// There is no per-tenant color customization — every tenant sees the same brand.
const applyThemeToDOM = () => {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  ['primary', 'secondary', 'accent'].forEach((colorKey) => {
    const color = DEFAULT_THEME.colors[colorKey];
    const shades = generateColorShades(color);

    Object.keys(shades).forEach((shade) => {
      root.style.setProperty(`--tenant-${colorKey}-${shade}`, shades[shade]);
    });
    root.style.setProperty(`--tenant-${colorKey}`, color);
  });
};

export const TenantThemeProvider = ({ children }) => {
  useEffect(() => {
    applyThemeToDOM();
  }, []);

  const value = {
    theme: DEFAULT_THEME,
    loading: false
  };

  return (
    <TenantThemeContext.Provider value={value}>
      {children}
    </TenantThemeContext.Provider>
  );
};
