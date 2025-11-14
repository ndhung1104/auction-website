import { Router } from 'express';
import { getProductBids, getProductById, getProducts } from '../controllers/product.controller.js';

const router = Router();

router.get('/', getProducts);
router.get('/:id/bids', getProductBids);
router.get('/:id', getProductById);

export default router;
