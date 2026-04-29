const mongoose = require('mongoose');

const defaultContactSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    unique: true
  },
  contactName: {
    type: String,
    required: true,
    trim: true,
    default: 'Supra-Admin Support'
  },
  contactEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    default: 'support@supraadmin.com'
  },
  contactRole: {
    type: String,
    required: true,
    trim: true,
    default: 'System Administrator'
  },
  welcomeMessage: {
    type: String,
    required: true,
    trim: true,
    default: 'Welcome! I\'m your Supra-Admin contact. How can I help you today?'
  },
  availability: {
    type: String,
    enum: ['24/7', 'business-hours', 'weekdays', 'custom'],
    default: '24/7'
  },
  customSchedule: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    workingDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    workingHours: {
      start: {
        type: String,
        default: '09:00'
      },
      end: {
        type: String,
        default: '17:00'
      }
    }
  },
  autoCreateChat: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Contact statistics
  stats: {
    totalMessages: {
      type: Number,
      default: 0
    },
    totalChats: {
      type: Number,
      default: 0
    },
    avgResponseTime: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  // Contact preferences
  preferences: {
    autoReply: {
      type: Boolean,
      default: false
    },
    autoReplyMessage: {
      type: String,
      trim: true
    },
    notificationSettings: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    }
  },
  // Integration settings
  integrations: {
    teams: {
      enabled: {
        type: Boolean,
        default: false
      },
      webhookUrl: String
    },
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      smtpSettings: {
        host: String,
        port: Number,
        secure: Boolean,
        auth: {
          user: String,
          pass: String
        }
      }
    }
  },
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
defaultContactSchema.index({ tenantId: 1 });
defaultContactSchema.index({ isActive: 1 });
defaultContactSchema.index({ 'stats.lastActivity': -1 });

// Virtual for contact status
defaultContactSchema.virtual('status').get(function() {
  if (!this.isActive) return 'inactive';
  
  const now = new Date();
  const lastActivity = this.stats.lastActivity;
  const timeDiff = now - lastActivity;
  
  // Consider online if active within last 5 minutes
  if (timeDiff < 5 * 60 * 1000) return 'online';
  
  // Consider away if active within last 30 minutes
  if (timeDiff < 30 * 60 * 1000) return 'away';
  
  return 'offline';
});

// Method to update contact statistics
defaultContactSchema.methods.updateStats = function(messageData) {
  this.stats.totalMessages += 1;
  this.stats.lastActivity = new Date();
  
  if (messageData.responseTime) {
    // Calculate rolling average response time
    const currentAvg = this.stats.avgResponseTime;
    const newResponseTime = messageData.responseTime;
    const totalMessages = this.stats.totalMessages;
    
    this.stats.avgResponseTime = ((currentAvg * (totalMessages - 1)) + newResponseTime) / totalMessages;
  }
  
  return this.save();
};

// Method to check if contact is available
defaultContactSchema.methods.isAvailable = function() {
  if (!this.isActive) return false;
  
  if (this.availability === '24/7') return true;
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  if (this.availability === 'weekdays') {
    return currentDay >= 1 && currentDay <= 5;
  }
  
  if (this.availability === 'business-hours') {
    const startHour = parseInt(this.customSchedule.workingHours.start.split(':')[0]);
    const endHour = parseInt(this.customSchedule.workingHours.end.split(':')[0]);
    
    return currentHour >= startHour && currentHour < endHour;
  }
  
  if (this.availability === 'custom') {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = dayNames[currentDay];
    
    if (!this.customSchedule.workingDays.includes(currentDayName)) {
      return false;
    }
    
    const startHour = parseInt(this.customSchedule.workingHours.start.split(':')[0]);
    const endHour = parseInt(this.customSchedule.workingHours.end.split(':')[0]);
    
    return currentHour >= startHour && currentHour < endHour;
  }
  
  return false;
};

// Method to create welcome chat
// NOTE: Messaging features have been removed - this method is now a no-op
defaultContactSchema.methods.createWelcomeChat = async function(tenantId) {
  console.warn('⚠️ createWelcomeChat called but messaging features have been removed');
  return null;
};

// Static method to find contacts by availability
defaultContactSchema.statics.findAvailableContacts = function() {
  return this.find({
    isActive: true,
    availability: { $in: ['24/7', 'business-hours', 'weekdays'] }
  });
};

// Static method to get contact statistics
defaultContactSchema.statics.getContactStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalContacts: { $sum: 1 },
        activeContacts: {
          $sum: { $cond: ['$isActive', 1, 0] }
        },
        totalMessages: { $sum: '$stats.totalMessages' },
        avgResponseTime: { $avg: '$stats.avgResponseTime' }
      }
    }
  ]);
  
  return stats[0] || {
    totalContacts: 0,
    activeContacts: 0,
    totalMessages: 0,
    avgResponseTime: 0
  };
};

// Pre-save middleware to update lastModified
defaultContactSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

// Pre-save middleware to validate custom schedule
defaultContactSchema.pre('save', function(next) {
  if (this.availability === 'custom') {
    if (!this.customSchedule.workingDays || this.customSchedule.workingDays.length === 0) {
      return next(new Error('Working days must be specified for custom availability'));
    }
    
    if (!this.customSchedule.workingHours.start || !this.customSchedule.workingHours.end) {
      return next(new Error('Working hours must be specified for custom availability'));
    }
  }
  next();
});

module.exports = mongoose.model('DefaultContact', defaultContactSchema);
