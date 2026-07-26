/**
 * Sheets Hub – service layer: CRUD, versions, audit, folders, tags, shares.
 * Mirrors documentHub.service.js's shape, minus review/comment functions (Sheets has no
 * approval workflow), with content persisted in S3 (never inline Mongo) and optimistic
 * locking (revision) plus throttled version snapshots layered on top — see the approved
 * plan's "Hardening decisions" section for why.
 */
const OrgSheet = require('../../models/sheets/OrgSheet');
const OrgSheetVersion = require('../../models/sheets/OrgSheetVersion');
const OrgSheetAudit = require('../../models/sheets/OrgSheetAudit');
const SheetShare = require('../../models/sheets/SheetShare');
const SheetFolder = require('../../models/sheets/SheetFolder');
const SheetTag = require('../../models/sheets/SheetTag');
const User = require('../../models/users-auth/User');
const { generateSignedUrl } = require('../../config/s3');
const { contentKeyFor, putSheetContent, getSheetContent, deleteSheetContent } = require('./sheetContentStorage');
const logger = require('../../utils/logger');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const VERSION_THROTTLE_MS = 10 * 60 * 1000; // 10 minutes — see hardening #2
const VERSION_RETAIN_COUNT = 50;
const VERSION_RETAIN_DAYS = 90;

const PRIVILEGED_SHEET_ROLES = new Set([
  'owner',
  'admin',
  'super_admin',
  'org_admin',
  'org_manager',
  'tenant_owner',
  'manager',
  'project_manager'
]);

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function isPrivilegedSheetRole(role) {
  return PRIVILEGED_SHEET_ROLES.has(normalizeRole(role));
}

async function getSheetAccessScopeClause(orgId, userId, role, requireEdit = false) {
  if (!userId) return null;
  if (isPrivilegedSheetRole(role)) return null;

  const shareFilter = { orgId, userId };
  if (requireEdit) shareFilter.permission = 'edit';
  const shares = await SheetShare.find(shareFilter).select('sheetId').lean();
  const sharedIds = shares.map((s) => s.sheetId).filter(Boolean);

  return {
    $or: [
      { createdBy: userId },
      { ownerId: userId },
      { assigneeId: userId },
      { _id: { $in: sharedIds } }
    ]
  };
}

function mergeScopedFilter(baseFilter, scopeClause) {
  if (!scopeClause) return baseFilter;
  return { $and: [baseFilter, scopeClause] };
}

/** Effective permission for the current viewer — used by the frontend to enforce read-only mode (hardening #4). */
async function resolveEffectivePermission(doc, userId, role) {
  if (!userId) return 'view';
  if (isPrivilegedSheetRole(role)) return 'edit';
  const uid = String(userId);
  const createdBy = doc.createdBy?._id || doc.createdBy;
  const ownerId = doc.ownerId?._id || doc.ownerId;
  const assigneeId = doc.assigneeId?._id || doc.assigneeId;
  if (createdBy && String(createdBy) === uid) return 'edit';
  if (ownerId && String(ownerId) === uid) return 'edit';
  if (assigneeId && String(assigneeId) === uid) return 'edit';
  const share = await SheetShare.findOne({ sheetId: doc._id, userId }).select('permission').lean();
  return share?.permission === 'edit' ? 'edit' : 'view';
}

/**
 * Create a version snapshot of the sheet's CURRENT (about-to-be-replaced) content by adopting
 * its existing contentKey — no re-upload needed, since the doc is about to move to a new key.
 * Throttled to once per VERSION_THROTTLE_MS unless explicit=true (explicit "save version" / restore).
 * @returns {boolean} true if a version was created (caller must NOT delete doc.contentKey — the version now owns it)
 */
async function maybeSnapshotVersion(doc, userId, { explicit = false } = {}) {
  if (!doc.contentKey) return false; // nothing prior to snapshot (first-ever content write)
  if (!explicit) {
    const lastVersion = await OrgSheetVersion.findOne({ sheetId: doc._id })
      .sort({ versionNumber: -1 })
      .select('createdAt')
      .lean();
    if (lastVersion && Date.now() - new Date(lastVersion.createdAt).getTime() < VERSION_THROTTLE_MS) {
      return false;
    }
  }
  const nextVersion = await OrgSheetVersion.countDocuments({ sheetId: doc._id }) + 1;
  await OrgSheetVersion.create({
    sheetId: doc._id,
    orgId: doc.orgId,
    versionNumber: nextVersion,
    title: doc.title,
    contentKey: doc.contentKey,
    sizeBytes: doc.contentSize || 0,
    createdBy: userId
  });
  return true;
}

