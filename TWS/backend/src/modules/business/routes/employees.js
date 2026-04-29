const express = require('express');
const mongoose = require('mongoose');
const { body, query } = require('express-validator');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const employeesRead = requireErpAccess({ module: 'employees', action: 'read', checkRevocation: false });
const employeesWrite = requireErpAccess({ module: 'employees', action: 'write', checkRevocation: false });
const ErrorHandler = require('../../../middleware/common/errorHandler');
const ValidationMiddleware = require('../../../middleware/validation/validation');
const Employee = require('../../../models/hr-payroll/Employee');
const User = require('../../../models/users-auth/User');
// ✅ IDOR Fix: Resource access validation
const { validateResourceAccess } = require('../../../middleware/security/resourceAccessCheck');

const router = express.Router();

// Get all employees
router.get('/', [
  employeesRead,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('department').optional().notEmpty(),
  query('status').optional().isIn(['active', 'probation', 'terminated', 'on-leave'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const orgId = req.orgId || req.user?.orgId;
  if (!orgId) return res.status(400).json({ success: false, message: 'Organization context required' });
  const filter = { orgId };
  if (req.query.department) filter.department = req.query.department;
  if (req.query.status) filter.status = req.query.status;

  const employees = await Employee.find(filter)
    .populate('userId', 'fullName email role status')
    .populate('reportingManager', 'fullName email')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await Employee.countDocuments(filter);

  res.json({
    success: true,
    data: {
      employees,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// Get employee by ID
router.get('/:id', employeesRead, validateResourceAccess('Employee', 'id'), // ✅ IDOR Fix: Validate employee belongs to org
  ErrorHandler.asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id)
    .populate('userId', 'fullName email role status')
    .populate('reportingManager', 'fullName email');

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  // Decrypt sensitive data if user has permission
  if (req.user.role === 'hr' || req.user.role === 'admin' || req.user.role === 'owner') {
    employee.decryptSensitiveData();
  }

  res.json({
    success: true,
    data: { employee }
  });
}));

// Create employee
router.post('/', [
  employeesWrite,
  // Accept fullName OR firstName+lastName (both optional here, resolved in handler)
  body('fullName').optional().trim(),
  body('firstName').optional().trim(),
  body('lastName').optional().trim(),
  body('email').isEmail().normalizeEmail(),
  body('employeeId').optional().trim(),
  body('jobTitle').notEmpty().trim(),
  body('department').optional().trim(),
  // Password is optional — auto-generated temp password when omitted
  body('password').optional().isLength({ min: 6 }),
  body('erpRole').optional().isIn(['owner', 'admin', 'manager', 'project_manager', 'hr', 'finance', 'employee', 'contractor']),
  body('hrSubRole').optional().isIn(['manager', 'executive', 'payroll_officer']),
  body('financeSubRole').optional().isIn(['manager', 'accountant', 'analyst', 'ap_officer', 'ar_officer']),
  body('salary.base').optional().isNumeric(),
  body('contractType').optional().isIn(['full-time', 'part-time', 'contract', 'intern']),
  body('hireDate').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const {
    email,
    jobTitle,
    department,
    password,
    salary,
    contractType,
    hireDate,
    reportingManager,
    workSchedule,
    benefits,
    skills,
    address,
    emergencyContact,
    phone
  } = req.body;

  // Resolve fullName: accept fullName field OR firstName+lastName
  const fullName = req.body.fullName ||
    ((req.body.firstName || req.body.lastName)
      ? `${(req.body.firstName || '').trim()} ${(req.body.lastName || '').trim()}`.trim()
      : null);
  if (!fullName) {
    return res.status(400).json({ success: false, message: 'Employee name is required (provide fullName or firstName+lastName)' });
  }

  // Auto-generate a temporary password when none is supplied
  const crypto = require('crypto');
  let temporaryPassword = null;
  const resolvedPassword = password || (() => {
    temporaryPassword = crypto.randomBytes(4).toString('hex'); // 8-char hex
    return temporaryPassword;
  })();

  // ERP portal role defaults to 'employee'
  const erpRole = req.body.erpRole || 'employee';
  const hrSubRole = (erpRole === 'hr' && req.body.hrSubRole) ? req.body.hrSubRole : undefined;
  const financeSubRole = (erpRole === 'finance' && req.body.financeSubRole) ? req.body.financeSubRole : undefined;

  // Auto-generate employeeId when not provided
  const employeeId = req.body.employeeId || `EMP${Date.now()}`;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this email already exists'
    });
  }

  // Check if employee ID already exists (only when a custom ID was provided)
  if (req.body.employeeId) {
    const existingEmployee = await Employee.findOne({ employeeId });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID already exists'
      });
    }
  }

  // Ensure the employee gets assigned to the wolfstack organization
  let orgId = req.user.orgId;
  if (!orgId) {
    // Fallback: Find the wolfstack organization
    const Organization = require('../../../models/org/Organization');
    const wolfstackOrg = await Organization.findOne({ slug: 'wolfstack' });
    if (wolfstackOrg) {
      orgId = wolfstackOrg._id;
    } else {
      return res.status(500).json({
        success: false,
        message: 'Wolfstack organization not found. Please contact administrator.'
      });
    }
  }

  // Create user first (ownership fields injected by middleware)
  const user = new User({
    fullName,
    email,
    phone: req.body.phone,
    password: resolvedPassword,
    role: 'employee',
    orgId: req.body.orgId || orgId,
    status: 'active',
    emailVerified: false,
    mustChangePassword: temporaryPassword !== null, // force password change if auto-generated
    createdBy: req.body.createdBy || req.user?._id
  });

  await user.save();

  // Create employee record with comprehensive data (ownership fields injected by middleware)
  const employeeData = {
    userId: user._id,
    employeeId,
    jobTitle,
    department: department || 'General',
    hireDate: hireDate ? new Date(hireDate) : new Date(),
    contractType: contractType || 'full-time',
    orgId: req.body.orgId || orgId,
    createdBy: req.body.createdBy || req.user?._id,
    salary: {
      base: salary?.base || 50000,
      currency: salary?.currency || 'USD',
      payFrequency: salary?.payFrequency || 'monthly',
      components: salary?.components || [],
      bonuses: []
    },
    status: 'active',
    reportingManager: reportingManager || null,
    workSchedule: workSchedule || {
      type: 'standard',
      hoursPerWeek: 40,
      workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'UTC'
    },
    benefits: benefits || {
      healthInsurance: false,
      dentalInsurance: false,
      visionInsurance: false,
      retirementPlan: false,
      lifeInsurance: false,
      disabilityInsurance: false,
      flexibleSpendingAccount: false,
      healthSavingsAccount: false,
      stockOptions: false,
      equityShares: 0
    },
    skills: skills || [],
    address: address || {},
    emergencyContact: emergencyContact || {},
    performanceMetrics: {
      overallRating: 3,
      goals: [],
      competencies: []
    },
    careerDevelopment: {
      careerLevel: 'entry',
      promotionEligibility: false,
      mentorship: {
        isMentor: false,
        isMentee: false
      }
    },
    compliance: {
      backgroundCheck: { status: 'pending' },
      drugTest: { status: 'pending' },
      certifications: []
    }
  };

  const employee = new Employee(employeeData);
  await employee.save();

  // F4: Provision TenantUser so the new hire has ERP access via UPR
  const TenantUser = require('../../../models/tenant/TenantUser');
  const tenantId = req.tenant?._id || req.user?.tenantId;
  if (tenantId) {
    try {
      const tenantUserDoc = {
        userId: user._id,
        tenantId,
        roles: [{ role: erpRole, permissions: [], assignedBy: req.user._id, assignedAt: new Date() }],
        status: 'active',
        tenantSpecificInfo: {
          employeeId,
          department: department || 'General',
          jobTitle,
          hireDate: hireDate ? new Date(hireDate) : new Date()
        }
      };
      if (hrSubRole) tenantUserDoc.hrSubRole = hrSubRole;
      if (financeSubRole) tenantUserDoc.financeSubRole = financeSubRole;
      await TenantUser.create(tenantUserDoc);
      const { invalidateResolvedPermissions } = require('../../../services/tenant/permissionResolver.service');
      await invalidateResolvedPermissions(tenantId, user._id);
    } catch (tuErr) {
      // Non-fatal: log but don't fail the employee creation
      console.error('TenantUser provision failed for new employee:', tuErr.message);
    }
  }

  // Populate the user data for response
  await employee.populate('userId', 'fullName email role status phone');
  await employee.populate('reportingManager', 'fullName email');

  res.status(201).json({
    success: true,
    message: 'Employee created successfully',
    data: {
      employee,
      // Included only when the system auto-generated the password; admin should share this with the new hire
      ...(temporaryPassword && { temporaryPassword, mustChangePassword: true })
    }
  });
}));

