import { Router } from 'express';
import { legalChat } from '../controllers/aiController';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/legal', protect, legalChat);

export default router;
