import db from '../db/knex.js';
import { ApiError } from '../utils/response.js';
import {
  createOrder,
  findOrderById,
  findOrderByProduct,
  insertOrderMessage,
  listOrderMessages,
  listOrdersForUser,
  findRatingByOrderAndRater,
  updateOrderStatus,
  upsertRating
} from '../repositories/order.repository.js';
import { findProductByIdWithSeller } from '../repositories/product.repository.js';
import { sendOrderNotification, sendAuctionResultNotification } from './mail.service.js';
import { findUserById } from '../repositories/user.repository.js';

const ensureParticipant = (order, userId) => {
  if (!order) {
    throw new ApiError(404, 'ORDERS.NOT_FOUND', 'Order not found');
  }
  if (String(order.seller_id) !== String(userId) && String(order.winner_id) !== String(userId)) {
    throw new ApiError(403, 'ORDERS.FORBIDDEN', 'You are not part of this order');
  }
};

const syncOrdersForUser = async (userId) => {
  const pendingProducts = await db('products as p')
    .leftJoin('orders as o', 'o.product_id', 'p.id')
    .select('p.id', 'p.seller_id', 'p.current_bidder_id', 'p.current_price', 'p.name')
    .where('p.status', 'ENDED')
    .whereNotNull('p.current_bidder_id')
    .whereNull('o.id')
    .where((qb) => {
      qb.where('p.seller_id', userId).orWhere('p.current_bidder_id', userId);
    });

  if (!pendingProducts.length) {
    return;
  }

  await Promise.all(
    pendingProducts.map((row) =>
      ensureOrderForProduct({
        productId: row.id,
        sellerId: row.seller_id,
        winnerId: row.current_bidder_id,
        finalPrice: Number(row.current_price),
        productName: row.name
      })
    )
  );
};

export const ensureOrderForProduct = async (
  { productId, sellerId, winnerId, finalPrice, productName },
  trx = null
) => {
  if (!trx) {
    return db.transaction((innerTrx) =>
      ensureOrderForProduct({ productId, sellerId, winnerId, finalPrice, productName }, innerTrx)
    );
  }

  const existing = await findOrderByProduct(productId, trx);
  if (existing) return existing;
  const [created] = await createOrder(
    {
      product_id: productId,
      seller_id: sellerId,
      winner_id: winnerId,
      final_price: finalPrice,
      status: 'WAITING_BUYER_DETAILS'
    },
    trx
  );
  try {
    const [seller, winner] = await Promise.all([
      findUserById(sellerId),
      findUserById(winnerId)
    ]);
    const productLabel = productName || `Product #${productId}`;
    if (seller?.email) {
      await sendAuctionResultNotification({
        email: seller.email,
        productName: productLabel,
        outcome: 'ended with a winning bidder'
      });
    }
    if (winner?.email) {
      await sendAuctionResultNotification({
        email: winner.email,
        productName: productLabel,
        outcome: 'has been awarded to you. Please complete payment promptly.'
      });
    }
  } catch (err) {
    console.warn('[mail] auction result notification skipped', err.message);
  }

  return created;
};

export const listOrders = async (userId) => {
  await syncOrdersForUser(userId);
  const rows = await listOrdersForUser(userId);
  return rows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    productSlug: row.product_slug,
    finalPrice: Number(row.final_price),
    status: row.status,
    createdAt: row.created_at
  }));
};

export const getOrderDetail = async (orderId, userId) => {
  const order = await findOrderById(orderId);
  ensureParticipant(order, userId);
  const product = await findProductByIdWithSeller(order.product_id);
  const [messages, rating] = await Promise.all([
    listOrderMessages(orderId),
    findRatingByOrderAndRater(orderId, userId)
  ]);
  return {
    order: {
      id: order.id,
      status: order.status,
      finalPrice: Number(order.final_price),
      productId: order.product_id,
      sellerId: order.seller_id,
      winnerId: order.winner_id,
      createdAt: order.created_at,
      shippingAddress: order.shipping_address,
      buyerInvoiceNote: order.buyer_invoice_note,
      invoiceSubmittedAt: order.invoice_submitted_at,
      paymentConfirmedAt: order.payment_confirmed_at,
      shippingCode: order.shipping_code,
      buyerReceivedAt: order.buyer_received_at
    },
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug
    },
    messages,
    rating: rating
      ? {
          id: rating.id,
          score: rating.score,
          comment: rating.comment,
          createdAt: rating.created_at
        }
      : null
  };
};

export const sendOrderMessage = async ({ orderId, userId, message }) => {
  if (!message?.trim()) {
    throw new ApiError(422, 'ORDERS.MESSAGE_EMPTY', 'Message cannot be empty');
  }
  const order = await findOrderById(orderId);
  ensureParticipant(order, userId);
  return insertOrderMessage({
    order_id: orderId,
    sender_id: userId,
    message: message.trim()
  });
};

