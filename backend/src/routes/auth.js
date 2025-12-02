import { Router } from 'express';
import {
  changePasswordController,
  forgotPassword,
  login,
  register,
  resetPasswordController,
  verifyEmail,
  refreshTokenController,
  logoutController
} from '../controllers/auth.controller.js';
import { checkAuth } from '../middlewares/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordController);
router.post('/verify-email', verifyEmail);
router.post('/change-password', checkAuth, changePasswordController);
router.post('/refresh', refreshTokenController);
router.post('/logout', logoutController);

export default router;
