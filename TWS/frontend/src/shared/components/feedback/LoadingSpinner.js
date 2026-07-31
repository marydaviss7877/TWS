import React from 'react';
import ModuleLoader from './ModuleLoader';

/**
 * LoadingSpinner Component
 * Full-page loading spinner with optional message
 */
const LoadingSpinner = ({ message, className = '' }) => {
  const compact = className.includes('min-h-[40vh]') || className.includes('bg-transparent');
  return <ModuleLoader message={message} className={className} compact={compact} />;
};

export default LoadingSpinner;
