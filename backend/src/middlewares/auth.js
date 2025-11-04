import passport from '../config/passport.js';
import { ApiError } from '../utils/response.js';

export const checkAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) return next(new ApiError(401, 'AUTH.UNAUTHORIZED', 'Authentication required'));
    req.user = user;
    next();
  })(req, res, next);
};

export const checkRole = (...allowedRoles) => (req, _res, next) => {
  if (!req.user) return next(new ApiError(401, 'AUTH.UNAUTHORIZED', 'Authentication required'));
  if (!allowedRoles.includes(req.user.role)) {
    return next(new ApiError(403, 'AUTH.FORBIDDEN', 'Insufficient permissions'));
  }
  next();
};