/**
 * Document Hub – service layer: CRUD, versions, audit, S3 URLs
 */
const OrgDocument = require('../../models/documents/OrgDocument');
const OrgDocumentVersion = require('../../models/documents/OrgDocumentVersion');
const OrgDocumentAudit = require('../../models/documents/OrgDocumentAudit');
const OrgDocumentComment = require('../../models/documents/OrgDocumentComment');
const DocumentShare = require('../../models/documents/DocumentShare');
const DocumentFolder = require('../../models/documents/DocumentFolder');
const DocumentTag = require('../../models/documents/DocumentTag');
const Department = require('../../models/org/Department');
const TenantDepartmentAccess = require('../../models/tenant/TenantDepartmentAccess');
const User = require('../../models/users-auth/User');
const NotificationService = require('../notifications/notification.service');
const { generateSignedUrl } = require('../../config/s3');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const PRIVILEGED_DOCUMENT_ROLES = new Set([
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

function isPrivilegedDocumentRole(role) {
  return PRIVILEGED_DOCUMENT_ROLES.has(normalizeRole(role));
}

async function getAccessScopeClause(orgId, userId, role, requireEdit = false) {
  if (!userId) return null;
  if (isPrivilegedDocumentRole(role)) return null;

  const shareFilter = { orgId, userId };
  if (requireEdit) shareFilter.permission = 'edit';
  const shares = await DocumentShare.find(shareFilter).select('documentId').lean();
  const sharedIds = shares.map((s) => s.documentId).filter(Boolean);

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

/**
 * List documents with filters and pagination
 */
async function listDocuments({ orgId, tenantId, userId, role, folderId, tags, status, type, templateId, ownerId, search, sort = 'updatedAt', order = 'desc', page = DEFAULT_PAGE, limit = DEFAULT_LIMIT }) {
  const filter = { orgId, deletedAt: null };
  if (folderId !== undefined && folderId !== null && folderId !== '') filter.folderId = folderId;
  if (status) filter.status = status;
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
  const scopeClause = await getAccessScopeClause(orgId, userId, role, false);
  const scopedFilter = mergeScopedFilter(filter, scopeClause);

  const safeLimit = Math.min(limit, MAX_LIMIT);
  const skip = (Math.max(1, page) - 1) * safeLimit;
  const sortObj = { [sort]: order === 'asc' ? 1 : -1 };

  const [documents, total] = await Promise.all([
    OrgDocument.find(scopedFilter)
      .populate('folderId', 'name parentId')
      .populate('tags', 'name color')
      .populate('createdBy', 'fullName email')
      .populate('ownerId', 'fullName email')
      .populate('assigneeId', 'fullName email')
      .sort(sortObj)
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    OrgDocument.countDocuments(scopedFilter)
  ]);

  return {
    documents,
    pagination: {
      page: Math.max(1, page),
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit) || 1
    }
  };
}

/**
 * Get one document by id; optionally append signed download URL for uploads
 */
async function getDocument(documentId, orgId, options = {}) {
  const baseFilter = { _id: documentId, orgId, deletedAt: null };
  const scopeClause = await getAccessScopeClause(orgId, options.userId, options.role, false);
  const doc = await OrgDocument.findOne(mergeScopedFilter(baseFilter, scopeClause))
    .populate('folderId', 'name parentId')
    .populate('tags', 'name color')
    .populate('createdBy', 'fullName email')
    .populate('ownerId', 'fullName email')
    .populate('assigneeId', 'fullName email')
    .lean();

  if (!doc) return null;
  if (options.includeDownloadUrl && doc.type === 'uploaded' && doc.fileKey) {
    try {
      doc.downloadUrl = await generateSignedUrl(doc.fileKey);
    } catch (e) {
      doc.downloadUrl = null;
    }
  }
  return doc;
}

/**
 * Create document (from template or blank)
 */
async function createDocument({ orgId, tenantId, userId, title, templateId, content, folderId, tags }) {
  const doc = new OrgDocument({
    orgId,
    tenantId,
    type: 'created',
    title: title || 'Untitled',
    templateId: templateId || null,
    content: content || null,
    folderId: folderId || null,
    tags: tags || [],
    status: 'draft',
    createdBy: userId,
    ownerId: userId
  });
  await doc.save();

  await OrgDocumentAudit.create({
    documentId: doc._id,
    orgId,
    action: 'created',
    userId
  });

  return doc.toObject ? doc.toObject() : doc;
}

/**
 * Update document (metadata and/or content); create version snapshot when content changes
 */
async function updateDocument(documentId, orgId, userId, payload, options = {}) {
  const baseFilter = { _id: documentId, orgId, deletedAt: null };
  const scopeClause = await getAccessScopeClause(orgId, userId, options.role, true);
  const doc = await OrgDocument.findOne(mergeScopedFilter(baseFilter, scopeClause));
  if (!doc) return null;

  const contentChanged = payload.content !== undefined && JSON.stringify(payload.content) !== JSON.stringify(doc.content);
  if (contentChanged && doc.type === 'created' && doc.content) {
    const nextVersion = await OrgDocumentVersion.countDocuments({ documentId: doc._id }) + 1;
    await OrgDocumentVersion.create({
      documentId: doc._id,
      orgId,
      versionNumber: nextVersion,
      title: doc.title,
      content: doc.content,
      createdBy: userId
    });
  }

  if (payload.title !== undefined) doc.title = payload.title;
  if (payload.content !== undefined) doc.content = payload.content;
  if (payload.folderId !== undefined) doc.folderId = payload.folderId;
  if (payload.tags !== undefined) doc.tags = payload.tags;
  if (payload.status !== undefined) doc.status = payload.status;
  if (payload.assigneeId !== undefined) doc.assigneeId = payload.assigneeId || null;
  doc.updatedAt = new Date();
  await doc.save();

  await OrgDocumentAudit.create({
    documentId: doc._id,
    orgId,
    action: 'edited',
    userId,
    metadata: contentChanged ? { versionSnapshot: true } : null
  });

  return doc.toObject ? doc.toObject() : doc;
}

/**
 * Soft delete
 */
async function deleteDocument(documentId, orgId, userId, options = {}) {
  const baseFilter = { _id: documentId, orgId, deletedAt: null };
  const scopeClause = await getAccessScopeClause(orgId, userId, options.role, true);
  const doc = await OrgDocument.findOne(mergeScopedFilter(baseFilter, scopeClause));
  if (!doc) return null;
  doc.deletedAt = new Date();
  doc.updatedAt = new Date();
  await doc.save();

  await OrgDocumentAudit.create({
    documentId: doc._id,
    orgId,
    action: 'deleted',
    userId
  });

  return doc;
}

/**
 * Resolve reviewer user IDs: Department Head + Senior (admin/owner) in document's department; fallback org admins.
 */
async function resolveReviewerUserIds(orgId, tenantId, departmentId) {
  const ids = new Set();
  if (departmentId && tenantId) {
    const dept = await Department.findById(departmentId).select('departmentHead departmentHeadModel').lean();
    if (dept?.departmentHead && dept.departmentHeadModel === 'User') {
      ids.add(dept.departmentHead.toString());
    }
    const accessList = await TenantDepartmentAccess.find({
      tenantId,
      departmentId,
      status: 'active',
      accessLevel: { $in: ['admin', 'owner'] },
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }]
    })
      .select('userId')
      .lean();
    accessList.forEach((a) => ids.add(a.userId.toString()));
  }
  if (ids.size === 0) {
    const orgAdmins = await User.find({
      orgId,
      status: 'active',
      role: { $in: ['owner', 'admin', 'manager'] }
    })
      .select('_id')
      .limit(20)
      .lean();
    orgAdmins.forEach((u) => ids.add(u._id.toString()));
  }
  return Array.from(ids);
}

