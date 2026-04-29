const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  // Email notification preferences
  email: {
    enabled: {
      type: Boolean,
      default: true
    },
    frequency: {
      type: String,
      enum: ['immediate', 'hourly', 'daily', 'weekly', 'off'],
      default: 'immediate'
    },
    types: {
      messages: {
        type: Boolean,
        default: true
      },
      mentions: {
        type: Boolean,
        default: true
      },
      projectUpdates: {
        type: Boolean,
        default: true
      },
      taskAssignments: {
        type: Boolean,
        default: true
      },
      deadlineReminders: {
        type: Boolean,
        default: true
      },
      approvals: {
        type: Boolean,
        default: true
      },
      system: {
        type: Boolean,
        default: true
      }
    },
    digestSettings: {
      maxNotificationsPerDigest: {
        type: Number,
        default: 10
      },
      collapseSimilar: {
        type: Boolean,
        default: true
      },
      includeUnreadCount: {
        type: Boolean,
        default: true
      }
    }
  },
  // In-app notifications (FR18)
  inApp: {
    enabled: {
      type: Boolean,
      default: true
    }
  },
  // Per-event-type preferences (FR18 trigger matrix)
  eventTypes: {
    task_assigned: { type: Boolean, default: true },
    leave_approved: { type: Boolean, default: true },
    leave_rejected: { type: Boolean, default: true },
    invoice_overdue: { type: Boolean, default: true },
    deliverable_rejected: { type: Boolean, default: true },
    budget_warning: { type: Boolean, default: true },
    project_delayed: { type: Boolean, default: true },
    critical_bug: { type: Boolean, default: true },
    dept_access_granted: { type: Boolean, default: true },
    dept_access_revoked: { type: Boolean, default: true },
    emergency_offboard: { type: Boolean, default: true },
    document_submitted: { type: Boolean, default: true },
    document_approved: { type: Boolean, default: true },
    document_rejected: { type: Boolean, default: true }
  },
  // Quiet hours settings
  quietHours: {
    enabled: {
      type: Boolean,
      default: false
    },
    start: {
      type: String,
      default: '22:00'
    },
    end: {
      type: String,
      default: '08:00'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    days: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }]
  },
  // Chat-specific preferences
  chatPreferences: [{
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat'
    },
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    mentions: {
      type: Boolean,
      default: true
    }
  }]
}, {
  timestamps: true
});

// Indexes for performance
notificationPreferenceSchema.index({ userId: 1 });
notificationPreferenceSchema.index({ organization: 1 });

// Method to check if user wants email notifications for a specific type
notificationPreferenceSchema.methods.shouldSendEmail = function(type, chatId = null) {
  if (!this.email.enabled || this.email.frequency === 'off') {
    return false;
  }

  // Check chat-specific preferences
  if (chatId) {
    const chatPref = this.chatPreferences.find(cp => cp.chatId.toString() === chatId.toString());
    if (chatPref && !chatPref.email) {
      return false;
    }
  }

  // Check type-specific preferences (legacy types)
  if (this.email.types && this.email.types[type] === false) {
    return false;
  }
  // FR18 event types (optional; may be missing on existing docs)
  if (this.eventTypes && this.eventTypes[type] === false) {
    return false;
  }
  return true;
};

// REMOVED: shouldSendPush method (push notifications removed - email only)

// Method to check if it's currently quiet hours
notificationPreferenceSchema.methods.isQuietHours = function() {
  if (!this.quietHours.enabled) {
    return false;
  }

  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Check if current day is in quiet hours days
  if (this.quietHours.days.length > 0 && !this.quietHours.days.includes(currentDay)) {
    return false;
  }

  // Check if current time is within quiet hours
  const startTime = this.quietHours.start;
  const endTime = this.quietHours.end;

  if (startTime <= endTime) {
    // Same day quiet hours (e.g., 22:00 to 08:00 next day)
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    // Overnight quiet hours (e.g., 22:00 to 08:00)
    return currentTime >= startTime || currentTime <= endTime;
  }
};

// Method to update chat-specific preferences
notificationPreferenceSchema.methods.updateChatPreferences = function(chatId, preferences) {
  const existingIndex = this.chatPreferences.findIndex(cp => cp.chatId.toString() === chatId.toString());
  
  if (existingIndex >= 0) {
    this.chatPreferences[existingIndex] = { chatId, ...preferences };
  } else {
    this.chatPreferences.push({ chatId, ...preferences });
  }
  
  return this.save();
};

// Static method to get or create preferences for user
notificationPreferenceSchema.statics.getOrCreate = async function(userId, organizationId) {
  let preferences = await this.findOne({ userId });
  
  if (!preferences) {
    preferences = new this({
      userId,
      organization: organizationId
    });
    await preferences.save();
  }
  
  return preferences;
};

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
