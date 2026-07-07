import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';

jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  setupExpressErrorHandler: jest.fn(),
}));

let mongod: MongoMemoryServer;
let token: string;
let otherToken: string;

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Network Tester', email: 'network@test.com', password: 'Pass1234!' });
  token = reg.body.token;

  await request(app)
    .put('/api/auth/update-profile')
    .set('Authorization', `Bearer ${token}`)
    .send({ homeBase: 'Dallas, TX' });

  const reg2 = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Other Driver', email: 'other@test.com', password: 'Pass1234!' });
  otherToken = reg2.body.token;
});

afterEach(async () => {
  await mongoose.connection.collections['networkposts']?.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('POST /api/network — location', () => {
  it('stores an explicit location on the post', async () => {
    const res = await request(app)
      .post('/api/network')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Rolling', body: 'On I-80 westbound', location: 'I-80 Westbound, WY' });
    expect(res.status).toBe(201);
    expect(res.body.post.location).toBe('I-80 Westbound, WY');
  });

  it('defaults location to the author homeBase when not provided', async () => {
    const res = await request(app)
      .post('/api/network')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Post', body: 'No location given' });
    expect(res.status).toBe(201);
    expect(res.body.post.location).toBe('Dallas, TX');
  });

  it('leaves location unset when neither is available', async () => {
    const res = await request(app)
      .post('/api/network')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Post', body: 'No homeBase, no location' });
    expect(res.status).toBe(201);
    expect(res.body.post.location).toBeUndefined();
  });
});

describe('POST /api/network — shareCount', () => {
  it('starts a new post at shareCount 0', async () => {
    const res = await request(app)
      .post('/api/network')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Original', body: 'Original body' });
    expect(res.body.post.shareCount).toBe(0);
  });

  it('increments the original post shareCount when reposted', async () => {
    const original = await request(app)
      .post('/api/network')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Original', body: 'Original body' });
    const originalId = original.body.post._id;

    await request(app)
      .post('/api/network')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ sharedPostId: originalId });

    const fetched = await request(app)
      .get(`/api/network/${originalId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(fetched.body.post.shareCount).toBe(1);
  });

  it('increments shareCount again on a second repost', async () => {
    const original = await request(app)
      .post('/api/network')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Original', body: 'Original body' });
    const originalId = original.body.post._id;

    await request(app).post('/api/network').set('Authorization', `Bearer ${otherToken}`).send({ sharedPostId: originalId });
    await request(app).post('/api/network').set('Authorization', `Bearer ${token}`).send({ sharedPostId: originalId });

    const fetched = await request(app)
      .get(`/api/network/${originalId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(fetched.body.post.shareCount).toBe(2);
  });

  it('the repost itself carries a sharedPost snapshot and its own shareCount of 0', async () => {
    const original = await request(app)
      .post('/api/network')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Original', body: 'Original body' });
    const originalId = original.body.post._id;

    const repost = await request(app)
      .post('/api/network')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ sharedPostId: originalId });

    expect(repost.status).toBe(201);
    expect(repost.body.post.sharedPost.postId).toBe(originalId);
    expect(repost.body.post.shareCount).toBe(0);
  });
});
