const Tenant = require('../../models/tenant/Tenant');
const User = require('../../models/users-auth/User');
const Organization = require('../../models/org/Organization');

/**
 * Deactivate tenant (soft delete)
 * @param {string} tenantId - Tenant ID
 * @returns {Object} Deactivation result
 */
async function deactivateTenant(tenantId) {
  try {
    const tenant = await Tenant.findOne({ tenantId });
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Update tenant status
    tenant.status = 'inactive';
    tenant.deactivatedAt = new Date();
    await tenant.save();

    // Deactivate all users
    await User.updateMany(
      { tenantId },
      { status: 'inactive', deactivatedAt: new Date() }
    );

    // Deactivate organization
    await Organization.updateMany(
      { tenantId },
      { status: 'inactive', deactivatedAt: new Date() }
    );

    return {
      success: true,
      message: 'Tenant deactivated successfully',
      deactivatedAt: tenant.deactivatedAt
    };
    
  } catch (error) {
    console.error('Error deactivating tenant:', error);
    throw error;
  }
}

/**
 * Reactivate tenant
 * @param {string} tenantId - Tenant ID
 * @returns {Object} Reactivation result
 */
async function reactivateTenant(tenantId) {
  try {
    const tenant = await Tenant.findOne({ tenantId });
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Update tenant status
    tenant.status = 'active';
    tenant.reactivatedAt = new Date();
    await tenant.save();

    // Reactivate all users
    await User.updateMany(
      { tenantId },
      { status: 'active', reactivatedAt: new Date() }
    );

    // Reactivate organization
    await Organization.updateMany(
      { tenantId },
      { status: 'active', reactivatedAt: new Date() }
    );

    return {
      success: true,
      message: 'Tenant reactivated successfully',
      reactivatedAt: tenant.reactivatedAt
    };
    
  } catch (error) {
    console.error('Error reactivating tenant:', error);
    throw error;
  }
}

module.exports = {
  deactivateTenant,
  reactivateTenant
};

