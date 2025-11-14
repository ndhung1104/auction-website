import { Router } from 'express';
import { createSellerRequest } from '../controllers/seller.controller.js';
import { checkAuth, checkRole } from '../middlewares/auth.js';

const router = Router();

router.post(
  '/request-upgrade',
  checkAuth,
  checkRole('BIDDER'),
  createSellerRequest
);

export default router;
