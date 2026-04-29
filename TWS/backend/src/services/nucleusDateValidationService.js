const Deliverable = require('../models/project-delivery/Deliverable');
const Project = require('../models/project-delivery/Project');

/**
 * Nucleus Date Validation Service
 * 
 * Provides date validation and confidence tracking for deliverables
 * as specified in the Nucleus spec
 */

class NucleusDateValidationService {
  /**
   * Validate deliverable target date and update confidence
   * @param {String} deliverableId - Deliverable ID
   * @param {String} userId - User ID (validator)
   * @param {Number} confidence - Confidence level (0-100)
   * @param {String} notes - Validation notes
   */
  async validateDeliverableDate(deliverableId, userId, confidence, notes) {
    const deliverable = await Deliverable.findById(deliverableId);
    if (!deliverable) {
      throw new Error('Deliverable not found');
    }

    await deliverable.validateDate(userId, confidence, notes || '');

    return {
      deliverable_id: deliverable._id,
      last_date_validation: deliverable.last_date_validation,
      date_confidence: deliverable.date_confidence,
      validation_count: deliverable.validation_history.length
    };
  }

  /**
   * Find deliverables needing validation (14+ days since last validation)
   * @param {String} workspaceId - Workspace ID
   * @param {Number} daysThreshold - Days threshold (default: 14)
   */
  async findDeliverablesNeedingValidation(workspaceId, daysThreshold = 14) {
    const deliverables = await Deliverable.findNeedingValidation(
      workspaceId, // Note: This method expects orgId, may need adjustment
      daysThreshold
    );

    return deliverables.map(d => ({
      _id: d._id,
      name: d.name,
      target_date: d.target_date,
      last_date_validation: d.last_date_validation,
      date_confidence: d.date_confidence,
      status: d.status,
      project: d.project_id
    }));
  }

  /**
   * Get validation history for a deliverable
   * @param {String} deliverableId - Deliverable ID
   */
  async getValidationHistory(deliverableId) {
    const deliverable = await Deliverable.findById(deliverableId);
    if (!deliverable) {
      throw new Error('Deliverable not found');
    }

    return {
      deliverable_id: deliverable._id,
      deliverable_name: deliverable.name,
      target_date: deliverable.target_date,
      last_date_validation: deliverable.last_date_validation,
      date_confidence: deliverable.date_confidence,
      validation_history: deliverable.validation_history.map(v => ({
        validated_at: v.validated_at,
        validated_by: v.validated_by,
        confidence: v.confidence,
        notes: v.notes
      }))
    };
  }

  /**
   * Calculate date confidence based on validation history
   * @param {String} deliverableId - Deliverable ID
   */
  async calculateDateConfidence(deliverableId) {
    const deliverable = await Deliverable.findById(deliverableId);
    if (!deliverable) {
      throw new Error('Deliverable not found');
    }

    if (!deliverable.validation_history || deliverable.validation_history.length === 0) {
      return {
        confidence: 0,
        message: 'No validations yet'
      };
    }

    // Average confidence from all validations
    const avgConfidence = deliverable.validation_history.reduce(
      (sum, v) => sum + (v.confidence || 0),
      0
    ) / deliverable.validation_history.length;

    // Recent validations weighted more
    const recentValidations = deliverable.validation_history
      .filter(v => {
        const daysSince = (new Date() - v.validated_at) / (1000 * 60 * 60 * 24);
        return daysSince <= 7; // Last 7 days
      });

    let weightedConfidence = avgConfidence;
    if (recentValidations.length > 0) {
      const recentAvg = recentValidations.reduce(
        (sum, v) => sum + (v.confidence || 0),
        0
      ) / recentValidations.length;
      weightedConfidence = (avgConfidence * 0.6) + (recentAvg * 0.4);
    }

    return {
      confidence: Math.round(weightedConfidence),
      validation_count: deliverable.validation_history.length,
      last_validation: deliverable.last_date_validation,
      message: this.getConfidenceMessage(weightedConfidence)
    };
  }

  /**
   * Get confidence message
   */
  getConfidenceMessage(confidence) {
    if (confidence >= 80) {
      return 'High confidence - target date is realistic';
    } else if (confidence >= 60) {
      return 'Moderate confidence - target date may need adjustment';
    } else if (confidence >= 40) {
      return 'Low confidence - target date likely needs revision';
    } else {
      return 'Very low confidence - target date should be re-evaluated';
    }
  }
}

module.exports = new NucleusDateValidationService();
