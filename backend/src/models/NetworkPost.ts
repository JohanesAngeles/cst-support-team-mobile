import mongoose, { Document, Schema } from 'mongoose';

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export const REACTION_TYPES: ReactionType[] = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

export interface ISharedPostSnapshot {
  postId: mongoose.Types.ObjectId;
  authorName: string;
  authorAvatarUrl?: string;
  title: string;
  body: string;
  imageUrl?: string;
  createdAt: Date;
}

export interface IReaction {
  userId: mongoose.Types.ObjectId;
  type: ReactionType;
}

export interface INetworkPost extends Document {
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  authorAvatarUrl?: string;
  category: 'general' | 'advice' | 'load-opportunity' | 'route-tip' | 'question' | 'vent';
  title: string;
  body: string;
  imageUrl?: string;
  groupId?: mongoose.Types.ObjectId;
  groupName?: string;
  sharedPost?: ISharedPostSnapshot;
  upvotes: mongoose.Types.ObjectId[];
  reactions: IReaction[];
  replies: { authorId: mongoose.Types.ObjectId; authorName: string; authorAvatarUrl?: string; body: string; createdAt: Date }[];
  createdAt: Date;
}

const NetworkPostSchema = new Schema<INetworkPost>(
  {
    authorId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName:      { type: String, required: true },
    authorAvatarUrl: { type: String },
    category:        { type: String, enum: ['general', 'advice', 'load-opportunity', 'route-tip', 'question', 'vent'], default: 'general' },
    title:           { type: String, required: true, maxlength: 120 },
    body:            { type: String, required: true, maxlength: 2000 },
    imageUrl:        { type: String },
    groupId:         { type: Schema.Types.ObjectId, ref: 'Group', index: true },
    groupName:       { type: String },
    sharedPost: {
      postId:          { type: Schema.Types.ObjectId, ref: 'NetworkPost' },
      authorName:      { type: String },
      authorAvatarUrl: { type: String },
      title:           { type: String },
      body:            { type: String },
      imageUrl:        { type: String },
      createdAt:       { type: Date },
    },
    upvotes:         [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reactions: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      type:   { type: String, enum: REACTION_TYPES, required: true },
      _id: false,
    }],
    replies: [{
      authorId:        { type: Schema.Types.ObjectId, ref: 'User' },
      authorName:      { type: String },
      authorAvatarUrl: { type: String },
      body:            { type: String, maxlength: 1000 },
      createdAt:       { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

export default mongoose.model<INetworkPost>('NetworkPost', NetworkPostSchema);
