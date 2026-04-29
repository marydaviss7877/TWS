const { AIPayrollConfig } = require('../../models/hr-payroll/AIPayroll');
const Employee = require('../../models/hr-payroll/Employee');
const Attendance = require('../../models/hr-payroll/Attendance');
const { PayrollRecord } = require('../../models/hr-payroll/Payroll');

class ComplianceService {
  constructor() {
    this.regions = {
      US: {
        federal: {
          minimumWage: 7.25,
          overtimeThreshold: 40,
          overtimeRate: 1.5,
          taxRates: {
            federalIncome: 0.22,
            socialSecurity: 0.062,
            medicare: 0.0145,
            unemployment: 0.006
          }
        },
        states: {
          CA: {
            minimumWage: 16.00,
            overtimeThreshold: 8, // daily
            overtimeRate: 1.5,
            doubleTimeThreshold: 12,
            doubleTimeRate: 2.0,
            stateTax: 0.13,
            sdiRate: 0.009,
            paidSickLeave: true,
            mealBreakRules: {
              required: true,
              duration: 30, // minutes
              threshold: 5 // hours worked
            }
          },
          NY: {
            minimumWage: 15.00,
            overtimeThreshold: 40,
            overtimeRate: 1.5,
            stateTax: 0.08,
            paidFamilyLeave: true,
            disabilityInsurance: 0.005
          },
          TX: {
            minimumWage: 7.25,
            overtimeThreshold: 40,
            overtimeRate: 1.5,
            stateTax: 0,
            rightToWork: true
          }
        }
      },
      UK: {
        minimumWage: 10.42, // GBP per hour
        overtimeThreshold: 48, // weekly
        nationalInsurance: 0.12,
        incomeTax: 0.20,
        pensionContribution: 0.03,
        statutoryHolidays: 28 // days per year
      },
      CA: {
        minimumWage: 15.55, // CAD per hour
        overtimeThreshold: 44, // weekly in most provinces
        overtimeRate: 1.5,
        cpp: 0.0595, // Canada Pension Plan
        ei: 0.0163, // Employment Insurance
        vacationPay: 0.04 // 4% minimum
      },
      AU: {
        minimumWage: 21.38, // AUD per hour
        overtimeThreshold: 38, // weekly
        overtimeRate: 1.5,
        superannuation: 0.105, // 10.5%
        annualLeave: 20 // days per year
      }
    };

    this.laborLaws = {
      US: {
        flsa: {
          // Fair Labor Standards Act
          overtimeEligibility: true,
          childLaborRestrictions: true,
          recordKeepingRequirements: true
        },
        fmla: {
          // Family and Medical Leave Act
          eligibilityThreshold: 1250, // hours in 12 months
          leaveEntitlement: 12 // weeks
        },
        ada: {
          // Americans with Disabilities Act
          reasonableAccommodations: true,
          nonDiscrimination: true
        }
      },
      EU: {
        gdpr: {
          dataProtection: true,
          consentRequired: true,
          rightToErasure: true
        },
        workingTimeDirective: {
          maxWeeklyHours: 48,
          minDailyRest: 11, // hours
          minWeeklyRest: 24, // hours
          minAnnualLeave: 20 // days
        }
      }
    };
  }

