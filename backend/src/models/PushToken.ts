import mongoose, { Document, Schema } from 'mongoose';

export interface IPushToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  platform: 'ios' | 'android' | 'web';
  createdAt: Date;
}

const PushTokenSchema = new Schema<IPushToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ['ios', 'android', 'web'], default: 'ios' },
  },
  { timestamps: true }
);

PushTokenSchema.index({ userId: 1 });

export default mongoose.model<IPushToken>('PushToken', PushTokenSchema);
