import React, { useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import {
  Squares2X2Icon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import ClientProjectsView from './ClientProjectsView';
import ClientOrganizationProfile from './ClientOrganizationProfile';
import ClientTimesheetsView from './ClientTimesheetsView';
import { clientPortalApi } from './clientPortalApi';

const APP_GRADIENTS = {
  projects: 'from-indigo-500 to-violet-600',
  invoices: 'from-emerald-500 to-teal-600',
  documents: 'from-blue-500 to-cyan-600',
  contact: 'from-amber-500 to-orange-600',
  company: 'from-fuchsia-500 to-pink-600',
  timesheets: 'from-sky-500 to-indigo-600'
};

const AppCard = ({ to, icon: Icon, title, description, badge, gradient }) => (
  <Link
    to={to}
    className="group relative flex flex-col items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/85 dark:bg-gray-800/60 p-3 sm:p-3.5 hover:shadow-lg hover:-translate-y-1 transition-all backdrop-blur-sm min-h-[150px]"
  >
    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-md group-hover:scale-105 transition-transform`}>
      <Icon className="h-6 w-6 text-white" />
    </div>
    <div className="text-center w-full">
      <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white leading-tight">{title}</h3>
      <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-300 leading-tight">{description}</p>
    </div>
    <div className="flex justify-center w-full">
      {badge ? (
        <span className="text-[10px] px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
          {badge}
        </span>
      ) : null}
    </div>
  </Link>
);

const ClientPortalLauncher = () => {
  const [projectCount, setProjectCount] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const projects = await clientPortalApi.getProjects();
        if (Array.isArray(projects)) setProjectCount(projects.length);
      } catch (_) {
        setProjectCount(0);
      }
    };
    load();
  }, []);

  const apps = useMemo(() => ([
    {
      key: 'projects',
      to: 'projects',
      icon: BriefcaseIcon,
      title: 'Project Overview',
      description: 'Track project completion and active sprint deliverables.',
      badge: `${projectCount} project${projectCount === 1 ? '' : 's'}`
    },
    {
      key: 'timesheets',
      to: 'timesheets',
      icon: ClockIcon,
      title: 'Timesheets',
      description: 'View read-only timesheet summaries for your projects.',
      badge: 'Read only'
    },
    {
      key: 'invoices',
      to: 'invoices',
      icon: CurrencyDollarIcon,
      title: 'Invoices',
      description: 'View invoice status and download links shared by your vendor.',
      badge: 'Read only'
    },
    {
      key: 'documents',
      to: 'documents',
      icon: DocumentTextIcon,
      title: 'Documents',
      description: 'Access shared/approved deliverable documents.',
      badge: 'Read only'
    },
    {
      key: 'contact',
      to: 'contact',
      icon: UserCircleIcon,
      title: 'Contact',
      description: 'Organization profile and project contact information.',
      badge: 'View only'
    },
    {
      key: 'company',
      to: '../settings/organization',
      icon: Squares2X2Icon,
      title: 'Company',
      description: 'LinkedIn-style company profile of the organization you work with.',
      badge: null
    }
  ]), [projectCount]);

  const q = search.trim().toLowerCase();
  const visibleApps = q
    ? apps.filter((a) =>
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.key.toLowerCase().includes(q))
    : apps;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      <div className="text-center space-y-3">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          Client Workspace
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
          Welcome to <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">Client Portal</span>
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Read-only workspace to track progress, deliverables, invoices, shared documents, and company contact.
        </p>
      </div>

      <div className="relative max-w-2xl mx-auto">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Search client apps…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/70 backdrop-blur-sm py-3.5 pl-13 pr-4 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:shadow-lg"
          style={{ paddingLeft: '3.25rem' }}
        />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2.5 sm:gap-3 lg:gap-4">
        {visibleApps.map((app) => (
          <AppCard
            key={app.key}
            to={app.to}
            icon={app.icon}
            title={app.title}
            description={app.description}
            badge={app.badge}
            gradient={APP_GRADIENTS[app.key] || 'from-gray-500 to-gray-600'}
          />
        ))}
      </div>
    </div>
  );
};

const ClientInvoicesView = () => (
  <div className="max-w-5xl mx-auto px-4 py-8">
    <div className="mb-6 flex items-center justify-between">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h2>
      <Link to="../" className="text-sm text-blue-600 hover:text-blue-800">Back to Apps</Link>
    </div>
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Your invoice feed is configured as read-only. When invoices are published for your assigned projects,
        they appear here with status and download links.
      </p>
    </div>
  </div>
);

const ClientDocumentsView = () => (
  <div className="max-w-5xl mx-auto px-4 py-8">
    <div className="mb-6 flex items-center justify-between">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h2>
      <Link to="../" className="text-sm text-blue-600 hover:text-blue-800">Back to Apps</Link>
    </div>
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Shared and approved project documents are available through project deliverables.
        Open <span className="font-medium">Project Overview</span> to access download links by deliverable.
      </p>
    </div>
  </div>
);

const ClientContactView = () => (
  <div className="max-w-5xl mx-auto px-4 py-8">
    <div className="mb-6 flex items-center justify-between">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contact</h2>
      <Link to="../" className="text-sm text-blue-600 hover:text-blue-800">Back to Apps</Link>
    </div>
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Use the company profile page for organization contact details:
      </p>
      <Link to="../settings/organization" className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-800">
        Open Company Profile
      </Link>
    </div>
  </div>
);

const ClientDashboard = ({ clientId }) => {
  const safeClientId = useMemo(() => clientId, [clientId]);
  return (
    <Routes>
      <Route index element={<ClientPortalLauncher />} />
      <Route path="projects" element={<ClientProjectsView clientId={safeClientId} />} />
      <Route path="projects/:projectId" element={<ClientProjectsView clientId={safeClientId} />} />
      <Route path="projects/:projectId/deliverables/:deliverableId" element={<ClientProjectsView clientId={safeClientId} />} />
      <Route path="timesheets" element={<ClientTimesheetsView />} />
      <Route path="invoices" element={<ClientInvoicesView />} />
      <Route path="documents" element={<ClientDocumentsView />} />
      <Route path="contact" element={<ClientContactView />} />
      <Route path="company" element={<ClientOrganizationProfile />} />
    </Routes>
  );
};

export default ClientDashboard;