  /**
   * Validate payroll compliance for a specific region
   */
  async validatePayrollCompliance(organizationId, payrollRecords, region = 'US', state = null) {
    try {
      const complianceResults = {
        overall: { passed: true, score: 100, issues: [], recommendations: [] },
        wageAndHour: { passed: true, issues: [], recommendations: [] },
        taxation: { passed: true, issues: [], recommendations: [] },
        recordKeeping: { passed: true, issues: [], recommendations: [] },
        discrimination: { passed: true, issues: [], recommendations: [] }
      };

      for (const payroll of payrollRecords) {
        const employee = await Employee.findById(payroll.employeeId).populate('userId');
        const employeeLocation = employee.address?.state || state;

        // Validate wage and hour compliance
        await this.validateWageAndHour(payroll, employee, region, employeeLocation, complianceResults);

        // Validate tax compliance
        await this.validateTaxCompliance(payroll, employee, region, employeeLocation, complianceResults);

        // Validate record keeping
        await this.validateRecordKeeping(payroll, employee, complianceResults);

        // Validate anti-discrimination
        await this.validateAntiDiscrimination(payroll, employee, complianceResults);
      }

      // Calculate overall compliance score
      const totalIssues = Object.values(complianceResults)
        .filter(result => result.issues)
        .reduce((sum, result) => sum + result.issues.length, 0);

      complianceResults.overall.score = Math.max(0, 100 - (totalIssues * 5));
      complianceResults.overall.passed = complianceResults.overall.score >= 80;

      // Aggregate all issues
      complianceResults.overall.issues = Object.values(complianceResults)
        .filter(result => result.issues)
        .flatMap(result => result.issues);

      // Aggregate all recommendations
      complianceResults.overall.recommendations = Object.values(complianceResults)
        .filter(result => result.recommendations)
        .flatMap(result => result.recommendations);

      return complianceResults;
    } catch (error) {
      throw new Error(`Compliance validation failed: ${error.message}`);
    }
  }

  /**
   * Validate wage and hour compliance
   */
  async validateWageAndHour(payroll, employee, region, state, results) {
    const regionRules = this.regions[region];
    const stateRules = state ? regionRules?.states?.[state] : null;
    const applicableRules = stateRules || regionRules?.federal || regionRules;

    if (!applicableRules) {
      results.wageAndHour.issues.push({
        type: 'missing_rules',
        severity: 'medium',
        description: `No wage rules found for ${region}${state ? `/${state}` : ''}`,
        employee: employee.employeeId
      });
      return;
    }

    // Check minimum wage compliance
    const hourlyRate = payroll.hourlyRate || (payroll.grossPay / (payroll.hoursWorked?.total || 1));
    if (hourlyRate < applicableRules.minimumWage) {
      results.wageAndHour.passed = false;
      results.wageAndHour.issues.push({
        type: 'minimum_wage_violation',
        severity: 'high',
        description: `Hourly rate $${hourlyRate.toFixed(2)} below minimum wage $${applicableRules.minimumWage}`,
        employee: employee.employeeId,
        currentRate: hourlyRate,
        requiredRate: applicableRules.minimumWage
      });
    }

    // Check overtime compliance
    const regularHours = payroll.hoursWorked?.regular || 0;
    const overtimeHours = payroll.hoursWorked?.overtime || 0;
    const totalHours = payroll.hoursWorked?.total || 0;

    if (totalHours > applicableRules.overtimeThreshold && overtimeHours === 0) {
      results.wageAndHour.passed = false;
      results.wageAndHour.issues.push({
        type: 'overtime_not_calculated',
        severity: 'high',
        description: `Employee worked ${totalHours} hours but no overtime calculated`,
        employee: employee.employeeId,
        hoursWorked: totalHours,
        overtimeThreshold: applicableRules.overtimeThreshold
      });
    }

    // Check overtime rate
    if (overtimeHours > 0) {
      const expectedOvertimeRate = hourlyRate * applicableRules.overtimeRate;
      const actualOvertimeRate = payroll.overtimeRate || 0;
      
      if (Math.abs(actualOvertimeRate - expectedOvertimeRate) > 0.01) {
        results.wageAndHour.passed = false;
        results.wageAndHour.issues.push({
          type: 'incorrect_overtime_rate',
          severity: 'medium',
          description: `Overtime rate $${actualOvertimeRate} should be $${expectedOvertimeRate.toFixed(2)}`,
          employee: employee.employeeId,
          actualRate: actualOvertimeRate,
          expectedRate: expectedOvertimeRate
        });
      }
    }

    // Check meal break compliance (California specific)
    if (state === 'CA' && applicableRules.mealBreakRules?.required) {
      const attendance = await Attendance.findOne({
        userId: employee.userId._id,
        date: {
          $gte: payroll.periodStart,
          $lte: payroll.periodEnd
        }
      });

      if (attendance && attendance.durationMinutes > (applicableRules.mealBreakRules.threshold * 60)) {
        const mealBreaks = attendance.breakTime.filter(b => b.type === 'lunch');
        if (mealBreaks.length === 0) {
          results.wageAndHour.issues.push({
            type: 'missing_meal_break',
            severity: 'medium',
            description: 'Required meal break not recorded for shift over 5 hours',
            employee: employee.employeeId,
            workDuration: attendance.durationMinutes
          });
        }
      }
    }
  }

