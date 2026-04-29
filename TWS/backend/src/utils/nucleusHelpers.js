const Deliverable = require('../models/project-delivery/Deliverable');
const Approval = require('../models/core/Approval');
const Task = require('../models/project-delivery/Task');
const Project = require('../models/project-delivery/Project');
const Workspace = require('../models/org/Workspace');

/**
 * Nucleus Helper Utilities
 * 
 * Common utility functions for Nucleus operations
 */

/**
 * Calculate deliverable progress from linked tasks
 * @param {String} deliverableId - Deliverable ID
 * @returns {Promise<Number>} Progress percentage (0-100)
 */
async function calculateDeliverableProgress(deliverableId) {
  const deliverable = await Deliverable.findById(deliverableId);
  if (!deliverable) {
    throw new Error('Deliverable not found');
  }

  if (!deliverable.tasks || deliverable.tasks.length === 0) {
    return 0;
  }

  const tasks = await Task.find({ _id: { $in: deliverable.tasks } });
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const progress = Math.round((completedTasks / tasks.length) * 100);

  deliverable.progress_percentage = progress;
  await deliverable.save();

  return progress;
}

/**
 * Check if deliverable is at risk
 * @param {String} deliverableId - Deliverable ID
 * @returns {Promise<Boolean>} True if at risk
 */
async function isDeliverableAtRisk(deliverableId) {
  const deliverable = await Deliverable.findById(deliverableId);
  if (!deliverable) {
    throw new Error('Deliverable not found');
  }

  const now = new Date();
  const daysRemaining = Math.ceil((deliverable.target_date - now) / (1000 * 60 * 60 * 24));
  const workRemaining = deliverable.progress_percentage < 100 
    ? (100 - deliverable.progress_percentage) / 10 // rough estimate: 10% = 1 day
    : 0;
  
  return workRemaining > daysRemaining;
}

/**
 * Get deliverable status summary
 * @param {String} deliverableId - Deliverable ID
 * @returns {Promise<Object>} Status summary
 */
async function getDeliverableStatusSummary(deliverableId) {
  const deliverable = await Deliverable.findById(deliverableId);
  if (!deliverable) {
    throw new Error('Deliverable not found');
  }

  const approvals = await Approval.find({ deliverable_id: deliverableId })
    .sort({ step_number: 1 });

  const allApproved = approvals.every(a => a.status === 'approved');
  const anyRejected = approvals.some(a => a.status === 'rejected');
  const pendingClient = approvals.find(
    a => a.approver_type === 'client' && a.status === 'pending'
  );
  const pendingInternal = approvals.find(
    a => a.approver_type !== 'client' && a.status === 'pending'
  );

  let clientStatus = 'not_ready';
  if (anyRejected) {
    clientStatus = 'rejected';
  } else if (pendingClient) {
    clientStatus = 'pending_approval';
  } else if (allApproved) {
    clientStatus = 'approved';
  } else if (pendingInternal) {
    clientStatus = 'waiting_internal';
  }

  const isAtRisk = await isDeliverableAtRisk(deliverableId);

  return {
    deliverable_status: deliverable.status,
    client_status: clientStatus,
    progress_percentage: deliverable.progress_percentage,
    is_at_risk: isAtRisk,
    approvals: {
      total: approvals.length,
      approved: approvals.filter(a => a.status === 'approved').length,
      pending: approvals.filter(a => a.status === 'pending').length,
      rejected: approvals.filter(a => a.status === 'rejected').length
    },
    blocking_criteria_met: deliverable.blocking_criteria_met,
    days_until_target: Math.ceil((deliverable.target_date - new Date()) / (1000 * 60 * 60 * 24))
  };
}

/**
 * Validate deliverable can transition to status
 * @param {String} deliverableId - Deliverable ID
 * @param {String} newStatus - New status
 * @returns {Promise<Object>} Validation result
 */
async function validateDeliverableStatusTransition(deliverableId, newStatus) {
  const deliverable = await Deliverable.findById(deliverableId);
  if (!deliverable) {
    return { valid: false, error: 'Deliverable not found' };
  }

  const validTransitions = {
    'created': ['in_dev'],
    'in_dev': ['ready_approval', 'in_rework'],
    'ready_approval': ['approved', 'in_rework'],
    'approved': ['shipped'],
    'shipped': [],
    'in_rework': ['in_dev']
  };

  const allowedStatuses = validTransitions[deliverable.status] || [];
  if (!allowedStatuses.includes(newStatus)) {
    return {
      valid: false,
      error: `Cannot transition from ${deliverable.status} to ${newStatus}. Allowed: ${allowedStatuses.join(', ')}`
    };
  }

  // Special validation for ready_approval
  if (newStatus === 'ready_approval') {
    deliverable.checkBlockingCriteria();
    if (!deliverable.blocking_criteria_met) {
      return {
        valid: false,
        error: 'Cannot mark as ready for approval: acceptance criteria not met'
      };
    }
  }

  return { valid: true };
}

/**
 * Get workspace statistics
 * @param {String} workspaceId - Workspace ID
 * @returns {Promise<Object>} Workspace statistics
 */
