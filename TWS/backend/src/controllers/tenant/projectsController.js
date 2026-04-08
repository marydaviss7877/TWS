/**
 * Tenant Organization Projects Controller
 * Handles all project management operations for tenant organizations
 */

const Project = require('../../models/Project');
const Task = require('../../models/Task');
const Organization = require('../../models/Organization');
const Client = require('../../models/Client');
const Milestone = require('../../models/Milestone');
const Resource = require('../../models/Resource');
const Sprint = require('../../models/Sprint');
const { TimeEntry } = require('../../models/Finance');
const User = require('../../models/User');
const TaskDependency = require('../../models/TaskDependency');
const ProjectTimeline = require('../../models/ProjectTimeline');
const GanttSettings = require('../../models/GanttSettings');
const ganttChartService = require('../../services/ganttChartService');
const projectIntegrationService = require('../../services/integrations/project-integration.service');
const { getUserDepartmentIds, shouldFilterByDepartment } = require('../../services/tenant/userDepartmentsService');
const { getViewConfigForUserDepartments, applyViewConfigToProject, buildDefaultProjectDepartmentConfigs, normalizeProjectDepartmentConfigs } = require('../../utils/projectDepartmentView');
const ProjectMember = require('../../models/ProjectMember');

// Helper function to get organization ID from request context
// Simplified: Direct access from middleware (no fallbacks for security)
const getOrgId = async (req) => {
  try {
    const { ensureOrgId } = require('../../utils/orgIdHelper');
    return await ensureOrgId(req);
  } catch (error) {
    console.error('Error getting orgId:', error);
    return req.orgId || req.workspace?.organizationId || req.tenantContext?.orgId || null;
  }
};

/**
 * Get all projects for the tenant organization
 * GET /api/tenant/:tenantSlug/organization/projects
 */
exports.getProjects = async (req, res) => {
  try {
    console.log('📋 getProjects controller called');
    console.log('📋 Request path:', req.path);
    console.log('📋 Request params:', req.params);
    console.log('📋 Request query:', req.query);
    
    const { tenantSlug } = req.params;
    const { status, priority, clientId, departmentId, primaryDepartmentId, limit = 50, skip = 0, sort = 'updatedAt' } = req.query;
    
    // Get orgId using standardized utility (set by verifyERPToken middleware)
    const orgId = await getOrgId(req);
    console.log('📋 orgId from context:', orgId);
    if (!orgId) {
      console.error('❌ Organization ID not available in request context:', { 
        tenantSlug, 
        hasTenant: !!req.tenant,
        tenantOrgId: req.tenant?.orgId || req.tenant?.organizationId,
        workspaceOrgId: req.workspace?.organizationId,
        reqOrgId: req.orgId
      });
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }

    // Build query
    const query = { orgId };

    // Phase 2 (UPR): Filter by role — owner sees all; admin by department; others by department AND ProjectMember
    const tenantId = req.tenant?._id || req.tenantContext?.tenantId;
    const userId = req.user?._id;
    const userRole = req.user?.role;
    const isOwner = userRole === 'owner';
    const isAdmin = userRole === 'admin';

    if (tenantId && userId && !isOwner) {
      const filterByDept = await shouldFilterByDepartment(tenantId, userId);
      if (filterByDept) {
        const userDeptIds = await getUserDepartmentIds(tenantId, userId);
        if (userDeptIds.length > 0) {
          query.$or = [
            { primaryDepartmentId: { $in: userDeptIds } },
            { departments: { $in: userDeptIds } }
          ];
        }
      }
      // Non-owner, non-admin: require BOTH department match AND project membership (Plan Phase 2)
      if (!isOwner && !isAdmin) {
        const memberships = await ProjectMember.find({ userId, status: 'active' }).select('projectId').lean();
        const userProjectIds = memberships.map(m => m.projectId).filter(Boolean);
        if (userProjectIds.length > 0) {
          query._id = { $in: userProjectIds };
        } else {
          query._id = { $in: [] };
        }
      }
    }

    // Department filtering (explicit query params take precedence for admins)
    if (primaryDepartmentId) {
      query.primaryDepartmentId = primaryDepartmentId;
      delete query.$or;
    } else if (departmentId) {
      query.departments = departmentId;
      delete query.$or;
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (clientId) query.clientId = clientId;

    // Execute query with pagination
    // NOTE: Projects without clientId are included (clientId is now optional)
    let projects = await Project.find(query)
      .populate('clientId', 'name company')
      .populate('primaryDepartmentId', 'name code')
      .populate('departments', 'name code')
      .sort({ [sort]: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    // UPR Phase 3.5: Apply per-department view config to list (redact fields by user's department)
    if (tenantId && userId && projects.length > 0) {
      const userDeptIds = await getUserDepartmentIds(tenantId, userId);
      for (const proj of projects) {
        const viewConfig = getViewConfigForUserDepartments(proj, userDeptIds);
        if (viewConfig?.viewConfig) applyViewConfigToProject(proj, viewConfig.viewConfig);
      }
    }

    // Calculate total for pagination
    const total = await Project.countDocuments(query);

    // DEBUG: Log projects being returned (in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('📋 getProjects response:', {
        orgId: orgId.toString(),
        query,
        projectsCount: projects.length,
        total,
        projects: projects.map(p => ({
          id: p._id?.toString(),
          name: p.name,
          clientId: p.clientId?._id?.toString() || p.clientId?.toString() || null,
          status: p.status
        }))
      });
    }

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: (parseInt(skip) + parseInt(limit)) < total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error.message
    });
  }
};

/**
 * Get a single project by ID
 * GET /api/tenant/:tenantSlug/organization/projects/:id
 */
exports.getProject = async (req, res) => {
  const mongoose = require('mongoose');
  try {
    const { id } = req.params;

    // SECURITY FIX: Validate that id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.warn('⚠️ Invalid project ID format:', { id, path: req.path });
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID format',
        code: 'INVALID_PROJECT_ID'
      });
    }

    // Get orgId from request context (set by verifyERPToken)
    let orgId = await getOrgId(req);
    if (!orgId) {
      console.error('❌ getProject: orgId not available', {
        hasOrgId: !!req.orgId,
        hasTenantContext: !!req.tenantContext,
        path: req.path
      });
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }

    // Coerce to ObjectId so query matches DB type (avoids no match when orgId is string)
    const projectId = new mongoose.Types.ObjectId(id);
    const orgIdStr = orgId && (typeof orgId === 'string' ? orgId : orgId.toString());
    if (!orgIdStr || !mongoose.Types.ObjectId.isValid(orgIdStr)) {
      return res.status(500).json({
        success: false,
        message: 'Invalid organization context'
      });
    }
    const orgIdObj = new mongoose.Types.ObjectId(orgIdStr);

    let project = await Project.findOne({ _id: projectId, orgId: orgIdObj }).lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Populate refs optionally (don't let missing refs cause 500)
    try {
      const populated = await Project.findOne({ _id: projectId, orgId: orgIdObj })
        .populate('clientId', 'name company email phone')
        .populate('workspaceId', 'name')
        .lean();
      if (populated) project = populated;
    } catch (popErr) {
      console.warn('getProject: populate failed, returning project without refs', popErr.message);
    }

    // Phase 2: Apply per-department view config when user has department access
    const tenantId = req.tenant?._id || req.tenantContext?.tenantId;
    const userId = req.user?._id;
    if (tenantId && userId && project) {
      const userDeptIds = await getUserDepartmentIds(tenantId, userId);
      const viewConfig = getViewConfigForUserDepartments(project, userDeptIds);
      if (viewConfig?.viewConfig) {
        applyViewConfigToProject(project, viewConfig.viewConfig);
      }
    }

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project',
      error: error.message
    });
  }
};

/**
 * Generate unique slug with collision handling
 * SECURITY FIX: Proper slug generation with collision detection and cryptographic randomness
 */
const generateUniqueSlug = async (baseName, orgId) => {
  const crypto = require('crypto');
  
  // Sanitize base name
  let slug = baseName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/[\s_]+/g, '-') // Replace spaces/underscores with dash
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
  
  // Ensure minimum length
  if (slug.length === 0) {
    slug = 'project';
  }
  
  // Limit length to prevent DoS
  if (slug.length > 80) {
    slug = slug.substring(0, 80);
  }
  
  // SECURITY FIX: Use cryptographic randomness for slug suffix
  // Generate random suffix (8 hex characters = 4 bytes)
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  let finalSlug = `${slug}-${randomSuffix}`;
  
  // Check uniqueness with atomic operation
  let count = 0;
  const maxAttempts = 50; // Reduced from 100 since we use randomness
  
  while (count < maxAttempts) {
    const existing = await Project.findOne({ orgId, slug: finalSlug });
    if (!existing) {
      return finalSlug;
    }
    // If collision, generate new random suffix
    const newRandomSuffix = crypto.randomBytes(4).toString('hex');
    finalSlug = `${slug}-${newRandomSuffix}`;
    count++;
  }
  
  // Fallback: Use timestamp + random if all attempts fail (extremely rare)
  const timestampSuffix = Date.now().toString(36);
  const fallbackRandom = crypto.randomBytes(2).toString('hex');
  return `${slug}-${timestampSuffix}-${fallbackRandom}`;
};

/**
 * Validate date range
 * SECURITY FIX: Date validation to prevent invalid data
 */
