import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Celebrity, { ICelebrity } from '../models/Celebrity';

export interface CelebrityAuthRequest extends Request {
  celebrity?: ICelebrity;
}

// Deliberately separate from middleware/auth.ts's `protect` (which loads a User) —
// a celebrity token carries `type: 'celebrity'` so the two token kinds can never
// authenticate each other's routes.
export const celebrityAuth = async (req: CelebrityAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Not authorized, no token' });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; type?: string };
    if (decoded.type !== 'celebrity') {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const celebrity = await Celebrity.findById(decoded.id);
    if (!celebrity) {
      res.status(401).json({ message: 'Celebrity not found' });
      return;
    }
    req.celebrity = celebrity;
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};
