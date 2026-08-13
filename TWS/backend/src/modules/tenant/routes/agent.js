const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { strictLimiter } = require('../../../middleware/rateLimiting/rateLimiter');
const { ensureOrgId } = require('../../../utils/orgIdHelper');
const centralAgent = require('../../../services/ai/centralAgent.service');

const router = express.Router({ mergeParams: true });

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  next();
};

const contextFor = async (req) => ({
  orgId: await ensureOrgId(req),
  tenantId: req.tenant?._id || req.tenantId || req.user?.tenantId,
  tenantSlug: req.params.tenantSlug,
  user: req.user,
  ip: req.ip,
  userAgent: req.get('User-Agent')
});

router.post('/chat', strictLimiter, [
  body('message').trim().isLength({ min: 2, max: 4000 }),
  body('conversationId').optional({ nullable: true }).isMongoId(),
  body('pageContext').optional().isObject(),
  body('pageContext.pathname').optional().isString().isLength({ max: 300 }),
  body('pageContext.module').optional().isString().isLength({ max: 100 }),
  validate
], async (req, res) => {
  try {
    const result = await centralAgent.chat(req.body, await contextFor(req));
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Central agent chat failed', { code: error.code, status: error.status, message: error.message, userId: req.user?._id });
    const status = error.code === 'AGENT_DAILY_BUDGET' ? 429 : error.code === 'GEMINI_NOT_CONFIGURED' ? 503 : error.code === 'GEMINI_TIMEOUT' ? 504 : 502;
    const message = status === 429
      ? 'Daily Nucleus usage limit reached. Try again tomorrow.'
      : status === 504 ? 'Nucleus timed out. Please try again.' : 'Nucleus is temporarily unavailable.';
    res.status(status).json({ success: false, message });
  }
});

router.post('/conversations/:conversationId/actions/:actionId', strictLimiter, [
  param('conversationId').isMongoId(),
  param('actionId').isMongoId(),
  body('decision').isIn(['approve', 'reject']),
  validate
], async (req, res) => {
  try {
    const result = await centralAgent.resolveAction({ ...req.params, decision: req.body.decision }, await contextFor(req));
    res.json({ success: true, data: result });
  } catch (error) {
    const status = /not found/i.test(error.message) ? 404 : /expired/i.test(error.message) ? 410 : 400;
    res.status(status).json({ success: false, message: error.message || 'Action could not be completed' });
  }
});

router.get('/conversations', async (req, res) => {
  try {
    const conversations = await centralAgent.listConversations(await contextFor(req));
    res.json({ success: true, data: conversations.map((conversation) => ({
      _id: conversation._id,
      title: conversation.title,
      updatedAt: conversation.updatedAt,
      preview: conversation.messages?.[conversation.messages.length - 1]?.content || ''
    })) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not load conversations' });
  }
});

router.get('/conversations/:conversationId', [
  param('conversationId').isMongoId(),
  validate
], async (req, res) => {
  try {
    const history = await centralAgent.conversationHistory(req.params.conversationId, await contextFor(req));
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(/not found/i.test(error.message) ? 404 : 500).json({ success: false, message: error.message || 'Could not load conversation' });
  }
});

module.exports = router;
