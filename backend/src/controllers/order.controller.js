import Joi from 'joi';
import {
  cancelOrder,
  changeOrderStatus,
  getOrderDetail,
  leaveRating,
  listOrders,
  sendOrderMessage
} from '../services/order.service.js';
import { sendSuccess, ApiError } from '../utils/response.js';

const idParamSchema = Joi.object({
  orderId: Joi.number().integer().min(1).required()
});

const statusSchema = Joi.object({
  status: Joi.string()
    .valid('WAITING_SELLER_CONFIRM', 'WAITING_BUYER_RECEIPT', 'COMPLETED', 'CANCELLED')
    .required(),
  shippingAddress: Joi.when('status', {
    is: 'WAITING_SELLER_CONFIRM',
    then: Joi.string().min(10).max(500).required(),
    otherwise: Joi.forbidden()
  }),
  invoiceNote: Joi.when('status', {
    is: 'WAITING_SELLER_CONFIRM',
    then: Joi.string().max(500).allow('', null),
    otherwise: Joi.forbidden()
  }),
  shippingCode: Joi.when('status', {
    is: 'WAITING_BUYER_RECEIPT',
    then: Joi.string().min(3).max(120).required(),
    otherwise: Joi.forbidden()
  })
});

const messageSchema = Joi.object({
  message: Joi.string().min(1).max(2000).required()
});

const ratingSchema = Joi.object({
  score: Joi.number().valid(1, -1).required(),
  comment: Joi.string().max(2000).allow('', null)
});

export const listUserOrders = async (req, res, next) => {
  try {
    const items = await listOrders(req.user.id);
    return sendSuccess(res, { items });
  } catch (err) {
    next(err);
  }
};

export const getOrder = async (req, res, next) => {
  try {
    const { value, error } = idParamSchema.validate(req.params, { abortEarly: false, convert: true });
    if (error) {
      throw new ApiError(422, 'ORDERS.INVALID_ID', 'Invalid order id', error.details);
    }
    const detail = await getOrderDetail(value.orderId, req.user.id);
    return sendSuccess(res, detail);
  } catch (err) {
    next(err);
  }
};

export const updateOrderStatusController = async (req, res, next) => {
  try {
    const { value: params, error: paramsError } = idParamSchema.validate(req.params, { abortEarly: false, convert: true });
    if (paramsError) {
      throw new ApiError(422, 'ORDERS.INVALID_ID', 'Invalid order id', paramsError.details);
    }
    const { value, error } = statusSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      throw new ApiError(422, 'ORDERS.INVALID_STATUS', 'Invalid status payload', error.details);
    }
    const payload = await changeOrderStatus({
      orderId: params.orderId,
      userId: req.user.id,
      nextStatus: value.status,
      shippingAddress: value.shippingAddress,
      invoiceNote: value.invoiceNote,
      shippingCode: value.shippingCode
    });
    return sendSuccess(res, { order: payload }, 'Order status updated');
  } catch (err) {
    next(err);
  }
};

export const cancelOrderController = async (req, res, next) => {
  try {
    const { value: params, error } = idParamSchema.validate(req.params, { abortEarly: false, convert: true });
    if (error) {
      throw new ApiError(422, 'ORDERS.INVALID_ID', 'Invalid order id', error.details);
    }
    const payload = await cancelOrder({ orderId: params.orderId, userId: req.user.id });
    return sendSuccess(res, { order: payload }, 'Order cancelled');
  } catch (err) {
    next(err);
  }
};

export const postOrderMessage = async (req, res, next) => {
  try {
    const { value: params, error: paramsError } = idParamSchema.validate(req.params, { abortEarly: false, convert: true });
    if (paramsError) {
      throw new ApiError(422, 'ORDERS.INVALID_ID', 'Invalid order id', paramsError.details);
    }
    const { value, error } = messageSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      throw new ApiError(422, 'ORDERS.INVALID_MESSAGE', 'Invalid message payload', error.details);
    }
    const message = await sendOrderMessage({ orderId: params.orderId, userId: req.user.id, message: value.message });
    return sendSuccess(res, { message }, 'Message sent');
  } catch (err) {
    next(err);
  }
};

export const rateOrder = async (req, res, next) => {
  try {
    const { value: params, error: paramsError } = idParamSchema.validate(req.params, { abortEarly: false, convert: true });
    if (paramsError) {
      throw new ApiError(422, 'ORDERS.INVALID_ID', 'Invalid order id', paramsError.details);
    }
    const { value, error } = ratingSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      throw new ApiError(422, 'ORDERS.INVALID_RATING', 'Invalid rating payload', error.details);
    }
    const rating = await leaveRating({
      orderId: params.orderId,
      userId: req.user.id,
      score: value.score,
      comment: value.comment
    });
    return sendSuccess(res, { rating }, 'Rating saved');
  } catch (err) {
    next(err);
  }
};
