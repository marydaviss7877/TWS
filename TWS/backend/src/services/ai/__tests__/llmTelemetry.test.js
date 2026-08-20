jest.mock('../../analytics/metrics.service', () => ({ recordLlmCall: jest.fn() }));
jest.mock('../../core/logger.service', () => ({
  loggerService: { info: jest.fn(), warn: jest.fn() }
}));

const metricsService = require('../../analytics/metrics.service');
const { loggerService } = require('../../core/logger.service');
const { normalizeUsage, withLlmTelemetry } = require('../llmTelemetry');

describe('LLM telemetry wrapper', () => {
  beforeEach(() => jest.clearAllMocks());

  it('normalizes Gemini usage metadata', () => {
    expect(normalizeUsage({ promptTokenCount: 11, candidatesTokenCount: 7, totalTokenCount: 18 })).toEqual({
      inputTokens: 11,
      outputTokens: 7,
      totalTokens: 18
    });
  });

  it('records successful calls without content or identity data', async () => {
    const result = await withLlmTelemetry({
      provider: 'Google',
      model: 'Gemini 3 Flash',
      operation: 'Central Agent',
      getUsage: (value) => value.usage
    }, () => Promise.resolve({ secretResponse: 'do not log', usage: { totalTokenCount: 9 } }));

    expect(result.secretResponse).toBe('do not log');
    expect(metricsService.recordLlmCall).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'google', model: 'gemini_3_flash', operation: 'central_agent', status: 'success'
    }));
    expect(loggerService.info).toHaveBeenCalledWith('LLM call completed', expect.not.objectContaining({
      secretResponse: expect.anything(), userId: expect.anything(), orgId: expect.anything()
    }));
  });

  it('records failure classification and rethrows the original error', async () => {
    const providerError = Object.assign(new Error('provider detail'), { code: 'GEMINI_TIMEOUT', status: 504 });

    await expect(withLlmTelemetry(
      { provider: 'google', model: 'gemini', operation: 'chat' },
      () => Promise.reject(providerError)
    )).rejects.toBe(providerError);

    expect(metricsService.recordLlmCall).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error', errorCode: 'gemini_timeout'
    }));
    expect(loggerService.warn).toHaveBeenCalledWith('LLM call failed', expect.objectContaining({
      errorCode: 'gemini_timeout', providerStatus: 504
    }));
  });

  it('classifies aborted provider requests as timeouts', async () => {
    const timeout = Object.assign(new Error('aborted'), { name: 'AbortError' });

    await expect(withLlmTelemetry(
      { provider: 'google', model: 'gemini', operation: 'chat' },
      () => Promise.reject(timeout)
    )).rejects.toBe(timeout);

    expect(metricsService.recordLlmCall).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error', errorCode: 'timeout'
    }));
  });
});
