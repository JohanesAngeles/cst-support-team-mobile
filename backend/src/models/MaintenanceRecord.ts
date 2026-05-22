import mongoose, { Document, Schema } from 'mongoose';

export interface IMaintenanceRecord extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  icon: string;
  lastDate: string;
  nextDate: string;
  lastMiles: number;
  intervalMiles: number;
}

const MaintenanceRecordSchema = new Schema<IMaintenanceRecord>(
  { userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, name: { type: String, required: true }, icon: { type: String, default: 'construct-outline' }, lastDate: { type: String, required: true }, nextDate: { type: String, required: true }, lastMiles: { type: Number, default: 0 }, intervalMiles: { type: Number, default: 10000 } },
  { timestamps: true }
);

export default mongoose.model<IMaintenanceRecord>('MaintenanceRecord', MaintenanceRecordSchema);
