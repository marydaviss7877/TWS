const express = require('express');
const { body, query } = require('express-validator');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const ValidationMiddleware = require('../../../middleware/validation/validation');
const { checkFeatureAccessSoftwareHouseOnly } = require('../../../middleware/common/featureGate');
const { PayrollRecord, PayrollRule, PayrollCycle } = require('../../../models/Payroll');

// UPR Phase 1.4 + 4.2: payroll uses requireErpAccess (resolved permissions + hrSubRole) and checkRevocation
const payrollRead = requireErpAccess({ module: 'payroll', action: 'read', checkRevocation: true, sensitive: true, auditResourceType: 'payroll' });
const payrollReadOrOwn = requireErpAccess({ module: 'payroll', action: ['read', 'read_own'], checkRevocation: true, sensitive: true, auditResourceType: 'payroll' });
const payrollWrite = requireErpAccess({ module: 'payroll', action: 'write', checkRevocation: true, sensitive: true, auditResourceType: 'payroll' });
const payrollAdmin = requireErpAccess({ module: 'payroll', action: 'admin', checkRevocation: true, sensitive: true, auditResourceType: 'payroll' });

async function shouldFilterPayrollToOwn(req) {
  const { getResolvedPermissions, hasPermission } = require('../../../services/tenant/permissionResolver.service');
  const tenantId = req.tenant?._id || req.tenantContext?.tenantId || req.user?.tenantId;
  const resolved = await getResolvedPermissions(req.user._id, tenantId, {
    hrSubRole: req.user.hrSubRole,
    financeSubRole: req.user.financeSubRole
  });
  return !hasPermission(resolved.permissions, 'payroll', 'read');
}
const { AIPayrollConfig, AIPayrollAnalytics, SmartPayrollProcessing, EmployeeAIInsights } = require('../../../models/AIPayroll');
const Employee = require('../../../models/Employee');
const User = require('../../../models/User');
const aiPayrollService = require('../../../services/aiPayrollService');

const router = express.Router();

// Plan feature gate: payroll only for Software House plans that include it; others skip
router.use(checkFeatureAccessSoftwareHouseOnly('payroll'));

async function buildOrgScopedPayrollFilter(req, extraFilter = {}) {
  const orgId = req.orgId || req.user?.orgId || req.tenantContext?.orgId;
  if (!orgId) {
    throw new Error('Organization context required');
  }

  const employees = await Employee.find({ orgId }).select('_id').lean();
  const employeeIds = employees.map((employee) => employee._id);
  return { ...extraFilter, orgId, employeeId: { $in: employeeIds } };
}

async function assertPayrollRecordInOrg(req, payrollId) {
  const orgId = req.orgId || req.user?.orgId || req.tenantContext?.orgId;
  if (!orgId) return null;
  const payrollRecord = await PayrollRecord.findOne({ _id: payrollId, orgId });
  return payrollRecord || null;
}

// AI Payroll Configuration
router.get('/ai/config', [
  payrollRead
], ErrorHandler.asyncHandler(async (req, res) => {
  const config = await AIPayrollConfig.findOne({ organizationId: req.user.organization });
  
  res.json({
    success: true,
    data: { config }
  });
}));

router.post('/ai/config', [
  payrollAdmin,
  body('aiSettings').isObject(),
  body('integrations').isObject()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { aiSettings, integrations } = req.body;
  
  const config = await aiPayrollService.initializeAIPayroll(
    req.user.organization,
    { aiSettings, integrations }
  );
  
  res.json({
    success: true,
    message: 'AI Payroll configuration updated',
    data: { config }
  });
}));

