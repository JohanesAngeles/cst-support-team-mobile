import mongoose, { Document, Schema } from 'mongoose';

export interface IUserDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  icon: string;
  status: string;
}

const UserDocumentSchema = new Schema<IUserDocument>(
  { userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, name: { type: String, required: true }, icon: { type: String, default: 'document-outline' }, status: { type: String, default: 'Active' } },
  { timestamps: true }
);

export default mongoose.model<IUserDocument>('UserDocument', UserDocumentSchema);
