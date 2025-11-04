export const sendSuccess = (res, data = null, message = null, meta = null) => {
  const payload = { success: true };
  if (data !== null) payload.data = data;
  if (message) payload.message = message;
  if (meta) payload.meta = meta;
  return res.json(payload);
};

export const sendCreated = (res, data = null, message = null) =>
  sendSuccess(res.status(201), data, message);

export const sendNoContent = (res) => res.status(204).send();

export class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}