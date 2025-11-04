export const notFoundHandler = (req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
};

export const errorHandler = (err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
};