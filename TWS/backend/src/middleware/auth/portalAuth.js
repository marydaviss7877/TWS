const PortalUser = require('../../models/PortalUser');
const Workspace = require('../../models/Workspace');

/**
 * Middleware to check if user has access to a specific workspace
 */
const checkWorkspaceAccess = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user._id;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'Workspace ID is required'
      });
    }

    // Check if workspace exists
    const workspace = await Workspace.findOne({
      _id: workspaceId,
      orgId: req.user.orgId,
      archived: false
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found'
      });
    }

    // Check if user has access to this workspace
    const portalUser = await PortalUser.findOne({
      userId,
      workspaceId,
      status: 'active'
    });

    // Super admins and org managers have access to all workspaces
    if (!portalUser && !['super_admin', 'org_manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this workspace'
      });
    }

    // Add workspace and portal user info to request
    req.workspace = workspace;
    req.portalUser = portalUser;

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking workspace access',
      error: error.message
    });
  }
};

/**
 * Middleware to check if user has specific permission in workspace
 */
const checkWorkspacePermission = (permission) => {
  return (req, res, next) => {
    try {
      // Super admins and org managers have all permissions
      if (['super_admin', 'org_manager'].includes(req.user.role)) {
        return next();
      }

      // Check if user has the specific permission
      if (!req.portalUser || !req.portalUser.hasPermission(permission)) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions: ${permission} required`
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error checking workspace permission',
        error: error.message
      });
    }
  };
};

/**
 * Middleware to check if user can access a specific card
 */
const checkCardAccess = async (req, res, next) => {
  try {
    const { cardId } = req.params;
    const Card = require('../../models/Card');

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Check if user can access this card
    if (req.portalUser && !req.portalUser.canAccessCard(card)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this card'
      });
    }

    req.card = card;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking card access',
      error: error.message
    });
  }
};

/**
 * Middleware to check workspace subscription limits
 */
const checkWorkspaceLimits = (resource) => {
  return async (req, res, next) => {
    try {
      const workspace = req.workspace;
      
      if (!workspace) {
        return res.status(400).json({
          success: false,
          message: 'Workspace not found in request'
        });
      }

      // Check if workspace can add more of the resource
      const canAdd = workspace[`canAdd${resource.charAt(0).toUpperCase() + resource.slice(1)}`]();
      
      if (!canAdd) {
        return res.status(400).json({
          success: false,
          message: `Workspace limit reached for ${resource}`,
          limit: workspace.subscription.limits[`max${resource.charAt(0).toUpperCase() + resource.slice(1)}`]
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error checking workspace limits',
        error: error.message
      });
    }
  };
};

/**
 * Middleware to validate workspace subscription status
 */
const validateSubscription = async (req, res, next) => {
  try {
    const workspace = req.workspace;
    
    if (!workspace) {
      return res.status(400).json({
        success: false,
        message: 'Workspace not found in request'
      });
    }

    // Check if subscription is active
    if (!['active', 'trialing'].includes(workspace.subscription.status)) {
      return res.status(403).json({
        success: false,
        message: 'Workspace subscription is not active',
        subscriptionStatus: workspace.subscription.status
      });
    }

    // Check if trial has expired
    if (workspace.subscription.status === 'trialing' && workspace.isTrialExpired()) {
      return res.status(403).json({
        success: false,
        message: 'Workspace trial has expired',
        subscriptionStatus: 'expired'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error validating subscription',
      error: error.message
    });
  }
};

/**
 * Middleware to log Portal activity
 */
const logPortalActivity = (action) => {
  return async (req, res, next) => {
    try {
      // Store activity info for logging after response
      req.activityLog = {
        action,
        entityType: req.route?.path?.includes('workspaces') ? 'workspace' : 
                   req.route?.path?.includes('boards') ? 'board' :
                   req.route?.path?.includes('cards') ? 'card' : 'unknown',
        entityId: req.params.workspaceId || req.params.boardId || req.params.cardId,
        workspaceId: req.params.workspaceId || req.workspace?._id,
        projectId: req.card?.projectId || req.workspace?.integrations?.erpProjectId
      };

      next();
    } catch (error) {
      console.error('Error setting up activity logging:', error);
      next();
    }
  };
};

/**
 * Middleware to handle Portal-specific error responses
 */
const portalErrorHandler = (err, req, res, next) => {
  console.error('Portal Error:', err);

  // Handle specific Portal errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry',
      field: Object.keys(err.keyPattern)[0]
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

module.exports = {
  checkWorkspaceAccess,
  checkWorkspacePermission,
  checkCardAccess,
  checkWorkspaceLimits,
  validateSubscription,
  logPortalActivity,
  portalErrorHandler
};
