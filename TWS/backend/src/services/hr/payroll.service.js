const { PayrollRecord, PayrollCycle } = require('../../models/Payroll');
const Employee = require('../../models/Employee');
const Attendance = require('../../models/Attendance');

class PayrollService {
  /**
   * Get payroll records
   * @param {string} orgId - Organization ID
   * @param {Object} filters - Filter options
   * @returns {Object} Payroll records with pagination
   */
  async getPayrollRecords(orgId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        employeeId,
        period,
        status,
        startDate,
        endDate
      } = filters;

      const query = {};

      // Build query from employee orgId
      if (employeeId) {
        const employee = await Employee.findOne({
          $or: [
            { _id: employeeId },
            { employeeId: employeeId }
          ],
          orgId: orgId
        });
        if (employee) {
          query.employeeId = employee._id;
        } else {
          return { records: [], pagination: { page: 1, limit: parseInt(limit), total: 0, pages: 0 } };
        }
      } else {
        // Get all employees for org
        const employees = await Employee.find({ orgId: orgId }).select('_id');
        query.employeeId = { $in: employees.map(e => e._id) };
      }

      if (status) query.status = status;
      if (period) query.payPeriod = period;
      if (startDate || endDate) {
        query.periodStart = {};
        if (startDate) query.periodStart.$gte = new Date(startDate);
        if (endDate) query.periodStart.$lte = new Date(endDate);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [records, total] = await Promise.all([
        PayrollRecord.find(query)
          .populate('employeeId', 'employeeId jobTitle department')
          .populate('userId', 'fullName email')
          .populate('approvedBy', 'fullName email')
          .sort({ periodStart: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        PayrollRecord.countDocuments(query)
      ]);

      return {
        records: records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / parseInt(limit))
        }
      };
    } catch (error) {
      console.error('Error getting payroll records:', error);
      throw error;
    }
  }

  /**
   * Process payroll for a period
   * @param {string} orgId - Organization ID
   * @param {Object} payrollData - Payroll processing data
   * @returns {Object} Processed payroll records
   */
  async processPayroll(orgId, payrollData) {
    try {
      const {
        periodStart,
        periodEnd,
        payPeriod = 'monthly',
        employeeIds = [],
        payDate
      } = payrollData;

      if (!periodStart || !periodEnd) {
        throw new Error('Period start and end dates are required');
      }

      // Get employees to process
      let employees;
      if (employeeIds.length > 0) {
        employees = await Employee.find({
          orgId: orgId,
          _id: { $in: employeeIds },
          status: 'active'
        });
      } else {
        employees = await Employee.find({
          orgId: orgId,
          status: 'active'
        });
      }

      const processedRecords = [];

      for (const employee of employees) {
        // Check if payroll already exists for this period
        const existing = await PayrollRecord.findOne({
          orgId,
          employeeId: employee._id,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd)
        });

        if (existing) {
          processedRecords.push(existing);
          continue;
        }

        // Get attendance for period
        const attendanceRecords = await Attendance.find({
          userId: employee.userId,
          organizationId: orgId,
          date: {
            $gte: new Date(periodStart),
            $lte: new Date(periodEnd)
          },
          status: 'present'
        });

        // Calculate hours worked
        const regularHours = attendanceRecords.reduce((sum, record) => {
          return sum + (record.durationMinutes || 0) / 60;
        }, 0);

        const overtimeHours = attendanceRecords.reduce((sum, record) => {
          return sum + (record.overtimeMinutes || 0) / 60;
        }, 0);

        const totalHours = regularHours + overtimeHours;

        // Calculate gross pay
        const baseSalary = employee.salary?.base || 0;
        const payFrequency = employee.salary?.payFrequency || 'monthly';
        
        let grossPay = 0;
        if (payFrequency === 'monthly') {
          grossPay = baseSalary;
        } else if (payFrequency === 'biweekly' || payFrequency === 'bi-weekly') {
          grossPay = (baseSalary * 12) / 26;
        } else if (payFrequency === 'weekly') {
          grossPay = (baseSalary * 12) / 52;
        } else {
          // Calculate based on hours
          const hourlyRate = employee.salary?.base / (employee.workSchedule?.hoursPerWeek || 40) / 4;
          grossPay = (regularHours * hourlyRate) + (overtimeHours * hourlyRate * 1.5);
        }

        // Add components (allowances, bonuses)
        let totalComponents = 0;
        if (employee.salary?.components) {
          employee.salary.components.forEach(component => {
            if (component.type === 'allowance' || component.type === 'bonus') {
              totalComponents += component.amount || 0;
            }
          });
        }

        grossPay += totalComponents;

        // Calculate deductions
        const deductions = this.calculateDeductions(grossPay, employee);

        // Calculate net pay
        const netPay = grossPay - deductions.total;

        // Create payroll record
        const payrollRecord = new PayrollRecord({
          orgId,
          employeeId: employee._id,
          userId: employee.userId,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          payPeriod: payPeriod,
          grossPay: grossPay,
          deductions: deductions,
          netPay: netPay,
          hoursWorked: {
            regular: regularHours,
            overtime: overtimeHours,
            total: totalHours
          },
          hourlyRate: employee.salary?.base / (employee.workSchedule?.hoursPerWeek || 40) / 4,
          overtimeRate: (employee.salary?.base / (employee.workSchedule?.hoursPerWeek || 40) / 4) * 1.5,
          status: 'pending',
          components: employee.salary?.components || []
        });

        await payrollRecord.save();
        await payrollRecord.populate('employeeId', 'employeeId jobTitle');
        processedRecords.push(payrollRecord);
      }

      return {
        success: true,
        processed: processedRecords.length,
        records: processedRecords
      };
    } catch (error) {
      console.error('Error processing payroll:', error);
      throw error;
    }
  }

  /**
   * Get payroll record by ID
   * @param {string} orgId - Organization ID
   * @param {string} payrollId - Payroll record ID
   * @returns {Object} Payroll record
   */
  async getPayrollRecordById(orgId, payrollId) {
    try {
      const payroll = await PayrollRecord.findById(payrollId)
        .populate('employeeId', 'employeeId jobTitle department')
        .populate('userId', 'fullName email')
        .populate('approvedBy', 'fullName email');

      if (!payroll) {
        throw new Error('Payroll record not found');
      }

      // Verify employee belongs to org
      const employee = await Employee.findById(payroll.employeeId);
      if (!employee || employee.orgId.toString() !== orgId.toString()) {
        throw new Error('Payroll record not found for this organization');
      }

      return payroll;
    } catch (error) {
      console.error('Error getting payroll record:', error);
      throw error;
    }
  }

  /**
   * Approve payroll record
   * @param {string} orgId - Organization ID
   * @param {string} payrollId - Payroll record ID
   * @param {string} approvedBy - User ID who approved
   * @returns {Object} Approved payroll record
   */
  async approvePayroll(orgId, payrollId, approvedBy) {
    try {
      const payroll = await this.getPayrollRecordById(orgId, payrollId);

      payroll.status = 'approved';
      payroll.approvedBy = approvedBy;
      payroll.approvedAt = new Date();
      await payroll.save();

      return payroll;
    } catch (error) {
      console.error('Error approving payroll:', error);
      throw error;
    }
  }

  /**
   * Calculate deductions
   * @param {number} grossPay - Gross pay amount
   * @param {Object} employee - Employee document
   * @returns {Object} Deductions breakdown
   */
  calculateDeductions(grossPay, employee) {
    // Federal tax (simplified - would use tax tables in production)
    const federalTaxRate = 0.15; // 15% simplified
    const federalTax = grossPay * federalTaxRate;

    // State tax (simplified)
    const stateTaxRate = 0.05; // 5% simplified
    const stateTax = grossPay * stateTaxRate;

    // Social Security (6.2% up to wage base)
    const socialSecurityRate = 0.062;
    const socialSecurityWageBase = 160200; // 2024 wage base
    const socialSecurity = Math.min(grossPay * socialSecurityRate, socialSecurityWageBase * socialSecurityRate);

    // Medicare (1.45%)
    const medicareRate = 0.0145;
    const medicare = grossPay * medicareRate;

    // Other deductions from employee salary components
    let otherDeductions = 0;
    if (employee.salary?.components) {
      employee.salary.components.forEach(component => {
        if (component.type === 'deduction') {
          otherDeductions += component.amount || 0;
        }
      });
    }

    const total = federalTax + stateTax + socialSecurity + medicare + otherDeductions;

    return {
      federalTax: federalTax,
      stateTax: stateTax,
      socialSecurity: socialSecurity,
      medicare: medicare,
      other: otherDeductions,
      total: total
    };
  }
}

module.exports = new PayrollService();
