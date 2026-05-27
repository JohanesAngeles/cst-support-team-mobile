import mongoose, { Document, Schema } from 'mongoose';

export type LoadStatus = 'booked' | 'in_transit' | 'delivered' | 'invoiced' | 'paid';

export interface ILoad extends Document {
  userId: mongoose.Types.ObjectId;
  loadNumber?: string;
  broker: { name: string; mc?: string; phone?: string; email?: string };
  shipper: { name: string; city: string; state: string; address?: string; date?: string; time?: string };
  consignee: { name: string; city: string; state: string; address?: string; date?: string; time?: string };
  commodity?: string;
  weight?: number;
  miles?: number;
  rate: number;
  ratePerMile?: number;
  status: LoadStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const partySchema = {
  name:    { type: String, required: true },
  city:    { type: String, required: true },
  state:   { type: String, required: true },
  address: { type: String },
  date:    { type: String },
  time:    { type: String },
};

const LoadSchema = new Schema<ILoad>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    loadNumber: { type: String, trim: true },
    broker: {
      name:  { type: String, required: true, trim: true },
      mc:    { type: String },
      phone: { type: String },
      email: { type: String },
    },
    shipper:   partySchema,
    consignee: partySchema,
    commodity: { type: String },
    weight:    { type: Number },
    miles:     { type: Number },
    rate:      { type: Number, required: true },
    ratePerMile: { type: Number },
    status:    { type: String, enum: ['booked', 'in_transit', 'delivered', 'invoiced', 'paid'], default: 'booked' },
    notes:     { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

LoadSchema.index({ userId: 1, status: 1 });

export default mongoose.model<ILoad>('Load', LoadSchema);
