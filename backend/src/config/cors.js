const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export default {
  origin: allowedOrigins.length ? allowedOrigins : '*',
  credentials: true
};