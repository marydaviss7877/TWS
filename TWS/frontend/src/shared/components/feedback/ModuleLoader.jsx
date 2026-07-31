import React from 'react';
import {
  HomeIcon, BriefcaseIcon, FolderIcon, BuildingOfficeIcon, UsersIcon, UserIcon,
  CurrencyDollarIcon, BanknotesIcon, ClockIcon, ChartBarIcon, DocumentTextIcon,
  TableCellsIcon, PhotoIcon, ShieldCheckIcon, ClipboardDocumentListIcon,
  BookOpenIcon, Cog6ToothIcon, KeyIcon,
} from '@heroicons/react/24/outline';
import './ModuleLoader.css';

const MODULES = {
  dashboard: { label: 'Dashboard', message: 'Assembling your command view', icon: HomeIcon, color: '#536de7', type: 'tiles' },
  'my-work': { label: 'My Work', message: 'Prioritizing your work queue', icon: BriefcaseIcon, color: '#3587e5', type: 'queue' },
  projects: { label: 'Projects', message: 'Synchronizing delivery timelines', icon: FolderIcon, color: '#8659e8', type: 'gantt' },
  clients: { label: 'Clients', message: 'Connecting account signals', icon: BuildingOfficeIcon, color: '#289dd6', type: 'bridge' },
  hr: { label: 'HR', message: 'Bringing your people data together', icon: UsersIcon, color: '#e99b27', type: 'people' },
  users: { label: 'Users', message: 'Verifying workspace identities', icon: UserIcon, color: '#e75982', type: 'scan' },
  departments: { label: 'Departments', message: 'Mapping your organization', icon: BuildingOfficeIcon, color: '#dc9329', type: 'tree' },
  finance: { label: 'Finance', message: 'Balancing the live ledger', icon: CurrencyDollarIcon, color: '#1bab79', type: 'ledger' },
  payroll: { label: 'Payroll', message: 'Preparing the pay cycle', icon: BanknotesIcon, color: '#24a86d', type: 'packets' },
  'time-tracking': { label: 'Time Tracking', message: 'Resolving accountable time', icon: ClockIcon, color: '#4c7fe0', type: 'clock' },
  analytics: { label: 'Analytics', message: 'Turning measures into insight', icon: ChartBarIcon, color: '#1ca6cf', type: 'chart' },
  documents: { label: 'Documents', message: 'Preparing workspace knowledge', icon: DocumentTextIcon, color: '#68798f', type: 'document' },
  sheets: { label: 'Sheets', message: 'Calculating the active data range', icon: TableCellsIcon, color: '#4daa50', type: 'cells' },
  portfolio: { label: 'Portfolio', message: 'Bringing project stories into focus', icon: PhotoIcon, color: '#a354db', type: 'frames' },
  permissions: { label: 'Permissions', message: 'Validating access rules', icon: ShieldCheckIcon, color: '#df5364', type: 'shield' },
  roles: { label: 'Roles', message: 'Resolving workspace access', icon: KeyIcon, color: '#20a5a9', type: 'shield' },
  audit: { label: 'Audit Log', message: 'Verifying the event trail', icon: ClipboardDocumentListIcon, color: '#d89b22', type: 'trace' },
  rulebook: { label: 'Org Rule Book', message: 'Loading applicable workspace policy', icon: BookOpenIcon, color: '#c88029', type: 'book' },
  settings: { label: 'Settings', message: 'Calibrating your workspace', icon: Cog6ToothIcon, color: '#6e7d90', type: 'gears' },
};

const routeModule = (pathname = '') => {
  const path = pathname.toLowerCase();
  const ordered = [
    'time-tracking', 'departments', 'permissions', 'documents', 'portfolio',
    'analytics', 'projects', 'clients', 'finance', 'payroll', 'rulebook',
    'settings', 'roles', 'users', 'audit', 'hr', 'my-work', 'dashboard',
  ];
  return ordered.find(key => path.includes(`/${key}`)) || 'dashboard';
};

const MotionShape = ({ type }) => {
  if (type === 'tiles') return <>{[0, 1, 2, 3].map(i => <i key={i} className={`ml-tile ml-delay-${i}`} />)}</>;
  if (type === 'queue') return <>{[0, 1, 2].map(i => <i key={i} className={`ml-task ml-delay-${i}`} />)}</>;
  if (type === 'gantt') return <>{[0, 1, 2, 3].map(i => <i key={i} className={`ml-gantt ml-delay-${i}`} />)}</>;
  if (type === 'people') return <>{[0, 1, 2].map(i => <i key={i} className={`ml-person ml-delay-${i}`} />)}</>;
  if (type === 'tree') return <><i className="ml-tree-line" />{[0, 1, 2, 3].map(i => <i key={i} className={`ml-tree-node ml-delay-${i}`} />)}</>;
  if (type === 'ledger') return <>{[0, 1, 2].map(i => <i key={i} className={`ml-entry ml-delay-${i}`} />)}<b className="ml-equals">=</b></>;
  if (type === 'packets') return <>{[0, 1, 2].map(i => <i key={i} className={`ml-coin ml-delay-${i}`}>$</i>)}</>;
  if (type === 'clock') return <><i className="ml-clock" /><i className="ml-hand" /><i className="ml-hand ml-hand-short" /></>;
  if (type === 'chart') return <>{[0, 1, 2, 3].map(i => <i key={i} className={`ml-chart ml-delay-${i}`} />)}</>;
  if (type === 'document') return <>{[0, 1, 2, 3].map(i => <i key={i} className={`ml-text ml-delay-${i}`} />)}</>;
  if (type === 'cells') return <><i className="ml-grid" /><i className="ml-sweep" /></>;
  if (type === 'frames') return <><i className="ml-frame ml-frame-a" /><i className="ml-frame ml-frame-b" /></>;
  if (type === 'shield' || type === 'scan') return <><i className="ml-shield" /><i className="ml-scan" /></>;
  if (type === 'trace') return <><i className="ml-trace" />{[0, 1, 2].map(i => <i key={i} className={`ml-event ml-delay-${i}`} />)}</>;
  if (type === 'book') return <><i className="ml-book" /><i className="ml-page" /></>;
  if (type === 'gears') return <><i className="ml-gear ml-gear-a" /><i className="ml-gear ml-gear-b" /></>;
  return <><i className="ml-bridge" /><i className="ml-packet" /></>;
};

const ModuleLoader = ({ moduleKey, message, className = '', compact = false }) => {
  const activeKey = moduleKey && MODULES[moduleKey]
    ? moduleKey
    : routeModule(typeof window !== 'undefined' ? window.location.pathname : '');
  const module = MODULES[activeKey] || MODULES.dashboard;
  const Icon = module.icon;

  return (
    <div
      className={`tws-module-loader ${compact ? 'tws-module-loader--compact' : ''} ${className}`}
      style={{ '--ml-accent': module.color }}
      role="status"
      aria-live="polite"
      aria-label={message || module.message}
    >
      <div className="tws-module-loader__motion" aria-hidden="true">
        <div className={`tws-module-loader__shape tws-module-loader__shape--${module.type}`}>
          <MotionShape type={module.type} />
        </div>
        <div className="tws-module-loader__core"><Icon /></div>
      </div>
      <div className="tws-module-loader__copy">
        <strong>{module.label}</strong>
        <span>{message || module.message}</span>
        <i><b /></i>
      </div>
    </div>
  );
};

export { MODULES, routeModule };
export default ModuleLoader;
