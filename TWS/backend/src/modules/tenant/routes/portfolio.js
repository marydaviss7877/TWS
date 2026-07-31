const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, query } = require('express-validator');
const router = express.Router({ mergeParams: true });
const PortfolioItem = require('../../../models/portfolio/PortfolioItem');
const portfolioService = require('../../../services/portfolio/portfolio.service');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const ValidationMiddleware = require('../../../middleware/validation/validation');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const { checkReadOnlySoftwareHouseOnly, getEffectiveUsageLimit } = require('../../../middleware/common/featureGate');
const { uploadPortfolioAsset, isS3Configured, deleteFromS3, validatePortfolioObjectSignature } = require('../../../config/s3');
const Tenant = require('../../../models/tenant/Tenant');
const SubscriptionPlan = require('../../../models/finance/SubscriptionPlan');
const usageTrackerService = require('../../../services/usageTrackerService');
const TenantAuditLog = require('../../../models/tenant/TenantAuditLog');

const readAccess = requireErpAccess({ module: 'portfolio', action: ['read', 'write', 'admin'] });
const writeAccess = requireErpAccess({ module: 'portfolio', action: ['write', 'admin'] });
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many uploads. Please try again in a minute.' }
});

const idValidator = param('id').isMongoId();
const handleValidation = ValidationMiddleware.handleValidationErrors;
const getOrgId = req => req.orgId || req.tenant?.organizationId || req.tenant?.orgId;
const getTenantId = req => req.tenantId || req.tenant?._id;
const getUserId = req => req.user?._id || req.user?.id;
const auditPortfolioEvent = (req, action, resourceId, metadata = {}) => TenantAuditLog.logEvent({
  tenantId: getTenantId(req),
  orgId: getOrgId(req),
  userId: getUserId(req),
  action,
  resourceType: 'portfolio',
  resourceId,
  ip: req.ip,
  userAgent: req.get('user-agent'),
  metadata
}).catch(error => console.warn('Portfolio audit log write failed:', error.message));

router.use(verifyERPToken);

router.get('/',
  readAccess,
  [query('status').optional().isIn(['draft', 'published', 'archived']),
    query('type').optional().isIn(['case_study', 'project', 'showcase', 'testimonial', 'resource']),
    query('featured').optional().isBoolean(),
    query('search').optional().trim().isLength({ max: 120 }),
    query('sort').optional().isIn(['curated', 'updatedAt', 'title', 'projectDate']),
    query('order').optional().isIn(['asc', 'desc']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })],
  handleValidation,
  ErrorHandler.asyncHandler(async (req, res) => {
    const result = await portfolioService.list({
      orgId: getOrgId(req),
      status: req.query.status,
      type: req.query.type,
      featured: req.query.featured === undefined ? undefined : req.query.featured === 'true',
      search: req.query.search,
      sort: req.query.sort || 'curated',
      order: req.query.order || 'desc',
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20
    });
    res.json({ success: true, data: result });
  })
);

router.post('/',
  checkReadOnlySoftwareHouseOnly,
  writeAccess,
  [body('title').trim().isLength({ min: 1, max: 180 }),
    body('slug').optional().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).isLength({ max: 180 }),
    body('type').optional().isIn(['case_study', 'project', 'showcase', 'testimonial', 'resource']),
    body('summary').optional().isString().isLength({ max: 600 })],
  handleValidation,
  ErrorHandler.asyncHandler(async (req, res) => {
    const item = await portfolioService.create({
      orgId: getOrgId(req), tenantId: getTenantId(req), userId: getUserId(req), payload: req.body
    });
    await auditPortfolioEvent(req, 'CREATE', item._id, { type: item.type });
    res.status(201).json({ success: true, data: { item } });
  })
);

const bulkIdsValidation = body('ids').isArray({ min: 1, max: 100 });

