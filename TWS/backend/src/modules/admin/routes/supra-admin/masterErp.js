/**
 * Supra Admin - Master ERP Templates routes
 */

const { express, body, validationResult } = require('./shared');
const router = express.Router();
const {
  requirePlatformPermission,
  PLATFORM_PERMISSIONS,
  MasterERP,
  auditService
} = require('./shared');

// Get all Master ERP templates
/**
 * @swagger
 * /api/supra-admin/master-erp:
 *   get:
 *     summary: List Master ERP templates
 *     description: Sorted by usageCount descending, with createdBy populated (fullName, email).
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Master ERP templates
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
router.get('/master-erp', requirePlatformPermission(PLATFORM_PERMISSIONS.TEMPLATES.READ), async (req, res) => {
  try {
    const masterERPs = await MasterERP.find()
      .sort({ usageCount: -1 })
      .populate('createdBy', 'fullName email');

    res.json({
      success: true,
      data: masterERPs
    });
  } catch (error) {
    console.error('Get Master ERP templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve Master ERP templates',
      error: error.message
    });
  }
});

// Create new Master ERP template
/**
 * @swagger
 * /api/supra-admin/master-erp:
 *   post:
 *     summary: Create a Master ERP template
 *     description: >
 *       Accepts arbitrary additional fields in the body beyond the validated ones below
 *       (the handler spreads `req.body` onto the new MasterERP document).
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, industry]
 *             properties:
 *               name:
 *                 type: string
 *               industry:
 *                 type: string
 *                 enum: [software_house, business, finance]
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Master ERP template created
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
 *         description: Validation failure
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
router.post('/master-erp',
  requirePlatformPermission(PLATFORM_PERMISSIONS.TEMPLATES.CREATE),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('industry').isIn(['software_house', 'business', 'finance']).withMessage('Invalid industry'),
    body('description').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const masterERP = new MasterERP({
        ...req.body,
        createdBy: req.user._id
      });

      await masterERP.save();

      await auditService.logAdminEvent(
        'MASTER_ERP_CREATE',
        req.user._id,
        null,
        {
          masterERPId: masterERP._id,
          industry: masterERP.industry,
          details: {
            action: 'master_erp_create',
            templateName: masterERP.name
          }
        }
      );

      res.status(201).json({
        success: true,
        message: 'Master ERP template created successfully',
        data: masterERP
      });
    } catch (error) {
      console.error('Create Master ERP template error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create Master ERP template',
        error: error.message
      });
    }
  }
);

module.exports = router;
