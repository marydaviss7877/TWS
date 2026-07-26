/**
 * Sheets Hub – tenant org routes
 * Base path: /api/tenant/:tenantSlug/organization/sheets
 * Auth: verifyERPToken applied here so routes are protected even if mounted elsewhere
 */
const express = require('express');
const multer = require('multer');
const { body, query, param } = require('express-validator');
const router = express.Router({ mergeParams: true });
const ErrorHandler = require('../../../middleware/common/errorHandler');
const ValidationMiddleware = require('../../../middleware/validation/validation');
const sheetsHubService = require('../../../services/sheetsHub/sheetsHub.service');
const xlsxConverter = require('../../../services/sheetsHub/xlsxConverter.service');
const { uploadToS3, isS3Configured } = require('../../../config/s3');
const User = require('../../../models/users-auth/User');
const Tenant = require('../../../models/tenant/Tenant');
const SubscriptionPlan = require('../../../models/finance/SubscriptionPlan');
const usageTrackerService = require('../../../services/usageTrackerService');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { checkReadOnlySoftwareHouseOnly, getEffectiveUsageLimit } = require('../../../middleware/common/featureGate');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const logger = require('../../../utils/logger');

// Raw upload cap tighter than the generic upload route's 10MB — this buffer gets fully parsed
// into JSON in-process (hardening #5), not just streamed to S3.
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only .xlsx/.xls files are allowed'));
  }
});

const sheetsReadAccess = requireErpAccess({ module: 'sheets', action: ['read', 'write', 'admin'] });
const sheetsWriteAccess = requireErpAccess({ module: 'sheets', action: ['write', 'admin'] });

function getOrgId(req) {
  return req.orgId || req.tenant?.organizationId || req.tenant?.orgId;
}

function getUserId(req) {
  return req.user?._id || req.user?.id;
}

/**
 * Storage-quota check (Software House only; effective = plan + add-ons), mirroring the
 * existing upload-route pattern in documents.js. Returns true if the request may proceed;
 * otherwise it has already written the 403 response. `incomingBytes` is the size of the
 * content this request would add to S3-backed storage (0 for metadata-only writes).
 */
async function checkStorageQuotaOrRespond(req, res, tenantId, incomingBytes) {
  if (!incomingBytes || incomingBytes <= 0) return true;
  const tenant = await Tenant.findById(tenantId).select('erpCategory subscription');
  if (!tenant || tenant.erpCategory !== 'software_house') return true;
  const plan = await SubscriptionPlan.findOne({ slug: tenant.subscription?.plan || 'trial' });
  if (!plan) return true;
  const currentStorage = await usageTrackerService.getCurrentUsage(tenantId, 'storage');
  const limit = getEffectiveUsageLimit(tenant, plan, 'storage');
  if (limit !== -1 && currentStorage + incomingBytes > limit) {
    res.status(403).json({
      success: false,
      message: 'Storage limit exceeded. Please upgrade your plan.',
      code: 'USAGE_LIMIT_EXCEEDED',
      currentUsage: currentStorage,
      limit,
      requestedAmount: incomingBytes,
      upgradeRequired: true
    });
    return false;
  }
  return true;
}

