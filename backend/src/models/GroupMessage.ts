import mongoose, { Document, Schema } from 'mongoose';
import { ReactionType, REACTION_TYPES } from './NetworkPost';

export interface IGroupMessageReaction {
  userId: mongoose.Types.ObjectId;
  type: ReactionType;
}

export interface IGroupSharedPostSnapshot {
  postId: mongoose.Types.ObjectId;
  authorName: string;
  authorAvatarUrl?: string;
  title: string;
  body: string;
  imageUrl?: string;
  createdAt: Date;
}

export interface IGroupMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  senderAvatarUrl?: string;
  message: string;
  sharedPost?: IGroupSharedPostSnapshot;
  reactions: IGroupMessageReaction[];
  readBy: { userId: mongoose.Types.ObjectId; readAt: Date }[];
  createdAt: Date;
}

const GroupMessageSchema = new Schema<IGroupMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'GroupConversation', required: true, index: true },
    senderId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName:     { type: String, required: true },
    senderAvatarUrl: { type: String },
    message:        { type: String, maxlength: 1000, trim: true, default: '' },
    sharedPost: {
      postId:          { type: Schema.Types.ObjectId, ref: 'NetworkPost' },
      authorName:      { type: String },
      authorAvatarUrl: { type: String },
      title:           { type: String },
      body:            { type: String },
      imageUrl:        { type: String },
      createdAt:       { type: Date },
    },
    reactions: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      type:   { type: String, enum: REACTION_TYPES, required: true },
      _id: false,
    }],
    readBy: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      readAt: { type: Date, required: true },
      _id: false,
    }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

GroupMessageSchema.index({ conversationId: 1, createdAt: -1 });

export default mongoose.model<IGroupMessage>('GroupMessage', GroupMessageSchema);
