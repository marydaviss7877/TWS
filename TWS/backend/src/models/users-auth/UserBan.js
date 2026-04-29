const mongoose = require('mongoose');

const userBanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  bannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  banType: {
    type: String,
    enum: ['temporary', 'permanent'],
    default: 'temporary'
  },
  duration: {
    type: Number, // in hours, null for permanent bans
    default: 24
  },
  expiresAt: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  revokedAt: Date,
  revokeReason: String,
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Indexes
userBanSchema.index({ user: 1, organization: 1, isActive: 1 });
userBanSchema.index({ bannedBy: 1, createdAt: -1 });
userBanSchema.index({ expiresAt: 1 });
userBanSchema.index({ organization: 1, isActive: 1, createdAt: -1 });

// Virtual for checking if ban is expired
userBanSchema.virtual('isExpired').get(function() {
  if (this.banType === 'permanent') return false;
  return this.expiresAt && new Date() > this.expiresAt;
});

// Method to check if user is currently banned
userBanSchema.statics.isUserBanned = function(userId, organizationId) {
  return this.findOne({
    user: userId,
    organization: organizationId,
    isActive: true,
    $or: [
      { banType: 'permanent' },
      { expiresAt: { $gt: new Date() } }
    ]
  }).populate('bannedBy', 'fullName email');
};

// Method to create a ban
userBanSchema.statics.createBan = function(data) {
  const banData = {
    user: data.userId,
    organization: data.organizationId,
    bannedBy: data.bannedBy,
    reason: data.reason,
    banType: data.banType || 'temporary',
    duration: data.duration || 24,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent
  };

  if (banData.banType === 'temporary') {
    banData.expiresAt = new Date(Date.now() + (banData.duration * 60 * 60 * 1000));
  }

  return this.create(banData);
};

// Method to revoke a ban
userBanSchema.methods.revokeBan = function(revokedBy, reason) {
  this.isActive = false;
  this.revokedBy = revokedBy;
  this.revokedAt = new Date();
  this.revokeReason = reason;
  return this.save();
};

// Method to get user's ban history
userBanSchema.statics.getUserBanHistory = function(userId, organizationId) {
  return this.find({
    user: userId,
    organization: organizationId
  })
  .populate('bannedBy', 'fullName email')
  .populate('revokedBy', 'fullName email')
  .sort({ createdAt: -1 });
};

module.exports = mongoose.model('UserBan', userBanSchema);
