import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { DEFAULT_THEME, generateColorShades } from '../utils/themeConfig';

const TenantThemeContext = createContext();

export const useTenantTheme = () => {
  const context = useContext(TenantThemeContext);
  if (!context) {
    // Return default context instead of throwing error to prevent crashes
    console.warn('useTenantTheme must be used within a TenantThemeProvider, using defaults');
    return {
      theme: DEFAULT_THEME,
      loading: false,
      updateTheme: () => {},
      applyTheme: () => {}
    };
  }
  return context;
};

// Apply theme to DOM using CSS custom properties (synchronous version for initial load)
// Moved outside component to fix hoisting issue
const applyThemeToDOMSync = (themeData) => {
  if (typeof window === 'undefined') return;
  
  // Always set variables on :root (document.documentElement) for global availability
  const root = document.documentElement;

  // Get colors (use customColors if available, otherwise use colors)
  const primaryColor = themeData.customColors?.primary || themeData.colors?.primary || DEFAULT_THEME.colors.primary;
  const secondaryColor = themeData.customColors?.secondary || themeData.colors?.secondary || DEFAULT_THEME.colors.secondary;
  const accentColor = themeData.customColors?.accent || themeData.colors?.accent || DEFAULT_THEME.colors.accent;

  // Generate color shades
  const primaryShades = generateColorShades(primaryColor);
  const secondaryShades = generateColorShades(secondaryColor);
  const accentShades = generateColorShades(accentColor);

  // Apply primary color shades to :root
  Object.keys(primaryShades).forEach(shade => {
    root.style.setProperty(`--tenant-primary-${shade}`, primaryShades[shade]);
  });
  root.style.setProperty('--tenant-primary', primaryColor);

  // Apply secondary color shades to :root
  Object.keys(secondaryShades).forEach(shade => {
    root.style.setProperty(`--tenant-secondary-${shade}`, secondaryShades[shade]);
  });
  root.style.setProperty('--tenant-secondary', secondaryColor);

  // Apply accent color shades to :root
  Object.keys(accentShades).forEach(shade => {
    root.style.setProperty(`--tenant-accent-${shade}`, accentShades[shade]);
  });
  root.style.setProperty('--tenant-accent', accentColor);

  // Apply fonts to :root
  const headingFont = themeData.fonts?.heading || DEFAULT_THEME.fonts.heading;
  const bodyFont = themeData.fonts?.body || DEFAULT_THEME.fonts.body;
  root.style.setProperty('--tenant-heading-font', headingFont);
  root.style.setProperty('--tenant-body-font', bodyFont);
};

