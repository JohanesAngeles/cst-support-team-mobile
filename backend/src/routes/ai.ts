import { Router } from 'express';
import { legalChat, rateAdvisor, rateBenchmark } from '../controllers/aiController';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/legal', protect, legalChat);
router.post('/rate-advisor', protect, rateAdvisor);
router.post('/rate-benchmark', protect, rateBenchmark);

export default router;
