import { Router } from 'express';
import { body } from 'express-validator';
import { translate, getSupportedLanguages } from '../controllers/translateController';
import { protect } from '../middleware/auth';

const router = Router();

router.post(
  '/',
  protect,
  [
    body('text').trim().notEmpty().withMessage('text is required'),
    body('toLang').trim().notEmpty().withMessage('toLang is required'),
  ],
  translate,
);

router.get('/languages', protect, getSupportedLanguages);

export default router;