export const TenantThemeProvider = ({ children, tenantSlug }) => {
  // Initialize theme from localStorage synchronously to prevent flash
  const getInitialTheme = () => {
    if (typeof window === 'undefined') return DEFAULT_THEME;
    
    // Get tenant slug from URL if not provided as prop
    const currentSlug = tenantSlug || window.location.pathname.match(/\/tenant\/([^\/]+)/)?.[1];
    if (!currentSlug) return DEFAULT_THEME;
    
    try {
      // Try session-specific cache first, then persistent cache
      let cachedTheme = localStorage.getItem(`tenant-theme-${currentSlug}`);
      if (!cachedTheme) {
        cachedTheme = localStorage.getItem(`tenant-theme-persist-${currentSlug}`);
      }
      
      if (cachedTheme) {
        const parsed = JSON.parse(cachedTheme);
        // Apply theme immediately to prevent flash
        applyThemeToDOMSync(parsed);
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse cached theme:', e);
    }
    
    return DEFAULT_THEME;
  };

  const [theme, setTheme] = useState(getInitialTheme);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const hasAppliedTheme = useRef(false);

  // Check if we're in tenant portal route
  const isTenantPortalRoute = tenantSlug && location?.pathname?.startsWith(`/${tenantSlug}/org`);

  // Apply theme synchronously on mount if we have cached theme
  useEffect(() => {
    if (tenantSlug && isTenantPortalRoute && theme) {
      applyThemeToDOM(theme);
      hasAppliedTheme.current = true;
    }
  }, []); // Run only once on mount

  // Load theme from API
  useEffect(() => {
    if (!tenantSlug || !isTenantPortalRoute) {
      setLoading(false);
      return;
    }

    const loadTheme = async () => {
      try {
        // SECURITY FIX: Use credentials: 'include' instead of Authorization header
        // Tokens are in HttpOnly cookies, not accessible via JavaScript
        
        // Fetch from API to get latest theme from database
        const response = await fetch(`/api/tenant/${tenantSlug}/organization/settings/theme`, {
          method: 'GET',
          credentials: 'include', // SECURITY FIX: Include cookies
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.data?.theme) {
            const themeData = {
              name: data.data.theme.name || 'default',
              colors: data.data.theme.colors || DEFAULT_THEME.colors,
              fonts: data.data.theme.fonts || DEFAULT_THEME.fonts,
              customColors: data.data.theme.customColors || {}
            };
            
            // Only update if theme changed (to prevent unnecessary re-renders)
            const themeChanged = JSON.stringify(themeData) !== JSON.stringify(theme);
            if (themeChanged) {
              setTheme(themeData);
              applyThemeToDOM(themeData);
              // Update both cache keys with database version
              localStorage.setItem(`tenant-theme-${tenantSlug}`, JSON.stringify(themeData));
              localStorage.setItem(`tenant-theme-persist-${tenantSlug}`, JSON.stringify(themeData));
              hasAppliedTheme.current = true;
            }
          } else {
            console.warn('🎨 Invalid theme response structure:', data);
          }
        } else if (response.status === 401 || response.status === 403) {
          console.warn('🎨 Auth error loading theme:', response.status, response.statusText);
          // Auth error - theme might not load, but cached version is fine
          console.warn('Could not fetch theme from API (auth issue), using cached version');
          // Try to restore from persistent cache if session cache is missing
          const persistentCache = localStorage.getItem(`tenant-theme-persist-${tenantSlug}`);
          if (persistentCache && !localStorage.getItem(`tenant-theme-${tenantSlug}`)) {
            try {
              const parsed = JSON.parse(persistentCache);
              setTheme(parsed);
              applyThemeToDOM(parsed);
              localStorage.setItem(`tenant-theme-${tenantSlug}`, persistentCache);
              hasAppliedTheme.current = true;
            } catch (e) {
              console.warn('Failed to restore from persistent cache:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error loading theme:', error);
        // Don't apply default theme on error - keep cached version if available
        // Only apply default if we don't have a cached theme
        if (!localStorage.getItem(`tenant-theme-${tenantSlug}`)) {
          applyThemeToDOM(DEFAULT_THEME);
        }
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, [tenantSlug, isTenantPortalRoute]);

  // Apply theme to DOM using CSS custom properties
  const applyThemeToDOM = (themeData) => {
    if (!isTenantPortalRoute) return;
    // Use the sync version which does all the work
    applyThemeToDOMSync(themeData);
  };

  // Update theme (called when theme is changed in settings)
  const updateTheme = async (newTheme) => {
    try {
      // SECURITY FIX: Use credentials: 'include' instead of Authorization header
      // Tokens are in HttpOnly cookies, not accessible via JavaScript

      // Prepare theme data for API
      const themePayload = {
        name: newTheme.name || 'default',
        colors: newTheme.colors || DEFAULT_THEME.colors,
        fonts: newTheme.fonts || DEFAULT_THEME.fonts,
        customColors: newTheme.customColors || {}
      };

      const response = await fetch(`/api/tenant/${tenantSlug}/organization/settings/theme`, {
        method: 'PUT',
        credentials: 'include', // SECURITY FIX: Include cookies
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(themePayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Theme update failed:', errorData);
        throw new Error(errorData.message || 'Failed to update theme');
      }

      const data = await response.json();
      
      if (data.success && data.data?.theme) {
        const themeData = {
          name: data.data.theme.name || 'default',
          colors: data.data.theme.colors || DEFAULT_THEME.colors,
          fonts: data.data.theme.fonts || DEFAULT_THEME.fonts,
          customColors: data.data.theme.customColors || {}
        };
        
        // Update state and apply to DOM immediately
        setTheme(themeData);
        applyThemeToDOM(themeData);
        
        // Persist to localStorage for fast loading on next visit
        localStorage.setItem(`tenant-theme-${tenantSlug}`, JSON.stringify(themeData));
        
        // Also persist to a session-independent key for cross-session persistence
        localStorage.setItem(`tenant-theme-persist-${tenantSlug}`, JSON.stringify(themeData));
        
        hasAppliedTheme.current = true;
        return { success: true, theme: themeData };
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error updating theme:', error);
      throw error;
    }
  };

  // Apply theme whenever it changes
  useEffect(() => {
    if (isTenantPortalRoute && theme) {
      applyThemeToDOM(theme);
      hasAppliedTheme.current = true;
    }
  }, [theme, isTenantPortalRoute, tenantSlug]);

  // Clean up: remove tenant-portal class when leaving tenant portal
  useEffect(() => {
    return () => {
      if (!isTenantPortalRoute) {
        document.body.classList.remove('tenant-portal');
        // Optionally reset CSS variables
        const root = document.documentElement;
        const tenantPortalElement = document.querySelector('.tenant-portal') || root;
        ['primary', 'secondary', 'accent'].forEach(color => {
          for (let shade of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) {
            tenantPortalElement.style.removeProperty(`--tenant-${color}-${shade}`);
          }
          tenantPortalElement.style.removeProperty(`--tenant-${color}`);
        });
        tenantPortalElement.style.removeProperty('--tenant-heading-font');
        tenantPortalElement.style.removeProperty('--tenant-body-font');
      }
    };
  }, [isTenantPortalRoute]);

  const value = {
    theme,
    loading,
    updateTheme,
    isTenantPortalRoute
  };

  return (
    <TenantThemeContext.Provider value={value}>
      {children}
    </TenantThemeContext.Provider>
  );
};
