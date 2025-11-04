import { ApiError } from '../utils/response.js';

export const notFoundHandler = (req, _res, next) =>
  next(new ApiError(404, 'CORE.NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));

export const errorHandler = (err, _req, res, _next) => {
  const status = err instanceof ApiError ? err.status : (err.status || 500);
  const code = err instanceof ApiError ? err.code : 'CORE.INTERNAL_ERROR';

  const body = {
    success: false,
    error: {
      code,
      message: err.message || 'Internal Server Error'
    }
  };

  if (err.details) body.error.details = err.details;

  if (process.env.NODE_ENV !== 'production' && !(err instanceof ApiError)) {
    body.error.stack = err.stack;
  }

  res.status(status).json(body);
};