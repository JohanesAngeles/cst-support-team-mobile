import mongoose, { Document, Schema } from 'mongoose';

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export interface IFriendRequest extends Document {
  senderId: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  status: FriendRequestStatus;
  createdAt: Date;
  respondedAt?: Date;
}

const FriendRequestSchema = new Schema<IFriendRequest>(
  {
    senderId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status:      { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending', index: true },
    respondedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

FriendRequestSchema.index({ senderId: 1, recipientId: 1 }, { unique: true });
FriendRequestSchema.index({ recipientId: 1, status: 1 });

export default mongoose.model<IFriendRequest>('FriendRequest', FriendRequestSchema);
