/**
 * Push Notification Service — Firebase disabled.
 * All methods are no-ops that return graceful responses.
 * Notifications are still saved to NotificationQueue for future use.
 */
const NotificationQueue    = require('../../models/notifications/NotificationQueue');
const NotificationPreference = require('../../models/notifications/NotificationPreference');

class PushNotificationService {
  constructor() {
    this.initialized = false;
    console.log('ℹ️  Push notification service disabled (Firebase off)');
  }

  async sendPushNotification({ userIds = [], title, body, data = {}, notificationType, relatedEntityType, relatedEntityId, priority = 'normal' } = {}) {
    // Save to NotificationQueue so history is preserved even though we can't deliver
    try {
      for (const userId of userIds) {
        await NotificationQueue.create({
          userId,
          title,
          message: body,
          data,
          notificationType,
          relatedEntityType,
          relatedEntityId,
          priority,
          channel: 'push',
          status: 'skipped'
        }).catch(() => {}); // Don't throw if model save fails
      }
    } catch (_) {}
    return { success: false, disabled: true, message: 'Push notifications disabled' };
  }

  async queueNotification(userId, notificationData) {
    return this.sendPushNotification({ userIds: [userId], ...notificationData });
  }

  async registerDeviceToken()   { return false; }
  async deactivateDeviceToken() { return false; }
  async getActiveTokens()       { return []; }
}

module.exports = new PushNotificationService();
