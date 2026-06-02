import mongoose, { Document, Schema } from 'mongoose';

export interface IBrokerBlacklist extends Document {
  submittedBy: mongoose.Types.ObjectId;
  submitterName: string;
  brokerName: string;
  mcNum?: string;
  phone?: string;
  reason: string;
  category: 'no-pay' | 'ghost-load' | 'bait-switch' | 'harassment' | 'fraud' | 'other';
  upvotes: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const BrokerBlacklistSchema = new Schema<IBrokerBlacklist>(
  {
    submittedBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    submitterName: { type: String, required: true },
    brokerName:    { type: String, required: true, trim: true },
    mcNum:         { type: String },
    phone:         { type: String },
    reason:        { type: String, required: true },
    category:      { type: String, enum: ['no-pay', 'ghost-load', 'bait-switch', 'harassment', 'fraud', 'other'], required: true },
    upvotes:       [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model<IBrokerBlacklist>('BrokerBlacklist', BrokerBlacklistSchema);
