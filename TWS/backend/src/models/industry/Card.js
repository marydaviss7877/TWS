const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

// Enhanced Card Schema with modern PM practices
const CardSchema = new mongoose.Schema({
  // Basic Info
  boardId: { type: ObjectId, ref: 'Board', required: true },
  listId: { type: ObjectId, ref: 'List', required: true },
  workspaceId: { type: ObjectId, ref: 'Workspace', required: true },
  projectId: { type: ObjectId, ref: 'Project', required: true },
  
  title: { type: String, required: true },
  description: String,
  coverImage: String,
  attachments: [{
    id: String,
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedBy: ObjectId,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Software House Specific Card Type
  type: { 
    type: String, 
    enum: [
      'user_story', 
      'epic', 
      'bug', 
      'feature', 
      'technical_task', 
      'code_review', 
      'story', 
      'task', 
      'improvement', 
      'custom'
    ], 
    default: 'task' 
  },
  // Story Points (for Agile/Scrum)
  storyPoints: {
    type: Number,
    min: 0,
    max: 100
  },
  // Acceptance Criteria
  acceptanceCriteria: [String],
  // Definition of Done
  definitionOfDone: [String],
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical', 'urgent'], 
    default: 'medium' 
  },
  
  // Assignees & Ownership
  assignees: [{ type: ObjectId, ref: 'User' }],
  reporter: { type: ObjectId, ref: 'User' },
  watchers: [{ type: ObjectId, ref: 'User' }],
  
  // Labels & Tags
  labels: [{
    id: String,
    name: String,
    color: String
  }],
  tags: [String],
  
  // Dates & Time Tracking
  dueDate: Date,
  startDate: Date,
  completedAt: Date,
  // Client portal visibility and milestones
  clientVisible: { type: Boolean, default: false },
  isMilestone: { type: Boolean, default: false },
  clientApproval: {
    approved: { type: Boolean, default: null },
    comment: String,
    approvedBy: { type: ObjectId, ref: 'User' },
    approvedAt: Date
  },
  
  // Enhanced Time Tracking for Software House Billing
  timeTracking: {
    estimated: { type: Number, default: 0 }, // hours
    logged: { type: Number, default: 0 }, // hours
    billable: { type: Number, default: 0 }, // billable hours
    nonBillable: { type: Number, default: 0 }, // non-billable hours
    hourlyRate: { type: Number, default: 0 }, // per hour rate
    totalCost: { type: Number, default: 0 }, // calculated cost
    remaining: { type: Number, default: 0 }, // hours
    entries: [{
      userId: ObjectId,
      description: String,
      duration: Number, // hours
      date: Date,
      billable: { type: Boolean, default: true }
    }]
  },
  
  // Effort sizing (Agile/Scrum)
  effort: { 
    type: String, 
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], 
    default: 'M' 
  },
  
  // Custom Fields
  customFields: [{
    fieldId: String,
    name: String,
    value: mongoose.Schema.Types.Mixed,
    type: String
  }],
  
  // Dependencies & Relationships
  dependencies: [{
    cardId: ObjectId,
    type: { type: String, enum: ['blocks', 'blocked_by', 'relates_to', 'duplicates'] },
    description: String
  }],
  
  // Subtasks & Checklists
  subtasks: [{
    id: String,
    title: String,
    completed: { type: Boolean, default: false },
    completedAt: Date,
    assignee: ObjectId
  }],
  
  checklists: [{
    id: String,
    title: String,
    items: [{
      id: String,
      text: String,
      completed: { type: Boolean, default: false },
      completedAt: Date,
      assignee: ObjectId
    }]
  }],
  
  // Comments & Activity
  comments: [{
    id: String,
    userId: ObjectId,
    text: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
    mentions: [ObjectId],
    attachments: [{
      id: String,
      name: String,
      url: String,
      type: String
    }]
  }],
  
  // Activity Log
  activity: [{
    id: String,
    type: { 
      type: String, 
      enum: ['created', 'updated', 'moved', 'assigned', 'commented', 'attached', 'time_logged', 'completed'] 
    },
    userId: ObjectId,
    description: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Sprint/Iteration Info
  sprint: {
    id: String,
    name: String,
    number: Number,
    startDate: Date,
    endDate: Date
  },
  
  // Status & Workflow
  status: { 
    type: String, 
    enum: ['todo', 'in_progress', 'review', 'testing', 'done', 'blocked', 'cancelled'], 
    default: 'todo' 
  },
  position: { type: Number, default: 0 },
  
  // Automation & Rules
  automationTriggered: [{
    ruleId: String,
    ruleName: String,
    triggeredAt: Date,
    actions: [String]
  }],
  
  // Integrations
  integrations: {
    github: {
      enabled: { type: Boolean, default: false },
      issueNumber: Number,
      repository: String,
      branch: String,
      commits: [{
        sha: String,
        message: String,
        author: String,
        date: Date
      }]
    },
    jira: {
      enabled: { type: Boolean, default: false },
      issueKey: String,
      issueId: String
    },
    externalId: String // For external system integration
  },
  
  // Analytics & Metrics
  metrics: {
    cycleTime: Number, // hours from start to completion
    leadTime: Number, // hours from creation to completion
    wipTime: Number, // hours in work in progress
    blockedTime: Number, // hours blocked
    reworkTime: Number, // hours spent on rework
    lastActivity: Date,
    moveCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    attachmentCount: { type: Number, default: 0 }
  },
  
  // Archival
  archived: { type: Boolean, default: false },
  archivedAt: Date,
  archivedBy: ObjectId,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
CardSchema.index({ boardId: 1, status: 1 });
CardSchema.index({ listId: 1, position: 1 });
CardSchema.index({ workspaceId: 1 });
CardSchema.index({ assignees: 1 });
CardSchema.index({ dueDate: 1 });
CardSchema.index({ 'sprint.id': 1 });
CardSchema.index({ createdAt: -1 });

// Virtual for completion percentage
CardSchema.virtual('completionPercentage').get(function() {
  if (this.subtasks.length === 0) {
    return this.status === 'done' ? 100 : 0;
  }
  const completed = this.subtasks.filter(subtask => subtask.completed).length;
  return (completed / this.subtasks.length) * 100;
});

// Virtual for time tracking summary
CardSchema.virtual('timeTrackingSummary').get(function() {
  return {
    estimated: this.timeTracking.estimated,
    logged: this.timeTracking.logged,
    remaining: this.timeTracking.remaining,
    overrun: this.timeTracking.logged > this.timeTracking.estimated,
    efficiency: this.timeTracking.estimated > 0 
      ? (this.timeTracking.logged / this.timeTracking.estimated) * 100 
      : 0
  };
});

// Virtual for is overdue
CardSchema.virtual('isOverdue').get(function() {
  return this.dueDate && new Date() > this.dueDate && this.status !== 'done';
});

// Methods
CardSchema.methods.addComment = function(userId, text, mentions = []) {
  const comment = {
    id: new mongoose.Types.ObjectId().toString(),
    userId,
    text,
    mentions,
    createdAt: new Date()
  };
  
  this.comments.push(comment);
  this.metrics.commentCount++;
  this.addActivity('commented', userId, `Added comment: ${text.substring(0, 50)}...`);
  
  return this.save();
};

CardSchema.methods.addActivity = function(type, userId, description, oldValue = null, newValue = null) {
  const activity = {
    id: new mongoose.Types.ObjectId().toString(),
    type,
    userId,
    description,
    oldValue,
    newValue,
    createdAt: new Date()
  };
  
  this.activity.push(activity);
  this.metrics.lastActivity = new Date();
  
  return this;
};

CardSchema.methods.logTime = function(userId, duration, description, billable = true) {
  const timeEntry = {
    userId,
    description,
    duration,
    date: new Date(),
    billable
  };
  
  this.timeTracking.entries.push(timeEntry);
  this.timeTracking.logged += duration;
  this.timeTracking.remaining = Math.max(0, this.timeTracking.estimated - this.timeTracking.logged);
  
  this.addActivity('time_logged', userId, `Logged ${duration}h: ${description}`);
  
  return this.save();
};

CardSchema.methods.moveToList = function(newListId, userId) {
  const oldListId = this.listId;
  this.listId = newListId;
  this.metrics.moveCount++;
  
  this.addActivity('moved', userId, `Moved from list ${oldListId} to ${newListId}`, oldListId, newListId);
  
  return this.save();
};

CardSchema.methods.complete = function(userId) {
  this.status = 'done';
  this.completedAt = new Date();
  
  // Calculate cycle time
  if (this.startDate) {
    this.metrics.cycleTime = (this.completedAt - this.startDate) / (1000 * 60 * 60); // hours
  }
  
  this.addActivity('completed', userId, 'Card completed');
  
  return this.save();
};

CardSchema.methods.addDependency = function(cardId, type, description) {
  const dependency = {
    cardId,
    type,
    description
  };
  
  this.dependencies.push(dependency);
  
  return this.save();
};

CardSchema.methods.updateCustomField = function(fieldId, value, userId) {
  const field = this.customFields.find(f => f.fieldId === fieldId);
  if (field) {
    const oldValue = field.value;
    field.value = value;
    this.addActivity('updated', userId, `Updated custom field ${field.name}`, oldValue, value);
  } else {
    this.customFields.push({ fieldId, value });
    this.addActivity('updated', userId, `Added custom field ${fieldId}`, null, value);
  }
  
  return this.save();
};

module.exports = mongoose.model('Card', CardSchema);