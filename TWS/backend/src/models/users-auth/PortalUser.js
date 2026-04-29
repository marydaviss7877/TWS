const mongoose = require('mongoose');

const portalUserSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member', 'client_viewer', 'client_editor', 'guest'],
    default: 'member'
  },
  permissions: {
    // Board permissions
    canCreateBoards: {
      type: Boolean,
      default: false
    },
    canEditBoards: {
      type: Boolean,
      default: false
    },
    canDeleteBoards: {
      type: Boolean,
      default: false
    },
    canArchiveBoards: {
      type: Boolean,
      default: false
    },
    
    // Card permissions
    canCreateCards: {
      type: Boolean,
      default: true
    },
    canEditCards: {
      type: Boolean,
      default: true
    },
    canDeleteCards: {
      type: Boolean,
      default: false
    },
    canMoveCards: {
      type: Boolean,
      default: true
    },
    canAssignCards: {
      type: Boolean,
      default: true
    },
    
    // List permissions
    canCreateLists: {
      type: Boolean,
      default: true
    },
    canEditLists: {
      type: Boolean,
      default: true
    },
    canDeleteLists: {
      type: Boolean,
      default: false
    },
    canReorderLists: {
      type: Boolean,
      default: true
    },
    
    // Member management
    canInviteMembers: {
      type: Boolean,
      default: false
    },
    canRemoveMembers: {
      type: Boolean,
      default: false
    },
    canChangeMemberRoles: {
      type: Boolean,
      default: false
    },
    
    // Workspace settings
    canEditWorkspaceSettings: {
      type: Boolean,
      default: false
    },
    canManageIntegrations: {
      type: Boolean,
      default: false
    },
    canViewAnalytics: {
      type: Boolean,
      default: false
    },
    canExportData: {
      type: Boolean,
      default: false
    },
    
    // Client-specific permissions
    canViewAllCards: {
      type: Boolean,
      default: true
    },
    canViewInternalCards: {
      type: Boolean,
      default: false
    },
    canApproveCards: {
      type: Boolean,
      default: false
    },
    canCommentOnCards: {
      type: Boolean,
      default: true
    },
    canAttachFiles: {
      type: Boolean,
      default: true
    }
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending'],
    default: 'pending'
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  invitedAt: {
    type: Date,
    default: Date.now
  },
  joinedAt: Date,
  lastActiveAt: Date,
  notificationSettings: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    cardUpdates: {
      type: Boolean,
      default: true
    },
    mentions: {
      type: Boolean,
      default: true
    },
    comments: {
      type: Boolean,
      default: true
    },
    dueDateReminders: {
      type: Boolean,
      default: true
    },
    weeklyDigest: {
      type: Boolean,
      default: true
    }
  },
  preferences: {
    defaultView: {
      type: String,
      enum: ['kanban', 'list', 'calendar', 'gantt'],
      default: 'kanban'
    },
    cardsPerPage: {
      type: Number,
      default: 50
    },
    showCompletedCards: {
      type: Boolean,
      default: true
    },
    autoRefresh: {
      type: Boolean,
      default: true
    },
    refreshInterval: {
      type: Number,
      default: 30 // seconds
    }
  },
  customFields: [{
    name: String,
    value: mongoose.Schema.Types.Mixed,
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'boolean', 'select']
    }
  }]
}, {
  timestamps: true
});

// Compound index for unique user-workspace combination
portalUserSchema.index({ userId: 1, workspaceId: 1 }, { unique: true });

// Indexes for performance
portalUserSchema.index({ workspaceId: 1, role: 1 });
portalUserSchema.index({ workspaceId: 1, status: 1 });
portalUserSchema.index({ userId: 1, status: 1 });

// Virtual for user details
portalUserSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Virtual for workspace details
portalUserSchema.virtual('workspace', {
  ref: 'Workspace',
  localField: 'workspaceId',
  foreignField: '_id',
  justOne: true
});

