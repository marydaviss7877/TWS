/**
 * Document Hub – API client for org documents
 * Backend mounts document routes under /organization/documents.
 */

const base = (tenantSlug) => `/api/tenant/${tenantSlug}/organization/documents`;

function getOptions(method, body = null) {
  const opts = { method, credentials: 'include', headers: {} };
  if (body && method !== 'GET') {
    if (body instanceof FormData) {
      opts.body = body;
      // do not set Content-Type for FormData
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  return opts;
}

export async function listDocuments(tenantSlug, params = {}) {
  const q = new URLSearchParams();
  if (params.page != null) q.set('page', params.page);
  if (params.limit != null) q.set('limit', params.limit);
  if (params.folderId) q.set('folderId', params.folderId);
  if (params.status) q.set('status', params.status);
  if (params.type) q.set('type', params.type);
  if (params.templateId) q.set('templateId', params.templateId);
  if (params.ownerId) q.set('ownerId', params.ownerId);
  if (params.tags && params.tags.length) q.set('tags', params.tags.join(','));
  if (params.search) q.set('search', params.search);
  if (params.sort) q.set('sort', params.sort);
  if (params.order) q.set('order', params.order);
  const res = await fetch(`${base(tenantSlug)}?${q.toString()}`, getOptions('GET'));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to load documents');
  }
  return res.json();
}

export async function getInReview(tenantSlug) {
  const res = await fetch(`${base(tenantSlug)}/in-review`, getOptions('GET'));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to load documents');
  }
  return res.json();
}

export async function getDocument(tenantSlug, id) {
  const res = await fetch(`${base(tenantSlug)}/${id}`, getOptions('GET'));
  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to load document');
  }
  const data = await res.json();
  return data.data?.document ?? null;
}

export async function createDocument(tenantSlug, payload) {
  const res = await fetch(`${base(tenantSlug)}`, getOptions('POST', payload));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to create document');
  }
  const data = await res.json();
  return data.data?.document ?? null;
}

export async function updateDocument(tenantSlug, id, payload) {
  const res = await fetch(`${base(tenantSlug)}/${id}`, getOptions('PATCH', payload));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to update document');
  }
  const data = await res.json();
  return data.data?.document ?? null;
}

export async function deleteDocument(tenantSlug, id) {
  const res = await fetch(`${base(tenantSlug)}/${id}`, getOptions('DELETE'));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to delete document');
  }
  return res.json();
}

export async function submitForReview(tenantSlug, id) {
  const res = await fetch(`${base(tenantSlug)}/${id}/submit-for-review`, getOptions('POST', {}));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to submit for review');
  }
  const data = await res.json();
  return data.data?.document ?? null;
}

export async function approveDocument(tenantSlug, id, comment) {
  const res = await fetch(`${base(tenantSlug)}/${id}/approve`, getOptions('POST', { comment: comment || undefined }));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to approve');
  }
  const data = await res.json();
  return data.data?.document ?? null;
}

export async function rejectDocument(tenantSlug, id, comment) {
  const res = await fetch(`${base(tenantSlug)}/${id}/reject`, getOptions('POST', { comment: comment || undefined }));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to reject');
  }
  const data = await res.json();
  return data.data?.document ?? null;
}

export async function listComments(tenantSlug, documentId) {
  const res = await fetch(`${base(tenantSlug)}/${documentId}/comments`, getOptions('GET'));
  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to load comments');
  }
  const data = await res.json();
  return data.data?.comments ?? [];
}

export async function createComment(tenantSlug, documentId, content) {
  const res = await fetch(`${base(tenantSlug)}/${documentId}/comments`, getOptions('POST', { content: content.trim() }));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to add comment');
  }
  const data = await res.json();
  return data.data?.comment ?? null;
}

export async function listShares(tenantSlug, documentId) {
  const res = await fetch(`${base(tenantSlug)}/${documentId}/shares`, getOptions('GET'));
  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to load shares');
  }
  const data = await res.json();
  return data.data?.shares ?? [];
}

export async function addShare(tenantSlug, documentId, userId, permission = 'view') {
  const res = await fetch(`${base(tenantSlug)}/${documentId}/shares`, getOptions('POST', { userId, permission }));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to share document');
  }
  const data = await res.json();
  return data.data?.share ?? null;
}

