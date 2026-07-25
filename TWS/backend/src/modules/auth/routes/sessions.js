const express = require('express');
const router = express.Router();
const verifyERPToken = require('../../../middleware/auth/verifyERPToken');
const { body, validationResult } = require('express-validator');

// Import models
const Session = require('../../../models/core/Session');
const DepartmentAccess = require('../../../models/org/DepartmentAccess');
const Department = require('../../../models/org/Department');
const Tenant = require('../../../models/tenant/Tenant');
const User = require('../../../models/users-auth/User');
const SupraAdmin = require('../../../models/admin-platform/SupraAdmin');

// Import RBAC middleware for consistent authorization
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');

// Apply consistent authentication and authorization middleware
router.use(verifyERPToken);
router.use(requireErpAccess({ allowedRoles: ['supra_admin', 'super_admin'], checkRevocation: true }));

// ==================== SESSION MANAGEMENT ====================

/**
 * @swagger
 * /api/sessions/sessions:
 *   get:
 *     summary: List sessions (Supra Admin)
 *     description: Requires role supra_admin or super_admin.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           default: active
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Matches against user name/email or IP address
 *     responses:
 *       200:
 *         description: Paginated list of sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     current:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Failed to fetch sessions
 */
// Get all active sessions
router.get('/sessions', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      tenantId, 
      department, 
      status = 'active',
      search 
    } = req.query;
    
    const filter = { status };
    
    if (tenantId) filter.tenantId = tenantId;
    if (department) {
      filter['departmentAccess.department'] = department;
      filter['departmentAccess.isActive'] = true;
    }
    if (search) {
      filter.$or = [
        { 'userId.fullName': { $regex: search, $options: 'i' } },
        { 'userId.email': { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } }
      ];
    }
    
    const sessions = await Session.find(filter)
      .populate('userId', 'fullName email role department')
      .populate('tenantId', 'name slug')
      .populate('orgId', 'name slug')
      .populate('departmentAccess.grantedBy', 'fullName email')
      .sort({ lastActivity: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Session.countDocuments(filter);
    
    res.json({
      sessions,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ message: 'Failed to fetch sessions' });
  }
});

/**
 * @swagger
 * /api/sessions/sessions/{id}:
 *   get:
 *     summary: Get session details by ID (Supra Admin)
 *     description: Requires role supra_admin or super_admin.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session document
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Session not found
 *       500:
 *         description: Failed to fetch session
 */
// Get session details
router.get('/sessions/:id', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('userId', 'fullName email role department')
      .populate('tenantId', 'name slug')
      .populate('orgId', 'name slug')
      .populate('departmentAccess.grantedBy', 'fullName email')
      .populate('terminatedBy', 'fullName email');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ message: 'Failed to fetch session' });
  }
});

/**
 * @swagger
 * /api/sessions/sessions/{id}/terminate:
 *   post:
 *     summary: Terminate a session (Supra Admin)
 *     description: Requires role supra_admin or super_admin.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Session terminated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Session not found
 *       500:
 *         description: Failed to terminate session
 */
// Terminate session
router.post('/sessions/:id/terminate', [
  body('reason').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    await session.terminate(req.user._id, req.body.reason);
    
    res.json({ message: 'Session terminated successfully' });
  } catch (error) {
    console.error('Terminate session error:', error);
    res.status(500).json({ message: 'Failed to terminate session' });
  }
});

/**
 * @swagger
 * /api/sessions/sessions/{id}/department-access:
 *   post:
 *     summary: Grant department access to a session (Supra Admin)
 *     description: Requires role supra_admin or super_admin.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [department, permissions]
 *             properties:
 *               department:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Department access granted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Session not found
 *       500:
 *         description: Failed to grant department access
 */
