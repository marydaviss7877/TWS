const mongoose = require('mongoose');

/**
 * ProjectTimeline Model
 * Stores user-specific timeline view preferences and scroll positions
 * for Gantt chart views
 */
const projectTimelineSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  viewType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly'],
    default: 'weekly'
  },
  zoomLevel: {
    type: Number,
    default: 1,
    min: 0.5,
    max: 3
  },
  scrollPosition: {
    x: {
      type: Number,
      default: 0
    },
    y: {
      type: Number,
      default: 0
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  visibleDateRange: {
    start: Date,
    end: Date
  },
  collapsedTasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  expandedGroups: [{
    type: String
  }]
}, {
  timestamps: true
});

// Compound index for user-specific project timeline
projectTimelineSchema.index({ orgId: 1, projectId: 1, userId: 1 }, { unique: true });
projectTimelineSchema.index({ projectId: 1, userId: 1 });

module.exports = mongoose.model('ProjectTimeline', projectTimelineSchema);