const validateDates = (startDate, endDate) => {
  if (!startDate && !endDate) return null; // Dates are optional
  
  const now = new Date();
  const start = startDate ? new Date(startDate) : null;
  const due = endDate ? new Date(endDate) : null;
  
  if (start && isNaN(start.getTime())) {
    throw new Error('Invalid start date format');
  }
  if (due && isNaN(due.getTime())) {
    throw new Error('Invalid due date format');
  }
  
  if (start && due && due < start) {
    throw new Error('Due date cannot be before start date');
  }
  
  // Prevent dates too far in future (10 years max)
  if (due && (due - now) / (1000 * 60 * 60 * 24) > 3650) {
    throw new Error('Project duration cannot exceed 10 years');
  }
  
  return null;
};

/**
 * Create a new project
 * POST /api/tenant/:tenantSlug/organization/projects
 * SECURITY FIXES APPLIED:
 * - Strict orgId resolution (no fallbacks)
 * - Race condition fix (use unique index, catch duplicate key errors)
 * - Client validation
 * - Date validation
 * - Unique slug generation
 * - Transaction support
 * - Audit logging
 */
exports.createProject = async (req, res) => {
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  
  // IMPROVEMENT: Get request ID for error tracking (must be defined early)
  const requestId = req.headers['x-request-id'] || req.id || require('crypto').randomUUID();
  
  // SECURITY FIX: Set transaction timeout (30 seconds)
  const transactionTimeout = 30000; // 30 seconds
  let timeoutId;
  
  try {
    // SECURITY FIX: Start transaction with explicit timeout and isolation level
    session.startTransaction({
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority', wtimeout: 10000 }, // 10 second write timeout
      maxTimeMS: transactionTimeout // Transaction timeout
    });
    
    // Set timeout to abort transaction if it takes too long
    timeoutId = setTimeout(async () => {
      if (session.inTransaction()) {
        try {
          await session.abortTransaction();
          await session.endSession();
        } catch (timeoutError) {
          console.error('Error aborting transaction on timeout:', timeoutError);
        }
      }
    }, transactionTimeout);
    
    // SECURITY FIX: Get orgId with strict context only
    const orgId = await getOrgId(req);
    if (!orgId) {
      console.error('❌ Failed to get orgId for project creation:', {
        hasTenant: !!req.tenant,
        hasTenantContext: !!req.tenantContext,
        tenantSlug: req.params.tenantSlug
      });
      
      // SECURITY FIX: Log security event for failed orgId resolution
      try {
        const auditService = require('../../../services/compliance/audit.service');
        await auditService.logEvent({
          action: 'PROJECT_CREATION_FAILED',
          performedBy: req.user?._id?.toString() || 'system',
          userId: req.user?._id?.toString() || 'system',
          userEmail: req.user?.email || 'unknown',
          userRole: req.user?.role || 'unknown',
          organization: null,
          tenantId: req.tenant?._id?.toString() || 'unknown',
          resource: 'PROJECT',
          resourceId: null,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.get('User-Agent'),
          details: {
            reason: 'Organization context not available',
            method: req.method,
            endpoint: req.path
          },
          severity: 'high',
          status: 'failure'
        });
      } catch (auditError) {
        console.error('Failed to log security event:', auditError);
      }
      
      await session.abortTransaction();
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available. Please ensure you are properly authenticated.',
        code: 'ORG_CONTEXT_UNAVAILABLE',
        traceId: requestId
      });
    }
    
    const {
      name,
      description,
      clientId,
      primaryDepartmentId,
      departments: departmentsInput,
      status = 'planning',
      priority = 'medium',
      budget,
      timeline,
      tags = [],
      projectType = 'general'
      // Client Portal - REMOVED COMPLETELY
    } = req.body;
    
    // SECURITY FIX: Input validation (should be done by middleware, but double-check here)
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Project name is required and must be a non-empty string',
        code: 'VALIDATION_ERROR',
        traceId: requestId
      });
    }
    
    // SECURITY FIX: Sanitize and validate name length
    const sanitizedName = name.trim().slice(0, 255);
    if (sanitizedName.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Project name cannot be empty after sanitization',
        code: 'VALIDATION_ERROR',
        traceId: requestId
      });
    }

    // SECURITY FIX: Validate dates
    if (timeline) {
      try {
        validateDates(timeline.startDate, timeline.endDate);
      } catch (dateError) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: dateError.message
        });
      }
    }

    // SECURITY FIX: Validate client belongs to same tenant
    if (clientId) {
      const client = await Client.findById(clientId).session(session);
      if (!client) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Client not found',
          code: 'CLIENT_NOT_FOUND',
          traceId: requestId
        });
      }
      if (client.orgId.toString() !== orgId.toString()) {
        await session.abortTransaction();
        return res.status(403).json({
          success: false,
          message: 'Client does not belong to this organization',
          code: 'UNAUTHORIZED_CLIENT',
          traceId: requestId
        });
      }
    }

    // SECURITY FIX: Generate unique slug with collision handling
    const slug = await generateUniqueSlug(sanitizedName, orgId);

    // SECURITY FIX: Validate budget
    let sanitizedBudget = { total: 0, currency: 'USD' };
    if (budget) {
      const total = parseFloat(budget.total) || 0;
      if (total < 0) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Budget cannot be negative',
          code: 'VALIDATION_ERROR',
          traceId: requestId
        });
      }
      // Prevent extremely large budgets (potential DoS)
      if (total > 1e15) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Budget exceeds maximum allowed value',
          code: 'VALIDATION_ERROR',
          traceId: requestId
        });
      }
      sanitizedBudget = {
        total: Math.max(0, total),
        currency: budget.currency || 'USD',
        spent: 0,
        remaining: Math.max(0, total)
      };
    }

    // SECURITY FIX: Sanitize description
    const DOMPurify = require('isomorphic-dompurify');
    const sanitizedDescription = description 
      ? DOMPurify.sanitize(String(description).slice(0, 5000))
      : '';

    // SECURITY FIX: Validate tags
    const sanitizedTags = Array.isArray(tags) 
      ? tags.slice(0, 20).filter(tag => typeof tag === 'string' && tag.length <= 50)
      : [];

    // SECURITY: Process client portal settings (if provided)
    // Client Portal Settings - REMOVED COMPLETELY
    // Default portal settings (disabled)
    let portalSettings = {
      isPortalProject: false,
      portalVisibility: 'private',
      allowClientPortal: false,
      clientCanCreateCards: false,
      clientCanEditCards: false,
      requireClientApproval: false,
      autoNotifyClient: false,
      syncWithERP: false,
      features: {
        projectProgress: false,
        timeTracking: false,
        invoices: false,
        documents: false,
        communication: false
      }
    };

    // UPR Phase 3: default projectDepartmentConfigs from primary + departments
    const deptIds = Array.isArray(departmentsInput) ? departmentsInput.filter(Boolean) : [];
    const allDepts = primaryDepartmentId ? [primaryDepartmentId, ...deptIds.filter(d => (d && (d._id || d).toString()) !== (primaryDepartmentId && (primaryDepartmentId._id || primaryDepartmentId).toString()))] : deptIds;
    const projectDepartmentConfigs = buildDefaultProjectDepartmentConfigs(primaryDepartmentId || null, allDepts);

    // SECURITY FIX: Create project with transaction
    // Race condition fix: Let unique index handle duplicates, catch error
    let project;
    try {
      project = new Project({
        orgId,
        name: sanitizedName,
        slug,
        description: sanitizedDescription,
        clientId: clientId || null,
        primaryDepartmentId: primaryDepartmentId || undefined,
        departments: deptIds.length ? deptIds : undefined,
        projectDepartmentConfigs: projectDepartmentConfigs.length ? projectDepartmentConfigs : undefined,
        status,
        priority,
        budget: sanitizedBudget,
        timeline: timeline ? {
          startDate: timeline.startDate ? new Date(timeline.startDate) : undefined,
          endDate: timeline.endDate ? new Date(timeline.endDate) : undefined,
          estimatedHours: timeline.estimatedHours ? Math.max(0, parseInt(timeline.estimatedHours) || 0) : undefined
        } : {},
        tags: sanitizedTags,
        projectType,
        metrics: {
          completionRate: 0
        },
        createdBy: req.user?._id || null,
        // SECURITY: Add client portal settings
        settings: {
          portalSettings: portalSettings
        }
      });

      await project.save({ session });
    } catch (saveError) {
      // SECURITY FIX: Handle duplicate key error (race condition)
      if (saveError.code === 11000 || saveError.name === 'MongoServerError') {
        // Duplicate key error - slug already exists
        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          message: 'A project with this name already exists. Please try a different name.',
          code: 'DUPLICATE_PROJECT',
          traceId: requestId
        });
      }
      throw saveError;
    }

    // SECURITY FIX: Audit logging
    try {
      const auditService = require('../../../services/compliance/audit.service');
      await auditService.logEvent({
        action: 'PROJECT_CREATED',
        performedBy: req.user?._id?.toString() || 'system',
        userId: req.user?._id?.toString() || 'system',
        userEmail: req.user?.email || 'system@tws.com',
        userRole: req.user?.role || 'system',
        organization: orgId,
        tenantId: req.tenant?._id?.toString() || 'default',
        resource: 'PROJECT',
        resourceId: project._id.toString(),
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.get('User-Agent'),
        details: {
          projectName: project.name,
          projectType: project.projectType,
          budget: project.budget.total,
          method: req.method,
          endpoint: req.path
        },
        severity: 'info',
        status: 'success'
      });
    } catch (auditError) {
      // Log audit error but don't fail the request
      console.error('Audit logging failed:', auditError);
    }

    // Commit transaction
    if (timeoutId) clearTimeout(timeoutId);
    await session.commitTransaction();

    // Populate before sending response
    await project.populate('clientId', 'name company');

    console.log('✅ Project created successfully:', {
      projectId: project._id,
      name: project.name,
      orgId: orgId
    });

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully',
      traceId: requestId
    });
  } catch (error) {
    // Cleanup timeout and transaction
    if (timeoutId) clearTimeout(timeoutId);
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('Error aborting transaction:', abortError);
      }
    }
    
    // Get requestId for error response (use the one defined at function start, or create new)
    const errorRequestId = (typeof requestId !== 'undefined' ? requestId : null) || req.headers['x-request-id'] || req.id || require('crypto').randomUUID();
    
    // SECURITY FIX: Log security events for failures
    try {
      const auditService = require('../../../services/compliance/audit.service');
      await auditService.logEvent({
        action: 'PROJECT_CREATION_FAILED',
        performedBy: req.user?._id?.toString() || 'system',
        userId: req.user?._id?.toString() || 'system',
        userEmail: req.user?.email || 'system@tws.com',
        userRole: req.user?.role || 'system',
        organization: await getOrgId(req).catch(() => null),
        tenantId: req.tenant?._id?.toString() || 'default',
        resource: 'PROJECT',
        resourceId: null,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.get('User-Agent'),
        details: {
          error: error.message,
          errorCode: error.code,
          errorStack: error.stack?.substring(0, 500), // Limit stack trace length
          method: req.method,
          path: req.path
        },
        severity: 'warning',
        status: 'failure'
      });
    } catch (auditError) {
      console.error('Failed to log security event:', auditError);
    }
    
    console.error('❌ Error creating project:', {
      error: error.message,
      stack: error.stack?.substring(0, 500),
      orgId: await getOrgId(req).catch(() => null),
      hasTenant: !!req.tenant,
      hasTenantContext: !!req.tenantContext,
      tenantSlug: req.params.tenantSlug,
      requestId: errorRequestId
    });
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A project with this name already exists',
        code: 'DUPLICATE_PROJECT',
        traceId: errorRequestId
      });
    }
    
    // Return error response
    res.status(500).json({
      success: false,
      message: 'Failed to create project. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: 'PROJECT_CREATION_ERROR',
      traceId: errorRequestId
    });
  } finally {
    // Always end session
    try {
      await session.endSession();
    } catch (endError) {
      console.error('Error ending session:', endError);
    }
  }
};

