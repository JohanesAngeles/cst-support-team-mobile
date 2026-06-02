import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const premiumOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.subscriptionStatus !== 'active') {
    res.status(403).json({ message: 'Premium subscription required', code: 'PREMIUM_REQUIRED' });
    return;
  }
  next();
};
