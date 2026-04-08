import { useAuth } from '../../app/providers/AuthContext';
import { 
  ShieldCheckIcon,
  Cog6ToothIcon,
  KeyIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';

// Simplified role hierarchy - Complete ERP System
const ROLE_CONFIG = {
  super_admin: {
    level: 0,
    permissions: ['*'],
    modules: ['dashboard', 'finance', 'projects', 'operations', 'clients', 'reports', 'attendance', 'communication', 'role_management', 'system_admin', 'supra_admin'],
    dashboardWidgets: ['overview', 'finance', 'projects', 'operations', 'clients', 'reports', 'system_admin'],
    color: 'red'
  },
  owner: {
    level: 1,
    permissions: ['*'],
    modules: ['dashboard', 'finance', 'projects', 'operations', 'clients', 'reports', 'attendance', 'communication', 'role_management', 'system_admin'],
    dashboardWidgets: ['overview', 'finance', 'projects', 'operations', 'clients', 'reports'],
    color: 'purple'
  },
  admin: {
    level: 2,
    permissions: ['finance:manage', 'projects:manage', 'operations:manage', 'clients:manage', 'reports:manage', 'roles:manage'],
    modules: ['dashboard', 'finance', 'projects', 'operations', 'clients', 'reports', 'attendance', 'communication', 'role_management', 'system_admin'],
    dashboardWidgets: ['overview', 'finance', 'projects', 'operations', 'clients', 'reports'],
    color: 'blue'
  },
  finance_manager: {
    level: 3,
    permissions: ['finance:manage', 'payroll:manage', 'projects:read', 'clients:read', 'reports:read'],
    modules: ['dashboard', 'finance', 'projects', 'clients', 'reports', 'communication'],
    dashboardWidgets: ['overview', 'finance', 'projects', 'reports'],
    color: 'emerald'
  },
  project_manager: {
    level: 3,
    permissions: ['projects:manage', 'clients:read', 'reports:read'],
    modules: ['dashboard', 'projects', 'clients', 'reports', 'communication'],
    dashboardWidgets: ['overview', 'projects', 'clients'],
    color: 'indigo'
  },
  employee: {
    level: 4,
    permissions: ['profile:manage', 'tasks:manage', 'attendance:manage', 'projects:read', 'finance:read', 'documents:manage', 'learning:access', 'expenses:manage'],
    modules: ['employee_dashboard', 'employee_profile', 'employee_finance', 'employee_expenses', 'employee_documents', 'employee_learning', 'employee_notifications', 'employee_communication', 'employee_attendance', 'projects'],
    dashboardWidgets: ['overview', 'tasks', 'attendance', 'projects', 'finance', 'learning'],
    color: 'blue'
  },
  client: {
    level: 5,
    permissions: ['projects:read', 'invoices:read', 'support:manage'],
    modules: ['dashboard', 'projects', 'communication'],
    dashboardWidgets: ['overview', 'projects', 'invoices'],
    color: 'orange'
  }
};

// Unified navigation configuration - Complete ERP System
const NAVIGATION_CONFIG = {
  dashboard: {
    label: 'Dashboard',
    icon: 'HomeIcon',
    path: '/',
    roles: ['super_admin', 'owner', 'admin', 'finance_manager', 'project_manager', 'client'],
    description: 'Overview and key metrics'
  },
  supra_admin: {
    label: 'Supra Admin',
    icon: 'ShieldCheckIcon',
    path: '/supra-admin',
    roles: ['super_admin'],
    description: 'System-wide administration and tenant management',
    submenu: [
      { label: 'Overview', path: '/supra-admin', roles: ['super_admin'] },
      { label: 'Tenant Management', path: '/supra-admin/tenants', roles: ['super_admin'] },
      { label: 'System Health', path: '/supra-admin/health', roles: ['super_admin'] },
      { label: 'Analytics', path: '/supra-admin/analytics', roles: ['super_admin'] },
      { label: 'Settings', path: '/supra-admin/settings', roles: ['super_admin'] }
    ]
  },
  projects: {
    label: 'Projects',
    icon: 'FolderIcon',
    path: '/projects',
    roles: ['super_admin', 'owner', 'admin', 'project_manager', 'employee'],
    description: 'Complete project management',
    submenu: [
      { label: 'Software House Dashboard', path: '/software-house', roles: ['owner', 'admin', 'project_manager'] },
      { label: 'Project Management Hub', path: '/projects/manage', roles: ['owner', 'admin', 'project_manager'] },
      { label: 'Project Overview', path: '/projects', roles: ['owner', 'admin', 'project_manager'] },
      { label: 'My Projects', path: '/projects/my', roles: ['owner', 'admin', 'project_manager', 'employee'] },
      { label: 'Tasks', path: '/projects/tasks', roles: ['owner', 'admin', 'project_manager', 'employee'] },
      { label: 'Gantt Chart', path: '/projects/gantt', roles: ['owner', 'admin', 'project_manager', 'employee'] },
      { label: 'Milestones', path: '/projects/milestones', roles: ['owner', 'admin', 'project_manager'] },
      { label: 'Resources', path: '/projects/resources', roles: ['owner', 'admin', 'project_manager'] },
      { label: 'Timesheets', path: '/projects/timesheets', roles: ['owner', 'admin', 'project_manager', 'employee'] },
      { label: 'Sprint Management', path: '/projects/sprints', roles: ['owner', 'admin', 'project_manager'] },
      { label: 'Development Analytics', path: '/projects/analytics', roles: ['owner', 'admin', 'project_manager'] },
      { label: 'Workspaces', path: '/projects/workspaces', roles: ['owner', 'admin', 'project_manager', 'employee'] },
      { label: 'Templates', path: '/projects/templates', roles: ['owner', 'admin', 'project_manager'] }
    ]
  },
  clients: {
    label: 'Clients',
    icon: 'UsersIcon',
    path: '/clients',
    roles: ['super_admin', 'owner', 'admin', 'project_manager'],
    description: 'Client relationship management',
    submenu: [
      { label: 'Client List', path: '/clients', roles: ['owner', 'admin', 'project_manager'] },
      { label: 'Contracts', path: '/clients/contracts', roles: ['owner', 'admin', 'project_manager'] },
      { label: 'Communication Logs', path: '/clients/communications', roles: ['owner', 'admin', 'project_manager'] },
      { label: 'Billing', path: '/clients/billing', roles: ['owner', 'admin', 'project_manager'] },
      { label: 'Support Tickets', path: '/clients/support', roles: ['owner', 'admin', 'project_manager'] },
      { label: 'Feedback', path: '/clients/feedback', roles: ['owner', 'admin', 'project_manager'] }
    ]
  },
  reports: {
    label: 'Reports',
    icon: 'ChartBarIcon',
    path: '/reports',
    roles: ['super_admin', 'owner', 'admin', 'finance_manager', 'project_manager'],
    description: 'Comprehensive reporting and analytics',
    submenu: [
      { label: 'Dashboard', path: '/reports', roles: ['owner', 'admin'] },
      { label: 'KPIs', path: '/reports/kpis', roles: ['owner', 'admin'] },
      { label: 'Analytics Dashboard', path: '/reports/analytics', roles: ['owner', 'admin'] },
      { label: 'Custom Reports', path: '/reports/custom', roles: ['owner', 'admin'] },
      { label: 'Financial Reports', path: '/reports/financial', roles: ['owner', 'admin', 'finance_manager'] },
      { label: 'Project Reports', path: '/reports/projects', roles: ['owner', 'admin', 'project_manager'] }
    ]
  },
  attendance: {
    label: 'Time & Attendance',
    icon: 'ClockIcon',
    path: '/attendance',
    roles: ['super_admin', 'owner', 'admin', 'employee'],
    description: 'Time tracking and attendance management',
    submenu: [
      { label: 'My Attendance', path: '/attendance/my', roles: ['employee'] },
      { label: 'Team Attendance', path: '/attendance/team', roles: ['owner', 'admin'] },
      { label: 'Reports', path: '/attendance/reports', roles: ['owner', 'admin'] }
    ]
  },
  communication: {
    label: 'Communication',
    icon: 'ChatBubbleLeftRightIcon',
    path: '/communication',
    roles: ['all'],
    description: 'Messaging and notifications',
    submenu: [
      { label: 'Messages', path: '/communication/messages', roles: ['all'] },
      { label: 'Notifications', path: '/communication/notifications', roles: ['all'] },
      { label: 'Announcements', path: '/communication/announcements', roles: ['owner', 'admin'] },
      // Admin Messaging removed - only supra-admin messaging remains
    ]
  },
  role_management: {
    label: 'Role Management',
    icon: 'ShieldCheckIcon',
    path: '/role-management',
    roles: ['super_admin', 'owner', 'admin'],
    description: 'User roles and permissions management',
    submenu: [
      { label: 'Overview', path: '/role-management', roles: ['owner', 'admin'] },
      { label: 'User Roles', path: '/role-management/roles', roles: ['owner', 'admin'] },
      { label: 'Permissions', path: '/role-management/permissions', roles: ['owner', 'admin'] },
      { label: 'Access Control', path: '/role-management/access', roles: ['owner', 'admin'] },
      { label: 'User Assignment', path: '/role-management/assign', roles: ['owner', 'admin'] }
    ]
  },
  // admin_messaging removed - only supra-admin messaging remains
  system_admin: {
    label: 'System Settings',
    icon: 'Cog6ToothIcon',
    path: '/system-admin',
    roles: ['super_admin', 'owner', 'admin'],
    description: 'System configuration and administration',
    submenu: [
      { label: 'System Settings', path: '/system-admin/settings', roles: ['owner', 'admin'] },
      { label: 'Security', path: '/system-admin/security', roles: ['owner', 'admin'] },
      { label: 'Backup & Restore', path: '/system-admin/backup', roles: ['owner', 'admin'] },
      { label: 'Audit Logs', path: '/system-admin/audit', roles: ['owner', 'admin'] },
      { label: 'API Management', path: '/system-admin/api', roles: ['owner', 'admin'] },
      { label: 'Integrations', path: '/system-admin/integrations', roles: ['owner', 'admin'] }
    ]
  },
  // Employee portal removed
};

export const useRoleBasedUI = () => {
  const { user } = useAuth();

  const getRoleConfig = (role) => {
    return ROLE_CONFIG[role] || ROLE_CONFIG.employee;
  };

  const getNavigationItems = (role) => {
    return Object.entries(NAVIGATION_CONFIG)
      .filter(([key, config]) => 
        config.roles.includes('all') || config.roles.includes(role)
      )
      .map(([key, config]) => ({
        key,
        ...config,
        submenu: config.submenu?.filter(subItem => 
          subItem.roles.includes('all') || subItem.roles.includes(role)
        )
      }));
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    const roleConfig = getRoleConfig(user.role);
    return roleConfig.permissions.includes('*') || 
           roleConfig.permissions.includes(permission);
  };

  const canAccessModule = (module) => {
    if (!user) return false;
    const roleConfig = getRoleConfig(user.role);
    return roleConfig.modules.includes(module);
  };

  const canAccessPath = (path) => {
    if (!user) return false;
    
    // Check main navigation
    for (const [key, config] of Object.entries(NAVIGATION_CONFIG)) {
      if (config.path === path) {
        return config.roles.includes('all') || config.roles.includes(user.role);
      }
      
      // Check submenu
      if (config.submenu) {
        for (const subItem of config.submenu) {
          if (subItem.path === path) {
            return subItem.roles.includes('all') || subItem.roles.includes(user.role);
          }
        }
      }
    }
    
    return false;
  };

  const getRoleColor = (role) => {
    const roleConfig = getRoleConfig(role);
    return roleConfig.color;
  };

  const getDashboardWidgets = (role) => {
    const roleConfig = getRoleConfig(role);
    return roleConfig.dashboardWidgets;
  };

  const isManager = () => {
    if (!user) return false;
    const roleConfig = getRoleConfig(user.role);
    return roleConfig.level <= 3;
  };

  const isEmployee = () => {
    if (!user) return false;
    return user.role === 'employee';
  };

  const isClient = () => {
    if (!user) return false;
    return user.role === 'client';
  };

  return {
    getRoleConfig,
    getNavigationItems,
    hasPermission,
    canAccessModule,
    canAccessPath,
    getRoleColor,
    getDashboardWidgets,
    isManager,
    isEmployee,
    isClient
  };
};