// AI Predictive Analytics
router.get('/ai/forecast', [
  payrollRead,
  query('period').optional().isInt({ min: 1, max: 24 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const forecastPeriod = parseInt(req.query.period) || 6;
  
  const forecast = await aiPayrollService.predictSalaryForecasting(
    req.user.organization,
    forecastPeriod
  );
  
  res.json({
    success: true,
    data: { forecast }
  });
}));

// AI Anomaly Detection
router.get('/ai/anomalies', [
  payrollRead,
  query('period').optional().isIn(['current_month', 'last_month', 'quarter'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const period = req.query.period || 'current_month';
  
  const anomalies = await aiPayrollService.detectAnomalies(
    req.user.organization,
    period
  );
  
  res.json({
    success: true,
    data: anomalies
  });
}));

// Smart Payroll Processing
router.post('/ai/process', [
  payrollWrite,
  body('period.start').isISO8601(),
  body('period.end').isISO8601(),
  body('options').optional().isObject()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { period, options = {} } = req.body;
  
  const result = await aiPayrollService.processSmartPayroll(
    req.user.organization,
    period,
    options
  );
  
  res.json({
    success: true,
    message: 'Smart payroll processing initiated',
    data: result
  });
}));

// Get Smart Processing Status
router.get('/ai/process/:batchId', [
  payrollRead
], ErrorHandler.asyncHandler(async (req, res) => {
  const processing = await SmartPayrollProcessing.findOne({
    batchId: req.params.batchId,
    organizationId: req.user.organization
  });
  
  if (!processing) {
    return res.status(404).json({
      success: false,
      message: 'Processing batch not found'
    });
  }
  
  res.json({
    success: true,
    data: { processing }
  });
}));

// Dynamic Payroll Adjustments
router.post('/ai/adjust/:employeeId', [
  payrollWrite,
  body('adjustmentType').isIn(['overtime', 'shift_differential', 'performance_bonus', 'cost_of_living', 'market_adjustment']),
  body('data').isObject()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { adjustmentType, data } = req.body;
  
  const adjustment = await aiPayrollService.dynamicPayrollAdjustments(
    req.user.organization,
    req.params.employeeId,
    adjustmentType,
    data
  );
  
  res.json({
    success: true,
    message: 'Dynamic adjustment applied',
    data: adjustment
  });
}));

// Employee AI Insights
router.get('/ai/insights/:employeeId', [
  payrollReadOrOwn
], ErrorHandler.asyncHandler(async (req, res) => {
  // Resource-level: viewing others requires payroll:read
  if (req.params.employeeId !== req.user._id.toString() && await shouldFilterPayrollToOwn(req)) {
    return res.status(403).json({ success: false, message: 'Not authorized to view employee insights' });
  }
  const insights = await aiPayrollService.generateEmployeeInsights(
    req.params.employeeId,
    req.user.organization
  );
  
  res.json({
    success: true,
    data: { insights }
  });
}));

// Workforce Cost Optimization
router.get('/ai/optimize', [
  payrollAdmin
], ErrorHandler.asyncHandler(async (req, res) => {
  const optimization = await aiPayrollService.optimizeWorkforceCosts(
    req.user.organization
  );
  
  res.json({
    success: true,
    data: optimization
  });
}));

// Compliance Processing
router.post('/ai/compliance', [
  payrollWrite,
  body('region').optional().isString()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { region = 'US' } = req.body;
  
  const compliance = await aiPayrollService.processComplianceAdjustments(
    req.user.organization,
    region
  );
  
  res.json({
    success: true,
    message: 'Compliance adjustments processed',
    data: compliance
  });
}));

// AI Analytics Dashboard Data
router.get('/ai/analytics', [
  payrollRead,
  query('period').optional().isIn(['week', 'month', 'quarter', 'year'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';
  
  // Get the latest analytics for the organization
  const analytics = await AIPayrollAnalytics.findOne({
    organizationId: req.user.organization,
    'period.type': period
  }).sort({ createdAt: -1 });
  
  // Get processing statistics
  const processingStats = await SmartPayrollProcessing.aggregate([
    { $match: { organizationId: req.user.organization } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgProcessingTime: { $avg: '$summary.processingTime' }
      }
    }
  ]);
  
  // Get employee insights summary
  const insightsSummary = await EmployeeAIInsights.aggregate([
    { $match: { organizationId: req.user.organization } },
    {
      $group: {
        _id: null,
        avgProductivityScore: { $avg: '$performanceAnalytics.productivityScore' },
        avgUtilization: { $avg: '$performanceAnalytics.billableUtilization' },
        totalEmployees: { $sum: 1 }
      }
    }
  ]);
  
  res.json({
    success: true,
    data: {
      analytics,
      processingStats,
      insightsSummary: insightsSummary[0] || {}
    }
  });
}));

