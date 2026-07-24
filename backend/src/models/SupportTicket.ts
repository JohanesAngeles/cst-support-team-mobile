import mongoose, { Document, Schema } from 'mongoose';

export type SupportTicketStatus = 'open' | 'resolved';

export interface ISupportTicket extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  adminReply?: string;
  repliedAt?: Date;
  createdAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName:   { type: String, required: true },
    userEmail:  { type: String, required: true },
    subject:    { type: String, required: true, trim: true, maxlength: 150 },
    message:    { type: String, required: true, trim: true, maxlength: 2000 },
    status:     { type: String, enum: ['open', 'resolved'], default: 'open' },
    adminReply: { type: String, trim: true, maxlength: 2000 },
    repliedAt:  { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