router.post('/bulk/status',
  checkReadOnlySoftwareHouseOnly, writeAccess,
  [bulkIdsValidation, body('ids.*').isMongoId(), body('status').isIn(['draft', 'archived'])],
  handleValidation,
  ErrorHandler.asyncHandler(async (req, res) => {
    const result = await portfolioService.bulkSetStatus({
      orgId: getOrgId(req), ids: req.body.ids, userId: getUserId(req), status: req.body.status
    });
    await auditPortfolioEvent(req, 'BULK_STATUS_CHANGE', 'bulk', { ids: req.body.ids, status: req.body.status });
    res.json({ success: true, data: { modifiedCount: result.modifiedCount } });
  })
);

router.post('/bulk/delete',
  checkReadOnlySoftwareHouseOnly, writeAccess,
  [bulkIdsValidation, body('ids.*').isMongoId()],
  handleValidation,
  ErrorHandler.asyncHandler(async (req, res) => {
    const result = await portfolioService.bulkSoftDelete({
      orgId: getOrgId(req), ids: req.body.ids, userId: getUserId(req)
    });
    await auditPortfolioEvent(req, 'BULK_DELETE', 'bulk', { ids: req.body.ids });
    res.json({ success: true, data: { modifiedCount: result.modifiedCount } });
  })
);

router.get('/:id',
  readAccess, idValidator, handleValidation,
  ErrorHandler.asyncHandler(async (req, res) => {
    const item = await portfolioService.get(getOrgId(req), req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Portfolio item not found' });
    res.json({ success: true, data: { item } });
  })
);

router.patch('/:id',
  checkReadOnlySoftwareHouseOnly, writeAccess,
  [idValidator, body('title').optional().trim().isLength({ min: 1, max: 180 }),
    body('slug').optional().matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).isLength({ max: 180 }),
    body('blocks').optional().isArray({ max: 100 }),
    body('metrics').optional().isArray({ max: 20 }),
    body('services').optional().isArray({ max: 30 }),
    body('technologies').optional().isArray({ max: 30 }),
    body('tags').optional().isArray({ max: 30 })],
  handleValidation,
  ErrorHandler.asyncHandler(async (req, res) => {
    const item = await portfolioService.update({
      orgId: getOrgId(req), id: req.params.id, userId: getUserId(req), payload: req.body
    });
    if (!item) return res.status(404).json({ success: false, message: 'Portfolio item not found' });
    await auditPortfolioEvent(req, 'UPDATE', item._id);
    res.json({ success: true, data: { item } });
  })
);

router.post('/:id/duplicate',
  checkReadOnlySoftwareHouseOnly, writeAccess, idValidator, handleValidation,
  ErrorHandler.asyncHandler(async (req, res) => {
    const item = await portfolioService.duplicate({
      orgId: getOrgId(req), id: req.params.id, userId: getUserId(req)
    });
    if (!item) return res.status(404).json({ success: false, message: 'Portfolio item not found' });
    await auditPortfolioEvent(req, 'DUPLICATE', item._id, { sourceId: req.params.id });
    res.status(201).json({ success: true, data: { item } });
  })
);

