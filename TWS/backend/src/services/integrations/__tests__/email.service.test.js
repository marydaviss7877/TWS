const emailService = require('../email.service');

describe('EmailService tenant welcome email', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('links setup to the provisioned tenant subdomain', async () => {
    const sendEmail = jest.spyOn(emailService, 'sendEmail').mockResolvedValue({ success: true });

    await emailService.sendTenantWelcomeEmail(
      { fullName: 'Tenant Owner', email: 'owner@example.com' },
      { name: 'Example Co', slug: 'example-co', erpCategory: 'software_house' },
      'example-co.swh.housesbase.com'
    );

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const [, , html] = sendEmail.mock.calls[0];
    expect(html).toContain('href="https://example-co.swh.housesbase.com/onboarding"');
    expect(html).not.toContain('app.tws.example.com');
    expect(html).not.toContain('/example-co/onboarding');
  });

  it('does not duplicate a protocol supplied with the tenant host', async () => {
    const sendEmail = jest.spyOn(emailService, 'sendEmail').mockResolvedValue({ success: true });

    await emailService.sendTenantWelcomeEmail(
      { fullName: 'Tenant Owner', email: 'owner@example.com' },
      { name: 'Example Co', slug: 'example-co' },
      'https://example-co.swh.housesbase.com/'
    );

    const [, , html] = sendEmail.mock.calls[0];
    expect(html).toContain('href="https://example-co.swh.housesbase.com/onboarding"');
    expect(html).not.toContain('https://https://');
  });
});
