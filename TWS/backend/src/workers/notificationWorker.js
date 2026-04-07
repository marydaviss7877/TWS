const { Worker, Queue } = require('bullmq');
const Redis = require('ioredis');
const NotificationQueue = require('../models/NotificationQueue');
const pushNotificationService = require('../services/notifications/push-notification.service');
const emailService = require('../services/integrations/email.service');
const notificationBatchingService = require('../services/notifications/notification-batching.service');

// Check if BullMQ is disabled or Redis version is incompatible
if (process.env.BULLMQ_DISABLED === 'true' || process.env.REDIS_DISABLED === 'true' || process.env.REDIS_VERSION_COMPATIBLE === 'false') {
  console.log('Notification worker disabled - BullMQ/Redis is disabled or incompatible version');
  module.exports = {
    NotificationQueueManager: class MockNotificationQueueManager {
      static async addNotification() { return Promise.resolve(); }
      static async processPendingNotifications() { return Promise.resolve(); }
      static async cleanupCompletedJobs() { return Promise.resolve(); }
      static async scheduleDigestJobs() { return Promise.resolve(); }
      static async pauseAllQueues() { return Promise.resolve(); }
      static async getQueueStats() { return Promise.resolve({}); }
    },
    pushNotificationQueue: { add: () => Promise.resolve({ id: 'mock-job-id' }), on: () => {} },
    emailNotificationQueue: { add: () => Promise.resolve({ id: 'mock-job-id' }), on: () => {} },
    digestQueue: { add: () => Promise.resolve({ id: 'mock-job-id' }), on: () => {} },
    pushNotificationWorker: { close: () => Promise.resolve() },
    emailNotificationWorker: { close: () => Promise.resolve() },
    digestWorker: { close: () => Promise.resolve() }
  };
} else {
  // Redis connection
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxLoadingTimeout: 1000,
  lazyConnect: true,
  retryStrategy: (times) => times > 3 ? null : Math.min(times * 200, 2000)
});
// Suppress ECONNREFUSED so it never becomes an unhandled rejection
redisConnection.on('error', (err) => {
  if (err.code !== 'ECONNREFUSED') console.warn('⚠️  Notification worker Redis error:', err.message);
});

// Create queues
const pushNotificationQueue = new Queue('push-notifications', { connection: redisConnection });
const emailNotificationQueue = new Queue('email-notifications', { connection: redisConnection });
const digestQueue = new Queue('email-digest', { connection: redisConnection });

