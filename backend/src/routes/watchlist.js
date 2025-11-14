import { Router } from 'express';
import { listWatchlist, addWatchlist, removeWatchlist } from '../controllers/watchlist.controller.js';
import { checkAuth, checkRole } from '../middlewares/auth.js';

const router = Router();

router.use(checkAuth, checkRole('BIDDER', 'SELLER', 'ADMIN'));
router.get('/', listWatchlist);
router.post('/:productId', addWatchlist);
router.delete('/:productId', removeWatchlist);

export default router;
