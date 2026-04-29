const express = require('express');
const router = express.Router({ mergeParams: true });
const { requireRole } = require('../../../middleware/auth/auth');
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const Department = require('../../../models/org/Department');
const DepartmentDashboardService = require('../../../services/analytics/department-dashboard.service');
const {
  DEFAULT_DEPARTMENT_TEMPLATE,
  seedDepartmentTemplate,
  syncDepartmentNameAssignments
} = require('../../../services/tenant/departmentAssignmentSync.service');
// Use standardized orgId helper utility
const { ensureOrgId, getTenantFilter } = require('../../../utils/orgIdHelper');
// Validation and ownership middleware
const { body, validationResult } = require('express-validator');
const { injectOwnership, injectUpdateOwnership } = require('../../../middleware/validation/ownershipMiddleware');
// ✅ IDOR Fix: Resource access validation
const { validateResourceAccess } = require('../../../middleware/security/resourceAccessCheck');

const VALID_MODULE_KEYS = new Set([
  'projects', 'hr', 'finance', 'payroll', 'documents', 'analytics', 'nucleus',
  'clients', 'deals', 'audit', 'attendance', 'leave', 'notifications', 'settings'
]);

// Tenant context from ERP token (sets req.user, req.tenant, req.tenantContext, req.orgId)
router.use(verifyERPToken);

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: errors.array()
    });
  }
  next();
};

const deptListAccess = requireErpAccess({ module: 'hr', action: 'read' });

// Get all departments
router.get('/', deptListAccess, ErrorHandler.asyncHandler(async (req, res) => {
  const { includeInactive } = req.query;

  // Resolve orgId — return empty list (not 500) if context is unavailable
  let filter;
  try {
    filter = await getTenantFilter(req);
  } catch (err) {
    return res.json({ success: true, data: [] });
  }

  let query = { ...filter };
  if (includeInactive !== 'true') {
    query.status = 'active';
  }

  const departments = await Department.find(query)
    .populate('departmentHead', 'fullName email')
    .populate('parentDepartment', 'name code')
    .sort({ name: 1 });

  res.json({
    success: true,
    data: departments
  });
}));

// Create default template departments (idempotent; skips existing by code)
router.post('/template',
  requireRole(['owner', 'admin', 'super_admin']),
  injectOwnership,
  ErrorHandler.asyncHandler(async (req, res) => {
    let orgId;
    try {
      orgId = await ensureOrgId(req);
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Organization context could not be determined. Please log in again.' });
    }

    const tenantId = req.tenantId || req.user?.tenantId;
    const result = await seedDepartmentTemplate({
      tenantId,
      orgId: req.body.orgId || orgId,
      createdBy: req.body.createdBy || req.user?._id
    });

    res.status(201).json({
      success: true,
      data: result,
      template: DEFAULT_DEPARTMENT_TEMPLATE,
      message: `Template applied. Created ${result.created.length}, skipped ${result.skipped.length}.`
    });
  })
);

// Get all departments with their statistics (for overview) - must be before /:id
router.get('/dashboard/overview', ErrorHandler.asyncHandler(async (req, res) => {
  const orgId = req.tenantContext?.orgId || req.user?.orgId || req.orgId;
  if (!orgId) {
    return res.status(400).json({
      success: false,
      message: 'Organization context required'
    });
  }
  const departmentsWithStats = await DepartmentDashboardService.getAllDepartmentsWithStats(orgId);
  res.json({
    success: true,
    data: departmentsWithStats
  });
}));

// Get department by ID
router.get('/:id', 
  validateResourceAccess('Department', 'id'), // ✅ IDOR Fix
  ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Use standardized orgId utility
  const orgId = await ensureOrgId(req);
  
  // Use standardized tenant filter
  const filter = await getTenantFilter(req);
  let query = { _id: id, ...filter };
  
  const department = await Department.findOne(query)
    .populate('departmentHead', 'fullName email')
    .populate('parentDepartment', 'name code')
    .populate('childDepartments', 'name code');
  
  if (!department) {
    return res.status(404).json({
      success: false,
      message: 'Department not found'
    });
  }
  
  res.json({
    success: true,
    data: department
  });
}));

