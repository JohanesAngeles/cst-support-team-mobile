import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Not authorized, no token' });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }
    if (req.user.status === 'banned' || req.user.status === 'suspended') {
      res.status(403).json({
        message: req.user.status === 'banned'
          ? 'This account has been banned.'
          : 'This account has been suspended.',
        code: req.user.status === 'banned' ? 'ACCOUNT_BANNED' : 'ACCOUNT_SUSPENDED',
      });
      return;
    }
    User.updateOne({ _id: req.user._id }, { lastActiveAt: new Date() }).catch(() => {});
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};
