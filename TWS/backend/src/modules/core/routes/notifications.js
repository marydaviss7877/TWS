const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../../middleware/auth/auth');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const { body, validationResult } = require('express-validator');
const DeviceToken = require('../../../models/users-auth/DeviceToken');
const NotificationPreference = require('../../../models/notifications/NotificationPreference');
const pushNotificationService = require('../../../services/notifications/push-notification.service');
const emailService = require('../../../services/integrations/email.service');

// Register device token for push notifications
router.post('/register', authenticateToken, [
  body('token').notEmpty().withMessage('Device token is required'),
  body('platform').isIn(['web', 'android', 'ios']).withMessage('Platform must be web, android, or ios'),
  body('deviceId').notEmpty().withMessage('Device ID is required'),
  body('deviceInfo').optional().isObject().withMessage('Device info must be an object')
], ErrorHandler.asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { token, platform, deviceId, deviceInfo = {} } = req.body;

  try {
    // Check if token already exists
    let deviceToken = await DeviceToken.findOne({ token });
    
    if (deviceToken) {
      // Update existing token
      deviceToken.userId = req.user._id;
      deviceToken.platform = platform;
      deviceToken.deviceId = deviceId;
      deviceToken.deviceInfo = deviceInfo;
      deviceToken.isActive = true;
      deviceToken.organization = req.user.orgId;
      deviceToken.lastUsed = new Date();
      await deviceToken.save();
    } else {
      // Create new token
      deviceToken = new DeviceToken({
        userId: req.user._id,
        token,
        platform,
        deviceId,
        deviceInfo,
        organization: req.user.orgId
      });
      await deviceToken.save();
    }

    res.json({
      success: true,
      message: 'Device token registered successfully',
      data: {
        id: deviceToken._id,
        platform: deviceToken.platform,
        deviceId: deviceToken.deviceId
      }
    });
  } catch (error) {
    console.error('Error registering device token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register device token'
    });
  }
}));

// Unregister device token
router.delete('/unregister', authenticateToken, [
  body('token').optional(),
  body('deviceId').optional()
], ErrorHandler.asyncHandler(async (req, res) => {
  const { token, deviceId } = req.body;

  try {
    let query = { userId: req.user._id };
    
    if (token) {
      query.token = token;
    } else if (deviceId) {
      query.deviceId = deviceId;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either token or deviceId is required'
      });
    }

    const result = await DeviceToken.updateMany(query, { isActive: false });

    res.json({
      success: true,
      message: 'Device token unregistered successfully',
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Error unregistering device token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unregister device token'
    });
  }
}));

// Get user's notification preferences
router.get('/preferences', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const preferences = await NotificationPreference.getOrCreate(req.user._id, req.user.orgId);
    
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification preferences'
    });
  }
}));

// Update user's notification preferences
router.put('/preferences', authenticateToken, [
  body('email').optional().isObject().withMessage('Email preferences must be an object'),
  body('inApp').optional().isObject().withMessage('In-app preferences must be an object'),
  body('eventTypes').optional().isObject().withMessage('Event types must be an object'),
  body('quietHours').optional().isObject().withMessage('Quiet hours must be an object')
], ErrorHandler.asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const preferences = await NotificationPreference.getOrCreate(req.user._id, req.user.orgId);
    
    if (req.body.email) {
      preferences.email = { ...preferences.email.toObject?.() || preferences.email, ...req.body.email };
      if (req.body.email.types) {
        preferences.email.types = { ...preferences.email.types, ...req.body.email.types };
      }
    }
    if (req.body.inApp && typeof req.body.inApp.enabled === 'boolean') {
      preferences.inApp = preferences.inApp || {};
      preferences.inApp.enabled = req.body.inApp.enabled;
    }
    if (req.body.eventTypes && typeof req.body.eventTypes === 'object') {
      preferences.eventTypes = { ...(preferences.eventTypes || {}), ...req.body.eventTypes };
    }
    if (req.body.quietHours) {
      preferences.quietHours = { ...preferences.quietHours, ...req.body.quietHours };
    }

    await preferences.save();

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: preferences
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences'
    });
  }
}));

