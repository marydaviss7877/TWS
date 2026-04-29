/**
 * Document Hub – tenant org routes
 * Base path: /api/tenant/:tenantSlug/organization/documents
 * Auth: verifyERPToken applied here so routes are protected even if mounted elsewhere
 */
const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router({ mergeParams: true });
const ErrorHandler = require('../../../middleware/common/errorHandler');
const ValidationMiddleware = require('../../../middleware/validation/validation');
const documentHubService = require('../../../services/documentHub/documentHub.service');
const { uploadToS3, isS3Configured } = require('../../../config/s3');
const User = require('../../../models/users-auth/User');
const Tenant = require('../../../models/tenant/Tenant');
const SubscriptionPlan = require('../../../models/finance/SubscriptionPlan');
const usageTrackerService = require('../../../services/usageTrackerService');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { checkReadOnlySoftwareHouseOnly, getEffectiveUsageLimit } = require('../../../middleware/common/featureGate');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');

const documentsReadAccess = requireErpAccess({ module: 'documents', action: ['read', 'write', 'admin'] });
const documentsWriteAccess = requireErpAccess({ module: 'documents', action: ['write', 'admin'] });

function getOrgId(req) {
  return req.orgId || req.tenant?.organizationId || req.tenant?.orgId;
}

function getUserId(req) {
  return req.user?._id || req.user?.id;
}

// --- Documents ---
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('folderId').optional().isMongoId(),
    query('status').optional().isIn(['draft', 'in_review', 'approved', 'archived']),
    query('type').optional().isIn(['created', 'uploaded']),
    query('templateId').optional().notEmpty(),
    query('ownerId').optional().isMongoId(),
    query('tags').optional(),
    query('search').optional().isString(),
    query('sort').optional().isIn(['updatedAt', 'createdAt', 'title']),
    query('order').optional().isIn(['asc', 'desc'])
  ],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsReadAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id;
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'Organization context required' });
    }
    let tags = req.query.tags;
    if (typeof tags === 'string') tags = tags ? tags.split(',').filter(Boolean) : [];
    const result = await documentHubService.listDocuments({
      orgId,
      tenantId,
      userId: getUserId(req),
      role: req.user?.role,
      folderId: req.query.folderId || undefined,
      tags,
      status: req.query.status,
      type: req.query.type,
      templateId: req.query.templateId || undefined,
      ownerId: req.query.ownerId || undefined,
      search: req.query.search,
      sort: req.query.sort || 'updatedAt',
      order: req.query.order || 'desc',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    });
    res.json({ success: true, data: result });
  })
);

// Org users list (for assign/share picker); must be before /:id
router.get('/org-users',
  verifyERPToken,
  documentsReadAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const users = await User.find({ orgId, status: 'active' })
      .select('_id fullName email')
      .sort({ fullName: 1 })
      .limit(200)
      .lean();
    res.json({ success: true, data: { users } });
  })
);

router.get('/in-review',
  verifyERPToken,
  documentsReadAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const result = await documentHubService.listInReviewForReviewer({
      orgId,
      tenantId: req.tenantId || req.tenant?._id,
      userId: getUserId(req),
      role: req.user?.role,
      page: 1,
      limit: 50
    });
    res.json({ success: true, data: result });
  })
);

// Audit log (must be before /:id)
router.get('/audit/log',
  [
    query('documentId').optional().isMongoId(),
    query('userId').optional().isMongoId(),
    query('documentSearch').optional().isString(),
    query('userSearch').optional().isString(),
    query('action').optional().isString(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsReadAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const result = await documentHubService.listAudit({
      orgId,
      documentId: req.query.documentId,
      userId: req.query.userId,
      documentSearch: req.query.documentSearch,
      userSearch: req.query.userSearch,
      action: req.query.action,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    });
    res.json({ success: true, data: result });
  })
);

