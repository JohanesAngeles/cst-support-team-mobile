import mongoose, { Document, Schema } from 'mongoose';

export interface IBrokerNote extends Document {
  userId: mongoose.Types.ObjectId;
  brokerName: string;
  mcNum: string;
  phone: string;
  paySpeed: number;
  communication: number;
  loadQuality: number;
  wouldUseAgain: boolean;
  notes: string;
}

const BrokerNoteSchema = new Schema<IBrokerNote>(
  {
    userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    brokerName:    { type: String, required: true },
    mcNum:         { type: String, default: '' },
    phone:         { type: String, default: '' },
    paySpeed:      { type: Number, min: 1, max: 5, default: 3 },
    communication: { type: Number, min: 1, max: 5, default: 3 },
    loadQuality:   { type: Number, min: 1, max: 5, default: 3 },
    wouldUseAgain: { type: Boolean, default: true },
    notes:         { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IBrokerNote>('BrokerNote', BrokerNoteSchema);
