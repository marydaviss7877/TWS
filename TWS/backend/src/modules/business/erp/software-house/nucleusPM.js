const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../../../../middleware/auth/auth');
const { verifyWorkspaceAccess, requireWorkspaceRole, verifyResourceInWorkspace } = require('../../../../middleware/auth/workspaceIsolation');
const ErrorHandler = require('../../../../middleware/common/errorHandler');
const Project = require('../../../../models/Project');
const Deliverable = require('../../../../models/Deliverable');
const Task = require('../../../../models/Task');
const Approval = require('../../../../models/Approval');
const ChangeRequest = require('../../../../models/ChangeRequest');
const Workspace = require('../../../../models/Workspace');
const User = require('../../../../models/User');
const ProjectMember = require('../../../../models/ProjectMember');
const dateValidationService = require('../../../../services/nucleusDateValidationService');
const NotificationService = require('../../../../services/notifications/notification.service');
const { deliverableValidators, approvalValidators, changeRequestValidators, paramValidators, handleValidationErrors } = require('../../../../validators/nucleusValidators');
const { validateDeliverableStatusTransition, calculateDeliverableProgress } = require('../../../../utils/nucleusHelpers');

const router = express.Router();

/**
 * Nucleus PM Routes
 * 
 * Internal team routes for:
 * - Managing deliverables
 * - Approving deliverables (internal steps)
 * - Evaluating change requests
 * - Linking tasks to deliverables
 * - Managing deliverable status transitions
 */

/**
 * GET /api/nucleus-pm/workspaces/:workspaceId/projects/:projectId/deliverables
 * Get all deliverables for a project (internal view with tasks)
 */
router.get(
  '/workspaces/:workspaceId/projects/:projectId/deliverables',
  authenticateToken,
  verifyWorkspaceAccess,
  verifyResourceInWorkspace('project', 'projectId'),
  ErrorHandler.asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const workspaceId = req.workspace._id;

    const deliverables = await Deliverable.find({
      project_id: projectId,
      workspaceId: workspaceId
    })
      .populate('tasks', 'title status assignee estimatedHours actualHours')
      .populate('ownerId', 'fullName email')
      .sort({ target_date: 1 });

    // Add approval status for each deliverable
    const deliverablesWithDetails = await Promise.all(
      deliverables.map(async (deliverable) => {
        const approvals = await Approval.find({
          deliverable_id: deliverable._id,
          workspaceId: workspaceId
        })
          .sort({ step_number: 1 });

        // Calculate progress from tasks
        await calculateDeliverableProgress(deliverable._id);

        // Check if at risk
        const isAtRisk = deliverable.isAtRisk();

        return {
          ...deliverable.toObject(),
          approvals: approvals.map(a => ({
            step_number: a.step_number,
            approver_type: a.approver_type,
            approver_id: a.approver_id,
            status: a.status,
            signature_timestamp: a.signature_timestamp,
            rejection_reason: a.rejection_reason,
            notes: a.notes,
            can_proceed: a.can_proceed
          })),
          isAtRisk,
          tasks_count: deliverable.tasks.length,
          completed_tasks_count: deliverable.tasks.filter(t => t.status === 'completed').length
        };
      })
    );

    res.json({
      success: true,
      data: deliverablesWithDetails
    });
  })
);

/**
 * GET /api/nucleus-pm/workspaces/:workspaceId/deliverables/:deliverableId
 * Get a single deliverable with full approval chain
 */
