const Client = require('../../models/industry/Client');
const Department = require('../../models/org/Department');
const geminiProjectAgent = require('../../services/ai/geminiProjectAgent.service');
const { ensureOrgId } = require('../../utils/orgIdHelper');

const dailyUsage = new Map();

const getUsageKey = (req) => {
  const day = new Date().toISOString().slice(0, 10);
  return `${req.user?._id || req.user?.id || req.ip}:${day}`;
};
const getDailyBudget = () => {
  const configured = Number(process.env.AI_AGENT_DAILY_TOKEN_BUDGET);
  return Number.isFinite(configured) && configured > 0 ? configured : 50000;
};

exports.scopeProject = async (req, res) => {
  try {
    const usageKey = getUsageKey(req);
    const usedTokens = dailyUsage.get(usageKey) || 0;
    if (usedTokens >= getDailyBudget()) {
      res.set('Retry-After', '86400');
      return res.status(429).json({
        success: false,
        message: 'Your daily AI planning limit has been reached. Please try again tomorrow.'
      });
    }

    const orgId = await ensureOrgId(req);
    if (!orgId) {
      return res.status(403).json({ success: false, message: 'Organization context is required' });
    }

    const [clients, departments] = await Promise.all([
      Client.find({ orgId }).select('_id name').limit(100).lean(),
      Department.find({ orgId }).select('_id name code').limit(100).lean()
    ]);

    const scoped = await geminiProjectAgent.scopeProject({
      message: req.body.message,
      history: req.body.history,
      currentDraft: req.body.currentDraft,
      clients,
      departments
    });

    dailyUsage.set(usageKey, usedTokens + scoped.usage.totalTokens);
    console.info('AI project scope usage', {
      userId: req.user?._id?.toString?.() || req.user?.id || 'unknown',
      orgId: orgId.toString(),
      model: scoped.model,
      state: scoped.state,
      totalTokens: scoped.usage.totalTokens
    });

    return res.json({
      success: true,
      data: {
        state: scoped.state,
        assistantMessage: scoped.assistantMessage,
        questions: scoped.questions,
        scopeSummary: scoped.scopeSummary,
        confidence: scoped.confidence,
        project: scoped.project
      }
    });
  } catch (error) {
    console.error('AI project scoping failed', {
      code: error.code,
      status: error.status,
      message: error.message,
      userId: req.user?._id?.toString?.() || req.user?.id || 'unknown'
    });

    if (error.code === 'GEMINI_NOT_CONFIGURED') {
      return res.status(503).json({ success: false, message: 'AI project planning is not configured' });
    }
    if (error.code === 'GEMINI_TIMEOUT') {
      return res.status(504).json({ success: false, message: 'AI project planning timed out. Please try again.' });
    }
    if (error.code === 'GEMINI_REQUEST_FAILED' || error.code === 'GEMINI_EMPTY_RESPONSE' || error instanceof SyntaxError) {
      return res.status(502).json({ success: false, message: 'AI project planning is temporarily unavailable' });
    }

    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
};
