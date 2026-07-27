import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminNote extends Document {
  userId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  body: string;
  createdAt: Date;
}

const AdminNoteSchema = new Schema<IAdminNote>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    body:       { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IAdminNote>('AdminNote', AdminNoteSchema);