// Grant department access to session
router.post('/sessions/:id/department-access', [
  body('department').notEmpty().withMessage('Department is required'),
  body('permissions').isArray().withMessage('Permissions must be an array'),
  body('expiresAt').optional().isISO8601().withMessage('Invalid expiration date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    const { department, permissions, expiresAt } = req.body;
    
    await session.grantDepartmentAccess(department, permissions, req.user._id, expiresAt);
    
    res.json({ message: 'Department access granted successfully' });
  } catch (error) {
    console.error('Grant department access error:', error);
    res.status(500).json({ message: 'Failed to grant department access' });
  }
});

/**
 * @swagger
 * /api/sessions/sessions/{id}/department-access/{department}:
 *   delete:
 *     summary: Revoke department access from a session (Supra Admin)
 *     description: Requires role supra_admin or super_admin.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: department
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Department access revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Session not found
 *       500:
 *         description: Failed to revoke department access
 */
// Revoke department access from session
router.delete('/sessions/:id/department-access/:department', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    await session.revokeDepartmentAccess(req.params.department);
    
    res.json({ message: 'Department access revoked successfully' });
  } catch (error) {
    console.error('Revoke department access error:', error);
    res.status(500).json({ message: 'Failed to revoke department access' });
  }
});

// ==================== DEPARTMENT ACCESS MANAGEMENT ====================

/**
 * @swagger
 * /api/sessions/department-access:
 *   get:
 *     summary: List department access records (Supra Admin)
 *     description: Requires role supra_admin or super_admin.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           default: active
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of department access records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessRecords:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     current:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Failed to fetch department access records
 */
