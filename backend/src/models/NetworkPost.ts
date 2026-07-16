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

export interface IPollOption {
  text: string;
  votes: mongoose.Types.ObjectId[];
}

export interface IPoll {
  question: string;
  options: IPollOption[];
}

export interface INetworkPost extends Document {
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  authorAvatarUrl?: string;
  authorIsTopDriver?: boolean;
  category: 'general' | 'advice' | 'load-opportunity' | 'route-tip' | 'question' | 'vent';
  visibility: 'public' | 'followers' | 'convoy';
  title: string;
  body: string;
  imageUrl?: string;
  videoUrl?: string;
  videoThumbnailUrl?: string;
  hashtags: string[];
  poll?: IPoll;
  location?: string;
  lat?: number;
  lng?: number;
  groupId?: mongoose.Types.ObjectId;
  groupName?: string;
  groupCreatorId?: mongoose.Types.ObjectId;
  sharedPost?: ISharedPostSnapshot;
  milestoneMiles?: number;
  shareCount: number;
  viewCount: number;
  upvotes: mongoose.Types.ObjectId[];
  reactions: IReaction[];
  replies: mongoose.Types.DocumentArray<{
    _id: mongoose.Types.ObjectId;
    authorId: mongoose.Types.ObjectId;
    authorName: string;
    authorAvatarUrl?: string;
    body: string;
    parentReplyId?: mongoose.Types.ObjectId;
    createdAt: Date;
  }>;
  editedAt?: Date;
  createdAt: Date;
}

const NetworkPostSchema = new Schema<INetworkPost>(
  {
    authorId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName:      { type: String, required: true },
    authorAvatarUrl: { type: String },
    authorIsTopDriver: { type: Boolean },
    category:        { type: String, enum: ['general', 'advice', 'load-opportunity', 'route-tip', 'question', 'vent'], default: 'general' },
    visibility:      { type: String, enum: ['public', 'followers', 'convoy'], default: 'public', index: true },
    title:           { type: String, required: true, maxlength: 120 },
    body:            { type: String, required: true, maxlength: 2000 },
    imageUrl:        { type: String },
    videoUrl:        { type: String },
    videoThumbnailUrl: { type: String },
    hashtags:        [{ type: String, index: true }],
    poll: {
      question: { type: String },
      options: [{
        text:  { type: String },
        votes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        _id: false,
      }],
    },
    location:        { type: String, maxlength: 120 },
    lat:             { type: Number, min: -90, max: 90 },
    lng:             { type: Number, min: -180, max: 180 },
    groupId:         { type: Schema.Types.ObjectId, ref: 'Group', index: true },
    groupName:       { type: String },
    groupCreatorId:  { type: Schema.Types.ObjectId, ref: 'User' },
    milestoneMiles:  { type: Number },
    shareCount:      { type: Number, default: 0 },
    viewCount:       { type: Number, default: 0 },
    editedAt:        { type: Date },
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
      parentReplyId:   { type: Schema.Types.ObjectId },
      createdAt:       { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

export default mongoose.model<INetworkPost>('NetworkPost', NetworkPostSchema);
