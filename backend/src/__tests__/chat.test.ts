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

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Chat Tester', email: 'chat@test.com', password: 'Pass1234!' });
  token = reg.body.token;
});

afterEach(async () => {
  // Only clear chat messages between tests, keep the user
  await mongoose.connection.collections['chatmessages']?.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// ─── GET messages ─────────────────────────────────────────────────────────────

describe('GET /api/chat/:channelId', () => {
  it('returns empty array for a new channel', async () => {
    const res = await request(app)
      .get('/api/chat/general')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.messages).toEqual([]);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/chat/general');
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid channel', async () => {
    const res = await request(app)
      .get('/api/chat/hackerroom')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

// ─── POST message ─────────────────────────────────────────────────────────────

describe('POST /api/chat/:channelId', () => {
  it('creates a message and returns it', async () => {
    const res = await request(app)
      .post('/api/chat/general')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Hello drivers!' });
    expect(res.status).toBe(201);
    expect(res.body.message.message).toBe('Hello drivers!');
    expect(res.body.message.channelId).toBe('general');
    expect(res.body.message.senderName).toBe('Chat Tester');
  });

  it('rejects empty message', async () => {
    const res = await request(app)
      .post('/api/chat/general')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: '   ' });
    expect(res.status).toBe(400);
  });

  it('rejects missing message body', async () => {
    const res = await request(app)
      .post('/api/chat/general')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/chat/general')
      .send({ message: 'Sneaky' });
    expect(res.status).toBe(401);
  });
});

// ─── GET messages after posting ───────────────────────────────────────────────

describe('GET /api/chat/:channelId after posts', () => {
  it('returns the messages that were posted', async () => {
    await request(app)
      .post('/api/chat/midwest')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Midwest haul' });

    await request(app)
      .post('/api/chat/midwest')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Anyone on I-80?' });

    const res = await request(app)
      .get('/api/chat/midwest')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(2);
    expect(res.body.messages[0].message).toBe('Midwest haul');
  });

  it('does not return messages from a different channel', async () => {
    await request(app)
      .post('/api/chat/west')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'West coast run' });

    const res = await request(app)
      .get('/api/chat/northeast')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.messages).toHaveLength(0);
  });
});

// ─── DELETE message ───────────────────────────────────────────────────────────

describe('DELETE /api/chat/:id', () => {
  it('deletes own message', async () => {
    const post = await request(app)
      .post('/api/chat/general')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Delete me' });

    const msgId: string = post.body.message._id;
    const del = await request(app)
      .delete(`/api/chat/${msgId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const list = await request(app)
      .get('/api/chat/general')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.messages).toHaveLength(0);
  });
});
