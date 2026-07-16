import mongoose, { Document, Schema } from 'mongoose';

export interface ISponsor extends Document {
  name: string;
  logoUrl?: string;
  linkUrl?: string;
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const SponsorSchema = new Schema<ISponsor>(
  {
    name:    { type: String, required: true, trim: true },
    logoUrl: { type: String, trim: true },
    linkUrl: { type: String, trim: true },
    active:  { type: Boolean, default: true },
    order:   { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<ISponsor>('Sponsor', SponsorSchema);
