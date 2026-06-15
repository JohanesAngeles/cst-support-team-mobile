import mongoose, { Document, Schema } from 'mongoose';

export interface IBusinessReview extends Document {
  listingId: mongoose.Types.ObjectId;
  driverId: mongoose.Types.ObjectId;
  driverName: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

const BusinessReviewSchema = new Schema<IBusinessReview>(
  {
    listingId:  { type: Schema.Types.ObjectId, ref: 'BusinessListing', required: true },
    driverId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    driverName: { type: String, required: true },
    rating:     { type: Number, required: true, min: 1, max: 5 },
    comment:    { type: String, trim: true },
  },
  { timestamps: true }
);

// One review per driver per listing
BusinessReviewSchema.index({ listingId: 1, driverId: 1 }, { unique: true });

export default mongoose.model<IBusinessReview>('BusinessReview', BusinessReviewSchema);
