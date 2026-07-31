jest.mock('../../../config/s3', () => ({
  generateSignedUrl: jest.fn(async key => `https://signed.example/${key}`),
  deleteFromS3: jest.fn(async () => true)
}));

const portfolioService = require('../portfolio.service');
const PortfolioItem = require('../../../models/portfolio/PortfolioItem');

describe('portfolio service helpers', () => {
  describe('slugify', () => {
    it('creates stable URL-safe slugs', () => {
      expect(portfolioService.slugify('  42% Better: FinTech Onboarding!  '))
        .toBe('42-better-fintech-onboarding');
    });
  });

  describe('normalizeEmbed', () => {
    it('normalizes Loom share links to safe embed URLs', () => {
      expect(portfolioService.normalizeEmbed('https://www.loom.com/share/abc123')).toEqual({
        provider: 'loom',
        url: 'https://www.loom.com/share/abc123',
        embedUrl: 'https://www.loom.com/embed/abc123'
      });
    });

    it('uses privacy-enhanced YouTube embeds', () => {
      expect(portfolioService.normalizeEmbed('https://www.youtube.com/watch?v=abcDEF_1234').embedUrl)
        .toBe('https://www.youtube-nocookie.com/embed/abcDEF_1234');
    });

    it('rejects untrusted and non-HTTPS embeds', () => {
      expect(portfolioService.normalizeEmbed('http://www.loom.com/share/abc123')).toBeNull();
      expect(portfolioService.normalizeEmbed('https://evil.example/video/abc123')).toBeNull();
      expect(portfolioService.normalizeEmbed('javascript:alert(1)')).toBeNull();
    });
  });

  describe('normalizeExternalUrl', () => {
    it('allows only HTTP and HTTPS links', () => {
      expect(portfolioService.normalizeExternalUrl('https://example.com/work')).toBe('https://example.com/work');
      expect(portfolioService.normalizeExternalUrl('mailto:test@example.com')).toBeNull();
      expect(portfolioService.normalizeExternalUrl('javascript:alert(1)')).toBeNull();
    });
  });

  describe('uniqueSlug', () => {
    afterEach(() => jest.restoreAllMocks());

    it('keeps an unused slug unchanged', async () => {
      jest.spyOn(PortfolioItem, 'exists').mockResolvedValueOnce(null);
      await expect(portfolioService.uniqueSlug('507f1f77bcf86cd799439011', 'My Story'))
        .resolves.toBe('my-story');
    });

    it('adds a deterministic suffix when a slug already exists', async () => {
      jest.spyOn(PortfolioItem, 'exists')
        .mockResolvedValueOnce({ _id: 'existing' })
        .mockResolvedValueOnce({ _id: 'existing-2' })
        .mockResolvedValueOnce(null);
      await expect(portfolioService.uniqueSlug('507f1f77bcf86cd799439011', 'My Story'))
        .resolves.toBe('my-story-3');
    });
  });

  describe('buildVisibilityQuery', () => {
    it('allows portfolio managers to discover every lifecycle state', () => {
      expect(portfolioService.buildVisibilityQuery({ canManage: true, isSales: false })).toEqual({});
    });

    it('limits sales readers to published, active sales or organization entries', () => {
      const now = new Date('2026-07-31T12:00:00.000Z');
      const query = portfolioService.buildVisibilityQuery({ canManage: false, isSales: true }, now);

      expect(query.status).toBe('published');
      expect(query.$and[0].$or).toEqual(expect.arrayContaining([
        { 'visibility.scope': 'organization' },
        { 'visibility.scope': 'sales' },
        { 'visibility.scope': { $exists: false } }
      ]));
      expect(query.$and[1].$or).toContainEqual({ 'visibility.visibleFrom': { $lte: now } });
      expect(query.$and[2].$or).toContainEqual({ 'visibility.visibleUntil': { $gt: now } });
    });

    it('does not expose sales-only or legacy entries to non-sales readers', () => {
      const query = portfolioService.buildVisibilityQuery({ canManage: false, isSales: false });

      expect(query.$and[0].$or).toEqual([{ 'visibility.scope': 'organization' }]);
    });
  });
});
