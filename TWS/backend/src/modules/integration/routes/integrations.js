const express = require('express');
const { body, query, param } = require('express-validator');
const { requireErpAccess } = require('../../../middleware/auth/erpAccessControl');
const financeRead = requireErpAccess({ module: 'finance', action: 'read', checkRevocation: true, sensitive: true, auditResourceType: 'finance' });
const financeWrite = requireErpAccess({ module: 'finance', action: 'write', checkRevocation: true, sensitive: true, auditResourceType: 'finance' });
const ErrorHandler = require('../../../middleware/common/errorHandler');
const ValidationMiddleware = require('../../../middleware/validation/validation');
const { 
  IntegrationConfig, 
  IntegrationLog, 
  TimeTrackingIntegration,
  ProjectManagementIntegration,
  PaymentGatewayIntegration,
  BankingIntegration
} = require('../../../models/Integration');
const TimeTrackingService = require('../../../services/integrations/time-tracking-integration.service');
// const PaymentGatewayService = require('../../../services/integrations/PaymentGatewayService'); // Service not yet implemented
const BankingService = require('../../../services/integrations/banking-integration.service');

const router = express.Router();

// ==================== INTEGRATION CONFIGURATION ROUTES ====================

// Get all integrations
router.get('/', [
  financeRead,
  query('type').optional().isIn(['time_tracking', 'project_management', 'payment_gateway', 'banking', 'accounting', 'hr']),
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
  body('type').isIn(['time_tracking', 'project_management', 'payment_gateway', 'banking', 'accounting', 'hr']),
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

  let service;
  switch (integration.type) {
    case 'time_tracking':
      service = new TimeTrackingService(integration);
      break;
    case 'payment_gateway':
      // service = new PaymentGatewayService(integration); // PaymentGatewayService not yet implemented
      throw new Error('PaymentGatewayService is not yet implemented');
      break;
    case 'banking':
      service = new BankingService(integration);
      break;
    default:
      return res.status(400).json({
        success: false,
        message: 'Connection test not supported for this integration type'
      });
  }

  const result = await service.testConnection();

  res.json({
    success: result.success,
    message: result.message,
    data: { result }
  });
}));

// ==================== TIME TRACKING INTEGRATION ROUTES ====================

// Sync time entries
router.post('/:id/sync/time-entries', [
  financeWrite,
  param('id').isMongoId(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const integration = await IntegrationConfig.findOne({
    _id: req.params.id,
    orgId: req.user.orgId,
    type: 'time_tracking'
  });

  if (!integration) {
    return res.status(404).json({
      success: false,
      message: 'Time tracking integration not found'
    });
  }

  const service = new TimeTrackingService(integration);
  const result = await service.syncTimeEntries(req.body.startDate, req.body.endDate);

  res.json({
    success: true,
    message: 'Time entries synced successfully',
    data: { result }
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

// ==================== BANKING INTEGRATION ROUTES ====================

// Sync bank transactions
router.post('/:id/sync/transactions', [
  financeWrite,
  param('id').isMongoId(),
  body('accountId').notEmpty(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const integration = await IntegrationConfig.findOne({
    _id: req.params.id,
    orgId: req.user.orgId,
    type: 'banking'
  });

  if (!integration) {
    return res.status(404).json({
      success: false,
      message: 'Banking integration not found'
    });
  }

  const service = new BankingService(integration);
  const result = await service.syncTransactions(
    req.body.accountId,
    req.body.startDate,
    req.body.endDate
  );

  res.json({
    success: true,
    message: 'Transactions synced successfully',
    data: { result }
  });
}));

// Reconcile transactions
router.post('/:id/reconcile', [
  financeWrite,
  param('id').isMongoId(),
  body('accountId').notEmpty(),
  body('autoMatch').optional().isBoolean()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const integration = await IntegrationConfig.findOne({
    _id: req.params.id,
    orgId: req.user.orgId,
    type: 'banking'
  });

  if (!integration) {
    return res.status(404).json({
      success: false,
      message: 'Banking integration not found'
    });
  }

  const service = new BankingService(integration);
  const result = await service.reconcileTransactions(
    req.body.accountId,
    req.body.autoMatch !== false
  );

  res.json({
    success: true,
    message: 'Transactions reconciled successfully',
    data: { result }
  });
}));

// Handle banking webhook
router.post('/:id/webhook/banking', [
  param('id').isMongoId(),
  body('payload').notEmpty(),
  body('signature').notEmpty(),
  body('eventType').notEmpty()
], ErrorHandler.asyncHandler(async (req, res) => {
  const integration = await IntegrationConfig.findOne({
    _id: req.params.id,
    type: 'banking'
  });

  if (!integration) {
    return res.status(404).json({
      success: false,
      message: 'Banking integration not found'
    });
  }

  const service = new BankingService(integration);
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
