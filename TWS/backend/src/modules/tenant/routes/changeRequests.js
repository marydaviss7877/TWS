const express = require('express');
const router = express.Router();
const ChangeRequest = require('../../../models/project-delivery/ChangeRequest');
const ChangeRequestAudit = require('../../../models/project-delivery/ChangeRequestAudit');
const Milestone = require('../../../models/project-delivery/Milestone');
const Deliverable = require('../../../models/project-delivery/Deliverable');
const Project = require('../../../models/project-delivery/Project');
const ProjectMember = require('../../../models/project-delivery/ProjectMember');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const NotificationService = require('../../../services/notifications/notification.service');
// Use standardized orgId helper utility
const { ensureOrgId, getTenantFilter } = require('../../../utils/orgIdHelper');

/**
 * POST /change-requests
 * Client submits a change request
 */
router.post('/',
  ErrorHandler.asyncHandler(async (req, res) => {
    // Use standardized orgId utility
    const orgId = await ensureOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id?.toString();
    const { deliverable_id, description } = req.body;
    const submittedBy = req.user.email;
    
    if (!deliverable_id || !description) {
      return res.status(400).json({
        success: false,
        message: 'Deliverable ID and description are required'
      });
    }
    
    const changeRequest = new ChangeRequest({
      deliverable_id,
      submitted_by: submittedBy,
      description,
      orgId,
      tenantId,
      status: 'submitted'
    });
    
    await changeRequest.save();
    
    // Log audit
    await ChangeRequestAudit.logEvent(
      changeRequest._id,
      'submitted',
      submittedBy,
      description,
      null,
      orgId,
      tenantId
    );
    
    // Send in-app notification to PM (Project has no ownerId; use ProjectMember owner)
    try {
      const deliverable = await Deliverable.findById(deliverable_id);
      if (deliverable) {
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
              type: 'project_update',
              title: 'Change Request Submitted',
              message: `Client submitted a change request for deliverable "${deliverable.name}"`,
              relatedEntityType: 'change_request',
              relatedEntityId: changeRequest._id,
              createdBy: req.user._id
            });
          }
        }
      }
    } catch (error) {
      console.error('In-app notification failed:', error);
    }
    
    res.status(201).json({
      success: true,
      message: 'Change request submitted',
      data: changeRequest
    });
  })
);

/**
 * POST /change-requests/:id/acknowledge
 * PM acknowledges change request
 */
router.post('/:id/acknowledge',
  ErrorHandler.asyncHandler(async (req, res) => {
    // Use standardized orgId utility
    const orgId = await ensureOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id?.toString();
    
    const changeRequest = await ChangeRequest.findOne({
      _id: req.params.id,
      orgId,
      tenantId
    });
    
    if (!changeRequest) {
      return res.status(404).json({
        success: false,
        message: 'Change request not found'
      });
    }
    
    if (changeRequest.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Change request must be in submitted status'
      });
    }
    
    await changeRequest.acknowledge(req.user._id);
    
    // Log audit
    await ChangeRequestAudit.logEvent(
      changeRequest._id,
      'acknowledged',
      req.user._id.toString(),
      'PM acknowledged change request',
      null,
      orgId,
      tenantId
    );
    
    res.json({
      success: true,
      message: 'Change request acknowledged',
      data: changeRequest
    });
  })
);

/**
 * POST /change-requests/:id/evaluate
 * PM evaluates and recommends
 */
