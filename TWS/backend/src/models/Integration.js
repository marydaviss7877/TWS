const mongoose = require('mongoose');

// Integration Configuration Schema
const integrationConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['time_tracking', 'project_management', 'accounting', 'hr'],
    required: true
  },
  provider: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'error', 'pending'],
    default: 'inactive'
  },
  credentials: {
    apiKey: String,
    secretKey: String,
    accessToken: String,
    refreshToken: String,
    webhookSecret: String,
    baseUrl: String
  },
  settings: {
    autoSync: {
      type: Boolean,
      default: false
    },
    syncFrequency: {
      type: String,
      enum: ['realtime', 'hourly', 'daily', 'weekly'],
      default: 'daily'
    },
    lastSync: Date,
    syncErrors: [{
      timestamp: Date,
      error: String,
      details: mongoose.Schema.Types.Mixed
    }]
  },
  mappings: {
    projects: [{
      externalId: String,
      internalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
      },
      name: String
    }],
    clients: [{
      externalId: String,
      internalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
      },
      name: String
    }],
    users: [{
      externalId: String,
      internalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      email: String
    }]
  },
  webhooks: [{
    url: String,
    events: [String],
    secret: String,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});

// Integration Log Schema
const integrationLogSchema = new mongoose.Schema({
  integrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IntegrationConfig',
    required: true
  },
  type: {
    type: String,
    enum: ['sync', 'webhook', 'api_call', 'error', 'auth'],
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'error', 'warning', 'info'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  details: mongoose.Schema.Types.Mixed,
  duration: Number, // in milliseconds
  recordsProcessed: Number,
  recordsCreated: Number,
  recordsUpdated: Number,
  recordsFailed: Number,
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});

// Time Tracking Integration Schema
const timeTrackingIntegrationSchema = new mongoose.Schema({
  integrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IntegrationConfig',
    required: true
  },
  provider: {
    type: String,
    enum: ['harvest', 'clockify', 'toggl', 'jira_tempo', 'asana'],
    required: true
  },
  workspaceId: String,
  userId: String,
  projectMappings: [{
    externalProjectId: String,
    internalProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    taskMappings: [{
      externalTaskId: String,
      internalTaskId: String,
      name: String
    }]
  }],
  userMappings: [{
    externalUserId: String,
    internalUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    email: String,
    hourlyRate: Number
  }],
  lastSyncTime: Date,
  syncSettings: {
    autoImportTimeEntries: {
      type: Boolean,
      default: true
    },
    autoCreateProjects: {
      type: Boolean,
      default: false
    },
    autoCreateUsers: {
      type: Boolean,
      default: false
    },
    billableOnly: {
      type: Boolean,
      default: true
    }
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});

// Project Management Integration Schema
const projectManagementIntegrationSchema = new mongoose.Schema({
  integrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IntegrationConfig',
    required: true
  },
  provider: {
    type: String,
    enum: ['jira', 'asana', 'clickup', 'trello', 'monday'],
    required: true
  },
  workspaceId: String,
  boardMappings: [{
    externalBoardId: String,
    internalProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    name: String
  }],
  taskMappings: [{
    externalTaskId: String,
    internalTaskId: String,
    name: String,
    status: String,
    assignee: String
  }],
  syncSettings: {
    autoImportTasks: {
      type: Boolean,
      default: true
    },
    autoCreateProjects: {
      type: Boolean,
      default: false
    },
    syncStatusUpdates: {
      type: Boolean,
      default: true
    },
    syncComments: {
      type: Boolean,
      default: false
    }
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});



// Indexes for performance
integrationConfigSchema.index({ orgId: 1, type: 1 });
integrationConfigSchema.index({ provider: 1 });
integrationConfigSchema.index({ status: 1 });

integrationLogSchema.index({ integrationId: 1, createdAt: -1 });
integrationLogSchema.index({ type: 1, status: 1 });
integrationLogSchema.index({ orgId: 1 });

timeTrackingIntegrationSchema.index({ integrationId: 1 });
timeTrackingIntegrationSchema.index({ provider: 1 });
timeTrackingIntegrationSchema.index({ orgId: 1 });

projectManagementIntegrationSchema.index({ integrationId: 1 });
projectManagementIntegrationSchema.index({ provider: 1 });
projectManagementIntegrationSchema.index({ orgId: 1 });

// PaymentGatewayIntegrationSchema is not yet implemented
// paymentGatewayIntegrationSchema.index({ integrationId: 1 });
// paymentGatewayIntegrationSchema.index({ provider: 1 });
// paymentGatewayIntegrationSchema.index({ orgId: 1 });

module.exports = {
  IntegrationConfig: mongoose.model('IntegrationConfig', integrationConfigSchema),
  IntegrationLog: mongoose.model('IntegrationLog', integrationLogSchema),
  TimeTrackingIntegration: mongoose.model('TimeTrackingIntegration', timeTrackingIntegrationSchema),
  ProjectManagementIntegration: mongoose.model('ProjectManagementIntegration', projectManagementIntegrationSchema)
};
