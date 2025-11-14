import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import categoriesRouter from './categories.js';
import productsRouter from './products.js';
import homepageRouter from './homepage.js';
import profileRouter from './profile.js';
import sellerRouter from './seller.js';
import watchlistRouter from './watchlist.js';
import adminRouter from './admin.js';
import questionRouter from './questions.js';

const router = Router();
router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/categories', categoriesRouter);
router.use('/products', productsRouter);
router.use('/homepage', homepageRouter);
router.use('/profile', profileRouter);
router.use('/seller', sellerRouter);
router.use('/watchlist', watchlistRouter);
router.use('/admin', adminRouter);
router.use('/questions', questionRouter);

export default router;
