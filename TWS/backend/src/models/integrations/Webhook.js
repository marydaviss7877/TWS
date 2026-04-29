const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  
  // Workspace association
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  
  // Channel association
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  
  // Authentication
  apiKey: {
    type: String,
    required: true,
    unique: true
  },
  
  // Configuration
  events: [{
    type: {
      type: String,
      enum: ['message.new', 'message.edited', 'file.uploaded', 'user.joined', 'user.left', 'channel.created', 'channel.archived'],
      required: true
    },
    enabled: {
      type: Boolean,
      default: true
    }
  }],
  
  // Webhook settings
  settings: {
    // Message formatting
    includeUserInfo: {
      type: Boolean,
      default: true
    },
    includeChannelInfo: {
      type: Boolean,
      default: true
    },
    includeWorkspaceInfo: {
      type: Boolean,
      default: true
    },
    
    // Rate limiting
    rateLimit: {
      requests: {
        type: Number,
        default: 100
      },
      window: {
        type: String,
        enum: ['minute', 'hour', 'day'],
        default: 'hour'
      }
    },
    
    // Retry settings
    retryAttempts: {
      type: Number,
      default: 3
    },
    retryDelay: {
      type: Number,
      default: 1000 // milliseconds
    }
  },
  
  // Status and tracking
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  
  // Usage statistics
  stats: {
    totalRequests: {
      type: Number,
      default: 0
    },
    successfulRequests: {
      type: Number,
      default: 0
    },
    failedRequests: {
      type: Number,
      default: 0
    },
    lastRequestAt: Date,
    lastSuccessAt: Date,
    lastFailureAt: Date
  },
  
  // Created by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Organization
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for performance
webhookSchema.index({ workspaceId: 1, status: 1 });
webhookSchema.index({ channelId: 1 });
webhookSchema.index({ apiKey: 1 }, { unique: true });
webhookSchema.index({ createdBy: 1 });
webhookSchema.index({ organization: 1 });

// Generate API key
webhookSchema.methods.generateApiKey = function() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
};

// Update statistics
webhookSchema.methods.updateStats = function(success = true) {
  this.stats.totalRequests += 1;
  this.stats.lastRequestAt = new Date();
  
  if (success) {
    this.stats.successfulRequests += 1;
    this.stats.lastSuccessAt = new Date();
  } else {
    this.stats.failedRequests += 1;
    this.stats.lastFailureAt = new Date();
  }
  
  return this.save();
};

// Check if event is enabled
webhookSchema.methods.isEventEnabled = function(eventType) {
  const event = this.events.find(e => e.type === eventType);
  return event ? event.enabled : false;
};

// Get success rate
webhookSchema.virtual('successRate').get(function() {
  if (this.stats.totalRequests === 0) return 0;
  return (this.stats.successfulRequests / this.stats.totalRequests) * 100;
});

// Static method to find webhooks for workspace
webhookSchema.statics.findForWorkspace = function(workspaceId, userId = null) {
  const query = { workspaceId, status: 'active' };
  
  // If userId provided, only show webhooks user has access to
  if (userId) {
    query.createdBy = userId;
  }
  
  return this.find(query)
    .populate('workspaceId', 'name slug')
    .populate('channelId', 'name type')
    .populate('createdBy', 'fullName email')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Webhook', webhookSchema);
