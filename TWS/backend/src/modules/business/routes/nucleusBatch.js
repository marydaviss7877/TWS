const express = require('express');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { verifyWorkspaceAccess, requireWorkspaceRole } = require('../../../middleware/auth/workspaceIsolation');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const Deliverable = require('../../../models/project-delivery/Deliverable');
const Task = require('../../../models/project-delivery/Task');
const Approval = require('../../../models/core/Approval');
const autoCalculationService = require('../../../services/nucleusAutoCalculationService');
const { paramValidators, handleValidationErrors } = require('../../../validators/nucleusValidators');

const router = express.Router();
router.use(verifyERPToken);

/**
 * Nucleus Batch Operations Routes
 * 
 * Provides batch operations for common tasks:
 * - Batch update deliverable progress
 * - Batch link tasks to deliverables
 * - Batch create approval chains
 * - Batch status updates
 */

/**
 * POST /api/nucleus-batch/workspaces/:workspaceId/deliverables/batch-update-progress
 * Batch update progress for all deliverables in workspace
 */
router.post(
  '/workspaces/:workspaceId/deliverables/batch-update-progress',
  verifyWorkspaceAccess,
  requireWorkspaceRole(['owner', 'admin']),
  paramValidators.workspaceId,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;

    const updatedCount = await autoCalculationService.batchUpdateWorkspaceProgress(workspaceId);

    res.json({
      success: true,
      message: `Progress updated for ${updatedCount} deliverables`,
      data: {
        updated_count: updatedCount
      }
    });
  })
);

/**
 * POST /api/nucleus-batch/workspaces/:workspaceId/projects/:projectId/deliverables/batch-update-progress
 * Batch update progress for all deliverables in a project
 */
router.post(
  '/workspaces/:workspaceId/projects/:projectId/deliverables/batch-update-progress',
  verifyWorkspaceAccess,
  paramValidators.workspaceId,
  paramValidators.projectId,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const updatedCount = await autoCalculationService.batchUpdateProjectProgress(projectId);

    res.json({
      success: true,
      message: `Progress updated for ${updatedCount} deliverables`,
      data: {
        updated_count: updatedCount
      }
    });
  })
);

/**
 * POST /api/nucleus-batch/workspaces/:workspaceId/deliverables/:deliverableId/tasks/batch-link
 * Batch link multiple tasks to a deliverable
 */
router.post(
  '/workspaces/:workspaceId/deliverables/:deliverableId/tasks/batch-link',
  verifyWorkspaceAccess,
  paramValidators.workspaceId,
  paramValidators.deliverableId,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { deliverableId } = req.params;
    const { taskIds } = req.body;
    const workspaceId = req.workspace._id;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'taskIds array is required and must not be empty'
      });
    }

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

    // Verify all tasks belong to the same project
    const tasks = await Task.find({
      _id: { $in: taskIds },
      projectId: deliverable.project_id
    });

    if (tasks.length !== taskIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some tasks not found or do not belong to project'
      });
    }

    // Link tasks to deliverable
    let linkedCount = 0;
    for (const taskId of taskIds) {
      if (!deliverable.tasks.includes(taskId)) {
        deliverable.tasks.push(taskId);
        linkedCount++;
      }

      // Update task milestone
      const task = tasks.find(t => t._id.toString() === taskId.toString());
      if (task && task.milestoneId?.toString() !== deliverableId) {
        task.milestoneId = deliverableId;
        await task.save();
      }
    }

    await deliverable.save();

    // Recalculate progress
    await autoCalculationService.onTaskLinked(deliverableId, taskIds[0]); // Trigger recalculation

    res.json({
      success: true,
      message: `${linkedCount} tasks linked to deliverable successfully`,
      data: {
        deliverable: {
          _id: deliverable._id,
          name: deliverable.name,
          tasks_count: deliverable.tasks.length
        },
        linked_count: linkedCount,
        total_tasks: taskIds.length
      }
    });
  })
);

