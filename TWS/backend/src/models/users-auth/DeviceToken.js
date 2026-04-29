const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  platform: {
    type: String,
    enum: ['web', 'android', 'ios'],
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  deviceInfo: {
    userAgent: String,
    appVersion: String,
    osVersion: String,
    deviceModel: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for performance
deviceTokenSchema.index({ userId: 1, platform: 1 });
deviceTokenSchema.index({ token: 1 });
deviceTokenSchema.index({ isActive: 1 });
deviceTokenSchema.index({ lastUsed: -1 });

// Method to mark token as inactive
deviceTokenSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// Method to update last used timestamp
deviceTokenSchema.methods.updateLastUsed = function() {
  this.lastUsed = new Date();
  return this.save();
};

// Static method to find active tokens for user
deviceTokenSchema.statics.findActiveTokensForUser = function(userId) {
  return this.find({ userId, isActive: true });
};

// Static method to find active tokens for multiple users
deviceTokenSchema.statics.findActiveTokensForUsers = function(userIds) {
  return this.find({ userId: { $in: userIds }, isActive: true });
};

// Static method to cleanup old inactive tokens
deviceTokenSchema.statics.cleanupOldTokens = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({
    isActive: false,
    lastUsed: { $lt: cutoffDate }
  });
};

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);