// --- Sheets ---
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('folderId').optional().isMongoId(),
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
  sheetsReadAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'Organization context required' });
    }
    let tags = req.query.tags;
    if (typeof tags === 'string') tags = tags ? tags.split(',').filter(Boolean) : [];
    const result = await sheetsHubService.listSheets({
      orgId,
      userId: getUserId(req),
      role: req.user?.role,
      folderId: req.query.folderId || undefined,
      tags,
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
  sheetsReadAccess,
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

// Audit log (must be before /:id)
router.get('/audit/log',
  [
    query('sheetId').optional().isMongoId(),
    query('userId').optional().isMongoId(),
    query('sheetSearch').optional().isString(),
    query('userSearch').optional().isString(),
    query('action').optional().isString(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  sheetsReadAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const result = await sheetsHubService.listAudit({
      orgId,
      sheetId: req.query.sheetId,
      userId: req.query.userId,
      sheetSearch: req.query.sheetSearch,
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

// Upload (must be before /:id) — archives the raw file only, not parsed into an editable grid
router.post('/upload',
  verifyERPToken,
  checkReadOnlySoftwareHouseOnly,
  sheetsWriteAccess,
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

    const proceed = await checkStorageQuotaOrRespond(req, res, tenantId, req.file.size || 0);
    if (!proceed) return;

    const sheet = await sheetsHubService.createUploadedSheet({
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
    res.status(201).json({ success: true, data: { sheet } });
  })
);

// Import an existing .xlsx as a new, fully editable sheet (must be before /:id)
router.post('/import',
  verifyERPToken,
  checkReadOnlySoftwareHouseOnly,
  sheetsWriteAccess,
  (req, res, next) => {
    importUpload.single('file')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'File too large (max 15MB)' });
        return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
      }
      next();
    });
  },
  (req, _res, next) => {
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
    if (!req.file || !req.file.buffer) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const orgId = getOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id;
    const userId = getUserId(req);
    if (!orgId || !userId) return res.status(400).json({ success: false, message: 'Organization and user context required' });

    let workbookData;
    try {
      workbookData = await xlsxConverter.xlsxBufferToWorkbookData(req.file.buffer);
    } catch (err) {
      if (['MACRO_ENABLED_NOT_ALLOWED', 'WORKBOOK_TOO_LARGE', 'INVALID_XLSX'].includes(err.code)) {
        return res.status(400).json({ success: false, message: err.message, code: err.code });
      }
      if (err.code === 'XLSX_UNAVAILABLE') {
        return res.status(501).json({ success: false, message: err.message });
      }
      logger.error('xlsx import failed', { error: err.message });
      return res.status(400).json({ success: false, message: 'Failed to parse the uploaded file' });
    }

    const incomingBytes = Buffer.byteLength(JSON.stringify(workbookData), 'utf8');
    const proceed = await checkStorageQuotaOrRespond(req, res, tenantId, incomingBytes);
    if (!proceed) return;

    const sheet = await sheetsHubService.createSheetFromXlsx({
      orgId,
      tenantId,
      userId,
      title: req.body.title || req.file.originalname?.replace(/\.[^./\\]+$/, '') || 'Imported Sheet',
      workbookData,
      folderId: req.body.folderId,
      tags: req.body.tags || []
    });
    if (sheet && sheet.error) {
      return res.status(sheet.code === 'CONTENT_TOO_LARGE' ? 400 : 500).json({ success: false, message: sheet.error, code: sheet.code });
    }
    res.status(201).json({ success: true, data: { sheet } });
  })
);

// Folders (must be before /:id)
router.get('/folders/list',
  verifyERPToken,
  sheetsReadAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id;
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const scope = req.query.scope === 'employee' ? 'employee' : 'org';
    const ownerId = scope === 'employee' ? getUserId(req) : null;
    const folders = await sheetsHubService.listFolders(orgId, tenantId, scope, ownerId);
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
  sheetsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id;
    const userId = getUserId(req);
    if (!orgId || !userId) return res.status(400).json({ success: false, message: 'Organization and user context required' });
    const scope = req.body.scope === 'employee' ? 'employee' : 'org';
    const folder = await sheetsHubService.createFolder({
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
  sheetsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const folder = await sheetsHubService.updateFolder(req.params.folderId, orgId, {
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
  sheetsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    await sheetsHubService.deleteFolder(req.params.folderId, orgId);
    res.json({ success: true, data: { deleted: true } });
  })
);

// Tags (must be before /:id)
router.get('/tags/list',
  verifyERPToken,
  sheetsReadAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id;
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const tags = await sheetsHubService.listTags(orgId, tenantId);
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
  sheetsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id;
    const userId = getUserId(req);
    if (!orgId || !userId) return res.status(400).json({ success: false, message: 'Organization and user context required' });
    const tag = await sheetsHubService.createTag({
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
  sheetsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const tag = await sheetsHubService.updateTag(req.params.tagId, orgId, {
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
  sheetsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    await sheetsHubService.deleteTag(req.params.tagId, orgId);
    res.json({ success: true, data: { deleted: true } });
  })
);

// Share (must be before /:id)
router.get('/:id/shares',
  [param('id').isMongoId()],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  sheetsReadAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const shares = await sheetsHubService.listShares(req.params.id, orgId, {
      userId: getUserId(req),
      role: req.user?.role
    });
    if (shares === null) return res.status(404).json({ success: false, message: 'Sheet not found' });
    res.json({ success: true, data: { shares } });
  })
);

router.post('/:id/shares',
  [param('id').isMongoId(), body('userId').isMongoId(), body('permission').optional().isIn(['view', 'edit'])],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  sheetsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const sharedBy = getUserId(req);
    if (!orgId || !sharedBy) return res.status(400).json({ success: false, message: 'Organization and user context required' });
    const share = await sheetsHubService.addShare(req.params.id, orgId, sharedBy, req.body.userId, req.body.permission || 'view', {
      role: req.user?.role
    });
    if (!share) return res.status(404).json({ success: false, message: 'Sheet not found' });
    if (share.error) return res.status(400).json({ success: false, message: share.error, code: share.code });
    res.status(201).json({ success: true, data: { share } });
  })
);

router.delete('/:id/shares/:userId',
  [param('id').isMongoId(), param('userId').isMongoId()],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  sheetsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const result = await sheetsHubService.removeShare(req.params.id, orgId, req.params.userId, {
      actorUserId: getUserId(req),
      role: req.user?.role
    });
    if (result === null) return res.status(404).json({ success: false, message: 'Sheet not found' });
    res.json({ success: true, data: result });
  })
);