router.get(
  '/workspaces/:workspaceId/deliverables/:deliverableId',
  authenticateToken,
  verifyWorkspaceAccess,
  paramValidators.workspaceId,
  paramValidators.deliverableId,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { deliverableId } = req.params;
    const workspaceId = req.workspace._id;

    const deliverable = await Deliverable.findOne({
      _id: deliverableId,
      workspaceId: workspaceId
    })
      .populate('tasks', 'title status assignee estimatedHours actualHours')
      .populate('ownerId', 'fullName email');

    if (!deliverable) {
      return res.status(404).json({
        success: false,
        message: 'Deliverable not found or access denied'
      });
    }

    const approvals = await Approval.find({
      deliverable_id: deliverableId,
      workspaceId: workspaceId
    }).sort({ step_number: 1 });

    await calculateDeliverableProgress(deliverable._id);
    const isAtRisk = deliverable.isAtRisk();

    res.json({
      success: true,
      data: {
        ...deliverable.toObject(),
        approvals: approvals.map(a => ({
          step_number: a.step_number,
          approver_type: a.approver_type,
          approver_id: a.approver_id,
          status: a.status,
          signature_timestamp: a.signature_timestamp,
          rejection_reason: a.rejection_reason,
          notes: a.notes,
          can_proceed: a.can_proceed
        })),
        isAtRisk,
        tasks_count: deliverable.tasks.length,
        completed_tasks_count: deliverable.tasks.filter(t => t.status === 'completed').length
      }
    });
  })
);

/**
 * POST /api/nucleus-pm/workspaces/:workspaceId/deliverables
 * Create a new deliverable
 */
router.post(
  '/workspaces/:workspaceId/deliverables',
  authenticateToken,
  verifyWorkspaceAccess,
  requireWorkspaceRole(['owner', 'admin']),
  paramValidators.workspaceId,
  deliverableValidators.create,
  handleValidationErrors,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const { project_id, name, description, start_date, target_date, acceptance_criteria, ownerId } = req.body;

    if (!project_id || !name || !start_date || !target_date) {
      return res.status(400).json({
        success: false,
        message: 'project_id, name, start_date, and target_date are required'
      });
    }

    // Verify project belongs to workspace
    const project = await Project.findOne({
      _id: project_id,
      workspaceId: workspaceId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found or does not belong to workspace'
      });
    }

    const deliverable = new Deliverable({
      project_id,
      workspaceId: workspaceId,
      orgId: req.workspace.orgId,
      tenantId: req.workspace.orgId.toString(),
      name,
      description,
      start_date: new Date(start_date),
      target_date: new Date(target_date),
      status: 'created',
      acceptance_criteria: acceptance_criteria || [],
      ownerId: ownerId || req.user._id
    });

    await deliverable.save();

    res.status(201).json({
      success: true,
      message: 'Deliverable created successfully',
      data: deliverable
    });
  })
);

/**
 * PATCH /api/nucleus-pm/workspaces/:workspaceId/deliverables/:deliverableId
 * Update deliverable
 */
router.patch(
  '/workspaces/:workspaceId/deliverables/:deliverableId',
  authenticateToken,
  verifyWorkspaceAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { deliverableId } = req.params;
    const workspaceId = req.workspace._id;
    const updates = req.body;

    const deliverable = await Deliverable.findOne({
      _id: deliverableId,
      workspaceId: workspaceId
    });

    if (!deliverable) {
      return res.status(404).json({
        success: false,
        message: 'Deliverable not found or access denied'
      });
    }

    // Update allowed fields
    if (updates.name) deliverable.name = updates.name;
    if (updates.description) deliverable.description = updates.description;
    if (updates.start_date) deliverable.start_date = new Date(updates.start_date);
    if (updates.target_date) deliverable.target_date = new Date(updates.target_date);
    if (updates.acceptance_criteria) deliverable.acceptance_criteria = updates.acceptance_criteria;
    if (updates.ownerId) deliverable.ownerId = updates.ownerId;

    await deliverable.save();

    res.json({
      success: true,
      message: 'Deliverable updated successfully',
      data: deliverable
    });
  })
);

/**
 * POST /api/nucleus-pm/workspaces/:workspaceId/deliverables/:deliverableId/status
 * Update deliverable status (with workflow validation)
 */