/**
 * Submit for review
 */
async function submitForReview(documentId, orgId, userId, options = {}) {
  const baseFilter = { _id: documentId, orgId, deletedAt: null };
  const scopeClause = await getAccessScopeClause(orgId, userId, options.role, true);
  const doc = await OrgDocument.findOne(mergeScopedFilter(baseFilter, scopeClause));
  if (!doc) return null;
  if (doc.status !== 'draft') return { error: 'Only draft documents can be submitted for review' };
  doc.status = 'in_review';
  doc.submittedForReviewAt = new Date();
  doc.updatedAt = new Date();
  await doc.save();

  await OrgDocumentAudit.create({
    documentId: doc._id,
    orgId,
    action: 'submitted_for_review',
    userId
  });

  const tenantId = doc.tenantId;
  const reviewerIds = await resolveReviewerUserIds(orgId, tenantId, doc.departmentId || null);
  if (reviewerIds.length > 0) {
    const submitter = await User.findById(userId).select('fullName').lean();
    const submitterName = submitter?.fullName || 'A user';
    const title = 'Document submitted for review';
    const message = `${submitterName} submitted "${doc.title}" for review.`;
    await NotificationService.createNotification({
      userIds: reviewerIds,
      type: 'document_submitted',
      title,
      message,
      relatedEntityType: 'document',
      relatedEntityId: doc._id,
      createdBy: userId,
      orgId,
      sendEmail: true
    });
  }

  return doc.toObject ? doc.toObject() : doc;
}

