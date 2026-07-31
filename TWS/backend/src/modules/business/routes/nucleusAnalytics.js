const express = require('express');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { verifyWorkspaceAccess } = require('../../../middleware/auth/workspaceIsolation');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const { getWorkspaceStatistics, getProjectDeliverablesSummary, getDeliverableStatusSummary } = require('../../../utils/nucleusHelpers');
const Project = require('../../../models/project-delivery/Project');
const Deliverable = require('../../../models/project-delivery/Deliverable');
const Approval = require('../../../models/core/Approval');
const ChangeRequest = require('../../../models/project-delivery/ChangeRequest');
const Task = require('../../../models/project-delivery/Task');

const router = express.Router();
router.use(verifyERPToken);

/**
 * Nucleus Analytics Routes
 * 
 * Provides analytics and reporting endpoints for:
 * - Workspace statistics
 * - Project summaries
 * - Deliverable status tracking
 * - On-time delivery metrics
 * - At-risk deliverables
 */

/**
 * GET /api/nucleus-analytics/workspaces/:workspaceId/statistics
 * Get comprehensive workspace statistics
 */
router.get(
  '/workspaces/:workspaceId/statistics',
  verifyWorkspaceAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;

    const stats = await getWorkspaceStatistics(workspaceId);

    res.json({
      success: true,
      data: stats
    });
  })
);

/**
 * GET /api/nucleus-analytics/workspaces/:workspaceId/projects/:projectId/summary
 * Get project deliverables summary
 */
router.get(
  '/workspaces/:workspaceId/projects/:projectId/summary',
  verifyWorkspaceAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const workspaceId = req.workspace._id;

    // Verify project belongs to workspace
    const project = await Project.findOne({
      _id: projectId,
      workspaceId: workspaceId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found or access denied'
      });
    }

    const summary = await getProjectDeliverablesSummary(projectId);

    res.json({
      success: true,
      data: summary
    });
  })
);

/**
 * GET /api/nucleus-analytics/workspaces/:workspaceId/deliverables/at-risk
 * Get all at-risk deliverables in workspace
 */
router.get(
  '/workspaces/:workspaceId/deliverables/at-risk',
  verifyWorkspaceAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;

    const deliverables = await Deliverable.find({
      workspaceId: workspaceId,
      status: { $in: ['created', 'in_dev', 'ready_approval'] }
    })
      .populate('project_id', 'name')
      .sort({ target_date: 1 });

    const atRiskDeliverables = [];

    for (const deliverable of deliverables) {
      const now = new Date();
      const daysRemaining = Math.ceil((deliverable.target_date - now) / (1000 * 60 * 60 * 24));
      const workRemaining = deliverable.progress_percentage < 100 
        ? (100 - deliverable.progress_percentage) / 10
        : 0;
      
      if (workRemaining > daysRemaining) {
        atRiskDeliverables.push({
          _id: deliverable._id,
          name: deliverable.name,
          project: {
            _id: deliverable.project_id._id,
            name: deliverable.project_id.name
          },
          target_date: deliverable.target_date,
          progress_percentage: deliverable.progress_percentage,
          days_remaining: daysRemaining,
          work_remaining_days: workRemaining,
          status: deliverable.status
        });
      }
    }

    res.json({
      success: true,
      data: {
        count: atRiskDeliverables.length,
        deliverables: atRiskDeliverables
      }
    });
  })
);

/**
 * GET /api/nucleus-analytics/workspaces/:workspaceId/deliverables/pending-approval
 * Get all deliverables pending client approval
 */
router.get(
  '/workspaces/:workspaceId/deliverables/pending-approval',
  verifyWorkspaceAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;

    // Find all deliverables with client approval pending
    const approvals = await Approval.find({
      workspaceId: workspaceId,
      approver_type: 'client',
      status: 'pending'
    })
      .populate('deliverable_id', 'name target_date status progress_percentage project_id')
      .sort({ step_number: 1 });

    // Filter to only those where all internal steps are approved
    const pendingClientApproval = [];

    for (const approval of approvals) {
      const deliverable = approval.deliverable_id;
      if (!deliverable) continue;

      // Check if all internal steps are approved
      const allInternalApproved = await Approval.areAllInternalStepsApproved(
        deliverable._id,
        { orgId: approval.orgId, tenantId: approval.tenantId }
      );
      
      if (allInternalApproved) {
        const project = await Project.findById(deliverable.project_id);
        pendingClientApproval.push({
          _id: deliverable._id,
          name: deliverable.name,
          project: {
            _id: project._id,
            name: project.name
          },
          target_date: deliverable.target_date,
          progress_percentage: deliverable.progress_percentage,
          status: deliverable.status,
          waiting_since: approval.createdAt
        });
      }
    }

    res.json({
      success: true,
      data: {
        count: pendingClientApproval.length,
        deliverables: pendingClientApproval
      }
    });
  })
);

/**
 * GET /api/nucleus-analytics/workspaces/:workspaceId/change-requests/pending
 * Get all pending change requests (awaiting PM evaluation)
 */
