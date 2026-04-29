const mongoose = require('mongoose');

const listSchema = new mongoose.Schema({
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectBoard',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  order: {
    type: Number,
    default: 0
  },
  color: {
    type: String,
    default: '#3B82F6'
  },
  settings: {
    wipLimit: {
      enabled: {
        type: Boolean,
        default: false
      },
      limit: {
        type: Number,
        default: 0
      }
    },
    autoMove: {
      enabled: {
        type: Boolean,
        default: false
      },
      afterHours: {
        type: Number,
        default: 24
      },
      targetListId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'List'
      }
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    clientVisible: {
      type: Boolean,
      default: true
    }
  },
  archived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date,
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for performance
listSchema.index({ boardId: 1, order: 1 });
listSchema.index({ projectId: 1, archived: 1 });
listSchema.index({ boardId: 1, archived: 1 });

module.exports = mongoose.model('ProjectList', listSchema);
