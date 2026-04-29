/**
 * Tenant Organization Projects Routes
 * Handles all project management endpoints for tenant organizations
 * Base path: /api/tenant/:tenantSlug/organization/projects
 * 
 * SECURITY FIXES APPLIED:
 * - RBAC permission checks
 * - Rate limiting
 * - Input validation
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router({ mergeParams: true });
const projectController = require('../../../controllers/tenant/projectsController');
const { requireRole } = require('../../../middleware/auth/rbac');
const { strictLimiter } = require('../../../middleware/rateLimiting/rateLimiter');
const { body, validationResult } = require('express-validator');
const ErrorHandler = require('../../../middleware/common/errorHandler');
// CSRF removed - JWT authentication provides sufficient protection
const { validateRequestSize } = require('../../../middleware/validation/requestValidation');
const { idempotencyMiddleware } = require('../../../middleware/common/idempotency');
// Client Portal - REMOVED COMPLETELY
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { tokenVerificationLimiter } = require('../../../middleware/rateLimiting/rateLimiter');
const { checkUsageLimitSoftwareHouseOnly, checkReadOnlySoftwareHouseOnly } = require('../../../middleware/common/featureGate');

// SECURITY FIX: Input validation middleware for project creation
const validateProjectCreation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Project name must be between 1 and 255 characters')
    .matches(/^[a-zA-Z0-9\s\-_\.]+$/)
    .withMessage('Project name contains invalid characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must not exceed 5000 characters'),
  
  body('clientId')
    .optional()
    .isMongoId()
    .withMessage('Invalid client ID format'),
  
  body('status')
    .optional()
    .isIn(['planning', 'active', 'on_hold', 'completed', 'cancelled', 'archived'])
    .withMessage('Invalid project status'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  
  body('budget.total')
    .optional()
    .isFloat({ min: 0, max: 1e15 })
    .withMessage('Budget must be a positive number'),
  
  body('budget.currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'PKR'])
    .withMessage('Invalid currency'),
  
  body('timeline.startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  body('timeline.endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  
  body('timeline.estimatedHours')
    .optional()
    .isInt({ min: 0, max: 1000000 })
    .withMessage('Estimated hours must be a positive integer'),
  
  body('tags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Tags must be an array with maximum 20 items'),
  
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  
  body('projectType')
    .optional()
    .isIn(['web_application', 'mobile_app', 'api_development', 'system_integration', 'maintenance_support', 'consulting', 'general'])
    .withMessage('Invalid project type'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Auth: verifyERPToken applied here so routes are protected even if mounted elsewhere
router.get('/', verifyERPToken, (req, res, next) => {
  console.log('🔵 Projects router GET / hit - calling getProjects controller');
  console.log('🔵 Request params:', req.params);
  console.log('🔵 Request query:', req.query);
  next();
}, projectController.getProjects);
router.get('/metrics', (req, res, next) => {
  console.log('🔵 Projects router GET /metrics hit - calling getProjectMetrics controller');
  next();
}, projectController.getProjectMetrics);

// Import ownership middleware
const { injectOwnership, injectUpdateOwnership } = require('../../../middleware/validation/ownershipMiddleware');
// Import resource access check middleware (Issue #9.1 Fix)
const { validateResourceAccess } = require('../../../middleware/security/resourceAccessCheck');

const projectLogoStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'project-logos');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const { projectId } = req.params;
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `project-${projectId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const projectLogoUpload = multer({
  storage: projectLogoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp, svg)'));
  }
});

const projectLogoUploadMiddleware = (req, res, next) => {
  projectLogoUpload.single('logo')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Logo must be under 2 MB' });
      }
      return res.status(400).json({ success: false, message: err.message || 'Invalid file' });
    }
    next();
  });
};

// Clients endpoints - MUST come before /:id route
router.get('/clients', projectController.getClients);
router.post('/clients',
  verifyERPToken,
  checkReadOnlySoftwareHouseOnly,
  checkUsageLimitSoftwareHouseOnly('clientAccounts', 1),
  [
    body('name').notEmpty().trim().isLength({ min: 1, max: 255 }).withMessage('Client name is required'),
    body('type').optional().isIn(['company', 'individual']).withMessage('Invalid client type'),
    body('contact.email').optional().isEmail().normalizeEmail().withMessage('Invalid email format'),
    body('contact.phone').optional().isMobilePhone().withMessage('Invalid phone format'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }
      next();
    }
  ],
  injectOwnership,
  projectController.createClient);
// ✅ IDOR Fix: Validate resource access
router.patch('/clients/:id', 
  verifyERPToken,
  validateResourceAccess('Client', 'id'),
  projectController.updateClient);
router.delete('/clients/:id', 
  verifyERPToken,
  validateResourceAccess('Client', 'id'),
  projectController.deleteClient);

// Tasks endpoints - MUST come before /:id route
router.get('/tasks', projectController.getTasks);
router.get('/tasks/:taskId', projectController.getTask);
router.post('/tasks', 
  verifyERPToken,
  [
    body('title').notEmpty().trim().isLength({ min: 1, max: 255 }).withMessage('Task title is required'),
    body('projectId').notEmpty().isMongoId().withMessage('Valid project ID is required'),
    body('departmentId').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Invalid department ID format'),
    body('status').optional().isIn(['todo', 'in_progress', 'under_review', 'completed', 'cancelled']).withMessage('Invalid status'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical', 'urgent']).withMessage('Invalid priority'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }
      next();
    }
  ],
  injectOwnership,
  projectController.createTask);
// ✅ IDOR Fix: Validate resource access
router.patch('/tasks/:id', 
  verifyERPToken,
  validateResourceAccess('Task', 'id'),
  projectController.updateTask);
router.delete('/tasks/:id', 
  verifyERPToken,
  validateResourceAccess('Task', 'id'),
  projectController.deleteTask);

// Milestones endpoints
router.get('/milestones', projectController.getMilestones);
router.post('/milestones', 
  verifyERPToken,
  [
    body('title').notEmpty().trim().isLength({ min: 1, max: 255 }).withMessage('Milestone title is required'),
    body('projectId').optional().isMongoId().withMessage('Invalid project ID format'),
    body('dueDate').optional().isISO8601().withMessage('Invalid due date format'),
    body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }
      next();
    }
  ],
  injectOwnership,
  projectController.createMilestone);
router.patch('/milestones/:id', projectController.updateMilestone);
router.delete('/milestones/:id', projectController.deleteMilestone);

// Resources endpoints
router.get('/resources', projectController.getResources);
router.post('/resources', 
  verifyERPToken,
  [
    body('userId').notEmpty().isMongoId().withMessage('Valid user ID is required'),
    body('department').notEmpty().trim().isLength({ min: 1, max: 255 }).withMessage('Department is required'),
    body('jobTitle').notEmpty().trim().isLength({ min: 1, max: 255 }).withMessage('Job title is required'),
    body('skills').optional().isArray().withMessage('Skills must be an array'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }
      next();
    }
  ],
  injectOwnership,
  projectController.createResource);
// ✅ IDOR Fix: Validate resource access
router.patch('/resources/:id', 
  verifyERPToken,
  validateResourceAccess('Resource', 'id'),
  projectController.updateResource);
router.delete('/resources/:id', 
  verifyERPToken,
  validateResourceAccess('Resource', 'id'),
  projectController.deleteResource);
router.post('/resources/:resourceId/allocate', projectController.allocateResource);

// Timesheets endpoints
router.get('/timesheets', projectController.getTimesheets);
router.post('/timesheets', 
  verifyERPToken,
  [
    body('date').notEmpty().isISO8601().withMessage('Valid date is required'),
    body('memberId').notEmpty().isMongoId().withMessage('Valid member ID is required'),
    body('hours').notEmpty().isFloat({ min: 0, max: 24 }).withMessage('Hours must be between 0 and 24'),
    body('projectId').optional().isMongoId().withMessage('Invalid project ID format'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }
      next();
    }
  ],
  injectOwnership,
  projectController.createTimesheet);
router.patch('/timesheets/:id', projectController.updateTimesheet);
router.delete('/timesheets/:id', projectController.deleteTimesheet);

// Sprints endpoints
router.get('/sprints', projectController.getSprints);
router.post('/sprints', 
  verifyERPToken,
  [
    body('name').notEmpty().trim().isLength({ min: 1, max: 255 }).withMessage('Sprint name is required'),
    body('startDate').notEmpty().isISO8601({ strict: false }).withMessage('Valid start date is required'),
    body('endDate').notEmpty().isISO8601({ strict: false }).withMessage('Valid end date is required'),
    body('projectId').notEmpty().isMongoId().withMessage('Valid project ID is required'),
    body('status').optional().isIn(['planning', 'active', 'completed', 'cancelled']).withMessage('Invalid status'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
      }
      next();
    }
  ],
  injectOwnership,
  projectController.createSprint);
// ✅ IDOR Fix: Validate resource access
router.patch('/sprints/:id', 
  verifyERPToken,
  validateResourceAccess('Sprint', 'id'),
  projectController.updateSprint);
router.delete('/sprints/:id', 
  verifyERPToken,
  validateResourceAccess('Sprint', 'id'),
  projectController.deleteSprint);
router.patch('/sprints/:id/velocity', projectController.calculateVelocity);

// Task-specific routes (these use :taskId, not :id, so they're safe)
router.post('/tasks/:taskId/dependencies', projectController.createTaskDependency);
router.delete('/tasks/:taskId/dependencies/:dependencyId', projectController.deleteTaskDependency);
router.put('/tasks/:taskId/reschedule', projectController.rescheduleTask);
router.post('/tasks/:taskId/validate-completion', projectController.validateTaskCompletion);
router.post('/tasks/:taskId/sync', projectController.syncTask);

// Parameterized routes with specific prefixes - MUST come before generic /:id route
// These use :projectId which could match "clients", so we validate in the controller
router.get('/:projectId/gantt/timeline', projectController.getGanttTimeline);
router.get('/:projectId/gantt/tasks', projectController.getGanttTasks);
router.get('/:projectId/gantt/critical-path', projectController.getCriticalPath);
router.post('/:projectId/gantt/settings', projectController.saveGanttSettings);
router.post('/:projectId/gantt/timeline', projectController.saveProjectTimeline);
router.get('/:projectId/dashboard', projectController.getProjectDashboard);
router.get('/:projectId/tasks-with-context', projectController.getTasksWithContext);
router.get('/:projectId/integration-status', projectController.getIntegrationStatus);

// Project Member routes - must be before generic /:id to avoid route conflict
router.get('/:projectId/members', verifyERPToken, projectController.getProjectMembers);
router.post('/:projectId/members',
  verifyERPToken,
  requireRole(['admin', 'super_admin', 'org_manager', 'project_manager', 'pmo', 'owner']),
  projectController.addProjectMember);
router.patch('/:projectId/members/:memberId', verifyERPToken, projectController.updateProjectMember);
router.delete('/:projectId/members/:memberId',
  verifyERPToken,
  requireRole(['admin', 'super_admin', 'org_manager', 'project_manager', 'pmo', 'owner']),
  projectController.removeProjectMember);

router.post(
  '/:projectId/logo',
  verifyERPToken,
  validateResourceAccess('Project', 'projectId'),
  projectLogoUploadMiddleware,
  projectController.uploadProjectLogo
);
router.delete(
  '/:projectId/logo',
  verifyERPToken,
  validateResourceAccess('Project', 'projectId'),
  projectController.deleteProjectLogo
);

// Generic parameterized routes - MUST come LAST to avoid conflicts with specific routes
// This will match any remaining paths, but we validate ObjectId format in the controller
router.get('/:id', projectController.getProject);

// SECURITY: Add comprehensive security middleware for project creation
// Only admins, project managers, and org managers can create projects
// NOTE: CSRF removed - JWT authentication provides sufficient protection
router.post('/',
  verifyERPToken, // ✅ Unified authentication middleware
  checkReadOnlySoftwareHouseOnly,
  checkUsageLimitSoftwareHouseOnly('projects', 1),
  validateRequestSize('1mb'), // SECURITY: Request size limit (prevent DoS)
  (req, res, next) => {
    // SECURITY: Validate Content-Type header
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({
        success: false,
        message: 'Content-Type must be application/json',
        code: 'INVALID_CONTENT_TYPE',
        traceId: req.headers['x-request-id'] || req.id
      });
    }
    next();
  },
  strictLimiter, // SECURITY: Rate limiting (10 requests per 15 minutes)
  idempotencyMiddleware(), // SECURITY: Idempotency key support
  requireRole(['admin', 'super_admin', 'org_manager', 'project_manager', 'pmo', 'owner']), // SECURITY: RBAC check
  validateProjectCreation, // SECURITY: Input validation
  projectController.createProject
);

// Client Portal Routes - REMOVED COMPLETELY

// Update and delete project routes - MUST come after specific routes but before other parameterized routes
// ✅ IDOR Fix: Validate resource access before allowing update/delete
router.patch('/:id', 
  verifyERPToken,
  validateResourceAccess('Project', 'id'),
  projectController.updateProject);
router.delete('/:id', 
  verifyERPToken,
  validateResourceAccess('Project', 'id'),
  projectController.deleteProject);

/**
 * Archive Project
 * POST /api/tenant/:tenantSlug/organization/projects/:id/archive
 */
