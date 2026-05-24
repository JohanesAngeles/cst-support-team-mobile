import mongoose, { Document, Schema } from 'mongoose';

export interface IEmergencyContact extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  relationship: string;
}

const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name:         { type: String, required: true },
    phone:        { type: String, required: true },
    relationship: { type: String, default: 'Other' },
  },
  { timestamps: true }
);

export default mongoose.model<IEmergencyContact>('EmergencyContact', EmergencyContactSchema);
