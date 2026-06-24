import mongoose, { Document, Schema } from 'mongoose';

export interface ILiveSession extends Document {
  hostId: mongoose.Types.ObjectId;
  hostName: string;
  hostAvatarUrl?: string;
  title: string;
  roomName: string;
  status: 'live' | 'ended';
  viewerCount: number;
  startedAt: Date;
  endedAt?: Date;
}

const LiveSessionSchema = new Schema<ILiveSession>(
  {
    hostId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hostName:     { type: String, required: true },
    hostAvatarUrl: { type: String },
    title:        { type: String, required: true, maxlength: 120 },
    roomName:     { type: String, required: true, unique: true },
    status:       { type: String, enum: ['live', 'ended'], default: 'live' },
    viewerCount:  { type: Number, default: 0 },
    startedAt:    { type: Date, default: Date.now },
    endedAt:      { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<ILiveSession>('LiveSession', LiveSessionSchema);
