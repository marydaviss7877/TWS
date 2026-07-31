const express = require('express');
const router = express.Router();
const Deliverable = require('../../../models/project-delivery/Deliverable');
const Milestone = require('../../../models/project-delivery/Milestone');
const Project = require('../../../models/project-delivery/Project');
const Task = require('../../../models/project-delivery/Task');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const { requireRole } = require('../../../middleware/auth/rbac');
// Use standardized orgId helper utility
const { ensureOrgId, getTenantFilter } = require('../../../utils/orgIdHelper');

// Roles allowed to create/modify/delete deliverables
const DELIVERABLE_WRITE_ROLES = ['admin', 'super_admin', 'org_manager', 'project_manager', 'pmo', 'owner'];

/**
 * GET /deliverables
 * Get all deliverables for a project (or all projects)
 */
router.get('/',
  ErrorHandler.asyncHandler(async (req, res) => {
    // Use standardized orgId utility
    const orgId = await ensureOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id?.toString();
    const { projectId, status } = req.query;
    
    const filter = { orgId, tenantId };
    if (projectId) {
      filter.project_id = projectId;
    }
    if (status) {
      filter.status = status;
    }
    
    const milestoneFilter = { orgId };
    if (projectId) milestoneFilter.projectId = projectId;
    const [deliverables, milestones] = await Promise.all([
      Deliverable.find(filter)
        .populate('project_id', 'name')
        .sort({ target_date: 1 })
        .lean(),
      Deliverable.countDocuments(filter).then(count => count === 0
        ? Milestone.find(milestoneFilter).populate('projectId', 'name').sort({ dueDate: 1 }).lean()
        : [])
    ]);

    const milestoneStatusMap = {
      pending: 'created',
      in_progress: 'in_dev',
      completed: 'shipped',
      at_risk: 'in_rework',
      delayed: 'in_rework'
    };
    const milestoneDeliverables = milestones.map(milestone => ({
      _id: milestone._id,
      project_id: milestone.projectId,
      name: milestone.title,
      description: milestone.description,
      start_date: milestone.createdAt,
      target_date: milestone.dueDate,
      shipped_at: milestone.completedDate,
      status: milestoneStatusMap[milestone.status] || 'created',
      progress_percentage: milestone.progress || 0,
      tasks: [],
      acceptance_criteria: [],
      blocking_criteria_met: milestone.status === 'completed',
      orgId: milestone.orgId,
      type: 'milestone'
    })).filter(item => !status || item.status === status);
    
    res.json({
      success: true,
      data: [...deliverables.map(item => ({ ...item, type: 'deliverable' })), ...milestoneDeliverables]
    });
  })
);

/**
 * GET /deliverables/needing-validation
 * Get deliverables that need date validation (14+ days since last validation)
 * NOTE: Must be registered BEFORE /:id to avoid Express matching "needing-validation" as an id
 */
router.get('/needing-validation',
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = await ensureOrgId(req);
    const { daysThreshold = 14 } = req.query;

    const deliverables = await Deliverable.findNeedingValidation(orgId, parseInt(daysThreshold));

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - parseInt(daysThreshold));

    const milestones = await Milestone.find({
      orgId,
      $or: [
        { last_date_validation: { $lt: thresholdDate } },
        { last_date_validation: { $exists: false } }
      ],
      status: { $in: ['pending', 'in_progress'] }
    }).populate('projectId', 'name');

    const allItems = [
      ...deliverables.map(d => ({ ...d.toObject(), type: 'deliverable' })),
      ...milestones.map(m => ({
        ...m.toObject(),
        type: 'milestone',
        name: m.title,
        target_date: m.dueDate,
        progress_percentage: m.progress
      }))
    ];

    res.json({ success: true, data: allItems });
  })
);

/**
 * GET /deliverables/:id
 * Get a single deliverable by ID
 */
