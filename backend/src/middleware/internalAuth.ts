import { Request, Response, NextFunction } from 'express';

// Guards server-to-server calls from ca_website's admin proxy — a fixed trust
// relationship between two backends we control, not a per-admin identity.
export const internalOnly = (req: Request, res: Response, next: NextFunction): void => {
  const key = req.headers['x-internal-key'];
  if (!process.env.INTERNAL_API_KEY || key !== process.env.INTERNAL_API_KEY) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  next();
};