// Export a created (in-app) sheet as a real .xlsx file (must be before the bare /:id route)
router.get('/:id/export.xlsx',
  [param('id').isMongoId()],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  sheetsReadAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });

    const sheet = await sheetsHubService.getSheet(req.params.id, orgId, { userId, role: req.user?.role });
    if (!sheet) return res.status(404).json({ success: false, message: 'Sheet not found' });
    if (sheet.type !== 'created') {
      return res.status(400).json({ success: false, message: 'Only in-app created sheets can be exported to Excel' });
    }

    let buffer;
    try {
      buffer = await xlsxConverter.workbookDataToXlsxBuffer(sheet.content || {});
    } catch (err) {
      if (err.code === 'XLSX_UNAVAILABLE') return res.status(501).json({ success: false, message: err.message });
      if (err.code === 'WORKBOOK_TOO_LARGE') return res.status(400).json({ success: false, message: err.message, code: err.code });
      logger.error('xlsx export failed', { sheetId: req.params.id, error: err.message });
      return res.status(500).json({ success: false, message: 'Failed to generate Excel file' });
    }

    await sheetsHubService.recordAudit(req.params.id, orgId, userId, 'exported_xlsx');

    const filename = (sheet.title || 'Untitled').replace(/[^a-z0-9-_]/gi, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    res.send(buffer);
  })
);

router.get('/:id',
  [param('id').isMongoId()],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  sheetsReadAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const sheet = await sheetsHubService.getSheet(req.params.id, orgId, {
      userId: getUserId(req),
      role: req.user?.role
    });
    if (!sheet) return res.status(404).json({ success: false, message: 'Sheet not found' });
    res.json({ success: true, data: { sheet } });
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
  checkReadOnlySoftwareHouseOnly,
  sheetsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id;
    const userId = getUserId(req);
    if (!orgId || !userId) return res.status(400).json({ success: false, message: 'Organization and user context required' });

    if (req.body.content !== undefined) {
      const incomingBytes = Buffer.byteLength(JSON.stringify(req.body.content ?? ''), 'utf8');
      const proceed = await checkStorageQuotaOrRespond(req, res, tenantId, incomingBytes);
      if (!proceed) return;
    }

    const sheet = await sheetsHubService.createSheet({
      orgId,
      tenantId,
      userId,
      title: req.body.title,
      templateId: req.body.templateId,
      content: req.body.content,
      folderId: req.body.folderId,
      tags: req.body.tags || []
    });
    if (sheet && sheet.error) {
      return res.status(sheet.code === 'CONTENT_TOO_LARGE' ? 400 : 500).json({ success: false, message: sheet.error, code: sheet.code });
    }
    res.status(201).json({ success: true, data: { sheet } });
  })
);

