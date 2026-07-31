const mongoose = require('mongoose');
const PortfolioItem = require('../../models/portfolio/PortfolioItem');
const { generateSignedUrl, deleteFromS3 } = require('../../config/s3');

const WRITABLE_FIELDS = [
  'title', 'slug', 'summary', 'type', 'client', 'services', 'technologies', 'tags',
  'challenge', 'approach', 'solution', 'outcome', 'metrics', 'testimonial', 'blocks',
  'coverAssetId', 'featured', 'sortOrder', 'projectDate', 'seo', 'visibility'
];

function sanitizeText(value) {
  if (typeof value !== 'string') return value;
  // Portfolio fields are plain text by contract; remove markup rather than
  // preserving/rendering any user-supplied HTML.
  return value.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim();
}

function sanitizeDeep(value) {
  if (Array.isArray(value)) return value.map(sanitizeDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, sanitizeDeep(child)]));
  }
  return sanitizeText(value);
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

function normalizeEmbed(rawUrl) {
  if (!rawUrl) return null;
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const pathParts = url.pathname.split('/').filter(Boolean);
  if (host === 'loom.com' || host.endsWith('.loom.com')) {
    const id = pathParts[pathParts[0] === 'share' || pathParts[0] === 'embed' ? 1 : 0];
    return id && /^[a-zA-Z0-9]+$/.test(id)
      ? { provider: 'loom', url: url.toString(), embedUrl: `https://www.loom.com/embed/${id}` }
      : null;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
    const id = host === 'youtu.be' ? pathParts[0] : (url.searchParams.get('v') || (pathParts[0] === 'embed' ? pathParts[1] : null));
    return id && /^[a-zA-Z0-9_-]{6,20}$/.test(id)
      ? { provider: 'youtube', url: url.toString(), embedUrl: `https://www.youtube-nocookie.com/embed/${id}` }
      : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = [...pathParts].reverse().find(part => /^\d+$/.test(part));
    return id ? { provider: 'vimeo', url: url.toString(), embedUrl: `https://player.vimeo.com/video/${id}` } : null;
  }
  if (host === 'figma.com') {
    return {
      provider: 'figma',
      url: url.toString(),
      embedUrl: `https://www.figma.com/embed?embed_host=tws&url=${encodeURIComponent(url.toString())}`
    };
  }
  return null;
}

function normalizeExternalUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const url = new URL(rawUrl);
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function preparePayload(payload) {
  const clean = {};
  for (const key of WRITABLE_FIELDS) {
    if (payload[key] !== undefined) clean[key] = sanitizeDeep(payload[key]);
  }
  if (clean.title && !clean.slug) clean.slug = slugify(clean.title);
  if (clean.slug) clean.slug = slugify(clean.slug);
  if (clean.client?.website) {
    const website = normalizeExternalUrl(clean.client.website);
    if (!website) throw Object.assign(new Error('Client website must be a valid HTTP or HTTPS URL'), { statusCode: 400 });
    clean.client.website = website;
  }
  for (const field of ['services', 'technologies', 'tags']) {
    if (clean[field]) clean[field] = [...new Set(clean[field].filter(Boolean))].slice(0, 30);
  }
  if (clean.blocks) {
    clean.blocks = clean.blocks.slice(0, 100).map((block, index) => {
      const normalized = { ...block, order: index };
      if (block.type === 'embed') {
        const embed = normalizeEmbed(block.embed?.url || block.embedUrl || '');
        if (!embed) throw Object.assign(new Error('Unsupported or invalid embed URL'), { statusCode: 400 });
        normalized.embed = embed;
      }
      if (block.type === 'cta' && block.cta?.url) {
        const ctaUrl = normalizeExternalUrl(block.cta.url);
        if (!ctaUrl) throw Object.assign(new Error('Call-to-action URL must use HTTP or HTTPS'), { statusCode: 400 });
        normalized.cta = { ...block.cta, url: ctaUrl };
      }
      return normalized;
    });
  }
  if (clean.visibility) {
    clean.visibility.scope = clean.visibility.scope === 'organization' ? 'organization' : 'sales';
    clean.visibility.visibleFrom = clean.visibility.visibleFrom || null;
    clean.visibility.visibleUntil = clean.visibility.visibleUntil || null;
    if (clean.visibility.visibleFrom && clean.visibility.visibleUntil
      && new Date(clean.visibility.visibleFrom) >= new Date(clean.visibility.visibleUntil)) {
      throw Object.assign(new Error('Visibility end time must be after its start time'), { statusCode: 400 });
    }
  }
  // NDA-protected material is never widened to the whole organization.
  if (clean.client?.confidential) {
    clean.visibility = { ...(clean.visibility || {}), scope: 'sales' };
  }
  return clean;
}

