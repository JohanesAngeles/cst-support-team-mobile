import { Router } from 'express';
import { legalChat, rateAdvisor, rateBenchmark } from '../controllers/aiController';
import { protect } from '../middleware/auth';
import { premiumOnly } from '../middleware/premium';

const router = Router();

router.post('/legal', protect, premiumOnly, legalChat);
router.post('/rate-advisor', protect, premiumOnly, rateAdvisor);
router.post('/rate-benchmark', protect, premiumOnly, rateBenchmark);

export default router;
