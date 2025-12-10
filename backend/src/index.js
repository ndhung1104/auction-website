import 'dotenv/config';
import app from './app/index.js';
import { startAuctionFinalizer } from './jobs/auctionFinalizer.js';

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => console.log(`API running on port ${PORT}`));

// Start periodic auction finalizer (enabled by default; set ENABLE_AUCTION_FINALIZER=false to disable)
const stopFinalizer = startAuctionFinalizer();

const shutdown = () => {
  stopFinalizer?.();
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