router.post('/:id/evaluate',
  ErrorHandler.asyncHandler(async (req, res) => {
    // Use standardized orgId utility
    const orgId = await ensureOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id?.toString();
    const { pm_notes, effort_days, cost_impact, date_impact_days, pm_recommendation } = req.body;
    
    if (!pm_recommendation || !['accept', 'reject', 'negotiate'].includes(pm_recommendation)) {
      return res.status(400).json({
        success: false,
        message: 'Valid PM recommendation is required (accept/reject/negotiate)'
      });
    }
    
    const changeRequest = await ChangeRequest.findOne({
      _id: req.params.id,
      orgId,
      tenantId
    });
    
    if (!changeRequest) {
      return res.status(404).json({
        success: false,
        message: 'Change request not found'
      });
    }
    
    if (changeRequest.status !== 'acknowledged') {
      return res.status(400).json({
        success: false,
        message: 'Change request must be acknowledged first'
      });
    }
    
    await changeRequest.evaluate(req.user._id, {
      pm_notes,
      effort_days,
      cost_impact,
      date_impact_days,
      pm_recommendation
    });
    
    // Log audit
    await ChangeRequestAudit.logEvent(
      changeRequest._id,
      'recommended',
      req.user._id.toString(),
      `PM recommended: ${pm_recommendation}`,
      {
        effort_days,
        cost_impact,
        date_impact_days
      },
      orgId,
      tenantId
    );
    
    // Send in-app notification to client
    try {
      const User = require('../../../models/users-auth/User');
      const clientUser = await User.findOne({ email: changeRequest.submitted_by, orgId: orgId });
      if (clientUser) {
        const deliverable = await Deliverable.findById(changeRequest.deliverable_id);
        await NotificationService.createNotification({
          userIds: [clientUser._id],
          type: 'project_update',
          title: 'Change Request Evaluated',
          message: `PM has evaluated your change request for deliverable "${deliverable?.name || 'Deliverable'}"`,
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
      message: 'Change request evaluated',
      data: changeRequest
    });
  })
);

/**
 * POST /change-requests/:id/decide
 * Client decides on change request
 */
router.post('/:id/decide',
  ErrorHandler.asyncHandler(async (req, res) => {
    // Use standardized orgId utility
    const orgId = await ensureOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id?.toString();
    const { decision } = req.body;
    
    if (!decision || !['accept', 'reject'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Valid decision is required (accept/reject)'
      });
    }
    
    const changeRequest = await ChangeRequest.findOne({
      _id: req.params.id,
      orgId,
      tenantId
    });
    
    if (!changeRequest) {
      return res.status(404).json({
        success: false,
        message: 'Change request not found'
      });
    }
    
    // Verify client is the submitter
    if (changeRequest.submitted_by !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'Only the submitter can decide on this change request'
      });
    }
    
    if (changeRequest.status !== 'evaluated') {
      return res.status(400).json({
        success: false,
        message: 'Change request must be evaluated first'
      });
    }
    
    await changeRequest.decide(decision);
    
    // Log audit
    await ChangeRequestAudit.logEvent(
      changeRequest._id,
      'decided',
      req.user.email,
      `Client decision: ${decision}`,
      null,
      orgId,
      tenantId
    );
    
    // Send in-app notification to PM (Project has no ownerId; use ProjectMember owner)
    try {
      const deliverable = await Deliverable.findById(changeRequest.deliverable_id);
      if (deliverable) {
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
              type: 'project_update',
              title: `Change Request ${decision === 'accept' ? 'Accepted' : 'Rejected'}`,
              message: `Client ${decision}ed the change request for deliverable "${deliverable.name}"`,
              relatedEntityType: 'change_request',
              relatedEntityId: changeRequest._id,
              createdBy: req.user._id
            });
          }
        }
      }
    } catch (error) {
      console.error('In-app notification failed:', error);
    }
    
    res.json({
      success: true,
      message: `Change request ${decision}ed`,
      data: changeRequest
    });
  })
);

/**
 * GET /change-requests/:id/audit
 * Get audit trail for a change request
 */
router.get('/:id/audit',
  ErrorHandler.asyncHandler(async (req, res) => {
    // Use standardized orgId utility
    const orgId = await ensureOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id?.toString();
    
    const changeRequest = await ChangeRequest.findOne({
      _id: req.params.id,
      orgId,
      tenantId
    });
    
    if (!changeRequest) {
      return res.status(404).json({
        success: false,
        message: 'Change request not found'
      });
    }
    
    const auditLog = await ChangeRequestAudit.getAuditTrail(req.params.id);
    
    res.json({
      success: true,
      data: auditLog
    });
  })
);

/**
 * GET /change-requests/:id
 * Get a single change request by ID
 */
router.get('/:id',
  ErrorHandler.asyncHandler(async (req, res) => {
    // Use standardized orgId utility
    const orgId = await ensureOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id?.toString();

    const changeRequest = await ChangeRequest.findOne({
      _id: req.params.id,
      orgId,
      tenantId
    })
      .populate({
        path: 'deliverable_id',
        select: 'name project_id',
        populate: { path: 'project_id', select: 'name' }
      });

    if (!changeRequest) {
      return res.status(404).json({
        success: false,
        message: 'Change request not found'
      });
    }

    res.json({
      success: true,
      data: changeRequest
    });
  })
);

/**
 * GET /change-requests
 * Get all change requests (with filtering)
 */
router.get('/',
  ErrorHandler.asyncHandler(async (req, res) => {
    // Use standardized orgId utility
    const orgId = await ensureOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id?.toString();
    const { deliverable_id, status, submitted_by } = req.query;
    
    const query = { orgId, tenantId };
    
    if (deliverable_id) query.deliverable_id = deliverable_id;
    if (status) query.status = status;
    if (submitted_by) query.submitted_by = submitted_by;
    
    const changeRequests = await ChangeRequest.find(query)
      .populate('deliverable_id', 'name')
      .sort({ submitted_at: -1 });
    
    res.json({
      success: true,
      data: changeRequests
    });
  })
);

module.exports = router;