// Get all department access records
router.get('/department-access', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      tenantId, 
      department, 
      status = 'active',
      search 
    } = req.query;
    
    const filter = { status };
    
    if (tenantId) filter.tenantId = tenantId;
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { 'userId.fullName': { $regex: search, $options: 'i' } },
        { 'userId.email': { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }
    
    const accessRecords = await DepartmentAccess.find(filter)
      .populate('userId', 'fullName email role department')
      .populate('tenantId', 'name slug')
      .populate('orgId', 'name slug')
      .populate('grantedBy', 'fullName email')
      .populate('revokedBy', 'fullName email')
      .sort({ lastAccessed: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await DepartmentAccess.countDocuments(filter);
    
    res.json({
      accessRecords,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get department access error:', error);
    res.status(500).json({ message: 'Failed to fetch department access records' });
  }
});

/**
 * @swagger
 * /api/sessions/department-access:
 *   post:
 *     summary: Grant department access to a user (Supra Admin)
 *     description: Requires role supra_admin or super_admin.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenantId, userId, department, permissions, accessLevel]
 *             properties:
 *               tenantId:
 *                 type: string
 *               userId:
 *                 type: string
 *               department:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *               accessLevel:
 *                 type: string
 *                 enum: [viewer, contributor, editor, admin, owner]
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               conditions:
 *                 type: object
 *     responses:
 *       201:
 *         description: Department access record created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Validation failed, or access already exists for this user
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Failed to grant department access
 */
// Grant department access to user
router.post('/department-access', [
  body('tenantId').isMongoId().withMessage('Valid tenant ID is required'),
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('department').notEmpty().withMessage('Department is required'),
  body('permissions').isArray().withMessage('Permissions must be an array'),
  body('accessLevel').isIn(['viewer', 'contributor', 'editor', 'admin', 'owner']).withMessage('Valid access level is required'),
  body('expiresAt').optional().isISO8601().withMessage('Invalid expiration date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { tenantId, userId, department, permissions, accessLevel, expiresAt, conditions } = req.body;
    
    // Check if access already exists
    const existingAccess = await DepartmentAccess.findOne({
      tenantId,
      userId,
      department,
      status: 'active'
    });
    
    if (existingAccess) {
      return res.status(400).json({ message: 'Department access already exists for this user' });
    }
    
    // Create new access record
    const accessRecord = new DepartmentAccess({
      tenantId,
      userId,
      orgId: (await User.findById(userId)).orgId,
      department,
      permissions,
      accessLevel,
      expiresAt,
      conditions,
      grantedBy: req.user._id
    });
    
    await accessRecord.save();
    
    // Log the action
    accessRecord.auditLog.push({
      action: 'granted',
      performedBy: req.user._id,
      details: { permissions, accessLevel, expiresAt }
    });
    await accessRecord.save();
    
    res.status(201).json(accessRecord);
  } catch (error) {
    console.error('Grant department access error:', error);
    res.status(500).json({ message: 'Failed to grant department access' });
  }
});

/**
 * @swagger
 * /api/sessions/department-access/{id}:
 *   put:
 *     summary: Update a department access record (Supra Admin)
 *     description: Requires role supra_admin or super_admin.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *               accessLevel:
 *                 type: string
 *                 enum: [viewer, contributor, editor, admin, owner]
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               conditions:
 *                 type: object
 *     responses:
 *       200:
 *         description: Updated department access record
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Department access record not found
 *       500:
 *         description: Failed to update department access
 */
// Update department access
router.put('/department-access/:id', [
  body('permissions').optional().isArray().withMessage('Permissions must be an array'),
  body('accessLevel').optional().isIn(['viewer', 'contributor', 'editor', 'admin', 'owner']).withMessage('Valid access level is required'),
  body('expiresAt').optional().isISO8601().withMessage('Invalid expiration date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const accessRecord = await DepartmentAccess.findById(req.params.id);
    if (!accessRecord) {
      return res.status(404).json({ message: 'Department access record not found' });
    }
    
    const updateData = {};
    if (req.body.permissions) updateData.permissions = req.body.permissions;
    if (req.body.accessLevel) updateData.accessLevel = req.body.accessLevel;
    if (req.body.expiresAt) updateData.expiresAt = req.body.expiresAt;
    if (req.body.conditions) updateData.conditions = req.body.conditions;
    
    Object.assign(accessRecord, updateData);
    
    // Log the modification
    accessRecord.auditLog.push({
      action: 'modified',
      performedBy: req.user._id,
      details: updateData
    });
    
    await accessRecord.save();
    
    res.json(accessRecord);
  } catch (error) {
    console.error('Update department access error:', error);
    res.status(500).json({ message: 'Failed to update department access' });
  }
});

/**
 * @swagger
 * /api/sessions/department-access/{id}/suspend:
 *   post:
 *     summary: Suspend a department access record (Supra Admin)
 *     description: Requires role supra_admin or super_admin.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Department access suspended successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Department access record not found
 *       500:
 *         description: Failed to suspend department access
 */
// Suspend department access
router.post('/department-access/:id/suspend', [
  body('reason').optional().isString()
], async (req, res) => {
  try {
    const accessRecord = await DepartmentAccess.findById(req.params.id);
    if (!accessRecord) {
      return res.status(404).json({ message: 'Department access record not found' });
    }
    
    await accessRecord.suspend(req.user._id, req.body.reason);
    
    res.json({ message: 'Department access suspended successfully' });
  } catch (error) {
    console.error('Suspend department access error:', error);
    res.status(500).json({ message: 'Failed to suspend department access' });
  }
});

/**
 * @swagger
 * /api/sessions/department-access/{id}/revoke:
 *   post:
 *     summary: Revoke a department access record (Supra Admin)
 *     description: Requires role supra_admin or super_admin.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Department access revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Department access record not found
 *       500:
 *         description: Failed to revoke department access
 */
// Revoke department access
router.post('/department-access/:id/revoke', [
  body('reason').optional().isString()
], async (req, res) => {
  try {
    const accessRecord = await DepartmentAccess.findById(req.params.id);
    if (!accessRecord) {
      return res.status(404).json({ message: 'Department access record not found' });
    }
    
    await accessRecord.revoke(req.user._id, req.body.reason);
    
    res.json({ message: 'Department access revoked successfully' });
  } catch (error) {
    console.error('Revoke department access error:', error);
    res.status(500).json({ message: 'Failed to revoke department access' });
  }
});

// ==================== DEPARTMENT MANAGEMENT ====================

/**
 * @swagger
 * /api/sessions/departments:
 *   get:
 *     summary: List departments (Supra Admin)
 *     description: >
 *       Requires role supra_admin or super_admin. If `tenantId` is provided,
 *       returns that tenant's departments; otherwise returns all departments
 *       (for assignment purposes).
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *           default: 'false'
 *     responses:
 *       200:
 *         description: List of departments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Failed to fetch departments
 */
// Get all departments
router.get('/departments', async (req, res) => {
  try {
    const { tenantId, includeInactive = false } = req.query;
    
    let departments;
    if (tenantId) {
      // Get departments for specific tenant
      departments = await Department.findByTenant(tenantId, includeInactive === 'true');
    } else {
      // Get all departments (for assignment purposes)
      const filter = { status: 'active' };
      if (includeInactive === 'true') {
        delete filter.status;
      }
      departments = await Department.find(filter).select('name code description status');
    }
    
    res.json({ success: true, data: departments });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch departments' });
  }
});

/**
 * @swagger
 * /api/sessions/departments:
 *   post:
 *     summary: Create a department (Supra Admin)
 *     description: Requires role supra_admin or super_admin.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code]
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *                 description: Normalized to uppercase server-side
 *               description:
 *                 type: string
 *               tenantId:
 *                 type: string
 *                 description: Omit to create a global department
 *               settings:
 *                 type: object
 *               defaultPermissions:
 *                 type: object
 *     responses:
 *       201:
 *         description: Department created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Validation failed, or department code already exists
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Failed to create department
 */
// Create department
router.post('/departments', [
  body('name').notEmpty().withMessage('Department name is required'),
  body('code').notEmpty().withMessage('Department code is required'),
  body('description').optional().isString(),
  body('tenantId').optional().isMongoId().withMessage('Valid tenant ID is required if provided')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { tenantId, name, code, description, settings, defaultPermissions } = req.body;
    
    // Check if department code already exists (globally or for this tenant)
    const existingDepartment = await Department.findOne({
      $or: [
        { tenantId: null, code: code.toUpperCase() }, // Global department
        { tenantId, code: code.toUpperCase() } // Tenant-specific department
      ]
    });
    
    if (existingDepartment) {
      return res.status(400).json({ message: 'Department code already exists' });
    }
    
    const department = new Department({
      tenantId: tenantId || null, // Allow null for global departments
      orgId: tenantId ? (await Tenant.findById(tenantId))?.orgId : null,
      name,
      code: code.toUpperCase(),
      description,
      settings,
      defaultPermissions,
      createdBy: req.user._id
    });
    
    await department.save();
    
    res.status(201).json(department);
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ message: 'Failed to create department' });
  }
});