// Upload (must be before /:id)
router.post('/upload',
  verifyERPToken,
  checkReadOnlySoftwareHouseOnly,
  documentsWriteAccess,
  (req, res, next) => {
    if (!isS3Configured()) {
      return res.status(503).json({
        success: false,
        message: 'File upload is not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your environment (see env.example).'
      });
    }
    uploadToS3.single('file')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'File too large (max 10MB)' });
        return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
      }
      next();
    });
  },
  (req, _res, next) => {
    // FormData may send repeated "tags" fields as string or array depending count.
    if (req.body && req.body.tags !== undefined && !Array.isArray(req.body.tags)) {
      req.body.tags = [req.body.tags].filter(Boolean);
    }
    next();
  },
  [
    body('title').optional().trim().isLength({ max: 500 }),
    body('folderId').optional().isMongoId(),
    body('tags').optional().isArray(),
    body('tags.*').optional().isMongoId()
  ],
  ValidationMiddleware.handleValidationErrors,
  ErrorHandler.asyncHandler(async (req, res) => {
    if (!req.file || !req.file.key) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const orgId = getOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id;
    const userId = getUserId(req);
    if (!orgId || !userId) return res.status(400).json({ success: false, message: 'Organization and user context required' });
    // Storage limit (Software House only; effective = plan + add-ons)
    const tenant = await Tenant.findById(tenantId).select('erpCategory subscription');
    if (tenant && tenant.erpCategory === 'software_house') {
      const plan = await SubscriptionPlan.findOne({ slug: tenant.subscription?.plan || 'trial' });
      if (plan) {
        const currentStorage = await usageTrackerService.getCurrentUsage(tenantId, 'storage');
        const limit = getEffectiveUsageLimit(tenant, plan, 'storage');
        const fileSize = req.file.size || 0;
        if (limit !== -1 && currentStorage + fileSize > limit) {
          return res.status(403).json({
            success: false,
            message: 'Storage limit exceeded. Please upgrade your plan.',
            code: 'USAGE_LIMIT_EXCEEDED',
            currentUsage: currentStorage,
            limit,
            requestedAmount: fileSize,
            upgradeRequired: true
          });
        }
      }
    }
    const doc = await documentHubService.createUploadedDocument({
      orgId,
      tenantId,
      userId,
      fileKey: req.file.key,
      fileName: req.file.originalname || null,
      mimeType: req.file.mimetype || req.file.contentType || null,
      fileSize: req.file.size || null,
      title: req.body.title,
      folderId: req.body.folderId,
      tags: req.body.tags || []
    });
    res.status(201).json({ success: true, data: { document: doc } });
  })
);

// Folders (must be before /:id)
router.get('/folders/list',
  verifyERPToken,
  documentsReadAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id;
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const scope = req.query.scope === 'employee' ? 'employee' : 'org';
    const ownerId = scope === 'employee' ? getUserId(req) : null;
    const folders = await documentHubService.listFolders(orgId, tenantId, scope, ownerId);
    res.json({ success: true, data: { folders } });
  })
);

router.post('/folders',
  [
    body('name').trim().notEmpty().isLength({ max: 255 }),
    body('parentId').optional().isMongoId(),
    body('scope').optional().isIn(['org', 'employee'])
  ],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id;
    const userId = getUserId(req);
    if (!orgId || !userId) return res.status(400).json({ success: false, message: 'Organization and user context required' });
    const scope = req.body.scope === 'employee' ? 'employee' : 'org';
    const folder = await documentHubService.createFolder({
      orgId,
      tenantId,
      userId,
      name: req.body.name,
      parentId: req.body.parentId,
      scope,
      ownerId: scope === 'employee' ? userId : null
    });
    res.status(201).json({ success: true, data: { folder } });
  })
);

router.patch('/folders/:folderId',
  [
    param('folderId').isMongoId(),
    body('name').optional().trim().isLength({ max: 255 }),
    body('parentId').optional().isMongoId()
  ],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const folder = await documentHubService.updateFolder(req.params.folderId, orgId, {
      name: req.body.name,
      parentId: req.body.parentId
    });
    if (!folder) return res.status(404).json({ success: false, message: 'Folder not found' });
    res.json({ success: true, data: { folder } });
  })
);

router.delete('/folders/:folderId',
  [param('folderId').isMongoId()],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    await documentHubService.deleteFolder(req.params.folderId, orgId);
    res.json({ success: true, data: { deleted: true } });
  })
);

