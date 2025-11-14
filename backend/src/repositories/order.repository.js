import db from '../db/knex.js';

export const createOrder = (payload, trx = db) =>
  (trx || db)('orders')
    .insert(payload)
    .returning(['id', 'product_id', 'seller_id', 'winner_id', 'final_price', 'status', 'created_at', 'updated_at']);

export const findOrderById = (id) =>
  db('orders')
    .select('*')
    .where({ id })
    .first();

export const findOrderByProduct = (productId, trx = db) =>
  (trx || db)('orders')
    .where({ product_id: productId })
    .first();

export const listOrdersForUser = (userId) =>
  db('orders as o')
    .leftJoin('products as p', 'p.id', 'o.product_id')
    .select(
      'o.id',
      'o.product_id',
      'o.seller_id',
      'o.winner_id',
      'o.final_price',
      'o.status',
      'o.created_at',
      'o.updated_at',
      'p.name as product_name',
      'p.slug as product_slug'
    )
    .where((qb) => {
      qb.where('o.seller_id', userId).orWhere('o.winner_id', userId);
    })
    .orderBy('o.created_at', 'desc');

export const updateOrderStatus = (id, status, trx = db) =>
  (trx || db)('orders')
    .where({ id })
    .update(
      {
        status,
        updated_at: (trx || db).fn.now()
      },
      ['id', 'status', 'updated_at']
    );

export const insertOrderMessage = (payload, trx = db) =>
  (trx || db)('order_messages')
    .insert(payload)
    .returning(['id', 'order_id', 'sender_id', 'message', 'created_at']);

export const listOrderMessages = (orderId) =>
  db('order_messages as om')
    .leftJoin('users as u', 'u.id', 'om.sender_id')
    .select(
      'om.id',
      'om.order_id',
      'om.sender_id',
      'om.message',
      'om.created_at',
      'u.full_name as sender_name'
    )
    .where('om.order_id', orderId)
    .orderBy('om.created_at', 'asc');

export const upsertRating = async ({ orderId, raterId, ratedUserId, score, comment }, trx = db) => {
  const existing = await trx('ratings').where({ order_id: orderId, rater_id: raterId }).first();
  if (existing) {
    const [updated] = await trx('ratings')
      .where({ id: existing.id })
      .update(
        {
          score,
          comment,
          created_at: trx.fn.now()
        },
        ['id', 'score', 'comment', 'created_at']
      );
    return updated;
  }
  const [created] = await trx('ratings').insert(
    {
      order_id: orderId,
      rater_id: raterId,
      rated_user_id: ratedUserId,
      score,
      comment
    },
    ['id', 'score', 'comment', 'created_at']
  );
  return created;
};
