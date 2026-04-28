import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  ClipboardDocumentCheckIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  Squares2X2Icon,
  CalendarIcon,
  EllipsisVerticalIcon,
  PlayIcon,
  StopIcon,
  UserPlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PencilSquareIcon,
  XMarkIcon,
  ArrowPathIcon,
  Bars2Icon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';
import tenantProjectApiService from './services/tenantProjectApiService';
import { CARD_TYPE, CARD_STATUS, PROJECT_PRIORITY } from './constants/projectConstants';
import CreateTaskModal from './components/CreateTaskModal';
import QuickAddTask from './components/QuickAddTask';
import { showSuccess, showError } from './utils/toastNotifications';
import { PROJECT_WORKSPACE_EVENTS } from '../../../../components/ProjectWorkspaceLayout';
import { toMongoIdString } from './utils/validation';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import EmptyState from '../../../../../../shared/components/feedback/EmptyState';

/* ─── helpers ──────────────────────────────────────────────────────────────── */

const PRIORITY_BORDER = {
  urgent:   'border-l-red-500',
  critical: 'border-l-red-500',
  high:     'border-l-orange-500',
  medium:   'border-l-yellow-400',
  low:      'border-l-green-500',
};

const PRIORITY_DOT = {
  urgent:   'bg-red-500',
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-400',
  low:      'bg-green-500',
};

const STATUS_LABEL = {
  todo:         'To Do',
  in_progress:  'Started',
  under_review: 'In Review',
  completed:    'Done',
};

const STATUS_COLOR = {
  todo:         'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
  in_progress:  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  under_review: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  completed:    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
};

const TYPE_ICON = {
  user_story:'👤', epic:'🎯', bug:'🐛', feature:'✨',
  technical_task:'⚙️', code_review:'👀', story:'📖',
  task:'📋', improvement:'🔧', custom:'📌',
};

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

const PRIORITY_RANK = { low: 0, medium: 1, high: 2, urgent: 3, critical: 3 };

function taskDueTime(t) {
  if (!t?.dueDate) return null;
  return new Date(t.dueDate).getTime();
}

function taskCreatedTime(t) {
  const d = t?.createdAt || t?.updatedAt;
  return d ? new Date(d).getTime() : 0;
}

function compareBoardTasks(a, b, sortKey, sortDir) {
  if (sortKey === 'manual') return 0;
  const mul = sortDir === 'asc' ? 1 : -1;
  switch (sortKey) {
    case 'title': {
      const sa = (a.title || a.name || '').toLowerCase();
      const sb = (b.title || b.name || '').toLowerCase();
      return mul * sa.localeCompare(sb, undefined, { sensitivity: 'base' });
    }
    case 'dueDate': {
      const ta = taskDueTime(a);
      const tb = taskDueTime(b);
      if (ta == null && tb == null) return 0;
      if (ta == null) return 1;
      if (tb == null) return -1;
      return mul * (ta - tb);
    }
    case 'priority': {
      const pa = PRIORITY_RANK[String(a.priority || 'medium').toLowerCase()] ?? 1;
      const pb = PRIORITY_RANK[String(b.priority || 'medium').toLowerCase()] ?? 1;
      return mul * (pa - pb);
    }
    case 'storyPoints': {
      const sa = a.storyPoints != null && a.storyPoints !== '' ? Number(a.storyPoints) : null;
      const sb = b.storyPoints != null && b.storyPoints !== '' ? Number(b.storyPoints) : null;
      if (sa == null && sb == null) return 0;
      if (sa == null) return 1;
      if (sb == null) return -1;
      return mul * (sa - sb);
    }
    case 'created': {
      return mul * (taskCreatedTime(a) - taskCreatedTime(b));
    }
    default:
      return 0;
  }
}

