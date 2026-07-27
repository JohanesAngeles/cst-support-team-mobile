import mongoose, { Document, Schema } from 'mongoose';

export interface ICashAppPayment extends Document {
  userId: mongoose.Types.ObjectId;
  plan: 'monthly' | 'annual';
  amount: number;
  // Sender's Cash App $cashtag — lets an admin cross-reference the sender
  // name shown in their own Cash App activity feed, not just a typed number
  senderCashtag: string;
  // Cash App transaction/confirmation reference number — unique so the same
  // real transaction can't be claimed by more than one submission
  referenceNumber: string;
  // Screenshot of the Cash App payment confirmation screen — proof an admin
  // can compare against the actual transaction in their own activity feed
  screenshotUrl: string;
  status: 'pending' | 'paid' | 'rejected';
  paidAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  promoCode?: string;
  createdAt: Date;
}

const CashAppPaymentSchema = new Schema<ICashAppPayment>(
  {
    userId:          { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan:            { type: String, enum: ['monthly', 'annual'], required: true },
    amount:          { type: Number, required: true },
    senderCashtag:   { type: String, required: true, trim: true },
    referenceNumber: { type: String, required: true, trim: true, unique: true },
    screenshotUrl:   { type: String, required: true },
    status:          { type: String, enum: ['pending', 'paid', 'rejected'], default: 'pending' },
    paidAt:          { type: Date },
    verifiedBy:      { type: Schema.Types.ObjectId, ref: 'User' },
    // Celebrity promo code applied at submission time, if any — `amount` above is
    // already the discounted dollar figure the admin should expect to see.
    promoCode:       { type: String, trim: true, uppercase: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICashAppPayment>('CashAppPayment', CashAppPaymentSchema);