export const changeOrderStatus = async ({
  orderId,
  userId,
  nextStatus,
  shippingAddress,
  invoiceNote,
  shippingCode
}) => {
  const order = await findOrderById(orderId);
  ensureParticipant(order, userId);

  const normalizedStatus =
    order.status === 'PENDING_PAYMENT'
      ? 'WAITING_BUYER_DETAILS'
      : order.status === 'PROCESSING'
        ? 'WAITING_BUYER_RECEIPT'
        : order.status;

  const isSeller = String(order.seller_id) === String(userId);
  const isWinner = String(order.winner_id) === String(userId);

  const updates = { status: nextStatus };

  if (nextStatus === 'CANCELLED') {
    if (order.status === 'COMPLETED') {
      throw new ApiError(400, 'ORDERS.ALREADY_COMPLETED', 'Completed orders cannot be cancelled');
    }
  } else if (normalizedStatus === 'WAITING_BUYER_DETAILS' && nextStatus === 'WAITING_SELLER_CONFIRM') {
    if (!isWinner) {
      throw new ApiError(403, 'ORDERS.BUYER_REQUIRED', 'Only buyer can submit invoice details');
    }
    const trimmedAddress = (shippingAddress || '').trim();
    if (trimmedAddress.length < 10) {
      throw new ApiError(422, 'ORDERS.MISSING_SHIPPING', 'Shipping address is required');
    }
    updates.shipping_address = trimmedAddress;
    updates.buyer_invoice_note = (invoiceNote || '').trim() || null;
    updates.invoice_submitted_at = db.fn.now();
  } else if (normalizedStatus === 'WAITING_SELLER_CONFIRM' && nextStatus === 'WAITING_BUYER_RECEIPT') {
    if (!isSeller) {
      throw new ApiError(403, 'ORDERS.SELLER_REQUIRED', 'Only seller can confirm payment and shipping');
    }
    const trimmedCode = (shippingCode || '').trim();
    if (trimmedCode.length < 3) {
      throw new ApiError(422, 'ORDERS.MISSING_SHIPPING_CODE', 'Shipping code is required');
    }
    updates.shipping_code = trimmedCode;
    updates.payment_confirmed_at = db.fn.now();
  } else if (normalizedStatus === 'WAITING_BUYER_RECEIPT' && nextStatus === 'COMPLETED') {
    if (!isWinner) {
      throw new ApiError(403, 'ORDERS.BUYER_REQUIRED', 'Only buyer can confirm receipt');
    }
    updates.buyer_received_at = db.fn.now();
  } else {
    throw new ApiError(400, 'ORDERS.INVALID_TRANSITION', 'Order status cannot be updated in this way');
  }

  const product = await findProductByIdWithSeller(order.product_id);
  const [updated] = await updateOrderStatus(orderId, updates, db);
  try {
    const [seller, buyer] = await Promise.all([
      findUserById(order.seller_id),
      findUserById(order.winner_id)
    ]);
    const targetEmail = String(order.seller_id) === String(userId) ? buyer?.email : seller?.email;
    if (targetEmail) {
      await sendOrderNotification({
        email: targetEmail,
        productName: product?.name || `Order #${order.id}`,
        status: nextStatus
      });
    }
  } catch (err) {
    console.warn('[mail] order notification skipped', err.message);
  }
  return updated;
};

export const cancelOrder = async ({ orderId, userId, reason }) => {
  const order = await findOrderById(orderId);
  ensureParticipant(order, userId);
  if (order.status === 'COMPLETED') {
    throw new ApiError(400, 'ORDERS.ALREADY_COMPLETED', 'Completed orders cannot be cancelled');
  }
  const sellerInitiated = String(order.seller_id) === String(userId);
  const payload = await changeOrderStatus({ orderId, userId, nextStatus: 'CANCELLED', reason });
  if (sellerInitiated) {
    await upsertRating({
      orderId,
      raterId: userId,
      ratedUserId: order.winner_id,
      score: -1,
      comment: reason || 'Buyer failed to pay'
    });
  }
  return payload;
};

export const leaveRating = async ({ orderId, userId, score, comment }) => {
  if (![1, -1].includes(Number(score))) {
    throw new ApiError(422, 'ORDERS.INVALID_SCORE', 'Score must be +1 or -1');
  }
  const order = await findOrderById(orderId);
  ensureParticipant(order, userId);
  const ratedUserId = String(userId) === String(order.seller_id) ? order.winner_id : order.seller_id;
  return upsertRating({
    orderId,
    raterId: userId,
    ratedUserId,
    score,
    comment
  });
};
