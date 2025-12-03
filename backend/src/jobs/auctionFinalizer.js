import { finalizeEndedAuctions } from '../services/product.service.js';

const toMs = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Starts a simple interval to finalize ended auctions.
 * Returns a cleanup function to clear the interval.
 */
export const startAuctionFinalizer = ({
  intervalMs = process.env.FINALIZE_INTERVAL_MS,
  enabled = process.env.ENABLE_AUCTION_FINALIZER !== 'false'
} = {}) => {
  if (!enabled) return () => {};

  const frequency = toMs(intervalMs, 300000); // default 5 minutes
  if (frequency < 60000) {
    console.warn('[finalizer] interval too low, using minimum 60s');
  }
  const effectiveInterval = Math.max(frequency, 60000);

  let running = false;
  const runOnce = async () => {
    if (running) return;
    running = true;
    try {
      const result = await finalizeEndedAuctions();
      if (result?.processed) {
        console.log(
          `[finalizer] processed=${result.processed} withoutWinner=${result.withoutWinner}`
        );
      }
    } catch (err) {
      console.error('[finalizer] failed to finalize auctions', err.message);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(runOnce, effectiveInterval);
  runOnce();
  return () => clearInterval(timer);
};

export default startAuctionFinalizer;
