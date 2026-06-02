import mongoose, { Document, Schema } from 'mongoose';

export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId;
  category: string;
  amount: number;
  description: string;
  tripId?: mongoose.Types.ObjectId;
  receiptUrl?: string;
  createdAt: Date;
}

const ExpenseSchema = new Schema(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category:    { type: String, required: true },
    amount:      { type: Number, required: true },
    description: { type: String, default: '' },
    tripId:      { type: Schema.Types.ObjectId, ref: 'TripLog', default: null },
    receiptUrl:  { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IExpense>('Expense', ExpenseSchema);
