import mongoose, { Document, Schema } from 'mongoose';

export interface ILoginSession extends Document {
  userId: mongoose.Types.ObjectId;
  sessionId: string;
  device: string;
  ip?: string;
  revoked: boolean;
  createdAt: Date;
  lastSeenAt: Date;
}

const LoginSessionSchema = new Schema<ILoginSession>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId:  { type: String, required: true, unique: true },
    device:     { type: String, required: true },
    ip:         { type: String },
    revoked:    { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<ILoginSession>('LoginSession', LoginSessionSchema);
