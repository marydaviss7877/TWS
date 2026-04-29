const Department = require('../../../models/org/Department');
const Team = require('../../../models/org/Team');

/**
 * Create default departments and teams
 * @param {Object} tenant - Tenant record
 * @param {Object} organization - Organization record
 * @param {Object} session - MongoDB session
 * @returns {Array} Created departments
 */
async function createDefaultDepartments(tenant, organization, session) {
  try {
    const departments = [
      {
        name: 'Human Resources',
        description: 'HR department for employee management',
        orgId: organization._id,
        tenantId: tenant.tenantId,
        head: null,
        budget: 50000,
        status: 'active',
        isDefault: true
      },
      {
        name: 'Finance & Accounting',
        description: 'Finance department for financial management',
        orgId: organization._id,
        tenantId: tenant.tenantId,
        head: null,
        budget: 75000,
        status: 'active',
        isDefault: true
      },
      {
        name: 'Project Management',
        description: 'Project management and delivery',
        orgId: organization._id,
        tenantId: tenant.tenantId,
        head: null,
        budget: 100000,
        status: 'active',
        isDefault: true
      },
      {
        name: 'Operations',
        description: 'Operations and administration',
        orgId: organization._id,
        tenantId: tenant.tenantId,
        head: null,
        budget: 60000,
        status: 'active',
        isDefault: true
      },
      {
        name: 'Sales & Marketing',
        description: 'Sales and marketing activities',
        orgId: organization._id,
        tenantId: tenant.tenantId,
        head: null,
        budget: 80000,
        status: 'active',
        isDefault: true
      }
    ];

    const createdDepartments = [];
    for (const deptData of departments) {
      const department = new Department(deptData);
      await department.save({ session });
      createdDepartments.push(department);
    }

    // Create default teams within departments
    await createDefaultTeams(tenant, organization, createdDepartments, session);

    return createdDepartments;
    
  } catch (error) {
    console.error('Error creating default departments:', error);
    throw error;
  }
}

/**
 * Create default teams within departments
 * @param {Object} tenant - Tenant record
 * @param {Object} organization - Organization record
 * @param {Array} departments - Created departments
 * @param {Object} session - MongoDB session
 */
async function createDefaultTeams(tenant, organization, departments, session) {
  try {
    const teams = [
      {
        name: 'Development Team',
        description: 'Software development team',
        departmentId: departments.find(d => d.name === 'Project Management')._id,
        orgId: organization._id,
        tenantId: tenant.tenantId,
        lead: null,
        members: [],
        status: 'active'
      },
      {
        name: 'QA Team',
        description: 'Quality assurance team',
        departmentId: departments.find(d => d.name === 'Project Management')._id,
        orgId: organization._id,
        tenantId: tenant.tenantId,
        lead: null,
        members: [],
        status: 'active'
      },
      {
        name: 'Design Team',
        description: 'UI/UX design team',
        departmentId: departments.find(d => d.name === 'Project Management')._id,
        orgId: organization._id,
        tenantId: tenant.tenantId,
        lead: null,
        members: [],
        status: 'active'
      }
    ];

    for (const teamData of teams) {
      const team = new Team(teamData);
      await team.save({ session });
    }
    
  } catch (error) {
    console.error('Error creating default teams:', error);
    throw error;
  }
}

module.exports = {
  createDefaultDepartments,
  createDefaultTeams
};

