import mongoose, { Document, Schema } from 'mongoose';

export interface INewsItem extends Document {
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  authorAvatarUrl?: string;
  title: string;
  body: string;
  imageUrl?: string;
  upvotes: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const NewsItemSchema = new Schema<INewsItem>(
  {
    authorId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName:      { type: String, required: true },
    authorAvatarUrl: { type: String },
    title:           { type: String, required: true, maxlength: 120 },
    body:            { type: String, required: true, maxlength: 2000 },
    imageUrl:        { type: String },
    upvotes:         [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model<INewsItem>('NewsItem', NewsItemSchema);
