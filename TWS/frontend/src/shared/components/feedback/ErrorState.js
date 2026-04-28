import React from 'react';

const ErrorState = ({
  title = 'Something went wrong',
  message = 'Unable to load data.',
  onRetry,
  className = ''
}) => {
  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/20 ${className}`.trim()}>
      <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">{title}</h3>
      <p className="mt-1 text-sm text-red-800 dark:text-red-300">{message}</p>
      {typeof onRetry === 'function' && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default ErrorState;
