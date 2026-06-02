import mongoose, { Document, Schema } from 'mongoose';

export interface ICargoClaim extends Document {
  userId: mongoose.Types.ObjectId;
  claimNumber: string;
  loadNumber?: string;
  incidentDate: Date;
  shipper?: string;
  receiver?: string;
  issueType: string;
  description: string;
  estimatedLoss?: number;
  status: 'Draft' | 'Filed' | 'Under Review' | 'Approved' | 'Denied' | 'Settled';
  notes?: string;
}

const CargoClaimSchema = new Schema<ICargoClaim>(
  {
    userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    claimNumber:   { type: String, required: true },
    loadNumber:    { type: String, trim: true },
    incidentDate:  { type: Date, required: true },
    shipper:       { type: String, trim: true },
    receiver:      { type: String, trim: true },
    issueType:     { type: String, required: true },
    description:   { type: String, required: true, trim: true },
    estimatedLoss: { type: Number, min: 0 },
    status:        { type: String, enum: ['Draft','Filed','Under Review','Approved','Denied','Settled'], default: 'Draft' },
    notes:         { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICargoClaim>('CargoClaim', CargoClaimSchema);
