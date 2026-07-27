import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface ICelebrity extends Document {
  name: string;
  email: string;
  password: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  plans: ('monthly' | 'annual')[];
  active: boolean;
  expiresAt?: Date | null;
  maxRedemptions?: number | null;
  redemptionCount: number;
  stripeCouponId?: string | null;
  createdByLabel?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const CelebritySchema = new Schema<ICelebrity>(
  {
    name:              { type: String, required: true, trim: true },
    email:             { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:          { type: String, required: true },
    code:              { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType:      { type: String, enum: ['percent', 'fixed'], required: true },
    discountValue: {
      type: Number,
      required: true,
      validate: {
        // Prevents e.g. a 150%-off code from silently reaching Stripe (percent_off
        // must be 1-100) or a zero/negative fixed discount from being created.
        validator: function (this: any, v: number) {
          return this.discountType === 'percent' ? v > 0 && v <= 100 : v > 0;
        },
        message: 'discountValue must be between 1 and 100 for percent discounts, or a positive number of cents for fixed discounts.',
      },
    },
    plans: {
      type: [String],
      enum: ['monthly', 'annual'],
      default: ['monthly', 'annual'],
      validate: { validator: (v: string[]) => v.length > 0, message: 'At least one plan must be selected.' },
    },
    active:            { type: Boolean, default: true },
    expiresAt:         { type: Date, default: null },
    maxRedemptions:    { type: Number, default: null, min: 1 },
    redemptionCount:   { type: Number, default: 0 },
    stripeCouponId:    { type: String, default: null },
    createdByLabel:    { type: String, trim: true },
  },
  { timestamps: true }
);

CelebritySchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

CelebritySchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model<ICelebrity>('Celebrity', CelebritySchema);
