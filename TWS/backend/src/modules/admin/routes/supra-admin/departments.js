/**
 * Supra Admin - Department Management routes
 */

const { express, body, validationResult, mongoose } = require('./shared');
const router = express.Router();
const {
  requirePlatformPermission,
  PLATFORM_PERMISSIONS,
  TWSAdmin,
  Department
} = require('./shared');

/**
 * @swagger
 * /api/supra-admin/departments:
 *   get:
 *     summary: List platform-level departments (tenantId/orgId null)
 *     description: >
 *       Also lazily creates a default "Platform Administration" department the first
 *       time this is called if one doesn't already exist, and returns departments as a
 *       parent/child tree with "Platform Administration" always first.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Department tree
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
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/departments', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.READ), async (req, res) => {
  try {
    let departments = await Department.find({ tenantId: null, orgId: null }).populate('parentDepartment', 'name code').sort({ name: 1 }).lean();
    const departmentHeadIds = departments.filter(d => d.departmentHead).map(d => d.departmentHead.toString());
    if (departmentHeadIds.length > 0) {
      const managers = await TWSAdmin.find({ _id: { $in: departmentHeadIds } }).select('fullName email role').lean();
      const managerMap = new Map(managers.map(m => [m._id.toString(), m]));
      departments.forEach(dept => {
        if (dept.departmentHead) {
          const m = managerMap.get(dept.departmentHead.toString());
          dept.departmentHead = m || null;
        }
      });
    }
    const platformAdminDept = departments.find(d => d.name === 'Platform Administration' || d.name === 'Platform Administrator');
    if (!platformAdminDept) {
      try {
        const defaultDept = new Department({ name: 'Platform Administration', code: 'PA', description: 'Platform-level department for Supra Admin users', status: 'active', tenantId: null, orgId: null, createdBy: req.user._id || new mongoose.Types.ObjectId(), defaultPermissions: ['read', 'write', 'admin'] });
        await defaultDept.save();
        departments.unshift(defaultDept.toObject());
      } catch (e) {
        departments.unshift({ _id: 'default-platform-administration', name: 'Platform Administration', code: 'PA', description: 'Platform-level department for Supra Admin users', status: 'active', isPlatformDepartment: true, isDefault: true });
      }
    } else {
      departments = departments.filter(d => d.name !== 'Platform Administration' && d.name !== 'Platform Administrator');
      departments.unshift(platformAdminDept);
    }
    const departmentMap = new Map();
    const rootDepartments = [];
    departments.forEach(dept => departmentMap.set(dept._id.toString(), { ...dept, children: [] }));
    departments.forEach(dept => {
      const deptObj = departmentMap.get(dept._id.toString());
      if (dept.parentDepartment) {
        const parent = departmentMap.get(dept.parentDepartment.toString());
        if (parent) parent.children.push(deptObj);
        else rootDepartments.push(deptObj);
      } else rootDepartments.push(deptObj);
    });
    res.json({ success: true, data: rootDepartments });
  } catch (error) {
    console.error('Error fetching platform departments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch platform departments' });
  }
});

/**
 * @swagger
 * /api/supra-admin/departments:
 *   post:
 *     summary: Create a platform-level department
 *     tags: [Admin]
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
 *                 description: Uppercased and must be unique among platform departments
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, archived]
 *                 default: active
 *               color:
 *                 type: string
 *                 default: '#1890ff'
 *               managerId:
 *                 type: string
 *                 description: TWSAdmin id to set as department head
 *               parentId:
 *                 type: string
 *               budget:
 *                 type: number
 *               location:
 *                 type: string
 *               contact:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 default: [read]
 *     responses:
 *       201:
 *         description: Department created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation failure or duplicate department code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/departments', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.CONFIGURE), [
  body('name').notEmpty().withMessage('Department name is required'),
  body('code').notEmpty().withMessage('Department code is required'),
  body('description').optional().isString(),
  body('status').optional().isIn(['active', 'inactive', 'archived']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    const { name, code, description, status, color, managerId, parentId, budget, location, contact, permissions } = req.body;
    const existingDept = await Department.findOne({ code: code.toUpperCase(), tenantId: null, orgId: null });
    if (existingDept) return res.status(400).json({ success: false, message: `Department with code "${code}" already exists` });
    const department = new Department({ name, code: code.toUpperCase(), description: description || '', status: status || 'active', tenantId: null, orgId: null, parentDepartment: parentId || null, departmentHead: managerId || null, departmentHeadModel: managerId ? 'TWSAdmin' : undefined, color: color || '#1890ff', defaultPermissions: permissions || ['read'], createdBy: req.user._id, createdByModel: 'TWSAdmin', metadata: { budget: budget || 0, location: location || '', contact: contact || '' } });
    await department.save();
    res.status(201).json({ success: true, message: 'Platform department created successfully', data: department });
  } catch (error) {
    console.error('Error creating platform department:', error);
    res.status(500).json({ success: false, message: 'Failed to create platform department', error: error.message });
  }
});

/**
 * @swagger
 * /api/supra-admin/departments/{id}:
 *   put:
 *     summary: Update a platform-level department
 *     tags: [Admin]
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
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, archived]
 *               managerId:
 *                 type: string
 *               parentId:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *               budget:
 *                 type: number
 *               location:
 *                 type: string
 *               contact:
 *                 type: string
 *     responses:
 *       200:
 *         description: Department updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation failure or duplicate department code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/departments/:id', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.UPDATE), [
  body('name').optional().notEmpty().withMessage('Department name cannot be empty'),
  body('code').optional().notEmpty().withMessage('Department code cannot be empty'),
  body('status').optional().isIn(['active', 'inactive', 'archived']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    const { id } = req.params;
    const updateData = req.body;
    const department = await Department.findOne({ _id: id, tenantId: null, orgId: null });
    if (!department) return res.status(404).json({ success: false, message: 'Platform department not found' });
    if (updateData.code && updateData.code.toUpperCase() !== department.code) {
      const existingDept = await Department.findOne({ code: updateData.code.toUpperCase(), tenantId: null, orgId: null, _id: { $ne: id } });
      if (existingDept) return res.status(400).json({ success: false, message: `Department with code "${updateData.code}" already exists` });
      updateData.code = updateData.code.toUpperCase();
    }
    Object.assign(department, updateData);
    if (updateData.managerId) { department.departmentHead = updateData.managerId; department.departmentHeadModel = 'TWSAdmin'; }
    if (updateData.parentId !== undefined) department.parentDepartment = updateData.parentId || null;
    if (updateData.permissions) department.defaultPermissions = updateData.permissions;
    if (updateData.budget !== undefined || updateData.location || updateData.contact) {
      department.metadata = { ...department.metadata, budget: updateData.budget !== undefined ? updateData.budget : department.metadata?.budget || 0, location: updateData.location || department.metadata?.location || '', contact: updateData.contact || department.metadata?.contact || '' };
    }
    await department.save();
    res.json({ success: true, message: 'Platform department updated successfully', data: department });
  } catch (error) {
    console.error('Error updating platform department:', error);
    res.status(500).json({ success: false, message: 'Failed to update platform department', error: error.message });
  }
});

/**
 * @swagger
 * /api/supra-admin/departments/{id}:
 *   delete:
 *     summary: Delete a platform-level department
 *     description: >
 *       Refuses to delete the "Platform Administration" department, and refuses if any
 *       active TWSAdmin users are still assigned to it.
 *     tags: [Admin]
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
 *         $ref: '#/components/schemas/Success'
 *       400:
 *         description: Protected department, or active admins still assigned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/departments/:id', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.DELETE), async (req, res) => {
  try {
    const department = await Department.findOne({ _id: req.params.id, tenantId: null, orgId: null });
    if (!department) return res.status(404).json({ success: false, message: 'Platform department not found' });
    if (department.name === 'Platform Administration' || department.name === 'Platform Administrator') return res.status(400).json({ success: false, message: 'Cannot delete "Platform Administration" department.' });
    const usersWithDept = await TWSAdmin.countDocuments({ department: department.name, status: 'active' });
    if (usersWithDept > 0) return res.status(400).json({ success: false, message: `Cannot delete department. ${usersWithDept} active platform admin(s) are assigned. Please reassign them first.` });
    await Department.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: 'Platform department deleted successfully' });
  } catch (error) {
    console.error('Error deleting platform department:', error);
    res.status(500).json({ success: false, message: 'Failed to delete platform department', error: error.message });
  }
});

/**
 * @swagger
 * /api/supra-admin/tenant-departments:
 *   get:
 *     summary: List tenant-scoped departments (always empty)
 *     description: >
 *       Platform departments are not assigned to tenants; this always returns an empty
 *       array with an explanatory message. Tenant departments live inside each tenant's
 *       own ERP system.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Always an empty list
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
 *                   items: {}
 *                   example: []
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/tenant-departments', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.READ), async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Platform departments are not assigned to tenants. Tenant departments are managed within each tenant\'s ERP system.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch tenant-departments' });
  }
});

/**
 * @swagger
 * /api/supra-admin/tenant-departments:
 *   post:
 *     summary: Assign a department to a tenant (unsupported)
 *     description: Always returns 400 — platform departments cannot be assigned to tenants.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       400:
 *         description: Not supported
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/tenant-departments', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.CONFIGURE), async (req, res) => {
  try {
    return res.status(400).json({ success: false, message: 'Platform departments cannot be assigned to tenants. Tenant departments are managed within each tenant\'s ERP system.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to assign departments' });
  }
});

/**
 * @swagger
 * /api/supra-admin/tenant-departments/{tenantId}/{departmentId}:
 *   delete:
 *     summary: Remove a department from a tenant (unsupported)
 *     description: Always returns 400 — platform departments are not assigned to tenants.
 *     tags: [Admin]
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
 *       400:
 *         description: Not supported
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/tenant-departments/:tenantId/:departmentId', requirePlatformPermission(PLATFORM_PERMISSIONS.TENANTS.UPDATE), async (req, res) => {
  try {
    return res.status(400).json({ success: false, message: 'Platform departments are not assigned to tenants. Tenant departments are managed within each tenant\'s ERP system.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove department' });
  }
});

module.exports = router;
