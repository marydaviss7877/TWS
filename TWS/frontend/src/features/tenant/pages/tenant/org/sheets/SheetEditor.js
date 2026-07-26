import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';
import toast from 'react-hot-toast';
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import '@univerjs/preset-sheets-core/lib/index.css';
import {
  ArrowLeftIcon,
  TableCellsIcon,
  ClockIcon,
  UserPlusIcon,
  XMarkIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { useTenantAuth } from '../../../../../../app/providers/TenantAuthContext';
import * as sheetsHubApi from './sheetsHubApi';
import './SheetEditor.css';

const AUTOSAVE_DELAY_MS = 2000;

const SheetEditor = () => {
  const { user: tenantUser } = useTenantAuth();
  const { id } = useParams();
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const currentUserId = tenantUser?._id || tenantUser?.id || null;

  const [title, setTitle] = useState('');
  const [sheetId, setSheetId] = useState(isNew ? null : id);
  const [revision, setRevision] = useState(0);
  const [saveStatus, setSaveStatus] = useState(null);
  const [loadedContent, setLoadedContent] = useState(false);
  const [initialWorkbookData, setInitialWorkbookData] = useState(null);
  const [initError, setInitError] = useState(false);
  const [univerReady, setUniverReady] = useState(false);
  const [effectivePermission, setEffectivePermission] = useState('edit');
  const [conflict, setConflict] = useState(null);
  const [sheetMeta, setSheetMeta] = useState(null);
  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const [shares, setShares] = useState([]);
  const [orgUsers, setOrgUsers] = useState([]);
  const [shareUserId, setShareUserId] = useState('');
  const [sharePermission, setSharePermission] = useState('view');
  const [addingShare, setAddingShare] = useState(false);
  const [updatingAssign, setUpdatingAssign] = useState(false);

  const containerRef = useRef(null);
  const univerRef = useRef(null);
  const workbookRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const persistSaveRef = useRef(null);

  const loadSheet = useCallback(async () => {
    setLoadedContent(false);
    if (isNew) {
      setTitle('');
      setSheetId(null);
      setRevision(0);
      setInitialWorkbookData(null);
      setSheetMeta(null);
      setEffectivePermission('edit');
      setLoadedContent(true);
      return;
    }
    try {
      const sheet = await sheetsHubApi.getSheet(tenantSlug, id);
      if (!sheet) {
        toast.error('Sheet not found');
        navigate(`/${tenantSlug}/org/sheets`);
        return;
      }
      if (sheet.type === 'uploaded') {
        toast.error('Uploaded files cannot be edited here. Open from the hub to download.');
        navigate(`/${tenantSlug}/org/sheets`);
        return;
      }
      setTitle(sheet.title || '');
      setSheetId(sheet._id);
      setRevision(sheet.revision || 0);
      setSheetMeta({
        createdBy: sheet.createdBy,
        ownerId: sheet.ownerId,
        assigneeId: sheet.assigneeId,
        folderId: sheet.folderId,
        tags: sheet.tags,
        createdAt: sheet.createdAt,
        updatedAt: sheet.updatedAt,
      });
      setEffectivePermission(sheet.effectivePermission === 'edit' ? 'edit' : 'view');
      setInitialWorkbookData(sheet.content || null);
      setLoadedContent(true);
    } catch (e) {
      toast.error(e.message || 'Failed to load sheet');
      navigate(`/${tenantSlug}/org/sheets`);
    }
  }, [tenantSlug, id, isNew, navigate]);

  useEffect(() => { loadSheet(); }, [loadSheet]);

  // --- Univer bootstrap: only once content has been resolved (blank vs. loaded snapshot) ---
  useEffect(() => {
    if (!loadedContent || !containerRef.current || univerRef.current) return;
    try {
      const { univer, univerAPI } = createUniver({
        locale: LocaleType.EN_US,
        locales: { [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS) },
        presets: [UniverSheetsCorePreset({ container: containerRef.current })],
      });
      univerRef.current = { univer, univerAPI };
      const workbook = univerAPI.createWorkbook(initialWorkbookData || {});
      workbookRef.current = workbook;
      setUniverReady(true);
    } catch (e) {
      console.error('Failed to initialize the spreadsheet editor:', e);
      setInitError(true);
    }
    return () => {
      if (univerRef.current) {
        univerRef.current.univer.dispose();
        univerRef.current = null;
        workbookRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedContent]);

  // --- Read-only enforcement (hardening #4 — UX only; the server independently enforces this on every write) ---
  useEffect(() => {
    if (!univerReady || !workbookRef.current) return;
    const permission = workbookRef.current.getWorkbookPermission();
    if (effectivePermission === 'view') {
      permission.setReadOnly();
    } else {
      permission.setEditable();
    }
  }, [univerReady, effectivePermission]);

  const persistSave = useCallback(async (options = {}) => {
    if (effectivePermission === 'view') return; // view-only users never attempt a write
    if (conflict) return; // paused until the user reloads or dismisses the conflict
    const workbook = workbookRef.current;
    if (!workbook || !tenantSlug) return;
    const content = workbook.save();
    const finalTitle = title.trim() || 'Untitled';
    setSaveStatus('saving');
    try {
      if (sheetId) {
        const updated = await sheetsHubApi.updateSheet(tenantSlug, sheetId, {
          title: finalTitle,
          content,
          revision,
          explicitVersion: !!options.explicitVersion,
        });
        setRevision(updated.revision);
        setSaveStatus('saved');
      } else {
        const created = await sheetsHubApi.createSheet(tenantSlug, { title: finalTitle, content });
        if (created && created._id) {
          setSheetId(created._id);
          setRevision(created.revision || 0);
          navigate(`/${tenantSlug}/org/sheets/${created._id}`, { replace: true });
          setSaveStatus('saved');
        }
      }
    } catch (e) {
      if (e.code === 'REVISION_CONFLICT') {
        setConflict({ currentRevision: e.currentRevision, currentUpdatedAt: e.currentUpdatedAt });
        setSaveStatus(null);
        return;
      }
      setSaveStatus('error');
      toast.error(e.message || 'Save failed');
    } finally {
      setTimeout(() => setSaveStatus(null), 2000);
    }
  }, [effectivePermission, conflict, tenantSlug, sheetId, revision, title, navigate]);

  useEffect(() => { persistSaveRef.current = persistSave; }, [persistSave]);

  const scheduleAutosave = useCallback(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      persistSaveRef.current?.();
      autosaveTimerRef.current = null;
    }, AUTOSAVE_DELAY_MS);
  }, []);

  // Detect edits via Univer's command-executed event (Univer manages the grid outside React's
  // render cycle, so there's no editor-content prop to watch the way a React-controlled editor
  // would have — this is the confirmed Facade API hook for "something changed").
  useEffect(() => {
    if (!univerReady) return;
    const { univerAPI } = univerRef.current;
    const disposable = univerAPI.addEvent(univerAPI.Event.CommandExecuted, () => {
      scheduleAutosave();
    });
    return () => disposable.dispose();
  }, [univerReady, scheduleAutosave]);

  // Title is a plain React input outside Univer — schedule autosave on change too.
  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    scheduleAutosave();
  };

  const fetchVersions = useCallback(async () => {
    if (!tenantSlug || !sheetId) return;
    try {
      const list = await sheetsHubApi.listVersions(tenantSlug, sheetId);
      setVersions(Array.isArray(list) ? list : []);
    } catch {
      setVersions([]);
    }
  }, [tenantSlug, sheetId]);

  const handleSaveVersionNow = async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    await persistSave({ explicitVersion: true });
    toast.success('Version saved');
    fetchVersions();
  };

  const fetchShares = useCallback(async () => {
    if (!tenantSlug || !sheetId) return;
    try {
      const list = await sheetsHubApi.listShares(tenantSlug, sheetId);
      setShares(Array.isArray(list) ? list : []);
    } catch {
      setShares([]);
    }
  }, [tenantSlug, sheetId]);

  const fetchOrgUsers = useCallback(async () => {
    if (!tenantSlug) return;
    try {
      const list = await sheetsHubApi.listOrgUsers(tenantSlug);
      setOrgUsers(Array.isArray(list) ? list : []);
    } catch {
      setOrgUsers([]);
    }
  }, [tenantSlug]);

  useEffect(() => {
    if (sheetId) {
      fetchShares();
      fetchOrgUsers();
    } else {
      setShares([]);
    }
  }, [sheetId, fetchShares, fetchOrgUsers]);

  const handleRestoreVersion = async (versionId) => {
    if (!tenantSlug || !sheetId) return;
    if (!window.confirm('Restore this version? Your current content will be saved as a new version first.')) return;
    try {
      const restored = await sheetsHubApi.restoreVersion(tenantSlug, sheetId, versionId);
      if (restored) {
        setRevision(restored.revision);
        setTitle(restored.title || '');
        const { univerAPI } = univerRef.current || {};
        if (univerAPI && workbookRef.current) {
          univerAPI.disposeUnit(workbookRef.current.getId());
          workbookRef.current = univerAPI.createWorkbook(restored.content || {});
        }
        toast.success('Version restored');
        setVersionDrawerOpen(false);
        fetchVersions();
      }
    } catch (e) {
      toast.error(e.message || 'Failed to restore version');
    }
  };

  const handleAssign = async (newAssigneeId) => {
    if (!tenantSlug || !sheetId) return;
    setUpdatingAssign(true);
    try {
      const updated = await sheetsHubApi.updateSheet(tenantSlug, sheetId, { assigneeId: newAssigneeId || null, revision });
      setRevision(updated.revision);
      const user = newAssigneeId ? orgUsers.find((u) => u._id === newAssigneeId) : null;
      setSheetMeta((m) => (m ? { ...m, assigneeId: user ? { _id: user._id, fullName: user.fullName, email: user.email } : null } : m));
      toast.success(newAssigneeId ? 'Assignee updated' : 'Assignment cleared');
    } catch (e) {
      if (e.code === 'REVISION_CONFLICT') {
        setConflict({ currentRevision: e.currentRevision, currentUpdatedAt: e.currentUpdatedAt });
      } else {
        toast.error(e.message || 'Failed to update assignee');
      }
    } finally {
      setUpdatingAssign(false);
    }
  };

  const handleAddShare = async () => {
    if (!tenantSlug || !sheetId || !shareUserId) return;
    setAddingShare(true);
    try {
      await sheetsHubApi.addShare(tenantSlug, sheetId, shareUserId, sharePermission);
      await fetchShares();
      setShareUserId('');
      toast.success('Sheet shared');
    } catch (e) {
      toast.error(e.message || 'Failed to share');
    } finally {
      setAddingShare(false);
    }
  };

  const handleRemoveShare = async (userId) => {
    if (!tenantSlug || !sheetId) return;
    try {
      await sheetsHubApi.removeShare(tenantSlug, sheetId, userId);
      await fetchShares();
      toast.success('Share removed');
    } catch (e) {
      toast.error(e.message || 'Failed to remove share');
    }
  };

  const shareExcludedUserIds = new Set([
    currentUserId,
    sheetMeta?.ownerId?._id || sheetMeta?.ownerId || null,
    sheetMeta?.createdBy?._id || sheetMeta?.createdBy || null,
  ].filter(Boolean).map((v) => String(v)));
  const availableShareUsers = orgUsers.filter((u) => {
    const idStr = String(u?._id || '');
    if (!idStr) return false;
    if (shareExcludedUserIds.has(idStr)) return false;
    if (shares.some((s) => String(s.userId?._id || s.userId) === idStr)) return false;
    return true;
  });

  if (initError) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center text-center p-8">
        <TableCellsIcon className="h-10 w-10 text-slate-400 mb-3" />
        <h2 className="text-lg font-semibold text-slate-900">Couldn&apos;t load the spreadsheet editor</h2>
        <p className="mt-2 text-sm text-slate-600 max-w-sm">
          This can happen on older browsers or when the device is low on memory. Try reloading the page, or use a different browser.
        </p>
        <button type="button" onClick={() => window.location.reload()} className="mt-4 px-4 py-2 rounded-lg bg-[var(--tenant-primary)] text-white text-sm font-medium">
          Reload page
        </button>
      </div>
    );
  }

  return (
    <div className="sheet-editor-page bg-slate-50">
      <header className="flex-shrink-0 border-b border-[var(--tenant-border)] bg-[var(--tenant-bg-elevated)] px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(`/${tenantSlug}/org/sheets`)} className="p-2 rounded-lg text-[var(--tenant-muted)] hover:bg-slate-100" aria-label="Back to Sheets">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            readOnly={effectivePermission === 'view'}
            className="flex-1 min-w-0 text-lg font-semibold bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/30 rounded-lg px-2 py-1 text-[var(--tenant-text)]"
          />
          {effectivePermission === 'view' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-slate-200 bg-slate-100 text-slate-600 flex-shrink-0">
              <EyeIcon className="h-3.5 w-3.5" />
              View only
            </span>
          )}
          <span className="text-xs text-[var(--tenant-muted)] flex-shrink-0 hidden sm:inline">
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Save failed' : ''}
          </span>
          {sheetId && (
            <button
              type="button"
              onClick={() => { setVersionDrawerOpen(true); fetchVersions(); }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[var(--tenant-border)] hover:bg-slate-50 flex-shrink-0"
            >
              <ClockIcon className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </button>
          )}
          {sheetId && effectivePermission === 'edit' && (
            <button
              type="button"
              onClick={() => setSharePanelOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[var(--tenant-border)] hover:bg-slate-50 flex-shrink-0"
            >
              <UserPlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}
        </div>
      </header>

      <div className="sheet-editor-univer-container">
        <div ref={containerRef} className="absolute inset-0" />
        {!univerReady && !initError && (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--tenant-muted)] pointer-events-none bg-[var(--tenant-bg-elevated)]">
            <span>Loading spreadsheet…</span>
          </div>
        )}
      </div>

      {conflict && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">This sheet changed elsewhere</h2>
            <p className="mt-2 text-sm text-slate-600">
              Someone else saved changes to this sheet after you opened it. Reload to see the latest version — any unsaved changes you made since then will be lost.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setConflict(null)} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50">
                Keep editing (won&apos;t save)
              </button>
              <button type="button" onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--tenant-primary)] text-white">
                Reload
              </button>
            </div>
          </div>
        </div>
      )}

      {versionDrawerOpen && (
        <div className="fixed inset-0 z-[9999] flex justify-end bg-black/20" onClick={() => setVersionDrawerOpen(false)}>
          <div className="h-full w-full max-w-sm bg-white shadow-xl p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">Version history</h2>
              <button type="button" onClick={() => setVersionDrawerOpen(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            {effectivePermission === 'edit' && (
              <button
                type="button"
                onClick={handleSaveVersionNow}
                className="mb-4 w-full px-3 py-2 rounded-lg text-sm font-medium border border-[var(--tenant-primary)] text-[var(--tenant-primary)] hover:bg-[var(--tenant-primary)]/10"
              >
                Save version now
              </button>
            )}
            {versions.length === 0 ? (
              <p className="text-sm text-slate-500">No earlier versions yet. A version is saved periodically as you edit, or when you restore an older one.</p>
            ) : (
              <ul className="space-y-2">
                {versions.map((v) => (
                  <li key={v._id} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{v.title}</p>
                      <p className="text-xs text-slate-500">
                        {v.createdAt ? new Date(v.createdAt).toLocaleString() : ''} · {v.createdBy?.fullName || 'Unknown'}
                      </p>
                    </div>
                    {effectivePermission === 'edit' && (
                      <button type="button" onClick={() => handleRestoreVersion(v._id)} className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--tenant-primary)] text-[var(--tenant-primary)] hover:bg-[var(--tenant-primary)]/10">
                        Restore
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {sharePanelOpen && sheetId && (
        <div className="fixed inset-0 z-[9999] flex justify-end bg-black/20" onClick={() => setSharePanelOpen(false)}>
          <div className="h-full w-full max-w-sm bg-white shadow-xl p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900">Share sheet</h2>
              <button type="button" onClick={() => setSharePanelOpen(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assignee</label>
              <select
                value={sheetMeta?.assigneeId?._id || sheetMeta?.assigneeId || ''}
                onChange={(e) => handleAssign(e.target.value || null)}
                disabled={updatingAssign}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {orgUsers.map((u) => (
                  <option key={u._id} value={u._id}>{u.fullName || u.email}</option>
                ))}
              </select>
            </div>

            <div className="mb-3 flex items-center gap-2">
              <select value={shareUserId} onChange={(e) => setShareUserId(e.target.value)} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select a person…</option>
                {availableShareUsers.map((u) => (
                  <option key={u._id} value={u._id}>{u.fullName || u.email}</option>
                ))}
              </select>
              <select value={sharePermission} onChange={(e) => setSharePermission(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-sm">
                <option value="view">View</option>
                <option value="edit">Edit</option>
              </select>
              <button type="button" onClick={handleAddShare} disabled={!shareUserId || addingShare} className="px-3 py-2 rounded-lg text-sm font-medium bg-[var(--tenant-primary)] text-white disabled:opacity-50">
                Add
              </button>
            </div>

            <ul className="space-y-2 mt-4">
              {shares.map((s) => (
                <li key={s._id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-900 truncate">{s.userId?.fullName || s.userId?.email || 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{s.permission === 'edit' ? 'Can edit' : 'Can view'}</p>
                  </div>
                  <button type="button" onClick={() => handleRemoveShare(s.userId?._id || s.userId)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50" aria-label="Remove share">
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {shares.length === 0 && <p className="text-sm text-slate-500">Not shared with anyone yet.</p>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default SheetEditor;