// Update employee
router.patch('/:id', [
  employeesWrite,
  validateResourceAccess('Employee', 'id'), // ✅ IDOR Fix: Validate employee belongs to org
  body('jobTitle').optional().notEmpty().trim(),
  body('department').optional().notEmpty().trim(),
  body('contractType').optional().isIn(['full-time', 'part-time', 'contract', 'intern']),
  body('salary.base').optional().isNumeric(),
  body('reportingManager').optional().isMongoId(),
  body('status').optional().isIn(['active', 'probation', 'terminated', 'on-leave', 'resigned', 'retired']),
  body('hireDate').optional().isISO8601(),
  body('probationEndDate').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const updates = req.body;
  const employeeId = req.params.id;

  // Handle nested updates properly
  const updateData = {};
  
  // Basic fields
  if (updates.jobTitle) updateData.jobTitle = updates.jobTitle;
  if (updates.department) updateData.department = updates.department;
  if (updates.contractType) updateData.contractType = updates.contractType;
  if (updates.status) updateData.status = updates.status;
  if (updates.hireDate) updateData.hireDate = new Date(updates.hireDate);
  if (updates.probationEndDate) updateData.probationEndDate = new Date(updates.probationEndDate);
  if (updates.reportingManager) updateData.reportingManager = updates.reportingManager;

  // Salary updates
  if (updates.salary) {
    updateData.$set = updateData.$set || {};
    if (updates.salary.base) updateData.$set['salary.base'] = updates.salary.base;
    if (updates.salary.currency) updateData.$set['salary.currency'] = updates.salary.currency;
    if (updates.salary.payFrequency) updateData.$set['salary.payFrequency'] = updates.salary.payFrequency;
    if (updates.salary.components) updateData.$set['salary.components'] = updates.salary.components;
  }

  // Work schedule updates
  if (updates.workSchedule) {
    updateData.$set = updateData.$set || {};
    Object.keys(updates.workSchedule).forEach(key => {
      updateData.$set[`workSchedule.${key}`] = updates.workSchedule[key];
    });
  }

  // Benefits updates
  if (updates.benefits) {
    updateData.$set = updateData.$set || {};
    Object.keys(updates.benefits).forEach(key => {
      updateData.$set[`benefits.${key}`] = updates.benefits[key];
    });
  }

  // Skills updates
  if (updates.skills) {
    updateData.$set = updateData.$set || {};
    updateData.$set['skills'] = updates.skills;
  }

  // Address updates
  if (updates.address) {
    updateData.$set = updateData.$set || {};
    Object.keys(updates.address).forEach(key => {
      updateData.$set[`address.${key}`] = updates.address[key];
    });
  }

  // Emergency contact updates
  if (updates.emergencyContact) {
    updateData.$set = updateData.$set || {};
    Object.keys(updates.emergencyContact).forEach(key => {
      updateData.$set[`emergencyContact.${key}`] = updates.emergencyContact[key];
    });
  }

  // Performance metrics updates
  if (updates.performanceMetrics) {
    updateData.$set = updateData.$set || {};
    Object.keys(updates.performanceMetrics).forEach(key => {
      updateData.$set[`performanceMetrics.${key}`] = updates.performanceMetrics[key];
    });
  }

  // Career development updates
  if (updates.careerDevelopment) {
    updateData.$set = updateData.$set || {};
    Object.keys(updates.careerDevelopment).forEach(key => {
      updateData.$set[`careerDevelopment.${key}`] = updates.careerDevelopment[key];
    });
  }

  // Compliance updates
  if (updates.compliance) {
    updateData.$set = updateData.$set || {};
    Object.keys(updates.compliance).forEach(key => {
      updateData.$set[`compliance.${key}`] = updates.compliance[key];
    });
  }

  const employee = await Employee.findByIdAndUpdate(
    employeeId,
    updateData,
    { new: true, runValidators: true }
  ).populate('userId', 'fullName email role status phone')
   .populate('reportingManager', 'fullName email');

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  res.json({
    success: true,
    message: 'Employee updated successfully',
    data: { employee }
  });
}));

