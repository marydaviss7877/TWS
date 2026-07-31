import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTenantSlug } from '../../../../../../shared/hooks/useTenantSlug';
import toast from 'react-hot-toast';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  ChevronDownIcon,
  ClockIcon,
  UserPlusIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useTenantAuth } from '../../../../../../app/providers/TenantAuthContext';
import { getTemplateHtml, getTemplateById, TEMPLATE_IDS } from './documentTemplates';
import * as documentHubApi from './documentHubApi';
import './DocumentEditor.css';

const AUTOSAVE_DELAY_MS = 2000;

function isBlockNoteDocument(content) {
  if (content == null) return false;
  if (Array.isArray(content)) return content.length === 0 || (content[0] && typeof content[0].id === 'string' && typeof content[0].type === 'string');
  if (typeof content !== 'string') return false;
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) && (parsed.length === 0 || (parsed[0] && typeof parsed[0].id === 'string' && typeof parsed[0].type === 'string'));
  } catch {
    return false;
  }
}

const DocumentEditor = () => {
  const { user: tenantUser } = useTenantAuth();
  const { id } = useParams();
  const tenantSlug = useTenantSlug();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNew = !id || id === 'new';
  const titleInputRef = useRef(null);
  const [title, setTitle] = useState('');
  const [docId, setDocId] = useState(isNew ? null : id);
  const [status, setStatus] = useState('draft');
  const [saveStatus, setSaveStatus] = useState(null);
  const [initialBlocks, setInitialBlocks] = useState(undefined);
  const [legacyHtml, setLegacyHtml] = useState(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [contentReady, setContentReady] = useState(false);
  const [documentMeta, setDocumentMeta] = useState(null);
  const [comments, setComments] = useState([]);
  const [shares, setShares] = useState([]);
  const [orgUsers, setOrgUsers] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [shareUserId, setShareUserId] = useState('');
  const [sharePermission, setSharePermission] = useState('view');
  const [postingComment, setPostingComment] = useState(false);
  const [updatingAssign, setUpdatingAssign] = useState(false);
  const [addingShare, setAddingShare] = useState(false);
  const loadedRef = useRef(false);
  const initialContentSetRef = useRef(false);
  const autosaveTimerRef = useRef(null);

  const templateId = searchParams.get('template') || TEMPLATE_IDS.BLANK;
  const editor = useCreateBlockNote();
  const currentUserId = tenantUser?._id || tenantUser?.id || null;

  const loadDoc = useCallback(async () => {
    initialContentSetRef.current = false;
    setContentReady(false);
    if (isNew) {
      const template = getTemplateById(templateId);
      const templateHtml = getTemplateHtml(templateId);
      setTitle(template?.id && template.id !== TEMPLATE_IDS.BLANK ? template.name : '');
      setInitialBlocks(undefined);
      setLegacyHtml(templateHtml || null);
      setDocId(null);
      setStatus('draft');
      setDocumentMeta(null);
      loadedRef.current = true;
      return;
    }
    try {
      const doc = await documentHubApi.getDocument(tenantSlug, id);
      if (!doc) {
        toast.error('Document not found');
        navigate(`/${tenantSlug}/org/documents`);
        return;
      }
      if (doc.type === 'uploaded') {
        toast.error('Uploaded files cannot be edited here. Open from the hub to download.');
        navigate(`/${tenantSlug}/org/documents`);
        return;
      }
      setTitle(doc.title || '');
      setDocId(doc._id);
      setStatus(doc.status || 'draft');
      setDocumentMeta({
        createdBy: doc.createdBy,
        ownerId: doc.ownerId,
        assigneeId: doc.assigneeId,
        folderId: doc.folderId,
        tags: doc.tags,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        type: doc.type,
      });
      const content = doc.content;
      if (isBlockNoteDocument(content)) {
        setInitialBlocks(Array.isArray(content) ? content : JSON.parse(content));
        setLegacyHtml(null);
      } else if (typeof content === 'string' && content.trim().startsWith('<')) {
        setInitialBlocks(undefined);
        setLegacyHtml(content);
      } else {
        setInitialBlocks(undefined);
        setLegacyHtml(null);
      }
    } catch (e) {
      toast.error(e.message || 'Failed to load document');
      navigate(`/${tenantSlug}/org/documents`);
      return;
    }
    loadedRef.current = true;
  }, [tenantSlug, id, isNew, templateId, navigate]);

  useEffect(() => {
    loadDoc();
  }, [loadDoc]);

  const fetchComments = useCallback(async () => {
    if (!tenantSlug || !docId) return;
    try {
      const list = await documentHubApi.listComments(tenantSlug, docId);
      setComments(Array.isArray(list) ? list : []);
    } catch {
      setComments([]);
    }
  }, [tenantSlug, docId]);

  const fetchShares = useCallback(async () => {
    if (!tenantSlug || !docId) return;
    try {
      const list = await documentHubApi.listShares(tenantSlug, docId);
      setShares(Array.isArray(list) ? list : []);
    } catch {
      setShares([]);
    }
  }, [tenantSlug, docId]);

  const fetchOrgUsers = useCallback(async () => {
    if (!tenantSlug) return;
    try {
      const list = await documentHubApi.listOrgUsers(tenantSlug);
      setOrgUsers(Array.isArray(list) ? list : []);
    } catch {
      setOrgUsers([]);
    }
  }, [tenantSlug]);

  useEffect(() => {
    if (docId) {
      fetchComments();
      fetchShares();
      fetchOrgUsers();
    } else {
      setComments([]);
      setShares([]);
    }
  }, [docId, fetchComments, fetchShares, fetchOrgUsers]);

  const handleAssign = async (newAssigneeId) => {
    if (!tenantSlug || !docId) return;
    setUpdatingAssign(true);
    try {
      await documentHubApi.updateDocument(tenantSlug, docId, { assigneeId: newAssigneeId || null });
      const user = newAssigneeId ? orgUsers.find((u) => u._id === newAssigneeId) : null;
      setDocumentMeta((m) => (m ? { ...m, assigneeId: user ? { _id: user._id, fullName: user.fullName, email: user.email } : null } : m));
      toast.success(newAssigneeId ? 'Assignee updated' : 'Assignment cleared');
    } catch (e) {
      toast.error(e.message || 'Failed to update assignee');
    } finally {
      setUpdatingAssign(false);
    }
  };

  const handleAddShare = async () => {
    if (!tenantSlug || !docId || !shareUserId) return;
    setAddingShare(true);
    try {
      await documentHubApi.addShare(tenantSlug, docId, shareUserId, sharePermission);
      await fetchShares();
      setShareUserId('');
      toast.success('Document shared');
    } catch (e) {
      toast.error(e.message || 'Failed to share');
    } finally {
      setAddingShare(false);
    }
  };

  const shareExcludedUserIds = new Set([
    currentUserId,
    documentMeta?.ownerId?._id || documentMeta?.ownerId || null,
    documentMeta?.createdBy?._id || documentMeta?.createdBy || null
  ].filter(Boolean).map((v) => String(v)));
  const availableShareUsers = orgUsers.filter((u) => {
    const idStr = String(u?._id || '');
    if (!idStr) return false;
    if (shareExcludedUserIds.has(idStr)) return false;
    if (shares.some((s) => String(s.userId?._id || s.userId) === idStr)) return false;
    return true;
  });

  const handleRemoveShare = async (userId) => {
    if (!tenantSlug || !docId) return;
    try {
      await documentHubApi.removeShare(tenantSlug, docId, userId);
      await fetchShares();
      toast.success('Share removed');
    } catch (e) {
      toast.error(e.message || 'Failed to remove share');
    }
  };

  const handlePostComment = async () => {
    const trimmed = (commentText || '').trim();
    if (!tenantSlug || !docId || !trimmed) return;
    setPostingComment(true);
    try {
      const comment = await documentHubApi.createComment(tenantSlug, docId, trimmed);
      if (comment) setComments((c) => [...c, comment]);
      setCommentText('');
      toast.success('Comment added');
    } catch (e) {
      toast.error(e.message || 'Failed to add comment');
    } finally {
      setPostingComment(false);
    }
  };

  // Normalize to a safe blocks array to avoid Object.entries(null) inside BlockNote
  const safeBlocks = (raw) => (Array.isArray(raw) ? raw : []);

  useEffect(() => {
    if (!editor || initialContentSetRef.current) return;
    const doc = editor.document;
    if (doc == null) return;
    if (Array.isArray(initialBlocks) && initialBlocks.length > 0) {
      try {
        const blocks = safeBlocks(initialBlocks);
        if (blocks.length) editor.replaceBlocks(doc, blocks);
        initialContentSetRef.current = true;
        setContentReady(true);
      } catch (e) {
        console.warn('replaceBlocks (initial) failed', e);
        initialContentSetRef.current = true;
        setContentReady(true);
      }
      return;
    }
    if (initialBlocks && Array.isArray(initialBlocks) && initialBlocks.length === 0) {
      initialContentSetRef.current = true;
      setContentReady(true);
      return;
    }
    // Don't mark ready when legacyHtml is empty if we're still waiting for a template (new doc with template in URL)
    const waitingForTemplate = isNew && templateId && templateId !== TEMPLATE_IDS.BLANK;
    if (!legacyHtml) {
      if (!waitingForTemplate) {
        initialContentSetRef.current = true;
        setContentReady(true);
      }
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const blocks = await editor.tryParseHTMLToBlocks(legacyHtml);
        const arr = !cancelled && blocks ? safeBlocks(blocks) : [];
        if (!cancelled && editor.document != null) {
          try {
            editor.replaceBlocks(editor.document, arr);
          } catch (e) {
            console.warn('replaceBlocks (legacy) failed', e);
          }
        }
        if (!cancelled) {
          initialContentSetRef.current = true;
          setContentReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          initialContentSetRef.current = true;
          setContentReady(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [editor, initialBlocks, legacyHtml, isNew, templateId]);

  const persistSave = useCallback(async () => {
    if (!editor || !tenantSlug) return;
    const content = editor.document;
    const finalTitle = title.trim() || 'Untitled';
    setSaveStatus('saving');
    try {
      if (docId) {
        await documentHubApi.updateDocument(tenantSlug, docId, { title: finalTitle, content });
        setSaveStatus('saved');
      } else {
        const created = await documentHubApi.createDocument(tenantSlug, {
          title: finalTitle,
          templateId: templateId !== TEMPLATE_IDS.BLANK ? templateId : undefined,
          content,
        });
        if (created && created._id) {
          setDocId(created._id);
          setStatus(created.status || 'draft');
          navigate(`/${tenantSlug}/org/documents/${created._id}`, { replace: true });
          setSaveStatus('saved');
        }
      }
    } catch (e) {
      setSaveStatus('error');
      toast.error(e.message || 'Save failed');
    } finally {
      setTimeout(() => setSaveStatus(null), 2000);
    }
  }, [editor, title, docId, tenantSlug, navigate, templateId]);

  const handleSave = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    persistSave();
  }, [persistSave]);

  useEffect(() => {
    if (!editor) return;
    autosaveTimerRef.current = setTimeout(() => {
      persistSave();
      autosaveTimerRef.current = null;
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [editor?.document, title, docId, persistSave]);

  const handleSubmitForReview = useCallback(async () => {
    if (!docId) {
      toast.error('Save the document first');
      handleSave();
      return;
    }
    try {
      await documentHubApi.submitForReview(tenantSlug, docId);
      setStatus('in_review');
      toast.success('Submitted for review');
    } catch (e) {
      toast.error(e.message);
    }
  }, [tenantSlug, docId, handleSave]);

  const getSafeFilename = () =>
    (title.trim() || 'Untitled').replace(/[^a-z0-9-_]/gi, '_');

  const getFullHtml = useCallback(async () => {
    if (!editor) return '';
    const html = await editor.blocksToHTMLLossy(editor.document);
    const finalTitle = (title.trim() || 'Untitled').replace(/[^a-z0-9-_]/gi, '_');
    return [
      '<!DOCTYPE html>',
      '<html><head><meta charset="utf-8"><title>', finalTitle, '</title></head>',
      '<body>', html, '</body></html>'
    ].join('');
  }, [editor, title]);

  const handleDownloadHtml = useCallback(async () => {
    const fullHtml = await getFullHtml();
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getSafeFilename()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded as HTML');
  }, [getFullHtml, getSafeFilename]);

  const handleDownloadWord = useCallback(async () => {
    try {
      const htmlDocx = require('html-docx-js'); // eslint-disable-line global-require
      const api = htmlDocx?.default ?? htmlDocx;
      const fullHtml = await getFullHtml();
      const blob = api.asBlob(fullHtml);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${getSafeFilename()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded as Word (.docx)');
    } catch (err) {
      console.error('Word export failed:', err);
      toast.error('Word download failed. Try downloading as HTML instead.');
    }
  }, [getFullHtml, getSafeFilename]);

  const handleDownloadPdf = useCallback(async () => {
    try {
      const fullHtml = await getFullHtml();
      const wrapper = document.createElement('div');
      wrapper.innerHTML = fullHtml;
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-9999px';
      wrapper.style.width = '210mm';
      wrapper.style.background = '#fff';
      wrapper.style.color = '#000';
      document.body.appendChild(wrapper);

      const html2pdf = require('html2pdf.js'); // eslint-disable-line global-require
      const api = html2pdf?.default ?? html2pdf;
      const filename = `${getSafeFilename()}.pdf`;
      const opt = {
        margin: [10, 10, 10, 10],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      toast.loading('Generating PDF...', { id: 'pdf' });
      await api().set(opt).from(wrapper).save();
      document.body.removeChild(wrapper);
      toast.success('Downloaded as PDF', { id: 'pdf' });
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('PDF download failed. Try HTML or Word.', { id: 'pdf' });
    }
  }, [getFullHtml, getSafeFilename]);

  const fetchVersions = useCallback(async () => {
    if (!docId || !tenantSlug) return;
    try {
      const list = await documentHubApi.listVersions(tenantSlug, docId);
      setVersions(Array.isArray(list) ? list : []);
    } catch {
      setVersions([]);
    }
  }, [tenantSlug, docId]);

  const handleRestoreVersion = useCallback(async (versionId) => {
    if (!docId || !tenantSlug || !editor) return;
    try {
      const doc = await documentHubApi.restoreVersion(tenantSlug, docId, versionId);
      if (!doc) return;
      let blocks = Array.isArray(doc.content) ? doc.content : [];
      if (blocks.length === 0) {
        blocks = await editor.tryParseHTMLToBlocks('<p></p>');
      }
      if (editor.document != null) {
        try {
          editor.replaceBlocks(editor.document, blocks);
        } catch (e) {
          console.warn('replaceBlocks (restore) failed', e);
          toast.error('Could not apply version');
          return;
        }
      }
      setTitle(doc.title || title);
      setVersionDrawerOpen(false);
      toast.success('Version restored');
    } catch (e) {
      toast.error(e.message);
    }
  }, [tenantSlug, docId, editor, title]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  const backUrl = `/${tenantSlug}/org/documents`;

  if (!loadedRef.current && !isNew) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[var(--tenant-bg)] text-[var(--tenant-muted)]">
        Loading…
      </div>
    );
  }

  if (isNew && !contentReady) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-3 bg-[var(--tenant-bg)] text-[var(--tenant-muted)]">
        <div className="h-8 w-8 rounded-full border-2 border-[var(--tenant-primary)] border-t-transparent tws-loading-pulse" aria-hidden />
        <p className="text-sm font-medium">Preparing your document…</p>
      </div>
    );
  }

  return (
    <div className="doc-editor-page min-h-full bg-[var(--tenant-bg)] text-[var(--tenant-text)] flex flex-col">
      <header className="flex-shrink-0 border-b border-[var(--tenant-border)] bg-[var(--tenant-bg-elevated)] shadow-sm">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          {/* Row 1: Back + title (full width on small screens) */}
          <div className="flex items-center gap-2 sm:gap-3 w-full min-w-0">
            <a
              href={backUrl}
              onClick={(e) => { e.preventDefault(); navigate(backUrl); }}
              className="flex items-center justify-center gap-1.5 px-2 py-2 sm:py-1.5 rounded-lg text-[var(--tenant-muted)] hover:text-[var(--tenant-primary)] hover:bg-[var(--tenant-bg)] transition flex-shrink-0"
              aria-label="Back to documents"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span className="font-medium hidden sm:inline">Back</span>
            </a>
            <DocumentTextIcon className="h-5 w-5 text-[var(--tenant-primary)] flex-shrink-0 hidden sm:block" />
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              className="flex-1 min-w-0 w-0 px-3 py-2 rounded-xl border border-[var(--tenant-border)] bg-[var(--tenant-bg)] text-[var(--tenant-text)] placeholder-[var(--tenant-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/50 focus:border-[var(--tenant-primary)] font-medium text-sm sm:text-base"
            />
          </div>
          {/* Row 2: Status + save status + actions (wraps on small screens) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 sm:pl-10">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-[var(--tenant-muted)] font-medium hidden sm:inline">Status:</span>
              <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${
                status === 'draft' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30' :
                status === 'in_review' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30' :
                status === 'approved' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' :
                'bg-gray-500/20 text-gray-700 dark:text-gray-400 border border-gray-500/30'
              }`}>
                {status === 'draft' ? 'Draft' : status === 'in_review' ? 'In Review' : status === 'approved' ? 'Approved' : 'Archived'}
              </span>
            </div>
            {saveStatus === 'saving' && <span className="text-xs text-[var(--tenant-muted)] flex-shrink-0">Saving…</span>}
            {saveStatus === 'saved' && <span className="text-xs text-emerald-600 flex-shrink-0">Saved</span>}
            {saveStatus === 'error' && <span className="text-xs text-red-500 flex-shrink-0">Error</span>}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {status === 'draft' && (
                <button
                  type="button"
                  onClick={handleSubmitForReview}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-medium border border-[var(--tenant-border)] bg-[var(--tenant-bg)] hover:bg-[var(--tenant-bg-elevated)] transition text-sm sm:text-base"
                  title="Submit for review"
                >
                  <span className="hidden sm:inline">Submit for review</span>
                  <span className="sm:hidden" aria-hidden>Submit</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold bg-[var(--tenant-primary)] text-white hover:opacity-95 shadow-sm transition text-sm sm:text-base"
                title="Save"
                aria-label="Save document"
              >
                <DocumentTextIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="hidden sm:inline">Save</span>
              </button>
              {docId && (
                <button
                  type="button"
                  onClick={() => { setVersionDrawerOpen(true); fetchVersions(); }}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-medium border border-[var(--tenant-border)] bg-[var(--tenant-bg)] hover:bg-[var(--tenant-bg-elevated)] transition"
                  title="Version history"
                  aria-label="Version history"
                >
                  <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="hidden md:inline">History</span>
                </button>
              )}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDownloadOpen((o) => !o)}
                  onBlur={() => setTimeout(() => setDownloadOpen(false), 150)}
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-medium border border-[var(--tenant-border)] bg-[var(--tenant-bg)] hover:bg-[var(--tenant-bg-elevated)] transition"
                  title="Download"
                  aria-label="Download document"
                  aria-expanded={downloadOpen}
                >
                  <ArrowDownTrayIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="hidden md:inline">Download</span>
                  <ChevronDownIcon className={`h-4 w-4 flex-shrink-0 transition ${downloadOpen ? 'rotate-180' : ''}`} />
                </button>
                {downloadOpen && (
                  <div className="absolute right-0 mt-1 py-1 min-w-[11rem] sm:w-52 rounded-xl border border-[var(--tenant-border)] bg-[var(--tenant-bg-elevated)] shadow-xl z-20">
                    <button type="button" className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--tenant-bg)] flex items-center gap-2 rounded-t-xl" onClick={() => { handleDownloadHtml(); setDownloadOpen(false); }}>
                      <DocumentArrowDownIcon className="h-4 w-4 flex-shrink-0" />
                      As HTML
                    </button>
                    <button type="button" className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--tenant-bg)] flex items-center gap-2" onClick={() => { handleDownloadWord(); setDownloadOpen(false); }}>
                      <DocumentArrowDownIcon className="h-4 w-4 flex-shrink-0" />
                      As Word (.docx)
                    </button>
                    <button type="button" className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--tenant-bg)] flex items-center gap-2 rounded-b-xl" onClick={() => { handleDownloadPdf(); setDownloadOpen(false); }}>
                      <DocumentArrowDownIcon className="h-4 w-4 flex-shrink-0" />
                      As PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Main editor - 70% */}
        <div className="flex-1 overflow-auto lg:w-[70%]">
          <div className="doc-editor-blocknote-wrapper">
            {editor && (
              <BlockNoteView
                editor={editor}
                theme="light"
                data-theme="light"
                className="doc-blocknote-editor"
              />
            )}
          </div>
        </div>

        {/* Right sidebar - 30% */}
        <aside className="hidden lg:block flex-shrink-0 w-[30%] border-l border-[var(--tenant-border)] bg-[var(--tenant-bg-elevated)] overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Metadata Panel */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--tenant-muted)] mb-3">Metadata</h3>
              <div className="space-y-2 text-sm">
                {documentMeta?.createdBy && (
                  <div>
                    <span className="text-[var(--tenant-muted)]">Owner:</span>
                    <span className="ml-2 text-[var(--tenant-text)] font-medium">
                      {documentMeta.createdBy.fullName || documentMeta.createdBy.email || 'Unknown'}
                    </span>
                  </div>
                )}
                {documentMeta?.assigneeId && (
                  <div>
                    <span className="text-[var(--tenant-muted)]">Assigned to:</span>
                    <span className="ml-2 text-[var(--tenant-text)] font-medium">
                      {documentMeta.assigneeId.fullName || documentMeta.assigneeId.email || 'Unknown'}
                    </span>
                  </div>
                )}
                {documentMeta?.createdAt && (
                  <div>
                    <span className="text-[var(--tenant-muted)]">Created:</span>
                    <span className="ml-2 text-[var(--tenant-text)]">
                      {new Date(documentMeta.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </span>
                  </div>
                )}
                {documentMeta?.updatedAt && (
                  <div>
                    <span className="text-[var(--tenant-muted)]">Updated:</span>
                    <span className="ml-2 text-[var(--tenant-text)]">
                      {new Date(documentMeta.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </span>
                  </div>
                )}
                {documentMeta?.type && (
                  <div>
                    <span className="text-[var(--tenant-muted)]">Type:</span>
                    <span className="ml-2 text-[var(--tenant-text)] capitalize">{documentMeta.type}</span>
                  </div>
                )}
                {documentMeta?.folderId && (
                  <div>
                    <span className="text-[var(--tenant-muted)]">Folder:</span>
                    <span className="ml-2 text-[var(--tenant-text)]">{documentMeta.folderId?.name || '—'}</span>
                  </div>
                )}
                {documentMeta?.tags && documentMeta.tags.length > 0 && (
                  <div>
                    <span className="text-[var(--tenant-muted)]">Tags:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {documentMeta.tags.map((tag, idx) => (
                        <span key={idx} className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)]">
                          {typeof tag === 'string' ? tag : (tag?.name || tag?._id || 'Tag')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {!documentMeta && (
                  <p className="text-xs text-[var(--tenant-muted)]">Save document to see metadata</p>
                )}
              </div>
            </div>

            {/* Approval Flow Panel */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--tenant-muted)] mb-3">Approval Flow</h3>
              <div className="space-y-2">
                <div className={`flex items-center gap-2 text-sm ${status === 'draft' ? 'text-[var(--tenant-text)] font-semibold' : 'text-[var(--tenant-muted)]'}`}>
                  <div className={`w-2 h-2 rounded-full ${status === 'draft' ? 'bg-yellow-500' : status === 'in_review' || status === 'approved' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  <span>Draft</span>
                </div>
                <div className="ml-2 h-4 w-px bg-[var(--tenant-border)]" />
                <div className={`flex items-center gap-2 text-sm ${status === 'in_review' ? 'text-[var(--tenant-text)] font-semibold' : 'text-[var(--tenant-muted)]'}`}>
                  <div className={`w-2 h-2 rounded-full ${status === 'in_review' ? 'bg-blue-500' : status === 'approved' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  <span>In Review</span>
                </div>
                <div className="ml-2 h-4 w-px bg-[var(--tenant-border)]" />
                <div className={`flex items-center gap-2 text-sm ${status === 'approved' ? 'text-[var(--tenant-text)] font-semibold' : 'text-[var(--tenant-muted)]'}`}>
                  <div className={`w-2 h-2 rounded-full ${status === 'approved' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  <span>Approved</span>
                </div>
              </div>
            </div>

            {/* Assign / Share Panel */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--tenant-muted)] mb-3 flex items-center gap-2">
                <UserPlusIcon className="h-4 w-4" />
                Assign & Share
              </h3>
              {docId ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--tenant-muted)] mb-1">Assign to</label>
                    <select
                      value={documentMeta?.assigneeId?._id || ''}
                      onChange={(e) => handleAssign(e.target.value || null)}
                      disabled={updatingAssign}
                      className="w-full rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-bg)] text-[var(--tenant-text)] text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/50 disabled:opacity-50"
                    >
                      <option value="">No one</option>
                      {orgUsers.map((u) => (
                        <option key={u._id} value={u._id}>{u.fullName || u.email || u._id}</option>
                      ))}
                    </select>
                    {documentMeta?.assigneeId && (
                      <p className="mt-1 text-xs text-[var(--tenant-muted)]">
                        Assigned to {documentMeta.assigneeId.fullName || documentMeta.assigneeId.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--tenant-muted)] mb-1">Share with</label>
                    <div className="flex gap-2 flex-wrap">
                      <select
                        value={shareUserId}
                        onChange={(e) => setShareUserId(e.target.value)}
                        className="flex-1 min-w-0 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-bg)] text-[var(--tenant-text)] text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/50"
                      >
                        <option value="">Select user</option>
                        {availableShareUsers.map((u) => (
                          <option key={u._id} value={u._id}>{u.fullName || u.email}</option>
                        ))}
                      </select>
                      <select
                        value={sharePermission}
                        onChange={(e) => setSharePermission(e.target.value)}
                        className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-bg)] text-[var(--tenant-text)] text-sm px-3 py-2 w-20"
                      >
                        <option value="view">View</option>
                        <option value="edit">Edit</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddShare}
                        disabled={!shareUserId || addingShare}
                        className="rounded-lg px-3 py-2 text-sm font-medium bg-[var(--tenant-primary)] text-white disabled:opacity-50"
                      >
                        {addingShare ? '…' : 'Add'}
                      </button>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {shares.map((s) => (
                        <li key={s.userId?._id || s._id} className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded bg-[var(--tenant-bg)]">
                          <span className="text-[var(--tenant-text)] truncate">{s.userId?.fullName || s.userId?.email || 'User'}</span>
                          <span className="text-xs text-[var(--tenant-muted)] capitalize">{s.permission}</span>
                          <button type="button" onClick={() => handleRemoveShare(s.userId?._id)} className="p-1 rounded text-[var(--tenant-muted)] hover:text-red-500 hover:bg-red-500/10" aria-label="Remove share">
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--tenant-muted)]">Save the document first to assign or share.</p>
              )}
            </div>

            {/* Comments Panel */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--tenant-muted)] mb-3 flex items-center gap-2">
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                Comments
              </h3>
              {docId ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment…"
                      rows={2}
                      className="flex-1 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-bg)] text-[var(--tenant-text)] text-sm px-3 py-2 placeholder-[var(--tenant-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/50 resize-none"
                    />
                    <button
                      type="button"
                      onClick={handlePostComment}
                      disabled={!commentText.trim() || postingComment}
                      className="self-end rounded-lg px-3 py-2 text-sm font-medium bg-[var(--tenant-primary)] text-white disabled:opacity-50 shrink-0"
                    >
                      {postingComment ? '…' : 'Post'}
                    </button>
                  </div>
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {comments.length === 0 ? (
                      <li className="text-xs text-[var(--tenant-muted)] py-2">No comments yet.</li>
                    ) : (
                      comments.map((c) => (
                        <li key={c._id} className="rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-bg)] p-2 text-sm">
                          <p className="font-medium text-[var(--tenant-text)]">{c.userId?.fullName || c.userId?.email || 'Someone'}</p>
                          <p className="text-[var(--tenant-text)] mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>
                          <p className="text-xs text-[var(--tenant-muted)] mt-1">
                            {c.createdAt ? new Date(c.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : ''}
                          </p>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-[var(--tenant-muted)]">Save the document first to add comments.</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {versionDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Version history">
          <div className="absolute inset-0 bg-black/50" onClick={() => setVersionDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-[var(--tenant-bg-elevated)] border-l border-[var(--tenant-border)] shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--tenant-border)]">
              <h2 className="text-lg font-semibold text-[var(--tenant-text)]">Version history</h2>
              <button type="button" onClick={() => setVersionDrawerOpen(false)} className="p-2 rounded-lg text-[var(--tenant-muted)] hover:bg-[var(--tenant-bg)]" aria-label="Close">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {versions.length === 0 ? (
                <p className="text-sm text-[var(--tenant-muted)]">No previous versions.</p>
              ) : (
                <ul className="space-y-2">
                  {versions.map((v) => (
                    <li key={v._id} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-[var(--tenant-border)] bg-[var(--tenant-bg)]">
                      <div>
                        <p className="text-sm font-medium text-[var(--tenant-text)]">Version {v.versionNumber}</p>
                        <p className="text-xs text-[var(--tenant-muted)]">
                          {v.createdAt ? new Date(v.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          {v.createdBy?.fullName && ` · ${v.createdBy.fullName}`}
                        </p>
                      </div>
                      <button type="button" onClick={() => handleRestoreVersion(v._id)} className="text-sm text-[var(--tenant-primary)] hover:underline">Restore</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentEditor;
