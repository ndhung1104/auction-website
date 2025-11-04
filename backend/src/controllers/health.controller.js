import { sendSuccess } from "../utils/response.js";

export const healthCheck = (_req, res) => sendSuccess(res, { status: 'OK' }, 'Health check passed');
