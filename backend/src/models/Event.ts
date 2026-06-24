import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  title: string;
  description?: string;
  date: Date;
  location: string;
  createdAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    authorId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName:  { type: String, required: true },
    title:       { type: String, required: true, maxlength: 120 },
    description: { type: String, maxlength: 1000 },
    date:        { type: Date, required: true },
    location:    { type: String, required: true, maxlength: 160 },
  },
  { timestamps: true }
);

export default mongoose.model<IEvent>('Event', EventSchema);
