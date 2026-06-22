import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { validationResult } from 'express-validator';
import User, { DRIVER_STATUSES } from '../models/User';
import Follow from '../models/Follow';
import { AuthRequest } from '../middleware/auth';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';
import { upload, uploadToCloudinary } from '../middleware/upload';

// Lazy-init Twilio client so missing credentials don't crash the server
function getTwilioClient() {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('Twilio credentials not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('twilio')(sid, token);
}

const signToken = (id: string) =>
  jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  } as jwt.SignOptions);

const makeCode = () => crypto.randomInt(100000, 999999).toString();

export const safeUser = async (user: any) => {
  const [followersCount, followingCount] = await Promise.all([
    Follow.countDocuments({ followingId: user._id }),
    Follow.countDocuments({ followerId: user._id }),
  ]);
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role ?? 'driver',
    isVerified: user.isVerified,
    avatarUrl: user.avatarUrl ?? null,
    coverPhotoUrl: user.coverPhotoUrl ?? null,
    bio: user.bio ?? null,
    truckType: user.truckType ?? null,
    yearsDriving: user.yearsDriving ?? null,
    homeBase: user.homeBase ?? null,
    cdlClass: user.cdlClass ?? null,
    currentStatus: user.currentStatus ?? null,
    currentStatusAt: user.currentStatusAt ?? null,
    followersCount,
    followingCount,
    subscriptionStatus: user.subscriptionStatus ?? 'free',
    subscriptionPlan: user.subscriptionPlan ?? null,
    notificationPreferences: user.notificationPreferences ?? null,
    preferredLanguage: user.preferredLanguage ?? 'en',
  };
};

export const register = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ message: errors.array()[0].msg }); return; }

  const { name, email, password, phone } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) { res.status(400).json({ message: 'Email already registered' }); return; }

    const user = await User.create({ name, email, password, phone, isVerified: true });

    const token = signToken(user._id.toString());
    res.status(201).json({ token, user: await safeUser(user) });
  } catch {
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ message: errors.array()[0].msg }); return; }

  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ message: 'Invalid email or password' }); return;
    }
    const token = signToken(user._id.toString());
    res.json({ token, user: await safeUser(user) });
  } catch {
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  res.json({ user: await safeUser(req.user) });
};

export const verifyEmail = async (req: AuthRequest, res: Response) => {
  const { code } = req.body;
  if (!code) { res.status(400).json({ message: 'Code is required' }); return; }

  const user = await User.findById(req.user._id).select('+verificationCode +verificationExpires');
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }
  if (user.isVerified) { res.json({ message: 'Already verified' }); return; }
  if (!user.verificationCode || user.verificationCode !== code.toString()) {
    res.status(400).json({ message: 'Invalid code' }); return;
  }
  if (user.verificationExpires && user.verificationExpires < new Date()) {
    res.status(400).json({ message: 'Code expired. Request a new one.' }); return;
  }

  user.isVerified = true;
  user.verificationCode = undefined;
  user.verificationExpires = undefined;
  await user.save();
  res.json({ message: 'Email verified', user: await safeUser(user) });
};

export const resendVerification = async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user._id);
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }
  if (user.isVerified) { res.json({ message: 'Already verified' }); return; }

  const code = makeCode();
  user.verificationCode = code;
  user.verificationExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  await sendVerificationEmail(user.email, user.name, code);
  res.json({ message: 'Verification code sent' });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ message: 'Email is required' }); return; }

  const user = await User.findOne({ email: email.toLowerCase() });
  // Always return success to prevent email enumeration
  if (!user) { res.json({ message: 'If that email exists, a code was sent.' }); return; }

  const code = makeCode();
  user.resetCode = code;
  user.resetExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  await sendPasswordResetEmail(user.email, user.name, code);
  res.json({ message: 'If that email exists, a code was sent.' });
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) { res.status(400).json({ message: 'email, code, and newPassword are required' }); return; }
  if (newPassword.length < 8) { res.status(400).json({ message: 'Password must be at least 8 characters' }); return; }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+resetCode +resetExpires');
  if (!user || !user.resetCode || user.resetCode !== code.toString()) {
    res.status(400).json({ message: 'Invalid or expired code' }); return;
  }
  if (user.resetExpires && user.resetExpires < new Date()) {
    res.status(400).json({ message: 'Code expired. Request a new one.' }); return;
  }

  user.password = newPassword;
  user.resetCode = undefined;
  user.resetExpires = undefined;
  await user.save();
  res.json({ message: 'Password updated successfully' });
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const { name, phone, bio, truckType, yearsDriving, homeBase, cdlClass } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }

  if (name?.trim()) user.name = name.trim();
  if (phone !== undefined) user.phone = phone.trim() || undefined;
  if (bio !== undefined) user.bio = bio.trim().slice(0, 280) || undefined;
  if (truckType !== undefined) user.truckType = truckType.trim() || undefined;
  if (homeBase !== undefined) user.homeBase = homeBase.trim() || undefined;
  if (yearsDriving !== undefined) user.yearsDriving = yearsDriving === '' || yearsDriving === null ? undefined : Number(yearsDriving);
  if (cdlClass !== undefined) user.cdlClass = ['A', 'B', 'C'].includes(cdlClass) ? cdlClass : undefined;
  await user.save();
  res.json({ user: await safeUser(user) });
};

