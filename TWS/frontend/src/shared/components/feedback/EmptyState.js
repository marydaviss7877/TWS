import React from 'react';

const EmptyState = ({
  title = 'No data',
  message = 'No records are available.',
  className = ''
}) => {
  return (
    <div className={`rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-800/50 ${className}`.trim()}>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
};

export default EmptyState;