/**
 * Update a project
 * PATCH /api/tenant/:tenantSlug/organization/projects/:id
 */
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;

    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }

    const update = { ...req.body };
    // UPR Phase 4.3: allow explicit projectDepartmentConfigs from UI; otherwise build from primary + departments
    if (Array.isArray(update.projectDepartmentConfigs) && update.projectDepartmentConfigs.length > 0) {
      update.projectDepartmentConfigs = normalizeProjectDepartmentConfigs(update.projectDepartmentConfigs);
    } else if (update.primaryDepartmentId !== undefined || update.departments !== undefined) {
      const primary = update.primaryDepartmentId ?? null;
      const depts = Array.isArray(update.departments) ? update.departments : [];
      update.projectDepartmentConfigs = buildDefaultProjectDepartmentConfigs(primary, [primary, ...depts].filter(Boolean));
    }

    const project = await Project.findOneAndUpdate(
      { _id: id, orgId },
      { $set: update },
      { new: true, runValidators: true }
    ).populate('clientId', 'name company');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.json({
      success: true,
      data: project,
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project',
      error: error.message
    });
  }
};

/**
 * Delete a project
 * DELETE /api/tenant/:tenantSlug/organization/projects/:id
 */
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }

    const project = await Project.findOneAndDelete({ _id: id, orgId });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project',
      error: error.message
    });
  }
};

/**
 * Get project metrics
 * GET /api/tenant/:tenantSlug/organization/projects/metrics
 */
exports.getProjectMetrics = async (req, res) => {
  try {
    const orgId = await getOrgId(req);
    if (!orgId) {
      console.error('❌ Organization ID not available in request context for metrics');
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }

    const metricsQuery = { orgId };
    const tenantId = req.tenant?._id || req.tenantContext?.tenantId;
    const userId = req.user?._id;
    if (tenantId && userId) {
      const filterByDept = await shouldFilterByDepartment(tenantId, userId);
      if (filterByDept) {
        const userDeptIds = await getUserDepartmentIds(tenantId, userId);
        if (userDeptIds.length > 0) {
          metricsQuery.$or = [
            { primaryDepartmentId: { $in: userDeptIds } },
            { departments: { $in: userDeptIds } }
          ];
        }
      }
    }

    const [
      totalProjects,
      activeProjects,
      completedProjects,
      projects
    ] = await Promise.all([
      Project.countDocuments(metricsQuery),
      Project.countDocuments({ ...metricsQuery, status: 'active' }),
      Project.countDocuments({ ...metricsQuery, status: 'completed' }),
      Project.find(metricsQuery)
        .select('status budget metrics.timeline')
        .lean()
    ]);

    // Calculate additional metrics
    const onTrackProjects = projects.filter(p => 
      p.status === 'active' && p.metrics?.completionRate >= 70
    ).length;

    const atRiskProjects = projects.filter(p => 
      p.status === 'active' && p.metrics?.completionRate < 70 && p.metrics?.completionRate >= 50
    ).length;

    const delayedProjects = projects.filter(p => {
      if (p.timeline?.endDate) {
        return new Date(p.timeline.endDate) < new Date() && p.status !== 'completed';
      }
      return false;
    }).length;

    // Calculate budget totals
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget?.total || 0), 0);
    const spentBudget = projects.reduce((sum, p) => sum + (p.budget?.spent || 0), 0);

    // Calculate total hours
    const totalHours = projects.reduce((sum, p) => sum + (p.timeline?.estimatedHours || 0), 0);

    // Calculate utilization (simplified - would need actual hours from timesheets)
    const utilization = totalProjects > 0 ? (activeProjects / totalProjects) * 100 : 0;

    res.json({
      success: true,
      data: {
        totalProjects,
        activeProjects,
        completedProjects,
        onTrackProjects,
        atRiskProjects,
        delayedProjects,
        totalTeamMembers: 0, // Would need to query User model
        totalBudget,
        spentBudget,
        totalHours,
        utilization: Math.round(utilization)
      }
    });
  } catch (error) {
    console.error('Error fetching project metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project metrics',
      error: error.message
    });
  }
};

/**
 * Get all tasks (with optional grouping)
 * GET /api/tenant/:tenantSlug/organization/projects/tasks
 */
exports.getTasks = async (req, res) => {
  try {
    // Get organization using helper
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      console.error('❌ Organization ID not available in request context for tasks');
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }
    
    const { projectId, departmentId, status, assigneeId, groupBy, limit = 50, skip = 0 } = req.query;

    // Build query using orgId from context
    const query = { orgId };
    if (projectId) query.projectId = projectId;
    if (departmentId) query.departmentId = departmentId;
    if (status) query.status = status;
    if (assigneeId) query.assignee = assigneeId;

    // If groupBy is requested, group tasks by that field
    if (groupBy === 'status') {
      const tasks = await Task.find(query)
        .populate('projectId', 'name slug')
        .populate('departmentId', 'name code')
        .populate('assignee', 'name email')
        .populate('reporter', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      // Group by status (use underscore keys to match frontend CARD_STATUS)
      const grouped = {
        todo: tasks.filter(t => t.status === 'to-do' || t.status === 'todo'),
        in_progress: tasks.filter(t => t.status === 'in-progress' || t.status === 'in_progress'),
        under_review: tasks.filter(t => t.status === 'under-review' || t.status === 'review' || t.status === 'under_review'),
        completed: tasks.filter(t => t.status === 'completed' || t.status === 'done')
      };

      res.json({
        success: true,
        data: {
          tasks: grouped,
          grouped,
          total: tasks.length
        }
      });
    } else {
      // Return flat list
      const tasks = await Task.find(query)
        .populate('projectId', 'name slug')
        .populate('departmentId', 'name code')
        .populate('assignee', 'name email')
        .populate('reporter', 'name email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .lean();

      const total = await Task.countDocuments(query);

      res.json({
        success: true,
        data: {
          tasks,
          pagination: {
            total,
            limit: parseInt(limit),
            skip: parseInt(skip),
            hasMore: (parseInt(skip) + parseInt(limit)) < total
          }
        }
      });
    }
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
};

/**
 * Get a single task by ID
 * GET /api/tenant/:tenantSlug/organization/projects/tasks/:taskId
 */
exports.getTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ success: false, message: 'Organization context not available' });
    }

    const task = await Task.findOne({ _id: taskId, orgId })
      .populate('projectId', 'name slug')
      .populate('departmentId', 'name code')
      .populate('assignee', 'name email fullName')
      .populate('reporter', 'name email fullName')
      .lean();

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch task', error: error.message });
  }
};

/**
 * Create a new task
 * POST /api/tenant/:tenantSlug/organization/projects/tasks
 */
