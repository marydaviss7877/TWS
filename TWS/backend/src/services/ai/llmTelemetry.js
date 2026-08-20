const { v4: uuidv4 } = require('uuid');
const metricsService = require('../analytics/metrics.service');
const { loggerService } = require('../core/logger.service');

const safeLabel = (value, fallback) => {
  const label = String(value || fallback || 'unknown').toLowerCase().replace(/[^a-z0-9_.:-]/g, '_').slice(0, 80);
  return label || fallback || 'unknown';
};

const normalizeUsage = (usage = {}) => ({
  inputTokens: Math.max(0, Number(usage.inputTokens ?? usage.promptTokenCount) || 0),
  outputTokens: Math.max(0, Number(usage.outputTokens ?? usage.candidatesTokenCount) || 0),
  totalTokens: Math.max(0, Number(usage.totalTokens ?? usage.totalTokenCount) || 0)
});

/**
 * Wrap an LLM provider call with privacy-safe metrics and structured logs.
 * The operation callback may return any value; getUsage extracts provider usage.
 * Prompt and response content are intentionally never accepted as telemetry fields.
 */
const withLlmTelemetry = async ({ provider, model, operation, getUsage = () => ({}) }, call) => {
  const labels = {
    provider: safeLabel(provider, 'unknown'),
    model: safeLabel(model, 'unknown'),
    operation: safeLabel(operation, 'generate')
  };
  const callId = uuidv4();
  const startedAt = process.hrtime.bigint();

  try {
    const result = await call({ callId });
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
    const usage = normalizeUsage(getUsage(result));
    metricsService.recordLlmCall({ ...labels, status: 'success', durationSeconds, usage });
    loggerService.info('LLM call completed', {
      callId,
      ...labels,
      status: 'success',
      durationMs: Math.round(durationSeconds * 1000),
      usage
    });
    return result;
  } catch (error) {
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
    const classification = error?.code || (error?.name === 'AbortError' ? 'timeout' : error?.name);
    const errorCode = safeLabel(classification, 'unknown_error');
    metricsService.recordLlmCall({ ...labels, status: 'error', errorCode, durationSeconds });
    loggerService.warn('LLM call failed', {
      callId,
      ...labels,
      status: 'error',
      errorCode,
      providerStatus: Number(error?.status) || undefined,
      durationMs: Math.round(durationSeconds * 1000)
    });
    throw error;
  }
};

module.exports = { normalizeUsage, withLlmTelemetry };
