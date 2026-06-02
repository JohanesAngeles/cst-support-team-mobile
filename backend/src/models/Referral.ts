import mongoose, { Document, Schema } from 'mongoose';

export interface IReferral extends Document {
  referrerId: mongoose.Types.ObjectId;
  referredUserId: mongoose.Types.ObjectId;
  code: string;
  rewardGranted: boolean;
  createdAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    referrerId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    referredUserId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    code:            { type: String, required: true },
    rewardGranted:   { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IReferral>('Referral', ReferralSchema);
