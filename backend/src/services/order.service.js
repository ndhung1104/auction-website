import db from '../db/knex.js';
import { ApiError } from '../utils/response.js';
import {
  createOrder,
  findOrderById,
  findOrderByProduct,
  insertOrderMessage,
  listOrderMessages,
  listOrdersForUser,
  updateOrderStatus,
  upsertRating
} from '../repositories/order.repository.js';
import { findProductByIdWithSeller } from '../repositories/product.repository.js';
import { sendOrderNotification } from './mail.service.js';
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
    .select('p.id', 'p.seller_id', 'p.current_bidder_id', 'p.current_price')
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
        finalPrice: Number(row.current_price)
      })
    )
  );
};

export const ensureOrderForProduct = async ({ productId, sellerId, winnerId, finalPrice }, trx = null) => {
  if (!trx) {
    return db.transaction((innerTrx) =>
      ensureOrderForProduct({ productId, sellerId, winnerId, finalPrice }, innerTrx)
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
      status: 'PENDING_PAYMENT'
    },
    trx
  );
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
  const messages = await listOrderMessages(orderId);
  return {
    order: {
      id: order.id,
      status: order.status,
      finalPrice: Number(order.final_price),
      productId: order.product_id,
      sellerId: order.seller_id,
      winnerId: order.winner_id,
      createdAt: order.created_at
    },
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug
    },
    messages
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

export const changeOrderStatus = async ({ orderId, userId, nextStatus }) => {
  const order = await findOrderById(orderId);
  ensureParticipant(order, userId);
  const allowedStatuses = ['PENDING_PAYMENT', 'PROCESSING', 'COMPLETED', 'CANCELLED'];
  if (!allowedStatuses.includes(nextStatus)) {
    throw new ApiError(422, 'ORDERS.INVALID_STATUS', 'Unsupported order status');
  }
  const product = await findProductByIdWithSeller(order.product_id);
  const [updated] = await updateOrderStatus(orderId, nextStatus, db);
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
  return changeOrderStatus({ orderId, userId, nextStatus: 'CANCELLED', reason });
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