// Bulk Operations
router.post('/ai/bulk-approve', [
  payrollWrite,
  body('batchId').isString(),
  body('approvalComments').optional().isString()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { batchId, approvalComments } = req.body;
  
  const processing = await SmartPayrollProcessing.findOne({
    batchId,
    organizationId: req.user.organization
  });
  
  if (!processing) {
    return res.status(404).json({
      success: false,
      message: 'Processing batch not found'
    });
  }
  
  if (processing.status !== 'review_required') {
    return res.status(400).json({
      success: false,
      message: 'Batch not ready for approval'
    });
  }
  
  // Update processing status
  processing.status = 'approved';
  processing.approvals.push({
    approver: req.user._id,
    approvedAt: new Date(),
    level: 'final',
    comments: approvalComments
  });
  
  await processing.save();
  
  // Materialize payroll records from AI processing output when available
  const generated = [];
  const resultRows = Array.isArray(processing.results) ? processing.results : [];
  for (const row of resultRows) {
    const employeeId = row.employeeId || row.employee?._id;
    const userId = row.userId || row.user?._id;
    if (!employeeId || !userId) continue;
    const periodStart = row.periodStart || processing.period?.start;
    const periodEnd = row.periodEnd || processing.period?.end;
    if (!periodStart || !periodEnd) continue;

    const orgId = req.orgId || req.user?.orgId || req.tenantContext?.orgId;
    const existing = await PayrollRecord.findOne({
      orgId,
      employeeId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd)
    });
    if (existing) {
      generated.push(existing);
      continue;
    }

    const grossPay = Number(row.grossPay || 0);
    const totalDeductions = Number(row.deductions?.total || row.totalDeductions || 0);
    const netPay = Number(row.netPay || (grossPay - totalDeductions));
    const payrollRecord = await PayrollRecord.create({
      orgId,
      tenantId: req.tenantContext?.tenantId || req.tenant?._id || null,
      employeeId,
      userId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      components: Array.isArray(row.components) ? row.components : [{ name: 'Base Salary', amount: grossPay, type: 'earnings' }],
      grossPay,
      deductions: { total: totalDeductions },
      netPay,
      status: 'approved',
      approvedBy: req.user._id,
      approvedAt: new Date(),
      notes: approvalComments || 'Generated by AI bulk approval'
    });
    generated.push(payrollRecord);
  }
  
  res.json({
    success: true,
    message: 'Payroll batch approved successfully',
    data: { processing, generatedCount: generated.length }
  });
}));

// AI Recommendations
router.get('/ai/recommendations', [
  payrollRead
], ErrorHandler.asyncHandler(async (req, res) => {
  const analytics = await AIPayrollAnalytics.findOne({
    organizationId: req.user.organization
  }).sort({ createdAt: -1 });
  
  const recommendations = analytics ? analytics.recommendations : [];
  
  res.json({
    success: true,
    data: { recommendations }
  });
}));