router.get('/:id',
  ErrorHandler.asyncHandler(async (req, res) => {
    // Use standardized orgId utility
    const orgId = await ensureOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id?.toString();
    
    let deliverable = await Deliverable.findOne({
      _id: req.params.id,
      orgId,
      tenantId
    }).populate('project_id', 'name');
    
    // Fallback to Milestone if not found
    if (!deliverable) {
      const milestone = await Milestone.findOne({
        _id: req.params.id,
        orgId
      }).populate('projectId', 'name');
      
      if (!milestone) {
        return res.status(404).json({
          success: false,
          message: 'Deliverable not found'
        });
      }
      
      // Transform milestone to deliverable format
      deliverable = {
        _id: milestone._id,
        name: milestone.title || milestone.name,
        description: milestone.description,
        status: milestone.status || 'created',
        target_date: milestone.dueDate,
        start_date: milestone.startDate,
        progress_percentage: milestone.progress || 0,
        project_id: milestone.projectId,
        acceptance_criteria: milestone.acceptance_criteria || [],
        blocking_criteria_met: milestone.blocking_criteria_met || false
      };
    }
    
    res.json({
      success: true,
      data: deliverable
    });
  })
);

/**
 * POST /deliverables
 * Create a new deliverable
 */
router.post('/',
  requireRole(DELIVERABLE_WRITE_ROLES),
  ErrorHandler.asyncHandler(async (req, res) => {
    // Use standardized orgId utility
    const orgId = await ensureOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id?.toString();
    const { project_id, name, description, start_date, target_date, status, acceptance_criteria, blocking_criteria_met } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Deliverable name is required' });
    }
    if (!start_date) {
      return res.status(400).json({ success: false, message: 'Start date is required' });
    }
    if (!target_date) {
      return res.status(400).json({ success: false, message: 'Target date is required' });
    }

    if (!project_id) {
      return res.status(400).json({ success: false, message: 'Project is required' });
    }
    const project = await Project.findOne({ _id: project_id, orgId }).select('_id workspaceId');
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found or does not belong to your organization'
      });
    }

    const deliverable = new Deliverable({
      project_id,
      name: name.trim(),
      description: description || null,
      start_date: new Date(start_date),
      target_date: new Date(target_date),
      status: status || 'created',
      acceptance_criteria: acceptance_criteria || [],
      blocking_criteria_met: blocking_criteria_met || false,
      orgId,
      tenantId,
      workspaceId: project.workspaceId || undefined,
      ownerId: req.user?._id
    });

    await deliverable.save();

    res.status(201).json({
      success: true,
      data: deliverable,
      message: 'Deliverable created successfully'
    });
  })
);

/**
 * PUT /deliverables/:id
 * Update a deliverable
 */
router.put('/:id',
  requireRole(DELIVERABLE_WRITE_ROLES),
  ErrorHandler.asyncHandler(async (req, res) => {
    // Use standardized orgId utility
    const orgId = await ensureOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id?.toString();
    
    const deliverable = await Deliverable.findOne({
      _id: req.params.id,
      orgId,
      tenantId
    });
    
    if (!deliverable) {
      return res.status(404).json({
        success: false,
        message: 'Deliverable not found'
      });
    }
    
    const { name, description, start_date, target_date, status, progress_percentage, acceptance_criteria, blocking_criteria_met } = req.body;
    
    if (name) deliverable.name = name;
    if (description !== undefined) deliverable.description = description;
    if (start_date) deliverable.start_date = new Date(start_date);
    if (target_date) deliverable.target_date = new Date(target_date);
    if (status) deliverable.status = status;
    if (progress_percentage !== undefined) deliverable.progress_percentage = progress_percentage;
    if (acceptance_criteria) deliverable.acceptance_criteria = acceptance_criteria;
    if (blocking_criteria_met !== undefined) deliverable.blocking_criteria_met = blocking_criteria_met;
    
    await deliverable.save();
    
    res.json({
      success: true,
      data: deliverable,
      message: 'Deliverable updated successfully'
    });
  })
);

/**
 * DELETE /deliverables/:id
 * Delete a deliverable
 */