/**
 * POST /api/nucleus-batch/workspaces/:workspaceId/deliverables/batch-create-approval-chains
 * Batch create approval chains for multiple deliverables
 */
router.post(
  '/workspaces/:workspaceId/deliverables/batch-create-approval-chains',
  verifyWorkspaceAccess,
  requireWorkspaceRole(['owner', 'admin']),
  paramValidators.workspaceId,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const { deliverableIds, devLeadId, qaLeadId, securityId, clientEmail } = req.body;

    if (!deliverableIds || !Array.isArray(deliverableIds) || deliverableIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'deliverableIds array is required and must not be empty'
      });
    }

    if (!devLeadId || !qaLeadId || !clientEmail) {
      return res.status(400).json({
        success: false,
        message: 'devLeadId, qaLeadId, and clientEmail are required'
      });
    }

    const deliverables = await Deliverable.find({
      _id: { $in: deliverableIds },
      workspaceId: workspaceId
    });

    if (deliverables.length !== deliverableIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some deliverables not found or do not belong to workspace'
      });
    }

    const results = [];
    const errors = [];

    for (const deliverable of deliverables) {
      try {
        // Check if approval chain already exists
        const existingApprovals = await Approval.find({
          deliverable_id: deliverable._id,
          workspaceId: workspaceId
        });

        if (existingApprovals.length > 0) {
          errors.push({
            deliverable_id: deliverable._id,
            deliverable_name: deliverable.name,
            error: 'Approval chain already exists'
          });
          continue;
        }

        // Create approval chain
        const approvals = await Approval.createApprovalChain(
          deliverable._id,
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

        results.push({
          deliverable_id: deliverable._id,
          deliverable_name: deliverable.name,
          approvals_created: approvals.length
        });
      } catch (error) {
        errors.push({
          deliverable_id: deliverable._id,
          deliverable_name: deliverable.name,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Approval chains created for ${results.length} deliverables`,
      data: {
        successful: results,
        failed: errors,
        total: deliverables.length,
        success_count: results.length,
        error_count: errors.length
      }
    });
  })
);

/**
 * POST /api/nucleus-batch/workspaces/:workspaceId/deliverables/batch-update-status
 * Batch update status for multiple deliverables
 */
router.post(
  '/workspaces/:workspaceId/deliverables/batch-update-status',
  verifyWorkspaceAccess,
  requireWorkspaceRole(['owner', 'admin']),
  paramValidators.workspaceId,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const { deliverableIds, status } = req.body;

    if (!deliverableIds || !Array.isArray(deliverableIds) || deliverableIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'deliverableIds array is required and must not be empty'
      });
    }

    if (!status || !['created', 'in_dev', 'ready_approval', 'approved', 'shipped', 'in_rework'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required'
      });
    }

    const deliverables = await Deliverable.find({
      _id: { $in: deliverableIds },
      workspaceId: workspaceId
    });

    if (deliverables.length !== deliverableIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some deliverables not found or do not belong to workspace'
      });
    }

    const results = [];
    const errors = [];

    for (const deliverable of deliverables) {
      try {
        // Validate status transition
        const { validateDeliverableStatusTransition } = require('../../../utils/nucleusHelpers');
        const validation = await validateDeliverableStatusTransition(deliverable._id, status);
        
        if (!validation.valid) {
          errors.push({
            deliverable_id: deliverable._id,
            deliverable_name: deliverable.name,
            error: validation.error
          });
          continue;
        }

        deliverable.status = status;
        await deliverable.save();

        results.push({
          deliverable_id: deliverable._id,
          deliverable_name: deliverable.name,
          old_status: deliverable.status,
          new_status: status
        });
      } catch (error) {
        errors.push({
          deliverable_id: deliverable._id,
          deliverable_name: deliverable.name,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Status updated for ${results.length} deliverables`,
      data: {
        successful: results,
        failed: errors,
        total: deliverables.length,
        success_count: results.length,
        error_count: errors.length
      }
    });
  })
);

module.exports = router;