router.patch('/:id',
  [
    param('id').isMongoId(),
    body('title').optional().trim().isLength({ max: 500 }),
    body('content').optional(),
    body('revision').optional().isInt({ min: 0 }),
    body('folderId').optional().isMongoId(),
    body('tags').optional().isArray(),
    body('tags.*').optional().isMongoId(),
    body('assigneeId').optional().isMongoId(),
    body('explicitVersion').optional().isBoolean()
  ],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  checkReadOnlySoftwareHouseOnly,
  sheetsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id;
    const userId = getUserId(req);
    if (!orgId || !userId) return res.status(400).json({ success: false, message: 'Organization and user context required' });

    if (req.body.content !== undefined) {
      const incomingBytes = Buffer.byteLength(JSON.stringify(req.body.content ?? ''), 'utf8');
      const proceed = await checkStorageQuotaOrRespond(req, res, tenantId, incomingBytes);
      if (!proceed) return;
    }

    const payload = {
      title: req.body.title,
      content: req.body.content,
      revision: req.body.revision,
      folderId: req.body.folderId,
      tags: req.body.tags
    };
    if (req.body.assigneeId !== undefined) payload.assigneeId = req.body.assigneeId;

    const sheet = await sheetsHubService.updateSheet(req.params.id, orgId, userId, payload, {
      role: req.user?.role,
      explicitVersion: !!req.body.explicitVersion
    });
    if (!sheet) return res.status(404).json({ success: false, message: 'Sheet not found' });
    if (sheet.error) {
      if (sheet.code === 'REVISION_CONFLICT') {
        return res.status(409).json({
          success: false,
          message: sheet.error,
          code: sheet.code,
          currentRevision: sheet.currentRevision,
          currentUpdatedAt: sheet.currentUpdatedAt
        });
      }
      return res.status(sheet.code === 'CONTENT_TOO_LARGE' ? 400 : 500).json({ success: false, message: sheet.error, code: sheet.code });
    }
    res.json({ success: true, data: { sheet } });
  })
);

router.delete('/:id',
  [param('id').isMongoId()],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  sheetsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    if (!orgId || !userId) return res.status(400).json({ success: false, message: 'Organization and user context required' });
    const sheet = await sheetsHubService.deleteSheet(req.params.id, orgId, userId, {
      role: req.user?.role
    });
    if (!sheet) return res.status(404).json({ success: false, message: 'Sheet not found' });
    res.json({ success: true, data: { sheet } });
  })
);

// --- Versions ---
router.get('/:id/versions',
  [param('id').isMongoId()],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  sheetsReadAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
    const versions = await sheetsHubService.listVersions(req.params.id, orgId, {
      userId: getUserId(req),
      role: req.user?.role
    });
    if (versions === null) return res.status(404).json({ success: false, message: 'Sheet not found' });
    res.json({ success: true, data: { versions } });
  })
);

router.post('/:id/versions/:versionId/restore',
  [param('id').isMongoId(), param('versionId').isMongoId()],
  ValidationMiddleware.handleValidationErrors,
  verifyERPToken,
  checkReadOnlySoftwareHouseOnly,
  sheetsWriteAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    if (!orgId || !userId) return res.status(400).json({ success: false, message: 'Organization and user context required' });
    const sheet = await sheetsHubService.restoreVersion(req.params.id, req.params.versionId, orgId, userId, {
      role: req.user?.role
    });
    if (!sheet) return res.status(404).json({ success: false, message: 'Sheet or version not found' });
    res.json({ success: true, data: { sheet } });
  })
);

module.exports = router;
