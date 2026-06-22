import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export const DRIVER_STATUSES = [
  'rolling', 'loading', 'unloading', 'fuel_stop', 'parked',
  'breakdown', 'weather', 'dot_check', 'looking_for_freight', 'looking_for_driver',
] as const;
export type DriverStatus = typeof DRIVER_STATUSES[number];

export interface INotificationPreferences {
  pushNotifications: boolean;
  weeklyReport: boolean;
  dailyAlerts: boolean;
  hosReminders: boolean;
  fuelUpdates: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'driver' | 'admin' | 'partner';
  isVerified: boolean;
  verificationCode?: string;
  verificationExpires?: Date;
  resetCode?: string;
  resetExpires?: Date;
  phoneOtp?: string;
  phoneOtpExpires?: Date;
  isPhoneVerified?: boolean;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  bio?: string;
  truckType?: string;
  yearsDriving?: number;
  homeBase?: string;
  cdlClass?: 'A' | 'B' | 'C';
  currentStatus?: DriverStatus;
  currentStatusAt?: Date;
  lastActiveAt?: Date;
  stripeCustomerId?: string;
  subscriptionStatus?: 'free' | 'active' | 'cancelled' | 'past_due';
  subscriptionPlan?: 'monthly' | 'annual';
  subscriptionEnd?: Date;
  cashAppPending?: boolean;
  cashAppPendingPlan?: 'monthly' | 'annual';
  cashAppPendingAt?: Date;
  referralCode?: string;
  referredBy?: string;
  notificationPreferences?: INotificationPreferences;
  preferredLanguage?: string;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    phone:    { type: String, trim: true },
    role:     { type: String, enum: ['driver', 'admin', 'partner'], default: 'driver' },
    isVerified:          { type: Boolean, default: false },
    verificationCode:    { type: String, select: false },
    verificationExpires: { type: Date,   select: false },
    resetCode:           { type: String, select: false },
    resetExpires:        { type: Date,   select: false },
    phoneOtp:            { type: String, select: false },
    phoneOtpExpires:     { type: Date,   select: false },
    isPhoneVerified:     { type: Boolean, default: false },
    avatarUrl:           { type: String },
    coverPhotoUrl:       { type: String },
    bio:                 { type: String, maxlength: 280, trim: true },
    truckType:           { type: String, trim: true },
    yearsDriving:        { type: Number, min: 0 },
    homeBase:            { type: String, trim: true },
    cdlClass:            { type: String, enum: ['A', 'B', 'C'] },
    currentStatus:       { type: String, enum: DRIVER_STATUSES },
    currentStatusAt:     { type: Date },
    lastActiveAt:        { type: Date },
    stripeCustomerId:    { type: String },
    subscriptionStatus:  { type: String, enum: ['free', 'active', 'cancelled', 'past_due'], default: 'free' },
    subscriptionPlan:    { type: String, enum: ['monthly', 'annual'] },
    subscriptionEnd:     { type: Date },
    cashAppPending:      { type: Boolean, default: false },
    cashAppPendingPlan:  { type: String, enum: ['monthly', 'annual'] },
    cashAppPendingAt:    { type: Date },
    referralCode:        { type: String, unique: true, sparse: true },
    referredBy:          { type: String },
    notificationPreferences: {
      pushNotifications: { type: Boolean, default: true },
      weeklyReport:      { type: Boolean, default: true },
      dailyAlerts:       { type: Boolean, default: false },
      hosReminders:      { type: Boolean, default: true },
      fuelUpdates:       { type: Boolean, default: false },
    },
    preferredLanguage: { type: String, default: 'en' },
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
