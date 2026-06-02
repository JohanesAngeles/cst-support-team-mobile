import { Router } from 'express';
import { googleSignIn, appleSignIn } from '../controllers/socialAuthController';

const router = Router();

router.post('/google', googleSignIn);
router.post('/apple',  appleSignIn);

export default router;
