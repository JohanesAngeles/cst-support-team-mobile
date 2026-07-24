import { Router } from 'express';
import { body } from 'express-validator';
import {
  register, login, getMe,
  verifyEmail, resendVerification,
  forgotPassword, resetPassword,
  updateProfile, updateUsername, getPublicProfile, changePassword, deleteAccount,
  updateAvatar, updateAvatarMiddleware,
  updateCoverPhoto, updateCoverPhotoMiddleware,
  toggleFollow, getFollowers, getFollowing, searchUsers,
  sendPhoneOTP, verifyPhoneOTP,
  updatePreferences,
  updateStatus, getActiveNow,
} from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login
);

router.get('/me', protect, getMe);
router.post('/verify-email', protect, verifyEmail);
router.post('/resend-verification', protect, resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/update-profile', protect, updateProfile);
router.put('/username', protect, updateUsername);
router.put('/status', protect, updateStatus);
router.get('/active-now', protect, getActiveNow);
router.get('/users', protect, searchUsers);
router.put('/cover', protect, updateCoverPhotoMiddleware, updateCoverPhoto);
router.get('/users/:id', protect, getPublicProfile);
router.post('/users/:id/follow', protect, toggleFollow);
router.get('/users/:id/followers', protect, getFollowers);
router.get('/users/:id/following', protect, getFollowing);
router.put('/change-password', protect, changePassword);
router.put('/avatar', protect, updateAvatarMiddleware, updateAvatar);
router.delete('/me', protect, deleteAccount);

// Phone OTP login
router.post('/send-phone-otp',   [body('phone').notEmpty().withMessage('Phone is required')],   sendPhoneOTP);
router.post('/verify-phone-otp', [body('phone').notEmpty(), body('otp').isLength({ min: 6, max: 6 })], verifyPhoneOTP);

// Notification & language preferences
router.put('/preferences', protect, updatePreferences);

export default router;