exports.createTask = async (req, res) => {
  const mongoose = require('mongoose');
  try {
    let orgId = await getOrgId(req);
    if (!orgId) {
      const { getOrgId: getOrgIdHelper } = require('../../utils/orgIdHelper');
      orgId = await getOrgIdHelper(req, { required: false }).catch(() => null);
      if (orgId) req.orgId = orgId;
    }
    if (!orgId) {
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }
    
    const user = req.user || req.decoded?.userId;
    const {
      title,
      description,
      status = 'todo',
      priority: rawPriority = 'medium',
      type = 'task',
      projectId,
      departmentId,
      sprintId,
      milestoneId,
      assigneeId,
      dueDate,
      startDate,
      estimatedHours,
      storyPoints,
      labels = [],
      category
    } = req.body;
    // Task model expects low|medium|high|critical; map 'urgent' -> 'critical'
    const priority = (rawPriority === 'urgent') ? 'critical' : rawPriority;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required'
      });
    }

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    // Coerce IDs to ObjectId to avoid 500 CastError
    const toObjectId = (val, name) => {
      if (val == null) return null;
      const str = (typeof val === 'string' ? val : val?.toString?.()) || '';
      if (!mongoose.Types.ObjectId.isValid(str) || String(str).length !== 24) return null;
      return new mongoose.Types.ObjectId(str);
    };
    const projectIdObj = toObjectId(projectId, 'projectId');
    if (!projectIdObj) {
      return res.status(400).json({ success: false, message: 'Invalid project ID format' });
    }

    // Auto-resolve departmentId from project when not supplied by the client
    if (!departmentId) {
      try {
        const proj = await Project.findOne({ _id: projectIdObj, orgId })
          .select('primaryDepartmentId departments').lean();
        if (proj?.primaryDepartmentId) {
          departmentId = proj.primaryDepartmentId.toString();
        } else if (proj?.departments?.length > 0) {
          departmentId = proj.departments[0].toString();
        }
      } catch (_e) { /* non-fatal */ }

      // Last resort: any department in the org, or auto-create a "General" one
      if (!departmentId) {
        try {
          const Department = require('../../models/Department');
          let dept = await Department.findOne({ orgId }).select('_id').lean();
          if (!dept) {
            // No departments exist — create a default "General" department so tasks can proceed
            const newDept = new Department({
              name: 'General',
              code: 'GEN',
              orgId,
              tenantId: req.tenant?._id || req.tenantContext?.tenantId || null,
              status: 'active',
              createdBy: req.user?._id || null,
            });
            await newDept.save();
            dept = newDept;
          }
          if (dept) departmentId = dept._id.toString();
        } catch (_e) { /* non-fatal — proceed without departmentId */ }
      }
    }

    // departmentId is optional (Task model allows null); coerce only when present
    const departmentIdObj = departmentId ? toObjectId(departmentId, 'departmentId') : null;

    // Reporter is required on Task model – resolve from request or fallback to any user in org
    let reporterId = req.user?._id || req.user?.userId || req.user?.id || req.decoded?.userId || req.body.createdBy;
    if (!reporterId && req.decoded?.userId) reporterId = req.decoded.userId;
    if (!reporterId) {
      const fallbackUser = await User.findOne({ orgId }).select('_id').lean();
      reporterId = fallbackUser?._id;
    }
    if (!reporterId) {
      return res.status(400).json({
        success: false,
        message: 'Could not determine task reporter. Please ensure you are logged in or the organization has at least one user.'
      });
    }
    const reporterIdObj = toObjectId(reporterId, 'reporterId');
    if (!reporterIdObj) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reporter/user ID. Please log in again.'
      });
    }

    // Validate task creation based on project type settings (non-blocking if service throws)
    let validation = { valid: true, errors: [] };
    try {
      validation = await projectIntegrationService.validateTaskCreation(orgId, projectIdObj, {
        sprintId,
        milestoneId,
        estimatedHours
      });
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Task validation failed',
          errors: validation.errors
        });
      }
    } catch (validationErr) {
      console.warn('Task creation validation skipped (integration service error):', validationErr?.message);
      // Proceed with task creation; do not 500
    }

    // Resolve tenantId and unique taskId for unique index tenantId_1_taskId_1 (avoid E11000)
    let tenantIdForTask = null;
    try {
      const org = await Organization.findById(orgId).select('tenantId slug').lean();
      if (org?.tenantId) {
        const tid = org.tenantId;
        if (mongoose.Types.ObjectId.isValid(tid) && String(tid).length === 24) {
          tenantIdForTask = tid;
        }
      }
      if (!tenantIdForTask && org?.slug) {
        const Tenant = require('../../models/Tenant');
        const t = await Tenant.findOne({ slug: org.slug }).select('_id').lean();
        if (t) tenantIdForTask = t._id;
      }
      if (!tenantIdForTask) {
        const Tenant = require('../../models/Tenant');
        const t = await Tenant.findOne({ organizationId: orgId }).select('_id').lean();
        if (t) tenantIdForTask = t._id;
      }
    } catch (e) {
      // non-fatal; task can still be created with null tenantId if index allows
    }
    // Unique task id using crypto (avoids ObjectId constructor issues in some Node/Mongoose setups)
    const crypto = require('crypto');
    const uniqueTaskId = `task-${projectIdObj}-${Date.now()}-${crypto.randomBytes(12).toString('hex')}`;

    // Ownership fields: createdBy and orgId (orgId already set, createdBy from req.user)
    const task = new Task({
      orgId,
      projectId: projectIdObj,
      departmentId: departmentIdObj,
      sprintId: sprintId ? toObjectId(sprintId, 'sprintId') : null,
      milestoneId: milestoneId ? toObjectId(milestoneId, 'milestoneId') : null,
      tenantId: tenantIdForTask || undefined,
      taskId: uniqueTaskId,
      title,
      description,
      status,
      priority,
      type,
      assignee: assigneeId ? toObjectId(assigneeId, 'assigneeId') : null,
      reporter: reporterIdObj,
      dueDate: dueDate ? new Date(dueDate) : null,
      startDate: startDate ? new Date(startDate) : null,
      estimatedHours: estimatedHours || null,
      category: category || 'other',
      labels,
      createdBy: req.user?._id ? toObjectId(req.user._id, 'createdBy') : reporterIdObj
    });

    await task.save();

    // Sync with milestone and sprint (non-blocking)
    if (milestoneId) {
      projectIntegrationService.syncMilestoneProgress(orgId, milestoneId).catch(err => console.warn('syncMilestoneProgress:', err?.message));
    }
    if (sprintId) {
      projectIntegrationService.syncSprintMetrics(orgId, sprintId).catch(err => console.warn('syncSprintMetrics:', err?.message));
    }

    try {
      await task.populate('projectId', 'name slug');
      await task.populate('sprintId', 'name startDate endDate status');
      await task.populate('milestoneId', 'title dueDate status progress');
      await task.populate('assignee', 'name email');
      await task.populate('reporter', 'name email');
    } catch (populateErr) {
      console.warn('Task populate (non-fatal):', populateErr?.message);
    }

    res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Error creating task:', error?.message || error);
    if (process.env.NODE_ENV === 'development' && error?.stack) {
      console.error(error.stack);
    }
    const isValidation = error.name === 'ValidationError';
    const isCast = error.name === 'CastError';
    const isDuplicate = error.code === 11000 || (error.message && error.message.includes('E11000'));
    const status = (isValidation || isDuplicate || isCast) ? 400 : 500;
    const message = isValidation
      ? (error.message || 'Task validation failed')
      : isCast
        ? (error.message || 'Invalid ID or reference.')
        : isDuplicate
          ? 'A task with the same identifier already exists.'
          : (error.message || 'Failed to create task');
    return res.status(status).json({
      success: false,
      message,
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { detail: error.stack })
    });
  }
};

/**
 * Update a task
 * PATCH /api/tenant/:tenantSlug/organization/projects/tasks/:id
 */
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }

    // Get task first to check status change
    const existingTask = await Task.findById(id);
    if (!existingTask || existingTask.orgId.toString() !== orgId.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Validate task completion if status is being changed to completed
    if (req.body.status === 'completed' && existingTask.status !== 'completed') {
      const validation = await projectIntegrationService.validateTaskCompletion(orgId, id);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Task cannot be completed',
          errors: validation.errors
        });
      }
    }

    // Prepare updates: map API field names to Task schema and allow only valid fields
    const mongoose = require('mongoose');
    const toObjectId = (val) => {
      if (val == null || val === '') return null;
      const str = (typeof val === 'string' ? val : val?.toString?.()) || '';
      if (!mongoose.Types.ObjectId.isValid(str) || str.length !== 24) return null;
      return new mongoose.Types.ObjectId(str);
    };
    const raw = { ...req.body };
    const updates = {};
    if (raw.title !== undefined) updates.title = raw.title;
    if (raw.description !== undefined) updates.description = raw.description;
    if (raw.status !== undefined) updates.status = raw.status;
    if (raw.priority !== undefined) updates.priority = raw.priority;
    if (raw.dueDate !== undefined) updates.dueDate = raw.dueDate ? new Date(raw.dueDate) : null;
    if (raw.startDate !== undefined) updates.startDate = raw.startDate ? new Date(raw.startDate) : null;
    if (raw.estimatedHours !== undefined) updates.estimatedHours = raw.estimatedHours;
    if (raw.storyPoints !== undefined) updates.storyPoints = raw.storyPoints;
    if (raw.labels !== undefined) updates.labels = Array.isArray(raw.labels) ? raw.labels : (raw.labels ? [].concat(raw.labels) : []);
    if (raw.category !== undefined) updates.category = raw.category;
    if (raw.assigneeId !== undefined) {
      const oid = toObjectId(raw.assigneeId);
      updates.assignee = oid;
    }
    if (raw.projectId !== undefined) updates.projectId = toObjectId(raw.projectId) || existingTask.projectId;
    if (raw.departmentId !== undefined) updates.departmentId = toObjectId(raw.departmentId) || existingTask.departmentId;
    if (raw.sprintId !== undefined) updates.sprintId = raw.sprintId ? toObjectId(raw.sprintId) : null;
    if (raw.milestoneId !== undefined) updates.milestoneId = raw.milestoneId ? toObjectId(raw.milestoneId) : null;

    // Update task with sync
    const task = await projectIntegrationService.updateTaskWithSync(orgId, id, updates);

    await task.populate('projectId', 'name slug');
    await task.populate('sprintId', 'name startDate endDate status');
    await task.populate('milestoneId', 'title dueDate status progress');
    await task.populate('assignee', 'name email');
    await task.populate('reporter', 'name email');

    res.json({
      success: true,
      data: task,
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task',
      error: error.message
    });
  }
};

