import { Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { validationResult } from 'express-validator';
import User, { DRIVER_STATUSES } from '../models/User';
import Follow from '../models/Follow';
import Block from '../models/Block';
import RoadReadyScore from '../models/RoadReadyScore';
import LoginSession from '../models/LoginSession';
import { AuthRequest } from '../middleware/auth';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';
import { upload, uploadToCloudinary } from '../middleware/upload';
import { createNotification } from '../utils/notify';
import { getFriendStatus, countFriends, getFriendStatusMap } from '../utils/friendStatus';
import { generateUsername } from '../utils/username';

// Lazy-init Twilio client so missing credentials don't crash the server
function getTwilioClient() {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('Twilio credentials not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('twilio')(sid, token);
}

const signToken = (id: string, sid: string) =>
  jwt.sign({ id, sid }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  } as jwt.SignOptions);

const makeCode = () => crypto.randomInt(100000, 999999).toString();

// Records a new device/browser login so it can be listed and individually
// revoked from Settings → Security & Login, and returns the session id to
// embed in that login's JWT.
const createSession = async (userId: string, req: Request): Promise<string> => {
  const sessionId = crypto.randomUUID();
  const device = (req.headers['x-device-name'] as string) || (req.headers['user-agent'] as string) || 'Unknown device';
  const ip = req.ip;
  await LoginSession.create({ userId, sessionId, device, ip });
  return sessionId;
};

export const safeUser = async (user: any) => {
  // Backfills accounts created before @usernames existed, on next read.
  if (!user.username) {
    user.username = await generateUsername(user.name);
    await user.save();
  }
  const [followersCount, followingCount, roadReady] = await Promise.all([
    Follow.countDocuments({ followingId: user._id }),
    Follow.countDocuments({ followerId: user._id }),
    RoadReadyScore.findOne({ userId: user._id }).select('badges'),
  ]);
  return {
    _id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    phone: user.phone,
    hasPassword: user.hasPassword ?? true,
    role: user.role ?? 'driver',
    isVerified: user.isVerified,
    isTopDriver: !!user.isTopDriver,
    cdlVerified: !!user.cdlVerified,
    badges: roadReady?.badges ?? [],
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

    const sid = await createSession(user._id.toString(), req);
    const token = signToken(user._id.toString(), sid);
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
    if (user.status === 'banned' || user.status === 'suspended') {
      res.status(403).json({
        message: user.status === 'banned' ? 'This account has been banned.' : 'This account has been suspended.',
        code: user.status === 'banned' ? 'ACCOUNT_BANNED' : 'ACCOUNT_SUSPENDED',
      });
      return;
    }
    const sid = await createSession(user._id.toString(), req);
    const token = signToken(user._id.toString(), sid);
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
  try {
    await sendVerificationEmail(user.email, user.name, code);
  } catch (err: any) {
    console.error('Failed to send verification email:', err.message);
    res.status(500).json({ message: 'Could not send verification email. Please try again later.' });
    return;
  }
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
  try {
    await sendPasswordResetEmail(user.email, user.name, code);
  } catch (err: any) {
    console.error('Failed to send password reset email:', err.message);
    res.status(500).json({ message: 'Could not send reset email. Please try again later.' });
    return;
  }
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

export const updateUsername = async (req: AuthRequest, res: Response) => {
  const raw = typeof req.body.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  if (!/^[a-z0-9_]{3,24}$/.test(raw)) {
    res.status(400).json({ message: 'Username must be 3-24 characters: letters, numbers, and underscores only' });
    return;
  }
  const taken = await User.exists({ username: raw, _id: { $ne: req.user._id } });
  if (taken) { res.status(400).json({ message: 'That username is already taken' }); return; }

  const user = await User.findById(req.user._id);
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }
  user.username = raw;
  await user.save();
  res.json({ user: await safeUser(user) });
};

// Read-only profile of another driver — only public-facing fields, no email/subscription/preferences.
// :id may be either a Mongo _id or an @username, so a tapped mention can resolve either way.
export const getPublicProfile = async (req: AuthRequest, res: Response) => {
  const idOrUsername = req.params.id as string;
  const user = mongoose.isValidObjectId(idOrUsername)
    ? await User.findById(idOrUsername)
    : await User.findOne({ username: idOrUsername.toLowerCase() });
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }

  const [followersCount, followingCount, isFollowing, myBlockRecord, theirBlockRecord, roadReady, friendsCount, friendStatus] = await Promise.all([
    Follow.countDocuments({ followingId: user._id }),
    Follow.countDocuments({ followerId: user._id }),
    Follow.exists({ followerId: req.user._id, followingId: user._id }),
    Block.findOne({ actorId: req.user._id, targetId: user._id }),
    Block.findOne({ actorId: user._id, targetId: req.user._id, type: 'block' }),
    RoadReadyScore.findOne({ userId: user._id }).select('badges'),
    countFriends(user._id.toString()),
    getFriendStatus(req.user._id.toString(), user._id.toString()),
  ]);

  res.json({
    user: {
      _id: user._id,
      name: user.name,
      username: user.username ?? null,
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
      isTopDriver: !!user.isTopDriver,
      cdlVerified: !!user.cdlVerified,
      badges: roadReady?.badges ?? [],
      followersCount,
      followingCount,
      isFollowing: !!isFollowing,
      isBlocked: myBlockRecord?.type === 'block',
      isMuted: myBlockRecord?.type === 'mute',
      isBlockedByThem: !!theirBlockRecord,
      friendsCount,
      friendStatus,
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
  const meId = req.user._id.toString();
  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  const users = await User.find({ _id: { $ne: req.user._id }, lastActiveAt: { $gte: cutoff } })
    .sort({ lastActiveAt: -1 })
    .limit(20);

  const otherIds = users.map(u => u._id.toString());
  const [myFollowing, myFollowers, friendStatusMap] = await Promise.all([
    Follow.find({ followerId: meId, followingId: { $in: otherIds } }).select('followingId'),
    Follow.find({ followingId: meId, followerId: { $in: otherIds } }).select('followerId'),
    getFriendStatusMap(meId, otherIds),
  ]);
  const followingSet = new Set(myFollowing.map(f => f.followingId.toString()));
  const followerSet = new Set(myFollowers.map(f => f.followerId.toString()));
  const relationshipOf = (id: string): 'mutual' | 'following' | 'follower' | null => {
    const isFollowing = followingSet.has(id);
    const isFollower = followerSet.has(id);
    if (isFollowing && isFollower) return 'mutual';
    if (isFollowing) return 'following';
    if (isFollower) return 'follower';
    return null;
  };

  res.json({
    users: users.map(u => {
      const id = u._id.toString();
      return {
        _id: u._id,
        name: u.name,
        avatarUrl: u.avatarUrl ?? null,
        homeBase: u.homeBase ?? null,
        currentStatus: u.currentStatus ?? null,
        isTopDriver: !!u.isTopDriver,
        cdlVerified: !!u.cdlVerified,
        lastActiveAt: u.lastActiveAt,
        relationship: relationshipOf(id),
        isFollowing: followingSet.has(id),
        friendStatus: friendStatusMap.get(id) ?? 'none',
      };
    }),
  });
};

// Toggle following another driver
export const toggleFollow = async (req: AuthRequest, res: Response) => {
  const targetId = req.params.id as string;
  if (targetId === req.user._id.toString()) { res.status(400).json({ message: "You can't follow yourself" }); return; }

  const target = await User.findById(targetId);
  if (!target) { res.status(404).json({ message: 'User not found' }); return; }

  const blocked = await Block.exists({
    type: 'block',
    $or: [
      { actorId: req.user._id, targetId },
      { actorId: targetId, targetId: req.user._id },
    ],
  });
  if (blocked) { res.status(403).json({ message: 'Unavailable' }); return; }

  const existing = await Follow.findOne({ followerId: req.user._id, followingId: targetId });
  if (existing) {
    await existing.deleteOne();
  } else {
    await Follow.create({ followerId: req.user._id, followingId: targetId });
    createNotification({
      recipientId: targetId,
      actorId: req.user._id.toString(),
      actorName: req.user.name,
      actorAvatarUrl: req.user.avatarUrl,
      type: 'follow',
    }).catch(() => {});
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

// Search/browse drivers. With no `q`, returns a directory sorted with people you
// follow or who follow you first — used by "Find Drivers" and the share-to-message picker.
export const searchUsers = async (req: AuthRequest, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const meId = req.user._id.toString();

  const blockRelations = await Block.find({
    type: 'block',
    $or: [{ actorId: meId }, { targetId: meId }],
  });
  const blockedIds = [...new Set(blockRelations.map(r => (r.actorId.toString() === meId ? r.targetId : r.actorId).toString()))];

  const query: Record<string, unknown> = { _id: { $ne: req.user._id, $nin: blockedIds } };
  if (q) {
    query.$or = [
      { name: { $regex: q, $options: 'i' } },
      { username: { $regex: q, $options: 'i' } },
      { homeBase: { $regex: q, $options: 'i' } },
    ];
  }

  const [users, myFollowing, myFollowers] = await Promise.all([
    User.find(query).limit(100),
    Follow.find({ followerId: meId }).select('followingId'),
    Follow.find({ followingId: meId }).select('followerId'),
  ]);

  const followingSet = new Set(myFollowing.map(f => f.followingId.toString()));
  const followerSet = new Set(myFollowers.map(f => f.followerId.toString()));

  const relationshipOf = (id: string): 'mutual' | 'following' | 'follower' | null => {
    const isFollowing = followingSet.has(id);
    const isFollower = followerSet.has(id);
    if (isFollowing && isFollower) return 'mutual';
    if (isFollowing) return 'following';
    if (isFollower) return 'follower';
    return null;
  };

  const rank = { mutual: 0, following: 1, follower: 1, none: 2 } as const;

  const results = users
    .map(u => ({ user: u, relationship: relationshipOf(u._id.toString()) }))
    .sort((a, b) => {
      const ra = rank[a.relationship ?? 'none'];
      const rb = rank[b.relationship ?? 'none'];
      if (ra !== rb) return ra - rb;
      return a.user.name.localeCompare(b.user.name);
    })
    .slice(0, 50);

  const friendStatusMap = await getFriendStatusMap(meId, results.map(r => r.user._id.toString()));

  res.json({
    users: results.map(({ user: u, relationship }) => ({
      _id: u._id,
      name: u.name,
      username: u.username ?? null,
      avatarUrl: u.avatarUrl ?? null,
      truckType: u.truckType ?? null,
      homeBase: u.homeBase ?? null,
      currentStatus: u.currentStatus ?? null,
      isTopDriver: !!u.isTopDriver,
      cdlVerified: !!u.cdlVerified,
      relationship,
      isFollowing: followingSet.has(u._id.toString()),
      friendStatus: friendStatusMap.get(u._id.toString()) ?? 'none',
    })),
  });
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
      social:            notificationPreferences.social            ?? true,
      directMessages:    notificationPreferences.directMessages    ?? true,
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

  const user = await User.findById(req.user._id).select('+password');
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }

  // Google/Apple/phone sign-ins get an unusable placeholder password the user
  // never sees, so they can't provide it — the JWT auth on this route is
  // already proof of ownership for them. Only challenge users who actually set one.
  if (user.hasPassword ?? true) {
    if (!password) { res.status(400).json({ message: 'Password is required to delete your account' }); return; }
    const valid = await user.comparePassword(password);
    if (!valid) { res.status(400).json({ message: 'Incorrect password' }); return; }
  }

  const uid = req.user._id;

  // Parallel wipe of all user data across every collection
  const [
    Expense, IFTAEntry, MaintenanceRecord, Deadline, Revenue, HOSEntry,
    DetentionEvent, TripLog, FuelStop, BrokerNote, TruckProfile, UserDocument,
    EmergencyContact, PushToken, MapReport, Load, DispatchContact, ELDEntry,
    DVIREntry, Invoice, DrugTest, BrokerBlacklist, NetworkPost, ParkingReservation,
    SleepLog, ShipperReceiver, Referral, RoadReadyScore, CDLDoc, CargoClaim, ChatMessage,
    DirectMessage, NewsItem, Event, SavedPost, MarketplaceReview, Block2,
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
    import('../models/Event'),
    import('../models/SavedPost'),
    import('../models/MarketplaceReview'),
    import('../models/Block'),
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
    Event.default.deleteMany({ authorId: uid }),
    SavedPost.default.deleteMany({ userId: uid }),
    MarketplaceReview.default.deleteMany({ reviewerId: uid }),
    Block2.default.deleteMany({ $or: [{ actorId: uid }, { targetId: uid }] }),
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

    // Find existing user by phone, or create a new one. Using .create()/.save()
    // here (not findOneAndUpdate) so Mongoose's required-field validators and the
    // password-hashing pre-save hook actually run — findOneAndUpdate skips both,
    // which used to leave brand-new phone signups with no name/email/password and
    // crash later in verifyPhoneOTP's user.save().
    const existing = await User.findOne({ phone });
    if (existing) {
      existing.phoneOtp = otp;
      existing.phoneOtpExpires = expires;
      await existing.save();
    } else {
      const digits = phone.replace(/\D/g, '');
      await User.create({
        name: 'Driver',
        email: `phone_${digits}@phone.roadreadynetwork.local`,
        password: `phone_${digits}_${Date.now()}`, // unusable placeholder, like social sign-in
        hasPassword: false,
        phone,
        phoneOtp: otp,
        phoneOtpExpires: expires,
        isVerified: true,
      });
    }

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

    const sid = await createSession(user._id.toString(), req);
    const token = signToken(user._id.toString(), sid);
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
