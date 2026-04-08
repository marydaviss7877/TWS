const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

// Enhanced Workspace Schema with modern PM practices and messaging features
const WorkspaceSchema = new mongoose.Schema({
  // Basic Info
  orgId: { type: ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  avatar: String,
  color: { type: String, default: '#3B82F6' },
  
  // Nucleus: Owner and Members
  ownerId: { type: ObjectId, ref: 'User', required: true },
  members: [{
    userId: { type: ObjectId, ref: 'User', required: true },
    role: { 
      type: String, 
      enum: ['owner', 'admin', 'member', 'guest'], // Added 'guest' for client access
      default: 'member' 
    },
    /** Nucleus: which approval step this member can approve (dev_lead, qa_lead, security, client) */
    approvalRole: {
      type: String,
      enum: ['dev_lead', 'qa_lead', 'security', 'client'],
      default: undefined
    },
    joinedAt: { type: Date, default: Date.now },
    invitedBy: { type: ObjectId, ref: 'User' },
    status: { 
      type: String, 
      enum: ['active', 'pending', 'suspended'], 
      default: 'active' 
    }
  }],
  
  // Workspace Type & Methodology
  type: { 
    type: String, 
    enum: ['internal', 'client', 'partner', 'agency'], 
    default: 'internal' 
  },
  methodology: {
    type: String,
    enum: ['agile', 'scrum', 'kanban', 'waterfall', 'hybrid', 'custom'],
    default: 'agile'
  },
  
  // Nucleus: Workspace-Level Settings (Shared Rules)
  settings: {
    // Collaboration
    allowMemberInvites: { type: Boolean, default: true },
    allowGuestAccess: { type: Boolean, default: false },
    requireApprovalForJoins: { type: Boolean, default: false },
    
    // Visibility & Access
    clientVisible: { type: Boolean, default: true },
    publicBoards: { type: Boolean, default: false },
    allowExternalSharing: { type: Boolean, default: false },
    
    // Nucleus: Approval Workflow Configuration (Workspace-Level Default)
    approvalWorkflow: {
      steps: [{
        stepNumber: { type: Number, required: true },
        approverType: { 
          type: String, 
          enum: ['dev_lead', 'qa_lead', 'security', 'client'],
          required: true 
        },
        required: { type: Boolean, default: true },
        order: { type: Number, required: true } // Sequential order
      }],
      defaultSteps: {
        type: String,
        enum: ['dev_qa_client', 'dev_qa_security_client', 'custom'],
        default: 'dev_qa_client'
      }
    },
    
    // Nucleus: Workspace-Level Configuration
    timezone: { type: String, default: 'UTC' },
    currency: { type: String, default: 'USD' },
    workingDays: {
      monday: { type: Boolean, default: true },
      tuesday: { type: Boolean, default: true },
      wednesday: { type: Boolean, default: true },
      thursday: { type: Boolean, default: true },
      friday: { type: Boolean, default: true },
      saturday: { type: Boolean, default: false },
      sunday: { type: Boolean, default: false }
    },
    
    // Automation
    autoArchive: { type: Boolean, default: false },
    archiveAfterDays: { type: Number, default: 30 },
    autoMoveCompletedCards: { type: Boolean, default: true },
    enableTimeTracking: { type: Boolean, default: true },
    
    // Notifications
    emailNotifications: { type: Boolean, default: true },
    webhookUrl: String,
    
    // Advanced Features
    enableCustomFields: { type: Boolean, default: true },
    enableTemplates: { type: Boolean, default: true },
    enableAutomation: { type: Boolean, default: true },
    enableReporting: { type: Boolean, default: true },
    enableIntegrations: { type: Boolean, default: true }
  },
  
  // Nucleus: Subscription & Billing (1 workspace = 1 subscription)
  subscription: {
    plan: { 
      type: String, 
      enum: ['free', 'starter', 'growth', 'professional', 'enterprise'], 
      default: 'free' 
    },
    status: { 
      type: String, 
      enum: ['active', 'suspended', 'cancelled', 'trial'], 
      default: 'active' 
    },
    billingCycle: { 
      type: String, 
      enum: ['monthly', 'yearly'], 
      default: 'monthly' 
    },
    trialEndsAt: Date,
    maxMembers: { type: Number, default: 5 },
    maxBoards: { type: Number, default: 3 },
    maxProjects: { type: Number, default: 10 }, // Nucleus: Project limit
    maxStorage: { type: Number, default: 1000 }, // MB
    features: [String], // Array of enabled features
    billingEmail: String, // Nucleus: Billing contact email
    paymentMethod: String // Nucleus: Payment method identifier
  },
  
  // Usage Tracking
  usage: {
    members: { type: Number, default: 0 },
    boards: { type: Number, default: 0 },
    cards: { type: Number, default: 0 },
    storage: { type: Number, default: 0 }, // MB
    apiCalls: { type: Number, default: 0 },
    lastActivity: Date
  },
  
  // Integrations
  integrations: {
    erpSync: { type: Boolean, default: true },
    erpProjectId: ObjectId,
    github: {
      enabled: { type: Boolean, default: false },
      repository: String,
      branch: String
    },
    jira: {
      enabled: { type: Boolean, default: false },
      url: String,
      projectKey: String
    },
    webhookUrl: String,
    apiKey: String
  },
  
  // Analytics & Insights
  analytics: {
    totalCardsCreated: { type: Number, default: 0 },
    totalCardsCompleted: { type: Number, default: 0 },
    averageCycleTime: { type: Number, default: 0 }, // hours
    velocity: { type: Number, default: 0 }, // cards per sprint
    burndownData: [{
      date: Date,
      remaining: Number,
      completed: Number
    }],
    teamPerformance: [{
      userId: ObjectId,
      cardsCompleted: Number,
      averageCycleTime: Number,
      lastActivity: Date
    }]
  },
  
  // Custom Fields & Templates
  customFields: [{
    id: String,
    name: String,
    type: { type: String, enum: ['text', 'number', 'date', 'select', 'multiselect', 'checkbox', 'url'] },
    options: [String], // For select/multiselect
    required: { type: Boolean, default: false },
    defaultValue: mongoose.Schema.Types.Mixed
  }],
  
  templates: [{
    name: String,
    description: String,
    type: { type: String, enum: ['board', 'card', 'list'] },
    config: mongoose.Schema.Types.Mixed,
    isDefault: { type: Boolean, default: false }
  }],
  
  // Automation Rules
  automationRules: [{
    name: String,
    description: String,
    trigger: {
      type: { type: String, enum: ['card_created', 'card_moved', 'card_completed', 'due_date_approaching', 'custom'] },
      conditions: mongoose.Schema.Types.Mixed
    },
    actions: [{
      type: { type: String, enum: ['move_card', 'assign_member', 'add_label', 'set_due_date', 'send_notification', 'webhook'] },
      config: mongoose.Schema.Types.Mixed
    }],
    enabled: { type: Boolean, default: true }
  }],
  
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
WorkspaceSchema.index({ orgId: 1, status: 1 });
WorkspaceSchema.index({ slug: 1 }, { unique: true });
WorkspaceSchema.index({ 'subscription.plan': 1 });
WorkspaceSchema.index({ 'methodology': 1 });
WorkspaceSchema.index({ createdAt: -1 });

// Virtual for member count
WorkspaceSchema.virtual('memberCount').get(function() {
  return this.usage.members;
});

// Virtual for board count
WorkspaceSchema.virtual('boardCount').get(function() {
  return this.usage.boards;
});

// Methods
WorkspaceSchema.methods.canCreateBoard = function() {
  return this.usage.boards < this.subscription.maxBoards;
};

WorkspaceSchema.methods.canAddMember = function() {
  return this.usage.members < this.subscription.maxMembers;
};

WorkspaceSchema.methods.hasFeature = function(feature) {
  return this.subscription.features.includes(feature);
};

WorkspaceSchema.methods.updateUsage = function(type, increment = 1) {
  this.usage[type] += increment;
  this.usage.lastActivity = new Date();
  return this.save();
};

WorkspaceSchema.methods.getAnalytics = function(period = '30d') {
  // Return analytics data for the specified period
  const days = parseInt(period.replace('d', ''));
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return {
    period,
    startDate,
    endDate: new Date(),
    totalCards: this.analytics.totalCardsCreated,
    completedCards: this.analytics.totalCardsCompleted,
    completionRate: this.analytics.totalCardsCreated > 0 
      ? (this.analytics.totalCardsCompleted / this.analytics.totalCardsCreated) * 100 
      : 0,
    averageCycleTime: this.analytics.averageCycleTime,
    velocity: this.analytics.velocity,
    teamPerformance: this.analytics.teamPerformance
  };
};

// Workspace messaging methods
WorkspaceSchema.methods.addMember = function(userId, role = 'member', invitedBy = null) {
  const existingMember = this.members.find(m => m.userId.toString() === userId.toString());
  if (!existingMember) {
    this.members.push({
      userId,
      role,
      joinedAt: new Date(),
      invitedBy,
      status: 'active'
    });
    this.usage.members += 1;
    return this.save();
  }
  return Promise.resolve(this);
};

WorkspaceSchema.methods.removeMember = function(userId) {
  const memberIndex = this.members.findIndex(m => m.userId.toString() === userId.toString());
  if (memberIndex > -1) {
    this.members.splice(memberIndex, 1);
    this.usage.members = Math.max(0, this.usage.members - 1);
    return this.save();
  }
  return Promise.resolve(this);
};

WorkspaceSchema.methods.updateMemberRole = function(userId, role) {
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  if (member) {
    member.role = role;
    return this.save();
  }
  return Promise.resolve(this);
};

WorkspaceSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.userId.toString() === userId.toString() && m.status === 'active');
};

WorkspaceSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  return member ? member.role : null;
};

