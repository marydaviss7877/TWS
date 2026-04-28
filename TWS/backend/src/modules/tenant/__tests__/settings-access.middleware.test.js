const { requireSettingsAdmin } = require('../routes/organization');

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

describe('requireSettingsAdmin middleware', () => {
  it('allows admin-like roles', () => {
    const req = { user: { role: 'admin' } };
    const res = createRes();
    const next = jest.fn();

    requireSettingsAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });

  it('rejects non-admin roles with 403', () => {
    const req = { user: { role: 'employee' } };
    const res = createRes();
    const next = jest.fn();

    requireSettingsAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      code: 'SETTINGS_ADMIN_REQUIRED'
    });
  });
});

