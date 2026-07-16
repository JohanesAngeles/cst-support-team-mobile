import mongoose, { Document, Schema } from 'mongoose';
import { DRIVER_STATUSES, DriverStatus } from './User';

export interface IStory extends Document {
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  authorAvatarUrl?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  location?: string;
  lat?: number;
  lng?: number;
  driverStatus?: DriverStatus;
  viewedBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  expiresAt: Date;
}

const StorySchema = new Schema<IStory>(
  {
    authorId:        { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorName:      { type: String, required: true },
    authorAvatarUrl: { type: String },
    mediaUrl:        { type: String, required: true },
    mediaType:       { type: String, enum: ['image', 'video'], required: true },
    caption:         { type: String, maxlength: 280 },
    location:        { type: String, maxlength: 120 },
    lat:             { type: Number, min: -90, max: 90 },
    lng:             { type: Number, min: -180, max: 180 },
    driverStatus:    { type: String, enum: DRIVER_STATUSES },
    viewedBy:        [{ type: Schema.Types.ObjectId, ref: 'User' }],
    expiresAt:       { type: Date, required: true, expires: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IStory>('Story', StorySchema);