  /**
   * Validate tax compliance
   */
  async validateTaxCompliance(payroll, employee, region, state, results) {
    const regionRules = this.regions[region];
    const stateRules = state ? regionRules?.states?.[state] : null;
    const applicableRules = stateRules || regionRules?.federal || regionRules;

    if (!applicableRules || !applicableRules.taxRates) {
      return;
    }

    const grossPay = payroll.grossPay;
    const deductions = payroll.deductions || {};

    // Validate federal income tax
    if (applicableRules.taxRates.federalIncome) {
      const expectedFederalTax = grossPay * applicableRules.taxRates.federalIncome;
      const actualFederalTax = deductions.federalTax || 0;
      
      if (Math.abs(actualFederalTax - expectedFederalTax) > (grossPay * 0.05)) { // 5% tolerance
        results.taxation.issues.push({
          type: 'federal_tax_discrepancy',
          severity: 'medium',
          description: `Federal tax calculation appears incorrect`,
          employee: employee.employeeId,
          expected: expectedFederalTax,
          actual: actualFederalTax,
          difference: Math.abs(actualFederalTax - expectedFederalTax)
        });
      }
    }

    // Validate Social Security tax
    if (applicableRules.taxRates.socialSecurity) {
      const expectedSSTax = grossPay * applicableRules.taxRates.socialSecurity;
      const actualSSTax = deductions.socialSecurity || 0;
      
      if (Math.abs(actualSSTax - expectedSSTax) > 1) { // $1 tolerance
        results.taxation.passed = false;
        results.taxation.issues.push({
          type: 'social_security_tax_error',
          severity: 'high',
          description: `Social Security tax calculation error`,
          employee: employee.employeeId,
          expected: expectedSSTax,
          actual: actualSSTax,
          difference: Math.abs(actualSSTax - expectedSSTax)
        });
      }
    }

    // Validate Medicare tax
    if (applicableRules.taxRates.medicare) {
      const expectedMedicareTax = grossPay * applicableRules.taxRates.medicare;
      const actualMedicareTax = deductions.medicare || 0;
      
      if (Math.abs(actualMedicareTax - expectedMedicareTax) > 1) { // $1 tolerance
        results.taxation.passed = false;
        results.taxation.issues.push({
          type: 'medicare_tax_error',
          severity: 'high',
          description: `Medicare tax calculation error`,
          employee: employee.employeeId,
          expected: expectedMedicareTax,
          actual: actualMedicareTax,
          difference: Math.abs(actualMedicareTax - expectedMedicareTax)
        });
      }
    }

    // Validate state tax (if applicable)
    if (stateRules?.stateTax) {
      const expectedStateTax = grossPay * stateRules.stateTax;
      const actualStateTax = deductions.stateTax || 0;
      
      if (Math.abs(actualStateTax - expectedStateTax) > (grossPay * 0.02)) { // 2% tolerance
        results.taxation.issues.push({
          type: 'state_tax_discrepancy',
          severity: 'medium',
          description: `State tax calculation appears incorrect`,
          employee: employee.employeeId,
          expected: expectedStateTax,
          actual: actualStateTax,
          difference: Math.abs(actualStateTax - expectedStateTax)
        });
      }
    }
  }

