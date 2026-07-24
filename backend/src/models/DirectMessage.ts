import mongoose, { Document, Schema } from 'mongoose';
import { ReactionType, REACTION_TYPES } from './NetworkPost';

export interface ISharedPostSnapshot {
  postId: mongoose.Types.ObjectId;
  authorName: string;
  authorAvatarUrl?: string;
  title: string;
  body: string;
  imageUrl?: string;
  createdAt: Date;
}

export interface IMessageReaction {
  userId: mongoose.Types.ObjectId;
  type: ReactionType;
}

export interface IDirectMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  message: string;
  sharedPost?: ISharedPostSnapshot;
  reactions: IMessageReaction[];
  readAt?: Date;
  createdAt: Date;
}

const DirectMessageSchema = new Schema<IDirectMessage>(
  {
    senderId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message:     { type: String, maxlength: 1000, trim: true, default: '' },
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
    readAt:      { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

DirectMessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
DirectMessageSchema.index({ recipientId: 1, senderId: 1, readAt: 1 });

export default mongoose.model<IDirectMessage>('DirectMessage', DirectMessageSchema);
