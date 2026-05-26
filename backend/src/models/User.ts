import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'driver' | 'admin';
  isVerified: boolean;
  verificationCode?: string;
  verificationExpires?: Date;
  resetCode?: string;
  resetExpires?: Date;
  stripeCustomerId?: string;
  subscriptionStatus?: 'free' | 'active' | 'cancelled' | 'past_due';
  subscriptionPlan?: 'monthly' | 'annual';
  subscriptionEnd?: Date;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    phone:    { type: String, trim: true },
    role:     { type: String, enum: ['driver', 'admin'], default: 'driver' },
    isVerified:          { type: Boolean, default: false },
    verificationCode:    { type: String, select: false },
    verificationExpires: { type: Date,   select: false },
    resetCode:           { type: String, select: false },
    resetExpires:        { type: Date,   select: false },
    stripeCustomerId:    { type: String },
    subscriptionStatus:  { type: String, enum: ['free', 'active', 'cancelled', 'past_due'], default: 'free' },
    subscriptionPlan:    { type: String, enum: ['monthly', 'annual'] },
    subscriptionEnd:     { type: Date },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