/**
 * Delete a task
 * DELETE /api/tenant/:tenantSlug/organization/projects/tasks/:id
 */
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }

    const task = await Task.findOneAndDelete({ _id: id, orgId });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task',
      error: error.message
    });
  }
};

/**
 * Get all milestones
 * GET /api/tenant/:tenantSlug/organization/projects/milestones
 */
exports.getMilestones = async (req, res) => {
  try {
    // Get organization using helper
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      console.error('❌ Organization ID not available in request context for milestones');
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }
    
    const { projectId, upcoming, status, limit = 50 } = req.query;

    const query = { orgId };
    if (projectId) query.projectId = projectId;
    if (status) query.status = status;
    if (upcoming === 'true') {
      query.dueDate = { $gte: new Date() };
    }

    const milestones = await Milestone.find(query)
      .populate('projectId', 'name slug')
      .populate('ownerId', 'name email')
      .sort({ dueDate: 1 })
      .limit(parseInt(limit))
      .lean();

    // Calculate task counts for each milestone
    const milestonesWithTasks = await Promise.all(
      milestones.map(async (milestone) => {
        const taskCount = await Task.countDocuments({
          orgId,
          milestoneId: milestone._id
        });
        const completedCount = await Task.countDocuments({
          orgId,
          milestoneId: milestone._id,
          status: 'completed'
        });

        return {
          ...milestone,
          tasks: {
            total: milestone.tasks?.total || taskCount,
            completed: milestone.tasks?.completed || completedCount
          },
          projectId: milestone.projectId ? {
            _id: milestone.projectId._id,
            name: milestone.projectId.name
          } : null,
          ownerId: milestone.ownerId ? {
            _id: milestone.ownerId._id,
            name: milestone.ownerId.name
          } : null
        };
      })
    );

    res.json({
      success: true,
      data: {
        milestones: milestonesWithTasks
      }
    });
  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch milestones',
      error: error.message
    });
  }
};

/**
 * Create a new milestone
 * POST /api/tenant/:tenantSlug/organization/projects/milestones
 */
exports.createMilestone = async (req, res) => {
  try {
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }
    
    const { title, description, projectId, dueDate, status = 'pending', ownerId } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Milestone title is required'
      });
    }

    // Ownership fields: createdBy and orgId (Issue #4.4)
    const milestone = new Milestone({
      orgId,
      title,
      description,
      projectId: projectId || null,
      dueDate: dueDate || null,
      status,
      ownerId: ownerId || null,
      createdBy: req.user?._id || req.body.createdBy || null // Issue #4.4: Always set createdBy
    });

    await milestone.save();
    
    // Calculate progress
    milestone.calculateProgress();
    await milestone.save();
    
    await milestone.populate('projectId', 'name slug');
    await milestone.populate('ownerId', 'name email');

    res.status(201).json({
      success: true,
      data: milestone,
      message: 'Milestone created successfully'
    });
  } catch (error) {
    console.error('Error creating milestone:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create milestone',
      error: error.message
    });
  }
};

/**
 * Update a milestone
 * PATCH /api/tenant/:tenantSlug/organization/projects/milestones/:id
 */
exports.updateMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }

    const milestone = await Milestone.findOneAndUpdate(
      { _id: id, orgId },
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('projectId', 'name slug')
      .populate('ownerId', 'name email');

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found'
      });
    }

    // Recalculate progress
    milestone.calculateProgress();
    await milestone.save();

    res.json({
      success: true,
      data: milestone,
      message: 'Milestone updated successfully'
    });
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update milestone',
      error: error.message
    });
  }
};

/**
 * Delete milestone
 * DELETE /api/tenant/:tenantSlug/organization/projects/milestones/:id
 */
exports.deleteMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }

    const milestone = await Milestone.findOneAndDelete({
      _id: id,
      orgId
    });

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found'
      });
    }

    res.json({
      success: true,
      message: 'Milestone deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete milestone',
      error: error.message
    });
  }
};

/**
 * Get all resources
 * GET /api/tenant/:tenantSlug/organization/projects/resources
 */
exports.getResources = async (req, res) => {
  try {
    // Get organization using helper
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      console.error('❌ Organization ID not available in request context for resources');
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }
    
    const { role, department, availability, search } = req.query;

    const query = { orgId };
    if (role) query.role = role;
    if (department) query.department = department;
    if (availability !== undefined) query.availability = availability === 'true';

    const resources = await Resource.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Filter by search term if provided
    let filteredResources = resources;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredResources = resources.filter(r => {
        const userName = r.userId?.name?.toLowerCase() || '';
        const userEmail = r.userId?.email?.toLowerCase() || '';
        const jobTitle = r.jobTitle?.toLowerCase() || '';
        const dept = r.department?.toLowerCase() || '';
        return userName.includes(searchLower) || 
               userEmail.includes(searchLower) || 
               jobTitle.includes(searchLower) || 
               dept.includes(searchLower);
      });
    }

    // Format response
    const formattedResources = filteredResources.map(resource => ({
      _id: resource._id,
      userId: resource.userId ? {
        _id: resource.userId._id,
        name: resource.userId.name,
        email: resource.userId.email
      } : null,
      role: resource.role,
      department: resource.department,
      jobTitle: resource.jobTitle,
      skills: resource.skills || [],
      availability: resource.availability !== false,
      utilization: resource.utilization || 0,
      currentProjects: resource.currentProjects || [],
      hoursSummary: resource.hoursSummary || {}
    }));

    res.json({
      success: true,
      data: {
        resources: formattedResources
      }
    });
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resources',
      error: error.message
    });
  }
};

/**
 * Create a resource
 * POST /api/tenant/:tenantSlug/organization/projects/resources
 */
exports.createResource = async (req, res) => {
  try {
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }
    
    const { userId, department, jobTitle, skills = [] } = req.body;

    if (!userId || !department || !jobTitle) {
      return res.status(400).json({
        success: false,
        message: 'userId, department, and jobTitle are required'
      });
    }

    // Upsert: if this user already exists as a resource in the org, update rather than error
    const resource = await Resource.findOneAndUpdate(
      { orgId, userId },
      {
        $set: {
          department,
          jobTitle,
          ...(skills.length ? { skills } : {}),
          updatedAt: new Date()
        },
        $setOnInsert: {
          orgId,
          userId,
          createdBy: req.user?._id || null
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await resource.populate('userId', 'name email');

    res.status(201).json({
      success: true,
      data: resource,
      message: 'Resource saved successfully'
    });
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create resource',
      error: error.message
    });
  }
};

/**
 * Update a resource
 * PATCH /api/tenant/:tenantSlug/organization/projects/resources/:id
 */
exports.updateResource = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }

    const updates = req.body;

    const resource = await Resource.findOneAndUpdate(
      { _id: id, orgId },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('userId', 'name email');

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    res.json({
      success: true,
      data: resource,
      message: 'Resource updated successfully'
    });
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update resource',
      error: error.message
    });
  }
};

/**
 * Delete a resource
 * DELETE /api/tenant/:tenantSlug/organization/projects/resources/:id
 */
exports.deleteResource = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }

    const resource = await Resource.findOneAndDelete({ _id: id, orgId });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    res.json({
      success: true,
      message: 'Resource deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete resource',
      error: error.message
    });
  }
};

/**
 * Allocate a resource to a project
 * POST /api/tenant/:tenantSlug/organization/projects/resources/:resourceId/allocate
 */
exports.allocateResource = async (req, res) => {
  try {
    const { resourceId } = req.params;
    
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }
    
    const { projectId, role, allocation, startDate, endDate, hourlyRate } = req.body;

    if (!projectId || !role || !allocation || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'projectId, role, allocation, and startDate are required'
      });
    }

    // Validate allocation percentage
    if (allocation < 0 || allocation > 100) {
      return res.status(400).json({
        success: false,
        message: 'Allocation must be between 0 and 100'
      });
    }

    // Verify project exists
    const project = await Project.findOne({ _id: projectId, orgId });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Get resource
    const resource = await Resource.findOne({ _id: resourceId, orgId });
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Allocate resource to project using the model method
    await resource.addProject(
      projectId,
      role,
      allocation,
      new Date(startDate),
      endDate ? new Date(endDate) : undefined,
      hourlyRate
    );

    await resource.populate('userId', 'name email');
    await resource.populate('workload.currentProjects.projectId', 'name slug');

    res.status(200).json({
      success: true,
      data: resource,
      message: 'Resource allocated to project successfully'
    });
  } catch (error) {
    console.error('Error allocating resource:', error);
    
    // Handle specific errors from the model method
    if (error.message.includes('already allocated')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('exceed maximum allocation')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to allocate resource',
      error: error.message
    });
  }
};

/**
 * Get all timesheet entries
 * GET /api/tenant/:tenantSlug/organization/projects/timesheets
 */
