import React from 'react';
import { Card } from '../ui/Card/Card';

/**
 * Shared page header: title/description/actions plus an optional stat-tile row.
 * Replaces the old AdminPageTemplate (built on the retired glassmorphism system).
 */
const PageHeader = ({ title, description, children, actions, stats }) => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-3 flex-wrap">
              {actions}
            </div>
          )}
        </div>

        {stats && stats.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="rounded-xl border border-gray-200 dark:border-gray-800 p-4"
              >
                <div className="flex items-center gap-3">
                  {stat.icon && (
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.iconBg || 'bg-primary-50 dark:bg-primary-900/20'}`}>
                      <stat.icon className={`w-5 h-5 ${stat.iconColor || 'text-primary-600 dark:text-primary-400'}`} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium truncate">
                      {stat.label}
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                      {stat.value}
                    </p>
                    {stat.change && (
                      <p className={`text-xs font-medium mt-1 ${
                        stat.change.startsWith('+')
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {stat.change}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
};

export default PageHeader;
