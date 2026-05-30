import React from 'react';
import { useTheme } from '../../app/providers/ThemeContext';

const AdminPageTemplate = ({ 
  title, 
  description, 
  children,
  actions,
  stats 
}) => {
  const { isDarkMode } = useTheme();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="glass-card-premium p-6 hover-glow">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl lg:text-3xl font-bold font-heading text-gray-900 dark:text-white tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 font-medium">
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

        {/* Stats Section */}
        {stats && stats.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className="glass-card p-4 hover-glow"
              >
                <div className="flex items-center gap-3">
                  {stat.icon && (
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.iconBg || 'bg-gradient-to-br from-primary-500 to-accent-500'}`}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium truncate">
                      {stat.label}
                    </p>
                    <p className="text-xl lg:text-2xl font-bold font-heading text-gray-900 dark:text-white mt-0.5">
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
      </div>

      {/* Page Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
};

export default AdminPageTemplate;
