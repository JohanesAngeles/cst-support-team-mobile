import mongoose, { Document, Schema } from 'mongoose';

export interface IPartnerApplication extends Document {
  businessName: string;
  category: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  website?: string;
  description?: string;
  referralCode?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

const PartnerApplicationSchema = new Schema<IPartnerApplication>(
  {
    businessName: { type: String, required: true, trim: true },
    category:     { type: String, required: true, trim: true },
    contactName:  { type: String, required: true, trim: true },
    email:        { type: String, required: true, lowercase: true, trim: true },
    phone:        { type: String, required: true, trim: true },
    city:         { type: String, required: true, trim: true },
    state:        { type: String, required: true, trim: true },
    website:      { type: String, trim: true },
    description:  { type: String, trim: true },
    // Code of the driver/partner (if any) who referred this applicant
    referralCode: { type: String, trim: true, uppercase: true },
    status:       { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

export default mongoose.model<IPartnerApplication>('PartnerApplication', PartnerApplicationSchema);