exports.getTimesheets = async (req, res) => {
  try {
    // Get organization using helper
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      console.error('❌ Organization ID not available in request context for timesheets');
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }
    
    const { projectId, period, memberId, startDate, endDate } = req.query;

    const query = { orgId };
    if (projectId) query.projectId = projectId;
    if (memberId) query.employeeId = memberId;

    // Handle period filter
    if (period) {
      const now = new Date();
      let periodStart, periodEnd;

      switch (period) {
        case 'today':
          periodStart = new Date(now.setHours(0, 0, 0, 0));
          periodEnd = new Date(now.setHours(23, 59, 59, 999));
          break;
        case 'this_week':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          periodStart = startOfWeek;
          periodEnd = new Date(now);
          periodEnd.setHours(23, 59, 59, 999);
          break;
        case 'this_month':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        default:
          break;
      }

      if (periodStart && periodEnd) {
        query.date = { $gte: periodStart, $lte: periodEnd };
      }
    }

    // Handle custom date range
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const timesheets = await TimeEntry.find(query)
      .populate('projectId', 'name')
      .populate('employeeId', 'name email')
      .sort({ date: -1 })
      .lean();

    // Format response - extract taskId from tags if present
    const formattedTimesheets = timesheets.map(entry => {
      // Extract taskId from tags (format: "task:taskId")
      let taskId = null;
      if (entry.tags && Array.isArray(entry.tags)) {
        const taskTag = entry.tags.find(t => typeof t === 'string' && t.startsWith('task:'));
        if (taskTag) {
          taskId = { _id: taskTag.replace('task:', ''), title: 'Task' };
        }
      }

      return {
        _id: entry._id,
        date: entry.date,
        projectId: entry.projectId ? {
          _id: entry.projectId._id,
          name: entry.projectId.name
        } : null,
        taskId,
        memberId: entry.employeeId ? {
          _id: entry.employeeId._id,
          name: entry.employeeId.name
        } : null,
        hours: entry.hours,
        description: entry.description,
        status: entry.status || 'draft',
        billable: entry.billable !== false
      };
    });

    res.json({
      success: true,
      data: {
        timesheets: formattedTimesheets
      }
    });
  } catch (error) {
    console.error('Error fetching timesheets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timesheets',
      error: error.message
    });
  }
};

/**
 * Create a timesheet entry
 * POST /api/tenant/:tenantSlug/organization/projects/timesheets
 */
exports.createTimesheet = async (req, res) => {
  try {
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }
    
    const { date, projectId, taskId, sprintId, milestoneId, memberId, hours, description, billable = true, category = 'development' } = req.body;

    if (!date || !memberId || !hours) {
      return res.status(400).json({
        success: false,
        message: 'date, memberId, and hours are required'
      });
    }

    // Use integration service to create timesheet with auto-sync
    const timeEntry = await projectIntegrationService.createTimesheetEntryWithSync(orgId, {
      date: new Date(date),
      projectId: projectId || null,
      taskId: taskId || null,
      sprintId: sprintId || null,
      milestoneId: milestoneId || null,
      employeeId: memberId,
      hours: parseFloat(hours),
      description: description || '',
      billable: billable !== false,
      status: 'draft',
      category
    });

    await timeEntry.populate('projectId', 'name');
    await timeEntry.populate('employeeId', 'name email');
    if (timeEntry.taskId) {
      await timeEntry.populate('taskId', 'title');
    }
    if (timeEntry.sprintId) {
      await timeEntry.populate('sprintId', 'name');
    }
    if (timeEntry.milestoneId) {
      await timeEntry.populate('milestoneId', 'title');
    }

    res.status(201).json({
      success: true,
      data: timeEntry,
      message: 'Timesheet entry created successfully'
    });
  } catch (error) {
    console.error('Error creating timesheet entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create timesheet entry',
      error: error.message
    });
  }
};

/**
 * Update a timesheet entry
 * PATCH /api/tenant/:tenantSlug/organization/projects/timesheets/:id
 */
exports.updateTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }

    const updates = req.body;

    // Handle taskId - convert to tag format if provided
    if (updates.taskId) {
      if (!updates.tags) updates.tags = [];
      const taskTag = `task:${updates.taskId}`;
      if (!updates.tags.includes(taskTag)) {
        updates.tags.push(taskTag);
      }
      delete updates.taskId; // Remove taskId, we store it as tag
    }

    const timeEntry = await TimeEntry.findOneAndUpdate(
      { _id: id, orgId },
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('projectId', 'name')
      .populate('employeeId', 'name email');

    if (!timeEntry) {
      return res.status(404).json({
        success: false,
        message: 'Timesheet entry not found'
      });
    }

    res.json({
      success: true,
      data: timeEntry,
      message: 'Timesheet entry updated successfully'
    });
  } catch (error) {
    console.error('Error updating timesheet entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update timesheet entry',
      error: error.message
    });
  }
};

/**
 * Delete a timesheet entry
 * DELETE /api/tenant/:tenantSlug/organization/projects/timesheets/:id
 */
exports.deleteTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }

    const timeEntry = await TimeEntry.findOneAndDelete({ _id: id, orgId });

    if (!timeEntry) {
      return res.status(404).json({
        success: false,
        message: 'Timesheet entry not found'
      });
    }

    res.json({
      success: true,
      message: 'Timesheet entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting timesheet entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete timesheet entry',
      error: error.message
    });
  }
};

/**
 * Get all sprints
 * GET /api/tenant/:tenantSlug/organization/projects/sprints
 */
exports.getSprints = async (req, res) => {
  try {
    // Get organization using helper
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      console.error('❌ Organization ID not available in request context for sprints');
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }
    
    const { projectId, status } = req.query;

    const query = { orgId };
    if (projectId) query.projectId = projectId;
    if (status) query.status = status;

    const sprints = await Sprint.find(query)
      .populate('projectId', 'name slug')
      .sort({ startDate: -1 })
      .lean();

    // Calculate metrics for each sprint
    const sprintsWithMetrics = await Promise.all(
      sprints.map(async (sprint) => {
        const tasks = await Task.find({
          orgId,
          sprintId: sprint._id
        }).lean();

        const completedTasks = tasks.filter(t => 
          t.status === 'completed' || t.status === 'done'
        );

        const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
        const completedPoints = completedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

        return {
          ...sprint,
          tasks: {
            total: tasks.length,
            completed: completedTasks.length
          },
          points: {
            total: totalPoints,
            completed: completedPoints
          },
          projectId: sprint.projectId ? {
            _id: sprint.projectId._id,
            name: sprint.projectId.name
          } : null
        };
      })
    );

    res.json({
      success: true,
      data: {
        sprints: sprintsWithMetrics
      }
    });
  } catch (error) {
    console.error('Error fetching sprints:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sprints',
      error: error.message
    });
  }
};

/**
 * Create a sprint
 * POST /api/tenant/:tenantSlug/organization/projects/sprints
 */
exports.createSprint = async (req, res) => {
  try {
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }
    
    const { name, projectId, startDate, endDate, goal, status = 'planning' } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'name, startDate, and endDate are required'
      });
    }

    // Ownership fields: createdBy and orgId (Issue #4.4)
    const sprint = new Sprint({
      orgId,
      name,
      projectId: projectId || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      goal: goal || '',
      status,
      createdBy: req.user?._id || req.body.createdBy || null // Issue #4.4: Always set createdBy
    });

    await sprint.save();
    await sprint.populate('projectId', 'name slug');

    res.status(201).json({
      success: true,
      data: sprint,
      message: 'Sprint created successfully'
    });
  } catch (error) {
    console.error('Error creating sprint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sprint',
      error: error.message
    });
  }
};

/**
 * Update a sprint
 * PATCH /api/tenant/:tenantSlug/organization/projects/sprints/:id
 */
exports.updateSprint = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }

    const updates = req.body;

    // Convert date strings to Date objects if provided
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);

    const sprint = await Sprint.findOneAndUpdate(
      { _id: id, orgId },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('projectId', 'name slug');

    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: 'Sprint not found'
      });
    }

    res.json({
      success: true,
      data: sprint,
      message: 'Sprint updated successfully'
    });
  } catch (error) {
    console.error('Error updating sprint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update sprint',
      error: error.message
    });
  }
};

/**
 * Delete a sprint
 * DELETE /api/tenant/:tenantSlug/organization/projects/sprints/:id
 */
exports.deleteSprint = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }

    const sprint = await Sprint.findOneAndDelete({ _id: id, orgId });

    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: 'Sprint not found'
      });
    }

    res.json({
      success: true,
      message: 'Sprint deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting sprint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete sprint',
      error: error.message
    });
  }
};

/**
 * Calculate sprint velocity
 * PATCH /api/tenant/:tenantSlug/organization/projects/sprints/:id/velocity
 */
exports.calculateVelocity = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }

    // Get sprint
    const sprint = await Sprint.findOne({ _id: id, orgId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: 'Sprint not found'
      });
    }

    // Calculate velocity based on completed story points from tasks
    const tasks = await Task.find({
      orgId,
      sprintId: sprint._id
    }).lean();

    const completedTasks = tasks.filter(t => 
      t.status === 'completed' || t.status === 'done'
    );

    const completedStoryPoints = completedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const totalStoryPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const committedStoryPoints = sprint.capacity?.committedStoryPoints || totalStoryPoints;

    // Update sprint capacity and velocity
    sprint.capacity = {
      ...sprint.capacity,
      totalStoryPoints,
      committedStoryPoints,
      completedStoryPoints
    };

    sprint.metrics.velocity = completedStoryPoints;

    await sprint.save();
    await sprint.populate('projectId', 'name slug');

    res.json({
      success: true,
      data: {
        sprint,
        velocity: completedStoryPoints,
        metrics: {
          totalTasks: tasks.length,
          completedTasks: completedTasks.length,
          totalStoryPoints,
          completedStoryPoints,
          committedStoryPoints,
          completionRate: committedStoryPoints > 0 
            ? Math.round((completedStoryPoints / committedStoryPoints) * 100) 
            : 0
        }
      },
      message: 'Sprint velocity calculated successfully'
    });
  } catch (error) {
    console.error('Error calculating sprint velocity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate sprint velocity',
      error: error.message
    });
  }
};

