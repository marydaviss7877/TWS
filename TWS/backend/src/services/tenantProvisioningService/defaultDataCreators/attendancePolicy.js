const AttendancePolicy = require('../../../models/hr-payroll/AttendancePolicy');

/**
 * Create default attendance policy
 * @param {Object} tenant - Tenant record
 * @param {Object} organization - Organization record
 * @param {Object} session - MongoDB session
 */
async function createDefaultAttendancePolicy(tenant, organization, session) {
  try {
    const attendancePolicy = new AttendancePolicy({
      orgId: organization._id,
      tenantId: tenant.tenantId,
      name: 'Default Policy',
      description: 'Default attendance policy for new organization',
      workingHours: {
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 60, // minutes
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      },
      overtime: {
        enabled: true,
        threshold: 8, // hours
        rate: 1.5 // 1.5x regular rate
      },
      lateArrival: {
        tolerance: 15, // minutes
        penalty: 'warning'
      },
      earlyDeparture: {
        tolerance: 15, // minutes
        penalty: 'warning'
      },
      remoteWork: {
        enabled: true,
        maxDaysPerWeek: 3,
        requiresApproval: true
      },
      isDefault: true,
      status: 'active'
    });

    await attendancePolicy.save({ session });
    
  } catch (error) {
    console.error('Error creating default attendance policy:', error);
    throw error;
  }
}

module.exports = {
  createDefaultAttendancePolicy
};