router.post('/:id/archive',
  verifyERPToken,
  requireRole(['admin', 'super_admin', 'org_manager', 'project_manager', 'pmo', 'owner']),
  ErrorHandler.asyncHandler(async (req, res) => {
    const Project = require('../../../models/project-delivery/Project');
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Verify orgId matches
    if (project.orgId.toString() !== req.user.orgId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    project.status = 'archived';
    project.archived_at = new Date();
    await project.save();

    res.json({
      success: true,
      message: 'Project archived successfully',
      data: project
    });
  })
);

/**
 * Restore Project
 * POST /api/tenant/:tenantSlug/organization/projects/:id/restore
 */
router.post('/:id/restore',
  verifyERPToken,
  checkReadOnlySoftwareHouseOnly,
  checkUsageLimitSoftwareHouseOnly('projects', 1),
  requireRole(['admin', 'super_admin', 'org_manager', 'project_manager', 'pmo', 'owner']),
  ErrorHandler.asyncHandler(async (req, res) => {
    const Project = require('../../../models/project-delivery/Project');
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Verify orgId matches
    if (project.orgId.toString() !== req.user.orgId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (project.status !== 'archived') {
      return res.status(400).json({
        success: false,
        message: 'Project is not archived'
      });
    }

    // Restore to completed status (or could use a restore_status field)
    project.status = 'completed';
    project.archived_at = null;
    await project.save();

    res.json({
      success: true,
      message: 'Project restored successfully',
      data: project
    });
  })
);

module.exports = router;