function sortTaskListForBoard(list, sortKey, sortDir) {
  if (sortKey === 'manual' || !list?.length) return list;
  return [...list].sort((x, y) => compareBoardTasks(x, y, sortKey, sortDir));
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function Avatar({ user, size = 'sm' }) {
  const name = user?.fullName || user?.name || user?.email || '';
  const sz = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs';
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold shrink-0`} title={name}>
      {initials(name)}
    </div>
  );
}

/* ─── Task Detail Drawer ───────────────────────────────────────────────────── */

function TaskDrawer({ task, onClose, onSaved, onDelete, tenantSlug, orgUsers }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [titleEdit, setTitleEdit] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    if (!task) return;
    setForm({
      title:          task.title || task.name || '',
      description:    task.description || '',
      status:         task.status || 'todo',
      priority:       task.priority || 'medium',
      type:           task.type || 'task',
      assigneeId:     task.assignee?._id || task.assignee?.id || task.assigneeId || '',
      startDate:      task.startDate ? new Date(task.startDate).toISOString().slice(0, 10) : '',
      dueDate:        task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
      storyPoints:    task.storyPoints != null ? String(task.storyPoints) : '',
      estimatedHours: task.estimatedHours != null ? String(task.estimatedHours) : '',
      labels:         Array.isArray(task.labels) ? task.labels.join(', ') : (task.labels || ''),
    });
    setTitleEdit(false);
  }, [task]);

  useEffect(() => {
    if (titleEdit && titleRef.current) titleRef.current.focus();
  }, [titleEdit]);

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const handleSave = async () => {
    if (!form || saving) return;
    setSaving(true);
    try {
      const taskId = task._id || task.id;
      await tenantProjectApiService.updateTask(tenantSlug, taskId, {
        title:          form.title.trim(),
        description:    form.description.trim() || undefined,
        status:         form.status,
        priority:       form.priority,
        type:           form.type,
        assigneeId:     form.assigneeId || undefined,
        startDate:      form.startDate || undefined,
        dueDate:        form.dueDate || undefined,
        storyPoints:    form.storyPoints ? parseInt(form.storyPoints, 10) : undefined,
        estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : undefined,
        labels:         form.labels ? form.labels.split(',').map(l => l.trim()).filter(Boolean) : [],
      });
      showSuccess('Task saved');
      onSaved();
    } catch (err) {
      showError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!task || !form) return null;

  const priorities = ['low', 'medium', 'high', 'urgent'];
  const statuses   = ['todo', 'in_progress', 'under_review', 'completed'];
  const types      = Object.entries(TYPE_ICON).map(([v, icon]) => ({ value: v, icon, label: v.replace(/_/g, ' ') }));

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col animate-slide-in-right overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <span className="text-lg">{TYPE_ICON[form.type] || '📋'}</span>
          {titleEdit ? (
            <input
              ref={titleRef}
              value={form.title}
              onChange={e => set('title', e.target.value)}
              onBlur={() => setTitleEdit(false)}
              onKeyDown={e => e.key === 'Enter' && setTitleEdit(false)}
              className="flex-1 text-base font-bold bg-transparent border-b-2 border-primary-500 outline-none text-gray-900 dark:text-white"
            />
          ) : (
            <h2
              className="flex-1 text-base font-bold text-gray-900 dark:text-white cursor-text hover:text-primary-600 dark:hover:text-primary-400 truncate"
              onClick={() => setTitleEdit(true)}
              title="Click to edit title"
            >
              {form.title || 'Untitled task'}
            </h2>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Status chips */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Status</p>
            <div className="flex gap-2 flex-wrap">
              {statuses.map(s => (
                <button key={s} onClick={() => set('status', s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${form.status === s ? STATUS_COLOR[s] + ' ring-2 ring-offset-1 ring-primary-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Priority</p>
            <div className="flex gap-2">
              {priorities.map(p => (
                <button key={p} onClick={() => set('priority', p)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${form.priority === p ? 'text-white shadow-sm ' + (p === 'urgent' ? 'bg-red-500' : p === 'high' ? 'bg-orange-500' : p === 'medium' ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[p]}`} />
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Type</p>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              className="glass-input rounded-lg px-3 py-2 text-sm w-full">
              {types.map(t => (
                <option key={t.value} value={t.value}>{t.icon} {t.label.replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Assignee</p>
            <select value={form.assigneeId} onChange={e => set('assigneeId', e.target.value)}
              className="glass-input rounded-lg px-3 py-2 text-sm w-full">
              <option value="">Unassigned</option>
              {orgUsers.map(u => (
                <option key={u._id || u.id} value={u._id || u.id}>
                  {u.fullName || u.name || u.email}
                </option>
              ))}
            </select>
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Start date</p>
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)}
                max={form.dueDate || undefined}
                className="glass-input rounded-lg px-3 py-2 text-sm w-full" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Due date</p>
              <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)}
                min={form.startDate || undefined}
                className="glass-input rounded-lg px-3 py-2 text-sm w-full" />
            </div>
          </div>

          {/* Hours + story points row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Est. hours</p>
              <input type="number" min="0" step="0.5" value={form.estimatedHours} onChange={e => set('estimatedHours', e.target.value)}
                placeholder="e.g. 4" className="glass-input rounded-lg px-3 py-2 text-sm w-full" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Story pts</p>
              <input type="number" min="0" value={form.storyPoints} onChange={e => set('storyPoints', e.target.value)}
                placeholder="e.g. 3" className="glass-input rounded-lg px-3 py-2 text-sm w-full" />
            </div>
          </div>

          {/* Labels */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Labels</p>
              <input type="text" value={form.labels} onChange={e => set('labels', e.target.value)}
                placeholder="tag1, tag2" className="glass-input rounded-lg px-3 py-2 text-sm w-full" />
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Description</p>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={4} placeholder="Add a description…"
              className="glass-input rounded-lg px-3 py-2 text-sm w-full resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3 shrink-0">
          <button onClick={() => onDelete(task)}
            className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete task">
            <TrashIcon className="w-4 h-4" />
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Card Context Menu ────────────────────────────────────────────────────── */

function CardMenu({ task, anchorRef, onEdit, onDuplicate, onDelete, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, anchorRef]);

  return (
    <div ref={menuRef}
      className="absolute right-0 top-8 z-30 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 animate-fade-in">
      <button onClick={onEdit}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
        <PencilSquareIcon className="w-4 h-4 text-gray-400" /> Edit details
      </button>
      <button onClick={onDuplicate}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
        <DocumentDuplicateIcon className="w-4 h-4 text-gray-400" /> Duplicate
      </button>
      <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
      <button onClick={onDelete}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
        <TrashIcon className="w-4 h-4" /> Delete
      </button>
    </div>
  );
}

/* ─── Delete Confirm ───────────────────────────────────────────────────────── */

function DeleteConfirm({ task, onConfirm, onCancel, loading }) {
  if (!task) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4" onClick={onCancel}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
          <TrashIcon className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Delete task?</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 line-clamp-2">
          "{task.title || task.name}" will be permanently deleted.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50">
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Task Card ────────────────────────────────────────────────────────────── */

function TaskCard({
  task, columnId, orgUsers, scopeProjectId,
  timerTaskId, timerStartedAt,
  onOpenDrawer, onEditModal, onDuplicate, onDelete,
  onDragStart, onAssigneeChange, onTimerStart, onTimerStop,
}) {
  const taskId = task._id || task.id;
  const isTimerRunning = timerTaskId === taskId;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef(null);

  const overdue = !task.completedAt && isOverdue(task.dueDate);
  const borderClass = PRIORITY_BORDER[task.priority] || PRIORITY_BORDER.medium;
  const assignee = task.assignee || (orgUsers.find(u => (u._id || u.id) === task.assigneeId));
  const labels = Array.isArray(task.labels) ? task.labels : [];

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 ${borderClass} shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-150 group relative`}
    >
      {/* Top row: drag handle + type + story pts + ⋮ menu */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        {/* Drag handle */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, task, columnId)}
          className="cursor-grab active:cursor-grabbing p-0.5 -ml-0.5 rounded text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
          title="Drag to move"
          onClick={e => e.stopPropagation()}
        >
          <Bars2Icon className="w-3.5 h-3.5" />
        </div>

        {/* Type badge */}
        <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <span>{TYPE_ICON[task.type || 'task']}</span>
        </span>

        {/* Story points */}
        {task.storyPoints != null && (
          <span className="ml-auto text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
            {task.storyPoints}sp
          </span>
        )}

        {/* 3-dot menu */}
        <div className={`relative shrink-0 ${task.storyPoints == null ? 'ml-auto' : ''}`}>
          <button
            ref={menuBtnRef}
            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Options"
          >
            <EllipsisVerticalIcon className="w-4 h-4" />
          </button>
          {menuOpen && (
            <CardMenu
              task={task}
              anchorRef={menuBtnRef}
              onEdit={() => { setMenuOpen(false); onOpenDrawer(task); }}
              onDuplicate={() => { setMenuOpen(false); onDuplicate(task); }}
              onDelete={() => { setMenuOpen(false); onDelete(task); }}
              onClose={() => setMenuOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Clickable body → opens drawer */}
      <div className="px-3 pb-3 cursor-pointer" onClick={() => onOpenDrawer(task)}>
        {/* Title */}
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug mb-1.5">
          {task.title || task.name}
        </h4>

        {/* Description (2 lines) */}
        {task.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{task.description}</p>
        )}

        {/* Labels */}
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {labels.slice(0, 3).map((lbl, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 font-medium">
                {typeof lbl === 'string' ? lbl : lbl.name}
              </span>
            ))}
            {labels.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-400">+{labels.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer: assignee + timer + due date */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
          {/* Left: assignee */}
          <div className="flex items-center gap-1.5 min-w-0">
            {scopeProjectId && orgUsers.length > 0 ? (
              <div onClick={e => e.stopPropagation()}>
                <select
                  value={String(task.assignee?._id || task.assignee?.id || task.assigneeId || '')}
                  onChange={(e) => onAssigneeChange(task, e.target.value || null)}
                  className="text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-white py-0.5 pl-1.5 pr-5 max-w-[110px]"
                >
                  <option value="">Unassigned</option>
                  {orgUsers.map((u) => (
                    <option key={u._id || u.id} value={u._id || u.id}>
                      {(u.fullName || u.name || u.email || '').slice(0, 16)}
                    </option>
                  ))}
                </select>
              </div>
            ) : assignee ? (
              <Avatar user={assignee} />
            ) : (
              scopeProjectId && (
                <button onClick={(e) => { e.stopPropagation(); onOpenDrawer(task); }}
                  className="flex items-center gap-1 text-xs text-primary-500 hover:underline">
                  <UserPlusIcon className="w-3.5 h-3.5" /> Assign
                </button>
              )
            )}

            {/* Timer */}
            <div onClick={e => e.stopPropagation()}>
              {isTimerRunning ? (
                <button onClick={() => onTimerStop(task)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-medium">
                  <StopIcon className="w-3 h-3" />
                  {timerStartedAt ? `${Math.floor((Date.now() - timerStartedAt) / 60000)}m` : 'Stop'}
                </button>
              ) : (
                <button onClick={() => onTimerStart(task)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <PlayIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Right: due date */}
          {task.dueDate && (
            <div className={`flex items-center gap-1 text-[10px] font-medium shrink-0 ${overdue ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
              <CalendarIcon className="w-3 h-3" />
              {fmtDate(task.dueDate)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────────────────── */

const ProjectTasks = ({ scopeProjectId = null, defaultView = 'kanban', hideScopedHeader = false }) => {
  const { tenantSlug } = useParams();
  const location = useLocation();

  const [viewMode, setViewMode]             = useState(defaultView);
  const [searchTerm, setSearchTerm]         = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [filterProject, setFilterProject]   = useState(scopeProjectId || 'all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [departments, setDepartments]       = useState([]);
  const [loading, setLoading]               = useState(true);
  const [tasks, setTasks]                   = useState({ todo: [], in_progress: [], under_review: [], completed: [] });
  const [projects, setProjects]             = useState([]);
  const [orgUsers, setOrgUsers]             = useState([]);

  // Drag state
  const [draggedTask, setDraggedTask]       = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Modals / panels
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedColumnForTask, setSelectedColumnForTask] = useState(null);
  const [editingTask, setEditingTask]       = useState(null);
  const [taskDrawer, setTaskDrawer]         = useState(null);
  const [confirmDelete, setConfirmDelete]   = useState(null);
  const [deleteLoading, setDeleteLoading]   = useState(false);

  // Timer
  const [timerTaskId, setTimerTaskId]       = useState(null);
  const [timerStartedAt, setTimerStartedAt] = useState(null);
  const [, setTimerTick]                    = useState(0);
  const searchInputRef = useRef(null);
  const sortPanelRef = useRef(null);

  const [boardSortKey, setBoardSortKey] = useState('manual');
  const [boardSortDir, setBoardSortDir] = useState('asc');
  const [sortPanelOpen, setSortPanelOpen] = useState(false);

  /* ── timer tick ── */
  useEffect(() => {
    if (!timerTaskId || !timerStartedAt) return;
    const interval = setInterval(() => setTimerTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [timerTaskId, timerStartedAt]);

  /* ── keyboard shortcuts: N → new task, / → search (when not typing in a field) ── */
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !inField) {
        setIsCreateModalOpen(true);
        return;
      }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !inField) {
        e.preventDefault();
        setSearchExpanded(true);
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* ── event bus hooks ── */
  useEffect(() => {
    window.addEventListener('openCreateTaskModal', () => setIsCreateModalOpen(true));
    return () => window.removeEventListener('openCreateTaskModal', () => setIsCreateModalOpen(true));
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('create') === 'task') {
      setIsCreateModalOpen(true);
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.search, location.pathname]);

  useEffect(() => {
    const onFocusSearch = () => {
      setSearchExpanded(true);
      requestAnimationFrame(() => searchInputRef.current?.focus());
    };
    const onToggleFilter = () => setSortPanelOpen((v) => !v);
    const onToggleSort = () => setSortPanelOpen((v) => !v);
    window.addEventListener(PROJECT_WORKSPACE_EVENTS.FOCUS_SEARCH, onFocusSearch);
    window.addEventListener(PROJECT_WORKSPACE_EVENTS.TOGGLE_FILTER, onToggleFilter);
    window.addEventListener(PROJECT_WORKSPACE_EVENTS.TOGGLE_SORT, onToggleSort);
    return () => {
      window.removeEventListener(PROJECT_WORKSPACE_EVENTS.FOCUS_SEARCH, onFocusSearch);
      window.removeEventListener(PROJECT_WORKSPACE_EVENTS.TOGGLE_FILTER, onToggleFilter);
      window.removeEventListener(PROJECT_WORKSPACE_EVENTS.TOGGLE_SORT, onToggleSort);
    };
  }, []);

  useEffect(() => {
    if (!sortPanelOpen) return;
    sortPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [sortPanelOpen]);

  /* ── data fetching ── */
  useEffect(() => {
    if (scopeProjectId) setFilterProject(scopeProjectId);
  }, [scopeProjectId]);

  useEffect(() => {
    if (!tenantSlug || !scopeProjectId) return;
    let cancelled = false;
    tenantProjectApiService.getUsers(tenantSlug, { limit: 100 })
      .then(data => {
        if (cancelled) return;
        const raw = Array.isArray(data) ? data : (data?.users || data?.data || []);
        const list = Array.isArray(raw) ? raw : [];
        if (list.length > 0) { setOrgUsers(list); return; }
        return tenantProjectApiService.getProjectResources(tenantSlug).then(res => {
          if (cancelled) return;
          const resources = res?.resources ?? res?.data?.resources ?? (Array.isArray(res) ? res : []);
          const seen = new Set();
          setOrgUsers((resources || []).map(r => r.userId).filter(Boolean).filter(u => {
            const id = u._id || u.id; if (seen.has(id)) return false; seen.add(id); return true;
          }).map(u => ({ ...u, name: u.name || u.fullName })));
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tenantSlug, scopeProjectId]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`/api/tenant/${tenantSlug}/departments`, { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
      if (res.ok) { const r = await res.json(); setDepartments(r.data || []); }
    } catch {}
  };

  const fetchTasks = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const params = { groupBy: 'status' };
      if (scopeProjectId || filterProject !== 'all') params.projectId = scopeProjectId || filterProject;
      if (filterDepartment !== 'all') params.departmentId = filterDepartment;
      const data = await tenantProjectApiService.getProjectTasks(tenantSlug, params);

      if (data?.tasks) {
        setTasks({
          todo:         data.tasks[CARD_STATUS.TODO]         || data.tasks.todo         || [],
          in_progress:  data.tasks[CARD_STATUS.IN_PROGRESS]  || data.tasks.in_progress  || [],
          under_review: data.tasks[CARD_STATUS.UNDER_REVIEW] || data.tasks.under_review || [],
          completed:    data.tasks[CARD_STATUS.COMPLETED]    || data.tasks.completed    || [],
        });
      } else if (data?.grouped) {
        const g = data.grouped;
        setTasks({ todo: g.todo||g['to-do']||[], in_progress: g.in_progress||g['in-progress']||[], under_review: g.under_review||g['under-review']||[], completed: g.completed||[] });
      } else if (Array.isArray(data)) {
        const grouped = data.reduce((acc, t) => { const s = t.status || 'todo'; if (!acc[s]) acc[s] = []; acc[s].push(t); return acc; }, {});
        setTasks({ todo: grouped.todo||[], in_progress: grouped.in_progress||[], under_review: grouped.under_review||[], completed: grouped.completed||[] });
      }
    } catch (err) {
      console.error(err);
      setTasks({ todo: [], in_progress: [], under_review: [], completed: [] });
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [tenantSlug, scopeProjectId, filterProject, filterDepartment]);

  const fetchProjects = async () => {
    try {
      const data = await tenantProjectApiService.getProjects(tenantSlug);
      setProjects(Array.isArray(data) ? data : (data.projects || []));
    } catch {}
  };

  useEffect(() => {
    if (tenantSlug) {
      fetchProjects();
      fetchDepartments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tenantSlug) fetchTasks();
  }, [tenantSlug, filterProject, filterDepartment, fetchTasks]);

  /* ── drag & drop ── */
  const handleDragStart = (e, task, columnId) => {
    setDraggedTask({ task, sourceColumn: columnId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => setDragOverColumn(null);

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedTask || draggedTask.sourceColumn === targetColumnId) { setDraggedTask(null); return; }
    const { task, sourceColumn } = draggedTask;
    setTasks(prev => ({
      ...prev,
      [sourceColumn]: prev[sourceColumn].filter(t => (t._id || t.id) !== (task._id || task.id)),
      [targetColumnId]: [...prev[targetColumnId], { ...task, status: targetColumnId }],
    }));
    setDraggedTask(null);
    try {
      await tenantProjectApiService.updateTask(tenantSlug, task._id || task.id, { status: targetColumnId });
    } catch {
      fetchTasks({ silent: true });
    }
  };

  /* ── task actions ── */
  const handleQuickAddTask = async (taskData) => {
    const rawProject = scopeProjectId || (filterProject !== 'all' ? filterProject : null);
    const projectId = toMongoIdString(rawProject);
    if (!projectId) {
      showError('Select a project first.');
      throw new Error('no project');
    }
    let departmentId;
    const cached = projects.find((p) => String(p._id || p.id) === String(projectId));
    if (cached) {
      const fd = cached?.departments?.[0];
      const rawDept =
        cached.primaryDepartmentId ||
        (fd && (typeof fd === 'object' ? (fd._id || fd.id) : fd));
      departmentId = toMongoIdString(rawDept);
    }
    if (!departmentId && filterDepartment !== 'all') {
      departmentId = toMongoIdString(filterDepartment);
    }
    if (!departmentId && departments.length > 0) {
      departmentId = toMongoIdString(departments[0]._id || departments[0].id);
    }
    const priority = taskData.priority === 'urgent' ? 'critical' : (taskData.priority || PROJECT_PRIORITY.MEDIUM);
    const payload = {
      ...taskData,
      projectId,
      priority,
      type: CARD_TYPE.TASK,
    };
    if (departmentId) payload.departmentId = departmentId;
    await tenantProjectApiService.createTask(tenantSlug, payload);
    showSuccess('Task created');
    fetchTasks({ silent: true });
  };

  const handleAssigneeChange = async (task, assigneeId) => {
    const id = task._id || task.id;
    if (!id) return;
    const prevTasks = tasks;
    setTasks((prev) => {
      const updated = {};
      for (const [col, list] of Object.entries(prev)) {
        updated[col] = list.map((t) => {
          const taskId = t._id || t.id;
          if (taskId !== id) return t;
          return {
            ...t,
            assigneeId: assigneeId || null,
            assignee: assigneeId
              ? (orgUsers.find((u) => String(u._id || u.id) === String(assigneeId)) || t.assignee)
              : null,
          };
        });
      }
      return updated;
    });
    try {
      await tenantProjectApiService.updateTask(tenantSlug, id, { assigneeId: assigneeId || undefined });
      showSuccess('Assignee updated');
      fetchTasks({ silent: true });
    } catch (err) {
      setTasks(prevTasks);
      showError(err?.message || 'Failed to update');
    }
  };

  const handleDuplicateTask = async (task) => {
    try {
      const { _id, id, taskId, createdAt, updatedAt, ...rest } = task;
      await tenantProjectApiService.createTask(tenantSlug, {
        ...rest,
        title: `${task.title || task.name} (copy)`,
        status: task.status || 'todo',
        projectId: task.projectId?._id || task.projectId?.id || task.projectId || scopeProjectId,
        departmentId: task.departmentId?._id || task.departmentId?.id || task.departmentId,
        assigneeId: task.assignee?._id || task.assigneeId || undefined,
      });
      showSuccess('Task duplicated');
      fetchTasks({ silent: true });
    } catch (err) { showError(err?.message || 'Failed to duplicate'); }
  };

  const handleDeleteTask = async () => {
    if (!confirmDelete || deleteLoading) return;
    setDeleteLoading(true);
    try {
      await tenantProjectApiService.deleteTask(tenantSlug, confirmDelete._id || confirmDelete.id);
      showSuccess('Task deleted');
      setConfirmDelete(null);
      if (taskDrawer && (taskDrawer._id || taskDrawer.id) === (confirmDelete._id || confirmDelete.id)) {
        setTaskDrawer(null);
      }
      fetchTasks({ silent: true });
    } catch (err) { showError(err?.message || 'Failed to delete'); }
    finally { setDeleteLoading(false); }
  };

  const handleTimerStart = (task) => { setTimerTaskId(task._id || task.id); setTimerStartedAt(Date.now()); };
  const handleTimerStop  = async (task) => {
    if (!timerStartedAt) return;
    const elapsedHours = (Date.now() - timerStartedAt) / 3600000;
    setTimerTaskId(null); setTimerStartedAt(null);
    const projectId = task.projectId?._id || task.projectId?.id || task.projectId || scopeProjectId;
    try {
      const tenantData = JSON.parse(localStorage.getItem('tenantData') || '{}');
      const memberId = tenantData?.user?._id || tenantData?.user?.id;
      if (!memberId) { showError('Could not determine user'); return; }
      await tenantProjectApiService.submitTimesheet(tenantSlug, {
        date: new Date().toISOString().slice(0, 10),
        projectId: projectId || undefined,
        taskId: task._id || task.id,
        memberId,
        hours: Math.round(elapsedHours * 100) / 100,
        description: `Time on: ${(task.title || '').slice(0, 50)}`,
        billable: true,
      });
      showSuccess(`Logged ${elapsedHours.toFixed(2)}h`);
      fetchTasks({ silent: true });
    } catch (err) { showError(err?.message || 'Failed to log time'); }
  };

  /* ── filter ── */
  const applyBoardSort = (colTasks) => sortTaskListForBoard(colTasks, boardSortKey, boardSortDir);

  const filteredByColumn = (colTasks, colId) => colTasks.filter(task => {
    const term = searchTerm.toLowerCase();
    const matchSearch   = (task.title || task.name || '').toLowerCase().includes(term) ||
                          (task.description || '').toLowerCase().includes(term);
    const matchProject  = filterProject === 'all' ||
                          (task.projectId?._id || task.projectId?.id || task.projectId) === filterProject;
    const matchPriority = filterPriority === 'all' || (task.priority || 'medium') === filterPriority;
    const matchDept     = filterDepartment === 'all' ||
                          (task.departmentId?._id || task.departmentId?.id || task.departmentId) === filterDepartment;
    return matchSearch && matchProject && matchPriority && matchDept;
  });

  const totalTasks = Object.values(tasks).reduce((a, c) => a + c.length, 0);
  const columns = [
    { id: 'todo',         title: 'To Do',      color: 'from-slate-500 to-gray-600',    dot: 'bg-gray-400' },
    { id: 'in_progress',  title: 'Started',    color: 'from-blue-500 to-indigo-600',   dot: 'bg-blue-500' },
    { id: 'under_review', title: 'In Review',  color: 'from-amber-500 to-orange-500',  dot: 'bg-amber-500' },
    { id: 'completed',    title: 'Done',       color: 'from-emerald-500 to-green-600', dot: 'bg-emerald-500' },
  ];

  if (loading) {
    return <LoadingSpinner message="Loading board..." className="min-h-[40vh] bg-transparent" />;
  }

  const sharedCardProps = {
    orgUsers, scopeProjectId, timerTaskId, timerStartedAt,
    onOpenDrawer: setTaskDrawer,
    onEditModal: setEditingTask,
    onDuplicate: handleDuplicateTask,
    onDelete: setConfirmDelete,
    onDragStart: handleDragStart,
    onAssigneeChange: handleAssigneeChange,
    onTimerStart: handleTimerStart,
    onTimerStop: handleTimerStop,
  };

  const listTaskRows = Object.entries(tasks).flatMap(([colId, colTasks]) =>
    applyBoardSort(filteredByColumn(colTasks, colId)).map((task) => ({ task, colId }))
  );

  return (
    <div className="space-y-3 sm:space-y-4 animate-fade-in min-w-0 max-w-full">
      {/* ── Non-scoped header ── */}
      {!hideScopedHeader && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl xl:text-3xl font-bold font-heading text-gray-900 dark:text-white">Project Board</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">{totalTasks} task{totalTasks !== 1 ? 's' : ''} · <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-mono">N</kbd> new · <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-mono">/</kbd> search</p>
          </div>
          <button
            onClick={() => { setSelectedColumnForTask(null); setIsCreateModalOpen(true); }}
            className="w-full sm:w-auto shrink-0 justify-center px-4 py-2.5 sm:py-2 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90"
          >
            <PlusIcon className="w-4 h-4" />
            New Task
          </button>
        </div>
      )}

      {/* Search (driven from project header or / — not inline in the filter toolbar) */}
      {(searchExpanded || searchTerm.length > 0) && (
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Search tasks…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onBlur={() => {
                window.setTimeout(() => {
                  if (document.activeElement === searchInputRef.current) return;
                  const v = searchInputRef.current?.value ?? '';
                  if (v) return;
                  setSearchExpanded(false);
                }, 200);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-sm glass-input rounded-lg"
            />
          </div>
          <button
            type="button"
            onClick={() => { setSearchTerm(''); setSearchExpanded(false); }}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
            title="Close search"
            aria-label="Close search"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Toolbar: stacks on narrow viewports; filters use full width on phones ── */}
      <div className="flex flex-col gap-2 min-w-0 sm:gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0">
            <button type="button" onClick={() => setViewMode('kanban')} title="Board"
              className={`p-2 sm:p-1.5 transition-colors ${viewMode === 'kanban' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              <Squares2X2Icon className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setViewMode('list')} title="List"
              className={`p-2 sm:p-1.5 border-l border-gray-200 dark:border-gray-700 transition-colors ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              <Bars3Icon className="w-4 h-4" />
            </button>
          </div>
          {(searchTerm || (!scopeProjectId && filterProject !== 'all') || filterPriority !== 'all' || filterDepartment !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSearchExpanded(false);
                setFilterPriority('all');
                setFilterDepartment('all');
                if (!scopeProjectId) setFilterProject('all');
              }}
              className="text-xs text-primary-500 hover:underline shrink-0 ml-auto sm:ml-0"
            >
              Clear filters
            </button>
          )}
        </div>
        {!scopeProjectId && (
          <div className="flex flex-col gap-2 w-full min-w-0 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-2">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="glass-input w-full min-w-0 px-2 py-2 sm:py-1.5 text-sm rounded-lg sm:flex-1 sm:min-w-[min(100%,12rem)]"
            >
              <option value="all">All Projects</option>
              {projects.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name || p.title}</option>)}
            </select>
          </div>
        )}
      </div>

      {sortPanelOpen && (
        <div
          ref={sortPanelRef}
          className="flex flex-col gap-4 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm min-w-0"
          role="region"
          aria-label="Board sort and filter options"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sort & filter</span>
            <button
              type="button"
              onClick={() => setSortPanelOpen(false)}
              className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Close panel"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Sort board by</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <select
                value={boardSortKey}
                onChange={(e) => setBoardSortKey(e.target.value)}
                className="glass-input w-full min-w-0 px-2 py-2 sm:py-1.5 text-sm rounded-lg sm:w-auto sm:min-w-[160px]"
              >
                <option value="manual">Default (manual order)</option>
                <option value="title">Title</option>
                <option value="dueDate">Due date</option>
                <option value="priority">Priority (order)</option>
                <option value="storyPoints">Story points</option>
                <option value="created">Date created</option>
              </select>
              <button
                type="button"
                disabled={boardSortKey === 'manual'}
                onClick={() => setBoardSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className={`inline-flex w-full sm:w-auto justify-center items-center gap-1.5 px-2 py-2 sm:py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 ${
                  boardSortKey === 'manual'
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                title={boardSortDir === 'asc' ? 'Ascending' : 'Descending'}
              >
                <ArrowsUpDownIcon className="w-4 h-4 text-gray-400 shrink-0" />
                {boardSortDir === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            </div>
          </div>

          <div className="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
            <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Show tasks</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="glass-input w-full min-w-0 px-2 py-2 sm:py-1.5 text-sm rounded-lg sm:flex-1 sm:min-w-[min(100%,11rem)]"
              >
                <option value="all">All priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              {departments.length > 0 && (
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="glass-input w-full min-w-0 px-2 py-2 sm:py-1.5 text-sm rounded-lg sm:flex-1 sm:min-w-[min(100%,14rem)]"
                >
                  <option value="all">All departments</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Kanban Board: always one row (x-axis); narrow viewports scroll horizontally ── */}
      {viewMode === 'kanban' && (
        <div className="min-w-0 -mx-1 px-1 sm:mx-0 sm:px-0 overflow-x-auto overflow-y-visible pb-2 glass-scrollbar scroll-smooth">
          <div className="flex flex-row flex-nowrap gap-3 sm:gap-4 items-stretch w-max min-w-full sm:min-w-0 sm:w-full">
          {columns.map(col => {
            const colTasks = applyBoardSort(filteredByColumn(tasks[col.id], col.id));
            const isDragTarget = dragOverColumn === col.id;
            return (
              <div
                key={col.id}
                className="flex flex-col min-h-0 w-[min(85vw,18rem)] shrink-0 sm:w-0 sm:min-w-0 sm:flex-1 sm:basis-0 sm:max-w-none"
              >
                {/* Column header — compact on narrow columns; title stays one line; + scales down with width */}
                <div
                  className={`mb-2 flex min-h-0 min-w-0 flex-nowrap items-center justify-between gap-1.5 rounded-lg bg-gradient-to-r px-2 py-1 sm:mb-3 sm:gap-2 sm:rounded-xl sm:px-2.5 sm:py-1.5 md:py-2 md:pl-3 md:pr-2 ${col.color}`}
                >
                  <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 sm:gap-2">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2 ${col.dot} bg-white/80`} aria-hidden />
                    <h3 className="min-w-0 flex-1 truncate text-sm font-bold leading-tight text-white">
                      {col.title}
                    </h3>
                    <span className="shrink-0 rounded-full bg-white/25 px-1 py-0.5 text-[10px] font-bold tabular-nums leading-none text-white sm:px-1.5 sm:text-xs sm:leading-none">
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedColumnForTask(col.id); setIsCreateModalOpen(true); }}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/20 text-white transition-colors hover:bg-white/30 sm:h-7 sm:w-7 sm:rounded-lg md:h-8 md:w-8"
                    title={`Add task to ${col.title}`}
                    aria-label={`Add task to ${col.title}`}
                  >
                    <PlusIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                  </button>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={e => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, col.id)}
                  className={`flex-1 space-y-2 min-h-[220px] min-[480px]:min-h-[260px] md:min-h-[300px] rounded-xl p-1 transition-all duration-150 touch-pan-y ${isDragTarget ? 'bg-primary-50 dark:bg-primary-900/10 ring-2 ring-primary-400 ring-dashed' : ''}`}
                >
                  {colTasks.map(task => (
                    <TaskCard key={task._id || task.id} task={task} columnId={col.id} {...sharedCardProps} />
                  ))}

                  {colTasks.length === 0 && !isDragTarget && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2">
                        <ClipboardDocumentCheckIcon className="w-4 h-4 text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Drop here or</p>
                    </div>
                  )}

                  {isDragTarget && (
                    <div className="h-16 rounded-xl border-2 border-dashed border-primary-400 flex items-center justify-center">
                      <p className="text-xs text-primary-500 font-medium">Release to move</p>
                    </div>
                  )}

                  <QuickAddTask columnId={col.id} onAddTask={handleQuickAddTask} />
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* ── List View: cards on small screens, table from md up ── */}
      {viewMode === 'list' && (
        <div className="glass-card-premium rounded-2xl overflow-hidden min-w-0">
          {totalTasks === 0 ? (
            <div className="text-center py-12 sm:py-16 px-4">
              <EmptyState title="No tasks found" message="Create your first task to get started." className="max-w-lg mx-auto" />
              <button type="button" onClick={() => setIsCreateModalOpen(true)} className="mt-3 text-sm text-primary-500 hover:underline">
                Create your first task
              </button>
            </div>
          ) : (
            <>
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                {listTaskRows.map(({ task, colId }) => {
                  const overdue = !task.completedAt && isOverdue(task.dueDate);
                  const assignee = task.assignee || orgUsers.find(u => (u._id || u.id) === task.assigneeId);
                  const priBar = (PRIORITY_BORDER[task.priority || 'medium'] || '').replace('border-l-', 'bg-');
                  return (
                    <div
                      key={task._id || task.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setTaskDrawer(task)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setTaskDrawer(task);
                        }
                      }}
                      className="p-3 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <span className={`w-1 self-stretch min-h-[2.5rem] rounded-full shrink-0 ${priBar}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white break-words">
                              <span className="mr-1">{TYPE_ICON[task.type || 'task']}</span>
                              {task.title || task.name}
                            </p>
                            {task.projectId?.name && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate">📁 {task.projectId.name}</p>
                            )}
                          </div>
                        </div>
                        <span className={`shrink-0 inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[colId]}`}>
                          {STATUS_LABEL[colId]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pl-3 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          {assignee ? <Avatar user={assignee} /> : <span>—</span>}
                        </div>
                        <span className={overdue ? 'text-red-500 font-semibold' : ''}>
                          {task.dueDate ? fmtDate(task.dueDate) : '—'}
                        </span>
                      </div>
                      <div className="mt-2 flex justify-end" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(task)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          aria-label="Delete task"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <div className="min-w-[640px]">
                  <div className="grid grid-cols-[1fr_100px_100px_80px_32px] gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    <span>Task</span>
                    <span>Assignee</span>
                    <span>Status</span>
                    <span>Due</span>
                    <span />
                  </div>
                  {listTaskRows.map(({ task, colId }) => {
                    const overdue = !task.completedAt && isOverdue(task.dueDate);
                    const assignee = task.assignee || orgUsers.find(u => (u._id || u.id) === task.assigneeId);
                    return (
                      <div
                        key={task._id || task.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setTaskDrawer(task)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setTaskDrawer(task);
                          }
                        }}
                        className="grid grid-cols-[1fr_100px_100px_80px_32px] gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer items-center group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-1 h-8 rounded-full shrink-0 ${(PRIORITY_BORDER[task.priority || 'medium'] || '').replace('border-l-', 'bg-')}`} />
                          <span className="text-sm shrink-0">{TYPE_ICON[task.type || 'task']}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.title || task.name}</p>
                            {task.projectId?.name && (
                              <p className="text-xs text-gray-400 truncate">📁 {task.projectId.name}</p>
                            )}
                          </div>
                        </div>
                        <div>
                          {assignee ? <Avatar user={assignee} /> : <span className="text-xs text-gray-400">—</span>}
                        </div>
                        <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit ${STATUS_COLOR[colId]}`}>
                          {STATUS_LABEL[colId]}
                        </span>
                        <span className={`text-xs ${overdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                          {task.dueDate ? fmtDate(task.dueDate) : '—'}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(task)}
                            className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Task Detail Drawer ── */}
      {taskDrawer && (
        <TaskDrawer
          task={taskDrawer}
          onClose={() => setTaskDrawer(null)}
          onSaved={() => { fetchTasks({ silent: true }); setTaskDrawer(null); }}
          onDelete={(task) => { setTaskDrawer(null); setConfirmDelete(task); }}
          tenantSlug={tenantSlug}
          orgUsers={orgUsers}
        />
      )}

      {/* ── Delete Confirm ── */}
      <DeleteConfirm
        task={confirmDelete}
        onConfirm={handleDeleteTask}
        onCancel={() => setConfirmDelete(null)}
        loading={deleteLoading}
      />

      {/* ── Create Task Modal ── */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); setSelectedColumnForTask(null); }}
        onTaskCreated={() => { fetchTasks({ silent: true }); setIsCreateModalOpen(false); setSelectedColumnForTask(null); }}
        defaultStatus={selectedColumnForTask || CARD_STATUS.TODO}
        projectId={scopeProjectId || (filterProject !== 'all' ? filterProject : undefined)}
      />

      {/* ── Edit Task Modal ── */}
      <CreateTaskModal
        isOpen={!!editingTask}
        initialTask={editingTask}
        onClose={() => setEditingTask(null)}
        onTaskCreated={() => { fetchTasks({ silent: true }); setEditingTask(null); }}
        projectId={scopeProjectId || (editingTask?.projectId?._id || editingTask?.projectId?.id || editingTask?.projectId)}
      />
    </div>
  );
};

export default ProjectTasks;
