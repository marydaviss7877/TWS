const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

// Enhanced Board Schema with modern PM practices
const BoardSchema = new mongoose.Schema({
  // Basic Info
  workspaceId: { type: ObjectId, ref: 'Workspace', required: true },
  projectId: { type: ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true },
  description: String,
  color: { type: String, default: '#3B82F6' },
  coverImage: String,
  
  // Board Type & Methodology
  type: { 
    type: String, 
    enum: ['kanban', 'scrum', 'agile', 'waterfall', 'custom', 'timeline', 'calendar'], 
    default: 'kanban' 
  },
  methodology: {
    type: String,
    enum: ['agile', 'scrum', 'kanban', 'waterfall', 'hybrid', 'custom'],
    default: 'agile'
  },
  
  // Sprint/Iteration Management (for Scrum/Agile)
  sprint: {
    isActive: { type: Boolean, default: false },
    number: Number,
    name: String,
    goal: String,
    startDate: Date,
    endDate: Date,
    duration: { type: Number, default: 14 }, // days
    capacity: { type: Number, default: 0 }, // story points
    velocity: { type: Number, default: 0 }, // average story points per sprint
    burndownData: [{
      date: Date,
      remaining: Number,
      completed: Number
    }]
  },
  
  // Advanced Settings
  settings: {
    // Visibility & Access
    visibility: { 
      type: String, 
      enum: ['private', 'workspace', 'public'], 
      default: 'workspace' 
    },
    allowMemberInvites: { type: Boolean, default: true },
    allowGuestAccess: { type: Boolean, default: false },
    
    // Workflow
    allowCardCreation: { type: Boolean, default: true },
    allowCardEditing: { type: Boolean, default: true },
    requireCardApproval: { type: Boolean, default: false },
    autoArchiveCompleted: { type: Boolean, default: true },
    archiveAfterDays: { type: Number, default: 7 },
    
    // Time Tracking
    enableTimeTracking: { type: Boolean, default: true },
    requireTimeLogging: { type: Boolean, default: false },
    timeEstimationRequired: { type: Boolean, default: false },
    
    // Automation
    enableAutomation: { type: Boolean, default: true },
    autoMoveCompletedCards: { type: Boolean, default: true },
    autoAssignCards: { type: Boolean, default: false },
    
    // Notifications
    emailNotifications: { type: Boolean, default: true },
    webhookUrl: String,
    
    // Advanced Features
    enableCustomFields: { type: Boolean, default: true },
    enableTemplates: { type: Boolean, default: true },
    enableReporting: { type: Boolean, default: true },
    enableIntegrations: { type: Boolean, default: true },
    enableComments: { type: Boolean, default: true },
    enableAttachments: { type: Boolean, default: true }
  },
  
  // List Configuration
  lists: [{
    id: String,
    name: String,
    type: { 
      type: String, 
      enum: ['backlog', 'todo', 'in_progress', 'review', 'testing', 'done', 'custom'], 
      default: 'custom' 
    },
    color: String,
    order: Number,
    wipLimit: Number, // Work in Progress limit
    autoArchive: { type: Boolean, default: false },
    requiredFields: [String],
    customFields: [{
      id: String,
      name: String,
      type: String,
      required: Boolean
    }]
  }],
  
  // Custom Fields Configuration
  customFields: [{
    id: String,
    name: String,
    type: { 
      type: String, 
      enum: ['text', 'number', 'date', 'select', 'multiselect', 'checkbox', 'url', 'user', 'priority', 'effort'] 
    },
    options: [String], // For select/multiselect
    required: { type: Boolean, default: false },
    defaultValue: mongoose.Schema.Types.Mixed,
    validation: {
      min: Number,
      max: Number,
      pattern: String
    }
  }],
  
  // Labels & Tags
  labels: [{
    id: String,
    name: String,
    color: String,
    description: String
  }],
  
  // Templates
  templates: [{
    name: String,
    description: String,
    type: { type: String, enum: ['card', 'list'] },
    config: mongoose.Schema.Types.Mixed,
    isDefault: { type: Boolean, default: false }
  }],
  
  // Automation Rules
  automationRules: [{
    name: String,
    description: String,
    trigger: {
      type: { 
        type: String, 
        enum: ['card_created', 'card_moved', 'card_completed', 'due_date_approaching', 'sprint_start', 'sprint_end', 'custom'] 
      },
      conditions: mongoose.Schema.Types.Mixed
    },
    actions: [{
      type: { 
        type: String, 
        enum: ['move_card', 'assign_member', 'add_label', 'set_due_date', 'send_notification', 'webhook', 'create_card', 'update_field'] 
      },
      config: mongoose.Schema.Types.Mixed
    }],
    enabled: { type: Boolean, default: true }
  }],
  
  // Analytics & Metrics
  analytics: {
    totalCards: { type: Number, default: 0 },
    completedCards: { type: Number, default: 0 },
    averageCycleTime: { type: Number, default: 0 }, // hours
    averageLeadTime: { type: Number, default: 0 }, // hours
    throughput: { type: Number, default: 0 }, // cards per day
    wipEfficiency: { type: Number, default: 0 }, // percentage
    defectRate: { type: Number, default: 0 }, // percentage
    teamVelocity: { type: Number, default: 0 }, // story points per sprint
    burndownData: [{
      date: Date,
      remaining: Number,
      completed: Number,
      ideal: Number
    }],
    cumulativeFlow: [{
      date: Date,
      backlog: Number,
      todo: Number,
      inProgress: Number,
      review: Number,
      done: Number
    }]
  },
  
  // Integrations
  integrations: {
    github: {
      enabled: { type: Boolean, default: false },
      repository: String,
      branch: String,
      autoLinkCommits: { type: Boolean, default: true }
    },
    jira: {
      enabled: { type: Boolean, default: false },
      projectKey: String,
      syncIssues: { type: Boolean, default: true }
    },
    webhookUrl: String
  },
  
  // Order & Organization
  order: { type: Number, default: 0 },
  starred: { type: Boolean, default: false },
  pinned: { type: Boolean, default: false },
  
  // Status
  status: { 
    type: String, 
    enum: ['active', 'archived', 'suspended'], 
    default: 'active' 
  },
  archived: { type: Boolean, default: false },
  archivedAt: Date,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
BoardSchema.index({ workspaceId: 1, status: 1 });
BoardSchema.index({ projectId: 1 });
BoardSchema.index({ type: 1 });
BoardSchema.index({ 'sprint.isActive': 1 });
BoardSchema.index({ createdAt: -1 });

// Virtual for completion rate
BoardSchema.virtual('completionRate').get(function() {
  return this.analytics.totalCards > 0 
    ? (this.analytics.completedCards / this.analytics.totalCards) * 100 
    : 0;
});

// Virtual for active sprint
BoardSchema.virtual('activeSprint').get(function() {
  return this.sprint.isActive ? this.sprint : null;
});

// Methods
BoardSchema.methods.updateAnalytics = function() {
  // This would be called when cards are moved/completed
  // Implementation would calculate metrics based on card data
  return this.save();
};

BoardSchema.methods.startSprint = function(sprintData) {
  this.sprint = {
    ...this.sprint,
    ...sprintData,
    isActive: true,
    startDate: new Date()
  };
  return this.save();
};

BoardSchema.methods.endSprint = function() {
  this.sprint.isActive = false;
  this.sprint.endDate = new Date();
  return this.save();
};

BoardSchema.methods.getBurndownData = function() {
  return this.analytics.burndownData;
};

BoardSchema.methods.getCumulativeFlow = function() {
  return this.analytics.cumulativeFlow;
};

module.exports = mongoose.model('Board', BoardSchema);