WorkspaceSchema.methods.isOwner = function(userId) {
  return this.ownerId.toString() === userId.toString();
};

WorkspaceSchema.methods.isAdmin = function(userId) {
  if (this.isOwner(userId)) return true;
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  return member && (member.role === 'admin' || member.role === 'owner');
};

WorkspaceSchema.methods.canInviteMembers = function(userId) {
  return this.isAdmin(userId);
};

WorkspaceSchema.methods.canManageChannels = function(userId) {
  return this.isAdmin(userId);
};

/**
 * Nucleus: Get workspace approval workflow configuration
 * Returns the configured approval steps for this workspace
 */
WorkspaceSchema.methods.getApprovalWorkflow = function() {
  if (!this.settings.approvalWorkflow || !this.settings.approvalWorkflow.steps) {
    // Return default workflow: Dev → QA → Client
    return {
      steps: [
        { stepNumber: 1, approverType: 'dev_lead', required: true, order: 1 },
        { stepNumber: 2, approverType: 'qa_lead', required: true, order: 2 },
        { stepNumber: 3, approverType: 'client', required: true, order: 3 }
      ],
      defaultSteps: 'dev_qa_client'
    };
  }
  return this.settings.approvalWorkflow;
};

/**
 * Nucleus: Set workspace approval workflow configuration
 * @param {Array} steps - Array of approval steps
 */