/**
 * Approve or reject
 */
async function setReviewOutcome(documentId, orgId, userId, outcome, comment, options = {}) {
  const doc = await OrgDocument.findOne({ _id: documentId, orgId, deletedAt: null });
  if (!doc) return null;
  if (doc.status !== 'in_review') return { error: 'Document is not in review' };
  if (!isPrivilegedDocumentRole(options.role)) {
    const reviewerIds = await resolveReviewerUserIds(orgId, doc.tenantId, doc.departmentId || null);
    const isReviewer = reviewerIds.some((id) => String(id) === String(userId));
    if (!isReviewer) {
      return { error: 'Only assigned reviewers can approve or reject this document', code: 'FORBIDDEN' };
    }
  }

  doc.status = outcome === 'approved' ? 'approved' : 'draft';
  if (outcome !== 'approved') doc.submittedForReviewAt = null;
  doc.updatedAt = new Date();
  await doc.save();

  await OrgDocumentAudit.create({
    documentId: doc._id,
    orgId,
    action: outcome === 'approved' ? 'approved' : 'rejected',
    userId,
    comment: comment || null
  });

  const creatorId = (doc.ownerId || doc.createdBy)?.toString?.() || doc.ownerId || doc.createdBy;
  if (creatorId) {
    const title = outcome === 'approved' ? 'Document approved' : 'Document returned to draft';
    const message =
      outcome === 'approved'
        ? `Document "${doc.title}" has been approved.`
        : `Document "${doc.title}" was returned to draft.${comment ? ` Comment: ${comment}` : ''}`;
    await NotificationService.createNotification({
      userIds: [creatorId],
      type: outcome === 'approved' ? 'document_approved' : 'document_rejected',
      title,
      message,
      relatedEntityType: 'document',
      relatedEntityId: doc._id,
      createdBy: userId,
      orgId,
      sendEmail: true
    });
  }

  return doc.toObject ? doc.toObject() : doc;
}

/**
 * List versions for a document
 */
async function listVersions(documentId, orgId, options = {}) {
  const baseFilter = { _id: documentId, orgId, deletedAt: null };
  const scopeClause = await getAccessScopeClause(orgId, options.userId, options.role, false);
  const doc = await OrgDocument.findOne(mergeScopedFilter(baseFilter, scopeClause)).select('_id').lean();
  if (!doc) return null;

  const versions = await OrgDocumentVersion.find({ documentId })
    .sort({ versionNumber: -1 })
    .populate('createdBy', 'fullName email')
    .lean();
  return versions;
}

/**
 * Get one version (for restore preview)
 */
async function getVersion(versionId, documentId, orgId) {
  const version = await OrgDocumentVersion.findOne({
    _id: versionId,
    documentId,
    orgId
  }).populate('createdBy', 'fullName email').lean();
  return version;
}

/**
 * Restore a version (creates new version with restored content, updates document)
 */
async function restoreVersion(documentId, versionId, orgId, userId, options = {}) {
  const baseFilter = { _id: documentId, orgId, deletedAt: null };
  const scopeClause = await getAccessScopeClause(orgId, userId, options.role, true);
  const doc = await OrgDocument.findOne(mergeScopedFilter(baseFilter, scopeClause));
  if (!doc) return null;
  const version = await OrgDocumentVersion.findOne({ _id: versionId, documentId, orgId }).lean();
  if (!version) return null;

  // Save current content as new version before overwriting
  const nextVersion = await OrgDocumentVersion.countDocuments({ documentId: doc._id }) + 1;
  await OrgDocumentVersion.create({
    documentId: doc._id,
    orgId,
    versionNumber: nextVersion,
    title: doc.title,
    content: doc.content,
    createdBy: userId
  });

  doc.content = version.content;
  doc.title = version.title;
  doc.updatedAt = new Date();
  await doc.save();

  await OrgDocumentAudit.create({
    documentId: doc._id,
    orgId,
    action: 'restored',
    userId,
    metadata: { fromVersionId: versionId, versionNumber: version.versionNumber }
  });

  return doc.toObject ? doc.toObject() : doc;
}

