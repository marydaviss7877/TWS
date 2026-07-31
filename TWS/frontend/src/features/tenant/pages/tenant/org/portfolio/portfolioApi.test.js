import * as portfolioApi from './portfolioApi';

describe('portfolioApi', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('forwards pagination, filters, and credentials on list requests', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { items: [], pagination: { page: 3, total: 105 } } })
    });
    await portfolioApi.listItems('sef', { page: 3, limit: 21, type: 'case_study', status: '' });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/tenant/sef/organization/portfolio?page=3&limit=21&type=case_study',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('sends explicit IDs for bulk archive operations', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    await portfolioApi.bulkSetStatus('sef', ['507f1f77bcf86cd799439011'], 'archived');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/tenant/sef/organization/portfolio/bulk/status',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ ids: ['507f1f77bcf86cd799439011'], status: 'archived' })
      })
    );
  });

  it('surfaces rate-limit metadata from API failures', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: () => '60' },
      json: async () => ({ message: 'Too many uploads' })
    });
    await expect(portfolioApi.uploadAsset('sef', '507f1f77bcf86cd799439011', new Blob(['x'])))
      .rejects.toMatchObject({ message: 'Too many uploads', status: 429, retryAfter: '60' });
  });
});