router.post(
  '/workspaces/:workspaceId/deliverables/:deliverableId/status',
  authenticateToken,
  verifyWorkspaceAccess,
  paramValidators.workspaceId,
  paramValidators.deliverableId,
  deliverableValidators.status,
  handleValidationErrors,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { deliverableId } = req.params;
    const { status } = req.body;
    const workspaceId = req.workspace._id;

    const deliverable = await Deliverable.findOne({
      _id: deliverableId,
      workspaceId: workspaceId
    });

    if (!deliverable) {
      return res.status(404).json({
        success: false,
        message: 'Deliverable not found or access denied'
      });
    }

    // Validate status transition
    const validation = await validateDeliverableStatusTransition(deliverableId, status);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }

    deliverable.status = status;
    await deliverable.save();

    // If ready for approval, notify via in-app
    if (status === 'ready_approval') {
      const project = await Project.findById(deliverable.project_id);
      
      // Send in-app notification to first approver
      try {
        const approvals = await Approval.find({
          deliverable_id: deliverable._id
        }).sort({ step_number: 1 });
        
        const firstApproval = approvals.find(a => a.step_number === 1 && a.status === 'pending');
        if (firstApproval) {
          let approverId = null;
          if (firstApproval.approver_type === 'client') {
            const clientUser = await User.findOne({ email: firstApproval.approver_id });
            if (clientUser) approverId = clientUser._id;
          } else {
            approverId = firstApproval.approver_id;
          }
          
          if (approverId) {
            await NotificationService.createNotification({
              userIds: [approverId],
              type: 'approval_requested',
              title: 'Approval Required',
              message: `Deliverable "${deliverable.name}" is ready for your approval`,
              relatedEntityType: 'approval',
              relatedEntityId: firstApproval._id,
              createdBy: req.user._id
            });
          }
        }
      } catch (error) {
        console.error('In-app notification failed:', error);
      }
    }

    res.json({
      success: true,
      message: `Deliverable status updated to ${status}`,
      data: deliverable
    });
  })
);

/**
 * POST /api/nucleus-pm/workspaces/:workspaceId/deliverables/:deliverableId/ship
 * Ship a deliverable (mark as shipped)
 */
router.post(
  '/workspaces/:workspaceId/deliverables/:deliverableId/ship',
  authenticateToken,
  verifyWorkspaceAccess,
  paramValidators.workspaceId,
  paramValidators.deliverableId,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { deliverableId } = req.params;
    const workspaceId = req.workspace._id;

    const deliverable = await Deliverable.findOne({
      _id: deliverableId,
      workspaceId: workspaceId
    });

    if (!deliverable) {
      return res.status(404).json({
        success: false,
        message: 'Deliverable not found or access denied'
      });
    }

    // Validate deliverable is approved before shipping
    if (deliverable.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Deliverable must be approved before shipping',
        current_status: deliverable.status
      });
    }

    deliverable.status = 'shipped';
    if (!deliverable.shipped_at) {
      deliverable.shipped_at = new Date();
    }
    await deliverable.save();

    // Send notification (in-app)
    const project = await Project.findById(deliverable.project_id);
    
    // Send in-app notification to PM and team
    try {
      const projectMembers = await ProjectMember.find({ projectId: deliverable.project_id, status: 'active' });
      const userIds = projectMembers.map(m => m.userId);
      
      if (userIds.length > 0) {
        await NotificationService.createNotification({
          userIds: userIds,
          type: 'project_update',
          title: 'Deliverable Shipped',
          message: `Deliverable "${deliverable.name}" has been shipped`,
          relatedEntityType: 'deliverable',
          relatedEntityId: deliverable._id,
          createdBy: req.user._id
        });
      }
    } catch (error) {
      console.error('In-app notification failed:', error);
    }

    res.json({
      success: true,
      message: 'Deliverable shipped successfully',
      data: deliverable
    });
  })
);

/**
 * POST /api/nucleus-pm/workspaces/:workspaceId/deliverables/:deliverableId/approvals/create-chain
 * Create approval chain for deliverable
 */
