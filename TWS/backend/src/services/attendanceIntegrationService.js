const Attendance = require('../models/hr-payroll/Attendance');
const { PayrollRecord } = require('../models/hr-payroll/Payroll');
const Employee = require('../models/hr-payroll/Employee');
const Organization = require('../models/org/Organization');

class AttendanceIntegrationService {
  // Integrate attendance data with payroll system
  static async syncWithPayroll(organizationId, payrollPeriod) {
    try {
      const { startDate, endDate } = payrollPeriod;
      
      // Get all attendance records for the period
      const attendanceRecords = await Attendance.find({
        organizationId,
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        },
        hrApproved: true // Only sync approved records
      }).populate('userId', 'fullName email');

      // Group by employee
      const employeeAttendance = {};
      attendanceRecords.forEach(record => {
        const employeeId = record.employeeId;
        if (!employeeAttendance[employeeId]) {
          employeeAttendance[employeeId] = {
            employeeId,
            userId: record.userId._id,
            employeeName: record.userId.fullName,
            records: []
          };
        }
        employeeAttendance[employeeId].records.push(record);
      });

      // Calculate payroll data for each employee
      const payrollData = [];
      for (const [employeeId, data] of Object.entries(employeeAttendance)) {
        const employee = await Employee.findOne({ employeeId });
        if (!employee) continue;

        const payrollEntry = await this.calculatePayrollEntry(data, employee, payrollPeriod);
        payrollData.push(payrollEntry);
      }

      // Create or update payroll records
      const payrollResults = [];
      for (const payrollEntry of payrollData) {
        const existingPayroll = await PayrollRecord.findOne({
          employeeId: payrollEntry.employeeId,
          periodStart: payrollEntry.periodStart,
          periodEnd: payrollEntry.periodEnd
        });

        if (existingPayroll) {
          // Update existing payroll record
          Object.assign(existingPayroll, payrollEntry);
          await existingPayroll.save();
          payrollResults.push(existingPayroll);
        } else {
          // Create new payroll record
          const newPayroll = new PayrollRecord(payrollEntry);
          await newPayroll.save();
          payrollResults.push(newPayroll);
        }
      }

      return {
        success: true,
        data: {
          processedEmployees: payrollData.length,
          payrollRecords: payrollResults,
          period: payrollPeriod
        }
      };
    } catch (error) {
      throw new Error(`Payroll sync failed: ${error.message}`);
    }
  }

  // Calculate payroll entry for an employee
  static async calculatePayrollEntry(attendanceData, employee, payrollPeriod) {
    const { records } = attendanceData;
    
    // Calculate total hours
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalBreakHours = 0;
    let workingDays = 0;
    let absentDays = 0;
    let lateDays = 0;

    records.forEach(record => {
      if (record.status === 'present' || record.status === 'late') {
        workingDays++;
        
        // Regular hours (up to 8 hours per day)
        const regularHours = Math.min(record.durationMinutes / 60, 8);
        totalRegularHours += regularHours;
        
        // Overtime hours (beyond 8 hours)
        const overtimeHours = Math.max(0, record.durationMinutes / 60 - 8);
        totalOvertimeHours += overtimeHours;
        
        // Break hours
        const breakHours = record.totalBreakTime / 60;
        totalBreakHours += breakHours;
        
        if (record.status === 'late') {
          lateDays++;
        }
      } else if (record.status === 'absent') {
        absentDays++;
      }
    });

    // Calculate pay rates
    const hourlyRate = employee.hourlyRate || 0;
    const overtimeRate = hourlyRate * 1.5; // Standard overtime multiplier
    
    const regularPay = totalRegularHours * hourlyRate;
    const overtimePay = totalOvertimeHours * overtimeRate;
    const totalPay = regularPay + overtimePay;

    // Calculate deductions
    const lateDeduction = lateDays * (employee.latePenalty || 0);
    const absentDeduction = absentDays * (employee.absentPenalty || 0);
    const totalDeductions = lateDeduction + absentDeduction;

    const netPay = totalPay - totalDeductions;

    return {
      employeeId: employee.employeeId,
      userId: employee.userId,
      periodStart: new Date(payrollPeriod.startDate),
      periodEnd: new Date(payrollPeriod.endDate),
      totalRegularHours: Math.round(totalRegularHours * 100) / 100,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      totalBreakHours: Math.round(totalBreakHours * 100) / 100,
      workingDays,
      absentDays,
      lateDays,
      hourlyRate,
      overtimeRate,
      regularPay: Math.round(regularPay * 100) / 100,
      overtimePay: Math.round(overtimePay * 100) / 100,
      totalPay: Math.round(totalPay * 100) / 100,
      lateDeduction: Math.round(lateDeduction * 100) / 100,
      absentDeduction: Math.round(absentDeduction * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netPay: Math.round(netPay * 100) / 100,
      attendanceRecords: records.length,
      lastUpdated: new Date(),
      status: 'calculated'
    };
  }

  // Generate HR reports
  static async generateHRReport(organizationId, reportType, filters = {}) {
    try {
      const { startDate, endDate, department, employeeId } = filters;
      
      const query = {
        organizationId,
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      if (employeeId) {
        query.userId = employeeId;
      }

      const attendanceRecords = await Attendance.find(query)
        .populate('userId', 'fullName email department')
        .sort({ date: -1 });

      let reportData = {};

      switch (reportType) {
        case 'summary':
          reportData = await this.generateSummaryReport(attendanceRecords);
          break;
        case 'compliance':
          reportData = await this.generateComplianceReport(attendanceRecords);
          break;
        case 'productivity':
          reportData = await this.generateProductivityReport(attendanceRecords);
          break;
        case 'security':
          reportData = await this.generateSecurityReport(attendanceRecords);
          break;
        default:
          throw new Error('Invalid report type');
      }

      return {
        success: true,
        data: {
          reportType,
          filters,
          generatedAt: new Date(),
          ...reportData
        }
      };
    } catch (error) {
      throw new Error(`HR report generation failed: ${error.message}`);
    }
  }

  // Generate summary report
  static async generateSummaryReport(attendanceRecords) {
    const totalRecords = attendanceRecords.length;
    const presentRecords = attendanceRecords.filter(r => r.status === 'present').length;
    const lateRecords = attendanceRecords.filter(r => r.status === 'late').length;
    const absentRecords = attendanceRecords.filter(r => r.status === 'absent').length;
    
    const totalHours = attendanceRecords.reduce((sum, r) => sum + (r.durationMinutes || 0), 0) / 60;
    const totalOvertime = attendanceRecords.reduce((sum, r) => sum + (r.overtimeMinutes || 0), 0) / 60;
    
    const avgQualityScore = attendanceRecords.reduce((sum, r) => sum + (r.qualityScore || 100), 0) / totalRecords;
    
    const riskDistribution = {
      low: attendanceRecords.filter(r => r.riskLevel === 'low').length,
      medium: attendanceRecords.filter(r => r.riskLevel === 'medium').length,
      high: attendanceRecords.filter(r => r.riskLevel === 'high').length,
      critical: attendanceRecords.filter(r => r.riskLevel === 'critical').length
    };

    return {
      totalRecords,
      presentRecords,
      lateRecords,
      absentRecords,
      totalHours: Math.round(totalHours * 100) / 100,
      totalOvertime: Math.round(totalOvertime * 100) / 100,
      avgQualityScore: Math.round(avgQualityScore * 100) / 100,
      riskDistribution,
      attendanceRate: totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0
    };
  }

  // Generate compliance report
  static async generateComplianceReport(attendanceRecords) {
    const complianceIssues = [];
    
    attendanceRecords.forEach(record => {
      if (record.securityFlags && record.securityFlags.length > 0) {
        complianceIssues.push({
          date: record.date,
          employeeId: record.employeeId,
          issues: record.securityFlags,
          riskLevel: record.riskLevel,
          qualityScore: record.qualityScore
        });
      }
    });

    const policyViolations = complianceIssues.filter(issue => 
      issue.issues.some(flag => 
        ['unusual_location', 'after_hours_access', 'weekend_access'].includes(flag)
      )
    );

    const securityConcerns = complianceIssues.filter(issue => 
      issue.issues.some(flag => 
        ['multiple_devices', 'suspicious_ip', 'proxy_detection'].includes(flag)
      )
    );

    return {
      totalComplianceIssues: complianceIssues.length,
      policyViolations: policyViolations.length,
      securityConcerns: securityConcerns.length,
      complianceRate: attendanceRecords.length > 0 ? 
        Math.round(((attendanceRecords.length - complianceIssues.length) / attendanceRecords.length) * 100) : 100,
      issues: complianceIssues
    };
  }

  // Generate productivity report
  static async generateProductivityReport(attendanceRecords) {
    const productivityMetrics = attendanceRecords.map(record => ({
      date: record.date,
      employeeId: record.employeeId,
      duration: record.durationMinutes,
      overtime: record.overtimeMinutes,
      breaks: record.breakTime.length,
      breakDuration: record.totalBreakTime,
      qualityScore: record.qualityScore,
      netWorkingTime: record.netWorkingTime
    }));

    const avgDuration = productivityMetrics.reduce((sum, m) => sum + m.duration, 0) / productivityMetrics.length;
    const avgOvertime = productivityMetrics.reduce((sum, m) => sum + m.overtime, 0) / productivityMetrics.length;
    const avgBreaks = productivityMetrics.reduce((sum, m) => sum + m.breaks, 0) / productivityMetrics.length;
    const avgBreakDuration = productivityMetrics.reduce((sum, m) => sum + m.breakDuration, 0) / productivityMetrics.length;
    const avgQualityScore = productivityMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / productivityMetrics.length;

    return {
      avgDuration: Math.round(avgDuration * 100) / 100,
      avgOvertime: Math.round(avgOvertime * 100) / 100,
      avgBreaks: Math.round(avgBreaks * 100) / 100,
      avgBreakDuration: Math.round(avgBreakDuration * 100) / 100,
      avgQualityScore: Math.round(avgQualityScore * 100) / 100,
      productivityScore: Math.round(avgQualityScore * 0.8 + (100 - (avgBreakDuration / avgDuration) * 100) * 0.2),
      metrics: productivityMetrics
    };
  }

  // Generate security report
  static async generateSecurityReport(attendanceRecords) {
    const securityEvents = attendanceRecords.filter(record => 
      record.securityFlags && record.securityFlags.length > 0
    );

    const riskDistribution = {
      low: securityEvents.filter(e => e.riskLevel === 'low').length,
      medium: securityEvents.filter(e => e.riskLevel === 'medium').length,
      high: securityEvents.filter(e => e.riskLevel === 'high').length,
      critical: securityEvents.filter(e => e.riskLevel === 'critical').length
    };

    const flagDistribution = {};
    securityEvents.forEach(event => {
      event.securityFlags.forEach(flag => {
        flagDistribution[flag] = (flagDistribution[flag] || 0) + 1;
      });
    });

    const avgQualityScore = securityEvents.length > 0 ? 
      securityEvents.reduce((sum, e) => sum + e.qualityScore, 0) / securityEvents.length : 100;

    return {
      totalSecurityEvents: securityEvents.length,
      riskDistribution,
      flagDistribution,
      avgQualityScore: Math.round(avgQualityScore * 100) / 100,
      securityScore: Math.round((100 - (securityEvents.length / attendanceRecords.length) * 100) * 100) / 100,
      events: securityEvents.map(event => ({
        date: event.date,
        employeeId: event.employeeId,
        flags: event.securityFlags,
        riskLevel: event.riskLevel,
        qualityScore: event.qualityScore
      }))
    };
  }

  // Auto-approve attendance based on rules
  static async autoApproveAttendance(organizationId, rules = {}) {
    try {
      const {
        qualityThreshold = 90,
        riskThreshold = 'medium',
        requireManagerApproval = false
      } = rules;

      const query = {
        organizationId,
        hrApproved: false,
        qualityScore: { $gte: qualityThreshold }
      };

      // Only auto-approve low and medium risk records
      if (riskThreshold === 'medium') {
        query.riskLevel = { $in: ['low', 'medium'] };
      } else if (riskThreshold === 'low') {
        query.riskLevel = 'low';
      }

      const eligibleRecords = await Attendance.find(query);

      const approvalResults = [];
      for (const record of eligibleRecords) {
        record.hrApproved = true;
        record.hrApprovedAt = new Date();
        record.hrApprovedBy = null; // System approval
        
        await record.save();
        approvalResults.push(record);
      }

      return {
        success: true,
        data: {
          autoApproved: approvalResults.length,
          records: approvalResults
        }
      };
    } catch (error) {
      throw new Error(`Auto-approval failed: ${error.message}`);
    }
  }

  // Export attendance data for external systems
  static async exportForExternalSystem(organizationId, systemType, filters = {}) {
    try {
      const { startDate, endDate, format = 'json' } = filters;
      
      const attendanceRecords = await Attendance.find({
        organizationId,
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }).populate('userId', 'fullName email department');

      let exportData;

      switch (systemType) {
        case 'adp':
          exportData = this.formatForADP(attendanceRecords);
          break;
        case 'workday':
          exportData = this.formatForWorkday(attendanceRecords);
          break;
        case 'bamboo':
          exportData = this.formatForBambooHR(attendanceRecords);
          break;
        case 'generic':
          exportData = this.formatGeneric(attendanceRecords);
          break;
        default:
          throw new Error('Unsupported system type');
      }

      return {
        success: true,
        data: {
          systemType,
          format,
          recordCount: attendanceRecords.length,
          exportData
        }
      };
    } catch (error) {
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  // Format data for ADP
  static formatForADP(attendanceRecords) {
    return attendanceRecords.map(record => ({
      employee_id: record.employeeId,
      date: record.date.toISOString().split('T')[0],
      clock_in: record.checkIn?.timestamp?.toISOString() || null,
      clock_out: record.checkOut?.timestamp?.toISOString() || null,
      hours_worked: record.durationMinutes / 60,
      overtime_hours: record.overtimeMinutes / 60,
      status: record.status,
      location: record.checkIn?.location?.address || 'Unknown'
    }));
  }

  // Format data for Workday
  static formatForWorkday(attendanceRecords) {
    return attendanceRecords.map(record => ({
      Worker_ID: record.employeeId,
      Time_Date: record.date.toISOString().split('T')[0],
      Time_In: record.checkIn?.timestamp?.toISOString() || null,
      Time_Out: record.checkOut?.timestamp?.toISOString() || null,
      Regular_Hours: Math.min(record.durationMinutes / 60, 8),
      Overtime_Hours: Math.max(0, record.durationMinutes / 60 - 8),
      Attendance_Status: record.status,
      Work_Location: record.location
    }));
  }

  // Format data for BambooHR
  static formatForBambooHR(attendanceRecords) {
    return attendanceRecords.map(record => ({
      employeeId: record.employeeId,
      date: record.date.toISOString().split('T')[0],
      startTime: record.checkIn?.timestamp?.toISOString() || null,
      endTime: record.checkOut?.timestamp?.toISOString() || null,
      totalHours: record.durationMinutes / 60,
      overtimeHours: record.overtimeMinutes / 60,
      breakHours: record.totalBreakTime / 60,
      status: record.status,
      notes: record.checkIn?.notes || ''
    }));
  }

  // Generic format
  static formatGeneric(attendanceRecords) {
    return attendanceRecords.map(record => ({
      employeeId: record.employeeId,
      employeeName: record.userId?.fullName || 'Unknown',
      date: record.date.toISOString().split('T')[0],
      checkIn: record.checkIn?.timestamp?.toISOString() || null,
      checkOut: record.checkOut?.timestamp?.toISOString() || null,
      duration: record.durationMinutes,
      overtime: record.overtimeMinutes,
      breaks: record.breakTime.length,
      breakDuration: record.totalBreakTime,
      status: record.status,
      riskLevel: record.riskLevel,
      qualityScore: record.qualityScore,
      location: record.checkIn?.location?.address || 'Unknown',
      device: record.checkIn?.device?.browser || 'Unknown'
    }));
  }
}

module.exports = AttendanceIntegrationService;
