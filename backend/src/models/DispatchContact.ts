import mongoose, { Document, Schema } from 'mongoose';

export type ContactRole = 'dispatcher' | 'broker' | 'shipper' | 'consignee' | 'other';

export interface IDispatchContact extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  company?: string;
  role: ContactRole;
  phone?: string;
  email?: string;
  mcNumber?: string;
  notes?: string;
  isFavorite: boolean;
  createdAt: Date;
}

const DispatchContactSchema = new Schema<IDispatchContact>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name:       { type: String, required: true, trim: true, maxlength: 100 },
    company:    { type: String, trim: true },
    role:       { type: String, enum: ['dispatcher', 'broker', 'shipper', 'consignee', 'other'], default: 'other' },
    phone:      { type: String },
    email:      { type: String },
    mcNumber:   { type: String },
    notes:      { type: String, maxlength: 500 },
    isFavorite: { type: Boolean, default: false },
  },
  { timestamps: true }
);

DispatchContactSchema.index({ userId: 1, isFavorite: -1 });

export default mongoose.model<IDispatchContact>('DispatchContact', DispatchContactSchema);
