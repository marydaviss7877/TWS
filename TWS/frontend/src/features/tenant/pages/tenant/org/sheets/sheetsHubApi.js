/**
 * Sheets Hub – API client for org sheets
 * Backend mounts sheet routes under /organization/sheets.
 * Mirrors documentHubApi.js's shape (colocated fetch module, no shared base client).
 */

const base = (tenantSlug) => `/api/tenant/${tenantSlug}/organization/sheets`;

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

export async function listSheets(tenantSlug, params = {}) {
  const q = new URLSearchParams();
  if (params.page != null) q.set('page', params.page);
  if (params.limit != null) q.set('limit', params.limit);
  if (params.folderId) q.set('folderId', params.folderId);
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
    throw new Error(err.message || 'Failed to load sheets');
  }
  return res.json();
}

export async function getSheet(tenantSlug, id) {
  const res = await fetch(`${base(tenantSlug)}/${id}`, getOptions('GET'));
  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to load sheet');
  }
  const data = await res.json();
  return data.data?.sheet ?? null;
}

export async function createSheet(tenantSlug, payload) {
  const res = await fetch(`${base(tenantSlug)}`, getOptions('POST', payload));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create sheet');
  }
  return data.data?.sheet ?? null;
}

/**
 * Update a sheet. `payload.revision` must be the last-known revision (optimistic locking) —
 * a stale write returns a REVISION_CONFLICT error the caller must handle explicitly, not
 * something this function retries or silently resolves.
 */
export async function updateSheet(tenantSlug, id, payload) {
  const res = await fetch(`${base(tenantSlug)}/${id}`, getOptions('PATCH', payload));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 409) {
      const conflictErr = new Error(data.message || 'This sheet was changed elsewhere.');
      conflictErr.code = 'REVISION_CONFLICT';
      conflictErr.currentRevision = data.currentRevision;
      conflictErr.currentUpdatedAt = data.currentUpdatedAt;
      throw conflictErr;
    }
    throw new Error(data.message || 'Failed to update sheet');
  }
  return data.data?.sheet ?? null;
}

export async function deleteSheet(tenantSlug, id) {
  const res = await fetch(`${base(tenantSlug)}/${id}`, getOptions('DELETE'));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to delete sheet');
  }
  return res.json();
}

export async function listShares(tenantSlug, sheetId) {
  const res = await fetch(`${base(tenantSlug)}/${sheetId}/shares`, getOptions('GET'));
  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to load shares');
  }
  const data = await res.json();
  return data.data?.shares ?? [];
}

export async function addShare(tenantSlug, sheetId, userId, permission = 'view') {
  const res = await fetch(`${base(tenantSlug)}/${sheetId}/shares`, getOptions('POST', { userId, permission }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to share sheet');
  }
  return data.data?.share ?? null;
}

export async function removeShare(tenantSlug, sheetId, userId) {
  const res = await fetch(`${base(tenantSlug)}/${sheetId}/shares/${userId}`, getOptions('DELETE'));
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

export async function listVersions(tenantSlug, sheetId) {
  const res = await fetch(`${base(tenantSlug)}/${sheetId}/versions`, getOptions('GET'));
  if (!res.ok) {
    if (res.status === 404) return [];
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Failed to load versions');
  }
  const data = await res.json();
  return data.data?.versions ?? [];
}

export async function restoreVersion(tenantSlug, sheetId, versionId) {
  const res = await fetch(`${base(tenantSlug)}/${sheetId}/versions/${versionId}/restore`, getOptions('POST'));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to restore version');
  }
  return data.data?.sheet ?? null;
}

export async function listAudit(tenantSlug, params = {}) {
  const q = new URLSearchParams();
  if (params.sheetId) q.set('sheetId', params.sheetId);
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

export async function uploadSheet(tenantSlug, file, options = {}) {
  const form = new FormData();
  form.append('file', file);
  if (options.title) form.append('title', options.title);
  if (options.folderId) form.append('folderId', options.folderId);
  if (options.tags && options.tags.length) options.tags.forEach((t) => form.append('tags', t));
  const res = await fetch(`${base(tenantSlug)}/upload`, getOptions('POST', form));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Upload failed');
  }
  return data.data?.sheet ?? null;
}

/** Uploads an existing .xlsx and parses it into a new, fully editable sheet. */
export async function importXlsx(tenantSlug, file, options = {}) {
  const form = new FormData();
  form.append('file', file);
  if (options.title) form.append('title', options.title);
  if (options.folderId) form.append('folderId', options.folderId);
  if (options.tags && options.tags.length) options.tags.forEach((t) => form.append('tags', t));
  const res = await fetch(`${base(tenantSlug)}/import`, getOptions('POST', form));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Import failed');
    err.code = data.code;
    throw err;
  }
  return data.data?.sheet ?? null;
}

/** Downloads a created sheet as a real .xlsx file. */
export async function exportXlsx(tenantSlug, id) {
  const res = await fetch(`${base(tenantSlug)}/${id}/export.xlsx`, getOptions('GET'));
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Export failed');
  }
  return res.blob();
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