// Read-only profile of another driver — only public-facing fields, no email/subscription/preferences
export const getPublicProfile = async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }

  const [followersCount, followingCount, isFollowing] = await Promise.all([
    Follow.countDocuments({ followingId: user._id }),
    Follow.countDocuments({ followerId: user._id }),
    Follow.exists({ followerId: req.user._id, followingId: user._id }),
  ]);

  res.json({
    user: {
      _id: user._id,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
      coverPhotoUrl: user.coverPhotoUrl ?? null,
      bio: user.bio ?? null,
      truckType: user.truckType ?? null,
      yearsDriving: user.yearsDriving ?? null,
      homeBase: user.homeBase ?? null,
      cdlClass: user.cdlClass ?? null,
      currentStatus: user.currentStatus ?? null,
      currentStatusAt: user.currentStatusAt ?? null,
      role: user.role ?? 'driver',
      followersCount,
      followingCount,
      isFollowing: !!isFollowing,
    },
  });
};

export const updateStatus = async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  if (status !== null && !DRIVER_STATUSES.includes(status)) {
    res.status(400).json({ message: 'Invalid status' }); return;
  }
  const user = await User.findById(req.user._id);
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }
  user.currentStatus = status ?? undefined;
  user.currentStatusAt = status ? new Date() : undefined;
  await user.save();
  res.json({ user: await safeUser(user) });
};

// Drivers active in the last 15 minutes, most recent first
export const getActiveNow = async (req: AuthRequest, res: Response) => {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  const users = await User.find({ _id: { $ne: req.user._id }, lastActiveAt: { $gte: cutoff } })
    .sort({ lastActiveAt: -1 })
    .limit(20);
  res.json({
    users: users.map(u => ({
      _id: u._id,
      name: u.name,
      avatarUrl: u.avatarUrl ?? null,
      homeBase: u.homeBase ?? null,
      currentStatus: u.currentStatus ?? null,
      lastActiveAt: u.lastActiveAt,
    })),
  });
};

// Toggle following another driver
export const toggleFollow = async (req: AuthRequest, res: Response) => {
  const targetId = req.params.id as string;
  if (targetId === req.user._id.toString()) { res.status(400).json({ message: "You can't follow yourself" }); return; }

  const target = await User.findById(targetId);
  if (!target) { res.status(404).json({ message: 'User not found' }); return; }

  const existing = await Follow.findOne({ followerId: req.user._id, followingId: targetId });
  if (existing) {
    await existing.deleteOne();
  } else {
    await Follow.create({ followerId: req.user._id, followingId: targetId });
  }

  const [followersCount, followingCount] = await Promise.all([
    Follow.countDocuments({ followingId: targetId }),
    Follow.countDocuments({ followerId: targetId }),
  ]);
  res.json({ isFollowing: !existing, followersCount, followingCount });
};

export const getFollowers = async (req: AuthRequest, res: Response) => {
  const follows = await Follow.find({ followingId: req.params.id }).sort({ createdAt: -1 }).limit(200);
  const users = await User.find({ _id: { $in: follows.map(f => f.followerId) } });
  res.json({ users: users.map(u => ({ _id: u._id, name: u.name, avatarUrl: u.avatarUrl ?? null, truckType: u.truckType ?? null })) });
};

export const getFollowing = async (req: AuthRequest, res: Response) => {
  const follows = await Follow.find({ followerId: req.params.id }).sort({ createdAt: -1 }).limit(200);
  const users = await User.find({ _id: { $in: follows.map(f => f.followingId) } });
  res.json({ users: users.map(u => ({ _id: u._id, name: u.name, avatarUrl: u.avatarUrl ?? null, truckType: u.truckType ?? null })) });
};

