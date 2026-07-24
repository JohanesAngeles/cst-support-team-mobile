import mongoose, { Document, Schema } from 'mongoose';

export interface IHighlightItem {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  addedAt: Date;
}

export interface IStoryHighlight extends Document {
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  title: string;
  coverImageUrl?: string;
  items: mongoose.Types.DocumentArray<IHighlightItem>;
  createdAt: Date;
}

const StoryHighlightSchema = new Schema<IStoryHighlight>(
  {
    authorId:       { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorName:     { type: String, required: true },
    title:          { type: String, required: true, maxlength: 30 },
    coverImageUrl:  { type: String },
    items: [{
      mediaUrl:  { type: String, required: true },
      mediaType: { type: String, enum: ['image', 'video'], required: true },
      caption:   { type: String, maxlength: 280 },
      addedAt:   { type: Date, default: Date.now },
      _id: false,
    }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IStoryHighlight>('StoryHighlight', StoryHighlightSchema);
