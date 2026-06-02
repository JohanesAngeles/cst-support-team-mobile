import mongoose, { Document, Schema } from 'mongoose';

export interface IUserDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  icon: string;
  status: string;
  fileUrl: string;
  publicId: string;
  resourceType: string;
  fileType: string;
  fileSize: number;
  expiryDate?: string;
}

const UserDocumentSchema = new Schema<IUserDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    icon: { type: String, default: 'document-outline' },
    status: { type: String, default: 'Active' },
    fileUrl: { type: String, default: '' },
    publicId: { type: String, default: '' },
    resourceType: { type: String, default: 'raw' },
    fileType: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    expiryDate: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IUserDocument>('UserDocument', UserDocumentSchema);
