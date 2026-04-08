/**
 * Notification Worker — BullMQ removed.
 * Push/email notifications are dispatched directly (fire-and-forget).
 * Digest scheduling uses node-cron.
 */
const cron = require('node-cron');
const NotificationQueue    = require('../models/NotificationQueue');
const pushNotificationService = require('../services/notifications/push-notification.service');
const emailService         = require('../services/integrations/email.service');

// ─── Direct processors ───────────────────────────────────────────────────────

async function _processPushNotification(notificationId) {
  try {
    const notification = await NotificationQueue.findById(notificationId);
    if (!notification) return;
    await notification.markAsProcessing();
    await pushNotificationService.sendPushNotification({
      userIds: [notification.userId],
      title: notification.title,
      body: notification.message,
      data: notification.data,
      notificationType: notification.notificationType,
      relatedEntityType: notification.relatedEntityType,
      relatedEntityId: notification.relatedEntityId,
      silent: notification.data?.silent || false,
      priority: notification.priority
    });
    await notification.markAsSent();
  } catch (error) {
    console.error(`Push notification error (${notificationId}):`, error.message);
    try {
      const n = await NotificationQueue.findById(notificationId);
      if (n) {
        if (n.attempts < n.maxAttempts) await n.scheduleRetry();
        else await n.markAsFailed(error.message);
      }
    } catch (_) {}
  }
}

async function _processEmailNotification(notificationId) {
  try {
    const notification = await NotificationQueue.findById(notificationId);
    if (!notification) return;
    await notification.markAsProcessing();
    await emailService.sendNotificationEmail({
      userIds: [notification.userId],
      subject: notification.title,
      html: notification.data?.html,
      text: notification.data?.text,
      notificationType: notification.notificationType,
      relatedEntityType: notification.relatedEntityType,
      relatedEntityId: notification.relatedEntityId,
      priority: notification.priority,
      templateId: notification.data?.templateId,
      templateData: notification.data?.templateData
    });
    await notification.markAsSent();
  } catch (error) {
    console.error(`Email notification error (${notificationId}):`, error.message);
    try {
      const n = await NotificationQueue.findById(notificationId);
      if (n) {
        if (n.attempts < n.maxAttempts) await n.scheduleRetry();
        else await n.markAsFailed(error.message);
      }
    } catch (_) {}
  }
}

// ─── Queue Manager ────────────────────────────────────────────────────────────

class NotificationQueueManager {
  static async addPushNotification(notificationData) {
    // Fire-and-forget — process asynchronously without blocking the caller
    setImmediate(() => _processPushNotification(notificationData._id));
    return { id: notificationData._id?.toString() };
  }

  static async addEmailNotification(notificationData) {
    setImmediate(() => _processEmailNotification(notificationData._id));
    return { id: notificationData._id?.toString() };
  }

  static async addDigestJob(userId, frequency) {
    setImmediate(async () => {
      try { await emailService.sendDigestEmail(userId, frequency); } catch (_) {}
    });
    return { id: `digest-${userId}` };
  }

  static async processPendingNotifications() {
    try {
      const pending = await NotificationQueue.findPending(50);
      for (const n of pending) {
        if (n.channel === 'email') await NotificationQueueManager.addEmailNotification(n);
        else await NotificationQueueManager.addPushNotification(n);
      }
    } catch (error) {
      console.error('processPendingNotifications error:', error.message);
    }
  }

  static async scheduleDigestJobs() {
    // Handled by the cron jobs below at module load
  }

  static async getQueueStats()         { return { push: {}, email: {}, digest: {} }; }
  static async cleanupCompletedJobs()  { return; }
  static async pauseAllQueues()        { return; }
  static async resumeAllQueues()       { return; }
}

// ─── Cron schedules ───────────────────────────────────────────────────────────

// Daily digest — 9 AM every day
cron.schedule('0 9 * * *', async () => {
  try {
    const User = require('../models/User');
    const NotificationPreference = require('../models/NotificationPreference');
    const users = await User.find({}).select('_id orgId');
    for (const user of users) {
      const prefs = await NotificationPreference.getOrCreate(user._id, user.orgId);
      if (prefs?.email?.frequency === 'daily') {
        setImmediate(async () => {
          try { await emailService.sendDigestEmail(user._id, 'daily'); } catch (_) {}
        });
      }
    }
  } catch (error) { console.error('Daily digest cron error:', error.message); }
});

// Weekly digest — 9 AM every Monday
cron.schedule('0 9 * * 1', async () => {
  try {
    const User = require('../models/User');
    const NotificationPreference = require('../models/NotificationPreference');
    const users = await User.find({}).select('_id orgId');
    for (const user of users) {
      const prefs = await NotificationPreference.getOrCreate(user._id, user.orgId);
      if (prefs?.email?.frequency === 'weekly') {
        setImmediate(async () => {
          try { await emailService.sendDigestEmail(user._id, 'weekly'); } catch (_) {}
        });
      }
    }
  } catch (error) { console.error('Weekly digest cron error:', error.message); }
});

console.log('✅ Notification worker started (direct dispatch + node-cron digests)');

module.exports = {
  NotificationQueueManager,
  // Stub queue objects so any code referencing .add() still works
  pushNotificationQueue:    { add: (_, d) => NotificationQueueManager.addPushNotification({ _id: d?.notificationId }), on: () => {} },
  emailNotificationQueue:   { add: (_, d) => NotificationQueueManager.addEmailNotification({ _id: d?.notificationId }), on: () => {} },
  digestQueue:              { add: (_, d) => NotificationQueueManager.addDigestJob(d?.userId, d?.frequency), on: () => {} },
  pushNotificationWorker:   { close: async () => {} },
  emailNotificationWorker:  { close: async () => {} },
  digestWorker:             { close: async () => {} }
};
