const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../../../middleware/auth/auth');
// Messaging models removed - messaging feature disabled
// const Message = require('../../../models/Message');
// const Chat = require('../../../models/Chat');
const User = require('../../../models/users-auth/User');
const AuditLog = require('../../../models/core/AuditLog');
const UserBan = require('../../../models/users-auth/UserBan');
const ErrorHandler = require('../../../middleware/common/errorHandler');

// ===== MESSAGE MODERATION ROUTES =====
// DISABLED: Messaging feature has been removed
// All message moderation routes return 410 (Gone) status

/**
 * @swagger
 * /api/admin/moderation/messages/{messageId}/flag:
 *   post:
 *     summary: Flag a message for moderation (disabled)
 *     description: >
 *       Messaging has been removed from the platform. This route is retained only to
 *       return a 410 Gone to old clients and always short-circuits before doing any work.
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       410:
 *         description: Messaging feature has been disabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/messages/:messageId/flag', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Messaging feature has been disabled'
  });
}));

/**
 * @swagger
 * /api/admin/moderation/messages/{messageId}/flag:
 *   delete:
 *     summary: Unflag a message (disabled)
 *     description: Messaging has been removed from the platform; always returns 410 Gone.
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       410:
 *         description: Messaging feature has been disabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.delete('/messages/:messageId/flag', authenticateToken, requireRole(['admin', 'moderator']), ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Messaging feature has been disabled'
  });
}));

/**
 * @swagger
 * /api/admin/moderation/messages/{messageId}/hide:
 *   post:
 *     summary: Hide a message (disabled)
 *     description: Messaging has been removed from the platform; always returns 410 Gone.
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       410:
 *         description: Messaging feature has been disabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/messages/:messageId/hide', authenticateToken, requireRole(['admin', 'moderator']), ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Messaging feature has been disabled'
  });
}));

/**
 * @swagger
 * /api/admin/moderation/messages/{messageId}:
 *   delete:
 *     summary: Delete a message (disabled)
 *     description: Messaging has been removed from the platform; always returns 410 Gone.
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       410:
 *         description: Messaging feature has been disabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.delete('/messages/:messageId', authenticateToken, requireRole(['admin', 'moderator']), ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Messaging feature has been disabled'
  });
}));

/**
 * @swagger
 * /api/admin/moderation/messages/{messageId}/restore:
 *   post:
 *     summary: Restore a deleted message (disabled)
 *     description: Messaging has been removed from the platform; always returns 410 Gone.
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       410:
 *         description: Messaging feature has been disabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/messages/:messageId/restore', authenticateToken, requireRole(['admin', 'moderator']), ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Messaging feature has been disabled'
  });
}));

/**
 * @swagger
 * /api/admin/moderation/messages/flagged:
 *   get:
 *     summary: List flagged messages (disabled)
 *     description: Messaging has been removed from the platform; always returns 410 Gone with an empty paginated payload.
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       410:
 *         description: Messaging feature has been disabled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items: {}
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/messages/flagged', authenticateToken, requireRole(['admin', 'moderator']), ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Messaging feature has been disabled',
    data: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
      hasNext: false,
      hasPrev: false
    }
  });
}));

// ===== USER MODERATION ROUTES =====

// Ban a user
/**
 * @swagger
 * /api/admin/moderation/users/{userId}/ban:
 *   post:
 *     summary: Ban a user within the caller's organization
 *     description: >
 *       Creates a UserBan record scoped to `req.user.orgId` and writes an AuditLog entry.
 *       Fails with 404 if the target user does not exist, or 400 if already banned.
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 default: Violation of community guidelines
 *               banType:
 *                 type: string
 *                 default: temporary
 *               duration:
 *                 type: number
 *                 description: Ban duration in hours
 *                 default: 24
 *     responses:
 *       200:
 *         description: User banned successfully
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
 *                   description: The created UserBan document
 *       400:
 *         description: User is already banned
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
 */