router.get(
  '/workspaces/:workspaceId/change-requests/pending',
  verifyWorkspaceAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;

    const changeRequests = await ChangeRequest.find({
      workspaceId: workspaceId,
      status: { $in: ['submitted', 'acknowledged'] }
    })
      .populate('deliverable_id', 'name project_id')
      .sort({ submitted_at: -1 });

    const pendingRequests = await Promise.all(
      changeRequests.map(async (cr) => {
        const deliverable = cr.deliverable_id;
        const project = await Project.findById(deliverable.project_id);
        
        return {
          _id: cr._id,
          deliverable: {
            _id: deliverable._id,
            name: deliverable.name
          },
          project: {
            _id: project._id,
            name: project.name
          },
          description: cr.description,
          submitted_by: cr.submitted_by,
          submitted_at: cr.submitted_at,
          status: cr.status,
          days_waiting: Math.floor((new Date() - cr.submitted_at) / (1000 * 60 * 60 * 24))
        };
      })
    );

    res.json({
      success: true,
      data: {
        count: pendingRequests.length,
        change_requests: pendingRequests
      }
    });
  })
);

/**
 * GET /api/nucleus-analytics/workspaces/:workspaceId/deliverables/:deliverableId/status-summary
 * Get detailed status summary for a deliverable
 */
router.get(
  '/workspaces/:workspaceId/deliverables/:deliverableId/status-summary',
  verifyWorkspaceAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { deliverableId } = req.params;

    const summary = await getDeliverableStatusSummary(deliverableId);

    res.json({
      success: true,
      data: summary
    });
  })
);

/**
 * GET /api/nucleus-analytics/workspaces/:workspaceId/projects/:projectId/timeline
 * Get project timeline with deliverables (for Gantt chart)
 */
router.get(
  '/workspaces/:workspaceId/projects/:projectId/timeline',
  verifyWorkspaceAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const workspaceId = req.workspace._id;

    const project = await Project.findOne({
      _id: projectId,
      workspaceId: workspaceId
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found or access denied'
      });
    }

    const deliverables = await Deliverable.find({
      project_id: projectId,
      workspaceId: workspaceId
    })
      .sort({ target_date: 1 });

    const timeline = {
      project: {
        _id: project._id,
        name: project.name,
        start_date: project.timeline?.startDate,
        end_date: project.timeline?.endDate
      },
      deliverables: deliverables.map(d => ({
        _id: d._id,
        name: d.name,
        start_date: d.start_date,
        target_date: d.target_date,
        status: d.status,
        progress_percentage: d.progress_percentage,
        dependencies: d.dependencies || []
      }))
    };

    res.json({
      success: true,
      data: timeline
    });
  })
);

/**
 * GET /api/nucleus-analytics/workspaces/:workspaceId/metrics
 * Get workspace-level metrics
 */
router.get(
  '/workspaces/:workspaceId/metrics',
  verifyWorkspaceAccess,
  ErrorHandler.asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;

    const stats = await getWorkspaceStatistics(workspaceId);

    // Calculate additional metrics
    const allDeliverables = await Deliverable.find({ workspaceId: workspaceId });
    const completedDeliverables = allDeliverables.filter(d => 
      d.status === 'shipped' || d.status === 'approved'
    );

    const onTimeDeliverables = completedDeliverables.filter(d => {
      if (!d.target_date) return false;
      return new Date(d.target_date) >= new Date();
    });

    const onTimeRate = completedDeliverables.length > 0
      ? (onTimeDeliverables.length / completedDeliverables.length) * 100
      : 0;

    // Calculate average approval time (if available)
    const approvedDeliverables = allDeliverables.filter(d => d.status === 'approved');
    let totalApprovalTime = 0;
    let approvalCount = 0;

    for (const deliverable of approvedDeliverables) {
      const clientApproval = await Approval.findOne({
        deliverable_id: deliverable._id,
        approver_type: 'client',
        status: 'approved'
      });

      if (clientApproval && clientApproval.signature_timestamp) {
        // Find when it was marked ready_approval (approximate)
        const readyDate = deliverable.updatedAt; // Simplified
        const approvalTime = (clientApproval.signature_timestamp - readyDate) / (1000 * 60 * 60 * 24); // days
        totalApprovalTime += approvalTime;
        approvalCount++;
      }
    }

    const avgApprovalTime = approvalCount > 0
      ? totalApprovalTime / approvalCount
      : 0;

    // Calculate change request acceptance rate
    const changeRequests = await ChangeRequest.find({ workspaceId: workspaceId });
    const acceptedCount = changeRequests.filter(cr => cr.status === 'accepted').length;
    const totalEvaluatedCount = changeRequests.filter(cr => 
      cr.status === 'accepted' || cr.status === 'rejected'
    ).length;
    const changeRequestAcceptanceRate = totalEvaluatedCount > 0
      ? (acceptedCount / totalEvaluatedCount) * 100
      : 0;

    res.json({
      success: true,
      data: {
        workspace: stats.workspace,
        projects: stats.projects,
        deliverables: stats.deliverables,
        tasks: stats.tasks,
        metrics: {
          ...stats.metrics,
          on_time_delivery_rate: Math.round(onTimeRate),
          average_approval_time_days: Math.round(avgApprovalTime * 10) / 10,
          change_request_acceptance_rate: Math.round(changeRequestAcceptanceRate),
          total_deliverables: allDeliverables.length,
          completed_deliverables: completedDeliverables.length
        }
      }
    });
  })
);

module.exports = router;
