import { Router } from 'express';
import {
  createProduct,
  getProductBids,
  getProductById,
  getProducts,
  submitProductBid,
  submitAutoBid,
  buyNow,
  appendProductDescription,
  rejectBidder
} from '../controllers/product.controller.js';
import { checkAuth, checkRole, optionalAuth } from '../middlewares/auth.js';
import { uploadProductImages } from '../middlewares/upload.js';

const router = Router();

router.get('/', optionalAuth, getProducts);
router.post(
  '/',
  checkAuth,
  checkRole('SELLER', 'ADMIN'),
  uploadProductImages,
  createProduct
);
router.get('/:id/bids', optionalAuth, getProductBids);
router.post('/:id/bid', checkAuth, checkRole('BIDDER', 'SELLER'), submitProductBid);
router.post('/:id/auto-bid', checkAuth, checkRole('BIDDER', 'SELLER'), submitAutoBid);
router.post('/:id/buy-now', checkAuth, checkRole('BIDDER', 'SELLER'), buyNow);
router.post(
  '/:id/append-description',
  checkAuth,
  appendProductDescription
);
router.post(
  '/:id/reject-bidder',
  checkAuth,
  rejectBidder
);
router.get('/:id', optionalAuth, getProductById);

export default router;
