/**
 * WorkspaceSettingsPage — view / edit the organisation's default workspace.
 * Mirrors OrgProfile.js in structure, tokens, and UX patterns.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Squares2X2Icon,
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArchiveBoxArrowDownIcon,
} from '@heroicons/react/24/outline';
import { useTenantPermissions } from '../../../../contexts/TenantPermissionsContext';
import { refreshToken } from '../../../../../../shared/services/auth/token-refresh.service';
import toast from 'react-hot-toast';

/* ─── tokens (mirrors OrgProfile) ──────────────────────────────────────────── */
const S = {
  card:    'bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-700 rounded-xl p-3',
  input:   'w-full h-8 px-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-600 transition',
  label:   'block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5 uppercase tracking-wide',
  rbox:    'flex h-8 items-center px-2.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg truncate',
  sec:     'text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2',
  navitem: (a) => `flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
    a ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'}`,
};

/* ─── atoms ──────────────────────────────────────────────────────────────────── */
const Lbl  = ({ children }) => <label className={S.label}>{children}</label>;
const Sec  = ({ children }) => <p className={S.sec}>{children}</p>;

function F({ label, value, onChange, placeholder, readOnly, textarea }) {
  return (
    <div>
      <Lbl>{label}</Lbl>
      {readOnly ? (
        <div className={S.rbox}><span className="truncate">{value || '—'}</span></div>
      ) : textarea ? (
        <textarea value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} rows={3}
          className={`${S.input} h-auto py-1.5 resize-none`} />
      ) : (
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} className={S.input} />
      )}
    </div>
  );
}

function ColorF({ label, value, onChange }) {
  return (
    <div>
      <Lbl>{label}</Lbl>
      <div className="flex items-center gap-1.5">
        <input type="color" value={value || '#3B82F6'} onChange={e => onChange(e.target.value)}
          className="h-8 w-9 shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5 bg-white dark:bg-gray-900" />
        <input type="text" value={value || '#3B82F6'} onChange={e => onChange(e.target.value)}
          placeholder="#3B82F6" maxLength={7} className={`${S.input} font-mono`} />
      </div>
    </div>
  );
}

function StatBadge({ label, value }) {
  return (
    <div className="flex flex-col items-center justify-center px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800">
      <span className="text-base font-bold text-gray-900 dark:text-white leading-none">{value ?? 0}</span>
      <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 uppercase tracking-wide">{label}</span>
    </div>
  );
}

