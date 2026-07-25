import React from 'react';
import { Link } from 'react-router-dom';

const FeatureUnavailable = ({
  title = 'Feature unavailable',
  description = 'This module is not available yet.',
  actionLabel,
  actionTo,
  className = ''
}) => {
  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/20 ${className}`.trim()}>
      <h3 className="text-base font-semibold text-amber-900 dark:text-amber-200">
        {title}
      </h3>
      <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
        {description}
      </p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-3 inline-flex items-center text-sm font-medium text-amber-900 dark:text-amber-200 underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-100"
        >
          {actionLabel} →
        </Link>
      )}
    </div>
  );
};

export default FeatureUnavailable;
