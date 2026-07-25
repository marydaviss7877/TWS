/**
 * Project Table View — sortable, filterable spreadsheet-style task list
 * with inline status/priority editing, row actions, overdue highlighting.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';
import {
  TableCellsIcon,
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PencilSquareIcon,
  PlusIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import tenantProjectApiService from './services/tenantProjectApiService';
import { showSuccess, showError } from './utils/toastNotifications';
import LoadingSpinner from '../../../../../../shared/components/feedback/LoadingSpinner';
import EmptyState from '../../../../../../shared/components/feedback/EmptyState';

/* ─── constants ─────────────────────────────────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: 'todo',         label: 'To Do',     cls: 'bg-gray-100  dark:bg-gray-800  text-gray-600  dark:text-gray-300' },
  { value: 'in_progress',  label: 'In Progress', cls: 'bg-blue-100  dark:bg-blue-900/30  text-blue-700  dark:text-blue-300' },
  { value: 'under_review', label: 'In Review',  cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  { value: 'completed',    label: 'Done',       cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
];
const PRIORITY_OPTIONS = [
  { value: 'urgent',  label: 'Urgent',  dot: 'bg-red-500',    cls: 'text-red-600    dark:text-red-400' },
  { value: 'high',    label: 'High',    dot: 'bg-orange-500', cls: 'text-orange-600 dark:text-orange-400' },
  { value: 'medium',  label: 'Medium',  dot: 'bg-yellow-400', cls: 'text-yellow-600 dark:text-yellow-500' },
  { value: 'low',     label: 'Low',     dot: 'bg-green-500',  cls: 'text-green-600  dark:text-green-400' },
];
const TYPE_ICON = {
  user_story:'👤', epic:'🎯', bug:'🐛', feature:'✨',
  technical_task:'⚙️', code_review:'👀', story:'📖',
  task:'📋', improvement:'🔧', custom:'📌',
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}
function initials(name = '') {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}
function avatarBg(name = '') {
  const c = ['from-violet-500 to-purple-600','from-blue-500 to-indigo-600','from-emerald-500 to-teal-600','from-rose-500 to-pink-600','from-amber-500 to-orange-600'];
  let h = 0; for (let i = 0; i < name.length; i++) h = (h*31+name.charCodeAt(i))&0xffffffff;
  return c[Math.abs(h)%c.length];
}

const STATUS_MAP  = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s]));
const PRIORITY_MAP= Object.fromEntries(PRIORITY_OPTIONS.map(p => [p.value, p]));

/* ─── SortIcon ── */
function SortIcon({ col, sortCol, dir }) {
  if (sortCol !== col) return <ChevronUpIcon className="w-3 h-3 text-gray-300 dark:text-gray-600" />;
  return dir === 'asc'
    ? <ChevronUpIcon className="w-3 h-3 text-primary-500" />
    : <ChevronDownIcon className="w-3 h-3 text-primary-500" />;
}

