// SIMPLIFIED: Removed notification queue and push notifications - email only
const NotificationPreference = require('../../models/notifications/NotificationPreference');
const emailService = require('./integrations/email.service');

class NotificationBatchingService {
  constructor() {
    this.batchTimeout = 30000; // 30 seconds
    this.maxBatchSize = 10;
    this.pendingBatches = new Map();
  }

  // Add notification to batch
  async addToBatch(notification) {
    const batchKey = this.generateBatchKey(notification);
    
    if (!this.pendingBatches.has(batchKey)) {
      this.pendingBatches.set(batchKey, {
        notifications: [],
        timeout: null,
        createdAt: new Date()
      });
    }

    const batch = this.pendingBatches.get(batchKey);
    batch.notifications.push(notification);

    // Clear existing timeout
    if (batch.timeout) {
      clearTimeout(batch.timeout);
    }

    // Set new timeout or process immediately if batch is full
    if (batch.notifications.length >= this.maxBatchSize) {
      await this.processBatch(batchKey);
    } else {
      batch.timeout = setTimeout(() => {
        this.processBatch(batchKey);
      }, this.batchTimeout);
    }
  }

  // Generate batch key based on notification properties
  generateBatchKey(notification) {
    const { userId, type, notificationType, data } = notification;
    
    // Group by user, type, and related entity (e.g., chat)
    const relatedEntity = data.chatId || data.projectId || 'general';
    return `${userId}_${type}_${notificationType}_${relatedEntity}`;
  }

  // Process a batch of notifications
  async processBatch(batchKey) {
    const batch = this.pendingBatches.get(batchKey);
    if (!batch || batch.notifications.length === 0) {
      this.pendingBatches.delete(batchKey);
      return;
    }

    try {
      const notifications = batch.notifications;
      this.pendingBatches.delete(batchKey);

      if (notifications.length === 1) {
        // Single notification, send as is
        await this.sendSingleNotification(notifications[0]);
      } else {
        // Multiple notifications, create batched notification
        await this.sendBatchedNotification(notifications);
      }
    } catch (error) {
      console.error(`Error processing batch ${batchKey}:`, error);
      
      // Fallback: send notifications individually
      for (const notification of batch.notifications) {
        try {
          await this.sendSingleNotification(notification);
        } catch (individualError) {
          console.error('Error sending individual notification:', individualError);
        }
      }
    }
  }

  // SIMPLIFIED: Send email notification only (push removed)
  async sendSingleNotification(notification) {
    const { userId, title, data, notificationType } = notification;

    // Only send email notifications
    await emailService.sendNotificationEmail({
      userIds: [userId],
      subject: title,
      html: data.html,
      text: data.text,
      notificationType,
      templateId: data.templateId,
      templateData: data.templateData
    });
  }

  // Send batched notification
  async sendBatchedNotification(notifications) {
    const firstNotification = notifications[0];
    const { type, userId, notificationType, data } = firstNotification;
    const count = notifications.length;

    // Get user preferences to check batching settings
    const preferences = await NotificationPreference.getOrCreate(userId, data.organizationId);
    
    if (type === 'push') {
      const batchedNotification = this.createBatchedPushNotification(notifications, count);
      await pushNotificationService.sendPushNotification(batchedNotification);
    } else if (type === 'email') {
      // For email, check if user wants digest
      if (preferences.email.frequency !== 'immediate') {
        // Queue for digest
        for (const notification of notifications) {
          await this.queueNotificationForDigest(notification);
        }
      } else {
        // Send immediate batched email
        const batchedEmail = this.createBatchedEmailNotification(notifications, count);
        await emailService.sendNotificationEmail(batchedEmail);
      }
    }
  }

  // REMOVED: createBatchedPushNotification (push notifications removed)

  // Create batched email notification
  createBatchedEmailNotification(notifications, count) {
    const firstNotification = notifications[0];
    const { userId, notificationType, data } = firstNotification;

    let subject, html, text;
    
    if (notificationType === 'messages') {
      subject = `${count} new messages`;
      html = this.generateBatchedMessageHtml(notifications, count);
      text = `You have ${count} new messages in your chats.`;
    } else if (notificationType === 'mentions') {
      subject = `${count} mentions`;
      html = this.generateBatchedMentionHtml(notifications, count);
      text = `You were mentioned ${count} times.`;
    } else {
      subject = `${count} notifications`;
      html = this.generateBatchedGenericHtml(notifications, count);
      text = `You have ${count} new notifications.`;
    }

    return {
      userIds: [userId],
      subject,
      html,
      text,
      notificationType,
      templateData: {
        ...data.templateData,
        batchCount: count,
        isBatched: true
      }
    };
  }

