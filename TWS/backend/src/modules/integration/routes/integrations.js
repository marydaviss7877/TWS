const express = require('express');
const { body, query, param } = require('express-validator');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const financeRead = requireErpAccess({ module: 'finance', action: 'read', checkRevocation: true, sensitive: true, auditResourceType: 'finance' });
const financeWrite = requireErpAccess({ module: 'finance', action: 'write', checkRevocation: true, sensitive: true, auditResourceType: 'finance' });
const ErrorHandler = require('../../../middleware/common/errorHandler');
const ValidationMiddleware = require('../../../middleware/validation/validation');
const {
  IntegrationConfig,
  IntegrationLog
} = require('../../../models/Integration');
// const PaymentGatewayService = require('../../../services/integrations/PaymentGatewayService'); // Service not yet implemented

const router = express.Router();

// ==================== INTEGRATION CONFIGURATION ROUTES ====================

// Get all integrations
router.get('/', [
  financeRead,
  query('type').optional().isIn(['project_management', 'payment_gateway', 'accounting', 'hr']),
  query('status').optional().isIn(['active', 'inactive', 'error', 'pending'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const filter = { orgId: req.user.orgId };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;

  const integrations = await IntegrationConfig.find(filter)
    .populate('mappings.projects.internalId', 'name status')
    .populate('mappings.clients.internalId', 'name email')
    .populate('mappings.users.internalId', 'fullName email')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: { integrations }
  });
}));

// Get integration by ID
router.get('/:id', [
  financeRead,
  param('id').isMongoId()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const integration = await IntegrationConfig.findOne({
    _id: req.params.id,
    orgId: req.user.orgId
  })
    .populate('mappings.projects.internalId', 'name status')
    .populate('mappings.clients.internalId', 'name email')
    .populate('mappings.users.internalId', 'fullName email');

  if (!integration) {
    return res.status(404).json({
      success: false,
      message: 'Integration not found'
    });
  }

  res.json({
    success: true,
    data: { integration }
  });
}));

// Create integration
router.post('/', [
  financeWrite,
  body('name').notEmpty().trim(),
  body('type').isIn(['project_management', 'payment_gateway', 'accounting', 'hr']),
  body('provider').notEmpty().trim(),
  body('credentials').isObject(),
  body('settings').optional().isObject()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const integration = new IntegrationConfig({
    ...req.body,
    orgId: req.user.orgId
  });

  await integration.save();

  res.status(201).json({
    success: true,
    message: 'Integration created successfully',
    data: { integration }
  });
}));

// Update integration
router.put('/:id', [
  financeWrite,
  param('id').isMongoId(),
  body('name').optional().notEmpty().trim(),
  body('status').optional().isIn(['active', 'inactive', 'error', 'pending']),
  body('credentials').optional().isObject(),
  body('settings').optional().isObject(),
  body('mappings').optional().isObject()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const integration = await IntegrationConfig.findOneAndUpdate(
    { _id: req.params.id, orgId: req.user.orgId },
    req.body,
    { new: true }
  );

  if (!integration) {
    return res.status(404).json({
      success: false,
      message: 'Integration not found'
    });
  }

  res.json({
    success: true,
    message: 'Integration updated successfully',
    data: { integration }
  });
}));

// Delete integration
router.delete('/:id', [
  financeWrite,
  param('id').isMongoId()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const integration = await IntegrationConfig.findOneAndDelete({
    _id: req.params.id,
    orgId: req.user.orgId
  });

  if (!integration) {
    return res.status(404).json({
      success: false,
      message: 'Integration not found'
    });
  }

  res.json({
    success: true,
    message: 'Integration deleted successfully'
  });
}));

// ==================== INTEGRATION TESTING ROUTES ====================

// Test integration connection
router.post('/:id/test', [
  financeWrite,
  param('id').isMongoId()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const integration = await IntegrationConfig.findOne({
    _id: req.params.id,
    orgId: req.user.orgId
  });

  if (!integration) {
    return res.status(404).json({
      success: false,
      message: 'Integration not found'
    });
  }

  // No external integration services are currently enabled for connection tests.
  return res.status(400).json({
    success: false,
    message: 'Connection test is not supported for this integration type'
  });
}));

