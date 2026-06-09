import 'dotenv/config';
import * as Sentry from '@sentry/node';
import http from 'http';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import ChatMessage from './models/ChatMessage';
import User from './models/User';
import authRoutes from './routes/auth';
import aiRoutes from './routes/ai';
import expensesRoutes from './routes/expenses';
import iftaRoutes from './routes/ifta';
import truckRoutes from './routes/truck';
import maintenanceRoutes from './routes/maintenance';
import deadlinesRoutes from './routes/deadlines';
import documentsRoutes from './routes/documents';
import revenueRoutes from './routes/revenue';
import hosRoutes from './routes/hos';
import detentionRoutes from './routes/detention';
import triplogRoutes from './routes/triplog';
import fuellogRoutes from './routes/fuellog';
import brokernotesRoutes from './routes/brokernotes';
import emergencyContactsRoutes from './routes/emergencycontacts';
import notificationsRoutes from './routes/notifications';
import billingRoutes from './routes/billing';
import mapRoutes from './routes/map';
import loadsRoutes from './routes/loads';
import dispatchContactsRoutes from './routes/dispatchcontacts';
import eldRoutes from './routes/eld';
import scorecardRoutes from './routes/scorecard';
import dvirRoutes from './routes/dvir';
import invoicesRoutes from './routes/invoices';
import drugTestsRoutes from './routes/drug-tests';
import chatRoutes from './routes/chat';
import brokerBlacklistRoutes from './routes/broker-blacklist';
import networkRoutes from './routes/network';
import parkingRoutes from './routes/parking';
import sleepLogRoutes from './routes/sleep-log';
import shippersRoutes from './routes/shippers';
import referralsRoutes from './routes/referrals';
import roadReadyRoutes from './routes/road-ready';
import leaderboardRoutes from './routes/leaderboard';
import cdlDocsRoutes from './routes/cdl-docs';
import cargoClaimsRoutes from './routes/cargo-claims';
import socialAuthRoutes from './routes/social-auth';
import fuelRoutes from './routes/fuel';
import legalRoutes from './routes/legal';
import uploadsRoutes from './routes/uploads';
import translateRoutes from './routes/translate';
import { initCronJobs } from './cron/notificationCron';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.2,
  });
}

const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
});

// ── Socket.io JWT auth middleware ──────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error('No token'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    socket.data.userId = decoded.id;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

const VALID_CHANNELS = new Set(['general', 'northeast', 'southeast', 'midwest', 'west', 'south']);

io.on('connection', (socket) => {
  socket.on('join_channel', (channelId: string) => {
    if (!VALID_CHANNELS.has(channelId)) return;
    // Leave previous channel room first
    if (socket.data.channelId) socket.leave(socket.data.channelId);
    socket.join(channelId);
    socket.data.channelId = channelId;
  });

  socket.on('send_message', async (payload: { channelId: string; message: string }) => {
    const { channelId, message } = payload ?? {};
    if (!VALID_CHANNELS.has(channelId) || !message?.trim()) return;
    try {
      const user = await User.findById(socket.data.userId).lean();
      if (!user) return;
      const msg = await ChatMessage.create({
        channelId,
        senderId: user._id,
        senderName: user.name,
        message: message.trim(),
      });
      io.to(channelId).emit('new_message', msg);
    } catch { /* ignore DB errors */ }
  });

  socket.on('delete_message', async (messageId: string) => {
    try {
      await ChatMessage.findOneAndDelete({ _id: messageId, senderId: socket.data.userId });
      if (socket.data.channelId) {
        io.to(socket.data.channelId).emit('message_deleted', messageId);
      }
    } catch { /* ignore */ }
  });

  socket.on('leave_channel', (channelId: string) => {
    socket.leave(channelId);
    if (socket.data.channelId === channelId) socket.data.channelId = undefined;
  });
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { message: 'Too many attempts, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json());

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/ifta', iftaRoutes);
app.use('/api/truck', truckRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/deadlines', deadlinesRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/hos', hosRoutes);
app.use('/api/detention', detentionRoutes);
app.use('/api/triplog', triplogRoutes);
app.use('/api/fuellog', fuellogRoutes);
app.use('/api/brokernotes', brokernotesRoutes);
app.use('/api/emergency-contacts', emergencyContactsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/loads', loadsRoutes);
app.use('/api/dispatch-contacts', dispatchContactsRoutes);
app.use('/api/eld', eldRoutes);
app.use('/api/scorecard', scorecardRoutes);
app.use('/api/dvir', dvirRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/drug-tests', drugTestsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/broker-blacklist', brokerBlacklistRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/sleep-log', sleepLogRoutes);
app.use('/api/shippers', shippersRoutes);
app.use('/api/referrals', referralsRoutes);
app.use('/api/road-ready', roadReadyRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/auth/social', socialAuthRoutes);
app.use('/api/cdl-docs', cdlDocsRoutes);
app.use('/api/cargo-claims', cargoClaimsRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/translate', translateRoutes);
app.use('/', legalRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'CST Backend', timestamp: new Date().toISOString() });
});

// Sentry error handler must come after all routes
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

const PORT = process.env.PORT ?? 5000;
const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/cst_db';

if (process.env.NODE_ENV !== 'test') {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log('MongoDB connected');
      initCronJobs();
      server.listen(PORT, () => console.log(`CST API running on port ${PORT}`));
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err.message);
      process.exit(1);
    });
}

export default app;