/**
 * List sheets with filters and pagination
 */
async function listSheets({ orgId, userId, role, folderId, tags, type, templateId, ownerId, search, sort = 'updatedAt', order = 'desc', page = DEFAULT_PAGE, limit = DEFAULT_LIMIT }) {
  const filter = { orgId, deletedAt: null };
  if (folderId !== undefined && folderId !== null && folderId !== '') filter.folderId = folderId;
  if (type) filter.type = type;
  if (templateId) filter.templateId = templateId;
  if (ownerId) filter.ownerId = ownerId;
  if (tags && tags.length) filter.tags = { $in: tags };

  if (search && search.trim()) {
    filter.$or = [
      { title: { $regex: search.trim(), $options: 'i' } },
      { fileName: { $regex: search.trim(), $options: 'i' } }
    ];
  }
  const scopeClause = await getSheetAccessScopeClause(orgId, userId, role, false);
  const scopedFilter = mergeScopedFilter(filter, scopeClause);

  const safeLimit = Math.min(limit, MAX_LIMIT);
  const skip = (Math.max(1, page) - 1) * safeLimit;
  const sortObj = { [sort]: order === 'asc' ? 1 : -1 };

  const [sheets, total] = await Promise.all([
    OrgSheet.find(scopedFilter)
      .select('-contentKey') // internal S3 pointer, never returned in list views
      .populate('folderId', 'name parentId')
      .populate('tags', 'name color')
      .populate('createdBy', 'fullName email')
      .populate('ownerId', 'fullName email')
      .populate('assigneeId', 'fullName email')
      .sort(sortObj)
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    OrgSheet.countDocuments(scopedFilter)
  ]);

  return {
    sheets,
    pagination: {
      page: Math.max(1, page),
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit) || 1
    }
  };
}

/**
 * Get one sheet by id; fetches its content JSON from S3 (type=created) or a signed
 * download URL (type=uploaded). Also resolves the viewer's effective permission so the
 * frontend can enforce read-only mode (server-side enforcement still happens on write).
 */
async function getSheet(sheetId, orgId, options = {}) {
  const baseFilter = { _id: sheetId, orgId, deletedAt: null };
  const scopeClause = await getSheetAccessScopeClause(orgId, options.userId, options.role, false);
  const doc = await OrgSheet.findOne(mergeScopedFilter(baseFilter, scopeClause))
    .populate('folderId', 'name parentId')
    .populate('tags', 'name color')
    .populate('createdBy', 'fullName email')
    .populate('ownerId', 'fullName email')
    .populate('assigneeId', 'fullName email')
    .lean();

  if (!doc) return null;

  if (doc.type === 'created' && doc.contentKey) {
    try {
      doc.content = await getSheetContent(doc.contentKey);
    } catch (err) {
      logger.error('Failed to load sheet content from S3', { sheetId, error: err.message });
      doc.content = null;
      doc.contentLoadError = true;
    }
  } else if (doc.type === 'uploaded' && doc.fileKey) {
    try {
      doc.downloadUrl = await generateSignedUrl(doc.fileKey);
    } catch (e) {
      doc.downloadUrl = null;
    }
  }

  doc.effectivePermission = await resolveEffectivePermission(doc, options.userId, options.role);
  return doc;
}

/**
 * Create sheet (from template or blank). v1 ships Blank only, so content is typically
 * undefined here and Univer generates its own default workbook client-side on first open.
 */
async function createSheet({ orgId, tenantId, userId, title, templateId, content, folderId, tags }) {
  const doc = new OrgSheet({
    orgId,
    tenantId,
    type: 'created',
    title: title || 'Untitled',
    templateId: templateId || null,
    folderId: folderId || null,
    tags: tags || [],
    createdBy: userId,
    ownerId: userId
  });

  if (content !== undefined && content !== null) {
    const key = contentKeyFor(tenantId, orgId, doc._id);
    let sizeBytes;
    try {
      ({ sizeBytes } = await putSheetContent(key, content));
    } catch (err) {
      if (err.code === 'CONTENT_TOO_LARGE') {
        return { error: err.message, code: 'CONTENT_TOO_LARGE' };
      }
      throw err;
    }
    doc.contentKey = key;
    doc.contentSize = sizeBytes;
  }

  await doc.save();

  await OrgSheetAudit.create({
    sheetId: doc._id,
    orgId,
    action: 'created',
    userId
  });

  const result = doc.toObject ? doc.toObject() : doc;
  if (content !== undefined) result.content = content;
  return result;
}

