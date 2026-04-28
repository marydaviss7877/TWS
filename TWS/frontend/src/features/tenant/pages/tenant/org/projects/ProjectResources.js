import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  UsersIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  ClipboardDocumentListIcon,
  BriefcaseIcon,
  FlagIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import tenantProjectApiService from './services/tenantProjectApiService';
import ErrorBoundary from './components/ErrorBoundary';
import { handleApiError } from './utils/errorHandler';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import ErrorState from '../../../../../../shared/components/feedback/ErrorState';

/* ─── constants ────────────────────────────────────────────────────────────── */

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
  'from-pink-500 to-rose-500',
  'from-indigo-500 to-blue-500',
  'from-sky-500 to-cyan-400',
  'from-fuchsia-500 to-pink-500',
];

const PROJECT_ROLES = [
  { value: 'owner',       label: 'Owner',       color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' },
  { value: 'manager',     label: 'Manager',     color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  { value: 'contributor', label: 'Contributor', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  { value: 'client',      label: 'Client',      color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  { value: 'viewer',      label: 'Viewer',      color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
];

const STATUS_CFG = {
  available:       { dot: 'bg-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', label: 'Available' },
  fully_allocated: { dot: 'bg-amber-500',   badge: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',         label: 'Fully Alloc.' },
  over_allocated:  { dot: 'bg-red-500',     badge: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300',                 label: 'Over Alloc.' },
  on_leave:        { dot: 'bg-slate-400',   badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',           label: 'On Leave' },
};

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function avatarGradient(name = '') {
  return AVATAR_GRADIENTS[(name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length];
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function utilisationBar(pct = 0) {
  if (pct <= 0)   return 'bg-gray-300 dark:bg-gray-600';
  if (pct <= 50)  return 'bg-emerald-500';
  if (pct <= 80)  return 'bg-amber-500';
  if (pct <= 100) return 'bg-orange-500';
  return 'bg-red-500';
}

function roleCfg(role) {
  return PROJECT_ROLES.find(r => r.value === role) || PROJECT_ROLES[2];
}

/** Build task-count map from raw tasks array → { userId: { todo, in_progress, … } } */
function buildTaskMap(tasks = []) {
  const map = {};
  tasks.forEach(task => {
    const a = task.assignee || task.assignedTo;
    if (!a) return;
    const isObj = typeof a === 'object' && a !== null;
    const id = isObj ? (a._id?.toString() || a.id?.toString()) : String(a);
    if (!id) return;
    if (!map[id]) map[id] = { todo: 0, in_progress: 0, under_review: 0, completed: 0, total: 0 };
    const s = task.status || 'todo';
    const bucket =
      s === 'completed'                            ? 'completed'   :
      s === 'in_progress' || s === 'in-progress'   ? 'in_progress' :
      s === 'under_review' || s === 'under-review' ? 'under_review' :
      'todo';
    map[id][bucket]++;
    map[id].total++;
  });
  return map;
}

/** Merge org-resource extras (utilisation, skills, hours) into a member object */
function mergeResourceData(member, resources = []) {
  const uid = member.userId?._id?.toString() || member.userId?.toString() || member._id?.toString();
  const email = member.userId?.email || '';
  const res = resources.find(r =>
    (r.userId?._id?.toString() || r.userId?.toString()) === uid ||
    (r.userId?.email || '') === email
  );
  if (!res) return member;
  return {
    ...member,
    utilisation:    res.totalAllocation ?? res.utilization ?? null,
    availableHours: res.availableHours ?? null,
    hoursThisWeek:  res.hoursThisWeek ?? null,
    hoursThisMonth: res.hoursThisMonth ?? null,
    skills:         res.skills ?? member.skills ?? [],
    resourceStatus: res.status ?? null,
  };
}

/* ─── Add Member Modal ─────────────────────────────────────────────────────── */

function AddMemberModal({ isOpen, onClose, onSaved, tenantSlug, projectId }) {
  const [users, setUsers]           = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState({ userId: '', role: 'contributor', allocation: 100, hoursPerWeek: 40, hourlyRate: '' });
  const [errors, setErrors]         = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setForm({ userId: '', role: 'contributor', allocation: 100, hoursPerWeek: 40, hourlyRate: '' });
    setErrors({});
    setLoadingUsers(true);
    tenantProjectApiService.getUsers(tenantSlug, { limit: 200 })
      .then(d => setUsers(Array.isArray(d) ? d : d?.users || d?.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false));
  }, [isOpen, tenantSlug]);

  const set = (field, val) => {
    setForm(p => ({ ...p, [field]: val }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.userId) e.userId = 'Select a user';
    if (form.allocation < 1 || form.allocation > 100) e.allocation = '1 – 100';
    if (form.hoursPerWeek < 1 || form.hoursPerWeek > 80) e.hoursPerWeek = '1 – 80';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || saving) return;
    setSaving(true);
    try {
      await tenantProjectApiService.addProjectMember(tenantSlug, projectId, {
        userId: form.userId,
        role: form.role,
        allocation: Number(form.allocation),
        hoursPerWeek: Number(form.hoursPerWeek),
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
      });
      toast.success('Member added to project');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="glass-card-premium max-w-md w-full rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add member to project</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* User select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User *</label>
            <select
              value={form.userId}
              onChange={e => set('userId', e.target.value)}
              disabled={loadingUsers}
              className={`w-full glass-input rounded-lg px-3 py-2 text-sm ${errors.userId ? 'border-red-500' : ''}`}
            >
              <option value="">{loadingUsers ? 'Loading users…' : 'Select user…'}</option>
              {users.map(u => (
                <option key={u._id || u.id} value={u._id || u.id}>
                  {u.fullName || u.name || u.email}{u.email ? ` (${u.email})` : ''}
                </option>
              ))}
            </select>
            {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId}</p>}
          </div>

          {/* Project role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project role *</label>
            <select
              value={form.role}
              onChange={e => set('role', e.target.value)}
              className="w-full glass-input rounded-lg px-3 py-2 text-sm"
            >
              {PROJECT_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {/* Allocation + hours per week */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allocation % *</label>
              <input
                type="number" min="1" max="100"
                value={form.allocation}
                onChange={e => set('allocation', e.target.value)}
                className={`w-full glass-input rounded-lg px-3 py-2 text-sm ${errors.allocation ? 'border-red-500' : ''}`}
              />
              {errors.allocation && <p className="text-red-500 text-xs mt-1">{errors.allocation}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hrs / week *</label>
              <input
                type="number" min="1" max="80"
                value={form.hoursPerWeek}
                onChange={e => set('hoursPerWeek', e.target.value)}
                className={`w-full glass-input rounded-lg px-3 py-2 text-sm ${errors.hoursPerWeek ? 'border-red-500' : ''}`}
              />
              {errors.hoursPerWeek && <p className="text-red-500 text-xs mt-1">{errors.hoursPerWeek}</p>}
            </div>
          </div>

          {/* Hourly rate (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hourly rate <span className="text-gray-400">(optional)</span></label>
            <input
              type="number" min="0" step="0.01"
              value={form.hourlyRate}
              onChange={e => set('hourlyRate', e.target.value)}
              placeholder="e.g. 50"
              className="w-full glass-input rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Adding…' : 'Add member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Edit Member Modal ────────────────────────────────────────────────────── */

function EditMemberModal({ member, isOpen, onClose, onSaved, tenantSlug, projectId }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ role: 'contributor', allocation: 100, hoursPerWeek: 40, hourlyRate: '' });

  useEffect(() => {
    if (isOpen && member) {
      setForm({
        role:         member.role || 'contributor',
        allocation:   member.capacity?.allocation ?? 100,
        hoursPerWeek: member.capacity?.hoursPerWeek ?? 40,
        hourlyRate:   member.hourlyRate ?? '',
      });
    }
  }, [isOpen, member]);

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await tenantProjectApiService.updateProjectMember(tenantSlug, projectId, member._id, {
        role: form.role,
        allocation: Number(form.allocation),
        hoursPerWeek: Number(form.hoursPerWeek),
        hourlyRate: form.hourlyRate !== '' ? Number(form.hourlyRate) : undefined,
      });
      toast.success('Member updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to update member');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !member) return null;

  const displayName = member.userId?.fullName || member.userId?.name || member.userId?.email || 'Member';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="glass-card-premium max-w-sm w-full rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Edit member</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{displayName}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project role</label>
            <select
              value={form.role}
              onChange={e => set('role', e.target.value)}
              className="w-full glass-input rounded-lg px-3 py-2 text-sm"
            >
              {PROJECT_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allocation %</label>
              <input type="number" min="1" max="100" value={form.allocation}
                onChange={e => set('allocation', e.target.value)}
                className="w-full glass-input rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hrs / week</label>
              <input type="number" min="1" max="80" value={form.hoursPerWeek}
                onChange={e => set('hoursPerWeek', e.target.value)}
                className="w-full glass-input rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hourly rate <span className="text-gray-400">(optional)</span></label>
            <input type="number" min="0" step="0.01" value={form.hourlyRate}
              onChange={e => set('hourlyRate', e.target.value)}
              placeholder="e.g. 50"
              className="w-full glass-input rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Member Card ──────────────────────────────────────────────────────────── */

function MemberCard({ member, onEdit, onRemove }) {
  const { tasks = {}, utilisation, skills = [] } = member;
  const rCfg     = roleCfg(member.role);
  const statusCfg = STATUS_CFG[member.resourceStatus] || null;
  const allocation = member.capacity?.allocation;
  const hoursPerWeek = member.capacity?.hoursPerWeek;
  const displayName = member.userId?.fullName || member.userId?.name || member.userId?.email || 'Member';
  const email = member.userId?.email || '';

  return (
    <div className="glass-card-premium rounded-2xl p-5 flex flex-col gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">

      {/* Avatar + name + actions */}
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarGradient(displayName)} flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm`}>
          {initials(displayName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white text-sm truncate leading-tight">{displayName}</p>
          {email && (
            <a href={`mailto:${email}`}
              className="text-xs text-primary-500 hover:underline flex items-center gap-1 mt-0.5 truncate">
              <EnvelopeIcon className="w-3 h-3 shrink-0" />
              {email}
            </a>
          )}
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(member)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            title="Edit member"
          >
            <PencilSquareIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onRemove(member)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Remove from project"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Role + status + allocation row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${rCfg.color}`}>
          <ShieldCheckIcon className="w-3 h-3" />
          {rCfg.label}
        </span>
        {allocation != null && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {allocation}% allocated
          </span>
        )}
        {statusCfg && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
            {statusCfg.label}
          </span>
        )}
      </div>

      {/* Task breakdown */}
      {tasks.total > 0 ? (
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Tasks on this project</p>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'To Do',    count: tasks.todo,         color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
              { label: 'In Prog.', count: tasks.in_progress,  color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
              { label: 'Review',   count: tasks.under_review, color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
              { label: 'Done',     count: tasks.completed,    color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
            ].map(b => (
              <div key={b.label} className={`${b.color} rounded-xl px-2 py-2 text-center`}>
                <p className="text-base font-bold leading-none">{b.count}</p>
                <p className="text-[10px] leading-tight mt-0.5 opacity-80">{b.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-2.5 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.round((tasks.completed / tasks.total) * 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">No tasks assigned yet</p>
      )}

      {/* Capacity row */}
      {(hoursPerWeek != null || member.hourlyRate != null) && (
        <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 text-xs text-gray-500 dark:text-gray-400">
          {hoursPerWeek != null && (
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5" />
              {hoursPerWeek}h/week
            </span>
          )}
          {member.hourlyRate != null && (
            <span>${member.hourlyRate}/hr</span>
          )}
        </div>
      )}

      {/* Org utilisation bar */}
      {utilisation != null && (
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-400 dark:text-gray-500">Org utilisation</span>
            <span className={`font-bold ${utilisation > 100 ? 'text-red-500' : utilisation > 80 ? 'text-amber-500' : 'text-gray-900 dark:text-white'}`}>
              {utilisation}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${utilisationBar(utilisation)}`}
              style={{ width: `${Math.min(utilisation, 100)}%` }} />
          </div>
        </div>
      )}

      {/* Hours row */}
      {(member.hoursThisWeek != null || member.hoursThisMonth != null) && (
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 dark:border-gray-700/60">
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900 dark:text-white">{member.hoursThisWeek ?? 0}h</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">This week</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{member.hoursThisMonth ?? 0}h</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">This month</p>
          </div>
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {skills.slice(0, 4).map((s, i) => (
            <span key={i} className="px-2 py-0.5 rounded-md text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-300">
              {typeof s === 'string' ? s : s.name}
            </span>
          ))}
          {skills.length > 4 && (
            <span className="px-2 py-0.5 rounded-md text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800">
              +{skills.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────────────────────────── */

const ProjectResources = () => {
  const { tenantSlug, projectId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);
  const [members, setMembers]       = useState([]);
  const [project, setProject]       = useState(null);
  const [tasks, setTasks]           = useState([]);
  const [search, setSearch]         = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const [addModalOpen, setAddModalOpen]     = useState(false);
  const [editMember, setEditMember]         = useState(null);
  const [removingMember, setRemovingMember] = useState(null);
  const [removeLoading, setRemoveLoading]   = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!tenantSlug || !projectId) return;
    try {
      silent ? setRefreshing(true) : setLoading(true);
      setError(null);

      const [membersRes, dashRes, resourcesRes] = await Promise.allSettled([
        tenantProjectApiService.getProjectMembers(tenantSlug, projectId),
        tenantProjectApiService.getProjectDashboard(tenantSlug, projectId),
        tenantProjectApiService.getProjectResources(tenantSlug),
      ]);

      // Project members (source of truth for team)
      const rawMembers = membersRes.status === 'fulfilled'
        ? (membersRes.value?.data || membersRes.value || [])
        : [];

      // Dashboard: project info + tasks
      const dash = dashRes.status === 'fulfilled'
        ? (dashRes.value?.data ?? dashRes.value ?? {})
        : {};
      const rawTasks = dash?.tasks || [];
      setTasks(rawTasks);
      setProject(dash?.project || null);

      // Org resources (for utilisation / skills / hours enrichment)
      const resources = resourcesRes.status === 'fulfilled'
        ? (Array.isArray(resourcesRes.value) ? resourcesRes.value : resourcesRes.value?.resources || resourcesRes.value?.data || [])
        : [];

      // Build task-count map keyed by userId
      const taskMap = buildTaskMap(rawTasks);

      // Enrich each ProjectMember with tasks + resource data
      const enriched = rawMembers.map(m => {
        const uid = m.userId?._id?.toString() || m.userId?.toString() || '';
        const taskCounts = taskMap[uid] || { todo: 0, in_progress: 0, under_review: 0, completed: 0, total: 0 };
        return mergeResourceData({ ...m, tasks: taskCounts }, resources);
      });

      // Also surface task assignees who are NOT yet formal ProjectMembers (read-only entries)
      const memberUserIds = new Set(rawMembers.map(m => m.userId?._id?.toString() || m.userId?.toString()));
      Object.entries(taskMap).forEach(([uid, taskCounts]) => {
        if (memberUserIds.has(uid)) return;
        const sampleTask = rawTasks.find(t => {
          const a = t.assignee || t.assignedTo;
          const id = typeof a === 'object' ? (a?._id?.toString() || a?.id?.toString()) : String(a);
          return id === uid;
        });
        const a = sampleTask?.assignee || sampleTask?.assignedTo;
        const isObj = typeof a === 'object' && a !== null;
        enriched.push({
          _id: uid,
          userId: isObj ? a : { _id: uid, email: '' },
          role: 'contributor',
          capacity: { allocation: null, hoursPerWeek: null },
          tasks: taskCounts,
          _inferredOnly: true,   // flag: not a real ProjectMember record
        });
      });

      setMembers(enriched);
    } catch (err) {
      console.error('Team load error:', err);
      setError(err.message || 'Failed to load team data');
      handleApiError(err, 'Failed to load team');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantSlug, projectId]);

  useEffect(() => { load(); }, [load]);

  /* ── remove handler ── */
  const handleRemoveConfirm = async () => {
    if (!removingMember || removeLoading || removingMember._inferredOnly) return;
    setRemoveLoading(true);
    try {
      await tenantProjectApiService.removeProjectMember(tenantSlug, projectId, removingMember._id);
      toast.success('Member removed from project');
      setRemovingMember(null);
      load(true);
    } catch (err) {
      toast.error(err?.message || 'Failed to remove member');
    } finally {
      setRemoveLoading(false);
    }
  };

  /* ── derived ── */
  const filtered = members.filter(m => {
    const name  = m.userId?.fullName || m.userId?.name || m.userId?.email || '';
    const email = m.userId?.email || '';
    const term  = search.toLowerCase();
    const matchSearch = name.toLowerCase().includes(term) || email.toLowerCase().includes(term);
    const matchRole   = filterRole === 'all' || m.role === filterRole;
    return matchSearch && matchRole;
  });

  const totalTasks  = tasks.length;
  const doneTasks   = tasks.filter(t => t.status === 'completed').length;
  const activeTasks = tasks.filter(t => ['in_progress', 'in-progress'].includes(t.status)).length;

  /* ── loading / error ── */
  if (loading) {
    return <LoadingSpinner message="Loading team..." className="min-h-[40vh] bg-transparent" />;
  }

  if (error) {
    return <ErrorState title="Project team unavailable" message={error} onRetry={() => load()} className="max-w-xl mx-auto" />;
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6 animate-fade-in pb-8">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">Team</h1>
            {project?.name && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                <FlagIcon className="w-3.5 h-3.5 shrink-0" />
                {project.name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => load(true)} disabled={refreshing} className="glass-button p-2 rounded-xl" title="Refresh">
              <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate(`/${tenantSlug}/org/projects/${projectId}/board`)}
              className="glass-button px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5"
            >
              <ClipboardDocumentListIcon className="w-4 h-4" />
              Board
            </button>
            <button
              onClick={() => setAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90"
            >
              <PlusIcon className="w-4 h-4" />
              Add Member
            </button>
          </div>
        </div>

        {/* ── KPI row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: UsersIcon,                label: 'Team Members', value: members.length,  color: 'bg-violet-500' },
            { icon: ClipboardDocumentListIcon, label: 'Total Tasks',  value: totalTasks,      color: 'bg-blue-500' },
            { icon: CheckCircleSolid,          label: 'Completed',   value: doneTasks,        color: 'bg-emerald-500' },
            { icon: ClockIcon,                 label: 'In Progress', value: activeTasks,      color: 'bg-amber-500' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="glass-card-premium rounded-2xl p-5 flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${color} shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold font-heading text-gray-900 dark:text-white leading-tight">{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search members…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm glass-input rounded-lg"
            />
          </div>
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="glass-input px-2 py-1.5 text-sm rounded-lg"
          >
            <option value="all">All Roles</option>
            {PROJECT_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          {filtered.length !== members.length && (
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
              {filtered.length} of {members.length}
            </span>
          )}
        </div>

        {/* ── Member grid ─────────────────────────────────────────────── */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(m => (
              <MemberCard
                key={m._id}
                member={m}
                onEdit={setEditMember}
                onRemove={setRemovingMember}
              />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <UsersIcon className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">No team members yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add members to this project to get started.</p>
            </div>
            <button
              onClick={() => setAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-semibold hover:opacity-90 flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Add First Member
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <ExclamationTriangleIcon className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No members match your filters.</p>
            <button onClick={() => { setSearch(''); setFilterRole('all'); }} className="text-sm text-primary-500 hover:underline">
              Clear filters
            </button>
          </div>
        )}

        {/* ── Role breakdown (when multiple roles) ────────────────────── */}
        {members.length > 0 && (
          <div className="glass-card-premium rounded-2xl p-6">
            <h2 className="font-semibold font-heading text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <BriefcaseIcon className="w-5 h-5 text-primary-500" />
              Role breakdown
            </h2>
            <div className="flex flex-wrap gap-2">
              {PROJECT_ROLES.map(r => {
                const count = members.filter(m => m.role === r.value).length;
                if (count === 0) return null;
                return (
                  <div key={r.value} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm ${r.color}`}>
                    <span className="font-medium">{r.label}</span>
                    <span className="font-bold bg-white/30 dark:bg-black/20 rounded-full px-1.5 py-0.5 text-xs">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Modals ──────────────────────────────────────────────────── */}
        <AddMemberModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onSaved={() => load(true)}
          tenantSlug={tenantSlug}
          projectId={projectId}
        />

        <EditMemberModal
          member={editMember}
          isOpen={!!editMember}
          onClose={() => setEditMember(null)}
          onSaved={() => load(true)}
          tenantSlug={tenantSlug}
          projectId={projectId}
        />

        {/* Remove confirm dialog */}
        {removingMember && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={() => setRemovingMember(null)}>
            <div className="glass-card-premium max-w-sm w-full rounded-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Remove member?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                {removingMember._inferredOnly
                  ? 'This member was inferred from task assignments. Unassign their tasks on the board to remove them.'
                  : `Remove ${removingMember.userId?.fullName || removingMember.userId?.name || 'this member'} from the project? Their tasks will remain.`}
              </p>
              {!removingMember._inferredOnly && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setRemovingMember(null)}
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRemoveConfirm}
                    disabled={removeLoading}
                    className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50"
                  >
                    {removeLoading ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              )}
              {removingMember._inferredOnly && (
                <button
                  onClick={() => setRemovingMember(null)}
                  className="w-full px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium"
                >
                  Got it
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default ProjectResources;
