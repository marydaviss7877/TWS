import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Squares2X2Icon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { clientPortalApi } from './clientPortalApi';

const APP_GRADIENTS = {
  projects: 'from-primary-500 to-accent-600',
  invoices: 'from-emerald-500 to-teal-600',
  documents: 'from-blue-500 to-cyan-600',
  contact: 'from-amber-500 to-orange-600',
  company: 'from-fuchsia-500 to-pink-600',
  timesheets: 'from-sky-500 to-primary-600',
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
        <span className="text-[10px] px-2 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
          {badge}
        </span>
      ) : null}
    </div>
  </Link>
);

export const ClientPortalLauncher = () => {
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

  const apps = useMemo(
    () => [
      {
        key: 'projects',
        to: 'projects',
        icon: BriefcaseIcon,
        title: 'Project Overview',
        description: 'Track project completion and active sprint deliverables.',
        badge: `${projectCount} project${projectCount === 1 ? '' : 's'}`,
      },
      {
        key: 'timesheets',
        to: 'timesheets',
        icon: ClockIcon,
        title: 'Timesheets',
        description: 'View read-only timesheet summaries for your projects.',
        badge: 'Read only',
      },
      {
        key: 'invoices',
        to: 'invoices',
        icon: CurrencyDollarIcon,
        title: 'Invoices',
        description: 'View invoice status and download links shared by your vendor.',
        badge: 'Read only',
      },
      {
        key: 'documents',
        to: 'documents',
        icon: DocumentTextIcon,
        title: 'Documents',
        description: 'Access shared/approved deliverable documents.',
        badge: 'Read only',
      },
      {
        key: 'contact',
        to: 'contact',
        icon: UserCircleIcon,
        title: 'Contact',
        description: 'Organization profile and project contact information.',
        badge: 'View only',
      },
      {
        key: 'company',
        to: '../settings/organization',
        icon: Squares2X2Icon,
        title: 'Company',
        description: 'LinkedIn-style company profile of the organization you work with.',
        badge: null,
      },
    ],
    [projectCount],
  );

  const q = search.trim().toLowerCase();
  const visibleApps = q
    ? apps.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.key.toLowerCase().includes(q),
      )
    : apps;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      <div className="text-center space-y-3">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          Client Workspace
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-primary-600 via-accent-600 to-pink-500 bg-clip-text text-transparent">
            Client Portal
          </span>
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
          className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/70 backdrop-blur-sm py-3.5 pr-4 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-primary-500 focus:shadow-lg"
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

export const ClientInvoicesView = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const list = await clientPortalApi.getProjects();
        const safe = Array.isArray(list) ? list : [];
        setProjects(safe);
        setSelectedProjectId(safe[0]?._id || '');
      } catch (err) {
        setError(err?.message || 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    const loadInvoices = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await clientPortalApi.getProjectInvoices(selectedProjectId);
        setInvoices(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err?.message || 'Failed to load invoices');
      } finally {
        setLoading(false);
      }
    };
    loadInvoices();
  }, [selectedProjectId]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h2>
        <Link to="../" className="text-sm text-blue-600 hover:text-blue-800">Back to Apps</Link>
      </div>
      {error ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-4">
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full md:w-96 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800"
        >
          {projects.map((project) => (
            <option key={project._id} value={project._id}>{project.name}</option>
          ))}
        </select>
        {loading ? <p className="text-sm text-gray-500">Loading invoices...</p> : null}
        {!loading && !invoices.length ? (
          <p className="text-sm text-gray-500">No invoices available for this project.</p>
        ) : null}
        {!loading && invoices.length ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {invoices.map((invoice) => (
              <div key={invoice._id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {invoice.invoiceNumber || 'Invoice'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Issued: {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : '-'} | Due:{' '}
                    {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {invoice.currency || 'USD'} {Number(invoice.total || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{invoice.status || 'draft'}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const ClientDocumentsView = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const list = await clientPortalApi.getProjects();
        const safe = Array.isArray(list) ? list : [];
        setProjects(safe);
        setSelectedProjectId(safe[0]?._id || '');
      } catch (err) {
        setError(err?.message || 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    const loadDocuments = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await clientPortalApi.getProjectDocuments(selectedProjectId);
        setDocuments(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err?.message || 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    };
    loadDocuments();
  }, [selectedProjectId]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h2>
        <Link to="../" className="text-sm text-blue-600 hover:text-blue-800">Back to Apps</Link>
      </div>
      {error ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-4">
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full md:w-96 rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-800"
        >
          {projects.map((project) => (
            <option key={project._id} value={project._id}>{project.name}</option>
          ))}
        </select>
        {loading ? <p className="text-sm text-gray-500">Loading documents...</p> : null}
        {!loading && !documents.length ? (
          <p className="text-sm text-gray-500">No shared documents available for this project.</p>
        ) : null}
        {!loading && documents.length ? (
          <div className="space-y-2">
            {documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded border border-gray-200 dark:border-gray-700 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/40"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</p>
                <p className="text-xs text-gray-500">{doc.deliverableTitle || 'Deliverable attachment'}</p>
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const ClientContactView = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await clientPortalApi.getContactProfile();
        setProfile(data || null);
      } catch (err) {
        setError(err?.message || 'Failed to load contact profile');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const org = profile?.organization || {};
  const client = profile?.client || {};

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contact</h2>
        <Link to="../" className="text-sm text-blue-600 hover:text-blue-800">Back to Apps</Link>
      </div>
      {error ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-4">
        {loading ? <p className="text-sm text-gray-500">Loading contact details...</p> : null}
        {!loading ? (
          <>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Organization</p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">{org.name || '-'}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {org.email || '-'} {org.phone ? `| ${org.phone}` : ''}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-500">Primary Contact</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {client.primaryContact?.name || '-'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {client.primaryContact?.email || '-'}
                </p>
              </div>
              <div className="rounded border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-xs text-gray-500">Billing Contact</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {client.billingContact?.name || '-'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {client.billingContact?.email || '-'}
                </p>
              </div>
            </div>
            <Link to="../settings/organization" className="inline-block text-sm text-blue-600 hover:text-blue-800">
              Open Company Profile
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
};
