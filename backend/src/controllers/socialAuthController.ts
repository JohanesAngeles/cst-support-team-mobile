import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import appleSignin from 'apple-signin-auth';
import User from '../models/User';

const signToken = (userId: string) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  } as jwt.SignOptions);

// ─── Google ───────────────────────────────────────────────────────────────────
// Receives an access token from expo-auth-session and fetches user info
// from Google's userinfo endpoint — no extra packages needed.
export const googleSignIn = async (req: Request, res: Response) => {
  const { accessToken } = req.body;
  if (!accessToken) { res.status(400).json({ message: 'accessToken is required' }); return; }

  try {
    const infoRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!infoRes.ok) { res.status(401).json({ message: 'Invalid Google token' }); return; }

    const info = await infoRes.json() as { id: string; email: string; name: string };
    const { id: googleId, email, name } = info;

    if (!email) { res.status(400).json({ message: 'Could not retrieve email from Google' }); return; }

    // Find existing user or create one
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name: name ?? email.split('@')[0],
        email: email.toLowerCase(),
        password: `google_${googleId}_${Date.now()}`, // unusable password for social accounts
        isVerified: true,
      });
    } else if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    res.json({
      token: signToken(String(user._id)),
      user: { _id: user._id, name: user.name, email: user.email, isVerified: user.isVerified },
    });
  } catch (err: any) {
    console.error('Google sign-in error:', err.message);
    res.status(500).json({ message: 'Google sign-in failed' });
  }
};

// ─── Apple ────────────────────────────────────────────────────────────────────
// Receives Apple's identityToken (JWT), verifies it, finds/creates user.
export const appleSignIn = async (req: Request, res: Response) => {
  const { identityToken, fullName } = req.body;
  if (!identityToken) { res.status(400).json({ message: 'identityToken is required' }); return; }

  try {
    const claims = await appleSignin.verifyIdToken(identityToken, {
      audience: 'com.cst.driver',
      ignoreExpiration: false,
    });

    const appleId = claims.sub;
    const email   = claims.email ?? `${appleId}@privaterelay.appleid.com`;
    const name    = fullName ?? email.split('@')[0];

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        password: `apple_${appleId}_${Date.now()}`,
        isVerified: true,
      });
    } else if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    res.json({
      token: signToken(String(user._id)),
      user: { _id: user._id, name: user.name, email: user.email, isVerified: user.isVerified },
    });
  } catch (err: any) {
    console.error('Apple sign-in error:', err.message);
    res.status(401).json({ message: 'Apple sign-in verification failed' });
  }
};
