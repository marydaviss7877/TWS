const Deliverable = require('../models/project-delivery/Deliverable');
const Task = require('../models/project-delivery/Task');
const { calculateDeliverableProgress, isDeliverableAtRisk } = require('../utils/nucleusHelpers');

/**
 * Nucleus Auto-Calculation Service
 * 
 * Automatically updates deliverable progress and status when:
 * - Tasks are completed
 * - Tasks are linked/unlinked
 * - Task status changes
 * 
 * This service should be called via hooks or event listeners
 */

class NucleusAutoCalculationService {
  /**
   * Recalculate deliverable progress when task status changes
   * @param {String} taskId - Task ID
   */
  async onTaskStatusChange(taskId) {
    const task = await Task.findById(taskId);
    if (!task) return;

    // Find all deliverables that have this task (check both tasks array and milestoneId)
    const deliverables = await Deliverable.find({
      $or: [
        { tasks: taskId },
        { _id: task.milestoneId }
      ]
    });

    for (const deliverable of deliverables) {
      // Recalculate progress
      await calculateDeliverableProgress(deliverable._id);
      
      // Reload deliverable to get updated progress
      const updatedDeliverable = await Deliverable.findById(deliverable._id);
      if (!updatedDeliverable) continue;

      // Auto-update deliverable status based on progress
      if (updatedDeliverable.progress_percentage === 100 && updatedDeliverable.status === 'in_dev') {
        // Check if blocking criteria are met
        updatedDeliverable.checkBlockingCriteria();
        if (updatedDeliverable.blocking_criteria_met) {
          updatedDeliverable.status = 'ready_approval';
          await updatedDeliverable.save();
        }
      }
    }
  }

  /**
   * Recalculate deliverable progress when task is linked
   * @param {String} deliverableId - Deliverable ID
   * @param {String} taskId - Task ID
   */
  async onTaskLinked(deliverableId, taskId) {
    await calculateDeliverableProgress(deliverableId);
  }

  /**
   * Recalculate deliverable progress when task is unlinked
   * @param {String} deliverableId - Deliverable ID
   */
  async onTaskUnlinked(deliverableId) {
    await calculateDeliverableProgress(deliverableId);
  }

  /**
   * Check and update at-risk status for all deliverables in workspace
   * @param {String} workspaceId - Workspace ID
   */
  async checkAtRiskDeliverables(workspaceId) {
    const deliverables = await Deliverable.find({
      workspaceId: workspaceId,
      status: { $in: ['created', 'in_dev', 'ready_approval'] }
    });

    const atRiskCount = 0;

    for (const deliverable of deliverables) {
      const atRisk = await isDeliverableAtRisk(deliverable._id);
      // Could add atRisk flag to deliverable if needed
      // deliverable.isAtRisk = atRisk;
      // await deliverable.save();
    }

    return atRiskCount;
  }

  /**
   * Batch update progress for all deliverables in a project
   * @param {String} projectId - Project ID
   */
  async batchUpdateProjectProgress(projectId) {
    const deliverables = await Deliverable.find({ project_id: projectId });

    for (const deliverable of deliverables) {
      await calculateDeliverableProgress(deliverable._id);
    }

    return deliverables.length;
  }

  /**
   * Batch update progress for all deliverables in a workspace
   * @param {String} workspaceId - Workspace ID
   */
  async batchUpdateWorkspaceProgress(workspaceId) {
    const deliverables = await Deliverable.find({ workspaceId: workspaceId });

    for (const deliverable of deliverables) {
      await calculateDeliverableProgress(deliverable._id);
    }

    return deliverables.length;
  }
}

module.exports = new NucleusAutoCalculationService();
