import mongoose, { Document, Schema } from 'mongoose';

export interface ITruckProfile extends Document {
  userId: mongoose.Types.ObjectId;
  currentMileage: number;
  mpg: number;
  cheapestFuelPrice: number;
  idleHours: number;
  fuelCardConnected: boolean;
}

const TruckProfileSchema = new Schema<ITruckProfile>(
  { userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, currentMileage: { type: Number, default: 0 }, mpg: { type: Number, default: 0 }, cheapestFuelPrice: { type: Number, default: 0 }, idleHours: { type: Number, default: 0 }, fuelCardConnected: { type: Boolean, default: false } },
  { timestamps: true }
);

export default mongoose.model<ITruckProfile>('TruckProfile', TruckProfileSchema);
