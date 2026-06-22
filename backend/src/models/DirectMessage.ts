import mongoose, { Document, Schema } from 'mongoose';

export interface IDirectMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  message: string;
  readAt?: Date;
  createdAt: Date;
}

const DirectMessageSchema = new Schema<IDirectMessage>(
  {
    senderId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message:     { type: String, required: true, maxlength: 1000, trim: true },
    readAt:      { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

DirectMessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
DirectMessageSchema.index({ recipientId: 1, senderId: 1, readAt: 1 });

export default mongoose.model<IDirectMessage>('DirectMessage', DirectMessageSchema);