export const updatePreferences = async (req: AuthRequest, res: Response) => {
  const { notificationPreferences, preferredLanguage } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }

  if (notificationPreferences && typeof notificationPreferences === 'object') {
    user.notificationPreferences = {
      pushNotifications: notificationPreferences.pushNotifications ?? true,
      weeklyReport:      notificationPreferences.weeklyReport      ?? true,
      dailyAlerts:       notificationPreferences.dailyAlerts       ?? false,
      hosReminders:      notificationPreferences.hosReminders      ?? true,
      fuelUpdates:       notificationPreferences.fuelUpdates       ?? false,
    };
  }
  if (typeof preferredLanguage === 'string' && preferredLanguage.length === 2) {
    user.preferredLanguage = preferredLanguage;
  }
  await user.save();
  res.json({ user: await safeUser(user) });
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) { res.status(400).json({ message: 'Both passwords are required' }); return; }
  if (newPassword.length < 8) { res.status(400).json({ message: 'New password must be at least 8 characters' }); return; }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }
  if (!(await user.comparePassword(currentPassword))) {
    res.status(400).json({ message: 'Current password is incorrect' }); return;
  }

  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password changed successfully' });
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  const { password } = req.body;
  if (!password) { res.status(400).json({ message: 'Password is required to delete your account' }); return; }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }

  // Verify password before destructive action
  const valid = await user.comparePassword(password);
  if (!valid) { res.status(400).json({ message: 'Incorrect password' }); return; }

  const uid = req.user._id;

  // Parallel wipe of all user data across every collection
  const [
    Expense, IFTAEntry, MaintenanceRecord, Deadline, Revenue, HOSEntry,
    DetentionEvent, TripLog, FuelStop, BrokerNote, TruckProfile, UserDocument,
    EmergencyContact, PushToken, MapReport, Load, DispatchContact, ELDEntry,
    DVIREntry, Invoice, DrugTest, BrokerBlacklist, NetworkPost, ParkingReservation,
    SleepLog, ShipperReceiver, Referral, RoadReadyScore, CDLDoc, CargoClaim, ChatMessage,
    DirectMessage, NewsItem,
  ] = await Promise.all([
    import('../models/Expense'),
    import('../models/IFTAEntry'),
    import('../models/MaintenanceRecord'),
    import('../models/Deadline'),
    import('../models/Revenue'),
    import('../models/HOSEntry'),
    import('../models/DetentionEvent'),
    import('../models/TripLog'),
    import('../models/FuelStop'),
    import('../models/BrokerNote'),
    import('../models/TruckProfile'),
    import('../models/UserDocument'),
    import('../models/EmergencyContact'),
    import('../models/PushToken'),
    import('../models/MapReport'),
    import('../models/Load'),
    import('../models/DispatchContact'),
    import('../models/ELDEntry'),
    import('../models/DVIREntry'),
    import('../models/Invoice'),
    import('../models/DrugTest'),
    import('../models/BrokerBlacklist'),
    import('../models/NetworkPost'),
    import('../models/ParkingReservation'),
    import('../models/SleepLog'),
    import('../models/ShipperReceiver'),
    import('../models/Referral'),
    import('../models/RoadReadyScore'),
    import('../models/CDLDoc'),
    import('../models/CargoClaim'),
    import('../models/ChatMessage'),
    import('../models/DirectMessage'),
    import('../models/NewsItem'),
  ]);

  await Promise.all([
    Expense.default.deleteMany({ userId: uid }),
    IFTAEntry.default.deleteMany({ userId: uid }),
    MaintenanceRecord.default.deleteMany({ userId: uid }),
    Deadline.default.deleteMany({ userId: uid }),
    Revenue.default.deleteMany({ userId: uid }),
    HOSEntry.default.deleteMany({ userId: uid }),
    DetentionEvent.default.deleteMany({ userId: uid }),
    TripLog.default.deleteMany({ userId: uid }),
    FuelStop.default.deleteMany({ userId: uid }),
    BrokerNote.default.deleteMany({ userId: uid }),
    TruckProfile.default.deleteMany({ userId: uid }),
    UserDocument.default.deleteMany({ userId: uid }),
    EmergencyContact.default.deleteMany({ userId: uid }),
    PushToken.default.deleteMany({ userId: uid }),
    MapReport.default.deleteMany({ userId: uid }),
    Load.default.deleteMany({ userId: uid }),
    DispatchContact.default.deleteMany({ userId: uid }),
    ELDEntry.default.deleteMany({ userId: uid }),
    DVIREntry.default.deleteMany({ userId: uid }),
    Invoice.default.deleteMany({ userId: uid }),
    DrugTest.default.deleteMany({ userId: uid }),
    BrokerBlacklist.default.deleteMany({ userId: uid }),
    NetworkPost.default.deleteMany({ authorId: uid }),
    ParkingReservation.default.deleteMany({ userId: uid }),
    SleepLog.default.deleteMany({ userId: uid }),
    ShipperReceiver.default.deleteMany({ userId: uid }),
    Referral.default.deleteMany({ userId: uid }),
    RoadReadyScore.default.deleteMany({ userId: uid }),
    CDLDoc.default.deleteMany({ userId: uid }),
    CargoClaim.default.deleteMany({ userId: uid }),
    ChatMessage.default.deleteMany({ senderId: uid }),
    DirectMessage.default.deleteMany({ $or: [{ senderId: uid }, { recipientId: uid }] }),
    NewsItem.default.deleteMany({ authorId: uid }),
    Follow.deleteMany({ $or: [{ followerId: uid }, { followingId: uid }] }),
    User.deleteOne({ _id: uid }),
  ]);

  res.json({ message: 'Account and all associated data deleted' });
};

