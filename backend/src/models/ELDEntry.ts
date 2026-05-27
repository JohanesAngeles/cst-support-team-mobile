import mongoose, { Document, Schema } from 'mongoose';

export type ELDStatus = 'off_duty' | 'sleeper_berth' | 'driving' | 'on_duty';

export interface IELDEntry extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  status: ELDStatus;
  startTime: Date;
  endTime?: Date;
  location?: string;
  notes?: string;
}

const ELDEntrySchema = new Schema<IELDEntry>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date:      { type: String, required: true },
    status:    { type: String, enum: ['off_duty', 'sleeper_berth', 'driving', 'on_duty'], required: true },
    startTime: { type: Date, required: true },
    endTime:   { type: Date },
    location:  { type: String },
    notes:     { type: String },
  },
  { timestamps: true }
);

ELDEntrySchema.index({ userId: 1, date: 1 });

export default mongoose.model<IELDEntry>('ELDEntry', ELDEntrySchema);