router.delete('/:id',
  requireRole(DELIVERABLE_WRITE_ROLES),
  ErrorHandler.asyncHandler(async (req, res) => {
    // Use standardized orgId utility
    const orgId = await ensureOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id?.toString();
    
    const deliverable = await Deliverable.findOneAndDelete({
      _id: req.params.id,
      orgId,
      tenantId
    });
    
    if (!deliverable) {
      return res.status(404).json({
        success: false,
        message: 'Deliverable not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Deliverable deleted successfully'
    });
  })
);

/**
 * POST /deliverables/:id/validate-date
 * PM validates deliverable date and sets confidence
 */
router.post('/:id/validate-date',
  ErrorHandler.asyncHandler(async (req, res) => {
    // Use standardized orgId utility
    const orgId = await ensureOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id?.toString();
    const { confidence, notes } = req.body;
    
    if (!confidence || confidence < 0 || confidence > 100) {
      return res.status(400).json({
        success: false,
        message: 'Confidence must be between 0 and 100'
      });
    }
    
    // Try Deliverable first, fallback to Milestone
    let deliverable = await Deliverable.findOne({
      _id: req.params.id,
      orgId,
      tenantId
    });
    
    if (!deliverable) {
      deliverable = await Milestone.findOne({
        _id: req.params.id,
        orgId
      });
      
      if (!deliverable) {
        return res.status(404).json({
          success: false,
          message: 'Deliverable not found'
        });
      }
      
      // If using Milestone, we can't use validateDate method
      // Just update the fields directly
      deliverable.last_date_validation = new Date();
      if (!deliverable.validation_history) {
        deliverable.validation_history = [];
      }
      deliverable.validation_history.push({
        validated_at: new Date(),
        validated_by: req.user._id,
        confidence,
        notes: notes || ''
      });
      await deliverable.save();
    } else {
      // Use Deliverable model's validateDate method
      await deliverable.validateDate(req.user._id, confidence, notes);
    }
    
    res.json({
      success: true,
      message: 'Date validated successfully',
      data: deliverable
    });
  })
);

/**
 * POST /deliverables/:id/tasks/:taskId/link
 * Link a task to a deliverable
 */
router.post('/:id/tasks/:taskId/link',
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = await ensureOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id?.toString();

    const deliverable = await Deliverable.findOne({ _id: req.params.id, orgId, tenantId });
    if (!deliverable) {
      return res.status(404).json({ success: false, message: 'Deliverable not found' });
    }

    const task = await Task.findOne({ _id: req.params.taskId, projectId: deliverable.project_id });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found or does not belong to this project' });
    }

    if (!deliverable.tasks.map(String).includes(req.params.taskId)) {
      deliverable.tasks.push(req.params.taskId);
      await deliverable.save();
    }

    task.milestoneId = deliverable._id;
    await task.save();

    // Recalculate progress
    const linkedTasks = await Task.find({ _id: { $in: deliverable.tasks } });
    const completed = linkedTasks.filter(t => t.status === 'completed').length;
    deliverable.progress_percentage = linkedTasks.length > 0
      ? Math.round((completed / linkedTasks.length) * 100)
      : 0;
    await deliverable.save();

    res.json({ success: true, message: 'Task linked to deliverable', data: deliverable });
  })
);

/**
 * DELETE /deliverables/:id/tasks/:taskId
 * Unlink a task from a deliverable
 */
router.delete('/:id/tasks/:taskId',
  ErrorHandler.asyncHandler(async (req, res) => {
    const orgId = await ensureOrgId(req);
    const tenantId = req.tenantId || req.tenant?._id?.toString();

    const deliverable = await Deliverable.findOne({ _id: req.params.id, orgId, tenantId });
    if (!deliverable) {
      return res.status(404).json({ success: false, message: 'Deliverable not found' });
    }

    deliverable.tasks = deliverable.tasks.filter(t => t.toString() !== req.params.taskId);
    await deliverable.save();

    const task = await Task.findById(req.params.taskId);
    if (task && task.milestoneId?.toString() === req.params.id) {
      task.milestoneId = null;
      await task.save();
    }

    // Recalculate progress
    const linkedTasks = await Task.find({ _id: { $in: deliverable.tasks } });
    const completed = linkedTasks.filter(t => t.status === 'completed').length;
    deliverable.progress_percentage = linkedTasks.length > 0
      ? Math.round((completed / linkedTasks.length) * 100)
      : 0;
    await deliverable.save();

    res.json({ success: true, message: 'Task unlinked from deliverable', data: deliverable });
  })
);

module.exports = router;