  /**
   * Validate record keeping compliance
   */
  async validateRecordKeeping(payroll, employee, results) {
    // Check required payroll record fields
    const requiredFields = [
      'employeeId', 'userId', 'periodStart', 'periodEnd',
      'grossPay', 'netPay', 'hoursWorked'
    ];

    for (const field of requiredFields) {
      if (!payroll[field]) {
        results.recordKeeping.passed = false;
        results.recordKeeping.issues.push({
          type: 'missing_required_field',
          severity: 'medium',
          description: `Missing required field: ${field}`,
          employee: employee.employeeId,
          missingField: field
        });
      }
    }

    // Check if payslip was generated
    if (!payroll.payslipPdfUrl && !payroll.payslipGeneratedAt) {
      results.recordKeeping.issues.push({
        type: 'missing_payslip',
        severity: 'low',
        description: 'Payslip not generated',
        employee: employee.employeeId
      });
      
      results.recordKeeping.recommendations.push({
        type: 'generate_payslip',
        description: 'Generate and store payslip documentation',
        employee: employee.employeeId
      });
    }

    // Check approval workflow
    if (payroll.status === 'paid' && !payroll.approvedBy) {
      results.recordKeeping.issues.push({
        type: 'missing_approval',
        severity: 'medium',
        description: 'Payroll processed without proper approval',
        employee: employee.employeeId
      });
    }
  }

