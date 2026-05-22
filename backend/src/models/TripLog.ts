import mongoose, { Document, Schema } from 'mongoose';

export interface ITripLog extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  origin: string;
  destination: string;
  miles: number;
  loadNum: string;
  rate: number;
  broker: string;
  notes: string;
  status: 'Completed' | 'In Progress' | 'Cancelled';
}

const TripLogSchema = new Schema<ITripLog>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date:        { type: String, required: true },
    origin:      { type: String, required: true },
    destination: { type: String, required: true },
    miles:       { type: Number, required: true, min: 0 },
    loadNum:     { type: String, default: '' },
    rate:        { type: Number, default: 0 },
    broker:      { type: String, default: '' },
    notes:       { type: String, default: '' },
    status:      { type: String, enum: ['Completed', 'In Progress', 'Cancelled'], default: 'Completed' },
  },
  { timestamps: true }
);

export default mongoose.model<ITripLog>('TripLog', TripLogSchema);
