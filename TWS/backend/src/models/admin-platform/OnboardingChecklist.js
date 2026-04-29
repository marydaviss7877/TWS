const mongoose = require('mongoose');

const onboardingChecklistSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  checklistItemId: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['TENANT_ADMIN', 'USER', 'VIEWER'],
    default: 'TENANT_ADMIN'
  },
  order: {
    type: Number,
    required: true
  },
  required: {
    type: Boolean,
    default: false
  },
  estimatedTime: {
    type: String,
    default: '5 min'
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  skipped: {
    type: Boolean,
    default: false
  },
  skippedAt: {
    type: Date
  },
  helpLink: {
    type: String
  }
}, {
  timestamps: true
});

// Compound unique index
onboardingChecklistSchema.index({ tenantId: 1, checklistItemId: 1 }, { unique: true });
onboardingChecklistSchema.index({ tenantId: 1, completed: 1 });

// Method to mark as complete
onboardingChecklistSchema.methods.markComplete = function(userId) {
  this.completed = true;
  this.completedAt = new Date();
  this.completedBy = userId;
  return this.save();
};

// Method to skip
onboardingChecklistSchema.methods.skip = function() {
  if (!this.required) {
    this.skipped = true;
    this.skippedAt = new Date();
    return this.save();
  }
  throw new Error('Cannot skip required checklist item');
};

module.exports = mongoose.model('OnboardingChecklist', onboardingChecklistSchema);
