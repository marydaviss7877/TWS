import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowRightIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  LightBulbIcon,
  ScaleIcon,
  UserGroupIcon,
  BriefcaseIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  ArrowUpTrayIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  TableCellsIcon,
  CheckCircleIcon,
  ClockIcon,
  ArchiveBoxIcon,
  FolderIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { DOCUMENT_TEMPLATES, TEMPLATE_IDS } from './documentTemplates';
import * as documentHubApi from './documentHubApi';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';

const TEMPLATE_ICONS = {
  document: DocumentTextIcon,
  lightbulb: LightBulbIcon,
  scale: ScaleIcon,
  users: UserGroupIcon,
  briefcase: BriefcaseIcon,
  'clipboard-document-list': ClipboardDocumentListIcon,
  banknotes: BanknotesIcon,
};

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In review' },
  { value: 'approved', label: 'Approved' },
  { value: 'archived', label: 'Archived' },
];

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

function StatusBadge({ status }) {
  const map = {
    draft: { label: 'Draft', className: 'border border-amber-200 bg-amber-50 text-amber-700' },
    in_review: { label: 'In review', className: 'border border-sky-200 bg-sky-50 text-sky-700' },
    approved: { label: 'Approved', className: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
    archived: { label: 'Archived', className: 'border border-slate-300 bg-slate-100 text-slate-700' },
  };
  const s = map[status] || map.draft;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

function DocumentTags({ tags, allTags }) {
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

const DocumentsHub = () => {
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState(TEMPLATE_IDS.BLANK);
  const [uploading, setUploading] = useState(false);
  const [uploadInputKey, setUploadInputKey] = useState(0);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
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
  const modalCloseRef = React.useRef(null);

  const fetchDocuments = useCallback(async () => {
    if (!tenantSlug) return;
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.page,
        limit: 20,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        folderId: folderId || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        sort,
        order,
      };
      const res = await documentHubApi.listDocuments(tenantSlug, params);
      setDocuments(res.data?.documents ?? []);
      setPagination(res.data?.pagination ?? { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (e) {
      setError(e.message || 'Failed to load documents');
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, search, statusFilter, typeFilter, folderId, selectedTags, sort, order, pagination.page]);

  const fetchFoldersAndTags = useCallback(async () => {
    if (!tenantSlug) return;
    try {
      const [foldersRes, tagsRes] = await Promise.all([
        documentHubApi.listFolders(tenantSlug),
        documentHubApi.listTags(tenantSlug),
      ]);
      setFolders(Array.isArray(foldersRes) ? foldersRes : (foldersRes?.data?.folders ?? []));
      setTags(Array.isArray(tagsRes) ? tagsRes : (tagsRes?.data?.tags ?? []));
    } catch {
      // non-blocking
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    fetchFoldersAndTags();
  }, [fetchFoldersAndTags]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (search) next.set('search', search); else next.delete('search');
    if (statusFilter) next.set('status', statusFilter); else next.delete('status');
    if (typeFilter) next.set('type', typeFilter); else next.delete('type');
    if (folderId) next.set('folderId', folderId); else next.delete('folderId');
    if (selectedTags.length > 0) next.set('tags', selectedTags.join(',')); else next.delete('tags');
    next.set('sort', sort);
    next.set('order', order);
    if (viewMode !== 'grid') next.set('view', viewMode); else next.delete('view');
    setSearchParams(next, { replace: true });
  }, [search, statusFilter, typeFilter, folderId, selectedTags, sort, order, viewMode]);

  const handleNewFromTemplate = (templateId) => {
    setTemplateModalOpen(false);
    const query = templateId && templateId !== TEMPLATE_IDS.BLANK ? `?template=${encodeURIComponent(templateId)}` : '';
    navigate(`/${tenantSlug}/org/documents/new${query}`);
  };

  const handleOpen = (id) => navigate(`/${tenantSlug}/org/documents/${id}`);
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await documentHubApi.deleteDocument(tenantSlug, id);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
      setSelectedIds((s) => { const n = new Set(s); n.delete(id); return n; });
      toast.success('Document deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      for (const id of selectedIds) {
        await documentHubApi.deleteDocument(tenantSlug, id);
      }
      setDocuments((prev) => prev.filter((d) => !selectedIds.has(d._id)));
      setSelectedIds(new Set());
      toast.success('Documents deleted');
      fetchDocuments();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const doc = await documentHubApi.uploadDocument(tenantSlug, file, { title: file.name });
      setDocuments((prev) => [doc, ...prev]);
      setUploadInputKey((k) => k + 1);
      toast.success('File uploaded');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
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
    if (selectedIds.size === documents.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(documents.map((d) => d._id)));
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
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
      const folder = await documentHubApi.createFolder(tenantSlug, name, null, 'org');
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
      const tag = await documentHubApi.createTag(tenantSlug, name);
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
    if (!window.confirm(`Delete folder "${folderName}"? Documents in this folder won't be deleted, but the folder will be removed.`)) return;
    setDeletingFolderId(folderIdToDelete);
    try {
      await documentHubApi.deleteFolder(tenantSlug, folderIdToDelete);
      setFolders((prev) => prev.filter((f) => f._id !== folderIdToDelete));
      if (folderId === folderIdToDelete) setFolderId('');
      toast.success('Folder deleted');
      fetchFoldersAndTags();
      fetchDocuments();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeletingFolderId(null);
    }
  };

  const handleDeleteTag = async (tagId, tagName) => {
    if (!window.confirm(`Delete tag "${tagName}"? This will remove the tag from all documents.`)) return;
    setDeletingTagId(tagId);
    try {
      await documentHubApi.deleteTag(tenantSlug, tagId);
      setTags((prev) => prev.filter((t) => t._id !== tagId));
      setSelectedTags((prev) => prev.filter((id) => id !== tagId));
      toast.success('Tag deleted');
      fetchFoldersAndTags();
      fetchDocuments();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeletingTagId(null);
    }
  };

  useEffect(() => {
    if (!templateModalOpen) return;
    setSelectedDocumentType(TEMPLATE_IDS.BLANK);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [templateModalOpen]);

  // Move focus into modal when it opens to avoid aria-hidden on focused element
  useEffect(() => {
    if (templateModalOpen && modalCloseRef.current) {
      const t = setTimeout(() => modalCloseRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [templateModalOpen]);

  const hasFilters = search || statusFilter || typeFilter || folderId || selectedTags.length > 0;

  return (
    <div className="min-h-full bg-slate-50 text-[var(--tenant-text)]">
      <header className="border-b border-[var(--tenant-border)] bg-[var(--tenant-bg-elevated)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--tenant-text)]">
                Documents
              </h1>
              <p className="mt-2 text-sm text-[var(--tenant-muted)]">
                Create and manage proposals, contracts, meeting notes—save or export as HTML, Word, or PDF.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium border border-[var(--tenant-border)] bg-[var(--tenant-bg)] hover:bg-[var(--tenant-bg-elevated)] transition cursor-pointer disabled:opacity-50">
                <input
                  type="file"
                  key={uploadInputKey}
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*,.txt,.zip,.rar"
                  onChange={handleUpload}
                  disabled={uploading}
                />
                <ArrowUpTrayIcon className="h-5 w-5" />
                {uploading ? 'Uploading…' : 'Upload'}
              </label>
              <button
               
                type="button"
                onClick={() => setTemplateModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-[var(--tenant-primary)] shadow-sm hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)] focus:ring-offset-2 focus:ring-offset-[var(--tenant-bg)] shrink-0"
              >
                <PlusIcon className="h-5 w-5" />
                New document
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Left sidebar - Status quick links + Folders */}
        <aside className="flex-shrink-0 w-56 mr-6 sm:mr-8 hidden sm:block">
          <div className="sticky top-4 space-y-3">
            {/* Documents section - Status quick links */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--tenant-muted)] px-2 py-1.5 flex items-center gap-2">
                <DocumentTextIcon className="h-4 w-4" />
                Documents
              </h2>
              <nav className="mt-2 space-y-1" aria-label="Browse by status">
                <button
                  type="button"
                  onClick={() => { setStatusFilter(''); setFolderId(''); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm font-medium transition ${!statusFilter && !folderId ? 'bg-[var(--tenant-primary)]/15 text-[var(--tenant-primary)]' : 'text-[var(--tenant-text)] hover:bg-slate-50'}`}
                >
                  <DocumentTextIcon className="h-4 w-4 flex-shrink-0" />
                  All Documents
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('in_review'); setFolderId(''); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm font-medium transition ${statusFilter === 'in_review' && !folderId ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-[var(--tenant-text)] hover:bg-slate-50'}`}
                >
                  <ClockIcon className="h-4 w-4 flex-shrink-0" />
                  Awaiting My Approval
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('draft'); setFolderId(''); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm font-medium transition ${statusFilter === 'draft' && !folderId ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'text-[var(--tenant-text)] hover:bg-slate-50'}`}
                >
                  <PencilSquareIcon className="h-4 w-4 flex-shrink-0" />
                  Drafts
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('approved'); setFolderId(''); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm font-medium transition ${statusFilter === 'approved' && !folderId ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-[var(--tenant-text)] hover:bg-slate-50'}`}
                >
                  <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
                  Approved
                </button>
                <button
                  type="button"
                  onClick={() => { setStatusFilter('archived'); setFolderId(''); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm font-medium transition ${statusFilter === 'archived' && !folderId ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'text-[var(--tenant-text)] hover:bg-slate-50'}`}
                >
                  <ArchiveBoxIcon className="h-4 w-4 flex-shrink-0" />
                  Archived
                </button>
              </nav>
            </div>

            {/* Folders section */}
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
                  <DocumentTextIcon className="h-4 w-4 flex-shrink-0" />
                  All Documents
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
        {/* Filters bar */}
        <div className="mb-6 space-y-4">
          {/* Mobile: Status quick links + folder chips */}
          <div className="sm:hidden space-y-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1">
              <span className="text-xs text-[var(--tenant-muted)] flex-shrink-0 font-medium">Status:</span>
              <button type="button" onClick={() => { setStatusFilter(''); setFolderId(''); }} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium ${!statusFilter && !folderId ? 'bg-[var(--tenant-primary)] text-white' : 'bg-white text-[var(--tenant-text)] border border-slate-200'}`}>All</button>
              <button type="button" onClick={() => { setStatusFilter('in_review'); setFolderId(''); }} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium ${statusFilter === 'in_review' && !folderId ? 'bg-blue-500 text-white' : 'bg-white text-[var(--tenant-text)] border border-slate-200'}`}>Awaiting</button>
              <button type="button" onClick={() => { setStatusFilter('draft'); setFolderId(''); }} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium ${statusFilter === 'draft' && !folderId ? 'bg-amber-500 text-white' : 'bg-white text-[var(--tenant-text)] border border-slate-200'}`}>Drafts</button>
              <button type="button" onClick={() => { setStatusFilter('approved'); setFolderId(''); }} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium ${statusFilter === 'approved' && !folderId ? 'bg-emerald-500 text-white' : 'bg-white text-[var(--tenant-text)] border border-slate-200'}`}>Approved</button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1">
              <span className="text-xs text-[var(--tenant-muted)] flex-shrink-0 font-medium">Folders:</span>
              <button type="button" onClick={() => setFolderId('')} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium ${!folderId ? 'bg-[var(--tenant-primary)] text-white' : 'bg-white text-[var(--tenant-text)] border border-slate-200'}`}>All</button>
              {folders.map((f) => (
                <button key={f._id} type="button" onClick={() => setFolderId(f._id)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium truncate max-w-[140px] ${folderId === f._id ? 'bg-[var(--tenant-primary)] text-white' : 'bg-white text-[var(--tenant-text)] border border-slate-200'}`} title={f.name}>{f.name}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--tenant-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-[var(--tenant-text)] placeholder-[var(--tenant-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/30 focus:border-[var(--tenant-primary)] focus-visible:ring-2 focus-visible:ring-[var(--tenant-primary)]/30 transition"
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
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white text-[var(--tenant-text)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/30">
                {STATUS_OPTIONS.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
              </select>
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
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center">
            <div className="w-14 h-14 rounded-xl bg-[var(--tenant-primary)]/10 flex items-center justify-center text-[var(--tenant-primary)] mb-4">
              <DocumentTextIcon className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--tenant-text)]">
              {folderId ? 'No documents in this folder' : statusFilter ? `No ${statusFilter === 'in_review' ? 'documents awaiting approval' : statusFilter === 'draft' ? 'drafts' : statusFilter === 'approved' ? 'approved documents' : statusFilter === 'archived' ? 'archived documents' : 'documents'} yet` : 'No documents yet'}
            </h2>
            <p className="mt-1 text-sm text-[var(--tenant-muted)] max-w-xs">
              {folderId
                ? 'This folder is empty. Create a document or upload a file to add it here.'
                : 'Create your first document or upload a file to get started.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => setTemplateModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-[var(--tenant-primary)] hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)] focus:ring-offset-2 focus:ring-offset-[var(--tenant-bg)]">
                <PlusIcon className="h-5 w-5" />
                Create document
              </button>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-300/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
                  <th className="sticky top-0 z-10 w-10 p-3"><input type="checkbox" checked={selectedIds.size === documents.length} onChange={toggleSelectAll} className="rounded border-slate-300" aria-label="Select all" /></th>
                  <th className="sticky top-0 z-10 p-3 text-xs font-semibold uppercase tracking-wide text-slate-700">Title</th>
                  <th className="sticky top-0 z-10 p-3 text-xs font-semibold uppercase tracking-wide text-slate-700 hidden sm:table-cell">Type</th>
                  <th className="sticky top-0 z-10 p-3 text-xs font-semibold uppercase tracking-wide text-slate-700 hidden sm:table-cell">Status</th>
                  <th className="sticky top-0 z-10 p-3 text-xs font-semibold uppercase tracking-wide text-slate-700 hidden lg:table-cell">Tags</th>
                  <th className="sticky top-0 z-10 p-3 text-xs font-semibold uppercase tracking-wide text-slate-700 hidden md:table-cell">Updated</th>
                  <th className="sticky top-0 z-10 w-24 p-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc._id}
                    className={`group border-b border-slate-100 last:border-0 cursor-pointer transition-colors ${selectedIds.has(doc._id) ? 'bg-blue-50/70' : 'hover:bg-slate-50/70'}`}
                    onClick={() => handleOpen(doc._id)}
                    onKeyDown={(e) => handleKeyboardOpen(e, () => handleOpen(doc._id))}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open document ${doc.title || 'Untitled'}`}
                  >
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(doc._id)} onChange={() => toggleSelect(doc._id)} className="rounded border-slate-300" />
                    </td>
                    <td className="p-3 text-sm font-medium text-[var(--tenant-text)]">{doc.title || 'Untitled'}</td>
                    <td className="p-3 text-sm text-slate-700 hidden sm:table-cell">{doc.type === 'uploaded' ? 'Uploaded' : 'Created'}</td>
                    <td className="p-3 hidden sm:table-cell"><StatusBadge status={doc.status} /></td>
                    <td className="p-3 hidden lg:table-cell">
                      <DocumentTags tags={doc.tags} allTags={tags} />
                    </td>
                    <td className="p-3 text-sm text-slate-700 hidden md:table-cell">{doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}</td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={(e) => handleDelete(e, doc._id)} className="p-2 rounded-lg text-[var(--tenant-muted)] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-red-500 hover:bg-red-500/10 focus-visible:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-opacity" aria-label="Delete"><TrashIcon className="h-5 w-5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {documents.map((doc) => (
              <article
                key={doc._id}
                className={`group flex items-center gap-4 p-4 rounded-xl border bg-white cursor-pointer transition-all shadow-sm ${selectedIds.has(doc._id) ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'}`}
                onClick={() => handleOpen(doc._id)}
                onKeyDown={(e) => handleKeyboardOpen(e, () => handleOpen(doc._id))}
                tabIndex={0}
                role="button"
                aria-label={`Open document ${doc.title || 'Untitled'}`}
              >
                <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.has(doc._id)} onChange={() => toggleSelect(doc._id)} className="rounded border-[var(--tenant-border)]" />
                </div>
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[var(--tenant-primary)]">
                  {doc.type === 'uploaded' ? <DocumentTextIcon className="h-5 w-5" /> : <PencilSquareIcon className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--tenant-text)] truncate">{doc.title || 'Untitled'}</h3>
                  <p className="text-xs text-slate-700 flex items-center gap-2 mt-0.5 flex-wrap">
                    <StatusBadge status={doc.status} />
                    <span>{doc.type === 'uploaded' ? 'Uploaded' : 'Created'}</span>
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                  </p>
                  <DocumentTags tags={doc.tags} allTags={tags} />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={(e) => handleDelete(e, doc._id)} className="p-2 rounded-lg text-[var(--tenant-muted)] hover:text-red-500 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/30" aria-label="Delete"><TrashIcon className="h-5 w-5" /></button>
                  <ArrowRightIcon className="h-5 w-5 text-[var(--tenant-muted)]" />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {documents.map((doc) => (
              <article
                key={doc._id}
                className={`group flex items-center gap-4 p-4 sm:p-5 rounded-xl border bg-white cursor-pointer transition-all shadow-sm ${selectedIds.has(doc._id) ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/40 hover:shadow-md'}`}
                onClick={() => handleOpen(doc._id)}
                onKeyDown={(e) => handleKeyboardOpen(e, () => handleOpen(doc._id))}
                tabIndex={0}
                role="button"
                aria-label={`Open document ${doc.title || 'Untitled'}`}
              >
                <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.has(doc._id)} onChange={() => toggleSelect(doc._id)} className="rounded border-[var(--tenant-border)]" />
                </div>
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-[var(--tenant-primary)]">
                  {doc.type === 'uploaded' ? <DocumentTextIcon className="h-6 w-6" /> : <PencilSquareIcon className="h-6 w-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--tenant-text)] truncate">{doc.title || 'Untitled'}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <StatusBadge status={doc.status} />
                    <span className="text-xs text-slate-700 flex items-center gap-1.5">
                      <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
                      {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                    </span>
                  </div>
                  <DocumentTags tags={doc.tags} allTags={tags} />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={(e) => handleDelete(e, doc._id)} className="p-2 rounded-lg text-[var(--tenant-muted)] hover:text-red-500 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/30" aria-label="Delete"><TrashIcon className="h-5 w-5" /></button>
                  <ArrowRightIcon className="h-5 w-5 text-[var(--tenant-muted)]" />
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && documents.length > 0 && pagination.pages > 1 && (
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" disabled={pagination.page <= 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))} className="px-3 py-1.5 rounded-lg border border-[var(--tenant-border)] disabled:opacity-50">Previous</button>
            <span className="px-3 py-1.5 text-sm text-[var(--tenant-muted)]">Page {pagination.page} of {pagination.pages}</span>
            <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))} className="px-3 py-1.5 rounded-lg border border-[var(--tenant-border)] disabled:opacity-50">Next</button>
          </div>
        )}
      </main>
      </div>

      {templateModalOpen && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4 backdrop-blur-md" style={{ zIndex: 10000, backgroundColor: 'rgba(0, 0, 0, 0.2)', isolation: 'isolate' }} onClick={() => setTemplateModalOpen(false)} role="dialog" aria-modal="true" aria-labelledby="template-modal-title">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden" style={{ zIndex: 10001, position: 'relative', backgroundColor: 'var(--tenant-bg-elevated)', border: '1px solid var(--tenant-border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-shrink-0 justify-between items-start px-8 pt-8 pb-6 border-b border-[var(--tenant-border)]/50 bg-gradient-to-br from-[var(--tenant-primary)]/8 via-[var(--tenant-primary)]/4 to-transparent">
              <div className="flex-1 pr-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--tenant-primary)] to-[var(--tenant-primary)]/80 mb-4 shadow-lg">
                  <PlusIcon className="h-6 w-6 text-white" />
                </div>
                <h2 id="template-modal-title" className="text-3xl font-bold text-[var(--tenant-text)] mb-2 tracking-tight">
                  Create New Document
                </h2>
                <p className="mt-1 text-sm text-[var(--tenant-muted)]">Choose a document type or template below. You’ll open the editor to write and save.</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label htmlFor="create-doc-type" className="text-sm font-medium text-[var(--tenant-text)]">Document type</label>
                  <select
                    id="create-doc-type"
                    value={selectedDocumentType}
                    onChange={(e) => setSelectedDocumentType(e.target.value)}
                    className="rounded-xl border border-[var(--tenant-border)] bg-[var(--tenant-bg)] text-[var(--tenant-text)] px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/50 focus:border-[var(--tenant-primary)] min-w-[200px]"
                  >
                    {DOCUMENT_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleNewFromTemplate(selectedDocumentType)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-[var(--tenant-primary)] text-white hover:opacity-95 shadow-sm transition"
                  >
                    Create document
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <button ref={modalCloseRef} type="button" onClick={() => setTemplateModalOpen(false)} className="flex-shrink-0 p-2.5 rounded-xl text-[var(--tenant-muted)] hover:bg-[var(--tenant-bg)] hover:text-[var(--tenant-text)] transition-all duration-200 hover:scale-110" aria-label="Close"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-8 py-8">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {DOCUMENT_TEMPLATES.map((t, index) => {
                  const Icon = TEMPLATE_ICONS[t.icon] || DocumentTextIcon;
                  const isBlank = t.id === TEMPLATE_IDS.BLANK;
                  const isSelected = t.id === selectedDocumentType;
                  return (
                    <button 
                      key={t.id} 
                      type="button" 
                      onClick={() => handleNewFromTemplate(t.id)} 
                      className={`group relative flex flex-col gap-4 p-6 rounded-2xl text-left w-full border bg-[var(--tenant-bg)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/50 focus:ring-offset-2 focus:ring-offset-[var(--tenant-bg-elevated)] transform hover:-translate-y-1 ${isSelected ? 'border-[var(--tenant-primary)] ring-2 ring-[var(--tenant-primary)]/30 shadow-lg shadow-[var(--tenant-primary)]/10' : 'border-[var(--tenant-border)]/60 hover:border-[var(--tenant-primary)]/60 hover:bg-gradient-to-br hover:from-[var(--tenant-primary)]/8 hover:via-[var(--tenant-primary)]/4 hover:to-transparent hover:shadow-xl hover:shadow-[var(--tenant-primary)]/10'}`}
                    >
                      <div className={`relative flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center ${isBlank ? 'bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700' : 'bg-gradient-to-br from-[var(--tenant-primary)] via-[var(--tenant-primary)]/90 to-[var(--tenant-primary)]/80'} text-white shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                        <Icon className="h-8 w-8" />
                        <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <span className="block font-bold text-lg text-[var(--tenant-text)] group-hover:text-[var(--tenant-primary)] transition-colors duration-200">
                          {t.name}
                        </span>
                        <p className="text-sm text-[var(--tenant-muted)] leading-relaxed line-clamp-2">
                          {t.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-[var(--tenant-primary)] opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-0 group-hover:translate-x-1">
                        <span>Create document</span>
                        <ArrowRightIcon className="h-4 w-4" />
                      </div>
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DocumentsHub;