router.post('/users/:userId/ban', authenticateToken, requireRole(['admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason, banType = 'temporary', duration = 24 } = req.body;
  
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  // Check if user is already banned
  const existingBan = await UserBan.isUserBanned(userId, req.user.orgId);
  if (existingBan) {
    return res.status(400).json({
      success: false,
      message: 'User is already banned'
    });
  }
  
  // Create the ban
  const ban = await UserBan.createBan({
    userId,
    organizationId: req.user.orgId,
    bannedBy: req.user._id,
    reason: reason || 'Violation of community guidelines',
    banType,
    duration,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Log the action
  await AuditLog.logAction({
    action: 'user_banned',
    performedBy: req.user._id,
    targetUser: userId,
    reason: reason || 'Violation of community guidelines',
    details: { banType, duration },
    organization: req.user.orgId,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: true,
    message: 'User banned successfully',
    data: ban
  });
}));

// Unban a user
/**
 * @swagger
 * /api/admin/moderation/users/{userId}/unban:
 *   post:
 *     summary: Unban a user within the caller's organization
 *     description: Revokes the user's active ban (scoped to `req.user.orgId`) and writes an AuditLog entry.
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 default: Ban lifted by admin
 *     responses:
 *       200:
 *         $ref: '#/components/schemas/Success'
 *       400:
 *         description: User is not currently banned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/users/:userId/unban', authenticateToken, requireRole(['admin']), ErrorHandler.asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;
  
  const activeBan = await UserBan.isUserBanned(userId, req.user.orgId);
  if (!activeBan) {
    return res.status(400).json({
      success: false,
      message: 'User is not currently banned'
    });
  }
  
  await activeBan.revokeBan(req.user._id, reason || 'Ban lifted by admin');
  
  // Log the action
  await AuditLog.logAction({
    action: 'user_unbanned',
    performedBy: req.user._id,
    targetUser: userId,
    reason: reason || 'Ban lifted by admin',
    organization: req.user.orgId,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    success: true,
    message: 'User unbanned successfully'
  });
}));

// Get user ban history
/**
 * @swagger
 * /api/admin/moderation/users/{userId}/bans:
 *   get:
 *     summary: Get a user's ban history within the caller's organization
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ban history for the user
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
 */
router.get('/users/:userId/bans', authenticateToken, requireRole(['admin', 'moderator']), ErrorHandler.asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const banHistory = await UserBan.getUserBanHistory(userId, req.user.orgId);
  
  res.json({
    success: true,
    data: banHistory
  });
}));

// ===== CHAT MODERATION ROUTES =====
// DISABLED: Messaging feature has been removed

/**
 * @swagger
 * /api/admin/moderation/chats/{chatId}/mute:
 *   post:
 *     summary: Mute a chat (disabled)
 *     description: Messaging has been removed from the platform; always returns 410 Gone.
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       410:
 *         description: Messaging feature has been disabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/chats/:chatId/mute', authenticateToken, requireRole(['admin', 'moderator']), ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Messaging feature has been disabled'
  });
}));

/**
 * @swagger
 * /api/admin/moderation/chats/{chatId}/unmute:
 *   post:
 *     summary: Unmute a chat (disabled)
 *     description: Messaging has been removed from the platform; always returns 410 Gone.
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       410:
 *         description: Messaging feature has been disabled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/chats/:chatId/unmute', authenticateToken, requireRole(['admin', 'moderator']), ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Messaging feature has been disabled'
  });
}));

// ===== AUDIT LOG ROUTES =====

// Get moderation audit log
/**
 * @swagger
 * /api/admin/moderation/audit-log:
 *   get:
 *     summary: Get the organization's moderation audit log
 *     description: >
 *       Returns AuditLog entries scoped to `req.user.orgId`, restricted server-side to
 *       `user_banned` / `user_unbanned` actions (messaging-related actions were removed).
 *     tags: [Moderation]
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
 *           default: 50
 *     responses:
 *       200:
 *         description: Paginated audit log entries
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
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/audit-log', authenticateToken, requireRole(['admin', 'moderator']), ErrorHandler.asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  
  // Filter out messaging-related actions since messaging is disabled
  const auditLogs = await AuditLog.getModerationLog(req.user.orgId, limit * 1)
    .skip((page - 1) * limit);
  
  const totalCount = await AuditLog.countDocuments({
    action: {
      $in: [
        'user_banned',
        'user_unbanned'
        // Messaging actions removed: 'message_flagged', 'message_hidden', 'message_deleted', 'chat_muted', 'chat_unmuted'
      ]
    },
    organization: req.user.orgId
  });
  
  res.json({
    success: true,
    data: auditLogs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalCount,
      pages: Math.ceil(totalCount / limit),
      hasNext: page * limit < totalCount,
      hasPrev: page > 1
    }
  });
}));

// Get user-specific audit log
/**
 * @swagger
 * /api/admin/moderation/users/{userId}/audit-log:
 *   get:
 *     summary: Get a specific user's audit log within the caller's organization
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Audit log entries for the user
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
 */
router.get('/users/:userId/audit-log', authenticateToken, requireRole(['admin', 'moderator']), ErrorHandler.asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 50 } = req.query;
  
  const auditLogs = await AuditLog.getUserAuditLog(userId, req.user.orgId, limit);
  
  res.json({
    success: true,
    data: auditLogs
  });
}));

// ===== SEARCH ROUTES =====
// DISABLED: Messaging feature has been removed

/**
 * @swagger
 * /api/admin/moderation/search/messages:
 *   get:
 *     summary: Search messages (disabled)
 *     description: Messaging has been removed from the platform; always returns 410 Gone with an empty result set.
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       410:
 *         description: Messaging feature has been disabled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items: {}
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get('/search/messages', authenticateToken, requireRole(['admin', 'moderator']), ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Messaging feature has been disabled',
    data: []
  });
}));

module.exports = router;
