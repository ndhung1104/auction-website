import { Router } from 'express';
import { createProduct, getProductBids, getProductById, getProducts } from '../controllers/product.controller.js';
import { checkAuth, checkRole } from '../middlewares/auth.js';
import { uploadProductImages } from '../middlewares/upload.js';

const router = Router();

router.get('/', getProducts);
router.post(
  '/',
  checkAuth,
  checkRole('SELLER', 'ADMIN'),
  uploadProductImages,
  createProduct
);
router.get('/:id/bids', getProductBids);
router.get('/:id', getProductById);

export default router;