// Create new department
router.post('/', 
  requireRole(['owner', 'admin', 'super_admin']),
  [
    body('name').notEmpty().trim().isLength({ min: 1, max: 255 }).withMessage('Department name is required and must be between 1 and 255 characters'),
    body('code').notEmpty().trim().isLength({ min: 1, max: 50 }).matches(/^[A-Z0-9-]+$/).withMessage('Department code is required and must contain only uppercase letters, numbers, and hyphens'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
    body('parentDepartment').optional().isMongoId().withMessage('Invalid parent department ID'),
    body('departmentHead').optional().isMongoId().withMessage('Invalid department head ID'),
    body('settings').optional().isObject().withMessage('Settings must be an object'),
    body('moduleKey').optional().isIn([...VALID_MODULE_KEYS]).withMessage('moduleKey must be one of: ' + [...VALID_MODULE_KEYS].join(', ')),
    handleValidationErrors
  ],
  injectOwnership,
  ErrorHandler.asyncHandler(async (req, res) => {
  // Resolve orgId — return clear 400 if context is unavailable rather than crashing
  let orgId;
  try {
    orgId = await ensureOrgId(req);
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Organization context could not be determined. Please log in again.' });
  }
  const tenantId = req.tenantId || req.user?.tenantId;
  const { name, code, description, parentDepartment, departmentHead, settings, moduleKey } = req.body;

  if (moduleKey !== undefined && moduleKey !== null && moduleKey !== '' && !VALID_MODULE_KEYS.has(moduleKey)) {
    return res.status(400).json({ success: false, message: 'Invalid moduleKey. Must be one of: ' + [...VALID_MODULE_KEYS].join(', ') });
  }

  // Check if department with same code already exists
  const existingDepartment = await Department.findOne({ 
    code: code.toUpperCase().trim(),
    $or: [{ tenantId }, { orgId }]
  });
  
  if (existingDepartment) {
    return res.status(400).json({
      success: false,
      message: 'Department with this code already exists',
      code: 'DUPLICATE_DEPARTMENT_CODE'
    });
  }
  
  // Ownership fields are now injected by middleware (createdBy, orgId)
  const department = new Department({
    name: name.trim(),
    code: code.toUpperCase().trim(),
    description: description ? description.trim() : undefined,
    tenantId,
    orgId: req.body.orgId || orgId,
    parentDepartment: parentDepartment || undefined,
    departmentHead: departmentHead || undefined,
    settings: settings || {},
    moduleKey: moduleKey && VALID_MODULE_KEYS.has(moduleKey) ? moduleKey : undefined,
    status: 'active',
    createdBy: req.body.createdBy || req.user?._id
  });
  
  await department.save();
  
  // If parent department exists, add this as child
  if (parentDepartment) {
    const parent = await Department.findById(parentDepartment);
    if (parent) {
      await parent.addChildDepartment(department._id);
    }
  }
  
  res.status(201).json({
    success: true,
    data: department,
    message: 'Department created successfully'
  });
}));

// Update department
router.put('/:id', 
  requireRole(['owner', 'admin', 'super_admin']),
  validateResourceAccess('Department', 'id'), // ✅ IDOR Fix
  [
    body('name').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Department name must be between 1 and 255 characters'),
    body('code').optional().trim().isLength({ min: 1, max: 50 }).matches(/^[A-Z0-9-]+$/).withMessage('Department code must contain only uppercase letters, numbers, and hyphens'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
    body('parentDepartment').optional().isMongoId().withMessage('Invalid parent department ID'),
    body('departmentHead').optional().isMongoId().withMessage('Invalid department head ID'),
    body('status').optional().isIn(['active', 'inactive', 'archived']).withMessage('Invalid status'),
    body('moduleKey').optional().isIn([...VALID_MODULE_KEYS]).withMessage('moduleKey must be one of: ' + [...VALID_MODULE_KEYS].join(', ')),
    handleValidationErrors
  ],
  injectUpdateOwnership,
  ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Use standardized orgId utility
  const orgId = await ensureOrgId(req);
  const tenantId = req.tenantId || req.user?.tenantId;
  const { name, code, description, parentDepartment, departmentHead, settings, status, moduleKey } = req.body;

  if (moduleKey !== undefined && moduleKey !== null && moduleKey !== '' && !VALID_MODULE_KEYS.has(moduleKey)) {
    return res.status(400).json({ success: false, message: 'Invalid moduleKey. Must be one of: ' + [...VALID_MODULE_KEYS].join(', ') });
  }
  
  const department = await Department.findOne({
    _id: id,
    $or: [{ tenantId }, { orgId }]
  });
  
  if (!department) {
    return res.status(404).json({
      success: false,
      message: 'Department not found'
    });
  }

  const oldName = department.name;
  
  // Check if code is being changed and if new code already exists
  if (code && code.toUpperCase().trim() !== department.code) {
    const existingDepartment = await Department.findOne({ 
      code: code.toUpperCase().trim(),
      $or: [{ tenantId }, { orgId }],
      _id: { $ne: id }
    });
    
    if (existingDepartment) {
      return res.status(400).json({
        success: false,
        message: 'Department with this code already exists'
      });
    }
    department.code = code.toUpperCase().trim();
  }
  
  if (name !== undefined) {
    department.name = name.trim();
  }
  
  if (description !== undefined) {
    department.description = description ? description.trim() : undefined;
  }
  
  if (parentDepartment !== undefined) {
    // Handle parent department change
    if (department.parentDepartment) {
      const oldParent = await Department.findById(department.parentDepartment);
      if (oldParent) {
        await oldParent.removeChildDepartment(department._id);
      }
    }
    
    department.parentDepartment = parentDepartment || undefined;
    
    if (parentDepartment) {
      const newParent = await Department.findById(parentDepartment);
      if (newParent) {
        await newParent.addChildDepartment(department._id);
      }
    }
  }
  
  if (departmentHead !== undefined) {
    department.departmentHead = departmentHead || undefined;
  }

  if (moduleKey !== undefined) {
    department.moduleKey = (moduleKey && VALID_MODULE_KEYS.has(moduleKey)) ? moduleKey : null;
  }
  
  if (settings !== undefined) {
    department.settings = { ...department.settings, ...settings };
  }
  
  if (status !== undefined) {
    department.status = status;
  }
  
  await department.save();

  const nameSync = await syncDepartmentNameAssignments({
    departmentDoc: department,
    oldName,
    newName: department.name
  });
  
  res.json({
    success: true,
    data: { department, nameSync },
    message: 'Department updated successfully'
  });
}));

