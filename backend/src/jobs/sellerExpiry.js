import db from '../db/knex.js';
import { updateUser } from '../repositories/user.repository.js';
import { updateSellerRequestStatus } from '../repositories/sellerRequest.repository.js';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

export const expireApprovedSellers = async () => {
  const rows = await db('seller_requests as sr')
    .leftJoin('users as u', 'u.id', 'sr.user_id')
    .select('sr.id', 'sr.user_id')
    .where('sr.status', 'APPROVED')
    .andWhere('sr.expire_at', '<=', db.fn.now())
    .andWhere('u.role', 'SELLER');

  let processed = 0;
  for (const row of rows) {
    await db.transaction(async (trx) => {
      await updateUser(row.user_id, { role: 'BIDDER' }, trx);
      await updateSellerRequestStatus(row.id, 'EXPIRED', trx);
      await trx('refresh_tokens').where({ user_id: row.user_id }).del();
    });
    processed += 1;
  }

  return { processed };
};

export const startSellerExpiryJob = ({
  intervalMs = Number(process.env.SELLER_EXPIRY_INTERVAL_MS || DEFAULT_INTERVAL_MS),
  enabled = process.env.ENABLE_SELLER_EXPIRY !== 'false'
} = {}) => {
  if (!enabled) {
    return null;
  }

  const safeInterval = Number.isFinite(intervalMs) && intervalMs >= 60_000
    ? intervalMs
    : DEFAULT_INTERVAL_MS;

  const timer = setInterval(async () => {
    try {
      const result = await expireApprovedSellers();
      if (result.processed) {
        console.info(`[seller-expiry] processed=${result.processed}`);
      }
    } catch (err) {
      console.error('[seller-expiry] failed', err.message);
    }
  }, safeInterval);

  return () => clearInterval(timer);
};

export default startSellerExpiryJob;
