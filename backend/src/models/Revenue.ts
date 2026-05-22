import mongoose, { Document, Schema } from 'mongoose';

interface ExpenseItem {
  label: string;
  amount: number;
  color: string;
}

export interface IRevenue extends Document {
  userId: mongoose.Types.ObjectId;
  period: 'Week' | 'Month' | 'Quarter' | 'Year';
  grossRevenue: number;
  netProfit: number;
  totalMiles: number;
  fuelCost: number;
  expenses: ExpenseItem[];
  trend: number[];
}

const ExpenseItemSchema = new Schema<ExpenseItem>(
  { label: String, amount: Number, color: String },
  { _id: false }
);

const RevenueSchema = new Schema<IRevenue>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    period: { type: String, enum: ['Week', 'Month', 'Quarter', 'Year'], required: true },
    grossRevenue: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },
    totalMiles: { type: Number, default: 0 },
    fuelCost: { type: Number, default: 0 },
    expenses: { type: [ExpenseItemSchema], default: [] },
    trend: { type: [Number], default: [] },
  },
  { timestamps: true }
);

RevenueSchema.index({ userId: 1, period: 1 }, { unique: true });

export default mongoose.model<IRevenue>('Revenue', RevenueSchema);
