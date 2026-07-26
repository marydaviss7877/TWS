import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  TableCellsIcon,
  PlusIcon,
  TrashIcon,
  ArrowRightIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  FolderIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import * as sheetsHubApi from './sheetsHubApi';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'created', label: 'Created' },
  { value: 'uploaded', label: 'Uploaded' },
];

const SORT_OPTIONS = [
  { value: 'updatedAt', label: 'Last updated' },
  { value: 'createdAt', label: 'Created' },
  { value: 'title', label: 'Title' },
];

const handleKeyboardOpen = (event, openFn) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openFn();
  }
};

function SheetTags({ tags, allTags }) {
  if (!tags || !Array.isArray(tags) || tags.length === 0) return null;
  const tagMap = new Map((allTags || []).map((t) => [t._id, t]));
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {tags.slice(0, 3).map((tagId) => {
        const tag = typeof tagId === 'object' ? tagId : tagMap.get(tagId);
        if (!tag) return null;
        return (
          <span
            key={typeof tag === 'object' ? tag._id : tagId}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)] border border-[var(--tenant-primary)]/20"
          >
            {tag.name || (typeof tag === 'object' ? tag.name : tag)}
          </span>
        );
      })}
      {tags.length > 3 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs text-[var(--tenant-muted)]">
          +{tags.length - 3}
        </span>
      )}
    </div>
  );
}

