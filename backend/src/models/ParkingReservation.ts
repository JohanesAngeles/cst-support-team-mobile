import mongoose, { Document, Schema } from 'mongoose';

export interface IParkingReservation extends Document {
  userId: mongoose.Types.ObjectId;
  location: string;
  date: string;
  confirmationNumber: string;
  arrivalWindow?: string;
  notes?: string;
  status: 'upcoming' | 'used' | 'cancelled';
  createdAt: Date;
}

const ParkingReservationSchema = new Schema<IParkingReservation>(
  {
    userId:             { type: Schema.Types.ObjectId, ref: 'User', required: true },
    location:           { type: String, required: true },
    date:               { type: String, required: true },
    confirmationNumber: { type: String, required: true },
    arrivalWindow:      { type: String },
    notes:              { type: String },
    status:             { type: String, enum: ['upcoming', 'used', 'cancelled'], default: 'upcoming' },
  },
  { timestamps: true }
);

export default mongoose.model<IParkingReservation>('ParkingReservation', ParkingReservationSchema);