/**
 * @swagger
 * /api/sessions/departments/{id}:
 *   put:
 *     summary: Update a department (Supra Admin)
 *     description: >
 *       Requires role supra_admin or super_admin. No request-body validation
 *       middleware is applied; fields are read as-is if present.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               settings:
 *                 type: object
 *               defaultPermissions:
 *                 type: object
 *               departmentHead:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated department
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Department not found
 *       500:
 *         description: Failed to update department
 */
// Update department
router.put('/departments/:id', async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    const updateData = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.settings) updateData.settings = req.body.settings;
    if (req.body.defaultPermissions) updateData.defaultPermissions = req.body.defaultPermissions;
    if (req.body.departmentHead) updateData.departmentHead = req.body.departmentHead;
    if (req.body.status) updateData.status = req.body.status;
    
    Object.assign(department, updateData);
    await department.save();
    
    res.json(department);
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ message: 'Failed to update department' });
  }
});

// ==================== ANALYTICS & REPORTS ====================

/**
 * @swagger
 * /api/sessions/analytics/sessions:
 *   get:
 *     summary: Get session analytics (Supra Admin)
 *     description: Requires role supra_admin or super_admin.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [1d, 7d, 30d]
 *           default: 7d
 *     responses:
 *       200:
 *         description: Session analytics summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalSessions:
 *                   type: integer
 *                 activeSessions:
 *                   type: integer
 *                 uniqueUsers:
 *                   type: integer
 *                 averageSessionDuration:
 *                   type: number
 *                 sessionsByTenant:
 *                   type: object
 *                 sessionsByDepartment:
 *                   type: object
 *                 topUsers:
 *                   type: object
 *                 hourlyDistribution:
 *                   type: array
 *                   items:
 *                     type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Failed to fetch session analytics
 */
