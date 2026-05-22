import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { validationResult } from 'express-validator';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';

const signToken = (id: string) =>
  jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  } as jwt.SignOptions);

const makeCode = () => crypto.randomInt(100000, 999999).toString();

const safeUser = (user: any) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  isVerified: user.isVerified,
});

export const register = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ message: errors.array()[0].msg }); return; }

  const { name, email, password, phone } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) { res.status(400).json({ message: 'Email already registered' }); return; }

    const user = await User.create({ name, email, password, phone, isVerified: true });

    const token = signToken(user._id.toString());
    res.status(201).json({ token, user: safeUser(user) });
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
    res.json({ token, user: safeUser(user) });
  } catch {
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  res.json({ user: safeUser(req.user) });
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
  res.json({ message: 'Email verified', user: safeUser(user) });
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
  const { name, phone } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }

  if (name?.trim()) user.name = name.trim();
  if (phone !== undefined) user.phone = phone.trim() || undefined;
  await user.save();
  res.json({ user: safeUser(user) });
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
