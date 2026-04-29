const express = require('express');
const { body, query, param } = require('express-validator');
const { authenticateToken } = require('../../../middleware/auth/auth');
const ErrorHandler = require('../../../middleware/common/errorHandler');
const ValidationMiddleware = require('../../../middleware/validation/validation');
const Webhook = require('../../../models/integrations/Webhook');
const Workspace = require('../../../models/org/Workspace');
// Chat and Message models removed - messaging features have been removed
// const Chat = require('../../../models/Chat');
// const Message = require('../../../models/Message');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all webhooks for user's workspaces
router.get('/', [
  query('workspaceId').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  let query = { organization: req.user.orgId };
  
  if (req.query.workspaceId) {
    // Verify user has access to this workspace
    const workspace = await Workspace.findById(req.query.workspaceId);
    if (!workspace || (!workspace.isMember(req.user.id) && !workspace.isOwner(req.user.id))) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this workspace'
      });
    }
    query.workspaceId = req.query.workspaceId;
  }

  const webhooks = await Webhook.find(query)
    .populate('workspaceId', 'name slug')
    // channelId population removed - messaging features have been removed
    .populate('createdBy', 'fullName email')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await Webhook.countDocuments(query);

  res.json({
    success: true,
    data: {
      webhooks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// Get webhook by ID
router.get('/:id', [
  param('id').isMongoId()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const webhook = await Webhook.findById(req.params.id)
    .populate('workspaceId', 'name slug')
    .populate('channelId', 'name type')
    .populate('createdBy', 'fullName email');

  if (!webhook) {
    return res.status(404).json({
      success: false,
      message: 'Webhook not found'
    });
  }

  // Check if user has access to this webhook
  if (webhook.createdBy._id.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this webhook'
    });
  }

  res.json({
    success: true,
    data: { webhook }
  });
}));

// Create new webhook
router.post('/', [
  body('name').notEmpty().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('workspaceId').isMongoId(),
  body('channelId').optional().isMongoId(), // Made optional since messaging is removed
  body('events').isArray().custom(events => {
    // Removed messaging-related events
    const validEvents = ['file.uploaded', 'user.joined', 'user.left'];
    return events.every(event => 
      typeof event === 'object' && 
      event.type && 
      validEvents.includes(event.type) &&
      typeof event.enabled === 'boolean'
    );
  })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const { name, description, workspaceId, channelId, events } = req.body;

  // Verify workspace exists and user has access
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return res.status(404).json({
      success: false,
      message: 'Workspace not found'
    });
  }

  if (!workspace.isMember(req.user.id) && !workspace.isOwner(req.user.id)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this workspace'
    });
  }

  // Messaging features have been removed - channel validation disabled
  // NOTE: Webhook creation with channelId is no longer supported
  if (channelId) {
    return res.status(410).json({
      success: false,
      message: 'Webhook creation with channels is no longer supported. Messaging features have been removed.'
    });
  }

  // Create webhook (without channelId)
  const webhook = new Webhook({
    name,
    description,
    workspaceId,
    // channelId removed - messaging features have been removed
    events: events.filter(e => !e.type.startsWith('message.') && !e.type.startsWith('channel.')), // Filter out messaging events
    apiKey: new Webhook().generateApiKey(),
    createdBy: req.user.id,
    organization: req.user.orgId
  });

  await webhook.save();

  await webhook.populate('workspaceId', 'name slug');
  // channelId population removed - messaging features have been removed
  await webhook.populate('createdBy', 'fullName email');

  res.status(201).json({
    success: true,
    message: 'Webhook created successfully',
    data: { webhook }
  });
}));

// Update webhook
router.patch('/:id', [
  param('id').isMongoId(),
  body('name').optional().notEmpty().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('events').optional().isArray().custom(events => {
    // Removed messaging-related events
    const validEvents = ['file.uploaded', 'user.joined', 'user.left'];
    return events.every(event => 
      typeof event === 'object' && 
      event.type && 
      validEvents.includes(event.type) &&
      typeof event.enabled === 'boolean'
    );
  }),
  body('status').optional().isIn(['active', 'inactive', 'suspended'])
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const webhook = await Webhook.findById(req.params.id);

  if (!webhook) {
    return res.status(404).json({
      success: false,
      message: 'Webhook not found'
    });
  }

  // Check if user can update this webhook
  if (webhook.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this webhook'
    });
  }

  const updates = req.body;
  delete updates.apiKey; // Prevent changing API key
  delete updates.workspaceId; // Prevent changing workspace
  delete updates.channelId; // Prevent changing channel

  // Filter out messaging-related events
  if (updates.events) {
    updates.events = updates.events.filter(e => !e.type.startsWith('message.') && !e.type.startsWith('channel.'));
  }

  const updatedWebhook = await Webhook.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  )
    .populate('workspaceId', 'name slug')
    // channelId population removed - messaging features have been removed
    .populate('createdBy', 'fullName email');

  res.json({
    success: true,
    message: 'Webhook updated successfully',
    data: { webhook: updatedWebhook }
  });
}));

// Delete webhook
router.delete('/:id', [
  param('id').isMongoId()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const webhook = await Webhook.findById(req.params.id);

  if (!webhook) {
    return res.status(404).json({
      success: false,
      message: 'Webhook not found'
    });
  }

  // Check if user can delete this webhook
  if (webhook.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this webhook'
    });
  }

  await Webhook.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Webhook deleted successfully'
  });
}));

// Regenerate API key
router.post('/:id/regenerate-key', [
  param('id').isMongoId()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const webhook = await Webhook.findById(req.params.id);

  if (!webhook) {
    return res.status(404).json({
      success: false,
      message: 'Webhook not found'
    });
  }

  // Check if user can update this webhook
  if (webhook.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this webhook'
    });
  }

  webhook.apiKey = webhook.generateApiKey();
  await webhook.save();

  res.json({
    success: true,
    message: 'API key regenerated successfully',
    data: { apiKey: webhook.apiKey }
  });
}));

// Webhook endpoint for external apps to post messages
// NOTE: Messaging features removed - this endpoint is disabled
router.post('/post/:apiKey', [
  param('apiKey').isLength({ min: 32, max: 64 })
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Webhook message posting is no longer supported. Messaging features have been removed.'
  });
}));

// Get webhook statistics
router.get('/:id/stats', [
  param('id').isMongoId()
], ValidationMiddleware.handleValidationErrors, ErrorHandler.asyncHandler(async (req, res) => {
  const webhook = await Webhook.findById(req.params.id);

  if (!webhook) {
    return res.status(404).json({
      success: false,
      message: 'Webhook not found'
    });
  }

  // Check if user has access to this webhook
  if (webhook.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this webhook'
    });
  }

  res.json({
    success: true,
    data: {
      stats: webhook.stats,
      successRate: webhook.successRate
    }
  });
}));

module.exports = router;
