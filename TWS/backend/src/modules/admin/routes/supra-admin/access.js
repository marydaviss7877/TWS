/**
 * Supra Admin - Platform Admin Access Control routes
 */

const { express } = require('./shared');
const router = express.Router();
const {
  requirePlatformPermission,
  PLATFORM_PERMISSIONS,
  Tenant,
  PlatformAdminApproval,
  platformAdminAccessService
} = require('./shared');

/**
 * @swagger
 * /api/supra-admin/access/request-approval:
 *   post:
 *     summary: Request approval to access a tenant's data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenantId, reason, justification]
 *             properties:
 *               tenantId:
 *                 type: string
 *               reason:
 *                 type: string
 *                 description: Must be one of platformAdminAccessService's allowed reasons
 *               justification:
 *                 type: string
 *                 minLength: 20
 *     responses:
 *       201:
 *         description: Approval request created (pending)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     approval:
 *                       type: object
 *                     status:
 *                       type: string
 *                       example: pending
 *                     message:
 *                       type: string
 *       400:
 *         description: Missing fields, invalid reason, justification too short, or request creation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/access/request-approval', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.READ), async (req, res) => {
  try {
    const { tenantId, reason, justification } = req.body;
    if (!tenantId || !reason || !justification) {
      return res.status(400).json({ success: false, message: 'tenantId, reason, and justification are required', code: 'MISSING_REQUIRED_FIELDS' });
    }
    const reasonValidation = platformAdminAccessService.validateAccessReason(reason);
    if (!reasonValidation.valid) {
      return res.status(400).json({ success: false, message: reasonValidation.error, code: reasonValidation.code, allowedReasons: reasonValidation.allowedReasons });
    }
    if (justification.length < 20) {
      return res.status(400).json({ success: false, message: 'Justification must be at least 20 characters', code: 'INVALID_JUSTIFICATION' });
    }
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    const approvalResult = await platformAdminAccessService.createApprovalRequest({
      platformAdminId: req.user._id, platformAdminEmail: req.user.email, platformAdminName: req.user.fullName,
      tenantId: tenant._id, tenantName: tenant.name, reason, justification,
      ipAddress: req.ip || req.connection.remoteAddress, userAgent: req.get('User-Agent'), endpoint: req.path, method: req.method
    });
    if (!approvalResult.success) return res.status(400).json({ success: false, message: approvalResult.error, code: 'APPROVAL_REQUEST_FAILED' });
    res.status(201).json({ success: true, message: 'Approval request created successfully', data: { approval: approvalResult.approval, status: 'pending', message: 'Approval request is pending. You will be notified when it is reviewed.' } });
  } catch (error) {
    console.error('Request approval error:', error);
    res.status(500).json({ success: false, message: 'Failed to create approval request', error: error.message });
  }
});

/**
 * @swagger
 * /api/supra-admin/access/approve/{approvalId}:
 *   post:
 *     summary: Approve a pending platform-admin tenant-access request
 *     description: Grants access for 1 hour from approval time (`accessExpiresAt = now + 1h`).
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: approvalId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Approval granted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     approval:
 *                       type: object
 *                     accessExpiresAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Approval request is not pending
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/access/approve/:approvalId', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.ASSIGN_ROLE), async (req, res) => {
  try {
    const approval = await PlatformAdminApproval.findById(req.params.approvalId);
    if (!approval) return res.status(404).json({ success: false, message: 'Approval request not found' });
    if (approval.status !== 'pending') return res.status(400).json({ success: false, message: `Approval request is already ${approval.status}`, code: 'INVALID_APPROVAL_STATUS' });
    approval.status = 'approved';
    approval.approvedBy = req.user._id;
    approval.approvedAt = new Date();
    approval.accessGranted = true;
    approval.accessGrantedAt = new Date();
    approval.accessExpiresAt = new Date(Date.now() + (60 * 60 * 1000));
    await approval.save();
    res.json({ success: true, message: 'Approval granted successfully', data: { approval, accessExpiresAt: approval.accessExpiresAt } });
  } catch (error) {
    console.error('Approve access error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve access request', error: error.message });
  }
});

/**
 * @swagger
 * /api/supra-admin/access/reject/{approvalId}:
 *   post:
 *     summary: Reject a pending platform-admin tenant-access request
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: approvalId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rejectionReason]
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 minLength: 10
 *     responses:
 *       200:
 *         description: Approval rejected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     approval:
 *                       type: object
 *       400:
 *         description: Rejection reason missing/too short, or approval request is not pending
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/access/reject/:approvalId', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.UPDATE), async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason || rejectionReason.length < 10) return res.status(400).json({ success: false, message: 'Rejection reason is required (minimum 10 characters)', code: 'MISSING_REJECTION_REASON' });
    const approval = await PlatformAdminApproval.findById(req.params.approvalId);
    if (!approval) return res.status(404).json({ success: false, message: 'Approval request not found' });
    if (approval.status !== 'pending') return res.status(400).json({ success: false, message: `Approval request is already ${approval.status}`, code: 'INVALID_APPROVAL_STATUS' });
    approval.status = 'rejected';
    approval.rejectedBy = req.user._id;
    approval.rejectedAt = new Date();
    approval.rejectionReason = rejectionReason;
    await approval.save();
    res.json({ success: true, message: 'Approval request rejected', data: { approval } });
  } catch (error) {
    console.error('Reject access error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject access request', error: error.message });
  }
});

/**
 * @swagger
 * /api/supra-admin/access/approvals:
 *   get:
 *     summary: List the caller's own tenant-access approval requests
 *     description: "Filter is always scoped to platformAdminId = req.user._id — a caller only ever sees their own requests here."
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Approval requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/access/approvals', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.READ), async (req, res) => {
  try {
    const { status, tenantId } = req.query;
    const filter = { platformAdminId: req.user._id };
    if (status) filter.status = status;
    if (tenantId) filter.tenantId = tenantId;
    const approvals = await PlatformAdminApproval.find(filter).populate('tenantId', 'name slug').populate('approvedBy', 'fullName email').populate('rejectedBy', 'fullName email').sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: approvals });
  } catch (error) {
    console.error('Get approvals error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch approval requests', error: error.message });
  }
});

/**
 * @swagger
 * /api/supra-admin/access/pending-approvals:
 *   get:
 *     summary: List all pending tenant-access approval requests platform-wide
 *     description: >
 *       Beyond the route's `requirePlatformPermission(platform_users:read)`, the handler
 *       adds an inline check that only allows `platform_super_admin` or `platform_admin`
 *       roles through (403 otherwise) — a stricter check than the sibling `GET /access/approvals`.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All pending approval requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       403:
 *         description: Caller's role is not platform_super_admin or platform_admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/access/pending-approvals', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.READ), async (req, res) => {
  try {
    if (req.user.role !== 'platform_super_admin' && req.user.role !== 'platform_admin') {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to view all approval requests', code: 'INSUFFICIENT_PERMISSIONS' });
    }
    const approvals = await PlatformAdminApproval.find({ status: 'pending' }).populate('platformAdminId', 'fullName email').populate('tenantId', 'name slug erpCategory subscription').sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: approvals });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending approval requests', error: error.message });
  }
});

/**
 * @swagger
 * /api/supra-admin/access/revoke/{approvalId}:
 *   post:
 *     summary: Revoke a previously approved tenant-access grant
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: approvalId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [revocationReason]
 *             properties:
 *               revocationReason:
 *                 type: string
 *                 minLength: 10
 *     responses:
 *       200:
 *         description: Approval revoked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     approval:
 *                       type: object
 *       400:
 *         description: Revocation reason missing/too short, or approval is not currently approved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/access/revoke/:approvalId', requirePlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS.UPDATE), async (req, res) => {
  try {
    const { revocationReason } = req.body;
    if (!revocationReason || revocationReason.length < 10) return res.status(400).json({ success: false, message: 'Revocation reason is required (minimum 10 characters)', code: 'MISSING_REVOCATION_REASON' });
    const approval = await PlatformAdminApproval.findById(req.params.approvalId);
    if (!approval) return res.status(404).json({ success: false, message: 'Approval not found' });
    if (approval.status !== 'approved') return res.status(400).json({ success: false, message: `Approval is ${approval.status}, cannot revoke`, code: 'INVALID_APPROVAL_STATUS' });
    await approval.revoke(req.user._id, revocationReason);
    res.json({ success: true, message: 'Approval revoked successfully', data: { approval } });
  } catch (error) {
    console.error('Revoke approval error:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke approval', error: error.message });
  }
});

module.exports = router;
