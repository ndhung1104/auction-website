import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import categoriesRouter from './categories.js';
import productsRouter from './products.js';
import homepageRouter from './homepage.js';

const router = Router();
router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/categories', categoriesRouter);
router.use('/products', productsRouter);
router.use('/homepage', homepageRouter);

export default router;
