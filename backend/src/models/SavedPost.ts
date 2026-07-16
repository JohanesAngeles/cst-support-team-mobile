import mongoose, { Document, Schema } from 'mongoose';

export interface ISavedPost extends Document {
  userId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const SavedPostSchema = new Schema<ISavedPost>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    postId: { type: Schema.Types.ObjectId, ref: 'NetworkPost', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

SavedPostSchema.index({ userId: 1, postId: 1 }, { unique: true });
SavedPostSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<ISavedPost>('SavedPost', SavedPostSchema);
