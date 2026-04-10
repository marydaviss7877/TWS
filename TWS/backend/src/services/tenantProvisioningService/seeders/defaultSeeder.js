const Tenant = require('../../../models/Tenant');

// Import default data creators
const { createDefaultAttendancePolicy } = require('../defaultDataCreators/attendancePolicy');
const { createDefaultDepartments } = require('../defaultDataCreators/departmentsAndTeams');
const { createSampleEmployeesAndPayroll } = require('../defaultDataCreators/employeesAndPayroll');
const { createDefaultProjectTemplates } = require('../defaultDataCreators/projectTemplates');
const { createSampleProject, createSampleTasks } = require('../defaultDataCreators/sampleProject');
const { createDefaultChartOfAccounts } = require('../defaultDataCreators/chartOfAccounts');
const { createSampleFinanceTransactions } = require('../defaultDataCreators/financeTransactions');
const { createSampleClientsAndVendors } = require('../defaultDataCreators/clientsAndVendors');
const { createDefaultNotificationTemplates } = require('../defaultDataCreators/notificationTemplates');
const { createDefaultAuditLogs } = require('../defaultDataCreators/auditLogs');

/**
 * Seed default data for new tenant - Complete ERP Instance
 * @param {Object} tenant - Tenant record
 * @param {Object} organization - Organization record
 * @param {Object} session - MongoDB session
 */
async function seedDefaultData(tenant, organization, session) {
  try {
    console.log(`Starting comprehensive ERP seeding for tenant: ${tenant.tenantId}`);
    
    // 1. Create default attendance policy
    await createDefaultAttendancePolicy(tenant, organization, session);
    
    // 2. Create default departments (needed for employees and other data)
    const departments = await createDefaultDepartments(tenant, organization, session);
    
    // 3. Create sample employees and payroll (needed for HR module)
    await createSampleEmployeesAndPayroll(tenant, organization, departments, session);
    
    // 4. Create default project templates
    await createDefaultProjectTemplates(tenant, organization, session);
    
    // 5. Create sample project (with tasks)
    const sampleProject = await createSampleProject(tenant, organization, session);
    
    // 6. Create sample tasks for the project (needed for Projects/Tasks module)
    await createSampleTasks(tenant, organization, sampleProject, session);
    
    // 7. Create default chart of accounts
    await createDefaultChartOfAccounts(tenant, organization, session);
    
    // 8. Create sample finance transactions (needed for Finance module)
    await createSampleFinanceTransactions(tenant, organization, session);
    
    // 9. Create sample clients and vendors
    await createSampleClientsAndVendors(tenant, organization, session);
    
    // 10. Create default notification templates
    await createDefaultNotificationTemplates(tenant, organization, session);
    
    // 12. Create default audit log entries
    await createDefaultAuditLogs(tenant, organization, session);
    
    console.log(`ERP seeding completed for tenant: ${tenant.tenantId}`);
    
    // Update tenant onboarding status
    await Tenant.findByIdAndUpdate(
      tenant._id,
      {
        'onboarding.steps.4.completed': true,
        'onboarding.steps.4.completedAt': new Date()
      },
      { session }
    );
    
  } catch (error) {
    console.error('Error seeding default data:', error);
    throw error;
  }
}

module.exports = {
  seedDefaultData
};

