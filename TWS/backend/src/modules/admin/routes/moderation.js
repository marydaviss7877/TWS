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

router.post('/messages/:messageId/flag', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Messaging feature has been disabled'
  });
}));

router.delete('/messages/:messageId/flag', authenticateToken, requireRole(['admin', 'moderator']), ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Messaging feature has been disabled'
  });
}));

router.post('/messages/:messageId/hide', authenticateToken, requireRole(['admin', 'moderator']), ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Messaging feature has been disabled'
  });
}));

router.delete('/messages/:messageId', authenticateToken, requireRole(['admin', 'moderator']), ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Messaging feature has been disabled'
  });
}));

router.post('/messages/:messageId/restore', authenticateToken, requireRole(['admin', 'moderator']), ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Messaging feature has been disabled'
  });
}));

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

router.post('/chats/:chatId/mute', authenticateToken, requireRole(['admin', 'moderator']), ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Messaging feature has been disabled'
  });
}));

router.post('/chats/:chatId/unmute', authenticateToken, requireRole(['admin', 'moderator']), ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Messaging feature has been disabled'
  });
}));

// ===== AUDIT LOG ROUTES =====

// Get moderation audit log
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

router.get('/search/messages', authenticateToken, requireRole(['admin', 'moderator']), ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Messaging feature has been disabled',
    data: []
  });
}));

module.exports = router;
