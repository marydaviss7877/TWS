const { GeminiProjectAgentService } = require('../geminiProjectAgent.service');

describe('GeminiProjectAgentService', () => {
  const clients = [{ _id: '64b000000000000000000001', name: 'Acme' }];
  const departments = [
    { _id: '64b000000000000000000002', name: 'Engineering' },
    { _id: '64b000000000000000000003', name: 'Design' }
  ];

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.GEMINI_API_KEY;
  });

  test('normalizes a ready draft and resolves tenant catalog names to IDs', () => {
    const service = new GeminiProjectAgentService();
    const result = service.normalizeResult({
      state: 'ready',
      assistantMessage: 'The scope is ready.',
      questions: [],
      scopeSummary: 'A customer portal for deliverable tracking and approvals.',
      confidence: 0.93,
      project: {
        name: 'Acme Portal <script>',
        description: 'Create a customer portal for tracking deliverables and approving completed work.',
        projectType: 'web_application',
        priority: 'high',
        clientName: 'acme',
        primaryDepartmentName: 'engineering',
        departmentNames: ['Design', 'Engineering', 'Unknown'],
        budgetTotal: 25000,
        budgetCurrency: 'USD',
        startDate: '2026-09-01',
        endDate: '2026-10-31',
        estimatedHours: 320,
        tags: ['portal', 'customer-success']
      }
    }, clients, departments);

    expect(result.state).toBe('ready');
    expect(result.project.name).toBe('Acme Portal script');
    expect(result.project.clientId).toBe(clients[0]._id);
    expect(result.project.primaryDepartmentId).toBe(departments[0]._id);
    expect(result.project.departments).toEqual([departments[1]._id]);
    expect(result.project.status).toBe('planning');
  });

  test('downgrades an incomplete ready response to clarification', () => {
    const service = new GeminiProjectAgentService();
    const result = service.normalizeResult({
      state: 'ready',
      assistantMessage: '',
      questions: [],
      project: { name: 'App', description: 'Too vague' }
    }, [], []);

    expect(result.state).toBe('clarify');
    expect(result.project.projectType).toBe('general');
    expect(result.project.priority).toBe('medium');
  });

  test('uses a server-side API-key header and parses structured Gemini output', async () => {
    process.env.GEMINI_API_KEY = 'test-secret-key';
    const service = new GeminiProjectAgentService();
    const modelResult = {
      state: 'clarify',
      assistantMessage: 'Who will use this product?',
      questions: ['Who is the primary user?'],
      scopeSummary: '',
      confidence: 0.4,
      project: {
        name: '', description: '', projectType: 'general', priority: 'medium',
        clientName: '', primaryDepartmentName: '', departmentNames: [],
        budgetTotal: 0, budgetCurrency: 'USD', startDate: '', endDate: '',
        estimatedHours: 0, tags: []
      }
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(modelResult) }] } }],
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 40, totalTokenCount: 140 }
      })
    });

    const response = await service.scopeProject({
      message: 'Build an app',
      history: [],
      currentDraft: { name: 'Draft', clientId: 'private-database-id', description: 'Initial scope' }
    });
    const [url, options] = global.fetch.mock.calls[0];
    const requestBody = JSON.parse(options.body);

    expect(url).not.toContain('test-secret-key');
    expect(options.headers['x-goog-api-key']).toBe('test-secret-key');
    expect(requestBody.generationConfig.responseMimeType).toBe('application/json');
    expect(options.body).not.toContain('private-database-id');
    expect(response.state).toBe('clarify');
    expect(response.usage.totalTokens).toBe(140);
  });
});
