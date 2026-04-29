const Employee = require('../../../models/hr-payroll/Employee');
const Payroll = require('../../../models/hr-payroll/Payroll');

/**
 * Create sample employees and payroll setup
 * @param {Object} tenant - Tenant record
 * @param {Object} organization - Organization record
 * @param {Array} departments - Created departments
 * @param {Object} session - MongoDB session
 */
async function createSampleEmployeesAndPayroll(tenant, organization, departments, session) {
  try {
    const employees = [
      {
        employeeId: 'EMP001',
        fullName: 'John Smith',
        email: 'john.smith@company.com',
        phone: '+1-555-0001',
        orgId: organization._id,
        tenantId: tenant.tenantId,
        departmentId: departments.find(d => d.name === 'Project Management')._id,
        position: 'Senior Developer',
        hireDate: new Date('2023-01-15'),
        salary: 75000,
        currency: tenant.settings.currency,
        status: 'active',
        isSample: true
      },
      {
        employeeId: 'EMP002',
        fullName: 'Jane Doe',
        email: 'jane.doe@company.com',
        phone: '+1-555-0002',
        orgId: organization._id,
        tenantId: tenant.tenantId,
        departmentId: departments.find(d => d.name === 'Human Resources')._id,
        position: 'HR Manager',
        hireDate: new Date('2023-02-01'),
        salary: 65000,
        currency: tenant.settings.currency,
        status: 'active',
        isSample: true
      }
    ];

    for (const empData of employees) {
      const employee = new Employee(empData);
      await employee.save({ session });
    }

    // Create payroll setup
    const payrollSetup = new Payroll({
      orgId: organization._id,
      tenantId: tenant.tenantId,
      name: 'Default Payroll',
      payFrequency: 'monthly',
      payDay: 1, // 1st of each month
      currency: tenant.settings.currency,
      taxSettings: {
        federalTaxRate: 0.22,
        stateTaxRate: 0.05,
        socialSecurityRate: 0.062,
        medicareRate: 0.0145
      },
      deductions: [
        { name: 'Health Insurance', type: 'fixed', amount: 200 },
        { name: '401k Contribution', type: 'percentage', amount: 0.05 }
      ],
      isDefault: true,
      status: 'active'
    });

    await payrollSetup.save({ session });
    
  } catch (error) {
    console.error('Error creating sample employees and payroll:', error);
    throw error;
  }
}

module.exports = {
  createSampleEmployeesAndPayroll
};

