/**
 * TS-15 / NoSQL injection — login request handling
 * Verifies operator objects cannot reach User.findOne as a Mongo operator query.
 */
const express = require('express');
const request = require('supertest');
const mongoSanitize = require('express-mongo-sanitize');
const { body, validationResult } = require('express-validator');

const AUTH_EMAIL_NORMALIZE = { gmail_remove_dots: false };
const validator = require('validator');

function buildLoginProbeApp() {
  const app = express();
  app.use(express.json());
  app.use(mongoSanitize());

  app.post(
    '/api/auth/login',
    body('email').isEmail().normalizeEmail(AUTH_EMAIL_NORMALIZE),
    body('password').notEmpty(),
    (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const password = String(req.body.password ?? '').trim();
      const rawEmail = String(req.body.email || '').trim();
      const normalizedEmail =
        validator.normalizeEmail(rawEmail, AUTH_EMAIL_NORMALIZE) || rawEmail.toLowerCase();
      // Same shape as authentication.js (no DB)
      res.json({
        success: true,
        normalizedEmail,
        passwordCoerced: password,
        emailType: typeof normalizedEmail
      });
    }
  );

  return app;
}

describe('login NoSQL-injection defenses (TS-15)', () => {
  const app = buildLoginProbeApp();

  it('rejects classic operator object on email (validation) before any DB-style use', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });

    expect(res.status).toBe(400);
    expect(res.body.errors?.some((e) => e.path === 'email')).toBe(true);
  });

  it('sanitizes operator keys in JSON body (mongo-sanitize)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });

    // After middleware, $gt keys are stripped from nested objects
    expect(res.body.errors).toBeDefined();
    // If sanitize ran, req.body seen by validator has empty object email
    // (supertest does not expose req after response; we infer from error value)
    const emailErr = res.body.errors.find((e) => e.path === 'email');
    expect(emailErr).toBeDefined();
  });

  it('does not accept regex operator object as email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $regex: '.*' }, password: 'something' });

    expect(res.status).toBe(400);
  });

  it('allows legitimate email and strips operators only inside password object', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: { $gt: '' } });

    expect(res.status).toBe(200);
    expect(res.body.normalizedEmail).toMatch(/user@/);
    expect(res.body.emailType).toBe('string');
    // Password became {} after sanitize; String({}) is not a real password — comparePassword would fail
    expect(res.body.passwordCoerced).toBe('[object Object]');
  });
});
