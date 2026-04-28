const express = require('express');
const request = require('supertest');

function buildRoleAwareWorkflowApp() {
  const app = express();
  app.use(express.json());

  app.use((req, _res, next) => {
    req.user = {
      role: req.header('x-role') || 'employee',
      id: req.header('x-user-id') || 'u1'
    };
    next();
  });

  // Mirrors auth "who am I" behavior: authenticated roles can resolve profile.
  app.get('/api/auth/me', (req, res) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (!role) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    return res.json({ success: true, user: { id: req.user?.id || 'u1', role } });
  });

  // Mirrors payroll approval security direction: employee cannot approve payroll.
  app.post('/api/tenant/:tenantSlug/organization/hr/payroll/:id/approve', (req, res) => {
    const role = String(req.user?.role || '').toLowerCase();
    const canApprove = ['owner', 'admin', 'org_manager', 'hr', 'finance'].includes(role);
    if (!canApprove) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    return res.json({ success: true, status: 'approved' });
  });

  // Mirrors project-members scope direction: privileged project roles only.
  app.get('/api/projects/:projectId/members', (req, res) => {
    const role = String(req.user?.role || '').toLowerCase();
    const canReadMembers = ['owner', 'admin', 'org_manager', 'project_manager', 'manager'].includes(role);
    if (!canReadMembers) {
      return res.status(403).json({ success: false, message: 'Access denied to this project' });
    }
    return res.json({ success: true, data: { members: [] } });
  });

  return app;
}

describe('role-aware critical workflow access', () => {
  const app = buildRoleAwareWorkflowApp();

  it('owner happy path: can approve payroll', async () => {
    const res = await request(app)
      .post('/api/tenant/acme/organization/hr/payroll/p1/approve')
      .set('x-role', 'owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('approved');
  });

  it('employee unauthorized path: cannot approve payroll', async () => {
    const res = await request(app)
      .post('/api/tenant/acme/organization/hr/payroll/p1/approve')
      .set('x-role', 'employee');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('owner happy path: can read project members', async () => {
    const res = await request(app)
      .get('/api/projects/507f1f77bcf86cd799439011/members')
      .set('x-role', 'owner');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('employee unauthorized path: cannot read project members', async () => {
    const res = await request(app)
      .get('/api/projects/507f1f77bcf86cd799439011/members')
      .set('x-role', 'employee');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('owner and employee happy path: can resolve auth profile', async () => {
    const ownerRes = await request(app).get('/api/auth/me').set('x-role', 'owner');
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.success).toBe(true);
    expect(ownerRes.body.user.role).toBe('owner');

    const employeeRes = await request(app).get('/api/auth/me').set('x-role', 'employee');
    expect(employeeRes.status).toBe(200);
    expect(employeeRes.body.success).toBe(true);
    expect(employeeRes.body.user.role).toBe('employee');
  });
});
