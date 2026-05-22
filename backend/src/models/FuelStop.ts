import mongoose, { Document, Schema } from 'mongoose';

export interface IFuelStop extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  location: string;
  state: string;
  gallons: number;
  pricePerGallon: number;
  odometer: number;
  notes: string;
}

const FuelStopSchema = new Schema<IFuelStop>(
  {
    userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date:          { type: String, required: true },
    location:      { type: String, required: true },
    state:         { type: String, required: true },
    gallons:       { type: Number, required: true, min: 0 },
    pricePerGallon:{ type: Number, required: true, min: 0 },
    odometer:      { type: Number, default: 0 },
    notes:         { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IFuelStop>('FuelStop', FuelStopSchema);