router.post(
  '/workspaces/:workspaceId/deliverables/:deliverableId/approvals/create-chain',
  authenticateToken,
  verifyWorkspaceAccess,
  requireWorkspaceRole(['owner', 'admin']),
  paramValidators.workspaceId,
  paramValidators.deliverableId,
  approvalValidators.createChain,
  handleValidationErrors,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { deliverableId } = req.params;
    const { devLeadId, qaLeadId, securityId, clientEmail } = req.body;
    const workspaceId = req.workspace._id;

    const deliverable = await Deliverable.findOne({
      _id: deliverableId,
      workspaceId: workspaceId
    });

    if (!deliverable) {
      return res.status(404).json({
        success: false,
        message: 'Deliverable not found or access denied'
      });
    }

    // Check if approval chain already exists
    const existingApprovals = await Approval.find({
      deliverable_id: deliverableId,
      workspaceId: workspaceId
    });

    if (existingApprovals.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Approval chain already exists for this deliverable'
      });
    }

    // Create approval chain
    const approvals = await Approval.createApprovalChain(
      deliverableId,
      req.workspace.orgId,
      req.workspace.orgId.toString(),
      workspaceId,
      {
        devLeadId,
        qaLeadId,
        securityId,
        clientEmail
      }
    );

    // Notify first approver (Step 1 - Dev Lead) - in-app notification
    try {
      const firstApproval = approvals.find(a => a.step_number === 1);
      if (firstApproval && devLeadId) {
        await NotificationService.createNotification({
          userIds: [devLeadId],
          type: 'approval_requested',
          title: 'Approval Required',
          message: `Deliverable "${deliverable.name}" requires your approval (Step 1: Dev Lead)`,
          relatedEntityType: 'approval',
          relatedEntityId: firstApproval._id,
          createdBy: req.user._id
        });
      }
    } catch (error) {
      console.error('In-app notification failed:', error);
    }

    res.status(201).json({
      success: true,
      message: 'Approval chain created successfully',
      data: {
        deliverable: {
          _id: deliverable._id,
          name: deliverable.name
        },
        approvals: approvals.map(a => ({
          step_number: a.step_number,
          approver_type: a.approver_type,
          approver_id: a.approver_id,
          status: a.status
        }))
      }
    });
  })
);

/**
 * POST /api/nucleus-pm/workspaces/:workspaceId/approvals/:approvalId/approve
 * Approve an approval step (internal steps: dev_lead, qa_lead, security)
 */
