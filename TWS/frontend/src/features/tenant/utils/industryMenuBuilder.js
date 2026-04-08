import {
  HomeIcon,
  UserIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  InboxIcon,
  WrenchScrewdriverIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  CogIcon,
  ChartBarIcon,
  ShoppingBagIcon,
  TagIcon,
  CreditCardIcon,
  TruckIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  BookOpenIcon,
  ClipboardDocumentCheckIcon,
  UserPlusIcon,
  CalendarIcon,
  BeakerIcon,
  ClockIcon,
  BuildingOfficeIcon,
  ReceiptPercentIcon,
  DocumentChartBarIcon,
  HeartIcon,
  BriefcaseIcon,
  RocketLaunchIcon,
  LockClosedIcon,
  SparklesIcon,
  DocumentCheckIcon,
  FlagIcon,
  ExclamationCircleIcon,
  FolderIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';

/**
 * Industry-aware menu builder
 * Generates menu items based on tenant's erpCategory
 * Filters modules based on ERP category restrictions
 */
export const getIndustryMenuItems = (erpCategory = 'software_house', tenantSlug, tenantConfig = {}) => {
  const effectiveCategory = (erpCategory === 'education' || erpCategory === 'healthcare') ? 'software_house' : erpCategory;
  // Common modules that all industries get
  const commonModules = [
    {
      key: 'dashboard',
      icon: HomeIcon,
      label: 'Dashboard',
      path: `/${tenantSlug}/org/dashboard`
    },
    {
      key: 'my-work',
      icon: BriefcaseIcon,
      label: 'My Work',
      path: `/${tenantSlug}/org/my-work`
    },
    {
      key: 'analytics',
      icon: ChartBarIcon,
      label: 'Analytics',
      path: `/${tenantSlug}/org/analytics`
    },
    {
      key: 'users',
      icon: UserIcon,
      label: 'Users',
      path: `/${tenantSlug}/org/users`
    },
    {
      key: 'finance',
      icon: CurrencyDollarIcon,
      label: 'Finance',
      path: `/${tenantSlug}/org/finance`,
      children: [
        {
          key: 'finance-dashboard',
          label: 'Dashboard',
          path: `/${tenantSlug}/org/finance`
        },
        {
          key: 'finance-accounts-payable',
          label: 'Accounts Payable',
          path: `/${tenantSlug}/org/finance/accounts-payable`
        },
        {
          key: 'finance-accounts-receivable',
          label: 'Accounts Receivable',
          path: `/${tenantSlug}/org/finance/accounts-receivable`
        },
        {
          key: 'finance-invoices',
          label: 'Invoices',
          path: `/${tenantSlug}/org/finance/invoices`
        },
        {
          key: 'finance-budgeting',
          label: 'Budgeting',
          path: `/${tenantSlug}/org/finance/budgeting`
        },
        {
          key: 'finance-expense-management',
          label: 'Expense Management',
          path: `/${tenantSlug}/org/finance/time-expenses`
        },
        {
          key: 'finance-financial-reports',
          label: 'Financial Reports',
          path: `/${tenantSlug}/org/finance/reporting`
        }
      ]
    },
    {
      key: 'projects',
      icon: ClipboardDocumentListIcon,
      label: 'Projects',
      path: `/${tenantSlug}/org/projects`,
      children: [
        {
          key: 'projects-overview',
          label: 'Overview',
          path: `/${tenantSlug}/org/projects`
        },
        {
          key: 'projects-list',
          label: 'All Projects',
          path: `/${tenantSlug}/org/projects/list`
        },
        {
          key: 'projects-tasks',
          label: 'Tasks',
          path: `/${tenantSlug}/org/projects/tasks`
        },
        {
          key: 'projects-gantt',
          label: 'Gantt Chart',
          path: `/${tenantSlug}/org/projects/gantt`
        },
        {
          key: 'projects-milestones',
          label: 'Milestones',
          path: `/${tenantSlug}/org/projects/milestones`
        },
        {
          key: 'projects-resources',
          label: 'Resources',
          path: `/${tenantSlug}/org/projects/resources`
        },
        {
          key: 'projects-timesheets',
          label: 'Timesheets',
          path: `/${tenantSlug}/org/projects/timesheets`
        },
        {
          key: 'projects-sprints',
          label: 'Sprints',
          path: `/${tenantSlug}/org/projects/sprints`
        },
        {
          key: 'projects-deliverables',
          label: 'Deliverables',
          path: `/${tenantSlug}/org/projects/deliverables`,
          icon: FlagIcon,
          description: 'Nucleus Project OS - Deliverable Management'
        },
        {
          key: 'projects-approvals',
          label: 'Approval Queue',
          path: `/${tenantSlug}/org/projects/approvals`,
          icon: ClipboardDocumentCheckIcon,
          description: 'Nucleus Project OS - Pending your approval'
        },
        {
          key: 'projects-change-requests',
          label: 'Change Requests',
          path: `/${tenantSlug}/org/projects/change-requests`,
          icon: ExclamationCircleIcon,
          description: 'Nucleus Project OS - Scope Change Management'
        },
        {
          key: 'projects-analytics',
          label: 'Nucleus Analytics',
          path: `/${tenantSlug}/org/projects/analytics`,
          icon: ChartBarIcon,
          description: 'Workspace stats, at-risk deliverables, status summary'
        }
      ]
    },
    {
      key: 'reports',
      icon: DocumentTextIcon,
      label: 'Reports',
      path: `/${tenantSlug}/org/reports`
    },
    {
      key: 'documents',
      icon: PencilSquareIcon,
      label: 'Documents',
      path: `/${tenantSlug}/org/documents`,
      description: 'Built-in word processor – write, save, and download documents',
      children: [
        {
          key: 'documents-list',
          label: 'Documents',
          path: `/${tenantSlug}/org/documents`
        },
        {
          key: 'documents-approvals',
          label: 'Approvals',
          path: `/${tenantSlug}/org/documents/approval-queue`,
          icon: ClockIcon
        },
        {
          key: 'documents-audit',
          label: 'Audit Log',
          path: `/${tenantSlug}/org/documents/audit`,
          icon: ClipboardDocumentListIcon
        }
      ]
    },
    // Messaging menu item removed - only supra-admin messaging remains
    {
      key: 'audit',
      icon: ClipboardDocumentListIcon,
      label: 'Audit Log',
      path: `/${tenantSlug}/org/audit`
    },
    {
      key: 'settings',
      icon: CogIcon,
      label: 'Settings',
      path: `/${tenantSlug}/org/settings`,
      children: [
        { key: 'settings-org',      label: 'Org Profile',  path: `/${tenantSlug}/org/settings/organization` },
        { key: 'settings-general',  label: 'General',      path: `/${tenantSlug}/org/settings` },
      ]
    }
  ];

  // Industry-specific modules
  const industryModules = {
    software_house: [
      {
        key: 'permissions',
        icon: ShieldCheckIcon,
        label: 'Permissions',
        path: `/${tenantSlug}/org/permissions`,
        children: [
          {
            key: 'permissions-list',
            label: 'Permissions',
            path: `/${tenantSlug}/org/permissions`
          },
          {
            key: 'permissions-create',
            label: 'Create Permission',
            path: `/${tenantSlug}/org/permissions/create`
          }
        ]
      },
      {
        key: 'roles',
        icon: UserGroupIcon,
        label: 'Roles',
        path: `/${tenantSlug}/org/roles`,
        children: [
          {
            key: 'roles-list',
            label: 'Roles',
            path: `/${tenantSlug}/org/roles`
          },
          {
            key: 'roles-create',
            label: 'Create Role',
            path: `/${tenantSlug}/org/roles/create`
          }
        ]
      },
      {
        key: 'departments',
        icon: BuildingOfficeIcon,
        label: 'Department',
        path: `/${tenantSlug}/org/departments`,
        children: [
          {
            key: 'departments-list',
            label: 'Departments',
            path: `/${tenantSlug}/org/departments`
          },
          {
            key: 'departments-create',
            label: 'Create Department',
            path: `/${tenantSlug}/org/departments/create`
          },
          {
            key: 'departments-access',
            label: 'Manage Access',
            path: `/${tenantSlug}/org/departments/access`
          }
        ]
      },
      {
        key: 'hr',
        icon: UsersIcon,
        label: 'HR',
        path: `/${tenantSlug}/org/software-house/hr`,
        children: [
          {
            key: 'hr-overview',
            label: 'Overview',
            path: `/${tenantSlug}/org/software-house/hr`
          },
          {
            key: 'hr-employees',
            label: 'Employees',
            path: `/${tenantSlug}/org/software-house/hr/employees`
          },
          {
            key: 'hr-payroll',
            label: 'Payroll',
            path: `/${tenantSlug}/org/software-house/hr/payroll`
          },
          {
            key: 'hr-attendance',
            label: 'Attendance',
            path: `/${tenantSlug}/org/software-house/hr/attendance`
          },
          {
            key: 'hr-leave-requests',
            label: 'Leave Requests',
            path: `/${tenantSlug}/org/software-house/hr/leave-requests`
          },
          {
            key: 'hr-performance',
            label: 'Performance',
            path: `/${tenantSlug}/org/software-house/hr/performance`
          },
          {
            key: 'hr-recruitment',
            label: 'Recruitment',
            path: `/${tenantSlug}/org/software-house/hr/recruitment`
          },
          {
            key: 'hr-onboarding',
            label: 'Onboarding',
            path: `/${tenantSlug}/org/software-house/hr/onboarding`
          },
          {
            key: 'hr-training',
            label: 'Training',
            path: `/${tenantSlug}/org/software-house/hr/training`
          }
        ]
      },
      {
        key: 'development',
        icon: WrenchScrewdriverIcon,
        label: 'Development',
        path: `/${tenantSlug}/org/software-house/development`
      },
      {
        key: 'time-tracking',
        icon: ClockIcon,
        label: 'Time Tracking',
        path: `/${tenantSlug}/org/software-house/time-tracking`
      },
      {
        key: 'employee-portal',
        icon: UserIcon,
        label: 'Employee Portal',
        path: `/${tenantSlug}/org/software-house/employee-portal`,
        roles: ['employee'],
        children: [
          {
            key: 'employee-portal-dashboard',
            label: 'Dashboard',
            path: `/${tenantSlug}/org/software-house/employee-portal`
          },
          {
            key: 'employee-portal-profile',
            label: 'My Profile',
            path: `/${tenantSlug}/org/software-house/employee-portal/profile`
          },
          {
            key: 'employee-portal-attendance',
            label: 'Attendance',
            path: `/${tenantSlug}/org/software-house/employee-portal/attendance`
          },
          {
            key: 'employee-portal-leave',
            label: 'Leave Requests',
            path: `/${tenantSlug}/org/software-house/employee-portal/leave`
          },
          {
            key: 'employee-portal-performance',
            label: 'Performance',
            path: `/${tenantSlug}/org/software-house/employee-portal/performance`
          },
          {
            key: 'employee-portal-payroll',
            label: 'Payroll',
            path: `/${tenantSlug}/org/software-house/employee-portal/payroll`
          },
          {
            key: 'employee-portal-documents',
            label: 'Documents',
            path: `/${tenantSlug}/org/software-house/employee-portal/documents`
          }
        ]
      },
      {
        key: 'clients',
        icon: BuildingOfficeIcon,
        label: 'Clients',
        path: `/${tenantSlug}/org/clients`,
        children: [
          {
            key: 'clients-list',
            label: 'Client List',
            path: `/${tenantSlug}/org/clients`
          },
          {
            key: 'clients-contracts',
            label: 'Contracts',
            path: `/${tenantSlug}/org/clients/contracts`
          },
          {
            key: 'clients-communications',
            label: 'Communication Logs',
            path: `/${tenantSlug}/org/clients/communications`
          },
          {
            key: 'clients-billing',
            label: 'Billing',
            path: `/${tenantSlug}/org/clients/billing`
          }
        ]
      },
      {
        key: 'operations',
        icon: WrenchScrewdriverIcon,
        label: 'Operations',
        path: `/${tenantSlug}/org/operations`
      }
    ],
    business: [
      {
        key: 'operations',
        icon: WrenchScrewdriverIcon,
        label: 'Operations',
        path: `/${tenantSlug}/org/operations`
      },
      {
        key: 'clients',
        icon: BuildingOfficeIcon,
        label: 'Clients',
        path: `/${tenantSlug}/org/clients`
      }
    ]
  };

  const industrySpecific = industryModules[effectiveCategory] || industryModules.software_house;

  const restrictedModules = {
    warehouse: ['finance', 'projects'],
    business: [],
    software_house: []
  };

  const allowedCommonModules = commonModules.filter(module => {
    const restricted = restrictedModules[effectiveCategory] || [];
    return !restricted.includes(module.key);
  });

  const industryOnlyCategories = ['warehouse'];
  
  if (industryOnlyCategories.includes(effectiveCategory)) {
    // Industry-specific tenants: Only Dashboard, Settings, and industry modules
    const essentialModules = [
      {
        key: 'dashboard',
        icon: HomeIcon,
        label: 'Dashboard',
        path: `/${tenantSlug}/org/dashboard`
      },
      {
        key: 'settings',
        icon: CogIcon,
        label: 'Settings',
        path: `/${tenantSlug}/org/settings`,
        children: [
          { key: 'settings-org',     label: 'Org Profile', path: `/${tenantSlug}/org/settings/organization` },
          { key: 'settings-general', label: 'General',     path: `/${tenantSlug}/org/settings` },
        ]
      }
    ];
    return [...essentialModules, ...industrySpecific];
  }
  // Software House / Business: common modules + industry-specific
  return [...allowedCommonModules, ...industrySpecific];
};

/**
 * Get industry-specific module keys for filtering
 */
export const getIndustryModuleKeys = (erpCategory) => {
  const moduleMap = {
    software_house: ['permissions', 'roles', 'departments', 'hr', 'tech-stack', 'development', 'time-tracking', 'clients', 'operations'],
    business: ['operations', 'clients']
  };
  return moduleMap[erpCategory] || moduleMap.software_house;
};

