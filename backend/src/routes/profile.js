import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profile.controller.js';
import { checkAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/', checkAuth, getProfile);
router.put('/', checkAuth, updateProfile);

export default router;
