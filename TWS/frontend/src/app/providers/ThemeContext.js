import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isSystemTheme, setIsSystemTheme] = useState(() => {
    return !localStorage.getItem('ws-theme');
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first, then system preference
    const savedTheme = localStorage.getItem('ws-theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [themeTransition, setThemeTransition] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useLayoutEffect(() => {
    // Add transition class for smooth theme switching
    setThemeTransition(true);
    
    // Update the document class. Only persist an explicit user choice; writing
    // the detected system value here would silently disable "follow system".
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (!isSystemTheme) {
      localStorage.setItem('ws-theme', isDarkMode ? 'dark' : 'light');
    } else {
      localStorage.removeItem('ws-theme');
    }

    // Remove transition class after animation
    const timer = setTimeout(() => {
      setThemeTransition(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [isDarkMode, isSystemTheme]);

  useEffect(() => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // Only update if user hasn't manually set a preference
      if (isSystemTheme) {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isSystemTheme]);

  // Accessibility: Check for reduced motion preference
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleMotionChange = (e) => {
      setPrefersReducedMotion(e.matches);
      // Update CSS custom property for reduced motion
      if (e.matches) {
        document.documentElement.style.setProperty('--ws-transition-duration', '0ms');
        document.documentElement.classList.add('reduce-motion');
      } else {
        document.documentElement.style.setProperty('--ws-transition-duration', '300ms');
        document.documentElement.classList.remove('reduce-motion');
      }
    };

    // Set initial value
    handleMotionChange(motionQuery);

    motionQuery.addEventListener('change', handleMotionChange);
    return () => motionQuery.removeEventListener('change', handleMotionChange);
  }, []);

  const toggleTheme = () => {
    setIsSystemTheme(false);
    setIsDarkMode((current) => !current);
  };

  const setTheme = (theme) => {
    setIsSystemTheme(false);
    setIsDarkMode(theme === 'dark');
  };

  const value = {
    isDarkMode,
    toggleTheme,
    setTheme,
    theme: isDarkMode ? 'dark' : 'light',
    themeTransition,
    prefersReducedMotion,
    // Additional theme utilities
    isSystemTheme,
    resetToSystemTheme: () => {
      localStorage.removeItem('ws-theme');
      setIsSystemTheme(true);
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    },
    // Animation control based on user preference
    getTransitionDuration: () => prefersReducedMotion ? '0ms' : '300ms',
    shouldAnimate: () => !prefersReducedMotion,
    // Theme-specific styles
    getGlassmorphismStyles: (intensity = 'medium') => {
      const intensityMap = {
        light: { blur: 'backdrop-blur-sm', opacity: 'bg-opacity-60' },
        medium: { blur: 'backdrop-blur-md', opacity: 'bg-opacity-80' },
        strong: { blur: 'backdrop-blur-lg', opacity: 'bg-opacity-90' }
      };
      return intensityMap[intensity] || intensityMap.medium;
    }
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