// Get payroll preview
router.get('/preview', [
  payrollRead,
  query('employeeId').optional().isMongoId(),
  query('period').isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { employeeId, period } = req.query;
  const periodDate = new Date(period);

  // Calculate period start and end
  const periodStart = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1);
  const periodEnd = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0);

  const orgId = req.orgId || req.user?.orgId || req.tenantContext?.orgId;
  if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
  const filter = { orgId };
  if (employeeId) filter.employeeId = employeeId;

  const employees = await Employee.find(filter).populate('userId', 'fullName email');

  const preview = await Promise.all(employees.map(async (employee) => {
    // Calculate hours worked (simplified)
    const hoursWorked = 160; // Default 40 hours/week * 4 weeks
    const hourlyRate = employee.salary.base / 160;
    const grossPay = hoursWorked * hourlyRate;

    // Apply payroll rules
    const rules = await PayrollRule.find({ active: true, orgId });
    let deductions = 0;
    let netPay = grossPay;

    rules.forEach(rule => {
      if (rule.calculation.method === 'percentage') {
        const deduction = grossPay * (rule.calculation.value / 100);
        deductions += deduction;
      }
    });

    netPay = grossPay - deductions;

    return {
      payrollEmployeeId: employee._id,
      employeeName: employee.userId.fullName,
      employeeId: employee.employeeId,
      hoursWorked,
      hourlyRate,
      grossPay,
      deductions,
      netPay,
      periodStart,
      periodEnd
    };
  }));

  res.json({
    success: true,
    data: { preview }
  });
}));

// Generate payroll
router.post('/generate', [
  payrollWrite,
  body('periodStart').isISO8601(),
  body('periodEnd').isISO8601(),
  body('employeeIds').isArray()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { periodStart, periodEnd, employeeIds } = req.body;
  const orgId = req.orgId || req.user?.orgId || req.tenantContext?.orgId;
  if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });

  const payrollRecords = [];

  for (const employeeId of employeeIds) {
    const employee = await Employee.findOne({ _id: employeeId, orgId }).populate('userId', 'fullName email');
    if (!employee) continue;

    const existing = await PayrollRecord.findOne({
      orgId,
      employeeId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd)
    });
    if (existing) {
      payrollRecords.push(existing);
      continue;
    }

    // Calculate payroll (simplified)
    const hoursWorked = 160;
    const hourlyRate = employee.salary.base / 160;
    const grossPay = hoursWorked * hourlyRate;

    // Apply deductions
    const rules = await PayrollRule.find({ active: true, orgId });
    let deductions = 0;

    rules.forEach(rule => {
      if (rule.calculation.method === 'percentage') {
        deductions += grossPay * (rule.calculation.value / 100);
      }
    });

    const netPay = grossPay - deductions;

    const payrollRecord = new PayrollRecord({
      orgId,
      tenantId: req.tenantContext?.tenantId || req.tenant?._id || null,
      employeeId,
      userId: employee.userId._id,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      components: [
        { name: 'Base Salary', amount: grossPay, type: 'earnings' },
        { name: 'Tax Deduction', amount: deductions, type: 'deduction' }
      ],
      grossPay,
      deductions: { total: deductions },
      netPay,
      hoursWorked: { regular: hoursWorked, total: hoursWorked },
      hourlyRate,
      status: 'draft'
    });

    await payrollRecord.save();
    payrollRecords.push(payrollRecord);
  }

  res.status(201).json({
    success: true,
    message: 'Payroll generated successfully',
    data: { payrollRecords }
  });
}));

// Approve payroll
router.post('/:id/approve', [
  payrollWrite,
  body('notes').optional().notEmpty()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { notes } = req.body;
  const payrollRecord = await assertPayrollRecordInOrg(req, req.params.id);

  if (!payrollRecord) {
    return res.status(404).json({
      success: false,
      message: 'Payroll record not found'
    });
  }

  payrollRecord.status = 'approved';
  payrollRecord.approvedBy = req.user._id;
  payrollRecord.approvedAt = new Date();
  payrollRecord.notes = notes;

  await payrollRecord.save();

  res.json({
    success: true,
    message: 'Payroll approved successfully',
    data: { payrollRecord }
  });
}));

