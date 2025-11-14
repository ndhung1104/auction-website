import { Router } from 'express';
import { forgotPassword, login, register, resetPasswordController } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordController);

export default router;
