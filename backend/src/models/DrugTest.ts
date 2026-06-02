import mongoose, { Document, Schema } from 'mongoose';

export interface IDrugTest extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  testType: 'pre-employment' | 'random' | 'post-accident' | 'reasonable-cause' | 'return-to-duty' | 'follow-up';
  result: 'negative' | 'positive' | 'pending';
  testingCompany: string;
  clearinghouse: boolean;
  notes?: string;
  createdAt: Date;
}

const DrugTestSchema = new Schema<IDrugTest>(
  {
    userId:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date:           { type: String, required: true },
    testType:       { type: String, enum: ['pre-employment', 'random', 'post-accident', 'reasonable-cause', 'return-to-duty', 'follow-up'], required: true },
    result:         { type: String, enum: ['negative', 'positive', 'pending'], default: 'pending' },
    testingCompany: { type: String, required: true },
    clearinghouse:  { type: Boolean, default: false },
    notes:          { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IDrugTest>('DrugTest', DrugTestSchema);
