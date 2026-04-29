const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Deliverable Model - Nucleus Project OS Specification
 * Extends Milestone concept with Nucleus-specific status states and features
 * Can be used alongside or instead of Milestone model
 */
const DeliverableSchema = new Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  start_date: {
    type: Date,
    required: true
  },
  target_date: {
    type: Date,
    required: true
  },
  shipped_at: {
    type: Date
  },
  status: {
    type: String,
    enum: ['created', 'in_dev', 'ready_approval', 'approved', 'shipped', 'in_rework'],
    default: 'created',
    index: true
  },
  progress_percentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  blocking_criteria_met: {
    type: Boolean,
    default: false
  },
  dependencies: [{
    type: Schema.Types.ObjectId,
    ref: 'Deliverable'
  }],
  tasks: [{
    type: Schema.Types.ObjectId,
    ref: 'Task'
  }],
  acceptance_criteria: [{
    description: {
      type: String,
      required: true
    },
    met: {
      type: Boolean,
      default: false
    }
  }],
  // Date confidence tracking (Nucleus requirement)
  last_date_validation: {
    type: Date
  },
  date_confidence: {
    type: Number,
    min: 0,
    max: 100
  },
  validation_history: [{
    validated_at: {
      type: Date,
      default: Date.now
    },
    validated_by: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
    notes: {
      type: String
    }
  }],
  // Nucleus: Workspace isolation (through project)
  // workspaceId is derived from project_id, but we can add it for faster queries
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    index: true
  },
  
  // Multi-tenancy fields
  orgId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  // Owner/assignee
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  // Tags and metadata
  tags: [String],
  notes: String
}, {
  timestamps: true
});

// Indexes for performance
DeliverableSchema.index({ project_id: 1, status: 1 });
DeliverableSchema.index({ workspaceId: 1, status: 1 }); // Nucleus: Workspace isolation
DeliverableSchema.index({ orgId: 1, project_id: 1 });
DeliverableSchema.index({ tenantId: 1, project_id: 1 });
DeliverableSchema.index({ target_date: 1 });
DeliverableSchema.index({ last_date_validation: 1 });

/**
 * Method to check if deliverable is at risk
 */
DeliverableSchema.methods.isAtRisk = function() {
  const now = new Date();
  const daysRemaining = Math.ceil((this.target_date - now) / (1000 * 60 * 60 * 24));
  const workRemaining = this.progress_percentage < 100 
    ? (100 - this.progress_percentage) / 10 // rough estimate: 10% = 1 day
    : 0;
  
  return workRemaining > daysRemaining;
};

/**
 * Method to validate date and update confidence
 */
DeliverableSchema.methods.validateDate = async function(validatedBy, confidence, notes) {
  this.last_date_validation = new Date();
  this.date_confidence = confidence;
  
  this.validation_history.push({
    validated_at: new Date(),
    validated_by,
    confidence,
    notes: notes || ''
  });
  
  return this.save();
};

/**
 * Static method to find deliverables needing validation
 */
DeliverableSchema.statics.findNeedingValidation = function(orgId, daysThreshold = 14) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
  
  return this.find({
    orgId,
    $or: [
      { last_date_validation: { $lt: thresholdDate } },
      { last_date_validation: { $exists: false } }
    ],
    status: { $in: ['created', 'in_dev', 'ready_approval'] }
  }).populate('project_id', 'name');
};

/**
 * Method to calculate progress from tasks
 */
DeliverableSchema.methods.calculateProgressFromTasks = async function() {
  const Task = mongoose.model('Task');
  
  if (!this.tasks || this.tasks.length === 0) {
    this.progress_percentage = 0;
    return this.save();
  }
  
  const tasks = await Task.find({ _id: { $in: this.tasks } });
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  this.progress_percentage = Math.round((completedTasks / tasks.length) * 100);
  
  return this.save();
};

/**
 * Method to check if blocking criteria are met
 */
DeliverableSchema.methods.checkBlockingCriteria = function() {
  if (!this.acceptance_criteria || this.acceptance_criteria.length === 0) {
    this.blocking_criteria_met = true;
  return true;
  }
  
  const allMet = this.acceptance_criteria.every(criteria => criteria.met);
  this.blocking_criteria_met = allMet;
  return allMet;
};

/**
 * Pre-save hook: Automatically set workspaceId from project
 */
DeliverableSchema.pre('save', async function(next) {
  // If workspaceId is not set, get it from project
  if (!this.workspaceId && this.project_id) {
    const Project = mongoose.model('Project');
    const project = await Project.findById(this.project_id).select('workspaceId');
    if (project && project.workspaceId) {
      this.workspaceId = project.workspaceId;
    }
  }
  next();
});

module.exports = mongoose.model('Deliverable', DeliverableSchema);
