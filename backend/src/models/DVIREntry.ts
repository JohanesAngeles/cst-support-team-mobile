import mongoose, { Document, Schema } from 'mongoose';

export interface IDVIREntry extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'pre-trip' | 'post-trip';
  date: string;
  odometer?: number;
  truckId?: string;
  items: { label: string; pass: boolean; notes?: string }[];
  defectsFound: boolean;
  driverSignature: string;
  remarks?: string;
  createdAt: Date;
}

const DVIREntrySchema = new Schema<IDVIREntry>(
  {
    userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type:     { type: String, enum: ['pre-trip', 'post-trip'], required: true },
    date:     { type: String, required: true },
    odometer: { type: Number },
    truckId:  { type: String },
    items: [{
      label: { type: String, required: true },
      pass:  { type: Boolean, required: true },
      notes: { type: String },
    }],
    defectsFound:    { type: Boolean, default: false },
    driverSignature: { type: String, required: true },
    remarks:         { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IDVIREntry>('DVIREntry', DVIREntrySchema);