// Tags (must be before /:id)
router.get('/tags/list',
  verifyERPToken,
  documentsReadAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id;
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const tags = await documentHubService.listTags(orgId, tenantId);
    res.json({ success: true, data: { tags } });
  })
);

router.post('/tags',
  [
    body('name').trim().notEmpty().isLength({ max: 80 }),
    body('color').optional().trim().isLength({ max: 30 })
  ],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id;
    const userId = getUserId(req);
    if (!orgId || !userId) return res.status(400).json({ success: false, message: 'Organization and user context required' });
    const tag = await documentHubService.createTag({
      orgId,
      tenantId,
      userId,
      name: req.body.name,
      color: req.body.color
    });
    res.status(201).json({ success: true, data: { tag } });
  })
);

router.patch('/tags/:tagId',
  [
    param('tagId').isMongoId(),
    body('name').optional().trim().isLength({ max: 80 }),
    body('color').optional().trim().isLength({ max: 30 })
  ],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const tag = await documentHubService.updateTag(req.params.tagId, orgId, {
      name: req.body.name,
      color: req.body.color
    });
    if (!tag) return res.status(404).json({ success: false, message: 'Tag not found' });
    res.json({ success: true, data: { tag } });
  })
);

router.delete('/tags/:tagId',
  [param('tagId').isMongoId()],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    await documentHubService.deleteTag(req.params.tagId, orgId);
    res.json({ success: true, data: { deleted: true } });
  })
);

// Comments (must be before /:id single-doc routes that use :id for documentId)
router.get('/:id/comments',
  [param('id').isMongoId()],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsReadAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const comments = await documentHubService.listComments(req.params.id, orgId, {
      userId: getUserId(req),
      role: req.user?.role
    });
    if (comments === null) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, data: { comments } });
  })
);

router.post('/:id/comments',
  [param('id').isMongoId(), body('content').trim().notEmpty().isLength({ max: 5000 })],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsReadAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    if (!orgId || !userId) return res.status(400).json({ success: false, message: 'Organization and user context required' });
    const comment = await documentHubService.createComment(req.params.id, orgId, userId, req.body.content, {
      role: req.user?.role
    });
    if (!comment) return res.status(404).json({ success: false, message: 'Document not found' });
    if (comment.error) return res.status(400).json({ success: false, message: comment.error });
    res.status(201).json({ success: true, data: { comment } });
  })
);

// Share (must be before /:id for document)
router.get('/:id/shares',
  [param('id').isMongoId()],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsReadAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const shares = await documentHubService.listShares(req.params.id, orgId, {
      userId: getUserId(req),
      role: req.user?.role
    });
    if (shares === null) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, data: { shares } });
  })
);

router.post('/:id/shares',
  [param('id').isMongoId(), body('userId').isMongoId(), body('permission').optional().isIn(['view', 'edit'])],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const sharedBy = getUserId(req);
    if (!orgId || !sharedBy) return res.status(400).json({ success: false, message: 'Organization and user context required' });
    const share = await documentHubService.addShare(req.params.id, orgId, sharedBy, req.body.userId, req.body.permission || 'view', {
      role: req.user?.role
    });
    if (!share) return res.status(404).json({ success: false, message: 'Document not found' });
    if (share.error) return res.status(400).json({ success: false, message: share.error, code: share.code });
    res.status(201).json({ success: true, data: { share } });
  })
);

router.delete('/:id/shares/:userId',
  [param('id').isMongoId(), param('userId').isMongoId()],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const result = await documentHubService.removeShare(req.params.id, orgId, req.params.userId, {
      actorUserId: getUserId(req),
      role: req.user?.role
    });
    if (result === null) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, data: result });
  })
);

router.get('/:id',
  [param('id').isMongoId()],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsReadAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const doc = await documentHubService.getDocument(req.params.id, orgId, {
      includeDownloadUrl: true,
      userId: getUserId(req),
      role: req.user?.role
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, data: { document: doc } });
  })
);