// ==================== PAYMENT GATEWAY INTEGRATION ROUTES ====================

// Create payment intent
router.post('/:id/payment-intent', [
  financeWrite,
  param('id').isMongoId(),
  body('invoiceId').isMongoId(),
  body('amount').isNumeric(),
  body('currency').optional().isString(),
  body('metadata').optional().isObject()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const integration = await IntegrationConfig.findOne({
    _id: req.params.id,
    orgId: req.user.orgId,
    type: 'payment_gateway'
  });

  if (!integration) {
    return res.status(404).json({
      success: false,
      message: 'Payment gateway integration not found'
    });
  }

  // const service = new PaymentGatewayService(integration); // PaymentGatewayService not yet implemented
  throw new Error('PaymentGatewayService is not yet implemented');
  const paymentIntent = await service.createPaymentIntent(
    req.body.invoiceId,
    req.body.amount,
    req.body.currency || 'USD',
    req.body.metadata || {}
  );

  res.json({
    success: true,
    message: 'Payment intent created successfully',
    data: { paymentIntent }
  });
}));

// Handle payment webhook
router.post('/:id/webhook/payment', [
  param('id').isMongoId(),
  body('payload').notEmpty(),
  body('signature').notEmpty(),
  body('eventType').notEmpty()
], ErrorHandler.asyncHandler(async (req, res) => {
  const integration = await IntegrationConfig.findOne({
    _id: req.params.id,
    type: 'payment_gateway'
  });

  if (!integration) {
    return res.status(404).json({
      success: false,
      message: 'Payment gateway integration not found'
    });
  }

  // const service = new PaymentGatewayService(integration); // PaymentGatewayService not yet implemented
  throw new Error('PaymentGatewayService is not yet implemented');
  await service.handleWebhook(req.body.payload, req.body.signature, req.body.eventType);

  res.json({
    success: true,
    message: 'Webhook processed successfully'
  });
}));

// ==================== INTEGRATION LOGS ROUTES ====================

// Get integration logs
router.get('/:id/logs', [
  financeRead,
  param('id').isMongoId(),
  query('type').optional().isIn(['sync', 'webhook', 'api_call', 'error', 'auth']),
  query('status').optional().isIn(['success', 'error', 'warning', 'info']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = { 
    integrationId: req.params.id,
    orgId: req.user.orgId
  };
  
  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;

  const logs = await IntegrationLog.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await IntegrationLog.countDocuments(filter);

  res.json({
    success: true,
    data: {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// ==================== INTEGRATION MAPPINGS ROUTES ====================

// Update integration mappings
router.put('/:id/mappings', [
  financeWrite,
  param('id').isMongoId(),
  body('mappings').isObject()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const integration = await IntegrationConfig.findOneAndUpdate(
    { _id: req.params.id, orgId: req.user.orgId },
    { mappings: req.body.mappings },
    { new: true }
  );

  if (!integration) {
    return res.status(404).json({
      success: false,
      message: 'Integration not found'
    });
  }

  res.json({
    success: true,
    message: 'Integration mappings updated successfully',
    data: { integration }
  });
}));

// ==================== INTEGRATION STATUS ROUTES ====================

// Get integration health status
router.get('/:id/health', [
  financeRead,
  param('id').isMongoId()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const integration = await IntegrationConfig.findOne({
    _id: req.params.id,
    orgId: req.user.orgId
  });

  if (!integration) {
    return res.status(404).json({
      success: false,
      message: 'Integration not found'
    });
  }

  // Get recent logs to determine health
  const recentLogs = await IntegrationLog.find({
    integrationId: req.params.id,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
  }).sort({ createdAt: -1 }).limit(10);

  const errorCount = recentLogs.filter(log => log.status === 'error').length;
  const healthStatus = errorCount > 5 ? 'unhealthy' : errorCount > 2 ? 'warning' : 'healthy';

  res.json({
    success: true,
    data: {
      status: healthStatus,
      lastSync: integration.settings?.lastSync,
      errorCount,
      recentLogs: recentLogs.slice(0, 5)
    }
  });
}));

module.exports = router;
