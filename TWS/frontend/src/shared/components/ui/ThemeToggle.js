import React, { useEffect } from 'react';
import { useTheme } from '../../../app/providers/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

const ThemeToggle = ({ className = '', size = 'md', showLabel = false, shortcut = true }) => {
  const { isDarkMode, toggleTheme, prefersReducedMotion } = useTheme();

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const buttonSizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
    xl: 'p-3'
  };

  // Keyboard shortcut: Alt/Option + T to toggle theme
  useEffect(() => {
    if (!shortcut) return;

    const handleKeyDown = (event) => {
      if (event.altKey && event.key === 't') {
        event.preventDefault();
        toggleTheme();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcut, toggleTheme]);

  const transitionClass = prefersReducedMotion 
    ? 'transition-none' 
    : 'transition-all duration-300 ease-smooth';

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${buttonSizeClasses[size]}
        ${showLabel ? 'px-4 gap-2 flex items-center' : ''}
        rounded-xl
        glass-button
        hover:scale-105 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-primary-500/50 dark:focus:ring-primary-400/50
        focus:ring-offset-2 dark:focus:ring-offset-gray-900
        backdrop-blur-sm
        group
        ${transitionClass}
        ${className}
      `}
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode. Keyboard shortcut: Alt + T`}
      title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode${shortcut ? ' (Alt + T)' : ''}`}
      role="switch"
      aria-checked={isDarkMode}
    >
      <div className="relative flex items-center justify-center">
        <SunIcon
          className={`
            ${sizeClasses[size]}
            text-amber-500 group-hover:text-amber-600
            ${transitionClass}
            ${isDarkMode ? 'opacity-0 rotate-180 scale-0' : 'opacity-100 rotate-0 scale-100'}
          `}
          aria-hidden="true"
        />
        <MoonIcon
          className={`
            ${sizeClasses[size]}
            text-primary-500 dark:text-primary-400 group-hover:text-primary-600 dark:group-hover:text-primary-300
            absolute top-0 left-0
            ${transitionClass}
            ${isDarkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-180 scale-0'}
          `}
          aria-hidden="true"
        />
      </div>
      {showLabel && (
        <span className={`text-sm font-medium ${transitionClass}`}>
          {isDarkMode ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