// Delete department
router.delete('/:id', requireRole(['owner', 'admin', 'super_admin']), validateResourceAccess('Department', 'id'), // ✅ IDOR Fix
  ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Get orgId from tenant context (set by middleware) or fallback to user.orgId
  const orgId = req.tenantContext?.orgId || req.user?.orgId;
  const tenantId = req.tenant?._id?.toString() || req.user?.tenantId;
  
  let query = { _id: id };
  
  // Use orgId if available (preferred), otherwise use tenantId
  if (orgId) {
    query.orgId = orgId;
  } else if (tenantId) {
    query.tenantId = tenantId;
  } else {
    return res.status(400).json({
      success: false,
      message: 'Organization or tenant context required'
    });
  }
  
  const department = await Department.findOne(query);
  
  if (!department) {
    return res.status(404).json({
      success: false,
      message: 'Department not found'
    });
  }
  
  // Soft delete by setting status to archived
  department.status = 'archived';
  await department.save();
  
  // Remove from parent's child departments
  if (department.parentDepartment) {
    const parent = await Department.findById(department.parentDepartment);
    if (parent) {
      await parent.removeChildDepartment(department._id);
    }
  }
  
  res.json({
    success: true,
    message: 'Department deleted successfully'
  });
}));

// ==================== DEPARTMENT DASHBOARD ENDPOINTS ====================

