import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useFullscreen } from '../hooks/useFullscreen';
import {
  HomeIcon,
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CogIcon,
  UserGroupIcon,
  DocumentTextIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  ClockIcon,
  ServerIcon,
  CloudIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  ChartPieIcon,
  CircleStackIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../app/providers/AuthContext';
import ThemeToggle from '../shared/components/ui/ThemeToggle';

const navigation = [
  { name: 'Dashboard', href: '/supra-admin', icon: HomeIcon },

  // ERP Management
  {
    name: 'ERP Management',
    icon: CircleStackIcon,
    children: [
      { name: 'All ERP Categories', href: '/supra-admin/erp-management', icon: CircleStackIcon },
      { name: 'Hospital ERP', href: '/supra-admin/erp-management/healthcare', icon: ShieldCheckIcon },
      { name: 'Software House ERP', href: '/supra-admin/erp-management/software_house', icon: CogIcon }
    ]
  },

  // Finance & Billing
  {
    name: 'Finance',
    icon: CurrencyDollarIcon,
    children: [
      { name: 'All Organizations', href: '/supra-admin/tenants', icon: BuildingOffice2Icon },
      { name: 'Billing Management', href: '/supra-admin/billing', icon: CurrencyDollarIcon },
      { name: 'Revenue Analytics', href: '/supra-admin/analytics', icon: ChartPieIcon }
    ]
  },

  // User Management
  {
    name: 'User Management',
    icon: UserGroupIcon,
    children: [
      { name: 'All Users', href: '/supra-admin/users', icon: UserGroupIcon },
      { name: 'Department Management', href: '/supra-admin/department-management', icon: BuildingOfficeIcon }
    ]
  },

  // System
  {
    name: 'System',
    icon: ServerIcon,
    children: [
      { name: 'System Health', href: '/supra-admin/system-health', icon: ShieldCheckIcon },
      { name: 'Session Management', href: '/supra-admin/session-management', icon: ClockIcon },
      { name: 'Session Analytics', href: '/supra-admin/session-analytics', icon: ChartPieIcon }
    ]
  },

  // Infrastructure
  {
    name: 'Infrastructure',
    icon: CloudIcon,
    children: [
      { name: 'Infrastructure Overview', href: '/supra-admin/infrastructure', icon: CloudIcon },
      { name: 'Server Management', href: '/supra-admin/infrastructure', icon: ServerIcon }
    ]
  },

  // Settings
  { name: 'Settings', href: '/supra-admin/settings', icon: CogIcon },
];

const NavItem = ({
  item,
  index,
  isMobile = false,
  expandedMenus,
  isParentActive,
  isCurrentPath,
  onToggleMenu,
  onMobileNavigate,
}) => {
  if (item.children) {
    const isExpanded = expandedMenus[item.name];
    const isActive = isParentActive(item);

    return (
      <div
        key={item.name}
        className="group"
        style={{
          animationDelay: `${index * 30}ms`
        }}
      >
        <button
          onClick={() => onToggleMenu(item.name)}
          type="button"
          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer ${
            isActive
              ? 'bg-gradient-to-r from-primary-500/20 to-accent-500/20 dark:from-primary-500/30 dark:to-accent-500/30 text-primary-700 dark:text-primary-300 border border-primary-200/50 dark:border-primary-700/50 shadow-lg shadow-primary-500/10'
              : 'bg-white/50 dark:bg-gray-800/50 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 backdrop-blur-sm'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
              isActive
                ? 'bg-gradient-to-br from-primary-500 to-accent-600 text-white shadow-lg shadow-primary-500/50'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              <item.icon className="w-5 h-5" />
            </div>
            <span className="flex-1 text-sm font-semibold">{item.name}</span>
          </div>
          <ChevronDownIcon className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        {isExpanded && (
          <div className="mt-2 ml-4 pl-4 border-l-2 border-primary-200 dark:border-primary-800 space-y-1 animate-fade-in">
            {item.children.map((child) => {
              const isChildCurrent = isCurrentPath(child.href);
              return (
                <Link
                  key={child.name}
                  to={child.href}
                  onClick={() => isMobile && onMobileNavigate()}
                  className={`block px-4 py-2.5 text-sm rounded-lg transition-all duration-200 cursor-pointer ${
                    isChildCurrent
                      ? 'bg-gradient-to-r from-primary-500/20 to-accent-500/20 dark:from-primary-500/30 text-primary-700 dark:text-primary-300 font-semibold shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-700/60 hover:text-primary-600 dark:hover:text-primary-400'
                  }`}
                  style={{ cursor: 'pointer' }}
                >
                  {child.name}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const isCurrent = isCurrentPath(item.href);
  return (
    <Link
      key={item.name}
      to={item.href}
      onClick={() => isMobile && onMobileNavigate()}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer ${
        isCurrent
          ? 'bg-gradient-to-r from-primary-500/20 to-accent-500/20 dark:from-primary-500/30 dark:to-accent-500/30 text-primary-700 dark:text-primary-300 border border-primary-200/50 dark:border-primary-700/50 shadow-lg shadow-primary-500/10'
          : 'bg-white/50 dark:bg-gray-800/50 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 backdrop-blur-sm'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
        isCurrent
          ? 'bg-gradient-to-br from-primary-500 to-accent-600 text-white shadow-lg shadow-primary-500/50'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
      }`}>
        <item.icon className="w-5 h-5" />
      </div>
      <span className="flex-1 text-sm font-semibold">{item.name}</span>
    </Link>
  );
};

const SupraAdminLayout = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  // Initialize expanded menus - expand all by default for better visibility
  const [expandedMenus, setExpandedMenus] = useState(() => {
    const initialExpanded = {};
    // Expand all menus by default so users can see all navigation options
    navigation.forEach(item => {
      if (item.children) {
        initialExpanded[item.name] = true;
      }
    });
    return initialExpanded;
  });
  // useFullscreen hook — replaces 95-line copy-pasted fullscreen boilerplate
  const { isFullscreen, requestFullscreen, exitFullscreen, toggleFullscreen } = useFullscreen();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, exitFullscreen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
      if (showNotifications && !event.target.closest('.notifications-container')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu, showNotifications]);

  // Utility functions for breadcrumbs and page title
  const getPageTitle = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    if (pathSegments.length === 0) return 'Dashboard';
    
    const lastSegment = pathSegments[pathSegments.length - 1];
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, ' ');
  };

  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Home', path: '/supra-admin', key: 'home' }];
    
    let breadcrumbPath = '/supra-admin';
    pathSegments.slice(1).forEach((segment, index) => {
      breadcrumbPath += `/${segment}`;
      breadcrumbs.push({
        label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
        path: breadcrumbPath,
        key: `${segment}-${index}`
      });
    });
    
    return breadcrumbs;
  };

  const isCurrentPath = useCallback((path) => {
    if (!path) return false;
    // Exact match
    if (location.pathname === path) return true;
    // Check if current path starts with the menu path (for nested routes)
    if (location.pathname.startsWith(path) && path !== '/supra-admin') return true;
    return false;
  }, [location.pathname]);

  const isParentActive = useCallback((item) => {
    if (!item.children) return false;
    return item.children.some(child => isCurrentPath(child.href));
  }, [isCurrentPath]);

  // Auto-expand active menus on location change
  useEffect(() => {
    navigation.forEach(item => {
      if (item.children && isParentActive(item)) {
        setExpandedMenus(prev => (prev[item.name] ? prev : { ...prev, [item.name]: true }));
      }
    });
  }, [isParentActive]);

  const toggleMenu = (menuName) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-primary-50/30 to-accent-50/30 dark:from-gray-950 dark:via-primary-950/30 dark:to-accent-950/30">
      {/* Animated background pattern */}
      <div className="fixed inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-0">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out md:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 shadow-2xl flex flex-col">
          {/* Mobile Sidebar Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden bg-white dark:bg-gray-800 shadow-lg">
                <img 
                  src="/favicon.png" 
                  alt="TWS Logo" 
                  className="w-full h-full object-contain p-1"
                />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">TWS Admin</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                  {user?.role?.replace('_', ' ') || 'Super Admin'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Mobile Navigation - Scrollable */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 min-h-0">
            {navigation.map((item, index) => (
              <NavItem
                key={item.name}
                item={item}
                index={index}
                isMobile={true}
                expandedMenus={expandedMenus}
                isParentActive={isParentActive}
                isCurrentPath={isCurrentPath}
                onToggleMenu={toggleMenu}
                onMobileNavigate={() => setSidebarOpen(false)}
              />
            ))}
          </nav>

          {/* Mobile Signout */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200/50 dark:border-gray-700/50">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-30" style={{ pointerEvents: 'auto' }}>
        <div className="h-full flex flex-col bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 shadow-xl" style={{ pointerEvents: 'auto' }}>
          {/* Desktop Sidebar Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden bg-white dark:bg-gray-800 shadow-lg">
                <img 
                  src="/favicon.png" 
                  alt="TWS Logo" 
                  className="w-full h-full object-contain p-1"
                />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">TWS Admin</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                  {user?.role?.replace('_', ' ') || 'Super Admin'}
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation - Scrollable */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 custom-scrollbar min-h-0" style={{ pointerEvents: 'auto' }}>
            {navigation.map((item, index) => (
              <NavItem
                key={item.name}
                item={item}
                index={index}
                expandedMenus={expandedMenus}
                isParentActive={isParentActive}
                isCurrentPath={isCurrentPath}
                onToggleMenu={toggleMenu}
                onMobileNavigate={() => setSidebarOpen(false)}
              />
            ))}
          </nav>

          {/* Desktop Signout */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200/50 dark:border-gray-700/50">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-72 flex flex-col flex-1 relative z-10">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
            {/* Left Section */}
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Bars3Icon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </button>

              {/* Page Title & Breadcrumbs */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getPageTitle()}
                </h1>
                {getBreadcrumbs().length > 1 && (
                  <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {getBreadcrumbs().map((crumb, index) => (
                      <React.Fragment key={crumb.key}>
                        {index > 0 && <span className="text-gray-400 dark:text-gray-600">/</span>}
                        <Link
                          to={crumb.path}
                          className={`hover:text-primary-600 dark:hover:text-primary-400 transition-colors ${
                            index === getBreadcrumbs().length - 1 
                              ? 'text-primary-600 dark:text-primary-400 font-semibold' 
                              : ''
                          }`}
                        >
                          {crumb.label}
                        </Link>
                      </React.Fragment>
                    ))}
                  </nav>
                )}
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="hidden lg:block relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search... (Ctrl+K)"
                  aria-label="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Fullscreen Toggle */}
              <button
                onClick={isFullscreen ? exitFullscreen : requestFullscreen}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? (
                  <ArrowsPointingInIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                ) : (
                  <ArrowsPointingOutIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                )}
              </button>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Notifications */}
              <div className="relative notifications-container">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotifications(!showNotifications);
                    setShowUserMenu(false);
                  }}
                  aria-label="Notifications"
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
                >
                  <BellIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">No new notifications</p>
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative user-menu-container">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu(!showUserMenu);
                    setShowNotifications(false);
                  }}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-sm font-bold">
                      {user?.fullName?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {user?.fullName || 'Admin User'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                      {user?.role?.replace('_', ' ') || 'Super Admin'}
                    </p>
                  </div>
                  <ChevronDownIcon className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {user?.fullName || 'Admin User'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        {user?.email || 'admin@tws.com'}
                      </p>
                    </div>
                    <div className="py-2">
                      <button 
                        onClick={() => {
                          setShowUserMenu(false);
                          window.location.href = '/profile';
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
                      >
                        <UserCircleIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        <span>Profile</span>
                      </button>
                      <button 
                        onClick={() => {
                          setShowUserMenu(false);
                          window.location.href = '/settings';
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
                      >
                        <Cog6ToothIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        <span>Settings</span>
                      </button>
                      <hr className="my-2 border-gray-200 dark:border-gray-700" />
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex items-center space-x-2"
                      >
                        <ArrowRightOnRectangleIcon className="w-5 h-5" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 sm:p-8 relative pb-24">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>

        {/* Footer Section - Latest Version Only */}
        <footer className="fixed bottom-0 left-0 right-0 md:left-72 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 shadow-lg z-20">
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-end">
            {/* Latest Version */}
            <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Version:</span>
              <span className="text-gray-900 dark:text-gray-100 font-medium">v2.1.0</span>
              <span className="text-gray-500 dark:text-gray-500">(Jan 2026)</span>
            </div>
          </div>
        </footer>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};

export default SupraAdminLayout;