export async function removeShare(tenantSlug, documentId, userId) {
  const res = await fetch(`${base(tenantSlug)}/${documentId}/shares/${userId}`, getOptions('DELETE'));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to remove share');
  }
  return res.json();
}

export async function listOrgUsers(tenantSlug) {
  const res = await fetch(`${base(tenantSlug)}/org-users`, getOptions('GET'));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to load users');
  }
  const data = await res.json();
  return data.data?.users ?? [];
}

export async function listVersions(tenantSlug, documentId) {
  const res = await fetch(`${base(tenantSlug)}/${documentId}/versions`, getOptions('GET'));
  if (!res.ok) {
    if (res.status === 404) return [];
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to load versions');
  }
  const data = await res.json();
  return data.data?.versions ?? [];
}

export async function restoreVersion(tenantSlug, documentId, versionId) {
  const res = await fetch(`${base(tenantSlug)}/${documentId}/versions/${versionId}/restore`, getOptions('POST'));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to restore version');
  }
  const data = await res.json();
  return data.data?.document ?? null;
}

export async function listAudit(tenantSlug, params = {}) {
  const q = new URLSearchParams();
  if (params.documentId) q.set('documentId', params.documentId);
  if (params.userId) q.set('userId', params.userId);
  if (params.action) q.set('action', params.action);
  if (params.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params.dateTo) q.set('dateTo', params.dateTo);
  if (params.page != null) q.set('page', params.page);
  if (params.limit != null) q.set('limit', params.limit);
  const res = await fetch(`${base(tenantSlug)}/audit/log?${q.toString()}`, getOptions('GET'));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to load audit log');
  }
  return res.json();
}

export async function uploadDocument(tenantSlug, file, options = {}) {
  const form = new FormData();
  form.append('file', file);
  if (options.title) form.append('title', options.title);
  if (options.folderId) form.append('folderId', options.folderId);
  if (options.tags && options.tags.length) options.tags.forEach((t) => form.append('tags', t));
  const res = await fetch(`${base(tenantSlug)}/upload`, getOptions('POST', form));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Upload failed');
  }
  const data = await res.json();
  return data.data?.document ?? null;
}

export async function listFolders(tenantSlug, scope = 'org') {
  const res = await fetch(`${base(tenantSlug)}/folders/list?scope=${scope}`, getOptions('GET'));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to load folders');
  }
  const data = await res.json();
  return data.data?.folders ?? [];
}

export async function createFolder(tenantSlug, name, parentId, scope = 'org') {
  const res = await fetch(`${base(tenantSlug)}/folders`, getOptions('POST', { name, parentId: parentId || undefined, scope }));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to create folder');
  }
  const data = await res.json();
  return data.data?.folder ?? null;
}

export async function updateFolder(tenantSlug, folderId, payload) {
  const res = await fetch(`${base(tenantSlug)}/folders/${folderId}`, getOptions('PATCH', payload));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to update folder');
  }
  const data = await res.json();
  return data.data?.folder ?? null;
}

export async function deleteFolder(tenantSlug, folderId) {
  const res = await fetch(`${base(tenantSlug)}/folders/${folderId}`, getOptions('DELETE'));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to delete folder');
  }
  return res.json();
}

export async function listTags(tenantSlug) {
  const res = await fetch(`${base(tenantSlug)}/tags/list`, getOptions('GET'));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to load tags');
  }
  const data = await res.json();
  return data.data?.tags ?? [];
}

export async function createTag(tenantSlug, name, color) {
  const res = await fetch(`${base(tenantSlug)}/tags`, getOptions('POST', { name, color: color || undefined }));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to create tag');
  }
  const data = await res.json();
  return data.data?.tag ?? null;
}

export async function updateTag(tenantSlug, tagId, payload) {
  const res = await fetch(`${base(tenantSlug)}/tags/${tagId}`, getOptions('PATCH', payload));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to update tag');
  }
  const data = await res.json();
  return data.data?.tag ?? null;
}

export async function deleteTag(tenantSlug, tagId) {
  const res = await fetch(`${base(tenantSlug)}/tags/${tagId}`, getOptions('DELETE'));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to delete tag');
  }
  return res.json();
}
