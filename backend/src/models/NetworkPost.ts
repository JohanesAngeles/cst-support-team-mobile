import mongoose, { Document, Schema } from 'mongoose';

export interface INetworkPost extends Document {
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  category: 'advice' | 'load-opportunity' | 'route-tip' | 'question' | 'vent';
  title: string;
  body: string;
  upvotes: mongoose.Types.ObjectId[];
  replies: { authorId: mongoose.Types.ObjectId; authorName: string; body: string; createdAt: Date }[];
  createdAt: Date;
}

const NetworkPostSchema = new Schema<INetworkPost>(
  {
    authorId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    category:   { type: String, enum: ['advice', 'load-opportunity', 'route-tip', 'question', 'vent'], required: true },
    title:      { type: String, required: true, maxlength: 120 },
    body:       { type: String, required: true, maxlength: 2000 },
    upvotes:    [{ type: Schema.Types.ObjectId, ref: 'User' }],
    replies: [{
      authorId:   { type: Schema.Types.ObjectId, ref: 'User' },
      authorName: { type: String },
      body:       { type: String, maxlength: 1000 },
      createdAt:  { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

export default mongoose.model<INetworkPost>('NetworkPost', NetworkPostSchema);