/**
 * List audit events (optionally by documentId or userId)
 */
async function listAudit({ orgId, documentId, userId, documentSearch, userSearch, action, dateFrom, dateTo, page = DEFAULT_PAGE, limit = DEFAULT_LIMIT }) {
  const filter = { orgId };
  if (documentId) filter.documentId = documentId;
  if (userId) filter.userId = userId;
  if (documentSearch && String(documentSearch).trim()) {
    const matchedDocs = await OrgDocument.find({
      orgId,
      deletedAt: null,
      title: { $regex: String(documentSearch).trim(), $options: 'i' }
    }).select('_id').limit(200).lean();
    const ids = matchedDocs.map((d) => d._id);
    filter.documentId = ids.length > 0 ? { $in: ids } : { $in: [] };
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
  
  // Date range filter
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) {
      // Include the entire end date (set to end of day)
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }

  const safeLimit = Math.min(limit, MAX_LIMIT);
  const skip = (Math.max(1, page) - 1) * safeLimit;

  const [events, total] = await Promise.all([
    OrgDocumentAudit.find(filter)
      .populate('userId', 'fullName email')
      .populate('documentId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    OrgDocumentAudit.countDocuments(filter)
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
  const folders = await DocumentFolder.find(filter)
    .populate('parentId', 'name')
    .sort({ name: 1 })
    .lean();
  return folders;
}

async function createFolder({ orgId, tenantId, userId, name, parentId, scope = 'org', ownerId = null }) {
  const folder = new DocumentFolder({
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
  const folder = await DocumentFolder.findOne({ _id: folderId, orgId });
  if (!folder) return null;
  if (payload.name !== undefined) folder.name = payload.name;
  if (payload.parentId !== undefined) folder.parentId = payload.parentId;
  folder.updatedAt = new Date();
  await folder.save();
  return folder.toObject ? folder.toObject() : folder;
}

async function deleteFolder(folderId, orgId) {
  const folder = await DocumentFolder.findOne({ _id: folderId, orgId });
  if (!folder) return null;
  await OrgDocument.updateMany(
    { orgId, folderId, deletedAt: null },
    { $set: { folderId: null, updatedAt: new Date() } }
  );
  await folder.deleteOne();
  return { deleted: true };
}

// --- Tags ---
async function listTags(orgId, tenantId) {
  const tags = await DocumentTag.find({ orgId, tenantId }).sort({ name: 1 }).lean();
  return tags;
}

async function createTag({ orgId, tenantId, userId, name, color }) {
  const tag = new DocumentTag({
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
  const tag = await DocumentTag.findOne({ _id: tagId, orgId });
  if (!tag) return null;
  if (payload.name !== undefined) tag.name = payload.name;
  if (payload.color !== undefined) tag.color = payload.color;
  await tag.save();
  return tag.toObject ? tag.toObject() : tag;
}

async function deleteTag(tagId, orgId) {
  const tag = await DocumentTag.findOne({ _id: tagId, orgId });
  if (!tag) return null;
  await OrgDocument.updateMany(
    { orgId, tags: tagId, deletedAt: null },
    { $pull: { tags: tagId }, $set: { updatedAt: new Date() } }
  );
  await tag.deleteOne();
  return { deleted: true };
}

async function listInReviewForReviewer({ orgId, tenantId, userId, role, page = DEFAULT_PAGE, limit = 50 }) {
  const safeLimit = Math.min(limit, MAX_LIMIT);
  const skip = (Math.max(1, page) - 1) * safeLimit;
  const baseFilter = { orgId, deletedAt: null, status: 'in_review' };

  // Privileged roles can review all documents in review.
  if (isPrivilegedDocumentRole(role)) {
    const [documents, total] = await Promise.all([
      OrgDocument.find(baseFilter)
        .populate('folderId', 'name parentId')
        .populate('tags', 'name color')
        .populate('createdBy', 'fullName email')
        .populate('ownerId', 'fullName email')
        .populate('assigneeId', 'fullName email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      OrgDocument.countDocuments(baseFilter)
    ]);
    return {
      documents,
      pagination: {
        page: Math.max(1, page),
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit) || 1
      }
    };
  }

  const allInReview = await OrgDocument.find(baseFilter)
    .select('_id departmentId tenantId')
    .sort({ updatedAt: -1 })
    .lean();
  const visibleIds = [];
  for (const doc of allInReview) {
    const reviewerIds = await resolveReviewerUserIds(
      orgId,
      doc.tenantId || tenantId || null,
      doc.departmentId || null
    );
    if (reviewerIds.some((id) => String(id) === String(userId))) {
      visibleIds.push(doc._id);
    }
  }
  const pagedIds = visibleIds.slice(skip, skip + safeLimit);
  const documents = await OrgDocument.find({ _id: { $in: pagedIds }, orgId, deletedAt: null, status: 'in_review' })
    .populate('folderId', 'name parentId')
    .populate('tags', 'name color')
    .populate('createdBy', 'fullName email')
    .populate('ownerId', 'fullName email')
    .populate('assigneeId', 'fullName email')
    .sort({ updatedAt: -1 })
    .lean();
  return {
    documents,
    pagination: {
      page: Math.max(1, page),
      limit: safeLimit,
      total: visibleIds.length,
      pages: Math.ceil(visibleIds.length / safeLimit) || 1
    }
  };
}

// --- Comments ---
async function listComments(documentId, orgId, options = {}) {
  const baseFilter = { _id: documentId, orgId, deletedAt: null };
  const scopeClause = await getAccessScopeClause(orgId, options.userId, options.role, false);
  const doc = await OrgDocument.findOne(mergeScopedFilter(baseFilter, scopeClause)).select('_id').lean();
  if (!doc) return null;
  const comments = await OrgDocumentComment.find({ documentId, orgId })
    .populate('userId', 'fullName email')
    .sort({ createdAt: 1 })
    .lean();
  return comments;
}

async function createComment(documentId, orgId, userId, content, options = {}) {
  const baseFilter = { _id: documentId, orgId, deletedAt: null };
  const scopeClause = await getAccessScopeClause(orgId, userId, options.role, false);
  const doc = await OrgDocument.findOne(mergeScopedFilter(baseFilter, scopeClause)).select('_id').lean();
  if (!doc) return null;
  const trimmed = (content || '').trim();
  if (!trimmed) return { error: 'Comment content is required' };
  const comment = new OrgDocumentComment({
    documentId,
    orgId,
    userId,
    content: trimmed
  });
  await comment.save();
  const populated = await OrgDocumentComment.findById(comment._id)
    .populate('userId', 'fullName email')
    .lean();
  return populated;
}

// --- Share ---
async function listShares(documentId, orgId, options = {}) {
  const baseFilter = { _id: documentId, orgId, deletedAt: null };
  const scopeClause = await getAccessScopeClause(orgId, options.userId, options.role, false);
  const doc = await OrgDocument.findOne(mergeScopedFilter(baseFilter, scopeClause)).select('_id').lean();
  if (!doc) return null;
  const shares = await DocumentShare.find({ documentId, orgId })
    .populate('userId', 'fullName email')
    .populate('sharedBy', 'fullName email')
    .sort({ createdAt: 1 })
    .lean();
  return shares;
}

async function addShare(documentId, orgId, sharedByUserId, userId, permission = 'view', options = {}) {
  const baseFilter = { _id: documentId, orgId, deletedAt: null };
  const scopeClause = await getAccessScopeClause(orgId, sharedByUserId, options.role, true);
  const doc = await OrgDocument.findOne(mergeScopedFilter(baseFilter, scopeClause))
    .select('_id createdBy ownerId')
    .lean();
  if (!doc) return null;
  const targetUserId = String(userId);
  const actorUserId = String(sharedByUserId);
  const ownerUserId = doc.ownerId ? String(doc.ownerId) : null;
  const creatorUserId = doc.createdBy ? String(doc.createdBy) : null;
  if (targetUserId === actorUserId) {
    return { error: 'You cannot share a document with yourself', code: 'INVALID_SHARE_TARGET' };
  }
  if (ownerUserId && targetUserId === ownerUserId) {
    return { error: 'Owner already has full access to this document', code: 'INVALID_SHARE_TARGET' };
  }
  if (creatorUserId && targetUserId === creatorUserId) {
    return { error: 'Creator already has access to this document', code: 'INVALID_SHARE_TARGET' };
  }
  const targetUser = await User.findOne({ _id: userId, orgId, status: 'active' }).select('_id').lean();
  if (!targetUser) {
    return { error: 'Selected user not found in this organization', code: 'INVALID_SHARE_TARGET' };
  }
  const perm = permission === 'edit' ? 'edit' : 'view';
  let share = await DocumentShare.findOne({ documentId, userId });
  if (share) {
    share.permission = perm;
    share.sharedBy = sharedByUserId;
    await share.save();
  } else {
    share = new DocumentShare({
      documentId,
      orgId,
      userId,
      permission: perm,
      sharedBy: sharedByUserId
    });
    await share.save();
  }
  const populated = await DocumentShare.findById(share._id)
    .populate('userId', 'fullName email')
    .populate('sharedBy', 'fullName email')
    .lean();
  return populated;
}

async function removeShare(documentId, orgId, userId, options = {}) {
  const baseFilter = { _id: documentId, orgId, deletedAt: null };
  const scopeClause = await getAccessScopeClause(orgId, options.actorUserId, options.role, true);
  const doc = await OrgDocument.findOne(mergeScopedFilter(baseFilter, scopeClause)).select('_id').lean();
  if (!doc) return null;
  const result = await DocumentShare.deleteOne({ documentId, userId });
  return { deleted: result.deletedCount > 0 };
}

/**
 * Create uploaded document (after S3 upload); req.file from multer-s3 has .key, .location, .originalname, .size, .mimetype
 */
async function createUploadedDocument({ orgId, tenantId, userId, fileKey, fileName, mimeType, fileSize, title, folderId, tags }) {
  const doc = new OrgDocument({
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
    status: 'draft',
    createdBy: userId,
    ownerId: userId
  });
  await doc.save();

  await OrgDocumentAudit.create({
    documentId: doc._id,
    orgId,
    action: 'created',
    userId,
    metadata: { type: 'uploaded' }
  });

  return doc.toObject ? doc.toObject() : doc;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Document review timeout job (FR26): 7 days re-notify reviewers, 14 days escalate to Dept Head.
 * Call daily from scheduler. Sends at most one 7-day reminder (when 7 <= days < 8) and one 14-day (when 14 <= days < 15).
 */
async function runDocumentReviewTimeoutJob() {
  const now = Date.now();
  const docs = await OrgDocument.find({
    status: 'in_review',
    submittedForReviewAt: { $ne: null, $exists: true }
  })
    .select('_id title orgId tenantId departmentId submittedForReviewAt')
    .lean();

  for (const doc of docs) {
    const submittedAt = doc.submittedForReviewAt.getTime();
    const days = (now - submittedAt) / ONE_DAY_MS;
    let reviewerIds = [];
    let title = '';
    let message = '';

    if (days >= 14 && days < 15) {
      const dept = doc.departmentId
        ? await Department.findById(doc.departmentId).select('departmentHead departmentHeadModel').lean()
        : null;
      if (dept?.departmentHead && dept.departmentHeadModel === 'User') {
        reviewerIds = [dept.departmentHead.toString()];
      }
      if (reviewerIds.length === 0) {
        const fallback = await User.find({
          orgId: doc.orgId,
          status: 'active',
          role: { $in: ['owner', 'admin'] }
        })
          .select('_id')
          .limit(5)
          .lean();
        reviewerIds = fallback.map((u) => u._id.toString());
      }
      title = 'Document review overdue (14 days)';
      message = `"${doc.title}" has been in review for 14 days; please take action.`;
    } else if (days >= 7 && days < 8) {
      reviewerIds = await resolveReviewerUserIds(
        doc.orgId,
        doc.tenantId,
        doc.departmentId || null
      );
      title = 'Document in review (7 days)';
      message = `"${doc.title}" has been in review for 7 days.`;
    }

    if (reviewerIds.length > 0 && (title && message)) {
      await NotificationService.createNotification({
        userIds: reviewerIds,
        type: 'document_submitted',
        title,
        message,
        relatedEntityType: 'document',
        relatedEntityId: doc._id,
        createdBy: null,
        orgId: doc.orgId,
        sendEmail: true
      });
    }
  }
}

module.exports = {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  submitForReview,
  setReviewOutcome,
  runDocumentReviewTimeoutJob,
  listVersions,
  getVersion,
  restoreVersion,
  listAudit,
  listComments,
  createComment,
  listShares,
  addShare,
  removeShare,
  listFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  listInReviewForReviewer,
  listTags,
  createTag,
  updateTag,
  deleteTag,
  createUploadedDocument
};
