import mongoose, { Document, Schema } from 'mongoose';

export interface IPromoRedemption extends Document {
  celebrityId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  plan: 'monthly' | 'annual';
  source: 'stripe' | 'cashapp' | 'authorizenet';
  sourceRef: string;
  discountAmount: number;
  amountCharged: number;
  createdAt: Date;
}

const PromoRedemptionSchema = new Schema<IPromoRedemption>(
  {
    celebrityId:    { type: Schema.Types.ObjectId, ref: 'Celebrity', required: true, index: true },
    userId:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
    plan:           { type: String, enum: ['monthly', 'annual'], required: true },
    source:         { type: String, enum: ['stripe', 'cashapp', 'authorizenet'], required: true },
    // Stripe checkout session id, or CashAppPayment _id — makes redemption logging
    // idempotent against webhook retries / double-approval clicks.
    sourceRef:      { type: String, required: true },
    discountAmount: { type: Number, required: true },
    amountCharged:  { type: Number, required: true }, // cents actually paid, for the celebrity's revenue-generated stat
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PromoRedemptionSchema.index({ celebrityId: 1, source: 1, sourceRef: 1 }, { unique: true });

export default mongoose.model<IPromoRedemption>('PromoRedemption', PromoRedemptionSchema);
