import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType = 'reaction' | 'reply' | 'follow' | 'mention' | 'share' | 'group_invite' | 'friend_request' | 'friend_accept';

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  actorName: string;
  actorAvatarUrl?: string;
  type: NotificationType;
  postId?: mongoose.Types.ObjectId;
  postTitle?: string;
  reactionType?: string;
  conversationId?: mongoose.Types.ObjectId;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorName:      { type: String, required: true },
    actorAvatarUrl: { type: String },
    type: {
      type: String,
      enum: ['reaction', 'reply', 'follow', 'mention', 'share', 'group_invite', 'friend_request', 'friend_accept'],
      required: true,
    },
    postId:         { type: Schema.Types.ObjectId, ref: 'NetworkPost' },
    postTitle:      { type: String },
    reactionType:   { type: String },
    conversationId: { type: Schema.Types.ObjectId, ref: 'GroupConversation' },
    readAt:         { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, readAt: 1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
