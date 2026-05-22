import mongoose, { Document, Schema } from 'mongoose';

export interface IIFTAEntry extends Document {
  userId: mongoose.Types.ObjectId;
  state: string;
  miles: number;
  gallons: number;
  taxAmount: number;
  quarter: number;
  year: number;
}

const IFTAEntrySchema = new Schema<IIFTAEntry>(
  { userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, state: { type: String, required: true }, miles: { type: Number, required: true, default: 0 }, gallons: { type: Number, required: true, default: 0 }, taxAmount: { type: Number, required: true, default: 0 }, quarter: { type: Number, required: true }, year: { type: Number, required: true } },
  { timestamps: true }
);

export default mongoose.model<IIFTAEntry>('IFTAEntry', IFTAEntrySchema);