// Get department dashboard statistics
router.get('/:id/dashboard/stats', validateResourceAccess('Department', 'id'), // ✅ IDOR Fix
  ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Get orgId from tenant context (set by middleware) or fallback to user.orgId
  const orgId = req.tenantContext?.orgId || req.user?.orgId;
  const tenantId = req.tenant?._id?.toString() || req.user?.tenantId;
  
  let query = { _id: id };
  
  // Use orgId if available (preferred), otherwise use tenantId
  if (orgId) {
    query.orgId = orgId;
  } else if (tenantId) {
    query.tenantId = tenantId;
  } else {
    return res.status(400).json({
      success: false,
      message: 'Organization or tenant context required'
    });
  }
  
  // Verify department exists and user has access
  const department = await Department.findOne(query);
  
  if (!department) {
    return res.status(404).json({
      success: false,
      message: 'Department not found'
    });
  }
  
  // Use orgId from context, fallback to department's orgId
  const statsOrgId = orgId || department.orgId;
  if (!statsOrgId) {
    return res.status(400).json({
      success: false,
      message: 'Organization ID required for statistics'
    });
  }
  
  const stats = await DepartmentDashboardService.getDepartmentStats(statsOrgId, id);
  
  res.json({
    success: true,
    data: {
      department: {
        _id: department._id,
        name: department.name,
        code: department.code,
        description: department.description
      },
      stats
    }
  });
}));

// Get department projects
router.get('/:id/dashboard/projects', validateResourceAccess('Department', 'id'), // ✅ IDOR Fix
  ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Get orgId from tenant context (set by middleware) or fallback to user.orgId
  const orgId = req.tenantContext?.orgId || req.user?.orgId;
  const tenantId = req.tenant?._id?.toString() || req.user?.tenantId;
  const { status, limit = 20, skip = 0 } = req.query;
  
  let query = { _id: id };
  
  // Use orgId if available (preferred), otherwise use tenantId
  if (orgId) {
    query.orgId = orgId;
  } else if (tenantId) {
    query.tenantId = tenantId;
  } else {
    return res.status(400).json({
      success: false,
      message: 'Organization or tenant context required'
    });
  }
  
  // Verify department exists and user has access
  const department = await Department.findOne(query);
  
  if (!department) {
    return res.status(404).json({
      success: false,
      message: 'Department not found'
    });
  }
  
  // Use orgId from context, fallback to department's orgId
  const projectsOrgId = orgId || department.orgId;
  if (!projectsOrgId) {
    return res.status(400).json({
      success: false,
      message: 'Organization ID required'
    });
  }
  
  const projects = await DepartmentDashboardService.getDepartmentProjects(projectsOrgId, id, {
    status,
    limit: parseInt(limit),
    skip: parseInt(skip)
  });
  
  res.json({
    success: true,
    data: projects,
    pagination: {
      limit: parseInt(limit),
      skip: parseInt(skip),
      total: projects.length
    }
  });
}));

