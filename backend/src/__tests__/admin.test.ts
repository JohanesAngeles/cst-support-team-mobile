import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import User from '../models/User';

jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  setupExpressErrorHandler: jest.fn(),
}));

let mongod: MongoMemoryServer;
let adminToken: string;
let driverToken: string;

const tokenFor = (id: string) => jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: '1d' });

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'Pass1234!', role: 'admin' });
  adminToken = tokenFor(admin._id.toString());

  const driver = await User.create({ name: 'Driver', email: 'driver@test.com', password: 'Pass1234!', role: 'driver' });
  driverToken = tokenFor(driver._id.toString());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// ─── App config ─────────────────────────────────────────────────────────────

describe('App config', () => {
  it('GET /api/config is public and returns defaults with no auth', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.maintenanceMode).toBe(false);
  });

  it('blocks non-admins from GET/PATCH /api/admin/config', async () => {
    const getRes = await request(app).get('/api/admin/config').set('Authorization', `Bearer ${driverToken}`);
    expect(getRes.status).toBe(403);

    const patchRes = await request(app).patch('/api/admin/config').set('Authorization', `Bearer ${driverToken}`).send({ maintenanceMode: true });
    expect(patchRes.status).toBe(403);
  });

  it('lets an admin toggle maintenance mode and the public endpoint reflects it', async () => {
    const patch = await request(app)
      .patch('/api/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ maintenanceMode: true, maintenanceMessage: 'Down for a bit.' });
    expect(patch.status).toBe(200);
    expect(patch.body.maintenanceMode).toBe(true);

    const pub = await request(app).get('/api/config');
    expect(pub.body.maintenanceMode).toBe(true);
    expect(pub.body.maintenanceMessage).toBe('Down for a bit.');

    // reset for other tests
    await request(app).patch('/api/admin/config').set('Authorization', `Bearer ${adminToken}`).send({ maintenanceMode: false });
  });

  it('sets and clears a feature flag', async () => {
    const patch = await request(app)
      .patch('/api/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ featureFlags: { new_thing: true } });
    expect(patch.body.featureFlags.new_thing).toBe(true);

    const del = await request(app)
      .delete('/api/admin/config/feature-flags/new_thing')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.body.featureFlags.new_thing).toBeUndefined();
  });
});

// ─── Sponsors ───────────────────────────────────────────────────────────────

describe('Sponsors', () => {
  it('admin can create a sponsor and the public route only returns active ones', async () => {
    const active = await request(app)
      .post('/api/admin/sponsors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: "Love's Travel Stops", order: 0 });
    expect(active.status).toBe(201);

    const inactive = await request(app)
      .post('/api/admin/sponsors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Hidden Sponsor', active: false, order: 1 });
    expect(inactive.status).toBe(201);

    const pub = await request(app).get('/api/sponsors');
    const names = pub.body.sponsors.map((s: { name: string }) => s.name);
    expect(names).toContain("Love's Travel Stops");
    expect(names).not.toContain('Hidden Sponsor');

    await request(app).delete(`/api/admin/sponsors/${active.body.sponsor._id}`).set('Authorization', `Bearer ${adminToken}`);
    await request(app).delete(`/api/admin/sponsors/${inactive.body.sponsor._id}`).set('Authorization', `Bearer ${adminToken}`);
  });
});

// ─── Users ──────────────────────────────────────────────────────────────────

describe('Admin user management', () => {
  it('lists users and can suspend/reactivate one', async () => {
    const list = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.total).toBeGreaterThanOrEqual(2);

    const target = await User.create({ name: 'Rowdy Trucker', email: 'rowdy@test.com', password: 'Pass1234!' });

    const suspend = await request(app)
      .patch(`/api/admin/users/${target._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'suspended', reason: 'Reported for spam' });
    expect(suspend.status).toBe(200);
    expect(suspend.body.user.status).toBe('suspended');
    expect(suspend.body.user.statusReason).toBe('Reported for spam');

    const reactivate = await request(app)
      .patch(`/api/admin/users/${target._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'active' });
    expect(reactivate.body.user.status).toBe('active');
  });

  it('returns user detail and a status-change audit log', async () => {
    const target = await User.create({ name: 'Audited Trucker', email: 'audited@test.com', password: 'Pass1234!' });

    await request(app)
      .patch(`/api/admin/users/${target._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'suspended', reason: 'First strike' });
    await request(app)
      .patch(`/api/admin/users/${target._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'active' });

    const detail = await request(app).get(`/api/admin/users/${target._id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.user.email).toBe('audited@test.com');

    const log = await request(app).get(`/api/admin/users/${target._id}/status-log`).set('Authorization', `Bearer ${adminToken}`);
    expect(log.status).toBe(200);
    expect(log.body.log).toHaveLength(2);
    expect(log.body.log[0].toStatus).toBe('active');
    expect(log.body.log[0].fromStatus).toBe('suspended');
    expect(log.body.log[1].toStatus).toBe('suspended');
    expect(log.body.log[0].changedByName).toBe('Admin');
  });

  it('search filters by name/email', async () => {
    const res = await request(app).get('/api/admin/users?search=rowdy').set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.users.some((u: { email: string }) => u.email === 'rowdy@test.com')).toBe(true);
  });
});

// ─── Content CMS: News & Road Intel ──────────────────────────────────────────

describe('Admin content CMS', () => {
  it('creates, edits, and deletes a News post as admin', async () => {
    const created = await request(app)
      .post('/api/admin/news')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'FMCSA update', body: 'New rules proposed.' });
    expect(created.status).toBe(201);

    const edited = await request(app)
      .patch(`/api/admin/news/${created.body.news._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'FMCSA update (revised)', body: 'New rules proposed.', imageUrl: undefined });
    expect(edited.status).toBe(200);
    expect(edited.body.news.title).toBe('FMCSA update (revised)');

    const del = await request(app).delete(`/api/admin/news/${created.body.news._id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
  });

  it('creates, edits, and deletes a Road Intel report as admin', async () => {
    const created = await request(app)
      .post('/api/admin/map-reports')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ type: 'hazard', lat: 39.1, lng: -84.5, title: 'I-70 Eastbound Accident', hazardType: 'accident' });
    expect(created.status).toBe(201);

    const edited = await request(app)
      .patch(`/api/admin/map-reports/${created.body.report._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'I-70 Eastbound Accident — cleared', description: 'Lanes reopened.' });
    expect(edited.status).toBe(200);
    expect(edited.body.report.title).toBe('I-70 Eastbound Accident — cleared');

    const del = await request(app).delete(`/api/admin/map-reports/${created.body.report._id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
  });

  it('blocks non-admins from the content CMS routes', async () => {
    const res = await request(app)
      .post('/api/admin/news')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ title: 'x', body: 'y' });
    expect(res.status).toBe(403);
  });
});

// ─── Health ─────────────────────────────────────────────────────────────────

describe('Admin health', () => {
  it('returns counts and connection status', async () => {
    const res = await request(app).get('/api/admin/health').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.dbConnected).toBe(true);
    expect(res.body.counts.users).toBeGreaterThanOrEqual(2);
    expect(typeof res.body.uptimeSeconds).toBe('number');
  });
});