// Get payslip (Plan: employee can view own slip via payroll:read_own)
router.get('/:id/payslip', payrollReadOrOwn, ErrorHandler.asyncHandler(async (req, res) => {
  const scopedRecord = await assertPayrollRecordInOrg(req, req.params.id);
  const payrollRecord = scopedRecord
    ? await PayrollRecord.findById(req.params.id)
    .populate('employeeId')
    .populate('userId', 'fullName email')
    : null;

  if (!payrollRecord) {
    return res.status(404).json({
      success: false,
      message: 'Payroll record not found'
    });
  }

  // Resource-level: if user has payroll:read_own only, must be own record
  const userIdStr = req.user._id.toString();
  const recordUserId = payrollRecord.userId?._id?.toString?.() || payrollRecord.userId?.toString?.();
  if (recordUserId !== userIdStr) {
    const { getResolvedPermissions, hasPermission } = require('../../../services/tenant/permissionResolver.service');
    const tenantId = req.tenant?._id || req.tenantContext?.tenantId || req.user?.tenantId;
    const resolved = await getResolvedPermissions(req.user._id, tenantId, {
    hrSubRole: req.user.hrSubRole,
    financeSubRole: req.user.financeSubRole
  });
    if (!hasPermission(resolved.permissions, 'payroll', 'read')) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this payslip' });
    }
  }

  res.json({
    success: true,
    data: { payrollRecord }
  });
}));

// Get payroll statistics
router.get('/stats', [
  payrollReadOrOwn
], ErrorHandler.asyncHandler(async (req, res) => {
  const filter = await buildOrgScopedPayrollFilter(req);
  if (await shouldFilterPayrollToOwn(req)) filter.userId = req.user._id;

  const totalPayroll = await PayrollRecord.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: '$netPay' } } }
  ]);

  const employeesPaid = await PayrollRecord.distinct('employeeId', filter).then(ids => ids.length);
  const pendingApprovals = await PayrollRecord.countDocuments({ ...filter, status: 'pending' });
  
  const currentMonth = new Date();
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  const thisMonth = await PayrollRecord.aggregate([
    { 
      $match: { 
        ...filter, 
        createdAt: { $gte: monthStart, $lte: monthEnd }
      } 
    },
    { $group: { _id: null, total: { $sum: '$netPay' } } }
  ]);

  const averageSalary = await PayrollRecord.aggregate([
    { $match: filter },
    { $group: { _id: null, avg: { $avg: '$netPay' } } }
  ]);

  const totalTaxes = await PayrollRecord.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: '$deductions.total' } } }
  ]);

  res.json({
    success: true,
    data: {
      totalPayroll: totalPayroll[0]?.total || 0,
      employeesPaid: employeesPaid || 0,
      pendingApprovals: pendingApprovals || 0,
      thisMonth: thisMonth[0]?.total || 0,
      averageSalary: averageSalary[0]?.avg || 0,
      totalTaxes: totalTaxes[0]?.total || 0,
      totalBenefits: 0,
      payrollTrend: 'up'
    }
  });
}));

// Get payroll records
router.get('/', [
  payrollReadOrOwn,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['draft', 'pending', 'approved', 'paid', 'cancelled'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = await buildOrgScopedPayrollFilter(req);
  if (req.query.status) filter.status = req.query.status;
  if (await shouldFilterPayrollToOwn(req)) filter.userId = req.user._id;

  const payrollRecords = await PayrollRecord.find(filter)
    .populate('employeeId')
    .populate('userId', 'fullName email')
    .populate('approvedBy', 'fullName email')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await PayrollRecord.countDocuments(filter);

  res.json({
    success: true,
    data: {
      payrollRecords,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// Get payroll settings
router.get('/settings', [
  payrollRead
], ErrorHandler.asyncHandler(async (req, res) => {
  // Return default settings for now
  res.json({
    success: true,
    data: {
      autoProcess: false,
      autoApprove: false,
      autoNotify: true,
      payDay: 1,
      advanceDays: 3,
      taxRates: {
        federal: 22,
        state: 6.5,
        social: 6.2,
        medicare: 1.45
      }
    }
  });
}));

module.exports = router;
