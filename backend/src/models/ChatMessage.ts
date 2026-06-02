import mongoose, { Document, Schema } from 'mongoose';

export interface IChatMessage extends Document {
  channelId: string;
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  message: string;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    channelId:  { type: String, required: true, index: true },
    senderId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    message:    { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);

ChatMessageSchema.index({ channelId: 1, createdAt: -1 });

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