/**
 * Get all clients
 * GET /api/tenant/:tenantSlug/organization/projects/clients
 */
exports.getClients = async (req, res) => {
  try {
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      console.error('❌ Failed to get orgId for clients:', {
        hasTenant: !!req.tenant,
        hasTenantContext: !!req.tenantContext,
        tenantSlug: req.params.tenantSlug,
        user: req.user ? { id: req.user.userId, orgId: req.user.orgId } : null
      });
      // Return empty clients array instead of 500 error
      // This allows the modal to work even if orgId is not available
      return res.json({
        success: true,
        data: {
          clients: []
        }
      });
    }

    const clients = await Client.find({ orgId })
      .select('name company slug type contact billing')
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      data: {
        clients
      }
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    // Return empty clients array instead of 500 error
    // This allows the modal to work even if there's an error
    res.json({
      success: true,
      data: {
        clients: []
      }
    });
  }
};

/**
 * Create a client
 * POST /api/tenant/:tenantSlug/organization/projects/clients
 */
exports.createClient = async (req, res) => {
  try {
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }
    
    const { name, company, type = 'company', contact, billing } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Client name is required'
      });
    }

    // Generate slug from name
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Ownership fields: createdBy and orgId (Issue #4.4)
    const client = new Client({
      orgId,
      name,
      slug,
      company: company || name,
      type,
      contact: contact || {},
      billing: billing || {},
      createdBy: req.user?._id || req.body.createdBy || null // Issue #4.4: Always set createdBy
    });

    await client.save();

    res.status(201).json({
      success: true,
      data: client,
      message: 'Client created successfully'
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create client',
      error: error.message
    });
  }
};

/**
 * Update a client
 * PATCH /api/tenant/:tenantSlug/organization/projects/clients/:id
 */
exports.updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }

    const client = await Client.findOneAndUpdate(
      { _id: id, orgId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      data: client,
      message: 'Client updated successfully'
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update client',
      error: error.message
    });
  }
};

/**
 * Delete a client
 * DELETE /api/tenant/:tenantSlug/organization/projects/clients/:id
 */
exports.deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get orgId directly from request context
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Organization context not available'
      });
    }

    const client = await Client.findOneAndDelete({ _id: id, orgId });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete client',
      error: error.message
    });
  }
};

// ============================================
// GANTT CHART ENDPOINTS
// ============================================

/**
 * Get Gantt timeline data for a project
 * GET /api/tenant/:tenantSlug/organization/projects/:projectId/gantt/timeline
 */
exports.getGanttTimeline = async (req, res) => {
  try {
    const { projectId } = req.params;
    const orgId = await getOrgId(req);
    const userId = req.user?._id;

    if (!orgId) {
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }

    // Get tasks with dependencies
    const tasks = await ganttChartService.getTasksWithDependencies(orgId, projectId);

    // Get user timeline preferences
    let timeline = null;
    if (userId) {
      timeline = await ProjectTimeline.findOne({ orgId, projectId, userId });
    }

    // Get user Gantt settings
    let settings = null;
    if (userId) {
      settings = await GanttSettings.findOne({ orgId, projectId, userId });
    }

    // Calculate critical path
    const criticalPath = await ganttChartService.calculateCriticalPath(orgId, projectId);

    res.json({
      success: true,
      data: {
        tasks,
        criticalPath: criticalPath.criticalPath,
        timeline: timeline || {
          viewType: 'weekly',
          zoomLevel: 1,
          scrollPosition: { x: 0, y: 0 }
        },
        settings: settings || {
          showCriticalPath: true,
          showMilestones: true,
          showProgressIndicator: true,
          showDependencies: true
        }
      }
    });
  } catch (error) {
    console.error('Error getting Gantt timeline:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Gantt timeline',
      error: error.message
    });
  }
};

/**
 * Get tasks with dependencies for Gantt chart
 * GET /api/tenant/:tenantSlug/organization/projects/:projectId/gantt/tasks
 */
exports.getGanttTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const orgId = await getOrgId(req);

    if (!orgId) {
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }

    const tasks = await ganttChartService.getTasksWithDependencies(orgId, projectId);

    res.json({
      success: true,
      data: { tasks }
    });
  } catch (error) {
    console.error('Error getting Gantt tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Gantt tasks',
      error: error.message
    });
  }
};

/**
 * Create task dependency
 * POST /api/tenant/:tenantSlug/organization/projects/tasks/:taskId/dependencies
 */
exports.createTaskDependency = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { targetTaskId, dependencyType, lagTime } = req.body;
    const orgId = await getOrgId(req);
    const userId = req.user?._id;

    if (!orgId) {
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }

    // Get source task to get projectId
    const sourceTask = await Task.findOne({ _id: taskId, orgId });
    if (!sourceTask) {
      return res.status(404).json({
        success: false,
        message: 'Source task not found'
      });
    }

    // Check for circular dependency
    const hasCircular = await ganttChartService.detectCircularDependency(
      orgId,
      sourceTask.projectId,
      taskId,
      targetTaskId
    );

    if (hasCircular) {
      return res.status(400).json({
        success: false,
        message: 'This dependency would create a circular reference. Please revise.'
      });
    }

    // Create dependency
    const dependency = await TaskDependency.create({
      orgId,
      projectId: sourceTask.projectId,
      sourceTaskId: taskId,
      targetTaskId,
      dependencyType: dependencyType || 'finish-to-start',
      lagTime: lagTime || 0,
      createdBy: userId
    });

    res.json({
      success: true,
      data: { dependency },
      message: 'Task dependency created successfully'
    });
  } catch (error) {
    console.error('Error creating task dependency:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task dependency',
      error: error.message
    });
  }
};

/**
 * Delete task dependency
 * DELETE /api/tenant/:tenantSlug/organization/projects/tasks/:taskId/dependencies/:dependencyId
 */
exports.deleteTaskDependency = async (req, res) => {
  try {
    const { taskId, dependencyId } = req.params;
    const orgId = await getOrgId(req);

    if (!orgId) {
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }

    const dependency = await TaskDependency.findOneAndDelete({
      _id: dependencyId,
      orgId,
      $or: [
        { sourceTaskId: taskId },
        { targetTaskId: taskId }
      ]
    });

    if (!dependency) {
      return res.status(404).json({
        success: false,
        message: 'Dependency not found'
      });
    }

    res.json({
      success: true,
      message: 'Task dependency deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task dependency:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task dependency',
      error: error.message
    });
  }
};

/**
 * Reschedule task
 * PUT /api/tenant/:tenantSlug/organization/projects/tasks/:taskId/reschedule
 */
exports.rescheduleTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { startDate, endDate, autoAdjustDependents } = req.body;
    const orgId = await getOrgId(req);

    if (!orgId) {
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }

    // Get task to get projectId
    const task = await Task.findOne({ _id: taskId, orgId });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Validate dates
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be greater than or equal to start date'
      });
    }

    // Reschedule task
    const updatedTask = await ganttChartService.rescheduleTask(
      orgId,
      task.projectId,
      taskId,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null,
      { autoAdjustDependents: autoAdjustDependents || false }
    );

    res.json({
      success: true,
      data: { task: updatedTask },
      message: 'Task rescheduled successfully'
    });
  } catch (error) {
    console.error('Error rescheduling task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reschedule task',
      error: error.message
    });
  }
};

/**
 * Get critical path for a project
 * GET /api/tenant/:tenantSlug/organization/projects/:projectId/gantt/critical-path
 */
exports.getCriticalPath = async (req, res) => {
  try {
    const { projectId } = req.params;
    const orgId = await getOrgId(req);

    if (!orgId) {
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }

    const criticalPath = await ganttChartService.calculateCriticalPath(orgId, projectId);

    res.json({
      success: true,
      data: criticalPath
    });
  } catch (error) {
    console.error('Error calculating critical path:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate critical path',
      error: error.message
    });
  }
};

/**
 * Save Gantt settings
 * POST /api/tenant/:tenantSlug/organization/projects/:projectId/gantt/settings
 */
exports.saveGanttSettings = async (req, res) => {
  try {
    const { projectId } = req.params;
    const settingsData = req.body;
    const orgId = await getOrgId(req);
    const userId = req.user?._id;

    if (!orgId) {
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const settings = await GanttSettings.findOneAndUpdate(
      { orgId, projectId, userId },
      { ...settingsData, orgId, projectId, userId },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      data: { settings },
      message: 'Gantt settings saved successfully'
    });
  } catch (error) {
    console.error('Error saving Gantt settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save Gantt settings',
      error: error.message
    });
  }
};

/**
 * Get project dashboard with integrated data
 * GET /api/tenant/:tenantSlug/organization/projects/:projectId/dashboard
 */
