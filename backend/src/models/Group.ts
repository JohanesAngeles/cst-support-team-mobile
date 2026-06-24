import mongoose, { Document, Schema } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description?: string;
  avatarUrl?: string;
  creatorId: mongoose.Types.ObjectId;
  creatorName: string;
  members: mongoose.Types.ObjectId[];
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
  },
  { timestamps: true }
);

export default mongoose.model<IGroup>('Group', GroupSchema);
