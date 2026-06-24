import mongoose, { Document, Schema } from 'mongoose';

export interface ILoadBoardPost extends Document {
  postedBy: mongoose.Types.ObjectId;
  postedByName: string;
  equipmentType: string;
  originCity: string;
  originState: string;
  destCity: string;
  destState: string;
  rate: number;
  miles?: number;
  weight?: number;
  commodity?: string;
  pickupDate?: Date;
  notes?: string;
  contactPhone?: string;
  status: 'open' | 'covered';
  createdAt: Date;
}

const LoadBoardPostSchema = new Schema<ILoadBoardPost>(
  {
    postedBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    postedByName: { type: String, required: true },
    equipmentType:{ type: String, required: true, trim: true },
    originCity:   { type: String, required: true, trim: true },
    originState:  { type: String, required: true, trim: true },
    destCity:     { type: String, required: true, trim: true },
    destState:    { type: String, required: true, trim: true },
    rate:         { type: Number, required: true },
    miles:        { type: Number },
    weight:       { type: Number },
    commodity:    { type: String, trim: true },
    pickupDate:   { type: Date },
    notes:        { type: String, maxlength: 500 },
    contactPhone: { type: String, trim: true },
    status:       { type: String, enum: ['open', 'covered'], default: 'open' },
  },
  { timestamps: true }
);

export default mongoose.model<ILoadBoardPost>('LoadBoardPost', LoadBoardPostSchema);
