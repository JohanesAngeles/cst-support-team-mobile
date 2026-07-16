import mongoose, { Document, Schema } from 'mongoose';

export interface IMarketplaceReview extends Document {
  listingId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;
  reviewerName: string;
  reviewerAvatarUrl?: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

const MarketplaceReviewSchema = new Schema<IMarketplaceReview>(
  {
    listingId:        { type: Schema.Types.ObjectId, ref: 'MarketplaceListing', required: true },
    reviewerId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewerName:     { type: String, required: true },
    reviewerAvatarUrl: { type: String },
    rating:           { type: Number, required: true, min: 1, max: 5 },
    comment:          { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

// One review per driver per listing
MarketplaceReviewSchema.index({ listingId: 1, reviewerId: 1 }, { unique: true });

export default mongoose.model<IMarketplaceReview>('MarketplaceReview', MarketplaceReviewSchema);
