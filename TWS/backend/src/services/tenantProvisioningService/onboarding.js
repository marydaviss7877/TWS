const Tenant = require('../../models/tenant/Tenant');
const { calculateOnboardingProgress } = require('./utils');

/**
 * Update onboarding status
 * @param {Object} tenant - Tenant record
 * @param {string} status - Onboarding status
 * @param {Object} session - MongoDB session
 */
async function updateOnboardingStatus(tenant, status, session) {
  try {
    await Tenant.findByIdAndUpdate(
      tenant._id,
      {
        'onboarding.status': status,
        'onboarding.completedAt': status === 'completed' ? new Date() : null
      },
      { session }
    );
    
  } catch (error) {
    console.error('Error updating onboarding status:', error);
    throw error;
  }
}

/**
 * Get tenant onboarding status
 * @param {string} tenantId - Tenant ID
 * @returns {Object} Onboarding status
 */
async function getOnboardingStatus(tenantId) {
  try {
    const tenant = await Tenant.findOne({ tenantId });
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    return {
      status: tenant.onboarding.status,
      steps: tenant.onboarding.steps,
      completedAt: tenant.onboarding.completedAt,
      progress: calculateOnboardingProgress(tenant.onboarding.steps)
    };
    
  } catch (error) {
    console.error('Error getting onboarding status:', error);
    throw error;
  }
}

/**
 * Complete onboarding step
 * @param {string} tenantId - Tenant ID
 * @param {string} stepName - Step name
 * @returns {Object} Updated status
 */
async function completeOnboardingStep(tenantId, stepName) {
  try {
    const tenant = await Tenant.findOne({ tenantId });
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const stepIndex = tenant.onboarding.steps.findIndex(step => step.name === stepName);
    if (stepIndex === -1) {
      throw new Error('Step not found');
    }

    tenant.onboarding.steps[stepIndex].completed = true;
    tenant.onboarding.steps[stepIndex].completedAt = new Date();

    // Check if all steps are completed
    const allCompleted = tenant.onboarding.steps.every(step => step.completed);
    if (allCompleted) {
      tenant.onboarding.status = 'completed';
      tenant.onboarding.completedAt = new Date();
    }

    await tenant.save();

    return {
      status: tenant.onboarding.status,
      progress: calculateOnboardingProgress(tenant.onboarding.steps)
    };
    
  } catch (error) {
    console.error('Error completing onboarding step:', error);
    throw error;
  }
}

module.exports = {
  updateOnboardingStatus,
  getOnboardingStatus,
  completeOnboardingStep
};