// Static methods
portalUserSchema.statics.getRolePermissions = function(role) {
  const rolePermissions = {
    owner: {
      canCreateBoards: true,
      canEditBoards: true,
      canDeleteBoards: true,
      canArchiveBoards: true,
      canCreateCards: true,
      canEditCards: true,
      canDeleteCards: true,
      canMoveCards: true,
      canAssignCards: true,
      canCreateLists: true,
      canEditLists: true,
      canDeleteLists: true,
      canReorderLists: true,
      canInviteMembers: true,
      canRemoveMembers: true,
      canChangeMemberRoles: true,
      canEditWorkspaceSettings: true,
      canManageIntegrations: true,
      canViewAnalytics: true,
      canExportData: true,
      canViewAllCards: true,
      canViewInternalCards: true,
      canApproveCards: true,
      canCommentOnCards: true,
      canAttachFiles: true
    },
    admin: {
      canCreateBoards: true,
      canEditBoards: true,
      canDeleteBoards: false,
      canArchiveBoards: true,
      canCreateCards: true,
      canEditCards: true,
      canDeleteCards: true,
      canMoveCards: true,
      canAssignCards: true,
      canCreateLists: true,
      canEditLists: true,
      canDeleteLists: true,
      canReorderLists: true,
      canInviteMembers: true,
      canRemoveMembers: true,
      canChangeMemberRoles: true,
      canEditWorkspaceSettings: true,
      canManageIntegrations: true,
      canViewAnalytics: true,
      canExportData: true,
      canViewAllCards: true,
      canViewInternalCards: true,
      canApproveCards: true,
      canCommentOnCards: true,
      canAttachFiles: true
    },
    member: {
      canCreateBoards: true,
      canEditBoards: true,
      canDeleteBoards: false,
      canArchiveBoards: false,
      canCreateCards: true,
      canEditCards: true,
      canDeleteCards: false,
      canMoveCards: true,
      canAssignCards: true,
      canCreateLists: true,
      canEditLists: true,
      canDeleteLists: false,
      canReorderLists: true,
      canInviteMembers: false,
      canRemoveMembers: false,
      canChangeMemberRoles: false,
      canEditWorkspaceSettings: false,
      canManageIntegrations: false,
      canViewAnalytics: false,
      canExportData: false,
      canViewAllCards: true,
      canViewInternalCards: false,
      canApproveCards: false,
      canCommentOnCards: true,
      canAttachFiles: true
    },
    client_editor: {
      canCreateBoards: false,
      canEditBoards: false,
      canDeleteBoards: false,
      canArchiveBoards: false,
      canCreateCards: true,
      canEditCards: true,
      canDeleteCards: false,
      canMoveCards: true,
      canAssignCards: false,
      canCreateLists: false,
      canEditLists: false,
      canDeleteLists: false,
      canReorderLists: false,
      canInviteMembers: false,
      canRemoveMembers: false,
      canChangeMemberRoles: false,
      canEditWorkspaceSettings: false,
      canManageIntegrations: false,
      canViewAnalytics: false,
      canExportData: false,
      canViewAllCards: true,
      canViewInternalCards: false,
      canApproveCards: true,
      canCommentOnCards: true,
      canAttachFiles: true
    },
    client_viewer: {
      canCreateBoards: false,
      canEditBoards: false,
      canDeleteBoards: false,
      canArchiveBoards: false,
      canCreateCards: false,
      canEditCards: false,
      canDeleteCards: false,
      canMoveCards: false,
      canAssignCards: false,
      canCreateLists: false,
      canEditLists: false,
      canDeleteLists: false,
      canReorderLists: false,
      canInviteMembers: false,
      canRemoveMembers: false,
      canChangeMemberRoles: false,
      canEditWorkspaceSettings: false,
      canManageIntegrations: false,
      canViewAnalytics: false,
      canExportData: false,
      canViewAllCards: true,
      canViewInternalCards: false,
      canApproveCards: false,
      canCommentOnCards: true,
      canAttachFiles: false
    },
    guest: {
      canCreateBoards: false,
      canEditBoards: false,
      canDeleteBoards: false,
      canArchiveBoards: false,
      canCreateCards: false,
      canEditCards: false,
      canDeleteCards: false,
      canMoveCards: false,
      canAssignCards: false,
      canCreateLists: false,
      canEditLists: false,
      canDeleteLists: false,
      canReorderLists: false,
      canInviteMembers: false,
      canRemoveMembers: false,
      canChangeMemberRoles: false,
      canEditWorkspaceSettings: false,
      canManageIntegrations: false,
      canViewAnalytics: false,
      canExportData: false,
      canViewAllCards: false,
      canViewInternalCards: false,
      canApproveCards: false,
      canCommentOnCards: false,
      canAttachFiles: false
    }
  };
  
  return rolePermissions[role] || rolePermissions.member;
};

// Instance methods
portalUserSchema.methods.hasPermission = function(permission) {
  return this.permissions[permission] === true;
};

portalUserSchema.methods.canAccessCard = function(card) {
  // Owner and admin can access all cards
  if (['owner', 'admin'].includes(this.role)) {
    return true;
  }
  
  // Client roles can only access client-visible cards
  if (['client_viewer', 'client_editor'].includes(this.role)) {
    return card.clientVisible === true;
  }
  
  // Members can access all cards except internal-only ones
  if (this.role === 'member') {
    return !card.internalOnly;
  }
  
  // Guests have very limited access
  if (this.role === 'guest') {
    return card.clientVisible === true && card.isPublic === true;
  }
  
  return false;
};

portalUserSchema.methods.updateLastActive = async function() {
  this.lastActiveAt = new Date();
  await this.save();
};

// Pre-save middleware
portalUserSchema.pre('save', function(next) {
  // Set permissions based on role if not explicitly set
  if (this.isNew || this.isModified('role')) {
    const rolePermissions = this.constructor.getRolePermissions(this.role);
    Object.assign(this.permissions, rolePermissions);
  }
  
  // Set joinedAt when status changes to active
  if (this.isModified('status') && this.status === 'active' && !this.joinedAt) {
    this.joinedAt = new Date();
  }
  
  next();
});

module.exports = mongoose.model('PortalUser', portalUserSchema);
