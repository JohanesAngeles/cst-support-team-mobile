import mongoose, { Document, Schema } from 'mongoose';

export interface ITruckProfile extends Document {
  userId: mongoose.Types.ObjectId;
  nickname: string;
  make: string;
  model: string;
  truckYear: number;
  vin: string;
  plate: string;
  mcNumber: string;
  dotNumber: string;
  insuranceExpiry: string;
  currentMileage: number;
  mpg: number;
  cheapestFuelPrice: number;
  idleHours: number;
  fuelCardConnected: boolean;
}

const TruckProfileSchema = new Schema<ITruckProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    nickname: { type: String, default: '' },
    make: { type: String, default: '' },
    model: { type: String, default: '' },
    truckYear: { type: Number, default: 0 },
    vin: { type: String, default: '' },
    plate: { type: String, default: '' },
    mcNumber: { type: String, default: '' },
    dotNumber: { type: String, default: '' },
    insuranceExpiry: { type: String, default: '' },
    currentMileage: { type: Number, default: 0 },
    mpg: { type: Number, default: 0 },
    cheapestFuelPrice: { type: Number, default: 0 },
    idleHours: { type: Number, default: 0 },
    fuelCardConnected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<ITruckProfile>('TruckProfile', TruckProfileSchema);
