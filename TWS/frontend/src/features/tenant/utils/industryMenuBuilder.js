import {
  HomeIcon,
  UserIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  InboxIcon,
  WrenchScrewdriverIcon,
  ChatBubbleLeftRightIcon,
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
  const effectiveCategory = (erpCategory === 'healthcare') ? 'software_house' : erpCategory;
  // Common modules that all industries get
  const commonModules = [
    {
      key: 'dashboard',
      icon: HomeIcon,
      label: 'Dashboard',
      path: `/dashboard`
    },
    {
      key: 'my-work',
      icon: BriefcaseIcon,
      label: 'My Work',
      path: `/my-work`
    },
    {
      key: 'analytics',
      icon: ChartBarIcon,
      label: 'Analytics',
      path: `/analytics`
    },
    {
      key: 'users',
      icon: UserIcon,
      label: 'Users',
      path: `/users`
    },
    {
      key: 'finance',
      icon: CurrencyDollarIcon,
      label: 'Finance',
      path: `/finance`,
      children: [
        {
          key: 'finance-dashboard',
          label: 'Dashboard',
          path: `/finance`
        },
        {
          key: 'finance-accounts-payable',
          label: 'Accounts Payable',
          path: `/finance/accounts-payable`
        },
        {
          key: 'finance-accounts-receivable',
          label: 'Accounts Receivable',
          path: `/finance/accounts-receivable`
        },
        {
          key: 'finance-budgeting',
          label: 'Budgeting',
          path: `/finance/budgeting`
        },
        {
          key: 'finance-expense-management',
          label: 'Expense Management',
          path: `/finance/time-expenses`
        },
        {
          key: 'finance-financial-reports',
          label: 'Financial Reports',
          path: `/finance/reporting`
        }
      ]
    },
    {
      key: 'projects',
      icon: ClipboardDocumentListIcon,
      label: 'Projects',
      path: `/projects`,
      children: [
        {
          key: 'projects-overview',
          label: 'Overview',
          path: `/projects`
        },
        {
          key: 'projects-list',
          label: 'All Projects',
          path: `/projects/list`
        },
        {
          key: 'projects-tasks',
          label: 'Tasks',
          path: `/projects/tasks`
        },
        {
          key: 'projects-gantt',
          label: 'Gantt Chart',
          path: `/projects/gantt`
        },
        {
          key: 'projects-milestones',
          label: 'Milestones',
          path: `/projects/milestones`
        },
        {
          key: 'projects-resources',
          label: 'Resources',
          path: `/projects/resources`
        },
        {
          key: 'projects-timesheets',
          label: 'Timesheets',
          path: `/projects/timesheets`
        },
        {
          key: 'projects-sprints',
          label: 'Sprints',
          path: `/projects/sprints`
        },
        {
          key: 'projects-deliverables',
          label: 'Deliverables',
          path: `/projects/deliverables`,
          icon: FlagIcon,
          description: 'Nucleus Project OS - Deliverable Management'
        },
        {
          key: 'projects-approvals',
          label: 'Approval Queue',
          path: `/projects/approvals`,
          icon: ClipboardDocumentCheckIcon,
          description: 'Nucleus Project OS - Pending your approval'
        },
        {
          key: 'projects-change-requests',
          label: 'Change Requests',
          path: `/projects/change-requests`,
          icon: ExclamationCircleIcon,
          description: 'Nucleus Project OS - Scope Change Management'
        },
        {
          key: 'projects-analytics',
          label: 'Nucleus Analytics',
          path: `/projects/analytics`,
          icon: ChartBarIcon,
          description: 'Workspace stats, at-risk deliverables, status summary'
        }
      ]
    },
    {
      key: 'documents',
      icon: PencilSquareIcon,
      label: 'Documents',
      path: `/documents`,
      description: 'Built-in word processor â€“ write, save, and download documents',
      children: [
        {
          key: 'documents-list',
          label: 'Documents',
          path: `/documents`
        },
        {
          key: 'documents-approvals',
          label: 'Approvals',
          path: `/documents/approval-queue`,
          icon: ClockIcon
        },
        {
          key: 'documents-audit',
          label: 'Audit Log',
          path: `/documents/audit`,
          icon: ClipboardDocumentListIcon
        }
      ]
    },
    // Messaging menu item removed - only supra-admin messaging remains
    {
      key: 'audit',
      icon: ClipboardDocumentListIcon,
      label: 'Audit Log',
      path: `/audit`
    },
    {
      key: 'rulebook',
      icon: BookOpenIcon,
      label: 'Org rule book',
      path: `/rulebook`,
      description: 'Session, security, and acceptable use for this workspace'
    },
    {
      key: 'settings',
      icon: CogIcon,
      label: 'Settings',
      path: `/settings`,
      children: [
        { key: 'settings-org',      label: 'Org Profile',  path: `/settings/organization` },
        { key: 'settings-general',  label: 'General',      path: `/settings` },
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
        path: `/permissions`,
        children: [
          {
            key: 'permissions-list',
            label: 'Permissions',
            path: `/permissions`
          },
          {
            key: 'permissions-create',
            label: 'Create Permission',
            path: `/permissions/create`
          }
        ]
      },
      {
        key: 'roles',
        icon: UserGroupIcon,
        label: 'Roles',
        path: `/roles`,
        children: [
          {
            key: 'roles-list',
            label: 'Roles',
            path: `/roles`
          },
          {
            key: 'roles-create',
            label: 'Create Role',
            path: `/roles/create`
          }
        ]
      },
      {
        key: 'departments',
        icon: BuildingOfficeIcon,
        label: 'Department',
        path: `/departments`,
        children: [
          {
            key: 'departments-list',
            label: 'Departments',
            path: `/departments`
          },
          {
            key: 'departments-create',
            label: 'Create Department',
            path: `/departments/create`
          },
          {
            key: 'departments-access',
            label: 'Manage Access',
            path: `/departments/access`
          }
        ]
      },
      {
        key: 'hr',
        icon: UsersIcon,
        label: 'HR',
        path: `/software-house/hr`,
        children: [
          {
            key: 'hr-overview',
            label: 'Overview',
            path: `/software-house/hr`
          },
          {
            key: 'hr-employees',
            label: 'Employees',
            path: `/software-house/hr/employees`
          },
          {
            key: 'hr-payroll',
            label: 'Payroll',
            path: `/software-house/hr/payroll`
          },
          {
            key: 'hr-attendance',
            label: 'Attendance',
            path: `/software-house/hr/attendance`
          },
          {
            key: 'hr-leave-requests',
            label: 'Leave Requests',
            path: `/software-house/hr/leave-requests`
          },
          {
            key: 'hr-performance',
            label: 'Performance',
            path: `/software-house/hr/performance`
          },
          {
            key: 'hr-recruitment',
            label: 'Recruitment',
            path: `/software-house/hr/recruitment`
          },
          {
            key: 'hr-onboarding',
            label: 'Onboarding',
            path: `/software-house/hr/onboarding`
          },
          {
            key: 'hr-training',
            label: 'Training',
            path: `/software-house/hr/training`
          }
        ]
      },
      {
        key: 'time-tracking',
        icon: ClockIcon,
        label: 'Time Tracking',
        path: `/software-house/time-tracking`
      },
      {
        key: 'clients',
        icon: BuildingOfficeIcon,
        label: 'Clients',
        path: `/clients`,
        children: [
          {
            key: 'clients-list',
            label: 'Client List',
            path: `/clients`
          },
          {
            key: 'clients-contracts',
            label: 'Contracts',
            path: `/clients/contracts`
          },
          {
            key: 'clients-communications',
            label: 'Communication Logs',
            path: `/clients/communications`
          },
          {
            key: 'clients-billing',
            label: 'Billing',
            path: `/clients/billing`
          }
        ]
      },
      {
        key: 'operations',
        icon: WrenchScrewdriverIcon,
        label: 'Operations',
        path: `/operations`
      }
    ],
    business: [
      {
        key: 'operations',
        icon: WrenchScrewdriverIcon,
        label: 'Operations',
        path: `/operations`
      },
      {
        key: 'clients',
        icon: BuildingOfficeIcon,
        label: 'Clients',
        path: `/clients`
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
        path: `/dashboard`
      },
      {
        key: 'rulebook',
        icon: BookOpenIcon,
        label: 'Org rule book',
        path: `/rulebook`,
        description: 'Session, security, and acceptable use for this workspace'
      },
      {
        key: 'settings',
        icon: CogIcon,
        label: 'Settings',
        path: `/settings`,
        children: [
          { key: 'settings-org',     label: 'Org Profile', path: `/settings/organization` },
          { key: 'settings-general', label: 'General',     path: `/settings` },
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

