const Workspace = require('../../models/org/Workspace');
const Project = require('../../models/project-delivery/Project');
const Deliverable = require('../../models/project-delivery/Deliverable');

/**
 * Nucleus Workspace Isolation Middleware
 * Ensures hard data isolation: Workspace A cannot see Workspace B's data
 * 
 * This middleware enforces workspace-level access control for all Nucleus operations.
 * It checks if the user is a member of the workspace before allowing access to any resource.
 */

/**
 * Middleware to verify user has access to a workspace
 * Checks if user is a member (owner/admin/member/guest) of the workspace
 */
const verifyWorkspaceAccess = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
    const userId = req.user._id || req.user.id;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'Workspace ID is required'
      });
    }

    // Find workspace
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found'
      });
    }

    // Check if workspace is active
    if (workspace.status !== 'active' || workspace.archived) {
      return res.status(403).json({
        success: false,
        message: 'Workspace is not active'
      });
    }

    // Check if user is owner
    if (workspace.ownerId.toString() === userId.toString()) {
      req.workspace = workspace;
      req.workspaceRole = 'owner';
      return next();
    }

    // Check if user is a member
    const member = workspace.members.find(
      m => m.userId.toString() === userId.toString() && m.status === 'active'
    );

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not a member of this workspace'
      });
    }

    // Add workspace and role to request
    req.workspace = workspace;
    req.workspaceRole = member.role;

    next();
  } catch (error) {
    console.error('Workspace access verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying workspace access',
      error: error.message
    });
  }
};

/**
 * Middleware to verify user has specific role in workspace
 * @param {Array} allowedRoles - Array of allowed roles (e.g., ['owner', 'admin'])
 */
const requireWorkspaceRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.workspace || !req.workspaceRole) {
        return res.status(403).json({
          success: false,
          message: 'Workspace access not verified'
        });
      }

      if (!allowedRoles.includes(req.workspaceRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied: Requires one of these roles: ${allowedRoles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking workspace role',
        error: error.message
      });
    }
  };
};

/**
 * Middleware to verify resource belongs to workspace
 * Checks if a project/deliverable/task belongs to the workspace
 * @param {String} resourceType - Type of resource ('project', 'deliverable', 'task')
 * @param {String} resourceIdParam - Parameter name for resource ID (default: 'id')
 */
const verifyResourceInWorkspace = (resourceType, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const workspaceId = req.workspace?._id || req.params.workspaceId;

      if (!resourceId || !workspaceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID and Workspace ID are required'
        });
      }

      let resource;
      let resourceWorkspaceId;

      switch (resourceType) {
        case 'project':
          resource = await Project.findById(resourceId);
          if (resource) {
            resourceWorkspaceId = resource.workspaceId;
            // If workspaceId not directly on project, check through workspace
            if (!resourceWorkspaceId && workspaceId) {
              const workspace = await Workspace.findById(workspaceId);
              if (workspace) {
                // Verify project belongs to workspace through orgId match
                if (resource.orgId.toString() !== workspace.orgId.toString()) {
                  return res.status(403).json({
                    success: false,
                    message: 'Project does not belong to this workspace'
                  });
                }
                resourceWorkspaceId = workspaceId;
              }
            }
          }
          break;

        case 'deliverable':
          resource = await Deliverable.findById(resourceId);
          if (resource) {
            resourceWorkspaceId = resource.workspaceId;
            // If workspaceId not set, get from project
            if (!resourceWorkspaceId && resource.project_id) {
              const project = await Project.findById(resource.project_id);
              if (project) {
                resourceWorkspaceId = project.workspaceId;
              }
            }
          }
          break;

        default:
          return res.status(400).json({
            success: false,
            message: `Unsupported resource type: ${resourceType}`
          });
      }

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: `${resourceType} not found`
        });
      }

      // Verify resource belongs to workspace
      if (resourceWorkspaceId && resourceWorkspaceId.toString() !== workspaceId.toString()) {
        return res.status(403).json({
          success: false,
          message: `${resourceType} does not belong to this workspace`
        });
      }

      // Add resource to request
      req[resourceType] = resource;

      next();
    } catch (error) {
      console.error(`Error verifying ${resourceType} in workspace:`, error);
      return res.status(500).json({
        success: false,
        message: `Error verifying ${resourceType} access`,
        error: error.message
      });
    }
  };
};

/**
 * Helper function to filter query by workspace
 * Use this in route handlers to ensure workspace isolation
 * @param {Object} query - Mongoose query object
 * @param {String} workspaceId - Workspace ID
 * @param {String} resourceType - Type of resource ('project', 'deliverable', etc.)
 */
const addWorkspaceFilter = (query, workspaceId, resourceType = 'project') => {
  if (!workspaceId) {
    throw new Error('Workspace ID is required for workspace filtering');
  }

  switch (resourceType) {
    case 'project':
      query.workspaceId = workspaceId;
      break;
    case 'deliverable':
      // Deliverables are filtered through projects
      // This will need to be handled in a more complex query
      query.workspaceId = workspaceId;
      break;
    default:
      query.workspaceId = workspaceId;
  }

  return query;
};

/**
 * Middleware to automatically add workspace filter to queries
 * Adds workspaceId to req.query for automatic filtering
 */
const autoFilterByWorkspace = (req, res, next) => {
  if (req.workspace && req.workspace._id) {
    req.query.workspaceId = req.workspace._id.toString();
  }
  next();
};

module.exports = {
  verifyWorkspaceAccess,
  requireWorkspaceRole,
  verifyResourceInWorkspace,
  addWorkspaceFilter,
  autoFilterByWorkspace
};
