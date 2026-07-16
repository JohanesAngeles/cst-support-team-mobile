import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import User from '../models/User';

// Silence socket.io / Sentry noise in test output
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  setupExpressErrorHandler: jest.fn(),
}));

let mongod: MongoMemoryServer;

beforeAll(async () => {
  // Disconnect any existing connection opened by app.ts module load
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  for (const col of Object.values(mongoose.connection.collections)) {
    await col.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// ─── Register ─────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  const valid = { name: 'Test Driver', email: 'driver@test.com', password: 'Pass1234!' };

  it('creates a user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(valid.email);
    expect(res.body.user.password).toBeUndefined();
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already/i);
  });

  it('rejects missing password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'No Pass', email: 'nopass@test.com' });
    expect(res.status).toBe(400);
  });

  it('rejects missing email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'No Email', password: 'Pass1234!' });
    expect(res.status).toBe(400);
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  const creds = { email: 'login@test.com', password: 'Secret99!' };

  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Login User', ...creds });
  });

  it('returns token on correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send(creds);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: creds.email, password: 'WrongPass!' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'Pass1234!' });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('returns user when authenticated', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Me User', email: 'me@test.com', password: 'Pass1234!' });
    const token: string = reg.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@test.com');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer bad.token.here');
    expect(res.status).toBe(401);
  });
});

// ─── Suspended / banned accounts ────────────────────────────────────────────────
// User setup goes straight through the model (not the rate-limited /register
// endpoint) — these tests are about `status` gating, not registration.

describe('Account status gating', () => {
  const makeUser = (email: string, status: 'active' | 'suspended' | 'banned') =>
    User.create({ name: 'Gated User', email, password: 'Secret99!', status });

  const tokenFor = (id: string) => jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: '1d' });

  it('rejects login for a banned account with code ACCOUNT_BANNED', async () => {
    await makeUser('banned@test.com', 'banned');
    const res = await request(app).post('/api/auth/login').send({ email: 'banned@test.com', password: 'Secret99!' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_BANNED');
  });

  it('rejects login for a suspended account with code ACCOUNT_SUSPENDED', async () => {
    await makeUser('suspended@test.com', 'suspended');
    const res = await request(app).post('/api/auth/login').send({ email: 'suspended@test.com', password: 'Secret99!' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('allows an active account through GET /api/auth/me, then rejects once banned mid-session', async () => {
    const user = await makeUser('midsession@test.com', 'active');
    const token = tokenFor(user._id.toString());

    const before = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(before.status).toBe(200);

    await User.updateOne({ _id: user._id }, { status: 'banned' });

    const after = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(after.status).toBe(403);
    expect(after.body.code).toBe('ACCOUNT_BANNED');
  });
});
