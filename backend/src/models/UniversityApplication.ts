import mongoose, { Document, Schema } from 'mongoose';

export interface IUniversityApplication extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  truckType?: string;
  yearsDriving?: number;
  cdlClass?: 'A' | 'B' | 'C';
  goals: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

const UniversityApplicationSchema = new Schema<IUniversityApplication>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, lowercase: true, trim: true },
    phone:        { type: String, required: true, trim: true },
    truckType:    { type: String, trim: true },
    yearsDriving: { type: Number },
    cdlClass:     { type: String, enum: ['A', 'B', 'C'] },
    goals:        { type: String, required: true, trim: true },
    status:       { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

UniversityApplicationSchema.index({ userId: 1 });

export default mongoose.model<IUniversityApplication>('UniversityApplication', UniversityApplicationSchema);
