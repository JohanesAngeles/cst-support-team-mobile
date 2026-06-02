import mongoose, { Document, Schema } from 'mongoose';

export interface ISleepLog extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  sleepStart: string;
  sleepEnd: string;
  sleepHours: number;
  quality: 1 | 2 | 3 | 4 | 5;
  location?: string;
  notes?: string;
  createdAt: Date;
}

const SleepLogSchema = new Schema<ISleepLog>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date:       { type: String, required: true },
    sleepStart: { type: String, required: true },
    sleepEnd:   { type: String, required: true },
    sleepHours: { type: Number, required: true },
    quality:    { type: Number, min: 1, max: 5, required: true },
    location:   { type: String },
    notes:      { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<ISleepLog>('SleepLog', SleepLogSchema);
