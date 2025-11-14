import { Router } from 'express';
import {
  createProduct,
  getProductBids,
  getProductById,
  getProducts,
  submitProductBid,
  submitAutoBid,
  buyNow
} from '../controllers/product.controller.js';
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
router.post('/:id/bid', checkAuth, checkRole('BIDDER'), submitProductBid);
router.post('/:id/auto-bid', checkAuth, checkRole('BIDDER'), submitAutoBid);
router.post('/:id/buy-now', checkAuth, checkRole('BIDDER'), buyNow);
router.get('/:id', getProductById);

export default router;