// Get session analytics
router.get('/analytics/sessions', async (req, res) => {
  try {
    const { tenantId, period = '7d' } = req.query;
    
    const filter = { status: 'active' };
    if (tenantId) filter.tenantId = tenantId;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    switch (period) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    filter.loginTime = { $gte: startDate };
    
    const sessions = await Session.find(filter)
      .populate('tenantId', 'name slug')
      .populate('userId', 'fullName email department');
    
    // Generate analytics
    const analytics = {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'active').length,
      uniqueUsers: [...new Set(sessions.map(s => s.userId._id.toString()))].length,
      averageSessionDuration: sessions.reduce((acc, s) => acc + s.duration, 0) / sessions.length,
      sessionsByTenant: {},
      sessionsByDepartment: {},
      topUsers: {},
      hourlyDistribution: new Array(24).fill(0)
    };
    
    // Process sessions data
    sessions.forEach(session => {
      // By tenant
      const tenantName = session.tenantId.name;
      analytics.sessionsByTenant[tenantName] = (analytics.sessionsByTenant[tenantName] || 0) + 1;
      
      // By department
      session.departmentAccess.forEach(da => {
        if (da.isActive) {
          analytics.sessionsByDepartment[da.department] = (analytics.sessionsByDepartment[da.department] || 0) + 1;
        }
      });
      
      // Top users
      const userName = session.userId.fullName;
      analytics.topUsers[userName] = (analytics.topUsers[userName] || 0) + 1;
      
      // Hourly distribution
      const hour = new Date(session.loginTime).getHours();
      analytics.hourlyDistribution[hour]++;
    });
    
    res.json(analytics);
  } catch (error) {
    console.error('Get session analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch session analytics' });
  }
});

/**
 * @swagger
 * /api/sessions/analytics/department-access:
 *   get:
 *     summary: Get department access summary (Supra Admin)
 *     description: Requires role supra_admin or super_admin.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Department access summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Tenant ID is required
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Failed to fetch department access summary
 */
// Get department access summary
router.get('/analytics/department-access', async (req, res) => {
  try {
    const { tenantId } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }
    
    const summary = await DepartmentAccess.getDepartmentAccessSummary(tenantId);
    
    res.json(summary);
  } catch (error) {
    console.error('Get department access summary error:', error);
    res.status(500).json({ message: 'Failed to fetch department access summary' });
  }
});

// ==================== UTILITY ENDPOINTS ====================

/**
 * @swagger
 * /api/sessions/cleanup/expired-sessions:
 *   post:
 *     summary: Clean up expired sessions (Supra Admin)
 *     description: Requires role supra_admin or super_admin.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired sessions cleaned up
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 modifiedCount:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Failed to cleanup expired sessions
 */
