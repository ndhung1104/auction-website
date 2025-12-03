import db from '../db/knex.js';
import { ApiError } from '../utils/response.js';
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  updateCategory
} from '../repositories/category.repository.js';
import { listUsers, updateUser } from '../repositories/user.repository.js';
import {
  listSellerRequests,
  updateSellerRequestStatus
} from '../repositories/sellerRequest.repository.js';
import { findAutoBidsWithUsers } from '../repositories/autoBid.repository.js';
import { finalizeEndedAuctions } from './product.service.js';

export const getAdminDashboard = async () => {
  const [categories, products, users, requests] = await Promise.all([
    getAllCategories(),
    db('products')
      .select('id', 'name', 'status', 'current_price', 'end_at', 'seller_id')
      .orderBy('created_at', 'desc')
      .limit(20),
    listUsers({ limit: 50, offset: 0 }),
    listSellerRequests(20, 0)
  ]);

  return {
    categories,
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      status: product.status,
      currentPrice: Number(product.current_price),
      endAt: product.end_at,
      sellerId: product.seller_id
    })),
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      status: user.status,
      createdAt: user.created_at
    })),
    sellerRequests: requests.map((request) => ({
      id: request.id,
      userId: request.user_id,
      status: request.status,
      requestedAt: request.requested_at,
      expireAt: request.expire_at,
      processedAt: request.processed_at,
      email: request.email,
      fullName: request.full_name
    }))
  };
};

export const adminCreateCategory = (payload) => createCategory(payload);

export const adminUpdateCategory = async (id, payload) => {
  const [updated] = await updateCategory(id, payload);
  if (!updated) {
    throw new ApiError(404, 'CATEGORIES.NOT_FOUND', 'Category not found');
  }
  return updated;
};

export const adminDeleteCategory = async (id) => {
  const hasProducts = await db('products').where({ category_id: id }).first();
  if (hasProducts) {
    throw new ApiError(409, 'CATEGORIES.IN_USE', 'Cannot delete category with existing products');
  }
  const deleted = await deleteCategory(id);
  if (!deleted) {
    throw new ApiError(404, 'CATEGORIES.NOT_FOUND', 'Category not found');
  }
};

export const adminUpdateUser = async (id, payload) => {
  const [updated] = await updateUser(id, payload);
  if (!updated) {
    throw new ApiError(404, 'USERS.NOT_FOUND', 'User not found');
  }
  return updated;
};

export const adminDeleteUser = async (id) => {
  const trx = await db.transaction();
  try {
    const [user] = await trx('users')
      .where({ id })
      .update({ status: 'SUSPENDED' }, ['id', 'email', 'role', 'status']);
    if (!user) {
      throw new ApiError(404, 'USERS.NOT_FOUND', 'User not found');
    }
    await trx('refresh_tokens').where({ user_id: id }).del();
    await trx('auto_bids').where({ user_id: id }).del();
    await trx.commit();
    return user;
  } catch (err) {
    await trx.rollback();
    throw err;
  }
};


export const adminSoftDeleteProduct = async (productId) => {
  const [updated] = await db('products')
    .where({ id: productId })
    .update(
      {
        status: 'REMOVED',
        enable_auto_bid: false,
        updated_at: db.fn.now()
      },
      ['id', 'status']
    );

  if (!updated) {
    throw new ApiError(404, 'PRODUCTS.NOT_FOUND', 'Product not found');
  }

  return updated;
};

export const adminListAutoBids = (productId) => findAutoBidsWithUsers(productId);

export const adminApproveSellerRequest = async (requestId) => {
  const trx = await db.transaction();
  try {
    const [request] = await updateSellerRequestStatus(requestId, 'APPROVED', trx);
    if (!request) {
      throw new ApiError(404, 'SELLER_REQUEST.NOT_FOUND', 'Seller request not found');
    }

    await updateUser(request.user_id, { role: 'SELLER' }, trx);
    await trx.commit();
    return request;
  } catch (err) {
    await trx.rollback();
    throw err;
  }
};

export const adminRejectSellerRequest = async (requestId) => {
  const [request] = await updateSellerRequestStatus(requestId, 'REJECTED');
  if (!request) {
    throw new ApiError(404, 'SELLER_REQUEST.NOT_FOUND', 'Seller request not found');
  }
  return request;
};

export const adminFinalizeAuctions = () => finalizeEndedAuctions();