router.post(
  '/workspaces/:workspaceId/approvals/:approvalId/approve',
  authenticateToken,
  verifyWorkspaceAccess,
  paramValidators.workspaceId,
  paramValidators.approvalId,
  approvalValidators.approve,
  handleValidationErrors,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { approvalId } = req.params;
    const { notes } = req.body;
    const workspaceId = req.workspace._id;
    const userId = req.user._id || req.user.id;

    const approval = await Approval.findOne({
      _id: approvalId,
      workspaceId: workspaceId
    });

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: 'Approval not found or access denied'
      });
    }

    // Verify user is authorized to approve this step
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace.canApprove(userId, approval.approver_type)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to approve this step'
      });
    }

    // Verify approver matches
    if (approval.approver_id !== userId.toString() && approval.approver_id !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'You are not the designated approver for this step'
      });
    }

    // Check if previous step is approved (unless this is step 1)
    if (approval.step_number > 1) {
      const previousApproved = await Approval.isPreviousStepApproved(
        approval.deliverable_id,
        approval.step_number
      );

      if (!previousApproved) {
        return res.status(400).json({
          success: false,
          message: 'Previous approval step must be completed first'
        });
      }
    }

    // Approve
    await approval.approve(notes);

    // Update deliverable status if all internal steps approved
    const allInternalApproved = await Approval.areAllInternalStepsApproved(approval.deliverable_id);
    if (allInternalApproved) {
      const deliverable = await Deliverable.findById(approval.deliverable_id);
      if (deliverable.status === 'ready_approval') {
        // Notify client (in-app)
        const project = await Project.findById(deliverable.project_id);
        
        // Notify client via in-app notification
        try {
          const clientApproval = await Approval.findOne({
            deliverable_id: approval.deliverable_id,
            approver_type: 'client',
            step_number: 4
          });
          
          if (clientApproval) {
            const clientUser = await User.findOne({ email: clientApproval.approver_id });
            if (clientUser) {
              await NotificationService.createNotification({
                userIds: [clientUser._id],
                type: 'approval_requested',
                title: 'Approval Required',
                message: `Deliverable "${deliverable.name}" is ready for your approval`,
                relatedEntityType: 'approval',
                relatedEntityId: clientApproval._id,
                createdBy: req.user._id
              });
            }
          }
        } catch (error) {
          console.error('In-app notification failed:', error);
        }
      }
    }
    
    // Check if all steps approved and notify PM
    const allApprovals = await Approval.find({ deliverable_id: approval.deliverable_id });
    const allApproved = allApprovals.every(a => a.status === 'approved');
    
    if (allApproved) {
      const deliverable = await Deliverable.findById(approval.deliverable_id);
      const project = await Project.findById(deliverable.project_id);
      
      // Notify PM via in-app notification (Project has no ownerId; use ProjectMember owner)
      try {
        if (project) {
          const ownerMember = await ProjectMember.findOne({
            projectId: project._id,
            role: 'owner',
            status: 'active'
          });
          if (ownerMember) {
            await NotificationService.createNotification({
              userIds: [ownerMember.userId],
              type: 'approval_approved',
              title: 'Deliverable Approved',
              message: `All approvals received for deliverable "${deliverable.name}"`,
              relatedEntityType: 'deliverable',
              relatedEntityId: deliverable._id,
              createdBy: req.user._id
            });
          }
        }
      } catch (error) {
        console.error('In-app notification failed:', error);
      }
    } else {
      // Notify next approver
      try {
        const nextApproval = allApprovals.find(a => 
          a.step_number === approval.step_number + 1 && a.status === 'pending' && a.can_proceed
        );
        
        if (nextApproval) {
          let approverId = null;
          if (nextApproval.approver_type === 'client') {
            const clientUser = await User.findOne({ email: nextApproval.approver_id });
            if (clientUser) approverId = clientUser._id;
          } else {
            approverId = nextApproval.approver_id;
          }
          
          if (approverId) {
            const deliverable = await Deliverable.findById(approval.deliverable_id);
            await NotificationService.createNotification({
              userIds: [approverId],
              type: 'approval_requested',
              title: 'Approval Required',
              message: `Deliverable "${deliverable.name}" requires your approval (Step ${nextApproval.step_number})`,
              relatedEntityType: 'approval',
              relatedEntityId: nextApproval._id,
              createdBy: req.user._id
            });
          }
        }
      } catch (error) {
        console.error('In-app notification failed:', error);
      }
    }

    res.json({
      success: true,
      message: 'Approval step approved successfully',
      data: {
        approval: {
          step_number: approval.step_number,
          approver_type: approval.approver_type,
          status: approval.status,
          signature_timestamp: approval.signature_timestamp
        }
      }
    });
  })
);

/**
 * POST /api/nucleus-pm/workspaces/:workspaceId/approvals/:approvalId/reject
 * Reject an approval step
 */