/* ─── skeleton ───────────────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="space-y-2.5 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800" />
      ))}
    </div>
  );
}

/* ─── main ───────────────────────────────────────────────────────────────────── */
const WorkspaceSettingsPage = () => {
  const navigate = useNavigate();
  const { hasModulePermission } = useTenantPermissions();

  const isAdmin = hasModulePermission?.('settings', 'admin') || hasModulePermission?.('users', 'admin');

  const NAV = [
    { id: 'identity', label: 'Identity',    Icon: Squares2X2Icon },
    ...(isAdmin ? [{ id: 'danger', label: 'Danger Zone', Icon: ExclamationTriangleIcon }] : []),
  ];

  const [tab,               setTab]               = useState('identity');
  const [loading,           setLoading]           = useState(true);
  const [saving,            setSaving]            = useState(false);
  const [archiving,         setArchiving]         = useState(false);
  const [error,             setError]             = useState(null);
  const [workspace,         setWorkspace]         = useState(null);
  const [form,              setForm]              = useState({ name: '', description: '', color: '#3B82F6' });
  const [savedForm,         setSavedForm]         = useState({ name: '', description: '', color: '#3B82F6' });
  const [dirty,             setDirty]             = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const set = (key) => (val) => {
    setForm(p => {
      const next = { ...p, [key]: val };
      setDirty(JSON.stringify(next) !== JSON.stringify(savedForm));
      return next;
    });
  };

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch('/api/workspaces', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) {
        const backendMessage = json?.message || '';
        const authExpired = res.status === 401 || backendMessage.toLowerCase().includes('token expired');
        setError({
          message: backendMessage || 'Failed to load workspace.',
          authExpired,
        });
        return;
      }
      const list = json.data?.workspaces || json.workspaces || json.data || [];
      const ws = Array.isArray(list) ? list.find(w => w.status === 'active') || list[0] : null;
      if (!ws) throw new Error('No workspace found for this organisation.');
      setWorkspace(ws);
      const f = {
        name:        ws.name        || '',
        description: ws.description || '',
        color:       ws.color       || '#3B82F6',
      };
      setForm(f); setSavedForm(f); setDirty(false);
    } catch (e) {
      setError({
        message: e.message || 'Failed to load workspace.',
        authExpired: false,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReauthenticate = async () => {
    setSaving(true);
    try {
      await refreshToken();
      toast.success('Session refreshed. Reloading workspace...');
      await load();
    } catch (e) {
      toast.error(e.message || 'Failed to refresh session');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!workspace?._id) return;
    const hexRe = /^#[0-9A-Fa-f]{6}$/;
    if (form.color && !hexRe.test(form.color)) {
      toast.error('Color must be a valid hex value e.g. #3B82F6');
      return;
    }
    setSaving(true);
    try {
      const res  = await fetch(`/api/workspaces/${workspace._id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, description: form.description, color: form.color }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Save failed');
      const updated = json.data?.workspace || json.workspace || json.data;
      if (updated) setWorkspace(updated);
      setSavedForm(form); setDirty(false);
      toast.success('Workspace saved');
    } catch (e) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!workspace?._id) return;
    setArchiving(true);
    try {
      const res  = await fetch(`/api/workspaces/${workspace._id}`, {
        method: 'DELETE', credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to archive');
      toast.success('Workspace archived');
      navigate('../settings', { replace: true });
    } catch (e) {
      toast.error(e.message || 'Failed to archive');
    } finally {
      setArchiving(false);
      setShowArchiveConfirm(false);
    }
  };

  /* ── render ── */
  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-2 py-2 px-0.5 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: workspace?.color || '#3B82F6' }}>
          <Squares2X2Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            {loading ? 'Workspace' : (workspace?.name || 'Workspace')}
          </h1>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Workspace settings</p>
        </div>
        {dirty && !loading && (
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            <ExclamationTriangleIcon className="w-3 h-3" /> Unsaved changes
            <button onClick={save} disabled={saving}
              className="ml-1 px-2 py-0.5 rounded bg-primary-600 hover:bg-primary-700 text-white text-[10px] font-medium disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => { setForm(savedForm); setDirty(false); }}
              className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              Discard
            </button>
          </span>
        )}
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-2 p-3 mb-3 rounded-xl bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800">
          <ExclamationTriangleIcon className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-700 dark:text-red-300 flex-1">{error.message}</p>
          {error.authExpired && (
            <button
              onClick={handleReauthenticate}
              disabled={saving}
              className="text-[10px] px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-60 transition-colors"
            >
              {saving ? 'Refreshing...' : 'Re-authenticate'}
            </button>
          )}
          <button onClick={load} className="text-[10px] text-red-600 dark:text-red-400 hover:underline flex items-center gap-1">
            <ArrowPathIcon className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-col md:flex-row gap-4">

        {/* Sidebar */}
        <nav className="hidden md:flex flex-col gap-0.5 w-36 shrink-0">
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={S.navitem(tab === id)}>
              <Icon className="w-3.5 h-3.5 shrink-0" /> {label}
            </button>
          ))}
        </nav>

        {/* Mobile tabs */}
        <div className="md:hidden flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 ${
                tab === id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                           : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2.5">

          {loading && <Skeleton />}

          {/* ── Identity ── */}
          {!loading && tab === 'identity' && (
            <>
              <div className={S.card}>
                <Sec>Identity</Sec>
                <div className="space-y-2">
                  <F label="Workspace Name" value={form.name} onChange={set('name')} placeholder="e.g. Default Workspace" />
                  <F label="Description" value={form.description} onChange={set('description')}
                    placeholder="Short description of this workspace" textarea />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <ColorF label="Accent Colour" value={form.color} onChange={set('color')} />
                    <F label="Slug" value={workspace?.slug} readOnly />
                  </div>
                </div>
              </div>

              <div className={S.card}>
                <Sec>Workspace Info</Sec>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <F label="Type"        value={workspace?.type}        readOnly />
                  <F label="Methodology" value={workspace?.methodology} readOnly />
                  <F label="Status"      value={workspace?.status}      readOnly />
                  <F label="Owner"       value={workspace?.ownerId?.fullName || workspace?.ownerId?.name || workspace?.ownerId?.email || (typeof workspace?.ownerId === 'string' ? workspace.ownerId : '')} readOnly />
                </div>
              </div>

              <div className={S.card}>
                <Sec>Usage</Sec>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <StatBadge label="Boards"  value={workspace?.usage?.boards} />
                  <StatBadge label="Members" value={workspace?.usage?.members || workspace?.members?.length} />
                  <StatBadge label="Cards"   value={workspace?.usage?.cards} />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button onClick={save} disabled={saving || !dirty}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-40 transition-colors">
                  {saving ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <CheckIcon className="w-3 h-3" />}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </>
          )}

          {/* ── Danger Zone ── */}
          {!loading && tab === 'danger' && isAdmin && (
            <div className={`${S.card} ring-red-200 dark:ring-red-800`}>
              <Sec>Danger Zone</Sec>
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Archiving this workspace will hide it from all views. Projects inside the workspace
                  are not deleted — they remain accessible via the Projects section.
                </p>

                {!showArchiveConfirm ? (
                  <button onClick={() => setShowArchiveConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800 rounded-lg transition-colors">
                    <ArchiveBoxArrowDownIcon className="w-3.5 h-3.5" /> Archive Workspace
                  </button>
                ) : (
                  <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 ring-1 ring-red-200 dark:ring-red-800 space-y-2">
                    <p className="text-xs font-medium text-red-700 dark:text-red-300">
                      Archive <strong>{workspace?.name}</strong>? This cannot be undone from the UI.
                    </p>
                    <div className="flex items-center gap-2">
                      <button onClick={archive} disabled={archiving}
                        className="px-3 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 transition-colors">
                        {archiving ? 'Archiving…' : 'Yes, Archive'}
                      </button>
                      <button onClick={() => setShowArchiveConfirm(false)}
                        className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default WorkspaceSettingsPage;
