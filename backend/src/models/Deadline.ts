import mongoose, { Document, Schema } from 'mongoose';

export interface IDeadline extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  title: string;
  date: string;
  notes?: string;
}

const DeadlineSchema = new Schema<IDeadline>(
  { userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, type: { type: String, required: true }, title: { type: String, required: true }, date: { type: String, required: true }, notes: { type: String } },
  { timestamps: true }
);

export default mongoose.model<IDeadline>('Deadline', DeadlineSchema);
