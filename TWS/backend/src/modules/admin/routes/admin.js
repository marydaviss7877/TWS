const express = require('express');
const { requirePlatformPermission, PLATFORM_PERMISSIONS } = require('../../../middleware/auth/platformRBAC');
const ErrorHandler = require('../../../middleware/common/errorHandler');

const router = express.Router();

// Placeholder routes for admin module
/**
 * @swagger
 * /api/admin:
 *   get:
 *     summary: Admin module placeholder
 *     description: >
 *       Placeholder endpoint for the admin module. Currently returns a static
 *       "coming soon" payload; no real admin data is served by this route yet.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Placeholder response
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
 *                   example: Admin module - Coming soon
 *                 data:
 *                   type: array
 *                   items: {}
 *                   example: []
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Missing the `system:read` platform permission
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM.READ), ErrorHandler.asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Admin module - Coming soon',
    data: []
  });
}));

module.exports = router;