/**
 * Update sheet (metadata and/or content). Enforces optimistic locking via `revision` and
 * throttled version snapshots — see hardening #2/#3 in the plan. Returns
 * { error, code: 'REVISION_CONFLICT', currentRevision, currentUpdatedAt } on a stale write
 * instead of silently overwriting.
 */
async function updateSheet(sheetId, orgId, userId, payload, options = {}) {
  const baseFilter = { _id: sheetId, orgId, deletedAt: null };
  const scopeClause = await getSheetAccessScopeClause(orgId, userId, options.role, true);
  const doc = await OrgSheet.findOne(mergeScopedFilter(baseFilter, scopeClause));
  if (!doc) return null;

  if (payload.revision !== undefined && Number(payload.revision) !== doc.revision) {
    return {
      error: 'This sheet was changed elsewhere. Reload to see the latest version.',
      code: 'REVISION_CONFLICT',
      currentRevision: doc.revision,
      currentUpdatedAt: doc.updatedAt
    };
  }

  let versionAdopted = false;

  if (payload.content !== undefined && doc.type === 'created') {
    const newKey = contentKeyFor(doc.tenantId, orgId, doc._id);
    let sizeBytes;
    try {
      ({ sizeBytes } = await putSheetContent(newKey, payload.content));
    } catch (err) {
      if (err.code === 'CONTENT_TOO_LARGE') {
        return { error: err.message, code: 'CONTENT_TOO_LARGE' };
      }
      throw err;
    }
    // Size-checked write succeeded — safe to snapshot the prior content and swap the pointer.
    versionAdopted = await maybeSnapshotVersion(doc, userId, { explicit: !!options.explicitVersion });
    const oldContentKey = doc.contentKey;
    doc.contentKey = newKey;
    doc.contentSize = sizeBytes;
    if (!versionAdopted && oldContentKey) {
      await deleteSheetContent(oldContentKey);
    }
  }

  if (payload.title !== undefined) doc.title = payload.title;
  if (payload.folderId !== undefined) doc.folderId = payload.folderId;
  if (payload.tags !== undefined) doc.tags = payload.tags;
  if (payload.assigneeId !== undefined) doc.assigneeId = payload.assigneeId || null;
  doc.revision += 1;
  doc.updatedAt = new Date();
  await doc.save();

  await OrgSheetAudit.create({
    sheetId: doc._id,
    orgId,
    action: 'edited',
    userId,
    metadata: versionAdopted ? { versionSnapshot: true } : null
  });

  return doc.toObject ? doc.toObject() : doc;
}

/**
 * Soft delete
 */
async function deleteSheet(sheetId, orgId, userId, options = {}) {
  const baseFilter = { _id: sheetId, orgId, deletedAt: null };
  const scopeClause = await getSheetAccessScopeClause(orgId, userId, options.role, true);
  const doc = await OrgSheet.findOne(mergeScopedFilter(baseFilter, scopeClause));
  if (!doc) return null;
  doc.deletedAt = new Date();
  doc.updatedAt = new Date();
  await doc.save();

  await OrgSheetAudit.create({
    sheetId: doc._id,
    orgId,
    action: 'deleted',
    userId
  });

  return doc;
}

/**
 * List versions for a sheet (contentKey is internal — never returned to the client)
 */
async function listVersions(sheetId, orgId, options = {}) {
  const baseFilter = { _id: sheetId, orgId, deletedAt: null };
  const scopeClause = await getSheetAccessScopeClause(orgId, options.userId, options.role, false);
  const doc = await OrgSheet.findOne(mergeScopedFilter(baseFilter, scopeClause)).select('_id').lean();
  if (!doc) return null;

  const versions = await OrgSheetVersion.find({ sheetId })
    .select('-contentKey')
    .sort({ versionNumber: -1 })
    .populate('createdBy', 'fullName email')
    .lean();
  return versions;
}

async function getVersion(versionId, sheetId, orgId) {
  const version = await OrgSheetVersion.findOne({ _id: versionId, sheetId, orgId })
    .populate('createdBy', 'fullName email')
    .lean();
  return version;
}

/**
 * Restore a version: snapshots current content first (explicit, ignores throttle), then
 * copies the restored version's content into a new live contentKey.
 */