  // Generate HTML for batched messages
  generateBatchedMessageHtml(notifications, count) {
    const chatGroups = new Map();
    
    notifications.forEach(notification => {
      const chatId = notification.data.chatId;
      const chatName = notification.data.chatName || 'Unknown Chat';
      
      if (!chatGroups.has(chatId)) {
        chatGroups.set(chatId, {
          name: chatName,
          count: 0,
          lastMessage: notification.message
        });
      }
      
      chatGroups.get(chatId).count++;
    });

    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You have ${count} new messages</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
    `;

    for (const [chatId, chatData] of chatGroups) {
      html += `
        <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px;">
          <h3 style="margin: 0 0 5px 0; color: #333;">${chatData.name}</h3>
          <p style="margin: 0; color: #666;">${chatData.count} new message${chatData.count > 1 ? 's' : ''}</p>
          <p style="margin: 5px 0 0 0; font-style: italic; color: #888;">Latest: ${chatData.lastMessage}</p>
        </div>
      `;
    }

    html += `
        </div>
        <p style="text-align: center; margin-top: 20px;">
          <a href="${process.env.FRONTEND_URL}/messages" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Messages</a>
        </p>
      </div>
    `;

    return html;
  }

  // Generate HTML for batched mentions
  generateBatchedMentionHtml(notifications, count) {
    const mentionGroups = new Map();
    
    notifications.forEach(notification => {
      const chatId = notification.data.chatId;
      const chatName = notification.data.chatName || 'Unknown Chat';
      
      if (!mentionGroups.has(chatId)) {
        mentionGroups.set(chatId, {
          name: chatName,
          count: 0,
          messages: []
        });
      }
      
      mentionGroups.get(chatId).count++;
      mentionGroups.get(chatId).messages.push(notification.message);
    });

    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You were mentioned ${count} times</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
    `;

    for (const [chatId, chatData] of mentionGroups) {
      html += `
        <div style="margin-bottom: 15px; padding: 10px; background: white; border-radius: 4px;">
          <h3 style="margin: 0 0 10px 0; color: #333;">${chatData.name}</h3>
          <p style="margin: 0 0 10px 0; color: #666;">${chatData.count} mention${chatData.count > 1 ? 's' : ''}</p>
      `;
      
      chatData.messages.slice(0, 3).forEach(message => {
        html += `<p style="margin: 5px 0; padding: 5px; background: #f8f9fa; border-left: 3px solid #007bff;">${message}</p>`;
      });
      
      if (chatData.messages.length > 3) {
        html += `<p style="margin: 5px 0; color: #666; font-style: italic;">... and ${chatData.messages.length - 3} more</p>`;
      }
      
      html += `</div>`;
    }

    html += `
        </div>
        <p style="text-align: center; margin-top: 20px;">
          <a href="${process.env.FRONTEND_URL}/messages" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Mentions</a>
        </p>
      </div>
    `;

    return html;
  }

  // Generate HTML for generic batched notifications
  generateBatchedGenericHtml(notifications, count) {
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You have ${count} new notifications</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
    `;

    notifications.slice(0, 5).forEach(notification => {
      html += `
        <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px;">
          <h4 style="margin: 0 0 5px 0; color: #333;">${notification.title}</h4>
          <p style="margin: 0; color: #666;">${notification.message}</p>
        </div>
      `;
    });

    if (notifications.length > 5) {
      html += `<p style="text-align: center; color: #666;">... and ${notifications.length - 5} more notifications</p>`;
    }

    html += `
        </div>
        <p style="text-align: center; margin-top: 20px;">
          <a href="${process.env.FRONTEND_URL}/notifications" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View All Notifications</a>
        </p>
      </div>
    `;

    return html;
  }

  // REMOVED: queueNotificationForDigest (notification queue system removed)
  // Email notifications are sent directly

  // Process digest notifications
  async processDigestNotifications() {
    try {
      const NotificationPreference = require('../../models/notifications/NotificationPreference');
      const User = require('../../models/users-auth/User');
      
      // Get all users with digest preferences
      const users = await User.find({}).select('_id email fullName');
      
      for (const user of users) {
        const preferences = await NotificationPreference.getOrCreate(user._id, user.orgId);
        
        if (preferences.email.frequency === 'hourly') {
          await this.sendHourlyDigest(user._id);
        } else if (preferences.email.frequency === 'daily') {
          await this.sendDailyDigest(user._id);
        } else if (preferences.email.frequency === 'weekly') {
          await this.sendWeeklyDigest(user._id);
        }
      }
    } catch (error) {
      console.error('Error processing digest notifications:', error);
    }
  }

  // Send hourly digest
  async sendHourlyDigest(userId) {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 1);
    
    await this.sendDigestForPeriod(userId, 'hourly', cutoffDate);
  }

  // Send daily digest
  async sendDailyDigest(userId) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 1);
    
    await this.sendDigestForPeriod(userId, 'daily', cutoffDate);
  }

  // Send weekly digest
  async sendWeeklyDigest(userId) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    
    await this.sendDigestForPeriod(userId, 'weekly', cutoffDate);
  }

  // SIMPLIFIED: Send digest for a specific period (no queue - use Notification model directly)
  async sendDigestForPeriod(userId, frequency, cutoffDate) {
    try {
      // Use Notification model instead of NotificationQueue
      const Notification = require('../../models/notifications/Notification');
      const notifications = await Notification.find({
        userId,
        read: false,
        createdAt: { $gte: cutoffDate }
      }).sort({ createdAt: -1 }).limit(50);

      if (notifications.length === 0) {
        return;
      }

      await emailService.sendDigestEmail(userId, frequency);
    } catch (error) {
      console.error(`Error sending ${frequency} digest for user ${userId}:`, error);
    }
  }

  // Cleanup old batches
  cleanupOldBatches() {
    const now = new Date();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [batchKey, batch] of this.pendingBatches) {
      if (now - batch.createdAt > maxAge) {
        // Process old batch
        this.processBatch(batchKey);
      }
    }
  }

  // Get batch statistics
  getBatchStats() {
    return {
      pendingBatches: this.pendingBatches.size,
      totalPendingNotifications: Array.from(this.pendingBatches.values())
        .reduce((sum, batch) => sum + batch.notifications.length, 0)
    };
  }
}

module.exports = new NotificationBatchingService();