  /**
   * Validate anti-discrimination compliance
   */
  async validateAntiDiscrimination(payroll, employee, results) {
    // This is a simplified implementation
    // In practice, this would involve complex statistical analysis
    
    try {
      // Get comparable employees for pay equity analysis
      const comparableEmployees = await Employee.find({
        department: employee.department,
        jobTitle: employee.jobTitle,
        status: 'active'
      }).populate('userId');

      if (comparableEmployees.length > 1) {
        // Get recent payroll records for comparison
        const comparablePayrolls = await PayrollRecord.find({
          employeeId: { $in: comparableEmployees.map(e => e._id) },
          periodStart: payroll.periodStart,
          periodEnd: payroll.periodEnd
        });

        if (comparablePayrolls.length > 1) {
          const payRates = comparablePayrolls.map(p => ({
            employeeId: p.employeeId,
            hourlyRate: p.hourlyRate || (p.grossPay / (p.hoursWorked?.total || 1))
          }));

          const avgPayRate = payRates.reduce((sum, p) => sum + p.hourlyRate, 0) / payRates.length;
          const currentEmployeeRate = payroll.hourlyRate || (payroll.grossPay / (payroll.hoursWorked?.total || 1));

          // Flag if pay is significantly below average (20% threshold)
          if (currentEmployeeRate < (avgPayRate * 0.8)) {
            results.discrimination.issues.push({
              type: 'potential_pay_inequity',
              severity: 'low',
              description: 'Pay rate significantly below department average',
              employee: employee.employeeId,
              currentRate: currentEmployeeRate,
              averageRate: avgPayRate,
              difference: ((avgPayRate - currentEmployeeRate) / avgPayRate) * 100
            });

            results.discrimination.recommendations.push({
              type: 'review_compensation',
              description: 'Review compensation for potential inequity',
              employee: employee.employeeId
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in anti-discrimination validation:', error);
    }
  }

  /**
   * Generate compliance remediation plan
   */
  async generateRemediationPlan(complianceResults) {
    const plan = {
      immediate: [], // Critical issues requiring immediate action
      shortTerm: [], // Issues to resolve within 30 days
      longTerm: [], // Process improvements over 90 days
      preventive: [] // Measures to prevent future issues
    };

    for (const issue of complianceResults.overall.issues) {
      const action = {
        issue: issue,
        priority: this.getPriorityLevel(issue.severity),
        estimatedCost: this.estimateRemediationCost(issue),
        timeline: this.getRemediationTimeline(issue),
        steps: this.getRemediationSteps(issue)
      };

      if (issue.severity === 'high') {
        plan.immediate.push(action);
      } else if (issue.severity === 'medium') {
        plan.shortTerm.push(action);
      } else {
        plan.longTerm.push(action);
      }
    }

    // Add preventive measures
    plan.preventive = [
      {
        type: 'automated_compliance_checking',
        description: 'Implement automated compliance validation in payroll processing',
        timeline: '60 days',
        estimatedCost: 5000
      },
      {
        type: 'regular_compliance_audits',
        description: 'Schedule quarterly compliance reviews',
        timeline: 'Ongoing',
        estimatedCost: 2000
      },
      {
        type: 'compliance_training',
        description: 'Provide compliance training to HR and payroll staff',
        timeline: '30 days',
        estimatedCost: 1500
      }
    ];

    return plan;
  }

  /**
   * Monitor real-time compliance
   */
  async monitorRealTimeCompliance(organizationId) {
    try {
      const config = await AIPayrollConfig.findOne({ organizationId });
      if (!config?.aiSettings?.compliance?.complianceChecks?.frequency) {
        return null;
      }

      const frequency = config.aiSettings.compliance.complianceChecks.frequency;
      const lastCheck = await this.getLastComplianceCheck(organizationId);
      
      if (this.shouldRunComplianceCheck(lastCheck, frequency)) {
        return await this.runComplianceCheck(organizationId);
      }

      return null;
    } catch (error) {
      throw new Error(`Real-time compliance monitoring failed: ${error.message}`);
    }
  }

  /**
   * Helper methods
   */
  getPriorityLevel(severity) {
    const priorities = {
      high: 'Critical',
      medium: 'High',
      low: 'Medium'
    };
    return priorities[severity] || 'Low';
  }

  estimateRemediationCost(issue) {
    const baseCosts = {
      minimum_wage_violation: 1000,
      overtime_not_calculated: 2000,
      incorrect_overtime_rate: 500,
      federal_tax_discrepancy: 750,
      social_security_tax_error: 500,
      medicare_tax_error: 300,
      missing_required_field: 100,
      missing_approval: 200,
      potential_pay_inequity: 5000
    };
    return baseCosts[issue.type] || 500;
  }

  getRemediationTimeline(issue) {
    const timelines = {
      minimum_wage_violation: '1 day',
      overtime_not_calculated: '3 days',
      incorrect_overtime_rate: '1 day',
      federal_tax_discrepancy: '7 days',
      social_security_tax_error: '3 days',
      medicare_tax_error: '3 days',
      missing_required_field: '1 day',
      missing_approval: '1 day',
      potential_pay_inequity: '30 days'
    };
    return timelines[issue.type] || '7 days';
  }

  getRemediationSteps(issue) {
    const steps = {
      minimum_wage_violation: [
        'Immediately adjust employee hourly rate',
        'Calculate back pay owed',
        'Issue supplemental payment',
        'Update payroll system with correct rate'
      ],
      overtime_not_calculated: [
        'Identify all affected pay periods',
        'Calculate overtime hours and pay',
        'Issue back pay for overtime',
        'Update overtime calculation rules'
      ],
      social_security_tax_error: [
        'Recalculate correct Social Security tax',
        'File amended tax returns if necessary',
        'Adjust future payroll calculations',
        'Update tax calculation engine'
      ]
    };
    return steps[issue.type] || ['Review issue details', 'Implement corrective action', 'Verify resolution'];
  }

  shouldRunComplianceCheck(lastCheck, frequency) {
    if (!lastCheck) return true;
    
    const now = new Date();
    const lastCheckDate = new Date(lastCheck);
    const hoursSinceLastCheck = (now - lastCheckDate) / (1000 * 60 * 60);
    
    switch (frequency) {
      case 'daily': return hoursSinceLastCheck >= 24;
      case 'weekly': return hoursSinceLastCheck >= 168;
      case 'monthly': return hoursSinceLastCheck >= 720;
      default: return hoursSinceLastCheck >= 24;
    }
  }

  async getLastComplianceCheck(organizationId) {
    // This would query a compliance check log
    // For now, return null to trigger initial check
    return null;
  }

  async runComplianceCheck(organizationId) {
    // Get recent payroll records
    const recentPayrolls = await PayrollRecord.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });

    if (recentPayrolls.length === 0) {
      return null;
    }

    return await this.validatePayrollCompliance(organizationId, recentPayrolls);
  }
}

module.exports = new ComplianceService();
