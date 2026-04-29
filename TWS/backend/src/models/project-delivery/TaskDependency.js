const mongoose = require('mongoose');

/**
 * TaskDependency Model
 * Represents dependencies between tasks with support for different dependency types
 * and lag time (delay between tasks)
 */
const taskDependencySchema = new mongoose.Schema({
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
  sourceTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true
  },
  targetTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true
  },
  dependencyType: {
    type: String,
    enum: ['finish-to-start', 'start-to-start', 'finish-to-finish', 'start-to-finish'],
    default: 'finish-to-start',
    required: true
  },
  lagTime: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Lag time in days between source and target task'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound indexes for performance
taskDependencySchema.index({ orgId: 1, projectId: 1 });
taskDependencySchema.index({ sourceTaskId: 1, targetTaskId: 1 });
taskDependencySchema.index({ projectId: 1, sourceTaskId: 1 });
taskDependencySchema.index({ projectId: 1, targetTaskId: 1 });

// Prevent duplicate dependencies
taskDependencySchema.index(
  { sourceTaskId: 1, targetTaskId: 1, dependencyType: 1 },
  { unique: true }
);

// Prevent self-dependencies
taskDependencySchema.pre('save', function(next) {
  if (this.sourceTaskId.toString() === this.targetTaskId.toString()) {
    return next(new Error('A task cannot depend on itself'));
  }
  next();
});

// Virtual to check if this creates a circular dependency
taskDependencySchema.methods.wouldCreateCircularDependency = async function() {
  // This will be implemented in the service layer with graph traversal
  // For now, we just validate basic constraints
  return false;
};

module.exports = mongoose.model('TaskDependency', taskDependencySchema);