router.post(
  '/workspaces/:workspaceId/approvals/:approvalId/reject',
  authenticateToken,
  verifyWorkspaceAccess,
  paramValidators.workspaceId,
  paramValidators.approvalId,
  approvalValidators.reject,
  handleValidationErrors,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { approvalId } = req.params;
    const { reason } = req.body;
    const workspaceId = req.workspace._id;
    const userId = req.user._id || req.user.id;

    const approval = await Approval.findOne({
      _id: approvalId,
      workspaceId: workspaceId
    });

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: 'Approval not found or access denied'
      });
    }

    // Verify user is authorized
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace.canApprove(userId, approval.approver_type)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to reject this step'
      });
    }

    // Reject
    await approval.reject(reason);

    // Update deliverable status
    const deliverable = await Deliverable.findById(approval.deliverable_id);
    deliverable.status = 'in_rework';
    await deliverable.save();

    // Send in-app notification to PM (Project has no ownerId; use ProjectMember owner)
    try {
      const project = await Project.findById(deliverable.project_id);
      if (project) {
        const ownerMember = await ProjectMember.findOne({
          projectId: project._id,
          role: 'owner',
          status: 'active'
        });
        if (ownerMember) {
          await NotificationService.createNotification({
            userIds: [ownerMember.userId],
            type: 'approval_rejected',
            title: 'Approval Rejected',
            message: `Step ${approval.step_number} approval rejected for deliverable "${deliverable.name}". Reason: ${reason}`,
            relatedEntityType: 'approval',
            relatedEntityId: approval._id,
            createdBy: req.user._id
          });
        }
      }
    } catch (error) {
      console.error('In-app notification failed:', error);
    }

    res.json({
      success: true,
      message: 'Approval step rejected',
      data: {
        approval: {
          step_number: approval.step_number,
          approver_type: approval.approver_type,
          status: approval.status,
          rejection_reason: approval.rejection_reason
        }
      }
    });
  })
);

/**
 * POST /api/nucleus-pm/workspaces/:workspaceId/deliverables/:deliverableId/tasks/:taskId/link
 * Link a task to a deliverable
 */
router.post(
  '/workspaces/:workspaceId/deliverables/:deliverableId/tasks/:taskId/link',
  authenticateToken,
  verifyWorkspaceAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { deliverableId, taskId } = req.params;
    const workspaceId = req.workspace._id;

    const deliverable = await Deliverable.findOne({
      _id: deliverableId,
      workspaceId: workspaceId
    });

    if (!deliverable) {
      return res.status(404).json({
        success: false,
        message: 'Deliverable not found or access denied'
      });
    }

    const task = await Task.findOne({
      _id: taskId,
      projectId: deliverable.project_id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or does not belong to project'
      });
    }

    // CRITICAL FIX: Validate task and deliverable belong to same project
    if (task.projectId.toString() !== deliverable.project_id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Task and deliverable must belong to the same project'
      });
    }

    // Link task to deliverable
    if (!deliverable.tasks.includes(taskId)) {
      deliverable.tasks.push(taskId);
      await deliverable.save();
    }

    // Update task milestone
    task.milestoneId = deliverableId;
    await task.save();

    // Recalculate progress
    await calculateDeliverableProgress(deliverable._id);

    res.json({
      success: true,
      message: 'Task linked to deliverable successfully',
      data: {
        deliverable: {
          _id: deliverable._id,
          name: deliverable.name,
          progress_percentage: deliverable.progress_percentage
        },
        task: {
          _id: task._id,
          title: task.title,
          milestoneId: task.milestoneId
        }
      }
    });
  })
);

/**
 * POST /api/nucleus-pm/workspaces/:workspaceId/change-requests/:changeRequestId/evaluate
 * PM evaluates a change request
 */