function buildVisibilityQuery(viewer = {}, now = new Date()) {
  if (viewer.canManage) return {};
  const audience = [{ 'visibility.scope': 'organization' }];
  if (viewer.isSales) {
    audience.push(
      { 'visibility.scope': 'sales' },
      { 'visibility.scope': { $exists: false } }
    );
  }
  return {
    status: 'published',
    $and: [
      { $or: audience },
      { $or: [{ 'visibility.visibleFrom': null }, { 'visibility.visibleFrom': { $exists: false } }, { 'visibility.visibleFrom': { $lte: now } }] },
      { $or: [{ 'visibility.visibleUntil': null }, { 'visibility.visibleUntil': { $exists: false } }, { 'visibility.visibleUntil': { $gt: now } }] }
    ]
  };
}

async function withAssetUrls(item) {
  const plain = item.toObject ? item.toObject() : { ...item };
  plain.assets = await Promise.all((plain.assets || []).map(async (asset) => {
    const result = {
      _id: asset._id,
      kind: asset.kind,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      size: asset.size,
      altText: asset.altText,
      caption: asset.caption,
      width: asset.width,
      height: asset.height,
      duration: asset.duration
    };
    result.url = await generateSignedUrl(asset.key);
    return result;
  }));
  return plain;
}

async function list({ orgId, status, type, featured, search, sort = 'curated', order = 'desc', page = 1, limit = 20, viewer }) {
  const query = { orgId, deletedAt: null, ...buildVisibilityQuery(viewer) };
  if (status && viewer?.canManage) query.status = status;
  if (type) query.type = type;
  if (featured !== undefined) query.featured = featured;
  if (search) query.$text = { $search: search };
  const sortOptions = {
    curated: { featured: -1, sortOrder: 1, updatedAt: -1 },
    updatedAt: { updatedAt: order === 'asc' ? 1 : -1 },
    title: { title: order === 'asc' ? 1 : -1 },
    projectDate: { projectDate: order === 'asc' ? 1 : -1 }
  };
  const [documents, total] = await Promise.all([
    PortfolioItem.find(query)
      .sort(sortOptions[sort] || sortOptions.curated)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    PortfolioItem.countDocuments(query)
  ]);
  const items = await Promise.all(documents.map(async document => {
    const cover = (document.assets || []).find(asset => String(asset._id) === String(document.coverAssetId));
    const item = {
      ...document,
      cover: cover ? {
        _id: cover._id,
        kind: cover.kind,
        mimeType: cover.mimeType,
        altText: cover.altText,
        url: await generateSignedUrl(cover.key).catch(() => null)
      } : null,
      assetCount: document.assets?.length || 0
    };
    item.assets = (document.assets || []).map(asset => ({
      _id: asset._id,
      kind: asset.kind,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      size: asset.size,
      altText: asset.altText,
      caption: asset.caption
    }));
    return item;
  }));
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function uniqueSlug(orgId, requestedSlug, excludeId = null) {
  const base = slugify(requestedSlug) || 'portfolio-item';
  let candidate = base;
  let suffix = 2;
  while (await PortfolioItem.exists({
    orgId,
    slug: candidate,
    deletedAt: null,
    ...(excludeId ? { _id: { $ne: excludeId } } : {})
  })) {
    candidate = `${base.slice(0, Math.max(1, 180 - String(suffix).length - 1))}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

async function create({ orgId, tenantId, userId, payload }) {
  const clean = preparePayload(payload);
  if (!clean.slug) throw Object.assign(new Error('A valid title or slug is required'), { statusCode: 400 });
  clean.slug = await uniqueSlug(orgId, clean.slug);
  return PortfolioItem.create({ ...clean, orgId, tenantId, createdBy: userId, updatedBy: userId });
}

async function get(orgId, id, viewer) {
  if (!mongoose.isValidObjectId(id)) return null;
  const item = await PortfolioItem.findOne({
    _id: id, orgId, deletedAt: null, ...buildVisibilityQuery(viewer)
  });
  return item ? withAssetUrls(item) : null;
}

async function update({ orgId, id, userId, payload }) {
  const clean = preparePayload(payload);
  if (clean.slug) clean.slug = await uniqueSlug(orgId, clean.slug, id);
  return PortfolioItem.findOneAndUpdate(
    { _id: id, orgId, deletedAt: null },
    { $set: { ...clean, updatedBy: userId } },
    { new: true, runValidators: true }
  );
}

async function duplicate({ orgId, id, userId }) {
  const source = await PortfolioItem.findOne({ _id: id, orgId, deletedAt: null }).lean();
  if (!source) return null;
  const title = `${source.title} — Copy`;
  const slug = await uniqueSlug(orgId, `${source.slug}-copy`);
  const clone = { ...source, title, slug, status: 'draft', featured: false, publishedAt: null };
  delete clone._id;
  delete clone.__v;
  delete clone.createdAt;
  delete clone.updatedAt;
  clone.assets = [];
  clone.coverAssetId = null;
  clone.blocks = (clone.blocks || []).map(block => ({
    ...block,
    _id: new mongoose.Types.ObjectId(),
    assetIds: []
  }));
  clone.metrics = (clone.metrics || []).map(metric => ({ ...metric, _id: new mongoose.Types.ObjectId() }));
  clone.createdBy = userId;
  clone.updatedBy = userId;
  return PortfolioItem.create(clone);
}

async function addAsset({ orgId, id, userId, file, metadata }) {
  const item = await PortfolioItem.findOne({ _id: id, orgId, deletedAt: null });
  if (!item) return null;
  const kind = file.mimetype.startsWith('image/') ? 'image'
    : file.mimetype.startsWith('video/') ? 'video'
      : file.mimetype.startsWith('audio/') ? 'audio'
        : file.mimetype.includes('zip') ? 'archive'
          : file.mimetype.includes('pdf') || file.mimetype.includes('document') ? 'document' : 'other';
  item.assets.push({
    kind,
    key: file.key,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    altText: sanitizeText(metadata.altText || ''),
    caption: sanitizeText(metadata.caption || ''),
    uploadedBy: userId
  });
  item.updatedBy = userId;
  await item.save();
  return withAssetUrls(item);
}

async function removeAsset({ orgId, id, assetId, userId }) {
  const item = await PortfolioItem.findOne({ _id: id, orgId, deletedAt: null });
  if (!item) return null;
  const asset = item.assets.id(assetId);
  if (!asset) return false;
  const key = asset.key;
  item.assets.pull(assetId);
  if (String(item.coverAssetId) === String(assetId)) item.coverAssetId = null;
  item.blocks.forEach(block => {
    block.assetIds = (block.assetIds || []).filter(value => String(value) !== String(assetId));
  });
  item.updatedBy = userId;
  await item.save();
  await deleteFromS3(key).catch(() => {});
  return true;
}

async function setStatus({ orgId, id, userId, status }) {
  const update = { status, updatedBy: userId };
  if (status === 'published') update.publishedAt = new Date();
  return PortfolioItem.findOneAndUpdate(
    { _id: id, orgId, deletedAt: null },
    { $set: update },
    { new: true, runValidators: true }
  );
}

async function softDelete({ orgId, id, userId }) {
  return PortfolioItem.findOneAndUpdate(
    { _id: id, orgId, deletedAt: null },
    { $set: { deletedAt: new Date(), updatedBy: userId, status: 'archived' } },
    { new: true }
  );
}

async function bulkSetStatus({ orgId, ids, userId, status }) {
  return PortfolioItem.updateMany(
    { _id: { $in: ids }, orgId, deletedAt: null },
    { $set: { status, updatedBy: userId, ...(status === 'published' ? { publishedAt: new Date() } : {}) } },
    { runValidators: true }
  );
}

async function bulkSoftDelete({ orgId, ids, userId }) {
  return PortfolioItem.updateMany(
    { _id: { $in: ids }, orgId, deletedAt: null },
    { $set: { deletedAt: new Date(), updatedBy: userId, status: 'archived' } }
  );
}

module.exports = {
  list, create, get, update, duplicate, addAsset, removeAsset, setStatus, softDelete,
  bulkSetStatus, bulkSoftDelete,
  normalizeEmbed, normalizeExternalUrl, slugify, uniqueSlug, buildVisibilityQuery
};
