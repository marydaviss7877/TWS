import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Separator } from '../../../components/ui/separator';
import { cn } from '../../../lib/utils';
import { SIDEBAR_SECTIONS } from '../../../constants/navigationConstants';

/**
 * SidebarNav — renders the section-grouped navigation list inside the expanded sidebar.
 * Extracted from TenantOrgLayout to keep the layout shell lean.
 *
 * Props:
 *  filteredMenuItems  - items already filtered by useMenuFiltering
 *  expandedMenus      - { [key]: boolean } submenu open state
 *  toggleMenuExpansion - (key) => void
 *  isDarkMode         - boolean
 *  themeStyles        - { getPrimaryColor, primaryGradientBr }
 */
const SidebarNav = ({
  filteredMenuItems = [],
  expandedMenus = {},
  toggleMenuExpansion,
  isDarkMode,
  themeStyles,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentMenuKey = () => {
    const segments = location.pathname.split('/').filter(Boolean);
    const orgIdx = segments.indexOf('org');
    if (orgIdx !== -1 && segments[orgIdx + 1]) {
      const seg = segments[orgIdx + 1];
      if (['software-house'].includes(seg)) return segments[orgIdx + 2] || seg;
      return seg;
    }
    return 'dashboard';
  };

  const currentMenuKey = getCurrentMenuKey();

  const isItemActive = (item) =>
    currentMenuKey === item.key ||
    location.pathname === item.path ||
    location.pathname.startsWith(item.path + '/');

  const hasActiveChild = (item) =>
    item.children?.some(child =>
      location.pathname === child.path || location.pathname.startsWith(child.path + '/')
    ) ?? false;

  const renderItem = (item) => {
    const Icon = item.icon;
    const active = isItemActive(item);
    const childActive = hasActiveChild(item);
    const highlight = active || childActive;
    const hasSubmenu = item.children?.length > 0;
    const isExpanded = expandedMenus[item.key] ?? false;

    const handleClick = (e) => {
      if (hasSubmenu) {
        e.preventDefault();
        toggleMenuExpansion(item.key);
        return;
      }
      navigate(item.path);
    };

    return (
      <div key={item.key} className="relative">
        <button
          onClick={handleClick}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
            highlight
              ? 'text-white shadow-sm'
              : 'bg-transparent hover:bg-gray-100/60 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
          )}
          style={highlight ? {
            backgroundColor: isDarkMode
              ? `${themeStyles.getPrimaryColor(900)}66`
              : `${themeStyles.getPrimaryColor(100)}CC`,
            color: isDarkMode
              ? themeStyles.getPrimaryColor(300)
              : themeStyles.getPrimaryColor(700),
            borderColor: isDarkMode
              ? `${themeStyles.getPrimaryColor(700)}80`
              : `${themeStyles.getPrimaryColor(200)}80`,
            borderWidth: '1px',
            borderStyle: 'solid',
          } : {}}
        >
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all',
              highlight ? 'text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            )}
            style={highlight ? { background: themeStyles.primaryGradientBr } : {}}
          >
            {Icon && <Icon className="w-4 h-4" />}
          </div>
          <span className="flex-1 text-sm font-medium truncate text-left">{item.label}</span>
          {hasSubmenu && (
            <ChevronDownIcon className={cn('w-4 h-4 shrink-0 transition-transform duration-200', isExpanded && 'rotate-180')} />
          )}
        </button>

        {/* Submenu */}
        {hasSubmenu && (
          <div className={cn('overflow-hidden transition-all duration-300', isExpanded ? 'max-h-[32rem] opacity-100' : 'max-h-0 opacity-0')}>
            <div className="ml-8 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-3 py-2 overflow-y-auto max-h-[30rem]">
              {item.children.map(child => {
                const childActive = location.pathname === child.path || location.pathname.startsWith(child.path + '/');
                return (
                  <button
                    key={child.key}
                    onClick={() => navigate(child.path)}
                    className={cn(
                      'block w-full px-3 py-2 text-sm rounded-lg transition-all text-left',
                      childActive
                        ? 'font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                    )}
                    style={childActive ? {
                      backgroundColor: isDarkMode
                        ? `${themeStyles.getPrimaryColor(900)}4D`
                        : themeStyles.getPrimaryColor(100),
                      color: isDarkMode
                        ? themeStyles.getPrimaryColor(300)
                        : themeStyles.getPrimaryColor(700),
                    } : {}}
                  >
                    {child.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <ScrollArea className="flex-1">
      <div className="px-3 py-4 space-y-0.5">
        {SIDEBAR_SECTIONS.map(section => {
          const items = filteredMenuItems.filter(item => section.keys.includes(item.key));
          if (!items.length) return null;
          return (
            <div key={section.label ?? 'main'} className="mb-3">
              {section.label && (
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 select-none">
                  {section.label}
                </p>
              )}
              {items.map(renderItem)}
            </div>
          );
        })}

        {/* Catch-all: items not in any defined section */}
        {filteredMenuItems
          .filter(item => !SIDEBAR_SECTIONS.some(s => s.keys.includes(item.key)))
          .map(renderItem)}
      </div>
    </ScrollArea>
  );
};

export default SidebarNav;
