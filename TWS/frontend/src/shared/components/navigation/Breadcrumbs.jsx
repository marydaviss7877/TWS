import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

/**
 * Breadcrumbs Component
 * 
 * Displays hierarchical navigation path showing user's current location.
 * Automatically generates breadcrumbs from route path or accepts custom items.
 * 
 * @param {Array} items - Custom breadcrumb items (optional)
 * @param {string} separator - Separator between items (default: '/')
 * @param {string} className - Additional CSS classes
 * 
 * @example
 * // Auto-generated from route
 * <Breadcrumbs />
 * 
 * // Custom breadcrumbs
 * <Breadcrumbs items={[
 *   { label: 'Dashboard', path: '/dashboard' },
 *   { label: 'Projects', path: '/projects' },
 *   { label: 'Current Page' }
 * ]} />
 */
const Breadcrumbs = ({ items, separator = '/', className = '' }) => {
  const location = useLocation();

  // Auto-generate breadcrumbs from route if items not provided
  const generateBreadcrumbs = () => {
    if (items) return items;

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [];

    // For tenant portal routes (/:tenantSlug/org/...), skip slug + 'org'
    const orgIdx = pathSegments.indexOf('org');
    const skipBefore = orgIdx !== -1 ? orgIdx : 0; // skip everything up to and including 'org'

    // Add home pointing to dashboard if in tenant portal, otherwise root
    const homePath = orgIdx !== -1
      ? `/${pathSegments.slice(0, orgIdx + 1).join('/')}/dashboard`
      : '/';
    breadcrumbs.push({
      label: 'APP Launcher',
      path: homePath,
      icon: HomeIcon
    });

    // Build path progressively
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;

      // Skip tenant slug, 'org', and 'tenant' layout segments
      if (index <= skipBefore || segment === 'tenant') {
        return;
      }

      // Avoid duplicate "home" crumb for launcher route (/:tenant/org/home)
      if (segment === 'home') {
        return;
      }

      // Format label (convert kebab-case to Title Case)
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Last item is not clickable (current page)
      const isLast = index === pathSegments.length - 1;
      
      breadcrumbs.push({
        label,
        path: isLast ? null : currentPath,
        isActive: isLast
      });
    });

    return breadcrumbs;
  };

  const breadcrumbItems = generateBreadcrumbs();

  if (breadcrumbItems.length <= 1) {
    return null; // Don't show breadcrumbs if only home
  }

  return (
    <nav
      className={`max-w-full min-w-0 overflow-x-auto overflow-y-hidden glass-scrollbar scroll-smooth pb-0.5 text-sm ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex w-max min-w-full flex-nowrap items-center gap-x-2 pr-1">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const Icon = item.icon;

          return (
            <li key={index} className="flex shrink-0 items-center">
              {index > 0 && (
                <ChevronRightIcon className="w-4 h-4 text-slate-400 dark:text-gray-500 mx-2 flex-shrink-0" />
              )}
              
              {isLast || !item.path ? (
                <span 
                  className={`font-medium ${
                    isLast 
                      ? 'text-[#0d0e24] dark:text-white' 
                      : 'text-slate-500 dark:text-gray-400'
                  }`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {Icon && <Icon className="w-4 h-4 inline-block mr-1" />}
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="flex items-center text-slate-600 dark:text-gray-300 hover:text-[#0d0e24] dark:hover:text-white transition-colors"
                >
                  {Icon && <Icon className="w-4 h-4 inline-block mr-1" />}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
