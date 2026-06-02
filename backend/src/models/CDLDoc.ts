import mongoose, { Document, Schema } from 'mongoose';

export interface ICDLDoc extends Document {
  userId: mongoose.Types.ObjectId;
  docType: string;
  licenseNumber?: string;
  issuingState?: string;
  issueDate?: Date;
  expirationDate: Date;
  notes?: string;
}

const CDLDocSchema = new Schema<ICDLDoc>(
  {
    userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    docType:       { type: String, required: true, trim: true },
    licenseNumber: { type: String, trim: true },
    issuingState:  { type: String, trim: true },
    issueDate:     { type: Date },
    expirationDate:{ type: Date, required: true },
    notes:         { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICDLDoc>('CDLDoc', CDLDocSchema);