async function getWorkspaceStatistics(workspaceId) {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    throw new Error('Workspace not found');
  }

  const projects = await Project.find({ workspaceId: workspaceId });
  const deliverables = await Deliverable.find({ workspaceId: workspaceId });
  const tasks = await Task.find({ projectId: { $in: projects.map(p => p._id) } });

  // Calculate statistics
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  
  const deliverablesByStatus = {
    created: deliverables.filter(d => d.status === 'created').length,
    in_dev: deliverables.filter(d => d.status === 'in_dev').length,
    ready_approval: deliverables.filter(d => d.status === 'ready_approval').length,
    approved: deliverables.filter(d => d.status === 'approved').length,
    shipped: deliverables.filter(d => d.status === 'shipped').length,
    in_rework: deliverables.filter(d => d.status === 'in_rework').length
  };

  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length
  };

  // Calculate on-time delivery rate
  const completedDeliverables = deliverables.filter(d => d.status === 'shipped' || d.status === 'approved');
  const onTimeDeliverables = completedDeliverables.filter(d => {
    if (!d.target_date) return false;
    return new Date(d.target_date) >= new Date();
  });
  const onTimeRate = completedDeliverables.length > 0
    ? (onTimeDeliverables.length / completedDeliverables.length) * 100
    : 0;

  return {
    workspace: {
      _id: workspace._id,
      name: workspace.name,
      members_count: workspace.members.length
    },
    projects: {
      total: projects.length,
      active: activeProjects,
      completed: completedProjects
    },
    deliverables: {
      total: deliverables.length,
      by_status: deliverablesByStatus
    },
    tasks: {
      total: tasks.length,
      by_status: tasksByStatus
    },
    metrics: {
      on_time_delivery_rate: Math.round(onTimeRate),
      average_progress: deliverables.length > 0
        ? Math.round(deliverables.reduce((sum, d) => sum + (d.progress_percentage || 0), 0) / deliverables.length)
        : 0
    }
  };
}

/**
 * Get project deliverables summary
 * @param {String} projectId - Project ID
 * @returns {Promise<Object>} Project deliverables summary
 */
async function getProjectDeliverablesSummary(projectId) {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  const deliverables = await Deliverable.find({ project_id: projectId });

  const summary = {
    project: {
      _id: project._id,
      name: project.name,
      status: project.status
    },
    deliverables: {
      total: deliverables.length,
      by_status: {
        created: deliverables.filter(d => d.status === 'created').length,
        in_dev: deliverables.filter(d => d.status === 'in_dev').length,
        ready_approval: deliverables.filter(d => d.status === 'ready_approval').length,
        approved: deliverables.filter(d => d.status === 'approved').length,
        shipped: deliverables.filter(d => d.status === 'shipped').length,
        in_rework: deliverables.filter(d => d.status === 'in_rework').length
      },
      at_risk: 0,
      on_track: 0
    },
    progress: {
      average: deliverables.length > 0
        ? Math.round(deliverables.reduce((sum, d) => sum + (d.progress_percentage || 0), 0) / deliverables.length)
        : 0
    }
  };

  // Check which deliverables are at risk
  for (const deliverable of deliverables) {
    const atRisk = await isDeliverableAtRisk(deliverable._id);
    if (atRisk) {
      summary.deliverables.at_risk++;
    } else {
      summary.deliverables.on_track++;
    }
  }

  return summary;
}

/**
 * Format deliverable for client view (clean, no internal details)
 * @param {Object} deliverable - Deliverable object
 * @returns {Object} Formatted deliverable
 */
function formatDeliverableForClient(deliverable) {
  return {
    _id: deliverable._id,
    name: deliverable.name,
    description: deliverable.description,
    start_date: deliverable.start_date,
    target_date: deliverable.target_date,
    status: deliverable.status,
    progress_percentage: deliverable.progress_percentage,
    // No internal task details exposed
    // No internal notes exposed
  };
}

/**
 * Format deliverable for internal view (full details)
 * @param {Object} deliverable - Deliverable object
 * @returns {Object} Formatted deliverable
 */
async function formatDeliverableForInternal(deliverable) {
  const tasks = await Task.find({ _id: { $in: deliverable.tasks || [] } });
  const approvals = await Approval.find({ deliverable_id: deliverable._id });

  return {
    ...deliverable.toObject(),
    tasks: tasks.map(t => ({
      _id: t._id,
      title: t.title,
      status: t.status,
      assignee: t.assignee,
      estimatedHours: t.estimatedHours,
      actualHours: t.actualHours
    })),
    approvals: approvals.map(a => ({
      step_number: a.step_number,
      approver_type: a.approver_type,
      status: a.status,
      signature_timestamp: a.signature_timestamp
    })),
    is_at_risk: await isDeliverableAtRisk(deliverable._id)
  };
}

module.exports = {
  calculateDeliverableProgress,
  isDeliverableAtRisk,
  getDeliverableStatusSummary,
  validateDeliverableStatusTransition,
  getWorkspaceStatistics,
  getProjectDeliverablesSummary,
  formatDeliverableForClient,
  formatDeliverableForInternal
};
