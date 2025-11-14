import { Router } from 'express';
import { checkAuth } from '../middlewares/auth.js';
import {
  cancelOrderController,
  getOrder,
  listUserOrders,
  postOrderMessage,
  rateOrder,
  updateOrderStatusController
} from '../controllers/order.controller.js';

const router = Router();
router.use(checkAuth);

router.get('/', listUserOrders);
router.get('/:orderId', getOrder);
router.patch('/:orderId/status', updateOrderStatusController);
router.post('/:orderId/cancel', cancelOrderController);
router.post('/:orderId/messages', postOrderMessage);
router.post('/:orderId/rating', rateOrder);

export default router;
