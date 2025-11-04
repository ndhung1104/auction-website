import { Router } from 'express';
import { checkAuth, checkRole } from '../middlewares/auth.js';
import { sendNoContent } from '../utils/response.js';
const router = Router();

async function requestUpgrade(req, res, next) {
    //stub
    return sendNoContent(res);
}

async function profileHandler(req, res, next) {
    //stub
    return sendNoContent(res);
}

router.get('/me', checkAuth, profileHandler);
router.post('/seller', checkAuth, checkRole('BIDDER'), requestUpgrade);
