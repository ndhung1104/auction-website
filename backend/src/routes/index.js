import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import categoriesRouter from './categories.js';
import productsRouter from './products.js';

const router = Router();
router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/categories', categoriesRouter);
router.use('/products', productsRouter);

export default router;