async function restoreVersion(sheetId, versionId, orgId, userId, options = {}) {
  const baseFilter = { _id: sheetId, orgId, deletedAt: null };
  const scopeClause = await getSheetAccessScopeClause(orgId, userId, options.role, true);
  const doc = await OrgSheet.findOne(mergeScopedFilter(baseFilter, scopeClause));
  if (!doc) return null;
  const version = await OrgSheetVersion.findOne({ _id: versionId, sheetId, orgId }).lean();
  if (!version) return null;

  await maybeSnapshotVersion(doc, userId, { explicit: true });

  const restoredContent = await getSheetContent(version.contentKey);
  const newKey = contentKeyFor(doc.tenantId, orgId, doc._id);
  const { sizeBytes } = await putSheetContent(newKey, restoredContent);
  doc.contentKey = newKey;
  doc.contentSize = sizeBytes;
  doc.title = version.title;
  doc.revision += 1;
  doc.updatedAt = new Date();
  await doc.save();

  await OrgSheetAudit.create({
    sheetId: doc._id,
    orgId,
    action: 'restored',
    userId,
    metadata: { fromVersionId: versionId, versionNumber: version.versionNumber }
  });

  const result = doc.toObject ? doc.toObject() : doc;
  result.content = restoredContent;
  return result;
}

/**
 * Prune old version snapshots: keeps the last VERSION_RETAIN_COUNT versions OR anything
 * newer than VERSION_RETAIN_DAYS, whichever is larger, per sheet. Deletes both the Mongo
 * row and its S3 blob. Intended to run on a schedule (mirrors file.service.js's
 * cleanupExpiredFiles pattern) — see hardening #2.
 */
async function pruneOldSheetVersions({ retainCount = VERSION_RETAIN_COUNT, retainDays = VERSION_RETAIN_DAYS } = {}) {
  const cutoff = new Date(Date.now() - retainDays * 24 * 60 * 60 * 1000);
  const sheetIds = await OrgSheetVersion.distinct('sheetId');
  let deletedCount = 0;

  for (const sheetId of sheetIds) {
    const versions = await OrgSheetVersion.find({ sheetId })
      .sort({ versionNumber: -1 })
      .select('_id contentKey createdAt')
      .lean();
    const toDelete = versions.slice(retainCount).filter((v) => v.createdAt < cutoff);
    for (const v of toDelete) {
      await deleteSheetContent(v.contentKey);
      await OrgSheetVersion.deleteOne({ _id: v._id });
      deletedCount++;
    }
  }

  logger.info(`pruneOldSheetVersions: deleted ${deletedCount} version(s)`);
  return { deletedCount };
}

/**
 * List audit events (optionally by sheetId or userId)
 */
async function listAudit({ orgId, sheetId, userId, sheetSearch, userSearch, action, dateFrom, dateTo, page = DEFAULT_PAGE, limit = DEFAULT_LIMIT }) {
  const filter = { orgId };
  if (sheetId) filter.sheetId = sheetId;
  if (userId) filter.userId = userId;
  if (sheetSearch && String(sheetSearch).trim()) {
    const matched = await OrgSheet.find({
      orgId,
      deletedAt: null,
      title: { $regex: String(sheetSearch).trim(), $options: 'i' }
    }).select('_id').limit(200).lean();
    const ids = matched.map((d) => d._id);
    filter.sheetId = ids.length > 0 ? { $in: ids } : { $in: [] };
  }
  if (userSearch && String(userSearch).trim()) {
    const matchedUsers = await User.find({
      orgId,
      $or: [
        { fullName: { $regex: String(userSearch).trim(), $options: 'i' } },
        { email: { $regex: String(userSearch).trim(), $options: 'i' } }
      ]
    }).select('_id').limit(200).lean();
    const ids = matchedUsers.map((u) => u._id);
    filter.userId = ids.length > 0 ? { $in: ids } : { $in: [] };
  }
  if (action) filter.action = action;

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }

  const safeLimit = Math.min(limit, MAX_LIMIT);
  const skip = (Math.max(1, page) - 1) * safeLimit;

  const [events, total] = await Promise.all([
    OrgSheetAudit.find(filter)
      .populate('userId', 'fullName email')
      .populate('sheetId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    OrgSheetAudit.countDocuments(filter)
  ]);

  return {
    events,
    pagination: {
      page: Math.max(1, page),
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit) || 1
    }
  };
}

// --- Folders ---
async function listFolders(orgId, tenantId, scope = 'org', ownerId = null) {
  const filter = { orgId, tenantId, scope };
  if (scope === 'employee' && ownerId) filter.ownerId = ownerId;
  const folders = await SheetFolder.find(filter)
    .populate('parentId', 'name')
    .sort({ name: 1 })
    .lean();
  return folders;
}

