import mongoose, { Document, Schema } from 'mongoose';

export interface IGroupConversation extends Document {
  name?: string;
  avatarUrl?: string;
  participantIds: mongoose.Types.ObjectId[];
  creatorId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const GroupConversationSchema = new Schema<IGroupConversation>(
  {
    name:      { type: String, maxlength: 80, trim: true },
    avatarUrl: { type: String },
    participantIds: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

GroupConversationSchema.index({ participantIds: 1 });

export default mongoose.model<IGroupConversation>('GroupConversation', GroupConversationSchema);
