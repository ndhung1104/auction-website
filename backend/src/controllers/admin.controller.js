import Joi from 'joi';
import {
  adminApproveSellerRequest,
  adminCreateCategory,
  adminDeleteCategory,
  getAdminDashboard,
  adminListAutoBids,
  adminRejectSellerRequest,
  adminSoftDeleteProduct,
  adminUpdateCategory,
  adminUpdateUser,
  adminDeleteUser,
  adminFinalizeAuctions
} from '../services/admin.service.js';
import { ApiError, sendSuccess } from '../utils/response.js';

const categorySchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  parentId: Joi.number().integer().min(1).allow(null)
});

const userUpdateSchema = Joi.object({
  role: Joi.string().valid('ADMIN', 'SELLER', 'BIDDER').optional(),
  status: Joi.string().valid('CREATED', 'CONFIRMED', 'SUSPENDED').optional()
}).min(1);

const idParam = Joi.object({
  id: Joi.number().integer().min(1).required()
});

export const getDashboard = async (_req, res, next) => {
  try {
    const data = await getAdminDashboard();
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

export const createCategoryAdmin = async (req, res, next) => {
  try {
    const { value, error } = categorySchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      throw new ApiError(422, 'CATEGORIES.INVALID', 'Invalid category payload', error.details);
    }
    const payload = await adminCreateCategory({
      name: value.name,
      parent_id: value.parentId || null
    });
    return sendSuccess(res, { category: payload }, 'Category created');
  } catch (err) {
    next(err);
  }
};

export const updateCategoryAdmin = async (req, res, next) => {
  try {
    const { value: params, error: idError } = idParam.validate(req.params, { abortEarly: false, convert: true });
    if (idError) {
      throw new ApiError(422, 'CATEGORIES.INVALID_ID', 'Invalid category id', idError.details);
    }
    const { value, error } = categorySchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      throw new ApiError(422, 'CATEGORIES.INVALID', 'Invalid category payload', error.details);
    }
    const updated = await adminUpdateCategory(params.id, {
      name: value.name,
      parent_id: value.parentId || null
    });
    return sendSuccess(res, { category: updated }, 'Category updated');
  } catch (err) {
    next(err);
  }
};

export const deleteCategoryAdmin = async (req, res, next) => {
  try {
    const { value: params, error } = idParam.validate(req.params, { abortEarly: false, convert: true });
    if (error) {
      throw new ApiError(422, 'CATEGORIES.INVALID_ID', 'Invalid category id', error.details);
    }
    await adminDeleteCategory(params.id);
    return sendSuccess(res, null, 'Category removed');
  } catch (err) {
    next(err);
  }
};

export const updateUserAdmin = async (req, res, next) => {
  try {
    const { value: params, error: idError } = idParam.validate(req.params, { abortEarly: false, convert: true });
    if (idError) {
      throw new ApiError(422, 'USERS.INVALID_ID', 'Invalid user id', idError.details);
    }
    const { value, error } = userUpdateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      throw new ApiError(422, 'USERS.INVALID_PAYLOAD', 'Invalid user payload', error.details);
    }
    const user = await adminUpdateUser(params.id, {
      ...(value.role ? { role: value.role } : {}),
      ...(value.status ? { status: value.status } : {})
    });
    return sendSuccess(res, { user }, 'User updated');
  } catch (err) {
    next(err);
  }
};

export const deleteUserAdmin = async (req, res, next) => {
  try {
    const { value: params, error } = idParam.validate(req.params, { abortEarly: false, convert: true });
    if (error) {
      throw new ApiError(422, 'USERS.INVALID_ID', 'Invalid user id', error.details);
    }
    const user = await adminDeleteUser(params.id);
    return sendSuccess(res, { user }, 'User deleted');
  } catch (err) {
    next(err);
  }
};

export const finalizeAuctionsAdmin = async (_req, res, next) => {
  try {
    const result = await adminFinalizeAuctions();
    return sendSuccess(res, result, 'Expired auctions finalized');
  } catch (err) {
    next(err);
  }
};

export const softDeleteProductAdmin = async (req, res, next) => {
  try {
    const { value: params, error } = idParam.validate(req.params, { abortEarly: false, convert: true });
    if (error) {
      throw new ApiError(422, 'PRODUCTS.INVALID_ID', 'Invalid product id', error.details);
    }
    const product = await adminSoftDeleteProduct(params.id);
    return sendSuccess(res, { product }, 'Product removed');
  } catch (err) {
    next(err);
  }
};

export const listAutoBidsAdmin = async (req, res, next) => {
  try {
    const { value: params, error } = idParam.validate(req.params, { abortEarly: false, convert: true });
    if (error) {
      throw new ApiError(422, 'PRODUCTS.INVALID_ID', 'Invalid product id', error.details);
    }
    const items = await adminListAutoBids(params.id);
    return sendSuccess(res, { autoBids: items });
  } catch (err) {
    next(err);
  }
};

export const approveSellerRequest = async (req, res, next) => {
  try {
    const { value: params, error } = idParam.validate(req.params, { abortEarly: false, convert: true });
    if (error) {
      throw new ApiError(422, 'SELLER_REQUEST.INVALID_ID', 'Invalid request id', error.details);
    }
    const request = await adminApproveSellerRequest(params.id);
    return sendSuccess(res, { request }, 'Seller request approved');
  } catch (err) {
    next(err);
  }
};

export const rejectSellerRequest = async (req, res, next) => {
  try {
    const { value: params, error } = idParam.validate(req.params, { abortEarly: false, convert: true });
    if (error) {
      throw new ApiError(422, 'SELLER_REQUEST.INVALID_ID', 'Invalid request id', error.details);
    }
    const request = await adminRejectSellerRequest(params.id);
    return sendSuccess(res, { request }, 'Seller request rejected');
  } catch (err) {
    next(err);
  }
};
