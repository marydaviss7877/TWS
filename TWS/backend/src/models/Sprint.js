const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

// Sprint Schema for Agile/Scrum Development
const SprintSchema = new mongoose.Schema({
  // Basic Info
  projectId: { type: ObjectId, ref: 'Project', required: true },
  workspaceId: { type: ObjectId, ref: 'Workspace', required: false },
  orgId: { type: ObjectId, ref: 'Organization', required: true },
  
  // Sprint Details
  name: { type: String, required: true },
  description: String,
  sprintNumber: { type: Number, required: true },
  
  // Sprint Timeline
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  duration: { type: Number, default: 14 }, // days
  
  // Sprint Status
  status: {
    type: String,
    enum: ['planning', 'active', 'completed', 'cancelled'],
    default: 'planning'
  },
  
  // Sprint Goals
  goal: String,
  objectives: [String],
  
  // Sprint Capacity & Velocity
  capacity: {
    totalStoryPoints: { type: Number, default: 0 },
    committedStoryPoints: { type: Number, default: 0 },
    completedStoryPoints: { type: Number, default: 0 },
    teamCapacity: { type: Number, default: 0 }, // hours
    actualHours: { type: Number, default: 0 }
  },
  
  // Sprint Metrics
  metrics: {
    velocity: { type: Number, default: 0 },
    burndown: [{
      date: Date,
      remainingStoryPoints: Number,
      remainingHours: Number
    }],
    burnup: [{
      date: Date,
      completedStoryPoints: Number,
      totalStoryPoints: Number
    }]
  },
  
  // Sprint Ceremonies
  ceremonies: {
    planning: {
      scheduled: Date,
      completed: Date,
      attendees: [{ type: ObjectId, ref: 'User' }],
      notes: String
    },
    daily: [{
      date: Date,
      attendees: [{ type: ObjectId, ref: 'User' }],
      notes: String,
      blockers: [String]
    }],
    review: {
      scheduled: Date,
      completed: Date,
      attendees: [{ type: ObjectId, ref: 'User' }],
      demoNotes: String,
      feedback: String
    },
    retrospective: {
      scheduled: Date,
      completed: Date,
      attendees: [{ type: ObjectId, ref: 'User' }],
      whatWentWell: [String],
      whatWentWrong: [String],
      actionItems: [String]
    }
  },
  
  // Sprint Backlog
  backlog: [{
    cardId: { type: ObjectId, ref: 'Card' },
    addedAt: { type: Date, default: Date.now },
    addedBy: { type: ObjectId, ref: 'User' }
  }],
  
  // Sprint Team
  team: [{
    userId: { type: ObjectId, ref: 'User' },
    role: String,
    capacity: { type: Number, default: 40 }, // hours per sprint
    allocation: { type: Number, default: 100 } // percentage
  }],
  
  // Sprint Settings
  settings: {
    autoClose: { type: Boolean, default: true },
    notifyOnCompletion: { type: Boolean, default: true },
    allowScopeChange: { type: Boolean, default: false }
  },
  
  // Metadata
  createdBy: { type: ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for performance
SprintSchema.index({ projectId: 1, sprintNumber: 1 }, { unique: true });
SprintSchema.index({ projectId: 1, status: 1 });
SprintSchema.index({ startDate: 1, endDate: 1 });

// Virtual for sprint progress
SprintSchema.virtual('progress').get(function() {
  if (this.status === 'completed') return 100;
  if (this.status === 'planning') return 0;
  
  const now = new Date();
  const totalDuration = this.endDate - this.startDate;
  const elapsed = now - this.startDate;
  
  return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
});

// Virtual for sprint health
SprintSchema.virtual('health').get(function() {
  if (this.status === 'completed') {
    const completionRate = this.capacity.completedStoryPoints / this.capacity.committedStoryPoints;
    if (completionRate >= 0.9) return 'excellent';
    if (completionRate >= 0.7) return 'good';
    if (completionRate >= 0.5) return 'fair';
    return 'poor';
  }
  return 'active';
});

// Pre-save middleware
SprintSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate velocity if sprint is completed
  if (this.status === 'completed') {
    this.metrics.velocity = this.capacity.completedStoryPoints;
  }
  
  next();
});

// Indexes for performance
SprintSchema.index({ orgId: 1, projectId: 1 });
SprintSchema.index({ orgId: 1, status: 1 });
SprintSchema.index({ orgId: 1, startDate: 1, endDate: 1 });
SprintSchema.index({ projectId: 1, sprintNumber: 1 }, { unique: true });

module.exports = mongoose.model('Sprint', SprintSchema);