// ─── Phone OTP ────────────────────────────────────────────────────────────────

export const sendPhoneOTP = async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) { res.status(400).json({ message: 'Phone number is required' }); return; }

  const otp     = makeCode();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  try {
    const client = getTwilioClient();
    const from   = process.env.TWILIO_PHONE_NUMBER;
    if (!from) { res.status(500).json({ message: 'TWILIO_PHONE_NUMBER not configured' }); return; }

    await client.messages.create({
      body: `Your CST verification code is: ${otp}`,
      from,
      to: phone,
    });

    // Upsert by phone — create a placeholder user if one doesn't exist yet
    await User.findOneAndUpdate(
      { phone },
      { phone, phoneOtp: otp, phoneOtpExpires: expires },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ message: 'OTP sent' });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Failed to send OTP' });
  }
};

export const verifyPhoneOTP = async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) { res.status(400).json({ message: 'Phone and OTP are required' }); return; }

  try {
    const user = await User.findOne({ phone }).select('+phoneOtp +phoneOtpExpires');
    if (!user) { res.status(404).json({ message: 'Phone number not found' }); return; }
    if (!user.phoneOtp || user.phoneOtp !== otp) {
      res.status(400).json({ message: 'Invalid OTP code' }); return;
    }
    if (!user.phoneOtpExpires || user.phoneOtpExpires < new Date()) {
      res.status(400).json({ message: 'OTP has expired. Request a new one.' }); return;
    }

    user.phoneOtp        = undefined;
    user.phoneOtpExpires = undefined;
    user.isPhoneVerified = true;
    if (!user.isVerified) user.isVerified = true;
    await user.save();

    const token = signToken(user._id.toString());
    res.json({ token, user: await safeUser(user) });
  } catch (err: any) {
    res.status(500).json({ message: err.message ?? 'Server error' });
  }
};

// Avatar upload — multipart/form-data field name "avatar"
export const updateAvatarMiddleware = upload.single('avatar');

export const updateAvatar = async (req: AuthRequest, res: Response) => {
  if (!req.file) { res.status(400).json({ message: 'No image provided' }); return; }
  if (!req.file.mimetype.startsWith('image/')) {
    res.status(400).json({ message: 'Only image files are allowed' }); return;
  }

  const user = await User.findById(req.user._id);
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }

  try {
    const result = await uploadToCloudinary(req.file.buffer, 'cst-avatars', req.file.mimetype);
    user.avatarUrl = result.url;
    await user.save();
    res.json({ user: await safeUser(user) });
  } catch {
    res.status(500).json({ message: 'Upload failed — check Cloudinary credentials' });
  }
};

// Cover photo upload — multipart/form-data field name "cover"
export const updateCoverPhotoMiddleware = upload.single('cover');

export const updateCoverPhoto = async (req: AuthRequest, res: Response) => {
  if (!req.file) { res.status(400).json({ message: 'No image provided' }); return; }
  if (!req.file.mimetype.startsWith('image/')) {
    res.status(400).json({ message: 'Only image files are allowed' }); return;
  }

  const user = await User.findById(req.user._id);
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }

  try {
    const result = await uploadToCloudinary(req.file.buffer, 'cst-covers', req.file.mimetype);
    user.coverPhotoUrl = result.url;
    await user.save();
    res.json({ user: await safeUser(user) });
  } catch {
    res.status(500).json({ message: 'Upload failed — check Cloudinary credentials' });
  }
};
