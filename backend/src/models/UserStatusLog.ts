import mongoose, { Document, Schema } from 'mongoose';

export interface IUserStatusLog extends Document {
  userId: mongoose.Types.ObjectId;
  fromStatus: string;
  toStatus: string;
  reason?: string;
  changedById: mongoose.Types.ObjectId;
  changedByName: string;
  createdAt: Date;
}

const UserStatusLogSchema = new Schema<IUserStatusLog>(
  {
    userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fromStatus:    { type: String, required: true },
    toStatus:      { type: String, required: true },
    reason:        { type: String, trim: true },
    changedById:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedByName: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IUserStatusLog>('UserStatusLog', UserStatusLogSchema);