// Update chat-specific notification preferences
router.put('/preferences/chat/:chatId', authenticateToken, [
  body('email').optional().isBoolean().withMessage('Email preference must be boolean'),
  body('push').optional().isBoolean().withMessage('Push preference must be boolean'),
  body('mentions').optional().isBoolean().withMessage('Mentions preference must be boolean')
], ErrorHandler.asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { chatId } = req.params;
  const { email, push, mentions } = req.body;

  try {
    const preferences = await NotificationPreference.getOrCreate(req.user._id, req.user.orgId);
    
    const chatPreferences = {};
    if (email !== undefined) chatPreferences.email = email;
    if (push !== undefined) chatPreferences.push = push;
    if (mentions !== undefined) chatPreferences.mentions = mentions;

    await preferences.updateChatPreferences(chatId, chatPreferences);

    res.json({
      success: true,
      message: 'Chat notification preferences updated successfully',
      data: preferences
    });
  } catch (error) {
    console.error('Error updating chat notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update chat notification preferences'
    });
  }
}));

// Get user's device tokens
router.get('/devices', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const devices = await DeviceToken.find({ 
      userId: req.user._id, 
      isActive: true 
    }).select('platform deviceId deviceInfo lastUsed createdAt');

    res.json({
      success: true,
      data: devices
    });
  } catch (error) {
    console.error('Error fetching device tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch device tokens'
    });
  }
}));

// Send test push notification
router.post('/test/push', authenticateToken, [
  body('title').optional().isString().withMessage('Title must be a string'),
  body('body').optional().isString().withMessage('Body must be a string')
], ErrorHandler.asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { title = 'Test Notification', body = 'This is a test push notification' } = req.body;

  try {
    const result = await pushNotificationService.sendTestNotification(
      req.user._id, 
      title, 
      body
    );

    res.json({
      success: true,
      message: 'Test push notification sent',
      data: result
    });
  } catch (error) {
    console.error('Error sending test push notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test push notification',
      error: error.message
    });
  }
}));

// Send test email
router.post('/test/email', authenticateToken, [
  body('subject').optional().isString().withMessage('Subject must be a string'),
  body('message').optional().isString().withMessage('Message must be a string')
], ErrorHandler.asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { subject = 'Test Email', message = 'This is a test email' } = req.body;

  try {
    const result = await emailService.sendTestEmail(
      req.user.email, 
      subject, 
      message
    );

    res.json({
      success: true,
      message: 'Test email sent',
      data: result
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
}));

// SIMPLIFIED: Get notification statistics (use Notification model instead of queue)
router.get('/stats', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const Notification = require('../../../models/notifications/Notification');
    
    // Get stats from Notification model instead of queue
    const [unreadCount, totalCount] = await Promise.all([
      Notification.countDocuments({ userId: req.user._id, read: false }),
      Notification.countDocuments({ userId: req.user._id })
    ]);
    
    res.json({
      success: true,
      data: {
        unread: unreadCount,
        total: totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification stats'
    });
  }
}));

// SIMPLIFIED: Cleanup old notifications (use Notification model instead of queue)
router.delete('/cleanup', authenticateToken, ErrorHandler.asyncHandler(async (req, res) => {
  // Check if user has admin role
  if (!['super_admin', 'org_manager', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions'
    });
  }

  try {
    const Notification = require('../../../models/notifications/Notification');
    const daysOld = parseInt(req.query.days) || 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    // Cleanup old read notifications
    const result = await Notification.deleteMany({
      read: true,
      createdAt: { $lt: cutoffDate }
    });
    
    res.json({
      success: true,
      message: `Cleaned up notifications older than ${daysOld} days`,
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup notifications'
    });
  }
}));

module.exports = router;
