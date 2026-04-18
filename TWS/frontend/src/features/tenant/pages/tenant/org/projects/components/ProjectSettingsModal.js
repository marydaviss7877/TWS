/**
 * Project settings — right slide-over panel (same interaction pattern as the task drawer on the board).
 * Tabs: General | Timeline | Budget | Departments | Danger
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  XMarkIcon,
  InformationCircleIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { useParams } from 'react-router-dom';
import tenantProjectApiService from '../services/tenantProjectApiService';
import { validateProjectForm, sanitizeProjectData } from '../utils/validation';
import { handleApiError, handleSuccess } from '../utils/errorHandler';
import { SUCCESS_MESSAGES, PROJECT_PRIORITY, PROJECT_TYPE } from '../constants/projectConstants';
import { showSuccess, showError } from '../utils/toastNotifications';

/* ─── constants ─────────────────────────────────────────────────────────────── */
const PROJECT_STATUS_OPTIONS = [
  { value: 'planning',   label: 'Planning',   dot: 'bg-blue-400' },
  { value: 'active',     label: 'Active',     dot: 'bg-emerald-500' },
  { value: 'on_hold',    label: 'On Hold',    dot: 'bg-amber-400' },
  { value: 'completed',  label: 'Completed',  dot: 'bg-teal-500' },
  { value: 'cancelled',  label: 'Cancelled',  dot: 'bg-red-400' },
  { value: 'archived',   label: 'Archived',   dot: 'bg-gray-400' },
];

const DEPARTMENT_VISIBILITY_PRESETS = [
  { value: 'dev',              label: 'Development (full)' },
  { value: 'design',           label: 'Design' },
  { value: 'qa',               label: 'QA' },
  { value: 'pm',               label: 'Project Manager' },
  { value: 'finance_observer', label: 'Finance observer' },
  { value: 'sales_observer',   label: 'Sales observer (minimal)' },
];

const TABS = [
  { key: 'general',     label: 'General',     Icon: InformationCircleIcon },
  { key: 'timeline',    label: 'Timeline',    Icon: CalendarDaysIcon },
  { key: 'budget',      label: 'Budget',      Icon: CurrencyDollarIcon },
  { key: 'departments', label: 'Departments', Icon: BuildingOfficeIcon },
  { key: 'danger',      label: 'Danger',      Icon: ExclamationTriangleIcon, danger: true },
];

/* ─── helpers ────────────────────────────────────────────────────────────────── */
function FieldLabel({ children }) {
  return <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>;
}
function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-red-500 text-xs mt-1">{msg}</p>;
}
function Field({ label, error, children }) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      {children}
      <FieldError msg={error} />
    </div>
  );
}

function getProjectLogoApiUrl(url, tenantSlug) {
  if (!url || !tenantSlug) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/project-logos/')) {
    return `/api/tenant/${tenantSlug}/organization${url}`;
  }
  return url;
}

