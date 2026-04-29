const mongoose = require('mongoose');

const projectMemberSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'manager', 'contributor', 'client', 'viewer'],
    default: 'contributor'
  },
  permissions: {
    canCreateCards: {
      type: Boolean,
      default: true
    },
    canEditCards: {
      type: Boolean,
      default: true
    },
    canDeleteCards: {
      type: Boolean,
      default: false
    },
    canManageMembers: {
      type: Boolean,
      default: false
    },
    canViewBudget: {
      type: Boolean,
      default: false
    },
    canManageFiles: {
      type: Boolean,
      default: true
    },
    canTrackTime: {
      type: Boolean,
      default: true
    },
    canApproveDeliverables: {
      type: Boolean,
      default: false
    }
  },
  departments: [String],
  skillTags: [String],
  hourlyRate: Number,
  capacity: {
    hoursPerWeek: {
      type: Number,
      default: 40
    },
    allocation: {
      type: Number,
      default: 100
    }
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastActive: Date,
  status: {
    type: String,
    enum: ['active', 'inactive', 'removed'],
    default: 'active'
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  invitationToken: String,
  invitationExpires: Date
}, {
  timestamps: true
});

// Index for performance
projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });
projectMemberSchema.index({ projectId: 1, role: 1 });
projectMemberSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('ProjectMember', projectMemberSchema);
