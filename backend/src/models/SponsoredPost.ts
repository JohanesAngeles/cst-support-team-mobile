import mongoose, { Document, Schema } from 'mongoose';

export interface ISponsoredPost extends Document {
  sponsorName: string;
  sponsorLogoUrl?: string;
  imageUrl?: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  active: boolean;
  impressions: number;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
}

const SponsoredPostSchema = new Schema<ISponsoredPost>(
  {
    sponsorName:    { type: String, required: true, trim: true },
    sponsorLogoUrl: { type: String, trim: true },
    imageUrl:       { type: String, trim: true },
    body:           { type: String, required: true, maxlength: 500 },
    ctaLabel:       { type: String, required: true, trim: true, maxlength: 30 },
    ctaUrl:         { type: String, required: true, trim: true },
    active:         { type: Boolean, default: true },
    impressions:    { type: Number, default: 0 },
    clicks:         { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<ISponsoredPost>('SponsoredPost', SponsoredPostSchema);