WorkspaceSchema.methods.setApprovalWorkflow = function(steps) {
  if (!this.settings.approvalWorkflow) {
    this.settings.approvalWorkflow = {};
  }
  this.settings.approvalWorkflow.steps = steps;
  this.settings.approvalWorkflow.defaultSteps = 'custom';
  return this.save();
};

/**
 * Nucleus: Check if user can approve deliverables in this workspace
 * @param {String} userId - User ID
 * @param {String} approverType - Type of approver ('dev_lead', 'qa_lead', 'security', 'client')
 */
WorkspaceSchema.methods.canApprove = function(userId, approverType) {
  // Owner and admins can approve any step
  if (this.isAdmin(userId)) {
    return true;
  }

  const member = this.members.find(m => m.userId.toString() === userId.toString());
  if (!member || member.status !== 'active') {
    return false;
  }

  // Member must have matching approvalRole for this step type
  return member.approvalRole === approverType;
};

/**
 * Nucleus: Get workspace timezone (defaults to UTC)
 */
WorkspaceSchema.methods.getTimezone = function() {
  return this.settings.timezone || 'UTC';
};

/**
 * Nucleus: Get workspace currency (defaults to USD)
 */
WorkspaceSchema.methods.getCurrency = function() {
  return this.settings.currency || 'USD';
};

/**
 * Nucleus: Get working days configuration
 */
WorkspaceSchema.methods.getWorkingDays = function() {
  return this.settings.workingDays || {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false
  };
};

module.exports = mongoose.model('Workspace', WorkspaceSchema);