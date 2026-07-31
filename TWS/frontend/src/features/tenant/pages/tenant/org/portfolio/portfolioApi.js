const base = tenantSlug => `/api/tenant/${tenantSlug}/organization/portfolio`;

async function request(url, options = {}) {
  const response = await fetch(url, { credentials: 'include', ...options });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const err = new Error(error.message || 'Something went wrong');
    err.status = response.status;
    err.retryAfter = response.headers.get('Retry-After');
    throw err;
  }
  return response.json();
}

export async function listItems(tenantSlug, filters = {}) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value != null));
  const result = await request(`${base(tenantSlug)}?${query}`);
  return result.data;
}

export async function getItem(tenantSlug, id) {
  const result = await request(`${base(tenantSlug)}/${id}`);
  return result.data.item;
}

export async function createItem(tenantSlug, payload) {
  const result = await request(base(tenantSlug), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  return result.data.item;
}

export async function updateItem(tenantSlug, id, payload) {
  const result = await request(`${base(tenantSlug)}/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  return result.data.item;
}

export async function setStatus(tenantSlug, id, status) {
  const result = await request(`${base(tenantSlug)}/${id}/status`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status })
  });
  return result.data.item;
}

export async function uploadAsset(tenantSlug, id, file, metadata = {}) {
  const form = new FormData();
  form.append('file', file);
  if (metadata.altText) form.append('altText', metadata.altText);
  if (metadata.caption) form.append('caption', metadata.caption);
  const result = await request(`${base(tenantSlug)}/${id}/assets`, { method: 'POST', body: form });
  return result.data.item;
}

export async function removeAsset(tenantSlug, id, assetId) {
  return request(`${base(tenantSlug)}/${id}/assets/${assetId}`, { method: 'DELETE' });
}

export async function duplicateItem(tenantSlug, id) {
  const result = await request(`${base(tenantSlug)}/${id}/duplicate`, { method: 'POST' });
  return result.data.item;
}

export async function removeItem(tenantSlug, id) {
  return request(`${base(tenantSlug)}/${id}`, { method: 'DELETE' });
}

export async function bulkSetStatus(tenantSlug, ids, status) {
  return request(`${base(tenantSlug)}/bulk/status`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, status })
  });
}

export async function bulkDelete(tenantSlug, ids) {
  return request(`${base(tenantSlug)}/bulk/delete`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids })
  });
}