/* ─── Main component ─────────────────────────────────────────────────────────── */
const ProjectSettingsModal = ({ isOpen, onClose, project, projectId: projectIdProp, onSaved }) => {
  const { tenantSlug } = useParams();
  const projectId = projectIdProp || project?._id || project?.id;

  const [activeTab,  setActiveTab]  = useState('general');
  const [formData,   setFormData]   = useState({
    name: '', description: '', clientId: '',
    projectType: PROJECT_TYPE.GENERAL,
    budget:   { total: '', currency: 'USD' },
    timeline: { startDate: '', endDate: '', estimatedHours: '' },
    priority: PROJECT_PRIORITY.MEDIUM,
    status:   'planning',
    primaryDepartmentId: '',
    departments: [],
  });
  const [departmentVisibility, setDepartmentVisibility] = useState([]);
  const [isLoading,  setIsLoading]  = useState(false);
  const [isDangerLoading, setIsDangerLoading] = useState(false);
  const [errors,     setErrors]     = useState({});
  const [clients,    setClients]    = useState([]);
  const [departments,setDepartments]= useState([]);
  const [dangerConfirm, setDangerConfirm] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoRemoving, setLogoRemoving] = useState(false);
  const [headerLogoBroken, setHeaderLogoBroken] = useState(false);
  const logoFileInputRef = useRef(null);

  const logoApiUrl = getProjectLogoApiUrl(project?.logoUrl, tenantSlug);

  useEffect(() => {
    setHeaderLogoBroken(false);
  }, [project?.logoUrl, tenantSlug]);

  /* ── fetch reference data ── */
  useEffect(() => {
    if (isOpen && tenantSlug) {
      tenantProjectApiService.getClients(tenantSlug).then(d => setClients(Array.isArray(d) ? d : (d?.clients || []))).catch(() => setClients([]));
      tenantProjectApiService.getDepartments(tenantSlug).then(d => setDepartments(Array.isArray(d) ? d : [])).catch(() => setDepartments([]));
    }
  }, [isOpen, tenantSlug]);

  /* ── populate form from project prop ── */
  useEffect(() => {
    if (isOpen && project) {
      const p = project;
      const budget   = p.budget   || {};
      const timeline = p.timeline || {};
      const primaryId = (p.primaryDepartmentId?._id || p.primaryDepartmentId) || '';
      setFormData({
        name:        p.name || '',
        description: p.description || '',
        clientId:    p.clientId?._id || p.clientId || '',
        projectType: p.projectType || PROJECT_TYPE.GENERAL,
        budget: { total: budget.total != null ? String(budget.total) : '', currency: budget.currency || 'USD' },
        timeline: {
          startDate:      timeline.startDate ? timeline.startDate.slice(0, 10) : '',
          endDate:        timeline.endDate   ? timeline.endDate.slice(0, 10)   : '',
          estimatedHours: timeline.estimatedHours != null ? String(timeline.estimatedHours) : '',
        },
        priority:            (p.priority || 'medium').toLowerCase(),
        status:              p.status || 'planning',
        primaryDepartmentId: primaryId,
        departments:         (Array.isArray(p.departments) ? p.departments : []).map(d => d._id || d),
      });
      setErrors({});
      setDangerConfirm('');
    }
  }, [isOpen, project]);

  /* ── department visibility ── */
  useEffect(() => {
    if (!isOpen || !project) return;
    const p = project;
    const primaryId = (p.primaryDepartmentId?._id || p.primaryDepartmentId)?.toString?.();
    const deptIds = [...new Set([primaryId, ...(Array.isArray(p.departments) ? p.departments.map(d => (d?._id || d)?.toString?.()).filter(Boolean) : [])])].filter(Boolean);
    const configs = p.projectDepartmentConfigs || [];
    setDepartmentVisibility(deptIds.map(id => {
      const cfg  = configs.find(c => (c.departmentId?._id || c.departmentId)?.toString?.() === id);
      const dept = departments.find(d => (d._id || d.id)?.toString?.() === id);
      return { departmentId: id, departmentName: dept?.name || 'Department', roleInProject: cfg?.roleInProject || (id === primaryId ? 'dev' : 'sales_observer') };
    }));
  }, [isOpen, project, departments]);

  /* ── handlers ── */
  const handleInputChange = e => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (isLoading || !project?._id) return;
    const validation = validateProjectForm(formData);
    if (!validation.isValid) { setErrors(validation.errors); return; }

    setIsLoading(true);
    try {
      const payload = {
        name:        formData.name.trim(),
        description: formData.description || undefined,
        budget:      { total: formData.budget.total ? parseFloat(formData.budget.total) : 0, currency: formData.budget.currency || 'USD' },
        timeline:    { startDate: formData.timeline.startDate || undefined, endDate: formData.timeline.endDate || undefined, estimatedHours: formData.timeline.estimatedHours ? parseInt(formData.timeline.estimatedHours, 10) : undefined },
        status:      formData.status || 'planning',
        priority:    (formData.priority || 'medium').toLowerCase(),
        projectType: formData.projectType || 'general',
        clientId:    formData.clientId || undefined,
        primaryDepartmentId: formData.primaryDepartmentId || undefined,
        departments: formData.departments?.length > 0 ? formData.departments : undefined,
        projectDepartmentConfigs: departmentVisibility.length > 0
          ? departmentVisibility.map(({ departmentId, roleInProject }) => ({ departmentId, roleInProject }))
          : undefined,
      };
      await tenantProjectApiService.updateProject(tenantSlug, projectId, sanitizeProjectData(payload));
      showSuccess('Project settings saved');
      if (onSaved) await onSaved();
      onClose();
    } catch (error) {
      const msg = error.message || 'Failed to update project';
      setErrors({ submit: msg });
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !projectId) return;
    if (file.size > 2 * 1024 * 1024) {
      showError('Image must be 2 MB or smaller');
      return;
    }
    setLogoUploading(true);
    try {
      await tenantProjectApiService.uploadProjectLogo(tenantSlug, projectId, file);
      showSuccess('Project logo updated');
      if (onSaved) await onSaved();
    } catch (err) {
      showError(err.message || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleProjectLogoRemove = async () => {
    if (!projectId || !project?.logoUrl) return;
    setLogoRemoving(true);
    try {
      await tenantProjectApiService.deleteProjectLogo(tenantSlug, projectId);
      showSuccess('Project logo removed');
      if (onSaved) await onSaved();
    } catch (err) {
      showError(err.message || 'Failed to remove logo');
    } finally {
      setLogoRemoving(false);
    }
  };

  const handleArchive = async () => {
    if (dangerConfirm !== (project?.name || '')) return;
    setIsDangerLoading(true);
    try {
      await tenantProjectApiService.updateProject(tenantSlug, projectId, { status: 'archived' });
      showSuccess('Project archived');
      if (onSaved) await onSaved();
      onClose();
    } catch { showError('Failed to archive project'); }
    finally { setIsDangerLoading(false); }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined' || !document.body) return null;

  const projectTypeOptions = Object.entries(PROJECT_TYPE).map(([k, v]) => ({
    label: k.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' '), value: v,
  }));

  const currentStatusDot = PROJECT_STATUS_OPTIONS.find(s => s.value === formData.status)?.dot || 'bg-gray-400';

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[80] bg-black/30"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed inset-y-0 right-0 z-[90] flex w-full max-w-xl flex-col overflow-hidden border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-settings-panel-title"
      >
        {/* Panel header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {logoApiUrl && !headerLogoBroken ? (
              <img
                src={logoApiUrl}
                alt=""
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-gray-200 dark:ring-gray-600 shrink-0"
                onError={() => setHeaderLogoBroken(true)}
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {(project?.name || 'P').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2 id="project-settings-panel-title" className="truncate text-lg font-bold leading-tight text-gray-900 dark:text-white">
                {project?.name || 'Project'}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-2 h-2 rounded-full ${currentStatusDot}`} />
                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{formData.status}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            aria-label="Close project settings"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex min-h-0 min-w-0 shrink-0 flex-nowrap items-stretch gap-0 overflow-x-auto overflow-y-hidden border-b border-gray-200 px-3 pb-0.5 dark:border-gray-700 glass-scrollbar scroll-smooth sm:px-4">
          {TABS.map(tab => (
            <button key={tab.key} type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                'flex shrink-0 items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab.key
                  ? (tab.danger ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-primary-500 text-primary-600 dark:text-primary-400')
                  : (tab.danger ? 'border-transparent text-red-400 dark:text-red-500 hover:text-red-500' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'),
              ].join(' ')}>
              <tab.Icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4 space-y-4 sm:px-6 sm:py-5 glass-scrollbar">

          {/* ── General ── */}
          {activeTab === 'general' && (
            <>
              <Field label="Project name *" error={errors.name}>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange}
                  className={`w-full glass-input rounded-xl px-4 py-2 ${errors.name ? 'border-red-300' : ''}`}
                  placeholder="Enter project name" />
              </Field>
              <Field label="Description">
                <textarea name="description" value={formData.description} onChange={handleInputChange}
                  rows={3} className="w-full glass-input rounded-xl px-4 py-2" placeholder="Describe the project…" />
              </Field>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 p-4">
                <FieldLabel>Project logo</FieldLabel>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Optional image for the project header (JPEG, PNG, WebP, GIF, or SVG, max 2 MB).
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-600">
                    {logoApiUrl && !headerLogoBroken ? (
                      <img
                        src={logoApiUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={() => setHeaderLogoBroken(true)}
                      />
                    ) : (
                      <PhotoIcon className="h-8 w-8 text-gray-300 dark:text-gray-600" aria-hidden />
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.svg"
                      className="hidden"
                      onChange={handleProjectLogoUpload}
                    />
                    <button
                      type="button"
                      disabled={logoUploading || !projectId}
                      onClick={() => logoFileInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      <PhotoIcon className="h-4 w-4 shrink-0" />
                      {logoUploading ? 'Uploading…' : project?.logoUrl ? 'Replace image' : 'Upload image'}
                    </button>
                    {project?.logoUrl && (
                      <button
                        type="button"
                        disabled={logoRemoving}
                        onClick={handleProjectLogoRemove}
                        className="inline-flex items-center justify-center rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                      >
                        {logoRemoving ? 'Removing…' : 'Remove logo'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Type">
                  <select name="projectType" value={formData.projectType} onChange={handleInputChange} className="w-full glass-input rounded-xl px-4 py-2">
                    {projectTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Priority">
                  <select name="priority" value={formData.priority} onChange={handleInputChange} className="w-full glass-input rounded-xl px-4 py-2">
                    <option value={PROJECT_PRIORITY.LOW}>Low</option>
                    <option value={PROJECT_PRIORITY.MEDIUM}>Medium</option>
                    <option value={PROJECT_PRIORITY.HIGH}>High</option>
                    <option value={PROJECT_PRIORITY.URGENT}>Urgent</option>
                  </select>
                </Field>
              </div>
              <Field label="Status">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${currentStatusDot} shrink-0`} />
                  <select name="status" value={formData.status} onChange={handleInputChange} className="flex-1 glass-input rounded-xl px-4 py-2">
                    {PROJECT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </Field>
              {clients.length > 0 && (
                <Field label="Client">
                  <select name="clientId" value={formData.clientId} onChange={handleInputChange} className="w-full glass-input rounded-xl px-4 py-2">
                    <option value="">No client assigned</option>
                    {clients.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
                  </select>
                </Field>
              )}
            </>
          )}

          {/* ── Timeline ── */}
          {activeTab === 'timeline' && (
            <>
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 px-4 py-3 text-xs text-blue-700 dark:text-blue-300">
                Project-level timeline. Individual task start/due dates are set per task in the board.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Start date">
                  <input type="date" name="timeline.startDate" value={formData.timeline.startDate}
                    onChange={handleInputChange} max={formData.timeline.endDate || undefined}
                    className="w-full glass-input rounded-xl px-4 py-2" />
                </Field>
                <Field label="End date">
                  <input type="date" name="timeline.endDate" value={formData.timeline.endDate}
                    onChange={handleInputChange} min={formData.timeline.startDate || undefined}
                    className="w-full glass-input rounded-xl px-4 py-2" />
                </Field>
              </div>
              <Field label="Estimated hours">
                <input type="number" min="0" name="timeline.estimatedHours" value={formData.timeline.estimatedHours}
                  onChange={handleInputChange} className="w-full glass-input rounded-xl px-4 py-2" placeholder="0" />
              </Field>
              {/* Duration preview */}
              {formData.timeline.startDate && formData.timeline.endDate && (
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  Duration: <strong className="text-gray-900 dark:text-white">
                    {Math.ceil((new Date(formData.timeline.endDate) - new Date(formData.timeline.startDate)) / 86400000)} days
                  </strong>
                </div>
              )}
            </>
          )}

          {/* ── Budget ── */}
          {activeTab === 'budget' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Total budget" error={errors.budget}>
                  <input type="number" min="0" step="0.01" name="budget.total"
                    value={formData.budget.total} onChange={handleInputChange}
                    className="w-full glass-input rounded-xl px-4 py-2" placeholder="0" />
                </Field>
                <Field label="Currency">
                  <select name="budget.currency" value={formData.budget.currency} onChange={handleInputChange}
                    className="w-full glass-input rounded-xl px-4 py-2">
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="PKR">PKR — Pakistani Rupee</option>
                  </select>
                </Field>
              </div>
              {/* Budget display */}
              {formData.budget.total && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 px-4 py-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                  <CurrencyDollarIcon className="w-5 h-5 shrink-0" />
                  Total budget: <strong>{Number(formData.budget.total).toLocaleString()} {formData.budget.currency}</strong>
                </div>
              )}
            </>
          )}

          {/* ── Departments ── */}
          {activeTab === 'departments' && (
            <>
              {departments.length > 0 ? (
                <>
                  <Field label="Primary department">
                    <select name="primaryDepartmentId" value={formData.primaryDepartmentId}
                      onChange={handleInputChange} className="w-full glass-input rounded-xl px-4 py-2">
                      <option value="">None</option>
                      {departments.map(d => (
                        <option key={d._id || d.id} value={d._id || d.id}>{d.name}{d.code ? ` (${d.code})` : ''}</option>
                      ))}
                    </select>
                  </Field>

                  {departmentVisibility.length > 0 && (
                    <div>
                      <FieldLabel>Department visibility presets</FieldLabel>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Control what each department can see and do on this project.</p>
                      <div className="space-y-2.5">
                        {departmentVisibility.map(({ departmentId, departmentName, roleInProject }) => (
                          <div key={departmentId} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                              <BuildingOfficeIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                            </div>
                            <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{departmentName}</span>
                            <select value={roleInProject}
                              onChange={e => setDepartmentVisibility(prev => prev.map(x => x.departmentId === departmentId ? { ...x, roleInProject: e.target.value } : x))}
                              className="glass-input rounded-xl px-3 py-1.5 text-sm">
                              {DEPARTMENT_VISIBILITY_PRESETS.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <BuildingOfficeIcon className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p>No departments found for this organization.</p>
                </div>
              )}
            </>
          )}

          {/* ── Danger Zone ── */}
          {activeTab === 'danger' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10 p-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">Archive project</h4>
                    <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                      Archiving sets the project status to <strong>Archived</strong>. All data is preserved but the project is hidden from active views.
                      This can be reversed by changing the status back in General settings.
                    </p>
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-red-700 dark:text-red-400 mb-1.5">
                        Type <strong>{project?.name}</strong> to confirm
                      </label>
                      <input type="text" value={dangerConfirm} onChange={e => setDangerConfirm(e.target.value)}
                        placeholder={project?.name || 'Project name'}
                        className="w-full border border-red-300 dark:border-red-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-red-300 dark:placeholder-red-700 outline-none focus:ring-2 focus:ring-red-400" />
                    </div>
                    <button
                      type="button"
                      onClick={handleArchive}
                      disabled={dangerConfirm !== (project?.name || '') || isDangerLoading}
                      className="mt-3 px-4 py-1.5 text-sm font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      {isDangerLoading ? 'Archiving…' : 'Archive project'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {errors.submit && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {errors.submit}
            </div>
          )}
        </form>

        {/* Footer — pinned like task drawer; Save hidden on Danger tab */}
        {activeTab !== 'danger' && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-gray-50/80 px-5 py-4 dark:border-gray-700 dark:bg-gray-800/50 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
  );
};

export default ProjectSettingsModal;