router.post(
  '/workspaces/:workspaceId/change-requests/:changeRequestId/evaluate',
  authenticateToken,
  verifyWorkspaceAccess,
  requireWorkspaceRole(['owner', 'admin']),
  ErrorHandler.asyncHandler(async (req, res) => {
    const { changeRequestId } = req.params;
    const { pm_notes, effort_days, cost_impact, date_impact_days, pm_recommendation } = req.body;
    const workspaceId = req.workspace._id;
    const userId = req.user._id || req.user.id;

    if (!pm_recommendation || !['accept', 'reject', 'negotiate'].includes(pm_recommendation)) {
      return res.status(400).json({
        success: false,
        message: 'Valid PM recommendation is required (accept/reject/negotiate)'
      });
    }

    const changeRequest = await ChangeRequest.findOne({
      _id: changeRequestId,
      workspaceId: workspaceId
    });

    if (!changeRequest) {
      return res.status(404).json({
        success: false,
        message: 'Change request not found or access denied'
      });
    }

    if (changeRequest.status !== 'submitted' && changeRequest.status !== 'acknowledged') {
      return res.status(400).json({
        success: false,
        message: 'Change request must be in submitted or acknowledged status'
      });
    }

    // Evaluate
    await changeRequest.evaluate(userId, {
      pm_notes,
      effort_days,
      cost_impact,
      date_impact_days,
      pm_recommendation
    });

    // Send in-app notification to client
    try {
      const deliverableForNotif = await Deliverable.findById(changeRequest.deliverable_id);
      const clientUser = await User.findOne({ email: changeRequest.submitted_by });
      if (clientUser) {
        await NotificationService.createNotification({
          userIds: [clientUser._id],
          type: 'project_update',
          title: 'Change Request Evaluated',
          message: `PM has evaluated your change request for deliverable "${deliverableForNotif?.name || 'Deliverable'}"`,
          relatedEntityType: 'change_request',
          relatedEntityId: changeRequest._id,
          createdBy: req.user._id
        });
      }
    } catch (error) {
      console.error('In-app notification failed:', error);
    }

    res.json({
      success: true,
      message: 'Change request evaluated successfully',
      data: {
        change_request: {
          _id: changeRequest._id,
          status: changeRequest.status,
          pm_recommendation: changeRequest.pm_recommendation,
          effort_days: changeRequest.effort_days,
          cost_impact: changeRequest.cost_impact,
          date_impact_days: changeRequest.date_impact_days
        }
      }
    });
  })
);

/**
 * POST /api/nucleus-pm/workspaces/:workspaceId/change-requests/:changeRequestId/decide
 * Client decides on an evaluated change request (accept/reject)
 */
router.post(
  '/workspaces/:workspaceId/change-requests/:changeRequestId/decide',
  authenticateToken,
  verifyWorkspaceAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { changeRequestId } = req.params;
    const { decision } = req.body;
    const workspaceId = req.workspace._id;

    if (!decision || !['accept', 'reject'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Valid decision is required (accept or reject)'
      });
    }

    const changeRequest = await ChangeRequest.findOne({
      _id: changeRequestId,
      workspaceId: workspaceId
    });

    if (!changeRequest) {
      return res.status(404).json({
        success: false,
        message: 'Change request not found or access denied'
      });
    }

    if (changeRequest.status !== 'evaluated') {
      return res.status(400).json({
        success: false,
        message: 'Change request must be in evaluated status to decide'
      });
    }

    changeRequest.client_decision = decision;
    changeRequest.decided_at = new Date();
    changeRequest.status = decision === 'accept' ? 'accepted' : 'rejected';
    await changeRequest.save();

    // Notify PM
    try {
      const deliverableForNotif = await Deliverable.findById(changeRequest.deliverable_id);
      const project = deliverableForNotif ? await Project.findById(deliverableForNotif.project_id) : null;
      if (project) {
        const ownerMember = await ProjectMember.findOne({
          projectId: project._id,
          role: 'owner',
          status: 'active'
        });
        if (ownerMember) {
          await NotificationService.createNotification({
            userIds: [ownerMember.userId],
            type: 'project_update',
            title: `Change Request ${decision === 'accept' ? 'Accepted' : 'Rejected'}`,
            message: `Client has ${decision}ed the change request for deliverable "${deliverableForNotif?.name || 'Deliverable'}"`,
            relatedEntityType: 'change_request',
            relatedEntityId: changeRequest._id,
            createdBy: req.user._id
          });
        }
      }
    } catch (error) {
      console.error('In-app notification failed:', error);
    }

    res.json({
      success: true,
      message: `Change request ${decision}ed successfully`,
      data: {
        change_request: {
          _id: changeRequest._id,
          status: changeRequest.status,
          client_decision: changeRequest.client_decision,
          decided_at: changeRequest.decided_at
        }
      }
    });
  })
);

