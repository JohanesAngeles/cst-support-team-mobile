import mongoose, { Document, Schema } from 'mongoose';

export type ReportType = 'truck_stop' | 'hazard' | 'weigh_station' | 'parking' | 'fuel';

export interface IMapReport extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  type: ReportType;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  // type-specific fields
  fuelPrice?: number;       // fuel: price per gallon
  fuelStation?: string;     // fuel: station name
  isOpen?: boolean;         // weigh_station: open or closed
  waitMinutes?: number;     // weigh_station: estimated wait
  rating?: number;          // truck_stop: 1–5 stars
  amenities?: string[];     // truck_stop: ['showers', 'restaurant', 'scales', ...]
  hazardType?: string;      // hazard: 'construction' | 'accident' | 'low_bridge' | 'rough_road' | 'other'
  parkingSpots?: number;    // parking: estimated available spots
  upvotes: number;
  upvotedBy: mongoose.Types.ObjectId[];
  expiresAt?: Date;
  createdAt: Date;
}

const MapReportSchema = new Schema<IMapReport>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName:     { type: String, required: true },
    type:         { type: String, enum: ['truck_stop', 'hazard', 'weigh_station', 'parking', 'fuel'], required: true },
    lat:          { type: Number, required: true },
    lng:          { type: Number, required: true },
    title:        { type: String, required: true, trim: true, maxlength: 100 },
    description:  { type: String, trim: true, maxlength: 500 },
    fuelPrice:    { type: Number },
    fuelStation:  { type: String },
    isOpen:       { type: Boolean },
    waitMinutes:  { type: Number },
    rating:       { type: Number, min: 1, max: 5 },
    amenities:    [{ type: String }],
    hazardType:   { type: String },
    parkingSpots: { type: Number },
    upvotes:      { type: Number, default: 0 },
    upvotedBy:    [{ type: Schema.Types.ObjectId, ref: 'User' }],
    expiresAt:    { type: Date },
  },
  { timestamps: true }
);

// Geo index for proximity queries
MapReportSchema.index({ lat: 1, lng: 1 });
MapReportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IMapReport>('MapReport', MapReportSchema);
