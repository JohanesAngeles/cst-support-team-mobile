import mongoose, { Document, Schema } from 'mongoose';

export interface IBusinessListing extends Document {
  ownerId: mongoose.Types.ObjectId;
  businessName: string;
  category: string;
  phone: string;
  city: string;
  state: string;
  website?: string;
  description?: string;
  hours?: string;
  logoUrl?: string;
  isActive: boolean;
  viewCount: number;
  clickCount: number;
  rating: number;
  reviewCount: number;
  latitude?: number;
  longitude?: number;
  // Fields imported from the CST website founding partner database
  physicalAddress?: string;
  ownerName?: string;
  ownerEmail?: string;
  serviceArea?: string;
  servicesOffered?: string;
  mobileService?: boolean;
  roadsideAssistance?: boolean;
  heavyDutyService?: boolean;
  is24Hours?: boolean;
  photoUrls?: string[];
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  importedFromWebsite?: boolean;
  websiteId?: string;
  coupon?: string;
  tier?: 'featured' | 'standard';
  createdAt: Date;
  updatedAt: Date;
}

const BusinessListingSchema = new Schema<IBusinessListing>(
  {
    ownerId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    businessName: { type: String, required: true, trim: true },
    category:     { type: String, required: true, trim: true },
    phone:        { type: String, required: true, trim: true },
    city:         { type: String, required: true, trim: true },
    state:        { type: String, required: true, trim: true },
    website:      { type: String, trim: true },
    description:  { type: String, trim: true },
    hours:        { type: String, trim: true },
    logoUrl:      { type: String },
    isActive:     { type: Boolean, default: true },
    viewCount:    { type: Number, default: 0 },
    clickCount:   { type: Number, default: 0 },
    rating:       { type: Number, default: 0, min: 0, max: 5 },
    reviewCount:  { type: Number, default: 0 },
    latitude:     { type: Number },
    longitude:    { type: Number },
    // Extra fields from website founding partners
    physicalAddress:     { type: String, trim: true },
    ownerName:           { type: String, trim: true },
    ownerEmail:          { type: String, trim: true },
    serviceArea:         { type: String, trim: true },
    servicesOffered:     { type: String, trim: true },
    mobileService:       { type: Boolean, default: false },
    roadsideAssistance:  { type: Boolean, default: false },
    heavyDutyService:    { type: Boolean, default: false },
    is24Hours:           { type: Boolean, default: false },
    photoUrls:           [{ type: String }],
    facebook:            { type: String, trim: true },
    instagram:           { type: String, trim: true },
    linkedin:            { type: String, trim: true },
    importedFromWebsite: { type: Boolean, default: false },
    websiteId:           { type: String },
    coupon:              { type: String, trim: true },
    tier:                { type: String, enum: ['featured', 'standard'], default: 'standard' },
  },
  { timestamps: true }
);

export default mongoose.model<IBusinessListing>('BusinessListing', BusinessListingSchema);
