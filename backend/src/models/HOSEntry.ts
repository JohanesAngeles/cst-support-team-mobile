import mongoose, { Document, Schema } from 'mongoose';

export interface IHOSEntry extends Document {
  userId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  drivingHours: number;
  onDutyHours: number;
  notes: string;
}

const HOSEntrySchema = new Schema<IHOSEntry>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date:         { type: String, required: true },
    drivingHours: { type: Number, required: true, min: 0, max: 11 },
    onDutyHours:  { type: Number, required: true, min: 0, max: 14 },
    notes:        { type: String, default: '' },
  },
  { timestamps: true }
);

HOSEntrySchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model<IHOSEntry>('HOSEntry', HOSEntrySchema);
