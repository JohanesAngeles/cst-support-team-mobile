import mongoose, { Document, Schema } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description?: string;
  avatarUrl?: string;
  creatorId: mongoose.Types.ObjectId;
  creatorName: string;
  members: mongoose.Types.ObjectId[];
  type: 'crew' | 'convoy';
  originCity?: string;
  destinationCity?: string;
  departureAt?: Date;
  createdAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name:        { type: String, required: true, maxlength: 80 },
    description: { type: String, maxlength: 500 },
    avatarUrl:   { type: String },
    creatorId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    creatorName: { type: String, required: true },
    members:     [{ type: Schema.Types.ObjectId, ref: 'User' }],
    type:        { type: String, enum: ['crew', 'convoy'], default: 'crew', index: true },
    originCity:      { type: String, maxlength: 80 },
    destinationCity: { type: String, maxlength: 80 },
    departureAt:     { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IGroup>('Group', GroupSchema);
