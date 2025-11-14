import { Router } from 'express';
import { createAnswer, createQuestion } from '../controllers/question.controller.js';
import { checkAuth, checkRole } from '../middlewares/auth.js';

const router = Router();

router.post(
  '/products/:productId',
  checkAuth,
  checkRole('BIDDER'),
  createQuestion
);

router.post(
  '/:questionId/answer',
  checkAuth,
  checkRole('SELLER', 'ADMIN'),
  createAnswer
);

export default router;
