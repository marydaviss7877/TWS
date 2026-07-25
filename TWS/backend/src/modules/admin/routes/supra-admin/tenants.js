/**
 * Supra Admin - Tenant Management routes
 */

const { express, body, validationResult } = require('./shared');
const router = express.Router();
const {
  requirePlatformPermission,
  requirePlatformAdminAccessReason,
  PLATFORM_PERMISSIONS,
  Tenant,
  tenantService,
  platformAdminAccessService
} = require('./shared');

// Get all tenants
/**
 * @swagger
 * /api/supra-admin/tenants:
 *   get:
 *     summary: List all tenants across the platform
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Exact status filter; overrides includeCancelled when set
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive regex match against name, slug, or contactInfo.email
 *       - in: query
 *         name: includeCancelled
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: When not 'true' and status is unset, cancelled tenants are excluded
 *     responses:
 *       200:
 *         description: Tenant list with pagination and status summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tenants:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     current:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     totalIncludingCancelled:
 *                       type: integer
 *                     active:
 *                       type: integer
 *                     suspended:
 *                       type: integer
 *                     trialing:
 *                       type: integer
 *                     cancelled:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/tenants', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.READ), async (req, res) => {
  try {
    const { page = 1, limit = 100, status, search, includeCancelled } = req.query;
    const filter = {};
    if (status) filter.status = status;
    else if (includeCancelled !== 'true' && includeCancelled !== true) filter.status = { $ne: 'cancelled' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } }
      ];
    }
    const tenants = await Tenant.find(filter).populate('createdBy', 'fullName email').sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await Tenant.countDocuments(filter);
    const totalIncludingCancelled = await Tenant.countDocuments({});
    res.json({
      tenants,
      pagination: { current: page, pages: Math.ceil(total / limit), total },
      summary: {
        total,
        totalIncludingCancelled,
        active: await Tenant.countDocuments({ ...filter, status: 'active' }),
        suspended: await Tenant.countDocuments({ ...filter, status: 'suspended' }),
        trialing: await Tenant.countDocuments({ ...filter, status: 'trialing' }),
        cancelled: totalIncludingCancelled - total
      }
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ message: 'Failed to fetch tenants', error: error.message });
  }
});

/**
 * @swagger
 * /api/supra-admin/tenants/{id}:
 *   get:
 *     summary: Get a single tenant's full details and usage
 *     description: >
 *       AUTHORIZATION GAP: guarded only by `requirePlatformAdminAccessReason()`, which
 *       is NOT a role/permission check — for any caller whose `req.user.role` is not
 *       `platform_super_admin`/`platform_admin`/`super_admin` it calls `next()`
 *       immediately with no further checks (see
 *       src/middleware/auth/requirePlatformAdminAccessReason.js). Because the parent
 *       router only applies generic `authenticateToken`, any authenticated user
 *       (including a regular tenant employee) can currently reach this endpoint and
 *       read another tenant's full record and usage stats. No `requirePlatformPermission`
 *       is applied here, unlike `GET /tenants` above.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tenant and usage details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tenant:
 *                   type: object
 *                 usage:
 *                   type: object
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/tenants/:id', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.READ), requirePlatformAdminAccessReason(), async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id).populate('createdBy', 'fullName email').populate('supportNotes.createdBy', 'fullName');
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    const usage = await tenantService.getTenantUsage(req.params.id);
    res.json({ tenant, usage });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({ message: 'Failed to fetch tenant' });
  }
});

/**
 * @swagger
 * /api/supra-admin/tenants/{id}:
 *   put:
 *     summary: Update a tenant's details
 *     description: >
 *       AUTHORIZATION GAP: guarded only by `requirePlatformAdminAccessReason()`, which
 *       is not a role/permission check (see note on `GET /tenants/{id}` above) — it only
 *       conditionally demands an access-reason header/body field when the caller already
 *       happens to be a platform admin, but never blocks a non-admin authenticated user.
 *       No `requirePlatformPermission` is applied on this write route.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       description: Fields forwarded as-is to tenantService.updateTenant; slug is immutable.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accessReason:
 *                 type: string
 *                 description: Required if the caller's role is a platform admin role (see description)
 *     responses:
 *       200:
 *         description: Updated tenant document
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Slug is immutable, or other validation failure
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/tenants/:id', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.UPDATE), requirePlatformAdminAccessReason(), async (req, res) => {
  try {
    const tenant = await tenantService.updateTenant(req.params.id, req.body, req.user._id);
    await platformAdminAccessService.logPlatformAdminAccess({
      platformAdminId: req.user._id, platformAdminEmail: req.user.email, platformAdminName: req.user.fullName,
      tenantId: req.params.id, tenantName: tenant.name,
      reason: req.body.accessReason || req.headers['x-access-reason'] || 'tenant_update',
      ipAddress: req.ip || req.connection.remoteAddress, userAgent: req.get('User-Agent'), endpoint: req.path, method: req.method
    });
    res.json(tenant);
  } catch (error) {
    console.error('Update tenant error:', error);
    const msg = error.message || 'Failed to update tenant';
    if (msg.includes('slug cannot be changed') || msg.includes('immutable')) {
      return res.status(400).json({ message: msg, code: 'SLUG_IMMUTABLE' });
    }
    if (msg.includes('not found')) return res.status(404).json({ message: msg });
    res.status(500).json({ message: 'Failed to update tenant' });
  }
});

/**
 * @swagger
 * /api/supra-admin/tenants/{id}/status:
 *   put:
 *     summary: Change a tenant's status (active/suspended/cancelled/trialing)
 *     description: >
 *       AUTHORIZATION GAP: guarded only by `requirePlatformAdminAccessReason()`, which
 *       is not a role/permission check (see note on `GET /tenants/{id}` above). Any
 *       authenticated user can currently suspend or cancel another tenant. No
 *       `requirePlatformPermission` is applied on this route.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, suspended, cancelled, trialing]
 *               accessReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/tenants/:id/status', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.UPDATE), requirePlatformAdminAccessReason(), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'cancelled', 'trialing'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const updatedBy = req.user?._id || req.twsAdmin?._id || 'system';
    const tenant = await tenantService.updateTenantStatus(req.params.id, status, updatedBy);
    await platformAdminAccessService.logPlatformAdminAccess({
      platformAdminId: req.user._id, platformAdminEmail: req.user.email, platformAdminName: req.user.fullName,
      tenantId: req.params.id, tenantName: tenant.name,
      reason: req.body.accessReason || req.headers['x-access-reason'] || 'tenant_status_change',
      ipAddress: req.ip || req.connection.remoteAddress, userAgent: req.get('User-Agent'), endpoint: req.path, method: req.method
    });
    res.json({ success: true, data: tenant, message: 'Tenant status updated successfully' });
  } catch (error) {
    console.error('Update tenant status error:', error);
    res.status(500).json({ message: 'Failed to update tenant status', error: error.message });
  }
});

/**
 * @swagger
 * /api/supra-admin/tenants/cancelled:
 *   delete:
 *     summary: Permanently delete every cancelled tenant
 *     description: >
 *       Bulk, irreversible deletion of all tenants with status `cancelled` and their
 *       associated data. AUTHORIZATION GAP: guarded only by
 *       `requirePlatformAdminAccessReason()`, which is not a role/permission check (see
 *       note on `GET /tenants/{id}` above) — any authenticated user who can supply a
 *       50+ character justification string can trigger this. No
 *       `requirePlatformPermission` is applied on this highly destructive route.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [justification]
 *             properties:
 *               justification:
 *                 type: string
 *                 minLength: 50
 *                 description: Required, minimum 50 characters (also accepted via X-Justification header)
 *     responses:
 *       200:
 *         description: All cancelled tenants deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     deleted:
 *                       type: array
 *                       items:
 *                         type: string
 *                     failed:
 *                       type: array
 *                       items:
 *                         type: object
 *                     total:
 *                       type: integer
 *                     totalCancelled:
 *                       type: integer
 *                     deletedCount:
 *                       type: integer
 *                     failedCount:
 *                       type: integer
 *       207:
 *         description: Partial success — some tenants failed to delete
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Justification missing or under 50 characters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/tenants/cancelled', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.DELETE), requirePlatformAdminAccessReason(), async (req, res) => {
  try {
    const cancelledTenants = await Tenant.find({ status: 'cancelled' }).select('_id name slug');
    if (!cancelledTenants || cancelledTenants.length === 0) return res.json({ success: true, message: 'No cancelled tenants found to delete', data: { deleted: [], failed: [], total: 0 } });
    const justification = req.body.justification || req.headers['x-justification'];
    if (!justification || justification.length < 50) return res.status(400).json({ success: false, message: 'Justification is required (minimum 50 characters)', code: 'JUSTIFICATION_REQUIRED', cancelledTenantsCount: cancelledTenants.length });
    const tenantIds = cancelledTenants.map(t => t._id.toString());
    const deletedBy = req.user?._id || req.twsAdmin?._id || 'system';
    const results = await tenantService.deleteTenantsBulk(tenantIds, deletedBy);
    for (const tenantId of results.deleted) {
      const tenant = cancelledTenants.find(t => t._id.toString() === tenantId);
      await platformAdminAccessService.logPlatformAdminAccess({
        platformAdminId: req.user._id, platformAdminEmail: req.user.email, platformAdminName: req.user.fullName,
        tenantId, tenantName: tenant?.name || 'Unknown',
        reason: req.body.accessReason || req.headers['x-access-reason'] || 'bulk_delete_cancelled_tenants',
        ipAddress: req.ip || req.connection.remoteAddress, userAgent: req.get('User-Agent'), endpoint: req.path, method: req.method
      });
    }
    const allOk = results.failed.length === 0;
    res.status(allOk ? 200 : 207).json({ success: allOk, message: allOk ? `${results.deleted.length} cancelled tenant(s) permanently deleted` : `Deleted ${results.deleted.length}; ${results.failed.length} failed`, data: { ...results, totalCancelled: cancelledTenants.length, deletedCount: results.deleted.length, failedCount: results.failed.length } });
  } catch (error) {
    console.error('Delete cancelled tenants error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete cancelled tenants', error: error.message });
  }
});

/**
 * @swagger
 * /api/supra-admin/tenants/bulk:
 *   delete:
 *     summary: Permanently delete an arbitrary set of tenants by id
 *     description: >
 *       Bulk, irreversible deletion of the specified tenants and their associated data.
 *       AUTHORIZATION GAP: guarded only by `requirePlatformAdminAccessReason()`, which
 *       is not a role/permission check (see note on `GET /tenants/{id}` above) — any
 *       authenticated user who can supply a 50+ character justification string can
 *       delete any tenants by id. No `requirePlatformPermission` is applied on this
 *       highly destructive route.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids, justification]
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *               justification:
 *                 type: string
 *                 minLength: 50
 *                 description: Required, minimum 50 characters (also accepted via X-Justification header)
 *     responses:
 *       200:
 *         description: All requested tenants deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       207:
 *         description: Partial success — some tenants failed to delete
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: ids array or justification missing/invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/tenants/bulk', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.DELETE), requirePlatformAdminAccessReason(), async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, message: 'Request body must include an array of tenant ids' });
    const justification = req.body.justification || req.headers['x-justification'];
    if (!justification || justification.length < 50) return res.status(400).json({ success: false, message: 'Justification is required (minimum 50 characters)', code: 'JUSTIFICATION_REQUIRED' });
    const deletedBy = req.user?._id || req.twsAdmin?._id || 'system';
    const results = await tenantService.deleteTenantsBulk(ids, deletedBy);
    for (const tenantId of results.deleted) {
      await platformAdminAccessService.logPlatformAdminAccess({
        platformAdminId: req.user._id, platformAdminEmail: req.user.email, platformAdminName: req.user.fullName,
        tenantId, tenantName: 'Bulk Delete',
        reason: req.body.accessReason || req.headers['x-access-reason'] || 'bulk_tenant_deletion',
        ipAddress: req.ip || req.connection.remoteAddress, userAgent: req.get('User-Agent'), endpoint: req.path, method: req.method
      });
    }
    const allOk = results.failed.length === 0;
    res.status(allOk ? 200 : 207).json({ success: allOk, message: allOk ? `${results.deleted.length} tenant(s) deleted successfully` : `Deleted ${results.deleted.length}; ${results.failed.length} failed`, data: results });
  } catch (error) {
    console.error('Bulk delete tenants error:', error);
    res.status(500).json({ success: false, message: 'Failed to bulk delete tenants', error: error.message });
  }
});

/**
 * @swagger
 * /api/supra-admin/tenants/{id}:
 *   delete:
 *     summary: Permanently delete a tenant and all associated data
 *     description: >
 *       AUTHORIZATION GAP: guarded only by `requirePlatformAdminAccessReason()`, which
 *       is not a role/permission check (see note on `GET /tenants/{id}` above) — any
 *       authenticated user who can supply a 30+ character justification string can
 *       delete this tenant. No `requirePlatformPermission` is applied on this highly
 *       destructive route.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [justification]
 *             properties:
 *               justification:
 *                 type: string
 *                 minLength: 30
 *                 description: Required, minimum 30 characters (also accepted via X-Justification header)
 *     responses:
 *       200:
 *         description: Tenant and all associated data deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Justification missing or under 30 characters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/tenants/:id', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.DELETE), requirePlatformAdminAccessReason(), async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    const justification = req.body.justification || req.headers['x-justification'];
    if (!justification || justification.length < 30) return res.status(400).json({ success: false, message: 'Justification is required (minimum 30 characters)', code: 'JUSTIFICATION_REQUIRED' });
    const deletedBy = req.user?._id || req.twsAdmin?._id || 'system';
    await platformAdminAccessService.logPlatformAdminAccess({
      platformAdminId: req.user._id, platformAdminEmail: req.user.email, platformAdminName: req.user.fullName,
      tenantId: req.params.id, tenantName: tenant.name,
      reason: req.body.accessReason || req.headers['x-access-reason'] || 'tenant_deletion',
      ipAddress: req.ip || req.connection.remoteAddress, userAgent: req.get('User-Agent'), endpoint: req.path, method: req.method
    });
    await tenantService.deleteTenant(req.params.id, deletedBy, true);
    res.json({ success: true, message: 'Tenant and all associated data deleted successfully' });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete tenant', error: error.message });
  }
});

/**
 * @swagger
 * /api/supra-admin/tenants/{id}/password:
 *   put:
 *     summary: Change a tenant owner's password
 *     description: >
 *       AUTHORIZATION GAP: guarded only by `requirePlatformAdminAccessReason()` (plus a
 *       password-length validator), which is not a role/permission check (see note on
 *       `GET /tenants/{id}` above) — any authenticated user who can supply a 20+
 *       character justification string can reset this tenant owner's password. No
 *       `requirePlatformPermission` is applied on this highly sensitive credential-reset
 *       route.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword, justification]
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *               justification:
 *                 type: string
 *                 minLength: 20
 *                 description: Required, minimum 20 characters (also accepted via X-Justification header)
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation failure (password too short) or missing/short justification
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/tenants/:id/password', [body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')], requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.UPDATE), requirePlatformAdminAccessReason(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    const justification = req.body.justification || req.headers['x-justification'];
    if (!justification || justification.length < 20) return res.status(400).json({ success: false, message: 'Justification is required (minimum 20 characters)', code: 'JUSTIFICATION_REQUIRED' });
    await tenantService.changeTenantOwnerPassword(req.params.id, req.body.newPassword, req.user._id);
    await platformAdminAccessService.logPlatformAdminAccess({
      platformAdminId: req.user._id, platformAdminEmail: req.user.email, platformAdminName: req.user.fullName,
      tenantId: req.params.id, tenantName: tenant.name,
      reason: req.body.accessReason || req.headers['x-access-reason'] || 'password_reset',
      ipAddress: req.ip || req.connection.remoteAddress, userAgent: req.get('User-Agent'), endpoint: req.path, method: req.method
    });
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

module.exports = router;
