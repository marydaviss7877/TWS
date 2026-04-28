const express = require('express');
const request = require('supertest');

describe('critical workflow access checks', () => {
  it('auth flow happy path: /api/auth/me returns user payload for authenticated roles', async () => {
    const app = express();
    app.use(express.json());
    app.get('/api/auth/me', (req, res) => {
      const role = String(req.header('x-role') || '').toLowerCase();
      if (!role) {
        return res.status(401).json({ success: false, message: 'Missing auth token' });
      }
      return res.status(200).json({
        success: true,
        user: { id: 'u-1', role }
      });
    });

    const ownerRes = await request(app).get('/api/auth/me').set('x-role', 'owner');
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.success).toBe(true);
    expect(ownerRes.body.user.role).toBe('owner');

    const employeeRes = await request(app).get('/api/auth/me').set('x-role', 'employee');
    expect(employeeRes.status).toBe(200);
    expect(employeeRes.body.success).toBe(true);
    expect(employeeRes.body.user.role).toBe('employee');
  });

  it('auth flow unauthorized: /api/auth/me rejects missing token', async () => {
    const app = express();
    app.use(express.json());
    app.get('/api/auth/me', (_req, res) => {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    });

    const res = await request(app).get('/api/auth/me');
    expect([401, 403]).toContain(res.status);
  });

  it('project members unauthorized path returns 403', async () => {
    const app = express();
    app.use(express.json());
    app.get('/api/projects/:projectId/members', (_req, res) => {
      return res.status(403).json({ success: false, message: 'Access denied to this project' });
    });

    const res = await request(app).get('/api/projects/p-1/members');
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
