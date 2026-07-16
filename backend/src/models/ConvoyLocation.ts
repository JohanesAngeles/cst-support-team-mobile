import mongoose, { Document, Schema } from 'mongoose';

export interface IConvoyLocation extends Document {
  groupId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userAvatarUrl?: string;
  lat: number;
  lng: number;
  updatedAt: Date;
}

const ConvoyLocationSchema = new Schema<IConvoyLocation>({
  groupId:      { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName:     { type: String, required: true },
  userAvatarUrl:{ type: String },
  lat:          { type: Number, required: true, min: -90, max: 90 },
  lng:          { type: Number, required: true, min: -180, max: 180 },
  updatedAt:    { type: Date, default: Date.now },
});

ConvoyLocationSchema.index({ groupId: 1, userId: 1 }, { unique: true });

export default mongoose.model<IConvoyLocation>('ConvoyLocation', ConvoyLocationSchema);
