/**
 * Project Management Permissions Middleware
 * 
 * Enforces role-based access control for project management operations.
 * Supports scoped permissions (assigned, designated, client_step).
 */

const PROJECT_MANAGEMENT_PERMISSIONS = require('../../config/projectManagementPermissions');
const ProjectAccess = require('../../models/project-delivery/ProjectAccess');
const Approval = require('../../models/core/Approval');
const ChangeRequest = require('../../models/project-delivery/ChangeRequest');
const Deliverable = require('../../models/project-delivery/Deliverable');
const Project = require('../../models/project-delivery/Project');

/**
 * Check if user has permission for project management action
 * @param {String} permission - Permission code (e.g., 'projects:create')
 * @param {Object} options - Additional context resolver functions
 *   - projectId: Function(req) => projectId or string
 *   - deliverableId: Function(req) => deliverableId or string
 *   - approvalId: Function(req) => approvalId or string
 *   - changeRequestId: Function(req) => changeRequestId or string
 */
const requireProjectManagementPermission = (permission, options = {}) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = user.role;
      const rolePermissions = PROJECT_MANAGEMENT_PERMISSIONS[userRole] || {};

      // Super admin bypass
      if (rolePermissions['*']) {
        return next();
      }

      // Check if permission exists for role
      const permissionValue = rolePermissions[permission];
      if (!permissionValue) {
        return res.status(403).json({
          success: false,
          message: `Permission denied: ${permission}`,
          code: 'PERMISSION_DENIED'
        });
      }

      // Handle scoped permissions
      if (permissionValue === true) {
        // Full permission, no additional checks needed
        return next();
      }

      // Resolve context values
      const getContextValue = (resolver) => {
        if (typeof resolver === 'function') {
          return resolver(req);
        }
        return resolver;
      };

      // Handle 'assigned' permission - user must be assigned to the project
      if (permissionValue === 'assigned') {
        let projectId = null;

        // Try to get projectId from various sources
        if (options.projectId) {
          projectId = getContextValue(options.projectId);
        } else if (options.deliverableId) {
          const deliverableId = getContextValue(options.deliverableId);
          const deliverable = await Deliverable.findById(deliverableId).select('project_id');
          if (deliverable) {
            projectId = deliverable.project_id;
          }
        } else if (req.params.projectId) {
          projectId = req.params.projectId;
        } else if (req.body.project_id || req.body.projectId) {
          projectId = req.body.project_id || req.body.projectId;
        }

        if (projectId) {
          const hasAccess = await ProjectAccess.findOne({
            projectId: projectId,
            userId: user._id,
            status: 'active'
          });

          if (!hasAccess) {
            // For client role, also check if project has client access enabled
            if (userRole === 'client') {
              const project = await Project.findById(projectId);
              if (!project || !project.settings?.portalSettings?.allowClientAccess) {
                return res.status(403).json({
                  success: false,
                  message: 'Access denied: Not assigned to project or client access not enabled',
                  code: 'ACCESS_DENIED'
                });
              }
              // Client can access if project allows client access
              return next();
            }

            return res.status(403).json({
              success: false,
              message: 'Access denied: Not assigned to project',
              code: 'ACCESS_DENIED'
            });
          }
        }
      }

      // Handle 'designated' permission - user must be designated approver
      if (permissionValue === 'designated') {
        const approvalId = options.approvalId ? getContextValue(options.approvalId) : req.params.approvalId;
        
        if (approvalId) {
          const approval = await Approval.findById(approvalId);
          if (!approval) {
            return res.status(404).json({
              success: false,
              message: 'Approval not found',
              code: 'NOT_FOUND'
            });
          }

          // Check if user is the designated approver
          // For internal approvers, check by userId
          // For client approvers, check by email
          if (approval.approver_type === 'client') {
            if (approval.approver_id !== user.email) {
              return res.status(403).json({
                success: false,
                message: 'Access denied: Not designated approver',
                code: 'ACCESS_DENIED'
              });
            }
          } else {
            if (approval.approver_id !== user._id.toString() && approval.approver_id !== user._id) {
              return res.status(403).json({
                success: false,
                message: 'Access denied: Not designated approver',
                code: 'ACCESS_DENIED'
              });
            }
          }

          // Also check if step can proceed
          if (!approval.can_proceed) {
            return res.status(400).json({
              success: false,
              message: 'Previous approval step must be completed first',
              code: 'SEQUENCE_ERROR'
            });
          }
        }
      }

      // Handle 'client_step' permission - user must be client and this must be client approval step
      if (permissionValue === 'client_step') {
        const approvalId = options.approvalId ? getContextValue(options.approvalId) : req.params.approvalId;
        
        if (approvalId) {
          const approval = await Approval.findById(approvalId);
          if (!approval) {
            return res.status(404).json({
              success: false,
              message: 'Approval not found',
              code: 'NOT_FOUND'
            });
          }

          if (approval.approver_type !== 'client' || approval.approver_id !== user.email) {
            return res.status(403).json({
              success: false,
              message: 'Access denied: Not client approver',
              code: 'ACCESS_DENIED'
            });
          }

          if (!approval.can_proceed) {
            return res.status(400).json({
              success: false,
              message: 'Internal approvals must be completed first',
              code: 'SEQUENCE_ERROR'
            });
          }
        }
      }

      // Handle change request decide permission - user must be submitter
      if (permission === 'change_requests:decide' && permissionValue === 'assigned') {
        const changeRequestId = options.changeRequestId 
          ? getContextValue(options.changeRequestId) 
          : req.params.changeRequestId || req.params.id;

        if (changeRequestId) {
          const changeRequest = await ChangeRequest.findById(changeRequestId);
          if (!changeRequest) {
            return res.status(404).json({
              success: false,
              message: 'Change request not found',
              code: 'NOT_FOUND'
            });
          }

          // Only submitter can decide
          if (changeRequest.submitted_by !== user.email) {
            return res.status(403).json({
              success: false,
              message: 'Access denied: Only change request submitter can decide',
              code: 'ACCESS_DENIED'
            });
          }

          // Must be evaluated first
          if (changeRequest.status !== 'evaluated') {
            return res.status(400).json({
              success: false,
              message: 'Change request must be evaluated before decision',
              code: 'INVALID_STATUS'
            });
          }
        }
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

module.exports = { requireProjectManagementPermission };