/* ─── InlineSelect ── */
function InlineSelect({ value, options, onChange, renderTrigger }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div className="relative" ref={ref} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 hover:opacity-80 transition-opacity">
        {renderTrigger(value)}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-30 min-w-[120px] py-1">
          {options.map(opt => (
            <button key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${value === opt.value ? 'font-semibold' : ''}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────── */
const ProjectTableView = () => {
  const { projectId } = useParams();
  const tenantSlug = useTenantSlug();

  const [tasks,    setTasks]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [statusF,  setStatusF]  = useState('all');
  const [priorityF,setPriorityF]= useState('all');
  const [sortCol,  setSortCol]  = useState('updatedAt');
  const [sortDir,  setSortDir]  = useState('desc');
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!tenantSlug || !projectId) return;
    setLoading(true);
    try {
      const res = await tenantProjectApiService.getProjectTasks(tenantSlug, { projectId });
      const raw = res?.data?.tasks ?? res?.tasks;
      const list = Array.isArray(raw) ? raw : (raw ? Object.values(raw).flat() : []);
      setTasks(list);
    } catch (e) {
      console.error(e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, projectId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  /* ── sort helper ── */
  const toggleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  /* ── filter + sort ── */
  const today = new Date(); today.setHours(0,0,0,0);
  const filtered = tasks
    .filter(t => {
      const term = search.toLowerCase();
      const m = !term || (t.title || t.name || '').toLowerCase().includes(term) || (t.description || '').toLowerCase().includes(term);
      const s = statusF === 'all'   || t.status   === statusF;
      const p = priorityF === 'all' || t.priority === priorityF;
      return m && s && p;
    })
    .sort((a, b) => {
      let va, vb;
      switch (sortCol) {
        case 'title':    va = (a.title||a.name||'').toLowerCase(); vb = (b.title||b.name||'').toLowerCase(); break;
        case 'status':   va = a.status||''; vb = b.status||''; break;
        case 'priority': va = ['urgent','high','medium','low'].indexOf(a.priority); vb = ['urgent','high','medium','low'].indexOf(b.priority); break;
        case 'dueDate':  va = a.dueDate ? new Date(a.dueDate) : new Date(9e15); vb = b.dueDate ? new Date(b.dueDate) : new Date(9e15); break;
        case 'startDate':va = a.startDate ? new Date(a.startDate) : new Date(9e15); vb = b.startDate ? new Date(b.startDate) : new Date(9e15); break;
        default:         va = new Date(a.updatedAt||a.createdAt||0); vb = new Date(b.updatedAt||b.createdAt||0);
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1  : -1;
      return 0;
    });

  /* ── inline update ── */
  const patchTask = async (task, patch) => {
    const id = task._id || task.id;
    try {
      await tenantProjectApiService.updateTask(tenantSlug, id, patch);
      setTasks(prev => prev.map(t => (t._id || t.id) === id ? { ...t, ...patch } : t));
    } catch (err) { showError('Failed to update task'); }
  };

  /* ── delete ── */
  const deleteTask = async task => {
    const id = task._id || task.id;
    setDeleting(prev => new Set([...prev, id]));
    try {
      await tenantProjectApiService.deleteTask(tenantSlug, id);
      setTasks(prev => prev.filter(t => (t._id || t.id) !== id));
      showSuccess('Task deleted');
    } catch { showError('Failed to delete'); }
    finally { setDeleting(prev => { const s = new Set(prev); s.delete(id); return s; }); }
  };

  /* ── duplicate ── */
  const duplicateTask = async task => {
    try {
      const { _id, id, createdAt, updatedAt, ...rest } = task;
      await tenantProjectApiService.createTask(tenantSlug, {
        ...rest,
        title: `${task.title || task.name} (copy)`,
        status: 'todo',
        projectId: task.projectId?._id || task.projectId?.id || task.projectId,
        departmentId: task.departmentId?._id || task.departmentId?.id || task.departmentId,
        assigneeId: task.assignee?._id || task.assigneeId || undefined,
      });
      showSuccess('Task duplicated');
      fetchTasks();
    } catch { showError('Failed to duplicate'); }
  };

  /* ── bulk delete ── */
  const bulkDelete = async () => {
    if (selected.size === 0) return;
    const ids = [...selected];
    await Promise.all(ids.map(id => tenantProjectApiService.deleteTask(tenantSlug, id).catch(() => {})));
    setTasks(prev => prev.filter(t => !selected.has(t._id || t.id)));
    setSelected(new Set());
    showSuccess(`${ids.length} task${ids.length > 1 ? 's' : ''} deleted`);
  };

  /* ── select all ── */
  const allSelected = filtered.length > 0 && filtered.every(t => selected.has(t._id || t.id));
  const toggleAll   = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(t => t._id || t.id)));
  };
  const toggleRow = id => setSelected(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  /* ── column header ── */
  const Th = ({ col, label, cls = '' }) => (
    <th onClick={() => toggleSort(col)}
      className={`text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-gray-700 dark:hover:text-gray-200 ${cls}`}>
      <span className="flex items-center gap-1">{label}<SortIcon col={col} sortCol={sortCol} dir={sortDir} /></span>
    </th>
  );

  if (loading) {
    return <LoadingSpinner message="Loading table..." className="min-h-[40vh] bg-transparent" />;
  }

  return (
    <div className="p-4 space-y-3 animate-fade-in">

      {/* ── Header / toolbar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TableCellsIcon className="w-5 h-5 text-teal-500" />
            Table
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({filtered.length})</span>
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Search tasks…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm glass-input rounded-lg w-44" />
          </div>
          {/* Status filter */}
          <select value={statusF} onChange={e => setStatusF(e.target.value)}
            className="glass-input px-2 py-1.5 text-sm rounded-lg">
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {/* Priority filter */}
          <select value={priorityF} onChange={e => setPriorityF(e.target.value)}
            className="glass-input px-2 py-1.5 text-sm rounded-lg">
            <option value="all">All Priority</option>
            {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

          {/* Bulk delete */}
          {selected.size > 0 && (
            <button onClick={bulkDelete}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
              <TrashIcon className="w-3.5 h-3.5" />Delete {selected.size}
            </button>
          )}

          <button onClick={fetchTasks}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" title="Refresh">
            <ArrowPathIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                {/* Checkbox */}
                <th className="w-10 px-3 py-2">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 accent-primary-500 cursor-pointer" />
                </th>
                <Th col="title"    label="Task"     cls="min-w-[200px]" />
                <Th col="status"   label="Status"   cls="w-28" />
                <Th col="priority" label="Priority" cls="w-24" />
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap w-32">Type</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap w-24">Assignee</th>
                <Th col="startDate" label="Start"  cls="w-24" />
                <Th col="dueDate"   label="Due"    cls="w-24" />
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-16">Hrs</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-12">SP</th>
                {/* Actions */}
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-16 text-gray-400 dark:text-gray-500">
                    <EmptyState title="No tasks match your filters" message="Adjust search and filters to view tasks." className="max-w-lg mx-auto" />
                  </td>
                </tr>
              ) : (
                filtered.map((task, idx) => {
                  const id = task._id || task.id;
                  const isOverdue = task.dueDate && task.status !== 'completed' && new Date(task.dueDate) < today;
                  const isSelected = selected.has(id);
                  const isDeleting = deleting.has(id);
                  const statusCfg   = STATUS_MAP[task.status]   || STATUS_MAP.todo;
                  const priorityCfg = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
                  const assigneeName = task.assignee?.fullName || task.assignee?.name || task.assignee?.email || '';

                  return (
                    <tr key={id}
                      className={[
                        'border-b border-gray-100 dark:border-gray-800 last:border-0 group transition-colors',
                        isSelected  ? 'bg-primary-50/60 dark:bg-primary-900/10' : (idx % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-gray-800/10'),
                        'hover:bg-gray-50 dark:hover:bg-gray-800/40',
                        isDeleting  ? 'opacity-50 pointer-events-none' : '',
                      ].join(' ')}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-2.5">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleRow(id)}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 accent-primary-500 cursor-pointer" />
                      </td>

                      {/* Title */}
                      <td className="px-3 py-2.5 min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{TYPE_ICON[task.type || 'task'] || '📋'}</span>
                          <span className={`text-sm font-medium truncate max-w-[200px] ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                            {task.title || task.name}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[200px] mt-0.5 ml-6">
                            {task.description}
                          </p>
                        )}
                      </td>

                      {/* Status (inline edit) */}
                      <td className="px-3 py-2.5">
                        <InlineSelect
                          value={task.status || 'todo'}
                          options={STATUS_OPTIONS}
                          onChange={val => patchTask(task, { status: val })}
                          renderTrigger={val => {
                            const cfg = STATUS_MAP[val] || STATUS_MAP.todo;
                            return <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${cfg.cls}`}>{cfg.label}</span>;
                          }}
                        />
                      </td>

                      {/* Priority (inline edit) */}
                      <td className="px-3 py-2.5">
                        <InlineSelect
                          value={task.priority || 'medium'}
                          options={PRIORITY_OPTIONS}
                          onChange={val => patchTask(task, { priority: val })}
                          renderTrigger={val => {
                            const cfg = PRIORITY_MAP[val] || PRIORITY_MAP.medium;
                            return (
                              <span className={`flex items-center gap-1 text-[11px] font-semibold capitalize ${cfg.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                {cfg.label}
                              </span>
                            );
                          }}
                        />
                      </td>

                      {/* Type */}
                      <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {task.type?.replace(/_/g, ' ') || 'task'}
                      </td>

                      {/* Assignee */}
                      <td className="px-3 py-2.5">
                        {assigneeName ? (
                          <div className="flex items-center gap-1.5">
                            <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarBg(assigneeName)} flex items-center justify-center text-white text-[9px] font-bold shrink-0`} title={assigneeName}>
                              {initials(assigneeName)}
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[80px]">{assigneeName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Start date */}
                      <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {fmtDate(task.startDate)}
                      </td>

                      {/* Due date */}
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        <span className={isOverdue ? 'text-red-500 font-semibold' : 'text-gray-500 dark:text-gray-400'}>
                          {fmtDate(task.dueDate)}
                          {isOverdue && <span className="ml-1 text-[9px] bg-red-100 dark:bg-red-900/30 px-1 rounded">OD</span>}
                        </span>
                      </td>

                      {/* Estimated hours */}
                      <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                        {task.estimatedHours ? `${task.estimatedHours}h` : '—'}
                      </td>

                      {/* Story points */}
                      <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                        {task.storyPoints ?? '—'}
                      </td>

                      {/* Row actions */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => duplicateTask(task)}
                            className="p-1 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors" title="Duplicate">
                            <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteTask(task)}
                            className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>{filtered.length} task{filtered.length !== 1 ? 's' : ''}{selected.size > 0 ? ` · ${selected.size} selected` : ''}</span>
            <span>
              {filtered.filter(t => t.status === 'completed').length} done ·{' '}
              {filtered.filter(t => t.dueDate && t.status !== 'completed' && new Date(t.dueDate) < today).length} overdue
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectTableView;
