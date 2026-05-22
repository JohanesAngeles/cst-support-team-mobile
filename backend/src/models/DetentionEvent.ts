import mongoose, { Document, Schema } from 'mongoose';

export interface IDetentionEvent extends Document {
  userId: mongoose.Types.ObjectId;
  location: string;
  type: 'Shipper' | 'Receiver' | 'Other';
  loadNum: string;
  clockIn: Date;
  clockOut?: Date;
  freeHours: number;
  ratePerHour: number;
}

const DetentionEventSchema = new Schema<IDetentionEvent>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    location:    { type: String, required: true },
    type:        { type: String, enum: ['Shipper', 'Receiver', 'Other'], default: 'Shipper' },
    loadNum:     { type: String, default: '' },
    clockIn:     { type: Date, required: true },
    clockOut:    { type: Date },
    freeHours:   { type: Number, default: 2 },
    ratePerHour: { type: Number, default: 50 },
  },
  { timestamps: true }
);

export default mongoose.model<IDetentionEvent>('DetentionEvent', DetentionEventSchema);