router.post('/',
  [
    body('title').optional().trim().isLength({ max: 500 }),
    body('templateId').optional().trim(),
    body('content').optional(),
    body('folderId').optional().isMongoId(),
    body('tags').optional().isArray(),
    body('tags.*').optional().isMongoId()
  ],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id;
    const userId = getUserId(req);
    if (!orgId || !userId) return res.status(400).json({ success: false, message: 'Organization and user context required' });
    const doc = await documentHubService.createDocument({
      orgId,
      tenantId,
      userId,
      title: req.body.title,
      templateId: req.body.templateId,
      content: req.body.content,
      folderId: req.body.folderId,
      tags: req.body.tags || []
    });
    res.status(201).json({ success: true, data: { document: doc } });
  })
);

router.patch('/:id',
  [
    param('id').isMongoId(),
    body('title').optional().trim().isLength({ max: 500 }),
    body('content').optional(),
    body('folderId').optional().isMongoId(),
    body('tags').optional().isArray(),
    body('tags.*').optional().isMongoId(),
    body('status').optional().isIn(['draft', 'in_review', 'approved', 'archived']),
    body('assigneeId').optional().isMongoId()
  ],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    if (!orgId || !userId) return res.status(400).json({ success: false, message: 'Organization and user context required' });
    const payload = {
      title: req.body.title,
      content: req.body.content,
      folderId: req.body.folderId,
      tags: req.body.tags,
      status: req.body.status
    };
    if (req.body.assigneeId !== undefined) payload.assigneeId = req.body.assigneeId;
    const doc = await documentHubService.updateDocument(req.params.id, orgId, userId, payload, {
      role: req.user?.role
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, data: { document: doc } });
  })
);

router.delete('/:id',
  [param('id').isMongoId()],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    if (!orgId || !userId) return res.status(400).json({ success: false, message: 'Organization and user context required' });
    const doc = await documentHubService.deleteDocument(req.params.id, orgId, userId, {
      role: req.user?.role
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, data: { document: doc } });
  })
);

router.post('/:id/submit-for-review',
  [param('id').isMongoId()],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    if (!orgId || !userId) return res.status(400).json({ success: false, message: 'Organization and user context required' });
    const doc = await documentHubService.submitForReview(req.params.id, orgId, userId, {
      role: req.user?.role
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    if (doc.error) return res.status(400).json({ success: false, message: doc.error });
    res.json({ success: true, data: { document: doc } });
  })
);

router.post('/:id/approve',
  [
    param('id').isMongoId(),
    body('comment').optional().trim().isLength({ max: 2000 })
  ],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    if (!orgId || !userId) return res.status(400).json({ success: false, message: 'Organization and user context required' });
    const doc = await documentHubService.setReviewOutcome(req.params.id, orgId, userId, 'approved', req.body.comment, {
      role: req.user?.role
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    if (doc.error && doc.code === 'FORBIDDEN') return res.status(403).json({ success: false, message: doc.error });
    if (doc.error) return res.status(400).json({ success: false, message: doc.error });
    res.json({ success: true, data: { document: doc } });
  })
);

router.post('/:id/reject',
  [
    param('id').isMongoId(),
    body('comment').optional().trim().isLength({ max: 2000 })
  ],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    if (!orgId || !userId) return res.status(400).json({ success: false, message: 'Organization and user context required' });
    const doc = await documentHubService.setReviewOutcome(req.params.id, orgId, userId, 'rejected', req.body.comment, {
      role: req.user?.role
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    if (doc.error && doc.code === 'FORBIDDEN') return res.status(403).json({ success: false, message: doc.error });
    if (doc.error) return res.status(400).json({ success: false, message: doc.error });
    res.json({ success: true, data: { document: doc } });
  })
);

// --- Versions ---
router.get('/:id/versions',
  [param('id').isMongoId()],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsReadAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const versions = await documentHubService.listVersions(req.params.id, orgId, {
      userId: getUserId(req),
      role: req.user?.role
    });
    if (versions === null) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, data: { versions } });
  })
);

router.post('/:id/versions/:versionId/restore',
  [param('id').isMongoId(), param('versionId').isMongoId()],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  documentsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    if (!orgId || !userId) return res.status(400).json({ success: false, message: 'Organization and user context required' });
    const doc = await documentHubService.restoreVersion(req.params.id, req.params.versionId, orgId, userId, {
      role: req.user?.role
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Document or version not found' });
    res.json({ success: true, data: { document: doc } });
  })
);

module.exports = router;
