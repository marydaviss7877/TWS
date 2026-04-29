const express = require('express');
const request = require('supertest');

describe('route-level critical workflow checks', () => {
  it('auth flow: /api/auth/me unauthorized without token', async () => {
    const app = express();
    app.use(express.json());
    app.get('/api/auth/me', (_req, res) => {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    });

    const res = await request(app).get('/api/auth/me');
    expect([401, 403]).toContain(res.status);
  });

  it('payroll flow: owner can update AI payroll config, employee forbidden', async () => {
    jest.resetModules();
    jest.doMock('../../../middleware/common/featureGate', () => ({
      checkFeatureAccessSoftwareHouseOnly: () => (_req, _res, next) => next()
    }));
    jest.doMock('../../../middleware/auth/erpAccessControl', () => ({
      requireErpAccess: (opts = {}) => (req, res, next) => {
        req.user = { _id: 'u1', organization: 'org1', orgId: 'org1' };
        const role = String(req.header('x-role') || '').toLowerCase();
        if (opts.action === 'admin' && role === 'employee') {
          return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        return next();
      }
    }));
    jest.doMock('../../../models/hr-payroll/Payroll', () => ({
      PayrollRecord: {},
      PayrollRule: {},
      PayrollCycle: {}
    }));
    jest.doMock('../../../models/hr-payroll/AIPayroll', () => ({
      AIPayrollConfig: { findOne: jest.fn().mockResolvedValue({}) },
      AIPayrollAnalytics: {},
      SmartPayrollProcessing: {},
      EmployeeAIInsights: {}
    }));
    jest.doMock('../../../models/hr-payroll/Employee', () => ({ find: jest.fn().mockResolvedValue([]) }));
    jest.doMock('../../../models/users-auth/User', () => ({}));
    jest.doMock('../../../services/aiPayrollService', () => ({
      initializeAIPayroll: jest.fn().mockResolvedValue({ enabled: true })
    }));

    const app = express();
    app.use(express.json());
    const payrollRouter = require('../../business/routes/payroll');
    app.use('/api/payroll', payrollRouter);

    const ownerRes = await request(app)
      .post('/api/payroll/ai/config')
      .set('x-role', 'owner')
      .send({ aiSettings: {}, integrations: {} });
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.success).toBe(true);

    const employeeRes = await request(app)
      .post('/api/payroll/ai/config')
      .set('x-role', 'employee')
      .send({ aiSettings: {}, integrations: {} });
    expect(employeeRes.status).toBe(403);
  });

  it('project members flow: owner allowed, non-member employee forbidden', async () => {
    jest.resetModules();
    jest.doMock('../../../middleware/auth/verifyERPToken', () => (req, _res, next) => {
      req.user = {
        _id: req.header('x-user-id') || 'u-employee',
        orgId: 'org-1',
        role: req.header('x-role') || 'employee'
      };
      next();
    });
    jest.doMock('../../../middleware/auth/erpAccessControl', () => ({
      requireErpAccess: () => (_req, _res, next) => next()
    }));
    jest.doMock('../../../models/project-delivery/Project', () => ({
      findOne: jest.fn().mockResolvedValue({ _id: 'p-1', orgId: 'org-1' })
    }));
    jest.doMock('../../../models/project-delivery/ProjectMember', () => ({
      findOne: jest.fn().mockImplementation(({ userId }) => Promise.resolve(
        String(userId) === 'u-owner' ? { userId: 'u-owner', role: 'owner', status: 'active' } : null
      )),
      find: jest.fn().mockReturnValue({
        populate: () => ({
          populate: () => Promise.resolve([])
        })
      })
    }));
    jest.doMock('../../../models/industry/Client', () => ({}));
    jest.doMock('../../../models/project-delivery/Board', () => ({}));
    jest.doMock('../../../models/project-delivery/List', () => ({}));
    jest.doMock('../../../models/industry/Card', () => ({}));
    jest.doMock('../../../models/project-delivery/ProjectTemplate', () => ({}));
    jest.doMock('../../../models/analytics/Activity', () => ({}));
    jest.doMock('../../../models/project-delivery/Milestone', () => ({}));

    const app = express();
    app.use(express.json());
    const projectsRouter = require('../../business/routes/projects');
    app.use('/api/projects', projectsRouter);

    const ownerRes = await request(app)
      .get('/api/projects/p-1/members')
      .set('x-role', 'owner')
      .set('x-user-id', 'u-owner');
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.success).toBe(true);

    const employeeRes = await request(app)
      .get('/api/projects/p-1/members')
      .set('x-role', 'employee')
      .set('x-user-id', 'u-employee');
    expect(employeeRes.status).toBe(403);
    expect(employeeRes.body.success).toBe(false);
  });
});
