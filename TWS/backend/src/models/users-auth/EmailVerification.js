const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // May not exist yet during signup
  },
  otp: {
    type: String,
    required: true,
    length: 6
  },
  token: {
    type: String,
    required: false // Alternative to OTP
  },
  type: {
    type: String,
    enum: ['signup', 'password_reset', 'email_change'],
    default: 'signup'
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'expired', 'used'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // Auto-delete expired records
  },
  resendCount: {
    type: Number,
    default: 0
  },
  lastResendAt: {
    type: Date
  },
  verifiedAt: {
    type: Date
  },
  metadata: {
    signupSource: String, // Landing page identifier
    landingPage: String,
    industry: String,
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true
});

// Indexes
emailVerificationSchema.index({ email: 1, status: 1 });
emailVerificationSchema.index({ otp: 1 });
emailVerificationSchema.index({ token: 1 });
emailVerificationSchema.index({ expiresAt: 1 });

// Method to check if OTP is valid
emailVerificationSchema.methods.isValid = function() {
  return this.status === 'pending' && this.expiresAt > new Date();
};

// Method to mark as verified
emailVerificationSchema.methods.markAsVerified = function() {
  this.status = 'verified';
  this.verifiedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);