const SheetsHub = () => {
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sheets, setSheets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadInputKey, setUploadInputKey] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importInputKey, setImportInputKey] = useState(0);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [folderId, setFolderId] = useState(searchParams.get('folderId') || '');
  const [selectedTags, setSelectedTags] = useState(() => {
    const tagsParam = searchParams.get('tags');
    return tagsParam ? tagsParam.split(',').filter(Boolean) : [];
  });
  const [sort, setSort] = useState(searchParams.get('sort') || 'updatedAt');
  const [order, setOrder] = useState(searchParams.get('order') || 'desc');
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'table');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [deletingFolderId, setDeletingFolderId] = useState(null);
  const [deletingTagId, setDeletingTagId] = useState(null);

  const [folders, setFolders] = useState([]);
  const [tags, setTags] = useState([]);

  const fetchSheets = useCallback(async () => {
    if (!tenantSlug) return;
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: 20,
        search: search.trim() || undefined,
        type: typeFilter || undefined,
        folderId: folderId || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        sort,
        order,
      };
      const res = await sheetsHubApi.listSheets(tenantSlug, params);
      setSheets(res.data?.sheets ?? []);
      setPagination(res.data?.pagination ?? { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (e) {
      setError(e.message || 'Failed to load sheets');
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, search, typeFilter, folderId, selectedTags, sort, order, pagination.page]);

  const fetchFoldersAndTags = useCallback(async () => {
    if (!tenantSlug) return;
    try {
      const [foldersRes, tagsRes] = await Promise.all([
        sheetsHubApi.listFolders(tenantSlug),
        sheetsHubApi.listTags(tenantSlug),
      ]);
      setFolders(Array.isArray(foldersRes) ? foldersRes : (foldersRes?.data?.folders ?? []));
      setTags(Array.isArray(tagsRes) ? tagsRes : (tagsRes?.data?.tags ?? []));
    } catch {
      // non-blocking
    }
  }, [tenantSlug]);

  useEffect(() => { fetchSheets(); }, [fetchSheets]);
  useEffect(() => { fetchFoldersAndTags(); }, [fetchFoldersAndTags]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (search) next.set('search', search); else next.delete('search');
    if (typeFilter) next.set('type', typeFilter); else next.delete('type');
    if (folderId) next.set('folderId', folderId); else next.delete('folderId');
    if (selectedTags.length > 0) next.set('tags', selectedTags.join(',')); else next.delete('tags');
    next.set('sort', sort);
    next.set('order', order);
    if (viewMode !== 'table') next.set('view', viewMode); else next.delete('view');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, folderId, selectedTags, sort, order, viewMode]);

  const handleOpen = (id) => navigate(`/${tenantSlug}/org/sheets/${id}`);
  const handleNew = () => navigate(`/${tenantSlug}/org/sheets/new`);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await sheetsHubApi.deleteSheet(tenantSlug, id);
      setSheets((prev) => prev.filter((s) => s._id !== id));
      setSelectedIds((s) => { const n = new Set(s); n.delete(id); return n; });
      toast.success('Sheet deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      for (const id of selectedIds) {
        await sheetsHubApi.deleteSheet(tenantSlug, id);
      }
      setSheets((prev) => prev.filter((s) => !selectedIds.has(s._id)));
      setSelectedIds(new Set());
      toast.success('Sheets deleted');
      fetchSheets();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const sheet = await sheetsHubApi.uploadSheet(tenantSlug, file, { title: file.name });
      setSheets((prev) => [sheet, ...prev]);
      setUploadInputKey((k) => k + 1);
      toast.success('File uploaded');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleImportXlsx = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const sheet = await sheetsHubApi.importXlsx(tenantSlug, file, { title: file.name.replace(/\.[^.]+$/, '') });
      setImportInputKey((k) => k + 1);
      toast.success('Imported — opening editor…');
      if (sheet && sheet._id) navigate(`/${tenantSlug}/org/sheets/${sheet._id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === sheets.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sheets.map((s) => s._id)));
  };

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('');
    setFolderId('');
    setSelectedTags([]);
    setSort('updatedAt');
    setOrder('desc');
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      const folder = await sheetsHubApi.createFolder(tenantSlug, name, null, 'org');
      setFolders((prev) => [...prev, folder]);
      setNewFolderName('');
      toast.success('Folder created');
      fetchFoldersAndTags();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    setCreatingTag(true);
    try {
      const tag = await sheetsHubApi.createTag(tenantSlug, name);
      setTags((prev) => [...prev, tag]);
      setNewTagName('');
      toast.success('Tag created');
      fetchFoldersAndTags();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCreatingTag(false);
    }
  };

  const handleDeleteFolder = async (folderIdToDelete, folderName) => {
    if (!window.confirm(`Delete folder "${folderName}"? Sheets in this folder won't be deleted, but the folder will be removed.`)) return;
    setDeletingFolderId(folderIdToDelete);
    try {
      await sheetsHubApi.deleteFolder(tenantSlug, folderIdToDelete);
      setFolders((prev) => prev.filter((f) => f._id !== folderIdToDelete));
      if (folderId === folderIdToDelete) setFolderId('');
      toast.success('Folder deleted');
      fetchFoldersAndTags();
      fetchSheets();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeletingFolderId(null);
    }
  };

  const handleDeleteTag = async (tagId, tagName) => {
    if (!window.confirm(`Delete tag "${tagName}"? This will remove the tag from all sheets.`)) return;
    setDeletingTagId(tagId);
    try {
      await sheetsHubApi.deleteTag(tenantSlug, tagId);
      setTags((prev) => prev.filter((t) => t._id !== tagId));
      setSelectedTags((prev) => prev.filter((id) => id !== tagId));
      toast.success('Tag deleted');
      fetchFoldersAndTags();
      fetchSheets();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeletingTagId(null);
    }
  };

  const hasFilters = search || typeFilter || folderId || selectedTags.length > 0;

  return (
    <div className="min-h-full bg-slate-50 text-[var(--tenant-text)]">
      <header className="border-b border-[var(--tenant-border)] bg-[var(--tenant-bg-elevated)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--tenant-text)]">
                Sheets
              </h1>
              <p className="mt-2 text-sm text-[var(--tenant-muted)]">
                Create and edit spreadsheets in-app, import an existing Excel file to keep editing it, or archive a file as-is.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium border border-[var(--tenant-border)] bg-[var(--tenant-bg)] hover:bg-[var(--tenant-bg-elevated)] transition cursor-pointer disabled:opacity-50">
                <input
                  type="file"
                  key={uploadInputKey}
                  className="sr-only"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleUpload}
                  disabled={uploading}
                />
                <ArrowUpTrayIcon className="h-5 w-5" />
                {uploading ? 'Uploading…' : 'Upload file'}
              </label>
              <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium border border-[var(--tenant-border)] bg-[var(--tenant-bg)] hover:bg-[var(--tenant-bg-elevated)] transition cursor-pointer disabled:opacity-50">
                <input
                  type="file"
                  key={importInputKey}
                  className="sr-only"
                  accept=".xlsx,.xls"
                  onChange={handleImportXlsx}
                  disabled={importing}
                />
                <ArrowDownTrayIcon className="h-5 w-5" />
                {importing ? 'Importing…' : 'Import from Excel'}
              </label>
              <button
                type="button"
                onClick={handleNew}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-[var(--tenant-primary)] shadow-sm hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)] focus:ring-offset-2 focus:ring-offset-[var(--tenant-bg)] shrink-0"
              >
                <PlusIcon className="h-5 w-5" />
                New sheet
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <aside className="flex-shrink-0 w-56 mr-6 sm:mr-8 hidden sm:block">
          <div className="sticky top-4 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--tenant-muted)] px-2 py-1.5 flex items-center gap-2">
                <FolderIcon className="h-4 w-4" />
                Folders
              </h2>
              <nav className="mt-2 space-y-1" aria-label="Browse by folder">
                <button
                  type="button"
                  onClick={() => setFolderId('')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm font-medium transition ${!folderId ? 'bg-[var(--tenant-primary)]/15 text-[var(--tenant-primary)]' : 'text-[var(--tenant-text)] hover:bg-slate-50'}`}
                >
                  <TableCellsIcon className="h-4 w-4 flex-shrink-0" />
                  All Sheets
                </button>
                {folders.map((f) => (
                  <div key={f._id} className="group flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFolderId(f._id)}
                      className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm font-medium transition truncate ${folderId === f._id ? 'bg-[var(--tenant-primary)]/15 text-[var(--tenant-primary)]' : 'text-[var(--tenant-text)] hover:bg-slate-50'}`}
                      title={f.name}
                    >
                      <FolderIcon className="h-4 w-4 flex-shrink-0 text-[var(--tenant-muted)]" />
                      <span className="truncate">{f.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f._id, f.name); }}
                      disabled={deletingFolderId === f._id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-[var(--tenant-muted)] hover:text-red-500 hover:bg-red-500/10 transition disabled:opacity-50"
                      title="Delete folder"
                      aria-label={`Delete folder ${f.name}`}
                    >
                      {deletingFolderId === f._id ? (
                        <div className="h-4 w-4 border-2 border-[var(--tenant-muted)] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <TrashIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
                {folders.length === 0 && (
                  <p className="px-3 py-2 text-xs text-[var(--tenant-muted)]">No folders yet. Add one in Filters.</p>
                )}
              </nav>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 py-2">
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--tenant-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search sheets..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-[var(--tenant-text)] placeholder-[var(--tenant-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/30 focus:border-[var(--tenant-primary)] transition"
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[var(--tenant-muted)] hover:bg-[var(--tenant-bg)]" aria-label="Clear search">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border transition ${showFilters ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)]' : 'border-slate-200 bg-white text-[var(--tenant-text)] hover:bg-slate-50'}`}
              >
                <FunnelIcon className="h-5 w-5" />
                Filters
              </button>
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="text-sm text-[var(--tenant-primary)] hover:underline">
                  Clear filters
                </button>
              )}
              <div className="flex items-center gap-1 border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button type="button" onClick={() => setViewMode('grid')} className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-[var(--tenant-primary)]/15 text-[var(--tenant-primary)]' : 'text-[var(--tenant-muted)] hover:bg-slate-50 hover:text-[var(--tenant-text)]'}`} aria-label="Grid view"><Squares2X2Icon className="h-5 w-5" /></button>
                <button type="button" onClick={() => setViewMode('list')} className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-[var(--tenant-primary)]/15 text-[var(--tenant-primary)]' : 'text-[var(--tenant-muted)] hover:bg-slate-50 hover:text-[var(--tenant-text)]'}`} aria-label="List view"><ListBulletIcon className="h-5 w-5" /></button>
                <button type="button" onClick={() => setViewMode('table')} className={`p-2.5 transition-colors ${viewMode === 'table' ? 'bg-[var(--tenant-primary)]/15 text-[var(--tenant-primary)]' : 'text-[var(--tenant-muted)] hover:bg-slate-50 hover:text-[var(--tenant-text)]'}`} aria-label="Table view"><TableCellsIcon className="h-5 w-5" /></button>
              </div>
            </div>
            {showFilters && (
              <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white text-[var(--tenant-text)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/30">
                  {TYPE_OPTIONS.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
                </select>
                <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className="rounded-lg border border-slate-200 bg-white text-[var(--tenant-text)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/30">
                  <option value="">All folders</option>
                  {folders.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
                </select>
                <div className="relative">
                  <select
                    multiple
                    value={selectedTags}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, (opt) => opt.value);
                      setSelectedTags(values);
                    }}
                    className="rounded-lg border border-slate-200 bg-white text-[var(--tenant-text)] px-3 py-2 text-sm min-w-[160px] max-h-32 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/30"
                    size={Math.min(tags.length + 1, 4)}
                  >
                    <option value="" disabled>Filter by tags</option>
                    {tags.map((t) => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                  {selectedTags.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedTags([])}
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
                      title="Clear tag filter"
                    >
                      ×
                    </button>
                  )}
                </div>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-slate-200 bg-white text-[var(--tenant-text)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/30">
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button type="button" onClick={() => setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 transition-colors">
                  {order === 'desc' ? 'Newest first' : 'Oldest first'}
                </button>
                <div className="flex items-center gap-3 border-l border-[var(--tenant-border)] pl-4 ml-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="New folder name" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/30" onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()} />
                    <button type="button" onClick={handleCreateFolder} disabled={!newFolderName.trim() || creatingFolder} className="rounded-lg px-3 py-2 text-sm font-medium bg-[var(--tenant-primary)] text-white disabled:opacity-50">Add folder</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="New tag" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/30" onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()} />
                    <button type="button" onClick={handleCreateTag} disabled={!newTagName.trim() || creatingTag} className="rounded-lg px-3 py-2 text-sm font-medium border border-[var(--tenant-primary)] text-[var(--tenant-primary)] disabled:opacity-50">Add tag</button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {tags.map((t) => (
                        <span key={t._id} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-white border border-slate-200">
                          <span>{t.name}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteTag(t._id, t.name)}
                            disabled={deletingTagId === t._id}
                            className="text-[var(--tenant-muted)] hover:text-red-500 disabled:opacity-50"
                            title={`Delete tag ${t.name}`}
                          >
                            {deletingTagId === t._id ? '…' : '×'}
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 py-2">
                <span className="text-sm text-[var(--tenant-muted)]">{selectedIds.size} selected</span>
                <button type="button" onClick={handleBulkDelete} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-500/10 text-sm font-medium">
                  <TrashIcon className="h-4 w-4" />
                  Delete
                </button>
                <button type="button" onClick={() => setSelectedIds(new Set())} className="text-sm text-[var(--tenant-muted)] hover:text-[var(--tenant-text)]">Clear selection</button>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-[var(--tenant-muted)]">
              <span>Loading…</span>
            </div>
          ) : sheets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center">
              <div className="w-14 h-14 rounded-xl bg-[var(--tenant-primary)]/10 flex items-center justify-center text-[var(--tenant-primary)] mb-4">
                <TableCellsIcon className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--tenant-text)]">
                {folderId ? 'No sheets in this folder' : 'No sheets yet'}
              </h2>
              <p className="mt-1 text-sm text-[var(--tenant-muted)] max-w-xs">
                {folderId
                  ? 'This folder is empty. Create a sheet or upload a file to add it here.'
                  : 'Create your first sheet or upload an Excel file to get started.'}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={handleNew} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-[var(--tenant-primary)] hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)] focus:ring-offset-2 focus:ring-offset-[var(--tenant-bg)]">
                  <PlusIcon className="h-5 w-5" />
                  Create sheet
                </button>
              </div>
            </div>
          ) : viewMode === 'table' ? (
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-300/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
                    <th className="sticky top-0 z-10 w-10 p-3"><input type="checkbox" checked={selectedIds.size === sheets.length && sheets.length > 0} onChange={toggleSelectAll} className="rounded border-slate-300" aria-label="Select all" /></th>
                    <th className="sticky top-0 z-10 p-3 text-xs font-semibold uppercase tracking-wide text-slate-700">Title</th>
                    <th className="sticky top-0 z-10 p-3 text-xs font-semibold uppercase tracking-wide text-slate-700 hidden sm:table-cell">Type</th>
                    <th className="sticky top-0 z-10 p-3 text-xs font-semibold uppercase tracking-wide text-slate-700 hidden lg:table-cell">Tags</th>
                    <th className="sticky top-0 z-10 p-3 text-xs font-semibold uppercase tracking-wide text-slate-700 hidden md:table-cell">Updated</th>
                    <th className="sticky top-0 z-10 w-24 p-3" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {sheets.map((sheet) => (
                    <tr
                      key={sheet._id}
                      className={`group border-b border-slate-100 last:border-0 cursor-pointer transition-colors ${selectedIds.has(sheet._id) ? 'bg-blue-50/70' : 'hover:bg-slate-50/70'}`}
                      onClick={() => handleOpen(sheet._id)}
                      onKeyDown={(e) => handleKeyboardOpen(e, () => handleOpen(sheet._id))}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open sheet ${sheet.title || 'Untitled'}`}
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(sheet._id)} onChange={() => toggleSelect(sheet._id)} className="rounded border-slate-300" />
                      </td>
                      <td className="p-3 text-sm font-medium text-[var(--tenant-text)]">{sheet.title || 'Untitled'}</td>
                      <td className="p-3 text-sm text-slate-700 hidden sm:table-cell">{sheet.type === 'uploaded' ? 'Uploaded' : 'Created'}</td>
                      <td className="p-3 hidden lg:table-cell">
                        <SheetTags tags={sheet.tags} allTags={tags} />
                      </td>
                      <td className="p-3 text-sm text-slate-700 hidden md:table-cell">{sheet.updatedAt ? new Date(sheet.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}</td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={(e) => handleDelete(e, sheet._id)} className="p-2 rounded-lg text-[var(--tenant-muted)] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-red-500 hover:bg-red-500/10 focus-visible:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-opacity" aria-label="Delete"><TrashIcon className="h-5 w-5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-3">
              {sheets.map((sheet) => (
                <article
                  key={sheet._id}
                  className={`group flex items-center gap-4 p-4 rounded-xl border bg-white cursor-pointer transition-all shadow-sm ${selectedIds.has(sheet._id) ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'}`}
                  onClick={() => handleOpen(sheet._id)}
                  onKeyDown={(e) => handleKeyboardOpen(e, () => handleOpen(sheet._id))}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open sheet ${sheet.title || 'Untitled'}`}
                >
                  <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(sheet._id)} onChange={() => toggleSelect(sheet._id)} className="rounded border-[var(--tenant-border)]" />
                  </div>
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[var(--tenant-primary)]">
                    {sheet.type === 'uploaded' ? <DocumentTextIcon className="h-5 w-5" /> : <TableCellsIcon className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--tenant-text)] truncate">{sheet.title || 'Untitled'}</h3>
                    <p className="text-xs text-slate-700 flex items-center gap-2 mt-0.5 flex-wrap">
                      <span>{sheet.type === 'uploaded' ? 'Uploaded' : 'Created'}</span>
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {sheet.updatedAt ? new Date(sheet.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                    </p>
                    <SheetTags tags={sheet.tags} allTags={tags} />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={(e) => handleDelete(e, sheet._id)} className="p-2 rounded-lg text-[var(--tenant-muted)] hover:text-red-500 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/30" aria-label="Delete"><TrashIcon className="h-5 w-5" /></button>
                    <ArrowRightIcon className="h-5 w-5 text-[var(--tenant-muted)]" />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {sheets.map((sheet) => (
                <article
                  key={sheet._id}
                  className={`group flex items-center gap-4 p-4 sm:p-5 rounded-xl border bg-white cursor-pointer transition-all shadow-sm ${selectedIds.has(sheet._id) ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/40 hover:shadow-md'}`}
                  onClick={() => handleOpen(sheet._id)}
                  onKeyDown={(e) => handleKeyboardOpen(e, () => handleOpen(sheet._id))}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open sheet ${sheet.title || 'Untitled'}`}
                >
                  <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(sheet._id)} onChange={() => toggleSelect(sheet._id)} className="rounded border-[var(--tenant-border)]" />
                  </div>
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-[var(--tenant-primary)]">
                    {sheet.type === 'uploaded' ? <DocumentTextIcon className="h-6 w-6" /> : <TableCellsIcon className="h-6 w-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--tenant-text)] truncate">{sheet.title || 'Untitled'}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-slate-700 flex items-center gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        {sheet.updatedAt ? new Date(sheet.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                      </span>
                    </div>
                    <SheetTags tags={sheet.tags} allTags={tags} />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={(e) => handleDelete(e, sheet._id)} className="p-2 rounded-lg text-[var(--tenant-muted)] hover:text-red-500 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/30" aria-label="Delete"><TrashIcon className="h-5 w-5" /></button>
                    <ArrowRightIcon className="h-5 w-5 text-[var(--tenant-muted)]" />
                  </div>
                </article>
              ))}
            </div>
          )}

          {!loading && sheets.length > 0 && pagination.pages > 1 && (
            <div className="mt-6 flex justify-center gap-3">
              <button type="button" disabled={pagination.page <= 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))} className="px-3 py-1.5 rounded-lg border border-[var(--tenant-border)] disabled:opacity-50">Previous</button>
              <span className="px-3 py-1.5 text-sm text-[var(--tenant-muted)]">Page {pagination.page} of {pagination.pages}</span>
              <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))} className="px-3 py-1.5 rounded-lg border border-[var(--tenant-border)] disabled:opacity-50">Next</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SheetsHub;
