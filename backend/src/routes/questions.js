import { Router } from 'express';
import { createAnswer, createQuestion } from '../controllers/question.controller.js';
import { checkAuth, checkRole } from '../middlewares/auth.js';

const router = Router();

router.post('/products/:productId', checkAuth, checkRole('BIDDER', 'SELLER'), createQuestion);

router.post(
  '/:questionId/answer',
  checkAuth,
  createAnswer
);

export default router;
