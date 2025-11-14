import { Router } from 'express';
import { getHomepageContent } from '../controllers/homepage.controller.js';

const router = Router();

router.get('/', getHomepageContent);

export default router;
