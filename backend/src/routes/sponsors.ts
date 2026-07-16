import { Router, Request, Response } from 'express';
import Sponsor from '../models/Sponsor';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const sponsors = await Sponsor.find({ active: true }).sort({ order: 1 });
  res.json({ sponsors });
});

export default router;
