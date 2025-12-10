export const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'
export const apiBaseURL =
  process.env.PLAYWRIGHT_API_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001'

export const seedEndpoint = process.env.PLAYWRIGHT_SEED_ENDPOINT || '/api/testing/seed'
export const seedStatusEndpoint =
  process.env.PLAYWRIGHT_SEED_STATUS_ENDPOINT || '/api/testing/seed-status'
export const seedEnabled = process.env.PLAYWRIGHT_ENABLE_SEED === 'true'
export const loginEndpoint = process.env.PLAYWRIGHT_LOGIN_ENDPOINT || '/api/auth/login'

export const authStorageKey = process.env.PLAYWRIGHT_AUTH_STORAGE_KEY || 'token'

export const credentials = {
  bidder: {
    email: process.env.PLAYWRIGHT_BIDDER_EMAIL,
    password: process.env.PLAYWRIGHT_BIDDER_PASSWORD,
  },
  seller: {
    email: process.env.PLAYWRIGHT_SELLER_EMAIL,
    password: process.env.PLAYWRIGHT_SELLER_PASSWORD,
  },
  admin: {
    email: process.env.PLAYWRIGHT_ADMIN_EMAIL,
    password: process.env.PLAYWRIGHT_ADMIN_PASSWORD,
  },
} as const
