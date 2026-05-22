import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
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

const app = express();

app.use(cors());
app.use(express.json());

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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'CST Backend', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT ?? 5000;
const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/cst_db';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`CST API running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

export default app;