router.post('/:id/assets',
  uploadLimiter, checkReadOnlySoftwareHouseOnly, writeAccess, idValidator, handleValidation,
  (req, res, next) => {
    if (!isS3Configured()) return res.status(503).json({ success: false, message: 'File upload is not configured' });
    uploadPortfolioAsset.single('file')(req, res, async err => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'File is too large' });
        return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
      }
      const sizeLimit = req.file?.mimetype?.startsWith('image/') ? 5 * 1024 * 1024
        : req.file?.mimetype?.startsWith('video/') ? 100 * 1024 * 1024
          : 25 * 1024 * 1024;
      if (req.file && req.file.size > sizeLimit) {
        await deleteFromS3(req.file.key).catch(() => {});
        return res.status(400).json({ success: false, message: 'File exceeds the size limit for its media type' });
      }
      if (req.file) {
        try {
          const signatureIsValid = await validatePortfolioObjectSignature(req.file);
          if (!signatureIsValid) {
            await deleteFromS3(req.file.key).catch(() => {});
            return res.status(400).json({ success: false, message: 'File content does not match its declared format' });
          }
        } catch (signatureError) {
          await deleteFromS3(req.file.key).catch(() => {});
          return res.status(400).json({ success: false, message: 'Unable to verify uploaded file content' });
        }
      }
      next();
    });
  },
  [body('altText').optional().trim().isLength({ max: 300 }),
    body('caption').optional().trim().isLength({ max: 500 })],
  handleValidation,
  ErrorHandler.asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const tenantId = getTenantId(req);
    const tenant = await Tenant.findById(tenantId).select('erpCategory subscription');
    if (tenant?.erpCategory === 'software_house') {
      const plan = await SubscriptionPlan.findOne({ slug: tenant.subscription?.plan || 'trial' });
      if (plan) {
        const [currentStorage, limit] = await Promise.all([
          usageTrackerService.getCurrentUsage(tenantId, 'storage'),
          Promise.resolve(getEffectiveUsageLimit(tenant, plan, 'storage'))
        ]);
        if (limit !== -1 && currentStorage + (req.file.size || 0) > limit) {
          await deleteFromS3(req.file.key).catch(() => {});
          return res.status(403).json({
            success: false,
            message: 'Storage limit exceeded. Please upgrade your plan.',
            code: 'USAGE_LIMIT_EXCEEDED',
            currentUsage: currentStorage,
            limit,
            requestedAmount: req.file.size || 0,
            upgradeRequired: true
          });
        }
      }
    }
    const item = await portfolioService.addAsset({
      orgId: getOrgId(req), id: req.params.id, userId: getUserId(req), file: req.file, metadata: req.body
    });
    if (!item) {
      await deleteFromS3(req.file.key).catch(() => {});
      return res.status(404).json({ success: false, message: 'Portfolio item not found' });
    }
    await auditPortfolioEvent(req, 'UPLOAD_ASSET', item._id, { mimeType: req.file.mimetype, size: req.file.size });
    res.status(201).json({ success: true, data: { item } });
  })
);

router.delete('/:id/assets/:assetId',
  checkReadOnlySoftwareHouseOnly, writeAccess,
  [idValidator, param('assetId').isMongoId()], handleValidation,
  ErrorHandler.asyncHandler(async (req, res) => {
    const result = await portfolioService.removeAsset({
      orgId: getOrgId(req), id: req.params.id, assetId: req.params.assetId, userId: getUserId(req)
    });
    if (result === null) return res.status(404).json({ success: false, message: 'Portfolio item not found' });
    if (result === false) return res.status(404).json({ success: false, message: 'Asset not found' });
    await auditPortfolioEvent(req, 'DELETE_ASSET', req.params.id, { assetId: req.params.assetId });
    res.json({ success: true });
  })
);

router.post('/:id/status',
  checkReadOnlySoftwareHouseOnly, writeAccess,
  [idValidator, body('status').isIn(['draft', 'published', 'archived'])], handleValidation,
  ErrorHandler.asyncHandler(async (req, res) => {
    if (req.body.status === 'published') {
      const existing = await PortfolioItem.findOne({ _id: req.params.id, orgId: getOrgId(req), deletedAt: null }).lean();
      if (!existing) return res.status(404).json({ success: false, message: 'Portfolio item not found' });
      if (!existing.summary || (!existing.coverAssetId && !existing.blocks?.length)) {
        return res.status(400).json({ success: false, message: 'Add a summary and cover media or content before publishing' });
      }
    }
    const item = await portfolioService.setStatus({
      orgId: getOrgId(req), id: req.params.id, userId: getUserId(req), status: req.body.status
    });
    await auditPortfolioEvent(req, 'STATUS_CHANGE', item._id, { status: req.body.status });
    res.json({ success: true, data: { item } });
  })
);

router.delete('/:id',
  checkReadOnlySoftwareHouseOnly, writeAccess, idValidator, handleValidation,
  ErrorHandler.asyncHandler(async (req, res) => {
    const item = await portfolioService.softDelete({
      orgId: getOrgId(req), id: req.params.id, userId: getUserId(req)
    });
    if (!item) return res.status(404).json({ success: false, message: 'Portfolio item not found' });
    await auditPortfolioEvent(req, 'DELETE', item._id);
    res.json({ success: true });
  })
);

module.exports = router;