// Get department tasks
router.get('/:id/dashboard/tasks', validateResourceAccess('Department', 'id'), // ✅ IDOR Fix
  ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Get orgId from tenant context (set by middleware) or fallback to user.orgId
  const orgId = req.tenantContext?.orgId || req.user?.orgId;
  const tenantId = req.tenant?._id?.toString() || req.user?.tenantId;
  const { status, assignee, limit = 50, skip = 0 } = req.query;
  
  let query = { _id: id };
  
  // Use orgId if available (preferred), otherwise use tenantId
  if (orgId) {
    query.orgId = orgId;
  } else if (tenantId) {
    query.tenantId = tenantId;
  } else {
    return res.status(400).json({
      success: false,
      message: 'Organization or tenant context required'
    });
  }
  
  // Verify department exists and user has access
  const department = await Department.findOne(query);
  
  if (!department) {
    return res.status(404).json({
      success: false,
      message: 'Department not found'
    });
  }
  
  // Use orgId from context, fallback to department's orgId
  const tasksOrgId = orgId || department.orgId;
  if (!tasksOrgId) {
    return res.status(400).json({
      success: false,
      message: 'Organization ID required'
    });
  }
  
  const tasks = await DepartmentDashboardService.getDepartmentTasks(tasksOrgId, id, {
    status,
    assignee,
    limit: parseInt(limit),
    skip: parseInt(skip)
  });
  
  res.json({
    success: true,
    data: tasks,
    pagination: {
      limit: parseInt(limit),
      skip: parseInt(skip),
      total: tasks.length
    }
  });
}));

// Get department task statistics by status
router.get('/:id/dashboard/task-stats', validateResourceAccess('Department', 'id'), // ✅ IDOR Fix
  ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Get orgId from tenant context (set by middleware) or fallback to user.orgId
  const orgId = req.tenantContext?.orgId || req.user?.orgId;
  const tenantId = req.tenant?._id?.toString() || req.user?.tenantId;
  
  let query = { _id: id };
  
  // Use orgId if available (preferred), otherwise use tenantId
  if (orgId) {
    query.orgId = orgId;
  } else if (tenantId) {
    query.tenantId = tenantId;
  } else {
    return res.status(400).json({
      success: false,
      message: 'Organization or tenant context required'
    });
  }
  
  // Verify department exists and user has access
  const department = await Department.findOne(query);
  
  if (!department) {
    return res.status(404).json({
      success: false,
      message: 'Department not found'
    });
  }
  
  // Use orgId from context, fallback to department's orgId
  const statsOrgId = orgId || department.orgId;
  if (!statsOrgId) {
    return res.status(400).json({
      success: false,
      message: 'Organization ID required'
    });
  }
  
  const taskStats = await DepartmentDashboardService.getDepartmentTaskStats(statsOrgId, id);
  
  res.json({
    success: true,
    data: taskStats
  });
}));

// Get department workload distribution
router.get('/:id/dashboard/workload', validateResourceAccess('Department', 'id'), // ✅ IDOR Fix
  ErrorHandler.asyncHandler(async (req, res) => {
  const { id } = req.params;
  // Get orgId from tenant context (set by middleware) or fallback to user.orgId
  const orgId = req.tenantContext?.orgId || req.user?.orgId;
  const tenantId = req.tenant?._id?.toString() || req.user?.tenantId;
  
  let query = { _id: id };
  
  // Use orgId if available (preferred), otherwise use tenantId
  if (orgId) {
    query.orgId = orgId;
  } else if (tenantId) {
    query.tenantId = tenantId;
  } else {
    return res.status(400).json({
      success: false,
      message: 'Organization or tenant context required'
    });
  }
  
  // Verify department exists and user has access
  const department = await Department.findOne(query);
  
  if (!department) {
    return res.status(404).json({
      success: false,
      message: 'Department not found'
    });
  }
  
  // Use orgId from context, fallback to department's orgId
  const workloadOrgId = orgId || department.orgId;
  if (!workloadOrgId) {
    return res.status(400).json({
      success: false,
      message: 'Organization ID required'
    });
  }
  
  const workload = await DepartmentDashboardService.getDepartmentWorkload(workloadOrgId, id);
  
  res.json({
    success: true,
    data: workload
  });
}));

module.exports = router;