// Get employee documents
router.get('/:id/documents', employeesRead, validateResourceAccess('Employee', 'id'), // ✅ IDOR Fix: Validate employee belongs to org
  ErrorHandler.asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id).select('documents');
  
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  res.json({
    success: true,
    data: { documents: employee.documents }
  });
}));

// Upload document
router.post('/:id/documents', [
  employeesWrite,
  validateResourceAccess('Employee', 'id'), // ✅ IDOR Fix: Validate employee belongs to org
  body('fileId').notEmpty(),
  body('fileName').notEmpty(),
  body('fileUrl').notEmpty(),
  body('type').isIn(['contract', 'id', 'certificate', 'other'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { fileId, fileName, fileUrl, type } = req.body;

  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  const document = {
    fileId,
    fileName,
    fileUrl,
    type,
    uploadedAt: new Date(),
    version: 1
  };

  employee.documents.push(document);
  await employee.save();

  res.status(201).json({
    success: true,
    message: 'Document uploaded successfully',
    data: { document }
  });
}));

// Delete document
router.delete('/:id/documents/:docId', employeesWrite, validateResourceAccess('Employee', 'id'), // ✅ IDOR Fix: Validate employee belongs to org
  ErrorHandler.asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  employee.documents = employee.documents.filter(doc => doc._id.toString() !== req.params.docId);
  await employee.save();

  res.json({
    success: true,
    message: 'Document deleted successfully'
  });
}));