// Push notification worker
const pushNotificationWorker = new Worker('push-notifications', async (job) => {
  const { notificationId } = job.data;
  
  try {
    const notification = await NotificationQueue.findById(notificationId);
    if (!notification) {
      throw new Error(`Notification ${notificationId} not found`);
    }

    // Mark as processing
    await notification.markAsProcessing();

    // Send push notification
    const result = await pushNotificationService.sendPushNotification({
      userIds: [notification.userId],
      title: notification.title,
      body: notification.message,
      data: notification.data,
      notificationType: notification.notificationType,
      relatedEntityType: notification.relatedEntityType,
      relatedEntityId: notification.relatedEntityId,
      silent: notification.data.silent || false,
      priority: notification.priority
    });

    // Mark as sent
    await notification.markAsSent();

    console.log(`Push notification sent successfully: ${notificationId}`);
    return { success: true, result };
  } catch (error) {
    console.error(`Error processing push notification ${notificationId}:`, error);
    
    // Mark as failed or schedule retry
    const notification = await NotificationQueue.findById(notificationId);
    if (notification) {
      if (notification.attempts < notification.maxAttempts) {
        await notification.scheduleRetry();
        throw error; // This will cause the job to be retried
      } else {
        await notification.markAsFailed(error.message);
      }
    }
    
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 10,
  removeOnComplete: 100,
  removeOnFail: 50
});

// Email notification worker
const emailNotificationWorker = new Worker('email-notifications', async (job) => {
  const { notificationId } = job.data;
  
  try {
    const notification = await NotificationQueue.findById(notificationId);
    if (!notification) {
      throw new Error(`Notification ${notificationId} not found`);
    }

    // Mark as processing
    await notification.markAsProcessing();

    // Send email notification
    const result = await emailService.sendNotificationEmail({
      userIds: [notification.userId],
      subject: notification.title,
      html: notification.data.html,
      text: notification.data.text,
      notificationType: notification.notificationType,
      relatedEntityType: notification.relatedEntityType,
      relatedEntityId: notification.relatedEntityId,
      priority: notification.priority,
      templateId: notification.data.templateId,
      templateData: notification.data.templateData
    });

    // Mark as sent
    await notification.markAsSent();

    console.log(`Email notification sent successfully: ${notificationId}`);
    return { success: true, result };
  } catch (error) {
    console.error(`Error processing email notification ${notificationId}:`, error);
    
    // Mark as failed or schedule retry
    const notification = await NotificationQueue.findById(notificationId);
    if (notification) {
      if (notification.attempts < notification.maxAttempts) {
        await notification.scheduleRetry();
        throw error; // This will cause the job to be retried
      } else {
        await notification.markAsFailed(error.message);
      }
    }
    
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 5,
  removeOnComplete: 100,
  removeOnFail: 50
});

// Email digest worker
const digestWorker = new Worker('email-digest', async (job) => {
  const { userId, frequency } = job.data;
  
  try {
    const result = await emailService.sendDigestEmail(userId, frequency);
    console.log(`Email digest sent successfully for user ${userId} (${frequency})`);
    return { success: true, result };
  } catch (error) {
    console.error(`Error processing email digest for user ${userId}:`, error);
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 3,
  removeOnComplete: 50,
  removeOnFail: 25
});

// Queue management functions
class NotificationQueueManager {
  // Add push notification to queue
  static async addPushNotification(notificationData) {
    const job = await pushNotificationQueue.add('send-push', {
      notificationId: notificationData._id
    }, {
      delay: notificationData.scheduledFor ? 
        Math.max(0, notificationData.scheduledFor.getTime() - Date.now()) : 0,
      priority: this.getJobPriority(notificationData.priority),
      attempts: notificationData.maxAttempts || 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    return job;
  }

  // Add email notification to queue
  static async addEmailNotification(notificationData) {
    const job = await emailNotificationQueue.add('send-email', {
      notificationId: notificationData._id
    }, {
      delay: notificationData.scheduledFor ? 
        Math.max(0, notificationData.scheduledFor.getTime() - Date.now()) : 0,
      priority: this.getJobPriority(notificationData.priority),
      attempts: notificationData.maxAttempts || 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    return job;
  }

  // Add digest job to queue
  static async addDigestJob(userId, frequency, scheduledFor = null) {
    const job = await digestQueue.add('send-digest', {
      userId,
      frequency
    }, {
      delay: scheduledFor ? 
        Math.max(0, scheduledFor.getTime() - Date.now()) : 0,
      priority: 1, // Low priority for digests
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 5000
      }
    });

    return job;
  }

  // Get job priority based on notification priority
  static getJobPriority(priority) {
    const priorityMap = {
      'urgent': 10,
      'high': 7,
      'normal': 5,
      'low': 1
    };
    return priorityMap[priority] || 5;
  }

  // Process pending notifications
  static async processPendingNotifications() {
    try {
      // Process push notifications
      const pendingPushNotifications = await NotificationQueue.findPending(50);
      for (const notification of pendingPushNotifications) {
        await this.addPushNotification(notification);
      }

      // Process email notifications
      const pendingEmailNotifications = await NotificationQueue.findPending(50);
      for (const notification of pendingEmailNotifications) {
        await this.addEmailNotification(notification);
      }

      console.log(`Processed ${pendingPushNotifications.length} push and ${pendingEmailNotifications.length} email notifications`);
    } catch (error) {
      console.error('Error processing pending notifications:', error);
    }
  }

  // Schedule digest jobs
  static async scheduleDigestJobs() {
    try {
      const User = require('../models/User');
      const NotificationPreference = require('../models/NotificationPreference');
      
      const users = await User.find({}).select('_id email fullName');
      
      for (const user of users) {
        const preferences = await NotificationPreference.getOrCreate(user._id, user.orgId);
        
        if (preferences.email.frequency === 'hourly') {
          // Schedule hourly digest
          const nextHour = new Date();
          nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
          await this.addDigestJob(user._id, 'hourly', nextHour);
        } else if (preferences.email.frequency === 'daily') {
          // Schedule daily digest
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0); // 9 AM
          await this.addDigestJob(user._id, 'daily', tomorrow);
        } else if (preferences.email.frequency === 'weekly') {
          // Schedule weekly digest
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          nextWeek.setHours(9, 0, 0, 0); // 9 AM
          await this.addDigestJob(user._id, 'weekly', nextWeek);
        }
      }

      console.log('Digest jobs scheduled successfully');
    } catch (error) {
      console.error('Error scheduling digest jobs:', error);
    }
  }

  // Get queue statistics
  static async getQueueStats() {
    try {
      const [pushStats, emailStats, digestStats] = await Promise.all([
        pushNotificationQueue.getJobCounts(),
        emailNotificationQueue.getJobCounts(),
        digestQueue.getJobCounts()
      ]);

      return {
        push: pushStats,
        email: emailStats,
        digest: digestStats
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return null;
    }
  }

  // Cleanup completed jobs
  static async cleanupCompletedJobs() {
    try {
      await Promise.all([
        pushNotificationQueue.clean(0, 100, 'completed'),
        emailNotificationQueue.clean(0, 100, 'completed'),
        digestQueue.clean(0, 50, 'completed')
      ]);

      console.log('Completed jobs cleaned up');
    } catch (error) {
      console.error('Error cleaning up completed jobs:', error);
    }
  }

  // Pause all queues
  static async pauseAllQueues() {
    try {
      await Promise.all([
        pushNotificationQueue.pause(),
        emailNotificationQueue.pause(),
        digestQueue.pause()
      ]);

      console.log('All notification queues paused');
    } catch (error) {
      console.error('Error pausing queues:', error);
    }
  }

  // Resume all queues
  static async resumeAllQueues() {
    try {
      await Promise.all([
        pushNotificationQueue.resume(),
        emailNotificationQueue.resume(),
        digestQueue.resume()
      ]);

      console.log('All notification queues resumed');
    } catch (error) {
      console.error('Error resuming queues:', error);
    }
  }
}

// Worker event handlers
pushNotificationWorker.on('completed', (job) => {
  console.log(`Push notification job ${job.id} completed`);
});

pushNotificationWorker.on('failed', (job, err) => {
  console.error(`Push notification job ${job.id} failed:`, err.message);
});

emailNotificationWorker.on('completed', (job) => {
  console.log(`Email notification job ${job.id} completed`);
});

emailNotificationWorker.on('failed', (job, err) => {
  console.error(`Email notification job ${job.id} failed:`, err.message);
});

digestWorker.on('completed', (job) => {
  console.log(`Digest job ${job.id} completed`);
});

digestWorker.on('failed', (job, err) => {
  console.error(`Digest job ${job.id} failed:`, err.message);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down notification workers...');
  
  await Promise.all([
    pushNotificationWorker.close(),
    emailNotificationWorker.close(),
    digestWorker.close()
  ]);
  
  await redisConnection.quit();
  process.exit(0);
});

module.exports = {
  NotificationQueueManager,
  pushNotificationQueue,
  emailNotificationQueue,
  digestQueue,
  pushNotificationWorker,
  emailNotificationWorker,
  digestWorker
};
}
