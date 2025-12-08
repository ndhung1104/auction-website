import { Router } from 'express';
import { checkAuth, checkRole } from '../middlewares/auth.js';
import {
  approveSellerRequest,
  createCategoryAdmin,
  deleteCategoryAdmin,
  getDashboard,
  listAutoBidsAdmin,
  rejectSellerRequest,
  softDeleteProductAdmin,
  updateCategoryAdmin,
  updateUserAdmin,
  deleteUserAdmin,
  finalizeAuctionsAdmin,
  updateExtendSettingsAdmin
} from '../controllers/admin.controller.js';

const router = Router();
router.use(checkAuth, checkRole('ADMIN'));

router.get('/dashboard', getDashboard);

router.post('/categories', createCategoryAdmin);
router.put('/categories/:id', updateCategoryAdmin);
router.delete('/categories/:id', deleteCategoryAdmin);

router.patch('/users/:id', updateUserAdmin);
router.delete('/users/:id', deleteUserAdmin);

router.patch('/products/:id/status', softDeleteProductAdmin);
router.get('/products/:id/auto-bids', listAutoBidsAdmin);
router.post('/auctions/finalize', finalizeAuctionsAdmin);

router.post('/seller-requests/:id/approve', approveSellerRequest);
router.post('/seller-requests/:id/reject', rejectSellerRequest);
router.patch('/settings/extend', updateExtendSettingsAdmin);

export default router;
