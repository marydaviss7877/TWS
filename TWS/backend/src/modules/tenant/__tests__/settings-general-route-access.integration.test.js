const express = require('express');
const request = require('supertest');
const {
  denyClientSettingsAccess,
  requireSettingsAdmin
} = require('../routes/organization');

describe('settings/general route access chain', () => {
  function buildApp() {
    const app = express();
    app.use(express.json());

    app.put(
      '/api/tenant/:tenantSlug/organization/settings/general',
      (req, _res, next) => {
        // Simulate authenticated user already set by auth middleware
        req.user = { role: req.header('x-role') || '' };
        next();
      },
      denyClientSettingsAccess,
      requireSettingsAdmin,
      (_req, res) => res.status(200).json({ success: true, message: 'updated' })
    );

    return app;
  }

  it('blocks client users before admin check', async () => {
    const app = buildApp();

    const res = await request(app)
      .put('/api/tenant/demo/organization/settings/general')
      .set('x-role', 'client')
      .send({ organizationName: 'Demo' });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      code: 'CLIENT_SETTINGS_FORBIDDEN'
    });
  });

  it('blocks non-admin non-client users', async () => {
    const app = buildApp();

    const res = await request(app)
      .put('/api/tenant/demo/organization/settings/general')
      .set('x-role', 'employee')
      .send({ organizationName: 'Demo' });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      code: 'SETTINGS_ADMIN_REQUIRED'
    });
  });

  it('allows admin users', async () => {
    const app = buildApp();

    const res = await request(app)
      .put('/api/tenant/demo/organization/settings/general')
      .set('x-role', 'admin')
      .send({ organizationName: 'Demo' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'updated'
    });
  });
});

