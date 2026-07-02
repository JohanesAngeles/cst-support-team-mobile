import mongoose, { Document, Schema } from 'mongoose';

export const MARKETPLACE_CATEGORIES = [
  'Trucks & Trailers',
  'Parts & Tires',
  'Electronics & ELDs',
  'Tools & Equipment',
  'Apparel & Gear',
  'Other',
] as const;

export const MARKETPLACE_CONDITIONS = ['New', 'Like New', 'Used', 'For Parts'] as const;

export const MARKETPLACE_DELIVERY_OPTIONS = ['Local Pickup Only', 'Can Deliver Locally', 'Can Ship'] as const;

export interface IMarketplaceListing extends Document {
  postedBy: mongoose.Types.ObjectId;
  postedByName: string;
  title: string;
  description?: string;
  price: number;
  isNegotiable: boolean;
  category: typeof MARKETPLACE_CATEGORIES[number];
  condition: typeof MARKETPLACE_CONDITIONS[number];
  make?: string;
  modelName?: string;
  year?: number;
  mileage?: number;
  quantity: number;
  deliveryOption: typeof MARKETPLACE_DELIVERY_OPTIONS[number];
  photos: string[];
  city: string;
  state: string;
  contactPhone?: string;
  status: 'active' | 'sold';
  createdAt: Date;
}

const MarketplaceListingSchema = new Schema<IMarketplaceListing>(
  {
    postedBy:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    postedByName:  { type: String, required: true },
    title:         { type: String, required: true, trim: true, maxlength: 100 },
    description:   { type: String, trim: true, maxlength: 1000 },
    price:         { type: Number, required: true },
    isNegotiable:  { type: Boolean, default: false },
    category:      { type: String, enum: MARKETPLACE_CATEGORIES, required: true },
    condition:     { type: String, enum: MARKETPLACE_CONDITIONS, required: true },
    make:          { type: String, trim: true, maxlength: 50 },
    modelName:     { type: String, trim: true, maxlength: 50 },
    year:          { type: Number, min: 1900, max: 2100 },
    mileage:       { type: Number, min: 0 },
    quantity:      { type: Number, default: 1, min: 1 },
    deliveryOption: { type: String, enum: MARKETPLACE_DELIVERY_OPTIONS, default: 'Local Pickup Only' },
    photos:        { type: [String], default: [] },
    city:          { type: String, required: true, trim: true },
    state:         { type: String, required: true, trim: true },
    contactPhone:  { type: String, trim: true },
    status:        { type: String, enum: ['active', 'sold'], default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.model<IMarketplaceListing>('MarketplaceListing', MarketplaceListingSchema);
