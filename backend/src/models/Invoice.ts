import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoice extends Document {
  userId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  billTo: { name: string; address?: string; email?: string; phone?: string };
  services: { description: string; quantity: number; rate: number; amount: number }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid';
  paidAt?: string;
  loadRef?: string;
  notes?: string;
  createdAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invoiceNumber: { type: String, required: true },
    date:          { type: String, required: true },
    dueDate:       { type: String, required: true },
    billTo: {
      name:    { type: String, required: true },
      address: { type: String },
      email:   { type: String },
      phone:   { type: String },
    },
    services: [{
      description: { type: String, required: true },
      quantity:    { type: Number, required: true },
      rate:        { type: Number, required: true },
      amount:      { type: Number, required: true },
    }],
    subtotal:  { type: Number, required: true },
    taxRate:   { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total:     { type: Number, required: true },
    status:    { type: String, enum: ['draft', 'sent', 'paid'], default: 'draft' },
    paidAt:    { type: String },
    loadRef:   { type: String },
    notes:     { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