// Add performance note
router.post('/:id/performance', [
  employeesWrite,
  validateResourceAccess('Employee', 'id'), // ✅ IDOR Fix: Validate employee belongs to org
  body('note').notEmpty().trim(),
  body('rating').optional().isInt({ min: 1, max: 5 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { note, rating } = req.body;

  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  const performanceNote = {
    date: new Date(),
    note,
    rating,
    reviewedBy: req.user._id
  };

  employee.performanceNotes.push(performanceNote);
  await employee.save();

  res.status(201).json({
    success: true,
    message: 'Performance note added successfully',
    data: { performanceNote }
  });
}));

// Update leave balance
router.patch('/:id/leave-balance', [
  employeesWrite,
  validateResourceAccess('Employee', 'id'), // ✅ IDOR Fix: Validate employee belongs to org
  body('annual').optional().isNumeric(),
  body('sick').optional().isNumeric(),
  body('personal').optional().isNumeric()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { annual, sick, personal } = req.body;

  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  if (annual !== undefined) employee.leaveBalance.annual = annual;
  if (sick !== undefined) employee.leaveBalance.sick = sick;
  if (personal !== undefined) employee.leaveBalance.personal = personal;

  await employee.save();

  res.json({
    success: true,
    message: 'Leave balance updated successfully',
    data: { leaveBalance: employee.leaveBalance }
  });
}));

// Add salary component
router.post('/:id/salary/components', [
  employeesWrite,
  body('name').notEmpty().trim(),
  body('amount').isNumeric(),
  body('type').isIn(['allowance', 'deduction', 'bonus', 'commission', 'overtime', 'benefit']),
  body('isRecurring').optional().isBoolean(),
  body('effectiveDate').optional().isISO8601(),
  body('endDate').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { name, amount, type, isRecurring, effectiveDate, endDate } = req.body;

  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  const component = {
    name,
    amount,
    type,
    isRecurring: isRecurring !== undefined ? isRecurring : true,
    effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
    endDate: endDate ? new Date(endDate) : null
  };

  employee.salary.components.push(component);
  await employee.save();

  res.status(201).json({
    success: true,
    message: 'Salary component added successfully',
    data: { component }
  });
}));

// Add bonus
router.post('/:id/salary/bonuses', [
  employeesWrite,
  validateResourceAccess('Employee', 'id'), // ✅ IDOR Fix: Validate employee belongs to org
  body('type').isIn(['performance', 'annual', 'project', 'retention', 'signing', 'referral']),
  body('amount').isNumeric(),
  body('description').optional().trim(),
  body('awardedDate').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { type, amount, description, awardedDate } = req.body;

  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  const bonus = {
    type,
    amount,
    description,
    awardedDate: awardedDate ? new Date(awardedDate) : new Date(),
    awardedBy: req.user._id,
    status: 'pending'
  };

  employee.salary.bonuses.push(bonus);
  await employee.save();

  res.status(201).json({
    success: true,
    message: 'Bonus added successfully',
    data: { bonus }
  });
}));

