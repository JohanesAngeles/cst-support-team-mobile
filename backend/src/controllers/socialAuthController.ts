import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import appleSignin from 'apple-signin-auth';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User';
import LoginSession from '../models/LoginSession';

const signToken = (userId: string, sid: string) =>
  jwt.sign({ id: userId, sid }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  } as jwt.SignOptions);

const createSession = async (userId: string, req: Request): Promise<string> => {
  const sessionId = crypto.randomUUID();
  const device = (req.headers['x-device-name'] as string) || (req.headers['user-agent'] as string) || 'Unknown device';
  await LoginSession.create({ userId, sessionId, device, ip: req.ip });
  return sessionId;
};

// ─── Google ───────────────────────────────────────────────────────────────────
// Receives an ID token from @react-native-google-signin/google-signin (native
// Credential Manager / Google Sign-In SDK) and verifies it directly against
// Google's public keys — no network round-trip to a userinfo endpoint needed.
const googleClient = new OAuth2Client();

export const googleSignIn = async (req: Request, res: Response) => {
  const { idToken } = req.body;
  if (!idToken) { res.status(400).json({ message: 'idToken is required' }); return; }

  try {
    const audience = [process.env.GOOGLE_WEB_CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID]
      .filter((id): id is string => !!id);
    const ticket = await googleClient.verifyIdToken({ idToken, audience });
    const payload = ticket.getPayload();

    const googleId = payload?.sub;
    const email = payload?.email;
    const name = payload?.name;

    if (!googleId || !email) { res.status(400).json({ message: 'Could not retrieve email from Google' }); return; }

    // Find existing user or create one
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name: name ?? email.split('@')[0],
        email: email.toLowerCase(),
        password: `google_${googleId}_${Date.now()}`, // unusable password for social accounts
        hasPassword: false,
        isVerified: true,
      });
    } else if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    const sid = await createSession(String(user._id), req);
    res.json({
      token: signToken(String(user._id), sid),
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
        hasPassword: false,
        isVerified: true,
      });
    } else if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    const sid = await createSession(String(user._id), req);
    res.json({
      token: signToken(String(user._id), sid),
      user: { _id: user._id, name: user.name, email: user.email, isVerified: user.isVerified },
    });
  } catch (err: any) {
    console.error('Apple sign-in error:', err.message);
    res.status(401).json({ message: 'Apple sign-in verification failed' });
  }
};
