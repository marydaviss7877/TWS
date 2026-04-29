const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'at_risk', 'delayed'],
    default: 'pending'
  },
  dueDate: {
    type: Date
  },
  completedDate: {
    type: Date
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Milestone'
  }],
  tasks: {
    total: {
      type: Number,
      default: 0
    },
    completed: {
      type: Number,
      default: 0
    }
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  tags: [String],
  notes: String
}, {
  timestamps: true
});

// Indexes
milestoneSchema.index({ orgId: 1, projectId: 1 });
milestoneSchema.index({ orgId: 1, status: 1 });
milestoneSchema.index({ dueDate: 1 });

// Calculate progress based on completed tasks
milestoneSchema.methods.calculateProgress = function() {
  if (this.tasks.total === 0) {
    this.progress = 0;
  } else {
    this.progress = Math.round((this.tasks.completed / this.tasks.total) * 100);
  }
  return this.progress;
};

module.exports = mongoose.model('Milestone', milestoneSchema);