// Update bonus status
router.patch('/:id/salary/bonuses/:bonusId', [
  employeesWrite,
  validateResourceAccess('Employee', 'id'), // ✅ IDOR Fix: Validate employee belongs to org
  body('status').isIn(['pending', 'approved', 'paid'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { id, bonusId } = req.params;

  const employee = await Employee.findById(id);
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  const bonus = employee.salary.bonuses.id(bonusId);
  if (!bonus) {
    return res.status(404).json({
      success: false,
      message: 'Bonus not found'
    });
  }

  bonus.status = status;
  await employee.save();

  res.json({
    success: true,
    message: 'Bonus status updated successfully',
    data: { bonus }
  });
}));

// Get salary history
router.get('/:id/salary/history', employeesRead, validateResourceAccess('Employee', 'id'), // ✅ IDOR Fix: Validate employee belongs to org
  ErrorHandler.asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id).select('salary');
  
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  res.json({
    success: true,
    data: {
      salary: employee.salary,
      totalCompensation: employee.salary.base + employee.salary.components.reduce((sum, comp) => sum + comp.amount, 0)
    }
  });
}));

// Update performance metrics
router.patch('/:id/performance', [
  employeesWrite,
  validateResourceAccess('Employee', 'id'), // ✅ IDOR Fix: Validate employee belongs to org
  body('overallRating').optional().isInt({ min: 1, max: 5 }),
  body('lastReviewDate').optional().isISO8601(),
  body('nextReviewDate').optional().isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { overallRating, lastReviewDate, nextReviewDate } = req.body;

  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  if (overallRating !== undefined) employee.performanceMetrics.overallRating = overallRating;
  if (lastReviewDate) employee.performanceMetrics.lastReviewDate = new Date(lastReviewDate);
  if (nextReviewDate) employee.performanceMetrics.nextReviewDate = new Date(nextReviewDate);

  await employee.save();

  res.json({
    success: true,
    message: 'Performance metrics updated successfully',
    data: { performanceMetrics: employee.performanceMetrics }
  });
}));