async function createFolder({ orgId, tenantId, userId, name, parentId, scope = 'org', ownerId = null }) {
  const folder = new SheetFolder({
    orgId,
    tenantId,
    name,
    parentId: parentId || null,
    scope,
    ownerId: scope === 'employee' ? ownerId : null,
    createdBy: userId
  });
  await folder.save();
  return folder.toObject ? folder.toObject() : folder;
}

async function updateFolder(folderId, orgId, payload) {
  const folder = await SheetFolder.findOne({ _id: folderId, orgId });
  if (!folder) return null;
  if (payload.name !== undefined) folder.name = payload.name;
  if (payload.parentId !== undefined) folder.parentId = payload.parentId;
  folder.updatedAt = new Date();
  await folder.save();
  return folder.toObject ? folder.toObject() : folder;
}

async function deleteFolder(folderId, orgId) {
  const folder = await SheetFolder.findOne({ _id: folderId, orgId });
  if (!folder) return null;
  await OrgSheet.updateMany(
    { orgId, folderId, deletedAt: null },
    { $set: { folderId: null, updatedAt: new Date() } }
  );
  await folder.deleteOne();
  return { deleted: true };
}

// --- Tags ---
async function listTags(orgId, tenantId) {
  const tags = await SheetTag.find({ orgId, tenantId }).sort({ name: 1 }).lean();
  return tags;
}

async function createTag({ orgId, tenantId, userId, name, color }) {
  const tag = new SheetTag({
    orgId,
    tenantId,
    name,
    color: color || null,
    createdBy: userId
  });
  await tag.save();
  return tag.toObject ? tag.toObject() : tag;
}

async function updateTag(tagId, orgId, payload) {
  const tag = await SheetTag.findOne({ _id: tagId, orgId });
  if (!tag) return null;
  if (payload.name !== undefined) tag.name = payload.name;
  if (payload.color !== undefined) tag.color = payload.color;
  await tag.save();
  return tag.toObject ? tag.toObject() : tag;
}

async function deleteTag(tagId, orgId) {
  const tag = await SheetTag.findOne({ _id: tagId, orgId });
  if (!tag) return null;
  await OrgSheet.updateMany(
    { orgId, tags: tagId, deletedAt: null },
    { $pull: { tags: tagId }, $set: { updatedAt: new Date() } }
  );
  await tag.deleteOne();
  return { deleted: true };
}

// --- Share ---
async function listShares(sheetId, orgId, options = {}) {
  const baseFilter = { _id: sheetId, orgId, deletedAt: null };
  const scopeClause = await getSheetAccessScopeClause(orgId, options.userId, options.role, false);
  const doc = await OrgSheet.findOne(mergeScopedFilter(baseFilter, scopeClause)).select('_id').lean();
  if (!doc) return null;
  const shares = await SheetShare.find({ sheetId, orgId })
    .populate('userId', 'fullName email')
    .populate('sharedBy', 'fullName email')
    .sort({ createdAt: 1 })
    .lean();
  return shares;
}

async function addShare(sheetId, orgId, sharedByUserId, userId, permission = 'view', options = {}) {
  const baseFilter = { _id: sheetId, orgId, deletedAt: null };
  const scopeClause = await getSheetAccessScopeClause(orgId, sharedByUserId, options.role, true);
  const doc = await OrgSheet.findOne(mergeScopedFilter(baseFilter, scopeClause))
    .select('_id createdBy ownerId')
    .lean();
  if (!doc) return null;
  const targetUserId = String(userId);
  const actorUserId = String(sharedByUserId);
  const ownerUserId = doc.ownerId ? String(doc.ownerId) : null;
  const creatorUserId = doc.createdBy ? String(doc.createdBy) : null;
  if (targetUserId === actorUserId) {
    return { error: 'You cannot share a sheet with yourself', code: 'INVALID_SHARE_TARGET' };
  }
  if (ownerUserId && targetUserId === ownerUserId) {
    return { error: 'Owner already has full access to this sheet', code: 'INVALID_SHARE_TARGET' };
  }
  if (creatorUserId && targetUserId === creatorUserId) {
    return { error: 'Creator already has access to this sheet', code: 'INVALID_SHARE_TARGET' };
  }
  const targetUser = await User.findOne({ _id: userId, orgId, status: 'active' }).select('_id').lean();
  if (!targetUser) {
    return { error: 'Selected user not found in this organization', code: 'INVALID_SHARE_TARGET' };
  }
  const perm = permission === 'edit' ? 'edit' : 'view';
  let share = await SheetShare.findOne({ sheetId, userId });
  if (share) {
    share.permission = perm;
    share.sharedBy = sharedByUserId;
    await share.save();
  } else {
    share = new SheetShare({
      sheetId,
      orgId,
      userId,
      permission: perm,
      sharedBy: sharedByUserId
    });
    await share.save();
  }
  const populated = await SheetShare.findById(share._id)
    .populate('userId', 'fullName email')
    .populate('sharedBy', 'fullName email')
    .lean();
  return populated;
}