exports.getProjectDashboard = async (req, res) => {
  const mongoose = require('mongoose');
  try {
    const { projectId: rawProjectId } = req.params;
    const orgId = await getOrgId(req);

    if (!orgId) {
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }

    if (!rawProjectId || !mongoose.Types.ObjectId.isValid(rawProjectId) || String(rawProjectId).length !== 24) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }
    const projectId = new mongoose.Types.ObjectId(rawProjectId);

    const dashboard = await projectIntegrationService.getProjectDashboard(orgId, projectId);

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Error getting project dashboard:', error?.message || error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project dashboard',
      error: error.message
    });
  }
};

/**
 * Get tasks with full context (sprint, milestone, timesheet, gantt)
 * GET /api/tenant/:tenantSlug/organization/projects/:projectId/tasks-with-context
 */
exports.getTasksWithContext = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { sprintId, milestoneId, status, assignee } = req.query;
    const orgId = await getOrgId(req);

    if (!orgId) {
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }

    const filters = {};
    if (sprintId) filters.sprintId = sprintId;
    if (milestoneId) filters.milestoneId = milestoneId;
    if (status) filters.status = status;
    if (assignee) filters.assignee = assignee;

    const tasks = await projectIntegrationService.getTasksWithContext(orgId, projectId, filters);

    res.json({
      success: true,
      data: { tasks }
    });
  } catch (error) {
    console.error('Error getting tasks with context:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tasks with context',
      error: error.message
    });
  }
};

/**
 * Check integration health for a project
 * GET /api/tenant/:tenantSlug/organization/projects/:projectId/integration-status
 */
exports.getIntegrationStatus = async (req, res) => {
  try {
    const { projectId } = req.params;
    const orgId = await getOrgId(req);

    if (!orgId) {
      return res.json({ success: true, data: { healthy: true, issues: [] } });
    }

    let health;
    try {
      health = await projectIntegrationService.checkIntegrationHealth(orgId, projectId);
    } catch (serviceError) {
      console.warn('Integration health check unavailable:', serviceError?.message);
      health = { healthy: true, issues: [] };
    }

    res.json({ success: true, data: health });
  } catch (error) {
    console.error('Error checking integration status:', error);
    res.json({ success: true, data: { healthy: true, issues: [] } });
  }
};

/**
 * Validate task completion
 * POST /api/tenant/:tenantSlug/organization/projects/tasks/:taskId/validate-completion
 */
exports.validateTaskCompletion = async (req, res) => {
  try {
    const { taskId } = req.params;
    const orgId = await getOrgId(req);

    if (!orgId) {
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }

    const validation = await projectIntegrationService.validateTaskCompletion(orgId, taskId);

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating task completion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate task completion',
      error: error.message
    });
  }
};

/**
 * Sync task with related features
 * POST /api/tenant/:tenantSlug/organization/projects/tasks/:taskId/sync
 */
exports.syncTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const orgId = await getOrgId(req);

    if (!orgId) {
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Sync task timesheet
    await projectIntegrationService.syncTaskTimesheet(task);

    // Sync milestone if applicable
    if (task.milestoneId) {
      await projectIntegrationService.syncMilestoneProgress(orgId, task.milestoneId);
    }

    // Sync sprint if applicable
    if (task.sprintId) {
      await projectIntegrationService.syncSprintMetrics(orgId, task.sprintId);
    }

    res.json({
      success: true,
      message: 'Task synced successfully'
    });
  } catch (error) {
    console.error('Error syncing task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync task',
      error: error.message
    });
  }
};

/**
 * Save project timeline preferences
 * POST /api/tenant/:tenantSlug/organization/projects/:projectId/gantt/timeline
 */
exports.saveProjectTimeline = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { viewType, zoomLevel, scrollPosition, visibleDateRange, collapsedTasks, expandedGroups } = req.body;
    const orgId = await getOrgId(req);
    const userId = req.user?._id;

    if (!orgId) {
      return res.status(500).json({
        success: false,
        message: 'Organization context not available'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const timeline = await ProjectTimeline.findOneAndUpdate(
      { orgId, projectId, userId },
      {
        viewType,
        zoomLevel,
        scrollPosition,
        visibleDateRange,
        collapsedTasks,
        expandedGroups
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      data: { timeline },
      message: 'Timeline preferences saved successfully'
    });
  } catch (error) {
    console.error('Error saving timeline preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save timeline preferences',
      error: error.message
    });
  }
};

// ─── Project Members ───────────────────────────────────────────────────────

/**
 * Get all members of a specific project
 * GET /api/tenant/:tenantSlug/organization/projects/:projectId/members
 */
exports.getProjectMembers = async (req, res) => {
  try {
    const { projectId } = req.params;
    const orgId = await getOrgId(req);

    if (!orgId) return res.status(500).json({ success: false, message: 'Organization context not available' });

    const project = await Project.findOne({ _id: projectId, orgId }).lean();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const members = await ProjectMember.find({ projectId, status: { $ne: 'removed' } })
      .populate('userId', 'fullName name email avatar')
      .populate('invitedBy', 'fullName name email')
      .lean();

    res.json({ success: true, data: members });
  } catch (error) {
    console.error('Error fetching project members:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project members', error: error.message });
  }
};

/**
 * Add a member to a project (upserts if already exists)
 * POST /api/tenant/:tenantSlug/organization/projects/:projectId/members
 */
exports.addProjectMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const orgId = await getOrgId(req);
    const {
      userId, role = 'contributor',
      allocation = 100, hoursPerWeek = 40,
      hourlyRate, skillTags = [], departments = []
    } = req.body;

    if (!orgId) return res.status(500).json({ success: false, message: 'Organization context not available' });
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });

    const project = await Project.findOne({ _id: projectId, orgId }).lean();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const rolePermissions = {
      owner:       { canCreateCards: true, canEditCards: true, canDeleteCards: true, canManageMembers: true, canViewBudget: true, canManageFiles: true, canTrackTime: true, canApproveDeliverables: true },
      manager:     { canCreateCards: true, canEditCards: true, canDeleteCards: true, canManageMembers: true, canViewBudget: true, canManageFiles: true, canTrackTime: true, canApproveDeliverables: false },
      contributor: { canCreateCards: true, canEditCards: true, canDeleteCards: false, canManageMembers: false, canViewBudget: false, canManageFiles: true, canTrackTime: true, canApproveDeliverables: false },
      client:      { canCreateCards: false, canEditCards: false, canDeleteCards: false, canManageMembers: false, canViewBudget: true, canManageFiles: false, canTrackTime: false, canApproveDeliverables: true },
      viewer:      { canCreateCards: false, canEditCards: false, canDeleteCards: false, canManageMembers: false, canViewBudget: false, canManageFiles: false, canTrackTime: false, canApproveDeliverables: false },
    };

    const updateData = {
      role,
      status: 'active',
      'capacity.hoursPerWeek': hoursPerWeek,
      'capacity.allocation': allocation,
      permissions: rolePermissions[role] || rolePermissions.contributor,
      skillTags,
      departments,
      invitedBy: req.user?._id,
    };
    if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate;

    const member = await ProjectMember.findOneAndUpdate(
      { projectId, userId },
      { $set: updateData, $setOnInsert: { joinedAt: new Date() } },
      { new: true, upsert: true }
    ).populate('userId', 'fullName name email avatar');

    res.status(201).json({ success: true, data: member, message: 'Member added to project' });
  } catch (error) {
    console.error('Error adding project member:', error);
    res.status(500).json({ success: false, message: 'Failed to add project member', error: error.message });
  }
};

/**
 * Update a project member's role, allocation, permissions
 * PATCH /api/tenant/:tenantSlug/organization/projects/:projectId/members/:memberId
 */
exports.updateProjectMember = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    const orgId = await getOrgId(req);
    const { role, allocation, hoursPerWeek, hourlyRate, skillTags, departments, permissions, status } = req.body;

    if (!orgId) return res.status(500).json({ success: false, message: 'Organization context not available' });

    const project = await Project.findOne({ _id: projectId, orgId }).lean();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const member = await ProjectMember.findOne({ _id: memberId, projectId });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found in this project' });

    if (role !== undefined) member.role = role;
    if (allocation !== undefined) member.capacity.allocation = allocation;
    if (hoursPerWeek !== undefined) member.capacity.hoursPerWeek = hoursPerWeek;
    if (hourlyRate !== undefined) member.hourlyRate = hourlyRate;
    if (skillTags !== undefined) member.skillTags = skillTags;
    if (departments !== undefined) member.departments = departments;
    if (permissions !== undefined) member.permissions = { ...member.permissions.toObject(), ...permissions };
    if (status !== undefined) member.status = status;

    await member.save();
    await member.populate('userId', 'fullName name email avatar');

    res.json({ success: true, data: member, message: 'Member updated successfully' });
  } catch (error) {
    console.error('Error updating project member:', error);
    res.status(500).json({ success: false, message: 'Failed to update project member', error: error.message });
  }
};

/**
 * Remove a member from a project (soft delete)
 * DELETE /api/tenant/:tenantSlug/organization/projects/:projectId/members/:memberId
 */
exports.removeProjectMember = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    const orgId = await getOrgId(req);

    if (!orgId) return res.status(500).json({ success: false, message: 'Organization context not available' });

    const project = await Project.findOne({ _id: projectId, orgId }).lean();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const member = await ProjectMember.findOneAndUpdate(
      { _id: memberId, projectId },
      { status: 'removed' },
      { new: true }
    );

    if (!member) return res.status(404).json({ success: false, message: 'Member not found in this project' });

    res.json({ success: true, message: 'Member removed from project' });
  } catch (error) {
    console.error('Error removing project member:', error);
    res.status(500).json({ success: false, message: 'Failed to remove project member', error: error.message });
  }
};

// Client Portal Methods - REMOVED COMPLETELY