// Add performance goal
router.post('/:id/performance/goals', [
  employeesWrite,
  validateResourceAccess('Employee', 'id'), // ✅ IDOR Fix: Validate employee belongs to org
  body('title').notEmpty().trim(),
  body('description').optional().trim(),
  body('targetDate').isISO8601(),
  body('progress').optional().isInt({ min: 0, max: 100 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { title, description, targetDate, progress } = req.body;

  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  const goal = {
    title,
    description,
    targetDate: new Date(targetDate),
    status: 'not-started',
    progress: progress || 0
  };

  employee.performanceMetrics.goals.push(goal);
  await employee.save();

  res.status(201).json({
    success: true,
    message: 'Performance goal added successfully',
    data: { goal }
  });
}));

// Get dashboard data
router.get('/dashboard', employeesRead, ErrorHandler.asyncHandler(async (req, res) => {
  const dashOrgId = req.orgId || req.user?.orgId;
  if (!dashOrgId) return res.status(400).json({ success: false, message: 'Organization context required' });
  const orgObjectId = new mongoose.Types.ObjectId(dashOrgId.toString());
  const orgIdFilter = { orgId: dashOrgId };

  const timeRange = req.query.timeRange || '30d';
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get basic stats
  const totalEmployees = await Employee.countDocuments(orgIdFilter);
  const activeEmployees = await Employee.countDocuments({ ...orgIdFilter, status: 'active' });

  // Get new hires in time range
  const newHires = await Employee.countDocuments({
    ...orgIdFilter,
    hireDate: { $gte: startDate }
  });

  // Get departures in time range
  const departures = await Employee.countDocuments({
    ...orgIdFilter,
    status: { $in: ['terminated', 'resigned'] },
    updatedAt: { $gte: startDate }
  });

  // Calculate average salary
  const salaryAggregation = await Employee.aggregate([
    { $match: { orgId: orgObjectId } },
    { $group: { _id: null, averageSalary: { $avg: '$salary.base' } } }
  ]);
  const averageSalary = salaryAggregation.length > 0 ? Math.round(salaryAggregation[0].averageSalary) : 0;

  // Department distribution
  const departmentStats = await Employee.aggregate([
    { $match: { orgId: orgObjectId } },
    { $group: { _id: '$department', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { name: '$_id', count: 1, _id: 0 } }
  ]);

  // Performance stats
  const performanceStats = await Employee.aggregate([
    { $match: { orgId: orgObjectId } },
    { $group: { _id: '$performanceMetrics.overallRating', count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
    { $project: { rating: '$_id', count: 1, _id: 0 } }
  ]);

  // Recent hires
  const recentHires = await Employee.find({
    ...orgIdFilter,
    hireDate: { $gte: startDate }
  })
    .populate('userId', 'fullName email')
    .sort({ hireDate: -1 })
    .limit(5);

  // Upcoming reviews
  const upcomingReviews = await Employee.find({
    ...orgIdFilter,
    'performanceMetrics.nextReviewDate': {
      $gte: new Date(),
      $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
    }
  })
    .populate('userId', 'fullName email')
    .sort({ 'performanceMetrics.nextReviewDate': 1 })
    .limit(5);

  // Salary distribution
  const salaryDistribution = await Employee.aggregate([
    { $match: { orgId: orgObjectId } },
    {
      $bucket: {
        groupBy: '$salary.base',
        boundaries: [0, 30000, 50000, 75000, 100000, 150000, 200000, Infinity],
        default: '200000+',
        output: {
          count: { $sum: 1 },
          range: { $push: '$salary.base' }
        }
      }
    }
  ]);

  // Skills gaps (simplified)
  const skillsGaps = await Employee.aggregate([
    { $match: { orgId: orgObjectId } },
    { $unwind: '$skills' },
    { $match: { 'skills.level': { $in: ['beginner'] } } },
    { $group: { _id: '$skills.name', gapCount: { $sum: 1 } } },
    { $sort: { gapCount: -1 } },
    { $limit: 5 },
    { $project: { skill: '$_id', gapCount: 1, priority: 'High', _id: 0 } }
  ]);

  // Compliance alerts (simplified)
  const complianceAlerts = [];

  // Check for expired background checks
  const expiredBackgroundChecks = await Employee.countDocuments({
    ...orgIdFilter,
    'compliance.backgroundCheck.expiryDate': { $lt: new Date() }
  });

  if (expiredBackgroundChecks > 0) {
    complianceAlerts.push({
      title: 'Expired Background Checks',
      description: `${expiredBackgroundChecks} employees have expired background checks`
    });
  }

  // Check for expired drug tests
  const expiredDrugTests = await Employee.countDocuments({
    ...orgIdFilter,
    'compliance.drugTest.expiryDate': { $lt: new Date() }
  });
  
  if (expiredDrugTests > 0) {
    complianceAlerts.push({
      title: 'Expired Drug Tests',
      description: `${expiredDrugTests} employees have expired drug tests`
    });
  }

  res.json({
    success: true,
    data: {
      totalEmployees,
      activeEmployees,
      newHires,
      departures,
      averageSalary,
      departmentStats,
      performanceStats,
      recentHires,
      upcomingReviews,
      salaryDistribution,
      skillsGaps,
      complianceAlerts
    }
  });
}));

// ---------------------------------------------------------------------------
// INVITE FLOW
// POST /invite  — admin sends a portal invite to a new team member by email
// GET  /invite/accept?token=  — invitee accepts, activates account + sets password
// ---------------------------------------------------------------------------

router.post('/invite', [
  employeesWrite,
  body('email').isEmail().normalizeEmail(),
  body('fullName').optional().trim(),
  body('erpRole').optional().isIn(['owner', 'admin', 'manager', 'project_manager', 'hr', 'finance', 'employee', 'contractor']),
  body('hrSubRole').optional().isIn(['manager', 'executive', 'payroll_officer']),
  body('financeSubRole').optional().isIn(['manager', 'accountant', 'analyst', 'ap_officer', 'ar_officer'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { email, erpRole = 'employee' } = req.body;
  const fullName = req.body.fullName || email.split('@')[0];
  const hrSubRole = (erpRole === 'hr' && req.body.hrSubRole) ? req.body.hrSubRole : undefined;
  const financeSubRole = (erpRole === 'finance' && req.body.financeSubRole) ? req.body.financeSubRole : undefined;

  const tenantId = req.tenant?._id || req.user?.tenantId;
  if (!tenantId) {
    return res.status(400).json({ success: false, message: 'Tenant context required' });
  }

  // Resolve org
  let orgId = req.user.orgId;
  if (!orgId) {
    const Organization = require('../../../models/org/Organization');
    const org = await Organization.findOne({ slug: 'wolfstack' });
    if (!org) return res.status(500).json({ success: false, message: 'Organization not found' });
    orgId = org._id;
  }

  // Find or create a stub User for this email
  let user = await User.findOne({ email });
  if (!user) {
    const crypto = require('crypto');
    user = new User({
      fullName,
      email,
      password: crypto.randomBytes(16).toString('hex'), // placeholder — will be replaced when invite accepted
      role: 'employee',
      orgId,
      status: 'pending',
      emailVerified: false,
      mustChangePassword: true,
      createdBy: req.user._id
    });
    await user.save();
  }

  // Create or re-use TenantUser invitation
  const existingTU = await TenantUser.findOne({ userId: user._id, tenantId });
  if (existingTU && existingTU.status === 'active') {
    return res.status(409).json({ success: false, message: 'This person already has active portal access.' });
  }

  let tenantUser;
  if (existingTU) {
    // Re-send: refresh the token
    const crypto = require('crypto');
    existingTU.invitation.invitationToken = crypto.randomBytes(32).toString('hex');
    existingTU.invitation.invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    existingTU.status = 'pending';
    if (hrSubRole) existingTU.hrSubRole = hrSubRole;
    if (financeSubRole) existingTU.financeSubRole = financeSubRole;
    await existingTU.save();
    tenantUser = existingTU;
  } else {
    tenantUser = await TenantUser.inviteUser(user._id, tenantId, req.user._id, erpRole);
    if (hrSubRole) {
      tenantUser.hrSubRole = hrSubRole;
      await tenantUser.save();
    }
    if (financeSubRole) {
      tenantUser.financeSubRole = financeSubRole;
      await tenantUser.save();
    }
  }

  // Build the invite link
  const envConfig = require('../../../config/environment');
  const frontendUrl = envConfig.get('FRONTEND_URL') || process.env.FRONTEND_URL || '';
  const inviteLink = `${frontendUrl}/invite/accept?token=${tenantUser.invitation.invitationToken}`;

  // Resolve org name for the email
  const Organization = require('../../../models/org/Organization');
  const org = await Organization.findById(orgId).select('name').lean();

  // Get inviter name
  const inviter = await User.findById(req.user._id).select('fullName').lean();

  // Send invite email (non-fatal)
  const emailService = require('../../../services/integrations/email.service');
  emailService.sendEmployeeInviteEmail(
    { fullName, email },
    {
      inviteLink,
      orgName: org?.name || 'your organisation',
      role: erpRole,
      inviterName: inviter?.fullName || 'An admin'
    }
  ).catch(err => console.warn('Invite email failed (non-fatal):', err.message));

  res.status(201).json({
    success: true,
    message: `Invitation sent to ${email}`,
    data: { inviteLink, email, erpRole }
  });
}));

// Accept invite — invitee sets their password and activates the account
router.get('/invite/accept', ErrorHandler.asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ success: false, message: 'Invitation token required' });

  const tenantUser = await TenantUser.findOne({
    'invitation.invitationToken': token,
    'invitation.invitationExpires': { $gt: new Date() },
    status: 'pending'
  }).populate('userId');

  if (!tenantUser) {
    return res.status(400).json({ success: false, message: 'Invalid or expired invitation link' });
  }

  res.json({
    success: true,
    message: 'Token valid',
    data: {
      email: tenantUser.userId?.email,
      fullName: tenantUser.userId?.fullName,
      role: tenantUser.roles?.[0]?.role || 'employee'
    }
  });
}));

// Set password and activate invite
router.post('/invite/accept', [
  body('token').notEmpty(),
  body('password').isLength({ min: 6 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const tenantUser = await TenantUser.findOne({
    'invitation.invitationToken': token,
    'invitation.invitationExpires': { $gt: new Date() },
    status: 'pending'
  });

  if (!tenantUser) {
    return res.status(400).json({ success: false, message: 'Invalid or expired invitation link' });
  }

  // Set the real password on the User
  const user = await User.findById(tenantUser.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  user.password = password;
  user.status = 'active';
  user.mustChangePassword = false;
  await user.save();

  // Activate TenantUser
  tenantUser.status = 'active';
  tenantUser.invitation.acceptedAt = new Date();
  tenantUser.lastActivity = new Date();
  await tenantUser.save();

  // Invalidate permission cache for fresh resolution on first login
  const { invalidateResolvedPermissions } = require('../../../services/tenant/permissionResolver.service');
  await invalidateResolvedPermissions(tenantUser.tenantId, user._id).catch(() => {});

  res.json({ success: true, message: 'Account activated. You can now log in.' });
}));

module.exports = router;