async function removeShare(sheetId, orgId, userId, options = {}) {
  const baseFilter = { _id: sheetId, orgId, deletedAt: null };
  const scopeClause = await getSheetAccessScopeClause(orgId, options.actorUserId, options.role, true);
  const doc = await OrgSheet.findOne(mergeScopedFilter(baseFilter, scopeClause)).select('_id').lean();
  if (!doc) return null;
  const result = await SheetShare.deleteOne({ sheetId, userId });
  return { deleted: result.deletedCount > 0 };
}

/**
 * Create uploaded sheet (after S3 upload); req.file from multer-s3 has .key, .location, .originalname, .size, .mimetype
 * Archives the raw file only — not parsed into an editable grid (mirrors Documents' upload exactly).
 */
async function createUploadedSheet({ orgId, tenantId, userId, fileKey, fileName, mimeType, fileSize, title, folderId, tags }) {
  const doc = new OrgSheet({
    orgId,
    tenantId,
    type: 'uploaded',
    title: title || fileName || 'Untitled',
    fileKey,
    fileName: fileName || null,
    mimeType: mimeType || null,
    fileSize: fileSize || null,
    folderId: folderId || null,
    tags: tags || [],
    createdBy: userId,
    ownerId: userId
  });
  await doc.save();

  await OrgSheetAudit.create({
    sheetId: doc._id,
    orgId,
    action: 'created',
    userId,
    metadata: { type: 'uploaded' }
  });

  return doc.toObject ? doc.toObject() : doc;
}

/**
 * Create a sheet from a parsed .xlsx workbook (POST /import). Content is already-validated
 * IWorkbookData JSON from xlsxConverter.xlsxBufferToWorkbookData — this just persists it as a
 * new, fully editable sheet (distinct from createUploadedSheet, which archives the raw file
 * un-parsed). Returns { error, code: 'CONTENT_TOO_LARGE' } instead of throwing, matching
 * createSheet/updateSheet's error-shape convention.
 */
async function createSheetFromXlsx({ orgId, tenantId, userId, title, workbookData, folderId, tags }) {
  const doc = new OrgSheet({
    orgId,
    tenantId,
    type: 'created',
    title: title || 'Imported Sheet',
    folderId: folderId || null,
    tags: tags || [],
    createdBy: userId,
    ownerId: userId
  });

  const key = contentKeyFor(tenantId, orgId, doc._id);
  let sizeBytes;
  try {
    ({ sizeBytes } = await putSheetContent(key, workbookData));
  } catch (err) {
    if (err.code === 'CONTENT_TOO_LARGE') {
      return { error: err.message, code: 'CONTENT_TOO_LARGE' };
    }
    throw err;
  }
  doc.contentKey = key;
  doc.contentSize = sizeBytes;
  await doc.save();

  await OrgSheetAudit.create({
    sheetId: doc._id,
    orgId,
    action: 'imported_xlsx',
    userId,
    metadata: { sheetCount: (workbookData.sheetOrder || []).length }
  });

  const result = doc.toObject ? doc.toObject() : doc;
  result.content = workbookData;
  return result;
}

/** Records an audit event that isn't tied to a CRUD mutation above (e.g. exported_xlsx). */
async function recordAudit(sheetId, orgId, userId, action, metadata) {
  await OrgSheetAudit.create({ sheetId, orgId, action, userId, metadata: metadata || null });
}

module.exports = {
  listSheets,
  getSheet,
  createSheet,
  updateSheet,
  deleteSheet,
  listVersions,
  getVersion,
  restoreVersion,
  pruneOldSheetVersions,
  listAudit,
  listFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  listTags,
  createTag,
  updateTag,
  deleteTag,
  listShares,
  addShare,
  removeShare,
  createUploadedSheet,
  createSheetFromXlsx,
  recordAudit
};