/**
 * GET /api/nucleus-pm/workspaces/:workspaceId/change-requests
 * Get all change requests for workspace (PM view)
 */
router.get(
  '/workspaces/:workspaceId/change-requests',
  authenticateToken,
  verifyWorkspaceAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const { status, deliverable_id } = req.query;

    const query = { workspaceId: workspaceId };
    if (status) query.status = status;
    if (deliverable_id) query.deliverable_id = deliverable_id;

    const changeRequests = await ChangeRequest.find(query)
      .populate('deliverable_id', 'name project_id')
      .sort({ submitted_at: -1 });

    res.json({
      success: true,
      data: changeRequests
    });
  })
);

/**
 * POST /api/nucleus-pm/workspaces/:workspaceId/deliverables/:deliverableId/validate-date
 * Validate deliverable target date (PM action)
 */
router.post(
  '/workspaces/:workspaceId/deliverables/:deliverableId/validate-date',
  authenticateToken,
  verifyWorkspaceAccess,
  paramValidators.workspaceId,
  paramValidators.deliverableId,
  body('confidence').isInt({ min: 0, max: 100 }).withMessage('Confidence must be between 0 and 100'),
  body('notes').optional().trim().isLength({ max: 500 }),
  handleValidationErrors,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { deliverableId } = req.params;
    const { confidence, notes } = req.body;
    const workspaceId = req.workspace._id;
    const userId = req.user._id || req.user.id;

    const deliverable = await Deliverable.findOne({
      _id: deliverableId,
      workspaceId: workspaceId
    });

    if (!deliverable) {
      return res.status(404).json({
        success: false,
        message: 'Deliverable not found or access denied'
      });
    }

    const result = await dateValidationService.validateDeliverableDate(
      deliverableId,
      userId,
      confidence,
      notes
    );

    res.json({
      success: true,
      message: 'Date validated successfully',
      data: result
    });
  })
);

/**
 * GET /api/nucleus-pm/workspaces/:workspaceId/deliverables/needing-validation
 * Get deliverables needing date validation (14+ days since last validation)
 */
router.get(
  '/workspaces/:workspaceId/deliverables/needing-validation',
  authenticateToken,
  verifyWorkspaceAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const { daysThreshold } = req.query;

    const deliverables = await dateValidationService.findDeliverablesNeedingValidation(
      workspaceId,
      parseInt(daysThreshold) || 14
    );

    res.json({
      success: true,
      data: {
        count: deliverables.length,
        deliverables
      }
    });
  })
);

/**
 * GET /api/nucleus-pm/workspaces/:workspaceId/deliverables/:deliverableId/validation-history
 * Get validation history for a deliverable
 */
router.get(
  '/workspaces/:workspaceId/deliverables/:deliverableId/validation-history',
  authenticateToken,
  verifyWorkspaceAccess,
  paramValidators.workspaceId,
  paramValidators.deliverableId,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { deliverableId } = req.params;
    const workspaceId = req.workspace._id;

    const deliverable = await Deliverable.findOne({
      _id: deliverableId,
      workspaceId: workspaceId
    });

    if (!deliverable) {
      return res.status(404).json({
        success: false,
        message: 'Deliverable not found or access denied'
      });
    }

    const history = await dateValidationService.getValidationHistory(deliverableId);
    const confidence = await dateValidationService.calculateDateConfidence(deliverableId);

    res.json({
      success: true,
      data: {
        ...history,
        calculated_confidence: confidence
      }
    });
  })
);

module.exports = router;
