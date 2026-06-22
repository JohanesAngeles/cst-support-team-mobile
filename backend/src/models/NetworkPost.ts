import mongoose, { Document, Schema } from 'mongoose';

export interface INetworkPost extends Document {
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  authorAvatarUrl?: string;
  category: 'general' | 'advice' | 'load-opportunity' | 'route-tip' | 'question' | 'vent';
  title: string;
  body: string;
  imageUrl?: string;
  upvotes: mongoose.Types.ObjectId[];
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
    upvotes:         [{ type: Schema.Types.ObjectId, ref: 'User' }],
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
