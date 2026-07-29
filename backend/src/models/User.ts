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
  social: boolean;
  directMessages: boolean;
}

export interface IUser extends Document {
  name: string;
  username?: string;
  email: string;
  password: string;
  hasPassword?: boolean;
  phone?: string;
  role: 'driver' | 'admin' | 'partner';
  status?: 'active' | 'suspended' | 'banned';
  statusReason?: string;
  statusUpdatedAt?: Date;
  isVerified: boolean;
  isTopDriver?: boolean;
  cdlVerified?: boolean;
  cdlVerifiedAt?: Date;
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
  subscriptionSource?: 'stripe' | 'cashapp' | 'apple' | 'authorizenet';
  appleOriginalTransactionId?: string;
  cashAppPending?: boolean;
  cashAppPendingPlan?: 'monthly' | 'annual';
  cashAppPendingAt?: Date;
  authorizeNetCustomerProfileId?: string;
  authorizeNetPaymentProfileId?: string;
  authorizeNetSubscriptionId?: string;
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
    username: {
      type: String, unique: true, sparse: true, lowercase: true, trim: true,
      match: /^[a-z0-9_]{3,24}$/,
    },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    // false for accounts created via Google/Apple/phone sign-in, where the password
    // is an unusable placeholder the user never sees — lets deleteAccount skip the
    // password challenge for those users instead of locking them out of deletion.
    hasPassword: { type: Boolean, default: true },
    phone:    { type: String, trim: true },
    role:     { type: String, enum: ['driver', 'admin', 'partner'], default: 'driver' },
    status:          { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
    statusReason:    { type: String, trim: true },
    statusUpdatedAt: { type: Date },
    isVerified:          { type: Boolean, default: false },
    isTopDriver:         { type: Boolean, default: false },
    cdlVerified:         { type: Boolean, default: false },
    cdlVerifiedAt:       { type: Date },
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
    subscriptionSource:  { type: String, enum: ['stripe', 'cashapp', 'apple', 'authorizenet'] },
    appleOriginalTransactionId: { type: String },
    cashAppPending:      { type: Boolean, default: false },
    cashAppPendingPlan:  { type: String, enum: ['monthly', 'annual'] },
    cashAppPendingAt:    { type: Date },
    authorizeNetCustomerProfileId: { type: String },
    authorizeNetPaymentProfileId:  { type: String },
    authorizeNetSubscriptionId:    { type: String },
    referralCode:        { type: String, unique: true, sparse: true },
    referredBy:          { type: String },
    notificationPreferences: {
      pushNotifications: { type: Boolean, default: true },
      weeklyReport:      { type: Boolean, default: true },
      dailyAlerts:       { type: Boolean, default: false },
      hosReminders:      { type: Boolean, default: true },
      fuelUpdates:       { type: Boolean, default: false },
      social:            { type: Boolean, default: true },
      directMessages:    { type: Boolean, default: true },
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
