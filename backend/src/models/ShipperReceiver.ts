import mongoose, { Document, Schema } from 'mongoose';

export interface IShipperReceiver extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  type: 'shipper' | 'receiver' | 'both';
  address: string;
  city: string;
  state: string;
  phone?: string;
  contact?: string;
  hours?: string;
  appointmentRequired: boolean;
  dockInfo?: string;
  notes?: string;
  isFavorite: boolean;
  createdAt: Date;
}

const ShipperReceiverSchema = new Schema<IShipperReceiver>(
  {
    userId:              { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name:                { type: String, required: true },
    type:                { type: String, enum: ['shipper', 'receiver', 'both'], required: true },
    address:             { type: String, required: true },
    city:                { type: String, required: true },
    state:               { type: String, required: true },
    phone:               { type: String },
    contact:             { type: String },
    hours:               { type: String },
    appointmentRequired: { type: Boolean, default: false },
    dockInfo:            { type: String },
    notes:               { type: String },
    isFavorite:          { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IShipperReceiver>('ShipperReceiver', ShipperReceiverSchema);
