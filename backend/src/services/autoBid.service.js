import db from '../db/knex.js';
import { insertBid } from '../repositories/bid.repository.js';
import { findAutoBidsByProduct } from '../repositories/autoBid.repository.js';

const pick = (row = {}) => ({
  id: row.id,
  current_price: Number(row.current_price),
  current_bidder_id: row.current_bidder_id,
  bid_count: Number(row.bid_count),
  end_at: row.end_at,
  status: row.status
});

export const recalcAutoBid = async (productId, trx = null, options = {}) => {
  const knex = trx || db;

  const product =
    options.product ||
    (await knex('products')
      .where({ id: productId })
      .forUpdate()
      .first());

  if (!product || product.status !== 'ACTIVE' || !product.enable_auto_bid) {
    return { triggered: false };
  }

  const autoBids = await findAutoBidsByProduct(productId, knex);
  if (!autoBids.length) {
    return { triggered: false };
  }

  const topBidder = autoBids[0];
  const currentPrice = Number(product.current_price);
  const startPrice = Number(product.start_price);
  const priceStep = Number(product.price_step);

  const secondAutoAmount = autoBids[1] ? Number(autoBids[1].max_bid_amount) : null;
  const manualAmount =
    product.current_bidder_id && product.current_bidder_id !== topBidder.user_id
      ? Math.max(currentPrice, startPrice)
      : null;

  const competitorAmount = Math.max(
    secondAutoAmount ?? 0,
    manualAmount ?? 0,
    startPrice
  );

  const needsIncrement = (secondAutoAmount ?? null) !== null || manualAmount !== null;

  let targetPrice;
  if (needsIncrement) {
    const requiredAmount = competitorAmount + priceStep;
    if (requiredAmount > Number(topBidder.max_bid_amount)) {
      return { triggered: false };
    }
    targetPrice = Math.min(Number(topBidder.max_bid_amount), Math.max(requiredAmount, startPrice));
  } else {
    targetPrice = Math.max(currentPrice, startPrice);
  }

  const isAlreadyLeading =
    product.current_bidder_id === topBidder.user_id &&
    Number(product.current_price) === targetPrice;

  if (isAlreadyLeading) {
    return { triggered: false };
  }

  const [updatedProduct] = await knex('products')
    .where({ id: productId })
    .update(
      {
        current_price: targetPrice,
        current_bidder_id: topBidder.user_id,
        bid_count: knex.raw('bid_count + 1'),
        updated_at: knex.fn.now()
      },
      ['id', 'current_price', 'current_bidder_id', 'bid_count', 'end_at', 'status']
    );

  const [autoBidRecord] = await insertBid(
    {
      product_id: productId,
      user_id: topBidder.user_id,
      bid_amount: targetPrice,
      is_auto_bid: true
    },
    knex
  );

  return {
    triggered: true,
    bid: autoBidRecord,
    product: pick(updatedProduct)
  };
};