// Cleanup expired sessions
router.post('/cleanup/expired-sessions', async (req, res) => {
  try {
    const result = await Session.cleanupExpiredSessions();
    res.json({ 
      message: 'Expired sessions cleaned up successfully',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Cleanup expired sessions error:', error);
    res.status(500).json({ message: 'Failed to cleanup expired sessions' });
  }
});

/**
 * @swagger
 * /api/sessions/cleanup/expired-access:
 *   post:
 *     summary: Clean up expired department access records (Supra Admin)
 *     description: Requires role supra_admin or super_admin.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired department access records cleaned up
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 modifiedCount:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Failed to cleanup expired access
 */
// Cleanup expired department access
router.post('/cleanup/expired-access', async (req, res) => {
  try {
    const result = await DepartmentAccess.cleanupExpiredAccess();
    res.json({ 
      message: 'Expired department access cleaned up successfully',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Cleanup expired access error:', error);
    res.status(500).json({ message: 'Failed to cleanup expired access' });
  }
});

// ==================== TENANT-DEPARTMENT MANAGEMENT ====================

/**
 * @swagger
 * /api/sessions/tenant-departments:
 *   get:
 *     summary: List tenant-department assignments (Supra Admin)
 *     description: Requires role supra_admin or super_admin.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tenants with their assigned departments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       slug:
 *                         type: string
 *                       status:
 *                         type: string
 *                       departments:
 *                         type: array
 *                         items:
 *                           type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Failed to fetch tenant-departments
 */
// Get all tenant-department assignments
router.get('/tenant-departments', async (req, res) => {
  try {
    // For now, return empty array since we're using a different approach
    // where departments are assigned by updating their tenantId field
    // This endpoint will be used to show which departments are assigned to which tenants
    const tenantDepartments = await Tenant.aggregate([
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: 'tenantId',
          as: 'departments'
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          status: 1,
          departments: {
            $map: {
              input: '$departments',
              as: 'dept',
              in: {
                id: '$$dept._id',
                name: '$$dept.name',
                code: '$$dept.code',
                description: '$$dept.description',
                status: '$$dept.status',
                assignedAt: '$$dept.updatedAt', // Use updatedAt when tenantId was set
                assignedBy: 'System'
              }
            }
          }
        }
      },
      {
        $match: {
          'departments.0': { $exists: true }
        }
      }
    ]);

    res.json({ success: true, data: tenantDepartments });
  } catch (error) {
    console.error('Get tenant-departments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tenant-departments' });
  }
});

/**
 * @swagger
 * /api/sessions/tenant-departments:
 *   post:
 *     summary: Assign departments to a tenant (Supra Admin)
 *     description: Requires role supra_admin or super_admin.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenantId, departmentIds]
 *             properties:
 *               tenantId:
 *                 type: string
 *               departmentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Departments assigned to tenant successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation failed, or some departments not found
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Tenant not found
 *       500:
 *         description: Failed to assign departments
 */
// Assign departments to tenant
router.post('/tenant-departments', [
  body('tenantId').isMongoId().withMessage('Valid tenant ID is required'),
  body('departmentIds').isArray().withMessage('Department IDs must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { tenantId, departmentIds } = req.body;
    
    // Get tenant
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    
    // Get departments
    const departments = await Department.find({ _id: { $in: departmentIds } });
    if (departments.length !== departmentIds.length) {
      return res.status(400).json({ success: false, message: 'Some departments not found' });
    }
    
    // Update departments to belong to this tenant
    await Department.updateMany(
      { _id: { $in: departmentIds } },
      { 
        $set: { 
          tenantId: tenantId,
          orgId: tenant.orgId || tenant._id // Use orgId if exists, otherwise use tenantId
        }
      }
    );
    
    res.json({ success: true, message: 'Departments assigned to tenant successfully' });
  } catch (error) {
    console.error('Assign departments error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign departments' });
  }
});

/**
 * @swagger
 * /api/sessions/tenant-departments/{tenantId}/{departmentId}:
 *   delete:
 *     summary: Remove a department from a tenant (Supra Admin)
 *     description: Requires role supra_admin or super_admin.
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Department removed from tenant successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Failed to remove department
 */
// Remove department from tenant
router.delete('/tenant-departments/:tenantId/:departmentId', async (req, res) => {
  try {
    const { tenantId, departmentId } = req.params;
    
    // Remove department from tenant
    await Department.findByIdAndUpdate(departmentId, {
      $unset: { tenantId: 1, orgId: 1 }
    });
    
    res.json({ success: true, message: 'Department removed from tenant successfully' });
  } catch (error) {
    console.error('Remove department error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove department' });
  }
});

module.exports = router;
